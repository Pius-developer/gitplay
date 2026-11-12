/**
 * A tiny in-memory model of a Git repository.
 *
 * Commits form a DAG (directed acyclic graph): each commit points to its
 * parent(s). Branches are just names that point at a commit. HEAD points
 * either at a branch (normal) or straight at a commit ("detached HEAD").
 */
export class Repo {
    constructor() {
        this.commits = new Map();   // id -> { id, parents, message, seq, lane }
        this.branches = new Map();  // name -> commit id
        this.lanes = new Map();     // branch name -> lane number (for drawing)
        this.head = { type: 'branch', name: 'main' };
        this.seq = 0;

        const root = this.#createCommit([], 'Initial commit', 0);
        this.branches.set('main', root.id);
        this.lanes.set('main', 0);
    }

    // ------------------------------------------------------------ reading

    /** The commit id HEAD currently points at. */
    headCommit() {
        return this.head.type === 'branch' ? this.branches.get(this.head.name) : this.head.id;
    }

    currentBranch() {
        return this.head.type === 'branch' ? this.head.name : null;
    }

    /**
     * Resolves a ref like "main", "a1b2c3d", "HEAD", "HEAD~2" or "feature^"
     * to a commit id. Returns null when it can't be found.
     */
    resolve(ref) {
        const m = /^(.+?)((?:~\d*|\^)*)$/.exec(ref);
        if (!m) return null;
        let [, base, suffix] = m;

        let id = null;
        if (base === 'HEAD') id = this.headCommit();
        else if (this.branches.has(base)) id = this.branches.get(base);
        else {
            const matches = [...this.commits.keys()].filter((c) => c.startsWith(base));
            id = base.length >= 4 && matches.length === 1 ? matches[0] : null;
        }
        if (!id) return null;

        for (const step of suffix.match(/~\d*|\^/g) ?? []) {
            const n = step === '^' ? 1 : (step === '~' ? 1 : parseInt(step.slice(1), 10));
            for (let i = 0; i < n; i++) {
                id = this.commits.get(id)?.parents[0] ?? null;
                if (!id) return null;
            }
        }
        return id;
    }

    /** True when `ancestor` is reachable by walking parents from `descendant`. */
    isAncestor(ancestor, descendant) {
        const seen = new Set();
        const stack = [descendant];
        while (stack.length) {
            const id = stack.pop();
            if (id === ancestor) return true;
            if (seen.has(id)) continue;
            seen.add(id);
            stack.push(...(this.commits.get(id)?.parents ?? []));
        }
        return false;
    }

    /** First-parent history from a commit, newest first (what `git log` shows). */
    history(fromId = this.headCommit()) {
        const out = [];
        let id = fromId;
        while (id) {
            const c = this.commits.get(id);
            out.push(c);
            id = c.parents[0];
        }
        return out;
    }

    branchesAt(id) {
        return [...this.branches].filter(([, c]) => c === id).map(([name]) => name);
    }

    // ------------------------------------------------------------ writing

    commit(message) {
        const parent = this.headCommit();
        const lane = this.head.type === 'branch' ? this.lanes.get(this.head.name) : this.#detachedLane();
        const c = this.#createCommit([parent], message, lane);
        this.#moveHead(c.id);
        return c;
    }

    createBranch(name, at = this.headCommit()) {
        if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.startsWith('-') || name === 'HEAD') {
            throw new GitError(`fatal: '${name}' is not a valid branch name.`);
        }
        if (this.branches.has(name)) throw new GitError(`fatal: a branch named '${name}' already exists.`);
        this.branches.set(name, at);
        if (!this.lanes.has(name)) this.lanes.set(name, this.#nextLane());
    }

    deleteBranch(name, force = false) {
        if (!this.branches.has(name)) throw new GitError(`error: branch '${name}' not found.`);
        if (this.currentBranch() === name) {
            throw new GitError(`error: cannot delete branch '${name}' used by worktree`);
        }
        const tip = this.branches.get(name);
        if (!force && !this.isAncestor(tip, this.headCommit())) {
            throw new GitError(`error: the branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`);
        }
        this.branches.delete(name);
    }

    checkout(ref) {
        if (this.branches.has(ref)) {
            this.head = { type: 'branch', name: ref };
            return { detached: false, id: this.branches.get(ref) };
        }
        const id = this.resolve(ref);
        if (!id) throw new GitError(`error: pathspec '${ref}' did not match any file(s) known to git`);
        this.head = { type: 'detached', id };
        return { detached: true, id };
    }

    /** Merges `ref` into the current HEAD. Returns { type: 'up-to-date' | 'fast-forward' | 'merge', id }. */
    merge(ref) {
        const theirs = this.resolve(ref);
        if (!theirs) throw new GitError(`merge: ${ref} - not something we can merge`);
        const ours = this.headCommit();

        if (this.isAncestor(theirs, ours)) return { type: 'up-to-date', id: ours };
        if (this.isAncestor(ours, theirs)) {
            this.#moveHead(theirs);
            return { type: 'fast-forward', id: theirs };
        }
        const into = this.currentBranch() ?? 'HEAD';
        const lane = this.head.type === 'branch' ? this.lanes.get(this.head.name) : this.#detachedLane();
        const c = this.#createCommit([ours, theirs], `Merge branch '${ref}' into ${into}`, lane);
        this.#moveHead(c.id);
        return { type: 'merge', id: c.id };
    }

    reset(ref) {
        const id = this.resolve(ref);
        if (!id) throw new GitError(`fatal: ambiguous argument '${ref}': unknown revision`);
        this.#moveHead(id);
        return id;
    }

    // ------------------------------------------------------------ snapshots (for undo/redo)

    toJSON() {
        return {
            commits: [...this.commits.values()],
            branches: [...this.branches],
            lanes: [...this.lanes],
            head: { ...this.head },
            seq: this.seq,
        };
    }

    static fromJSON(data) {
        const r = Object.create(Repo.prototype);
        r.commits = new Map(data.commits.map((c) => [c.id, { ...c, parents: [...c.parents] }]));
        r.branches = new Map(data.branches);
        r.lanes = new Map(data.lanes);
        r.head = { ...data.head };
        r.seq = data.seq;
        return r;
    }

    // ------------------------------------------------------------ private

    #createCommit(parents, message, lane) {
        const seq = this.seq++;
        const id = shortHash(`${seq}\0${message}\0${parents.join(',')}`);
        const c = { id, parents, message, seq, lane };
        this.commits.set(id, c);
        return c;
    }

    #moveHead(id) {
        if (this.head.type === 'branch') this.branches.set(this.head.name, id);
        else this.head = { type: 'detached', id };
    }

    #nextLane() {
        return Math.max(-1, ...this.lanes.values()) + 1;
    }

    #detachedLane() {
        if (!this.lanes.has('(detached)')) this.lanes.set('(detached)', this.#nextLane());
        return this.lanes.get('(detached)');
    }
}

export class GitError extends Error {}

/** Deterministic 7-character hex id (FNV-1a), so tests and replays are stable. */
export function shortHash(text) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ (c + i), 0x01000193) >>> 0;
    }
    return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 7);
}
