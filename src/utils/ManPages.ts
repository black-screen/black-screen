import {execFile} from "child-process-promise";
import {Suggestion, styles, contextIndependent, unique} from "../plugins/autocompletion_providers/Common";

const combineManPageLines = (lines: string[]) => lines
    .map(line => line.trim())
    .reduce(
        (memo, next) => {
            if (next.endsWith("-")) {
                return memo.concat(next.slice(0, -1));
            } else {
                return memo.concat(next, " ");
            }
        },
        ""
    );

// Note: this is still pretty experimental. If you want to do man page parsing
// for a new command, expect to have to make some changes here.

// TODO: Handle option descriptions that have empty lines. Unblocks:
// -p and -R in cp
// df
// locate
// TODO: Handle nested options. Unblocks:
// dd

const manPageToOptions = async (command: string): Promise<Suggestion[]> => {
    // use execFile to prevent a command like "; echo test" from running the "echo test"
    const {stdout, stderr} =  await execFile("man", [command], {});
    if (stderr) {
        throw `Error in retrieving man page: ${command}`;
    }
    // "Apply" backspace literals
    const manContents = stdout.replace(/.\x08/g, "");

    // Split into lines, skipping starting and ending newlines
    const manLines = manContents.trim().split("\n");

    // Separate sections
    let currentSection = "";
    let manSections: { [section: string]: string[] } = {};
    manLines.forEach((line: string) => {
        if (line.startsWith(" ") || line === "") {
            manSections[currentSection].push(line);
        } else {
            currentSection = line;
            if (!manSections[currentSection]) {
                manSections[currentSection] = [];
            }
        }
    });

    // Split the description section (which contains the flags) into paragraphs
    /* tslint:disable:no-string-literal */
    const manDescriptionParagraphs = manSections["DESCRIPTION"].reduce(
        /* tslint:enable:no-string-literal */
        (memo, next) => {
            if (next === "") {
                memo.push([]);
            } else {
                memo[memo.length - 1].push(next);
            }
            return memo;
        },
        <string[][]>[[]]
    );

    // Extract the paragraphs that describe flags, and parse out the flag data
    const flagDescriptions = manDescriptionParagraphs.filter(lines => lines.length > 0);

    const suggestions: Suggestion[] = [];

    flagDescriptions.forEach(descriptions => {
        const shortFlagWithArgument = descriptions[0].match(/^ *-(\w) (\w*)$/);
        const shortFlagWithoutArgument = descriptions[0].match(/^ *-(\w) *(.*)$/);
        if (shortFlagWithArgument) {
            const flag = shortFlagWithArgument[1];
            const argument = shortFlagWithArgument[2];
            const description = combineManPageLines(descriptions.slice(1));

            suggestions.push(new Suggestion({
                value: `-${flag}`,
                style: styles.option,
                description,
                displayValue: `-${flag} ${argument}`,
                space: true,
            }));
        } else if (shortFlagWithoutArgument) {
            const flag = shortFlagWithoutArgument[1];
            const description = combineManPageLines([shortFlagWithoutArgument[2], ...descriptions.slice(1)]);

            suggestions.push(new Suggestion({
                value: `-${flag}`,
                style: styles.option,
                description,
            }));
        }
    });

    return suggestions;
};

export const manPageOptions = (command: string) => unique(contextIndependent(() => manPageToOptions(command)));
