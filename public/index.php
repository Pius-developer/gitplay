<?php
declare(strict_types=1);

/*
 | GitPlay front controller.
 | Pages:  GET /            sandbox
 |         GET /challenges  guided levels
 |         GET /s/{id}      replay a shared session
 | API:    GET  /api/challenges
 |         POST /api/sessions        (JSON body, X-CSRF-Token header)
 |         GET  /api/sessions/{id}
 */

require __DIR__ . '/../src/bootstrap.php';

// Built-in dev server: let it serve real files (CSS, JS, fonts) directly.
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (is_file($file)) {
        return false;
    }
}

session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/', '/') ?: '/';

// ------------------------------------------------------------------ API

if (str_starts_with($path, '/api/')) {
    if ($method === 'GET' && $path === '/api/challenges') {
        json_response(Challenges::all());
    }

    if ($method === 'POST' && $path === '/api/sessions') {
        verify_csrf_header();
        [$commands, $error] = SessionValidator::validate(read_json_body());
        if ($error) {
            json_error($error, 422);
        }
        $sessions = new SessionRepository(Database::connect());
        if ($sessions->recentCount(client_hash()) >= 30) {
            json_error('You are sharing too fast. Try again in a few minutes.', 429);
        }
        $id = $sessions->create($commands, client_hash());
        json_response(['id' => $id, 'url' => '/s/' . $id], 201);
    }

    if ($method === 'GET' && preg_match('#^/api/sessions/([a-z0-9]+)$#', $path, $m)) {
        $session = SessionRepository::isValidId($m[1])
            ? (new SessionRepository(Database::connect()))->find($m[1])
            : null;
        $session ? json_response($session) : json_error('That shared session does not exist.', 404);
    }

    json_error('Not found.', 404);
}

// ------------------------------------------------------------------ pages

if ($method === 'GET' && $path === '/') {
    render('sandbox', ['page' => 'sandbox', 'title' => 'GitPlay: learn Git by playing']);
}

if ($method === 'GET' && $path === '/challenges') {
    render('challenges', ['page' => 'challenges', 'title' => 'Challenges · GitPlay']);
}

if ($method === 'GET' && preg_match('#^/s/([a-z0-9]+)$#', $path, $m)) {
    $exists = SessionRepository::isValidId($m[1]) && (new SessionRepository(Database::connect()))->find($m[1]);
    if ($exists) {
        render('replay', ['page' => 'replay', 'title' => 'Shared session · GitPlay', 'sessionId' => $m[1]]);
    }
}

render('404', ['page' => '404', 'title' => 'Not found · GitPlay'], 404);
