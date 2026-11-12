import { parse, getFlag, hasFlag, positionals } from './parser.js';
import { GitError } from './Repo.js';

/**
 * Runs one line of terminal input against a Repo.
 * Returns { output: string, ok: boolean, changed: boolean }.
 * `changed` tells the UI whether the repository state was modified,
 * which decides whether the step goes on the undo stack.
 */
export function run(repo, line) {
    let parsed;
    try {
        parsed = parse(line);
    } catch (e) {
        return fail(e.message);
    }
    const { program, command, args } = parsed;
    if (!program) return { output: '', ok: true, changed: false };
    if (program !== 'git') {
        return fail(`${program}: command not found. Try "git help".`);
    }

    const handler = COMMANDS[command];
    if (!handler) {
        return fail(command ? `git: '${command}' is not a git command. See 'git help'.` : HELP);
    }
    try {
        return handler(repo, args);
    } catch (e) {
        if (e instanceof GitError) return fail(e.message);
        throw e;
    }
}

const ok = (output, changed = true) => ({ output, ok: true, changed });
const fail = (output) => ({ output, ok: false, changed: false });

export const HELP = `Supported commands:
  git commit -m "message"     save a new commit
  git branch [name]           list branches, or create one
  git branch -d <name>        delete a merged branch (-D to force)
  git checkout <branch|id>    switch branches or detach HEAD
  git checkout -b <name>      create a branch and switch to it
  git switch [-c] <name>      the modern way to switch branches
  git merge <branch>          merge a branch into the current one
  git reset --hard <ref>      move the current branch (e.g. HEAD~1)
  git log [--oneline]         show history
  git status                  where am I?

Terminal: undo, redo, clear, help`;

const COMMANDS = {
    help: () => ok(HELP, false),

    commit(repo, args) {
        if (hasFlag(args, '--amend')) throw new GitError('GitPlay does not support --amend yet.');
        const message = getFlag(args, '-m', '--message');
        if (message === null || message.trim() === '') {
            throw new GitError('Aborting commit due to empty commit message. Use: git commit -m "message"');
        }
        const c = repo.commit(message.trim());
        const where = repo.currentBranch() ?? `detached HEAD ${c.id}`;
        return ok(`[${where} ${c.id}] ${c.message}`);
    },

    branch(repo, args) {
        const del = getFlag(args, '-d', '--delete');
        const force = getFlag(args, '-D');
        if (del !== null || force !== null) {
            const name = del ?? force;
            if (!name) throw new GitError('fatal: branch name required');
            const id = repo.branches.get(name);
            repo.deleteBranch(name, force !== null);
            return ok(`Deleted branch ${name} (was ${id}).`);
        }
        const [name, start] = positionals(args);
        if (!name) {
            const current = repo.currentBranch();
            const lines = [...repo.branches.keys()].sort().map((b) => (b === current ? `* ${b}` : `  ${b}`));
            if (!current) lines.unshift(`* (HEAD detached at ${repo.headCommit()})`);
            return ok(lines.join('\n'), false);
        }
        const at = start ? repo.resolve(start) : repo.headCommit();
        if (!at) throw new GitError(`fatal: not a valid object name: '${start}'.`);
        repo.createBranch(name, at);
        return ok('');
    },

    checkout(repo, args) {
        const create = getFlag(args, '-b');
        if (create !== null) return switchCreate(repo, create, positionals(args, ['-b'])[0]);
        const [target] = positionals(args);
        if (!target) throw new GitError('error: you must specify a branch or commit to check out');
        return doSwitch(repo, target, true);
    },

    switch(repo, args) {
        const create = getFlag(args, '-c', '--create');
        if (create !== null) return switchCreate(repo, create, positionals(args, ['-c', '--create'])[0]);
        const [target] = positionals(args);
        if (!target) throw new GitError('fatal: missing branch name');
        if (!repo.branches.has(target) && !hasFlag(args, '--detach')) {
            throw new GitError(`fatal: invalid reference: ${target}\nhint: use 'git switch --detach ${target}' to look at a commit`);
        }
        return doSwitch(repo, target, false);
    },

    merge(repo, args) {
        const [target] = positionals(args);
        if (!target) throw new GitError('fatal: No remote for the current branch. Name a branch to merge.');
        const before = repo.headCommit();
        const res = repo.merge(target);
        if (res.type === 'up-to-date') return ok('Already up to date.', false);
        if (res.type === 'fast-forward') return ok(`Updating ${before}..${res.id}\nFast-forward`);
        return ok(`Merge made by the 'ort' strategy.\n[${repo.currentBranch() ?? 'HEAD'} ${res.id}] ${repo.commits.get(res.id).message}`);
    },

    reset(repo, args) {
        const [target = 'HEAD'] = positionals(args);
        const id = repo.reset(target);
        return ok(`HEAD is now at ${id} ${repo.commits.get(id).message}`);
    },

    log(repo, args) {
        const oneline = hasFlag(args, '--oneline');
        const lines = repo.history().map((c) => {
            const refs = repo.branchesAt(c.id);
            const isHead = c.id === repo.headCommit();
            const deco = [];
            if (isHead) deco.push(repo.currentBranch() ? `HEAD -> ${repo.currentBranch()}` : 'HEAD');
            deco.push(...refs.filter((r) => r !== repo.currentBranch() || !isHead));
            const tag = deco.length ? ` (${deco.join(', ')})` : '';
            return oneline ? `${c.id}${tag} ${c.message}` : `commit ${c.id}${tag}\n    ${c.message}\n`;
        });
        return ok(lines.join('\n').trimEnd(), false);
    },

    status(repo) {
        const b = repo.currentBranch();
        const where = b ? `On branch ${b}` : `HEAD detached at ${repo.headCommit()}`;
        return ok(`${where}\nnothing to commit, working tree clean`, false);
    },
};

function doSwitch(repo, target, allowDetach) {
    if (repo.currentBranch() === target) return ok(`Already on '${target}'`, false);
    const res = repo.checkout(target);
    if (res.detached && !allowDetach) throw new GitError(`fatal: a branch is expected, got commit '${target}'`);
    if (res.detached) {
        return ok(`Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state.\nHEAD is now at ${res.id} ${repo.commits.get(res.id).message}`);
    }
    return ok(`Switched to branch '${target}'`);
}

function switchCreate(repo, name, start) {
    const at = start ? repo.resolve(start) : repo.headCommit();
    if (!at) throw new GitError(`fatal: '${start}' is not a commit`);
    repo.createBranch(name, at);
    repo.checkout(name);
    return ok(`Switched to a new branch '${name}'`);
}
