<?php
declare(strict_types=1);

/*
 | Tiny test runner, no PHPUnit needed:  php tests/php/run.php
 */
putenv('GITPLAY_DB=' . sys_get_temp_dir() . '/gitplay-test-' . getmypid() . '.sqlite');
require __DIR__ . '/../../src/bootstrap.php';

$passed = 0;
$failed = 0;
function test(string $name, callable $fn): void
{
    global $passed, $failed;
    try {
        $fn();
        $passed++;
        echo "ok   - {$name}\n";
    } catch (Throwable $e) {
        $failed++;
        echo "FAIL - {$name}\n       {$e->getMessage()}\n";
    }
}
function assert_true(bool $cond, string $msg = 'expected true'): void
{
    if (!$cond) throw new RuntimeException($msg);
}
function assert_same(mixed $expected, mixed $actual): void
{
    if ($expected !== $actual) {
        throw new RuntimeException('expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

// ---------------------------------------------------------------- validator

test('validator accepts a normal session and trims commands', function () {
    [$clean, $err] = SessionValidator::validate(['commands' => ['  git commit -m "hi" ', 'git switch -c feature']]);
    assert_same(null, $err);
    assert_same(['git commit -m "hi"', 'git switch -c feature'], $clean);
});

test('validator rejects missing or wrong-shaped payloads', function () {
    assert_true(SessionValidator::validate(null)[1] !== null);
    assert_true(SessionValidator::validate(['commands' => 'git commit'])[1] !== null);
    assert_true(SessionValidator::validate(['commands' => []])[1] !== null);
    assert_true(SessionValidator::validate(['commands' => [42]])[1] !== null);
});

test('validator only allows git commands', function () {
    [, $err] = SessionValidator::validate(['commands' => ['rm -rf /']]);
    assert_true(str_contains((string) $err, 'Only git commands'));
});

test('validator enforces limits and blocks control characters', function () {
    assert_true(SessionValidator::validate(['commands' => array_fill(0, 201, 'git status')])[1] !== null);
    assert_true(SessionValidator::validate(['commands' => ['git commit -m "' . str_repeat('a', 200) . '"']])[1] !== null);
    assert_true(SessionValidator::validate(['commands' => ["git commit -m \"a\x07\""]])[1] !== null);
});

// ---------------------------------------------------------------- repository

test('ids are 6 characters from the safe alphabet', function () {
    for ($i = 0; $i < 50; $i++) {
        $id = SessionRepository::newId();
        assert_true(SessionRepository::isValidId($id), "bad id {$id}");
    }
    assert_true(!SessionRepository::isValidId('ABC123'));
    assert_true(!SessionRepository::isValidId('../etc'));
});

test('sessions round-trip through SQLite', function () {
    $repo = new SessionRepository(Database::connect());
    $id = $repo->create(['git commit -m "a"', 'git switch -c b'], 'hash1');
    $found = $repo->find($id);
    assert_same(['git commit -m "a"', 'git switch -c b'], $found['commands']);
    assert_same(null, $repo->find('zzzzzz'));
});

test('recentCount counts per client', function () {
    $repo = new SessionRepository(Database::connect());
    $repo->create(['git status'], 'client-x');
    $repo->create(['git status'], 'client-x');
    assert_same(2, $repo->recentCount('client-x'));
    assert_same(0, $repo->recentCount('client-y'));
});

// ---------------------------------------------------------------- challenges

test('every challenge has a checklist line for each goal rule', function () {
    $ids = [];
    foreach (Challenges::all() as $c) {
        foreach (['id', 'title', 'intro', 'hint', 'setup', 'goal', 'checklist'] as $key) {
            assert_true(array_key_exists($key, $c), "{$c['id']} missing {$key}");
        }
        assert_same(count($c['goal']['all']), count($c['checklist']));
        assert_true(!in_array($c['id'], $ids, true), "duplicate id {$c['id']}");
        $ids[] = $c['id'];
        foreach ($c['setup'] as $cmd) {
            assert_true(str_starts_with($cmd, 'git '), "setup must be git commands");
        }
    }
});

@unlink((string) getenv('GITPLAY_DB'));
echo "\n{$passed} passed, {$failed} failed\n";
exit($failed ? 1 : 0);
