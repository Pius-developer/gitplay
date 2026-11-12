/**
 * Turns a line typed in the terminal into tokens, respecting quotes.
 *   parse('git commit -m "fix login bug"')
 *   → { program: 'git', command: 'commit', args: ['-m', 'fix login bug'] }
 */
export function tokenize(line) {
    const tokens = [];
    let current = '';
    let quote = null;
    let hasToken = false;

    for (const ch of line.trim()) {
        if (quote) {
            if (ch === quote) { quote = null; } else { current += ch; }
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; hasToken = true; continue; }
        if (/\s/.test(ch)) {
            if (hasToken) { tokens.push(current); current = ''; hasToken = false; }
            continue;
        }
        current += ch;
        hasToken = true;
    }
    if (quote) throw new SyntaxError('Unclosed quote in command.');
    if (hasToken) tokens.push(current);
    return tokens;
}

export function parse(line) {
    const tokens = tokenize(line);
    const [program = '', command = '', ...args] = tokens;
    return { program, command, args };
}

/** Pulls a flag's value out of an argument list: getFlag(['-m', 'hi'], '-m') → 'hi' */
export function getFlag(args, ...names) {
    for (let i = 0; i < args.length; i++) {
        if (names.includes(args[i])) return args[i + 1] ?? '';
    }
    return null;
}

export function hasFlag(args, ...names) {
    return args.some((a) => names.includes(a));
}

/** Positional arguments (anything that is not a flag or a flag's value). */
export function positionals(args, flagsWithValues = []) {
    const out = [];
    for (let i = 0; i < args.length; i++) {
        if (flagsWithValues.includes(args[i])) { i++; continue; }
        if (args[i].startsWith('-')) continue;
        out.push(args[i]);
    }
    return out;
}
