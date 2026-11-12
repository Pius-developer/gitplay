<?php
declare(strict_types=1);

final class Database
{
    public static function connect(string $path = DB_PATH): PDO
    {
        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec(<<<SQL
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                commands    TEXT NOT NULL,          -- JSON array of strings
                ip_hash     TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip_hash, created_at);
        SQL);
        return $pdo;
    }
}
