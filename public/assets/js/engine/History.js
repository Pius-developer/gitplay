import { Repo } from './Repo.js';

/**
 * Undo/redo using snapshots (the memento pattern).
 * Before every command that changes the repo we save a snapshot;
 * undo restores the last one, redo re-applies what was undone.
 */
export class History {
    #past = [];
    #future = [];

    constructor(limit = 200) {
        this.limit = limit;
    }

    record(repo, line) {
        this.#past.push({ snapshot: repo.toJSON(), line });
        if (this.#past.length > this.limit) this.#past.shift();
        this.#future = [];
    }

    /** @returns {{repo: Repo, line: string} | null} */
    undo(current) {
        const step = this.#past.pop();
        if (!step) return null;
        this.#future.push({ snapshot: current.toJSON(), line: step.line });
        return { repo: Repo.fromJSON(step.snapshot), line: step.line };
    }

    redo(current) {
        const step = this.#future.pop();
        if (!step) return null;
        this.#past.push({ snapshot: current.toJSON(), line: step.line });
        return { repo: Repo.fromJSON(step.snapshot), line: step.line };
    }

    get canUndo() { return this.#past.length > 0; }
    get canRedo() { return this.#future.length > 0; }

    /** The commands that produced the current state, oldest first (used for sharing). */
    lines() {
        return this.#past.map((s) => s.line);
    }
}
