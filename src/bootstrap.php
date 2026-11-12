<?php
declare(strict_types=1);

define('ROOT', dirname(__DIR__));
define('DB_PATH', getenv('GITPLAY_DB') ?: ROOT . '/data/gitplay.sqlite');

require __DIR__ . '/Database.php';
require __DIR__ . '/SessionRepository.php';
require __DIR__ . '/SessionValidator.php';
require __DIR__ . '/Challenges.php';
require __DIR__ . '/http.php';
