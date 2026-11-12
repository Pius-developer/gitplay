/**
 * Checks a repository against a challenge goal.
 * Goals come from the PHP API as plain JSON, for example:
 *   { "all": [ { "branchExists": "feature" }, { "onBranch": "main" }, { "mergeCommits": 1 } ] }
 * Each rule returns true or false; `all` means every rule must pass.
 */
const RULES = {
    branchExists: (repo, name) => repo.branches.has(name),
    branchMissing: (repo, name) => !repo.branches.has(name),
    onBranch: (repo, name) => repo.currentBranch() === name,
    detached: (repo, want) => (repo.currentBranch() === null) === want,
    minCommits: (repo, n) => repo.commits.size >= n,
    mergeCommits: (repo, n) => [...repo.commits.values()].filter((c) => c.parents.length > 1).length >= n,
    maxMergeCommits: (repo, n) => [...repo.commits.values()].filter((c) => c.parents.length > 1).length <= n,
    branchCommits: (repo, [branch, n]) => {
        const id = repo.branches.get(branch);
        return !!id && repo.history(id).length >= n;
    },
    contains: (repo, [branch, other]) => {
        const a = repo.branches.get(branch), b = repo.branches.get(other);
        return !!a && !!b && repo.isAncestor(b, a);
    },
    sameCommit: (repo, [a, b]) => !!repo.resolve(a) && repo.resolve(a) === repo.resolve(b),
    historyLength: (repo, [ref, n]) => {
        const id = repo.resolve(ref);
        return !!id && repo.history(id).length === n;
    },
};

export function checkGoal(repo, goal) {
    if (goal.all) return goal.all.every((g) => checkGoal(repo, g));
    if (goal.any) return goal.any.some((g) => checkGoal(repo, g));
    const [name, value] = Object.entries(goal)[0];
    const rule = RULES[name];
    if (!rule) throw new Error(`Unknown goal rule: ${name}`);
    return rule(repo, value);
}

/** Per-rule results, so the UI can show a checklist. */
export function checkEach(repo, goal) {
    const rules = goal.all ?? [goal];
    return rules.map((g) => ({ rule: g, passed: checkGoal(repo, g) }));
}
