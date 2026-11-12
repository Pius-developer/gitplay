/**
 * A small terminal: an output log plus one input line.
 * It knows nothing about Git; it just hands each line to `onCommand`
 * and prints whatever comes back.
 */
export class Terminal {
    #history = [];
    #cursor = 0;

    constructor(root, { onCommand, prompt = () => '$' }) {
        this.root = root;
        this.onCommand = onCommand;
        this.prompt = prompt;

        this.output = root.querySelector('[data-output]');
        this.form = root.querySelector('form');
        this.input = root.querySelector('input');
        this.promptEl = root.querySelector('[data-prompt]');

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submit(this.input.value);
        });
        this.input.addEventListener('keydown', (e) => this.#onKey(e));
        root.addEventListener('click', (e) => {
            if (!window.getSelection().toString() && e.target.tagName !== 'BUTTON') this.input.focus();
        });
        this.refreshPrompt();
    }

    submit(line) {
        const trimmed = line.trim();
        this.input.value = '';
        if (trimmed) {
            this.#history.push(trimmed);
            this.#cursor = this.#history.length;
        }
        this.echo(trimmed);
        const result = this.onCommand(trimmed);
        if (result?.output) this.print(result.output, result.ok === false ? 'error' : 'out');
        this.refreshPrompt();
    }

    echo(line) {
        const row = document.createElement('div');
        row.className = 'line cmd';
        const p = document.createElement('span');
        p.className = 'prompt';
        p.textContent = this.prompt();
        const t = document.createElement('span');
        t.textContent = ` ${line}`;
        row.append(p, t);
        this.output.append(row);
        this.#scroll();
    }

    print(text, kind = 'out') {
        const row = document.createElement('pre');
        row.className = `line ${kind}`;
        row.textContent = text;
        this.output.append(row);
        this.#scroll();
    }

    clear() {
        this.output.replaceChildren();
    }

    refreshPrompt() {
        if (this.promptEl) this.promptEl.textContent = this.prompt();
    }

    /** Types a command character by character (used by replays), then runs it. */
    async type(line, speed = 28) {
        this.input.value = '';
        for (const ch of line) {
            this.input.value += ch;
            await new Promise((r) => setTimeout(r, speed));
        }
        await new Promise((r) => setTimeout(r, 160));
        this.submit(line);
    }

    #onKey(e) {
        if (e.key === 'ArrowUp' && this.#history.length) {
            e.preventDefault();
            this.#cursor = Math.max(0, this.#cursor - 1);
            this.input.value = this.#history[this.#cursor] ?? '';
        } else if (e.key === 'ArrowDown' && this.#history.length) {
            e.preventDefault();
            this.#cursor = Math.min(this.#history.length, this.#cursor + 1);
            this.input.value = this.#history[this.#cursor] ?? '';
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            this.clear();
        }
    }

    #scroll() {
        this.output.scrollTop = this.output.scrollHeight;
    }
}
