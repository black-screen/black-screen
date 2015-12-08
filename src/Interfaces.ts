import * as e from './Enums';
import * as fs from 'fs';
import * as React from 'react';
import Prompt from "./Prompt";
import Job from "./Job";
import Terminal from "./Terminal";

export interface Attributes {
    color?: e.Color;
    'background-color'?: e.Color;
    weight?: e.Weight;
    underline?: boolean;
    crossedOut?: boolean;
    blinking?: boolean;
    cursor?: boolean;
}

export interface AutocompletionProvider {
    getSuggestions(prompt: Prompt): Promise<Suggestion[]>;
}

export interface FileInfo {
    name: string;
    stat: fs.Stats;
}

export interface OutputDecorator {
    isApplicable: (job: Job) => boolean;
    decorate: (job: Job) => React.ReactElement<any>;

    /**
     * @note Setting this property to `true` will result in rendering performance
     *       decrease because the output will be re-decorated after each data chunk.
     */
    shouldDecorateRunningPrograms?: boolean;
}

export interface EnvironmentObserverPlugin {
    currentWorkingDirectoryWillChange: (terminal: Terminal) => void
    currentWorkingDirectoryDidChange: (terminal: Terminal) => void
}
