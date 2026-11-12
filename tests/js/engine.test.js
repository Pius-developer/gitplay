import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Repo, shortHash } from '../../public/assets/js/engine/Repo.js';
import { run } from '../../public/assets/js/engine/commands.js';
import { tokenize } from '../../public/assets/js/engine/parser.js';
import { History } from '../../public/assets/js/engine/History.js';
import { checkGoal } from '../../public/assets/js/engine/goals.js';

const exec = (repo, ...lines) => lines.map((l) => run(repo, l));

test('tokenize keeps quoted text together', () => {
    assert.deepEqual(tokenize('git commit -m "fix the login bug"'), ['git', 'commit', '-m', 'fix the login bug']);
    assert.deepEqual(tokenize("git commit -m 'single quotes'"), ['git', 'commit', '-m', 'single quotes']);
    assert.deepEqual(tokenize('git commit -m ""'), ['git', 'commit', '-m', '']);
    assert.throws(() => tokenize('git commit -m "oops'), /Unclosed quote/);
});

test('a new repo starts on main with one commit', () => {
    const r = new Repo();
    assert.equal(r.currentBranch(), 'main');
    assert.equal(r.commits.size, 1);
});

test('commit moves the current branch forward', () => {
    const r = new Repo();
    const before = r.headCommit();
    const [res] = exec(r, 'git commit -m "first"');
    assert.ok(res.ok);
    assert.notEqual(r.headCommit(), before);
    assert.deepEqual(r.commits.get(r.headCommit()).parents, [before]);
});

test('commit without a message fails like real git', () => {
    const r = new Repo();
    const [res] = exec(r, 'git commit');
    assert.equal(res.ok, false);
    assert.match(res.output, /empty commit message/);
});

test('checkout -b creates and switches; commits stay on that branch', () => {
    const r = new Repo();
    exec(r, 'git checkout -b feature', 'git commit -m "work"');
    assert.equal(r.currentBranch(), 'feature');
    assert.notEqual(r.branches.get('feature'), r.branches.get('main'));
});

test('merge fast-forwards when possible', () => {
    const r = new Repo();
    exec(r, 'git switch -c feature', 'git commit -m "a"', 'git switch main');
    const [res] = exec(r, 'git merge feature');
    assert.match(res.output, /Fast-forward/);
    assert.equal(r.branches.get('main'), r.branches.get('feature'));
});

test('merge creates a merge commit with two parents when histories diverge', () => {
    const r = new Repo();
    exec(r, 'git switch -c feature', 'git commit -m "f1"', 'git switch main', 'git commit -m "m1"');
    const [res] = exec(r, 'git merge feature');
    assert.match(res.output, /ort/);
    const head = r.commits.get(r.headCommit());
    assert.equal(head.parents.length, 2);
    assert.ok(r.isAncestor(r.branches.get('feature'), r.headCommit()));
});

test('merging an ancestor is already up to date', () => {
    const r = new Repo();
    exec(r, 'git branch old', 'git commit -m "new"');
    const [res] = exec(r, 'git merge old');
    assert.equal(res.output, 'Already up to date.');
    assert.equal(res.changed, false);
});

test('resolve understands HEAD~n, ^ and short ids', () => {
    const r = new Repo();
    const root = r.headCommit();
    exec(r, 'git commit -m "1"', 'git commit -m "2"');
    assert.equal(r.resolve('HEAD~2'), root);
    assert.equal(r.resolve('HEAD^^'), root);
    assert.equal(r.resolve(root.slice(0, 5)), root);
    assert.equal(r.resolve('nope'), null);
});

test('checking out a commit detaches HEAD; new commits stay detached', () => {
    const r = new Repo();
    exec(r, 'git commit -m "1"');
    const [res] = exec(r, 'git checkout HEAD~1');
    assert.match(res.output, /detached HEAD/);
    assert.equal(r.currentBranch(), null);
    exec(r, 'git commit -m "floating"');
    assert.equal(r.currentBranch(), null);
    assert.equal(r.branches.size, 1);
});

test('reset --hard moves the branch back', () => {
    const r = new Repo();
    const root = r.headCommit();
    exec(r, 'git commit -m "mistake"', 'git reset --hard HEAD~1');
    assert.equal(r.branches.get('main'), root);
});

test('branch -d refuses unmerged work, -D forces it', () => {
    const r = new Repo();
    exec(r, 'git switch -c wip', 'git commit -m "x"', 'git switch main');
    const [soft] = exec(r, 'git branch -d wip');
    assert.equal(soft.ok, false);
    const [hard] = exec(r, 'git branch -D wip');
    assert.ok(hard.ok);
    assert.equal(r.branches.has('wip'), false);
});

test('cannot delete the branch you are on', () => {
    const r = new Repo();
    const [res] = exec(r, 'git branch -d main');
    assert.equal(res.ok, false);
});

test('invalid branch names and duplicates are rejected', () => {
    const r = new Repo();
    assert.equal(exec(r, 'git branch "bad name"')[0].ok, false);
    exec(r, 'git branch dev');
    assert.equal(exec(r, 'git branch dev')[0].ok, false);
});

test('unknown commands get helpful errors', () => {
    const r = new Repo();
    assert.match(run(r, 'git push').output, /not a git command/);
    assert.match(run(r, 'ls').output, /command not found/);
});

test('log --oneline shows HEAD decoration', () => {
    const r = new Repo();
    exec(r, 'git commit -m "hello"');
    const out = run(r, 'git log --oneline').output.split('\n');
    assert.match(out[0], /\(HEAD -> main\) hello/);
    assert.equal(out.length, 2);
});

test('snapshots round-trip and undo/redo restore state', () => {
    const r1 = new Repo();
    const h = new History();
    h.record(r1, 'git commit -m "a"');
    run(r1, 'git commit -m "a"');
    const after = r1.headCommit();
    const undone = h.undo(r1);
    assert.equal(undone.repo.commits.size, 1);
    const redone = h.redo(undone.repo);
    assert.equal(redone.repo.headCommit(), after);
});

test('ids are deterministic so replays match', () => {
    assert.equal(shortHash('abc'), shortHash('abc'));
    assert.match(shortHash('abc'), /^[0-9a-f]{7}$/);
    const a = new Repo(), b = new Repo();
    exec(a, 'git commit -m "x"'); exec(b, 'git commit -m "x"');
    assert.equal(a.headCommit(), b.headCommit());
});

test('goals: a merge challenge passes only when done', () => {
    const goal = { all: [{ branchExists: 'feature' }, { onBranch: 'main' }, { mergeCommits: 1 }, { contains: ['main', 'feature'] }] };
    const r = new Repo();
    exec(r, 'git switch -c feature', 'git commit -m "f"', 'git switch main', 'git commit -m "m"');
    assert.equal(checkGoal(r, goal), false);
    exec(r, 'git merge feature');
    assert.equal(checkGoal(r, goal), true);
});
