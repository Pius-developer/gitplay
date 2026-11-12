<?php
declare(strict_types=1);

/**
 * The challenge list lives on the server, so new levels can be added
 * without touching JavaScript. The browser receives this as JSON from
 * GET /api/challenges and checks each `goal` itself (see engine/goals.js).
 *
 * `checklist` holds a human sentence for each rule in `goal.all`, in order.
 */
final class Challenges
{
    public static function all(): array
    {
        return [
            [
                'id' => 'first-commit',
                'title' => 'Make your first commit',
                'intro' => 'A commit is a snapshot of your work. Save one with a message that says what changed.',
                'hint' => 'git commit -m "my first commit"',
                'setup' => [],
                'goal' => ['all' => [['minCommits' => 2], ['onBranch' => 'main']]],
                'checklist' => ['Make at least one new commit', 'Stay on main'],
            ],
            [
                'id' => 'branch-out',
                'title' => 'Work on a branch',
                'intro' => 'Branches let you try ideas without touching main. Create a branch called feature, switch to it, and commit twice.',
                'hint' => 'git switch -c feature, then git commit -m "..." twice',
                'setup' => [],
                'goal' => ['all' => [['branchExists' => 'feature'], ['onBranch' => 'feature'], ['branchCommits' => ['feature', 3]]]],
                'checklist' => ['A branch named feature exists', 'You are on feature', 'feature has 2 new commits'],
            ],
            [
                'id' => 'fast-forward',
                'title' => 'Fast-forward main',
                'intro' => 'Your feature branch is ahead of main and main has not moved. Bring main up to date. Git can just slide the label forward.',
                'hint' => 'Switch to main, then git merge feature',
                'setup' => ['git switch -c feature', 'git commit -m "Add login page"', 'git commit -m "Style login page"'],
                'goal' => ['all' => [['onBranch' => 'main'], ['sameCommit' => ['main', 'feature']], ['maxMergeCommits' => 0]]],
                'checklist' => ['You are on main', 'main and feature point at the same commit', 'No merge commit was needed'],
            ],
            [
                'id' => 'true-merge',
                'title' => 'Merge diverged work',
                'intro' => 'main and feature both have new commits. Merge feature into main to combine them with a merge commit.',
                'hint' => 'On main: git merge feature',
                'setup' => ['git switch -c feature', 'git commit -m "Add search"', 'git switch main', 'git commit -m "Fix footer"'],
                'goal' => ['all' => [['onBranch' => 'main'], ['mergeCommits' => 1], ['contains' => ['main', 'feature']]]],
                'checklist' => ['You are on main', 'There is a merge commit', 'main contains all of feature'],
            ],
            [
                'id' => 'undo-commit',
                'title' => 'Undo a bad commit',
                'intro' => 'Oops. The last commit on main was a mistake. Move main back one commit.',
                'hint' => 'git reset --hard HEAD~1',
                'setup' => ['git commit -m "Good work"', 'git commit -m "Oops, broke everything"'],
                'goal' => ['all' => [['onBranch' => 'main'], ['historyLength' => ['main', 2]]]],
                'checklist' => ['You are on main', 'main no longer includes the bad commit'],
            ],
            [
                'id' => 'detached-rescue',
                'title' => 'Rescue a detached HEAD',
                'intro' => 'You checked out an old commit and made a commit there. It is not on any branch yet. Save it on a new branch called rescue.',
                'hint' => 'git switch -c rescue',
                'setup' => ['git commit -m "Release 1.0"', 'git commit -m "Release 1.1"', 'git checkout HEAD~1', 'git commit -m "Hotfix for 1.0"'],
                'goal' => ['all' => [['branchExists' => 'rescue'], ['onBranch' => 'rescue'], ['detached' => false], ['historyLength' => ['rescue', 3]]]],
                'checklist' => ['A branch named rescue exists', 'You are on rescue', 'HEAD is no longer detached', 'rescue keeps your hotfix commit'],
            ],
            [
                'id' => 'clean-up',
                'title' => 'Clean up merged branches',
                'intro' => 'feature is already merged into main. Delete it to keep the branch list tidy.',
                'hint' => 'git branch -d feature',
                'setup' => ['git switch -c feature', 'git commit -m "Add profile page"', 'git switch main', 'git merge feature'],
                'goal' => ['all' => [['branchMissing' => 'feature'], ['onBranch' => 'main']]],
                'checklist' => ['feature has been deleted', 'You are on main'],
            ],
        ];
    }
}
