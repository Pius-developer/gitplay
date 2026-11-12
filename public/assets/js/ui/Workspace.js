import { Repo } from '../engine/Repo.js';
import { run, HELP } from '../engine/commands.js';
import { History } from '../engine/History.js';
import { Terminal } from './Terminal.js';
import { Graph } from './Graph.js';

/**
 * Glues the engine to the screen: a Repo, its undo History,
 * a Terminal for input and a Graph for output.
 * Every page (sandbox, challenges, replay) is built on one of these.
 */
export class Workspace extends EventTarget {
    constructor(root) {
        super();
        this.repo = new Repo();
        this.history = new History();
        this.graph = new Graph(root.querySelector('[data-graph]'));
        this.terminal = new Terminal(root.querySelector('[data-terminal]'), {
            onCommand: (line) => this.execute(line),
            prompt: () => `(${this.repo.currentBranch() ?? 'detached'}) $`,
        });
        this.render();
    }

    /** Runs one terminal line. Built-ins (undo, redo, clear, help) are handled here. */
    execute(line) {
        switch (line) {
            case '': return null;
            case 'help': return { output: HELP, ok: true };
            case 'clear': this.terminal.clear(); return null;
            case 'undo': return this.undo();
            case 'redo': return this.redo();
        }
        const snapshot = this.repo.toJSON();
        const result = run(this.repo, line);
        if (result.changed) {
            this.history.record(Repo.fromJSON(snapshot), line);
            this.render();
            this.dispatchEvent(new CustomEvent('change', { detail: { line } }));
        }
        return result;
    }

    undo() {
        const step = this.history.undo(this.repo);
        if (!step) return { output: 'Nothing to undo.', ok: false };
        this.repo = step.repo;
        this.render();
        this.dispatchEvent(new CustomEvent('change', { detail: { line: 'undo' } }));
        return { output: `Undid: ${step.line}`, ok: true };
    }

    redo() {
        const step = this.history.redo(this.repo);
        if (!step) return { output: 'Nothing to redo.', ok: false };
        this.repo = step.repo;
        this.render();
        this.dispatchEvent(new CustomEvent('change', { detail: { line: 'redo' } }));
        return { output: `Redid: ${step.line}`, ok: true };
    }

    /** Silently rebuilds state from a list of commands (restore, challenge setup). */
    load(lines) {
        this.repo = new Repo();
        this.history = new History();
        for (const line of lines) {
            const snap = this.repo.toJSON();
            const r = run(this.repo, line);
            if (r.changed) this.history.record(Repo.fromJSON(snap), line);
        }
        this.render();
    }

    reset() {
        this.load([]);
        this.terminal.clear();
        this.dispatchEvent(new CustomEvent('change', { detail: { line: 'reset' } }));
    }

    render() {
        this.graph.render(this.repo);
        this.terminal.refreshPrompt();
    }
}
