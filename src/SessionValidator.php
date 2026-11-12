<?php
declare(strict_types=1);

/**
 * Never trust the browser: whatever JavaScript sends, PHP checks it again.
 */
final class SessionValidator
{
    public const MAX_COMMANDS = 200;
    public const MAX_LENGTH = 160;

    /**
     * @return array{0: string[]|null, 1: string|null} [cleanCommands, error]
     */
    public static function validate(mixed $payload): array
    {
        if (!is_array($payload) || !isset($payload['commands']) || !is_array($payload['commands'])) {
            return [null, 'Send JSON like {"commands": ["git commit -m \"hi\""]}.'];
        }
        $commands = $payload['commands'];
        if ($commands === []) {
            return [null, 'There is nothing to share yet. Run a few git commands first.'];
        }
        if (count($commands) > self::MAX_COMMANDS) {
            return [null, 'Sessions can have at most ' . self::MAX_COMMANDS . ' commands.'];
        }
        $clean = [];
        foreach ($commands as $c) {
            if (!is_string($c)) {
                return [null, 'Every command must be a string.'];
            }
            $c = trim($c);
            if ($c === '' || mb_strlen($c) > self::MAX_LENGTH) {
                return [null, 'Commands must be 1–' . self::MAX_LENGTH . ' characters.'];
            }
            if (!str_starts_with($c, 'git ')) {
                return [null, 'Only git commands can be shared.'];
            }
            if (preg_match('/[\x00-\x1F\x7F]/', $c)) {
                return [null, 'Commands cannot contain control characters.'];
            }
            $clean[] = $c;
        }
        return [$clean, null];
    }
}
