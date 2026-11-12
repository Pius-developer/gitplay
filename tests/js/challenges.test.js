import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Repo } from '../../public/assets/js/engine/Repo.js';
import { run } from '../../public/assets/js/engine/commands.js';
import { checkGoal } from '../../public/assets/js/engine/goals.js';

// Ask PHP for the real challenge list, exactly what /api/challenges serves.
const json = execFileSync('php', ['-r', "require 'src/bootstrap.php'; echo json_encode(Challenges::all());"], { encoding: 'utf8' });
const challenges = JSON.parse(json);

const solutions = {
    'first-commit': ['git commit -m "first"'],
    'branch-out': ['git switch -c feature', 'git commit -m "a"', 'git commit -m "b"'],
    'fast-forward': ['git switch main', 'git merge feature'],
    'true-merge': ['git merge feature'],
    'undo-commit': ['git reset --hard HEAD~1'],
    'detached-rescue': ['git switch -c rescue'],
    'clean-up': ['git branch -d feature'],
};

for (const c of challenges) {
    test(`challenge "${c.id}" starts unsolved and can be solved`, () => {
        const repo = new Repo();
        for (const line of c.setup) assert.ok(run(repo, line).ok, `setup failed: ${line}`);
        assert.equal(checkGoal(repo, c.goal), false, 'should not be solved before playing');
        assert.ok(solutions[c.id], `no scripted solution for ${c.id}`);
        for (const line of solutions[c.id]) assert.ok(run(repo, line).ok, `solution step failed: ${line}`);
        assert.equal(checkGoal(repo, c.goal), true);
    });
}
