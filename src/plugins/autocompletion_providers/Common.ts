import {statsIn, resolveDirectory, directoryName, joinPath, isImage} from "../../utils/Common";
import {
    FileInfo, AutocompletionContext, AutocompletionProvider,
} from "../../Interfaces";
import * as modeToPermissions from "mode-to-permissions";
import * as Path from "path";
import * as _ from "lodash";
import {fontAwesome} from "../../views/css/FontAwesome";
import {colors} from "../../views/css/colors";
import {CSSObject} from "../../views/css/definitions";
import {StatusCode} from "../../utils/Git";

type Style = { value: string; css: CSSObject};

interface SuggestionAttributes {
    value?: string;
    displayValue?: string;
    synopsis?: string;
    description?: string;
    style?: Style;
    space?: boolean;
    shouldEscapeSpaces?: boolean;
}

export class Suggestion {
    constructor(private attributes: SuggestionAttributes = {}) {
        this.attributes = attributes;
    }

    get value(): string {
        return this.attributes.value || "";
    }

    get synopsis(): string {
        return this.attributes.synopsis || this.truncatedDescription;
    }

    get description(): string {
        return this.attributes.description || "";
    }

    get style(): Style {
        return this.attributes.style || {value: "", css: {}};
    }

    get displayValue(): string {
        return this.attributes.displayValue || this.value;
    }

    valueForPrompt(): string {
        const escaped = this.shouldEscapeSpaces ? this.value.replace(/\s/g, "\\ ") : this.value;
        const spaceAdded = this.shouldAddSpace ? escaped + " " : escaped;
        return spaceAdded;
    }

    get shouldAddSpace(): boolean {
        return this.attributes.space || false;
    }

    get shouldEscapeSpaces(): boolean {
        return !!this.attributes.shouldEscapeSpaces;
    }

    withValue(value: string): this {
        this.attributes.value = value;
        return this;
    }

    withDisplayValue(value: string): this {
        this.attributes.displayValue = value;
        return this;
    }

    withSynopsis(synopsis: string): this {
        this.attributes.synopsis = synopsis;
        return this;
    }

    withDescription(description: string): this {
        this.attributes.description = description;
        return this;
    }

    withStyle(style: Style): this {
        this.attributes.style = style;
        return this;
    }

    withSpace(): this {
        this.attributes.space = true;
        return this;
    }

    private get truncatedDescription(): string {
        return _.truncate(this.description, {length: 50, separator: " "});
    }
}

export const styles = {
    executable: {
        value: fontAwesome.asterisk,
        css: {
            color: colors.green,
        },
    },
    command: {
        value: fontAwesome.terminal,
        css: {
            color: colors.green,
        },
    },
    option: {
        value: fontAwesome.flagO,
        css: {
            color: colors.green,
        },
    },
    optionValue: {
        value: "=",
        css: {
            color: colors.green,
        },
    },
    environmentVariable: {
        value: fontAwesome.usd,
        css: {
            color: colors.yellow,
        },
    },
    branch: {
        value: fontAwesome.codeFork,
        css: {},
    },
    directory: {
        value: fontAwesome.folder,
        css: {},
    },
    file: (fileInfo: FileInfo, fullPath: string): Style => {
        const extension = Path.extname(fileInfo.name);

        if (isImage(extension)) {
            return {
                value: "",
                css: {
                    backgroundImage: `url("${fullPath}")`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                },
            };
        } else {
            return {
                value: extensionIcon(extension),
                css: {},
            };
        }
    },
    gitFileStatus: (statusCode: StatusCode) => ({
        value: fontAwesome.file,
        css: {
            color: gitStatusCodeColor(statusCode),
        },
    }),
    alias: {
        value: fontAwesome.at,
        css: {
            color: colors.yellow,
        },
    },
    func: {
        value: "f",
        css: {
            color: colors.green,
            fontStyle: "italic",
        },
    },
    history: {
        value: fontAwesome.history,
        css: {
            color: colors.blue,
        },
    },
};

export const unique = (provider: AutocompletionProvider): AutocompletionProvider => mk(async (context) => {
    const suggestions = await provider(context);
    return suggestions.filter(suggestion => !context.argument.command.hasArgument(suggestion.value, context.argument));
});

