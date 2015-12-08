import Terminal from "./Terminal";
import * as _ from 'lodash';
const IPC = require('ipc');

export default class Application {
    private _terminals: Terminal[] = [];
    private _contentSize: Size;
    private _charSize: Size;
    private _activeTerminalIndex: number;

    constructor(charSize: Size, windowSize: Size) {
        this._charSize = charSize;
        this.contentSize = windowSize;

        this.addTerminal();
    }

    get terminals() {
        return this._terminals;
    }

    get activeTerminal(): Terminal {
        return this.terminals[this._activeTerminalIndex];
    }

    addTerminal(): Terminal {
        let terminal = new Terminal(this.contentDimensions);
        this.terminals.push(terminal);

        return terminal;
    }

    removeTerminal(terminal: Terminal): Application {
        _.pull(this.terminals, terminal);

        if (_.isEmpty(this.terminals)) {
            IPC.send('quit');
        }

        return this;
    }

    activateTerminal(terminal: Terminal): void {
        this._activeTerminalIndex = this.terminals.indexOf(terminal);
    }

    set contentSize(newSize) {
        this._contentSize = newSize;

        this.terminals.forEach((terminal: Terminal) => terminal.dimensions = this.contentDimensions)
    }

    get contentSize(): Size {
        return this._contentSize;
    }

    private get charSize() {
        return this._charSize
    }

    get contentDimensions(): Dimensions {
        return {
            columns: Math.floor(this.contentSize.width / this.charSize.width),
            rows: Math.floor(this.contentSize.height / this.charSize.height),
        };
    }
}
