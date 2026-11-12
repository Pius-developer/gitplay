<?php
declare(strict_types=1);

/**
 * Saves and loads shared sessions. A session is just the list of
 * commands someone typed; the browser replays them to rebuild the graph.
 */
final class SessionRepository
{
    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/l/i

    public function __construct(private PDO $db) {}

    /** @param string[] $commands */
    public function create(array $commands, string $ipHash): string
    {
        $stmt = $this->db->prepare('INSERT INTO sessions (id, commands, ip_hash) VALUES (?, ?, ?)');
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $id = self::newId();
            try {
                $stmt->execute([$id, json_encode(array_values($commands)), $ipHash]);
                return $id;
            } catch (PDOException $e) {
                if (!str_contains($e->getMessage(), 'UNIQUE')) {
                    throw $e;
                }
            }
        }
        throw new RuntimeException('Could not generate a unique id.');
    }

    public function find(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, commands, created_at FROM sessions WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row['commands'] = json_decode($row['commands'], true) ?: [];
        return $row;
    }

    /** How many sessions this client saved in the last hour (for rate limiting). */
    public function recentCount(string $ipHash): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM sessions WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')"
        );
        $stmt->execute([$ipHash]);
        return (int) $stmt->fetchColumn();
    }

    public static function newId(int $length = 6): string
    {
        $id = '';
        for ($i = 0; $i < $length; $i++) {
            $id .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }
        return $id;
    }

    public static function isValidId(string $id): bool
    {
        return (bool) preg_match('/^[' . self::ALPHABET . ']{6}$/', $id);
    }
}