const filesSuggestions = (filter: (info: FileInfo) => boolean) => async(tokenValue: string, directory: string): Promise<Suggestion[]> => {
    /**
     * Parent folders.
     */
    if (tokenValue.endsWith("..")) {
        const pwdParts = directory.replace(/\/$/, "").split(Path.sep);

        return _.range(1, pwdParts.length).map(numberOfParts => {
            const value = `..${Path.sep}`.repeat(numberOfParts);
            const description = pwdParts.slice(0, -numberOfParts).join(Path.sep) || Path.sep;

            return new Suggestion({value: value, description: description, style: styles.directory});
        });
    }

    const tokenDirectory = directoryName(tokenValue);
    const basePath = tokenValue.slice(tokenDirectory.length);
    const directoryPath = resolveDirectory(directory, tokenDirectory);
    const stats = await statsIn(directoryPath);

    return stats
        .filter(info => info.name.startsWith(".") ? basePath.startsWith(".") : true)
        .filter(info => info.stat.isDirectory() || filter(info))
        .map(info => {
            if (info.stat.isDirectory()) {
                return new Suggestion({value: joinPath(tokenDirectory, info.name + Path.sep), displayValue: info.name + Path.sep, style: styles.directory});
            } else {
                return new Suggestion({value: joinPath(tokenDirectory, info.name), displayValue: info.name, style: styles.file(info, joinPath(directoryPath, info.name))});
            }
        });
};

const filesSuggestionsProvider =
    (filter: (info: FileInfo) => boolean) =>
        (context: AutocompletionContext, directory = context.environment.pwd): Promise<Suggestion[]> =>
            filesSuggestions(filter)(context.argument.value, directory);

export const executableFilesSuggestions = filesSuggestions(info => info.stat.isFile() && modeToPermissions(info.stat.mode).execute.owner);
export const anyFilesSuggestions = filesSuggestions(() => true);
export const anyFilesSuggestionsProvider = unique(filesSuggestionsProvider(() => true));
export const directoriesSuggestionsProvider = filesSuggestionsProvider(info => info.stat.isDirectory());

export const environmentVariableSuggestions = mk(async context => {
    if (context.argument.value.startsWith("$")) {
        return context.environment.map((key, value) =>
            new Suggestion({value: "$" + key, description: value, style: styles.environmentVariable})
        );
    } else {
        return [];
    }
});

export const combine = (providers: AutocompletionProvider[]): AutocompletionProvider => async(context: AutocompletionContext): Promise<Suggestion[]> => {
    return _.flatten(await Promise.all(providers.map(provider => provider(context))));
};

export function contextIndependent(provider: () => Promise<Suggestion[]>) {
    return _.memoize(provider, () => "");
}

export function mk(provider: AutocompletionProvider) {
    return provider;
}

export const emptyProvider = mk(async() => []);

function gitStatusCodeColor(statusCode: StatusCode) {
    switch (statusCode) {
        case StatusCode.Added:
            return colors.green;
        case StatusCode.Copied:
            return colors.blue;
        case StatusCode.Deleted:
            return colors.red;
        case StatusCode.Modified:
            return colors.blue;
        case StatusCode.Renamed:
            return colors.blue;
        case StatusCode.Unmodified:
            return colors.white;
        case StatusCode.Untracked:
            return colors.red;
        case StatusCode.UpdatedButUnmerged:
            return colors.blue;
        default:
            throw "Should never happen.";
    }
}

function extensionIcon(extension: string) {
    switch (extension) {
        case ".zip":
        case ".gzip":
            return fontAwesome.fileArchiveO;
        case ".js":
        case ".ts":
        case ".rb":
        case ".json":
            return fontAwesome.fileCodeO;
        default:
            return fontAwesome.file;
    }
}

export const longAndShortFlag = (name: string, shortName = name[0]) => mk(async context => {
    const longValue = `--${name}`;
    const shortValue = `-${shortName}`;

    if (context.argument.command.hasArgument(longValue, context.argument) || context.argument.command.hasArgument(shortValue, context.argument)) {
        return [];
    }

    const value = context.argument.value === shortValue ? shortValue : longValue;

    return [new Suggestion({value: value, displayValue: `${shortValue} ${longValue}`, style: styles.option})];
});

export const shortFlag = (char: string) => unique(async() => [new Suggestion({value: `-${char}`, style: styles.option})]);
export const longFlag = (name: string) => unique(async() => [new Suggestion({value: `--${name}`, style: styles.option})]);

export const mapSuggestions = (provider: AutocompletionProvider, mapper: (suggestion: Suggestion) => Suggestion) => mk(async(context) => (await provider(context)).map(mapper));
