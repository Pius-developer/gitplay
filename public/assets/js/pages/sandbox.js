import { Workspace } from '../ui/Workspace.js';
import { api } from '../api.js';

const STORAGE_KEY = 'gitplay.sandbox';
const root = document.querySelector('[data-workspace]');
const ws = new Workspace(root);

// Restore the last session from localStorage (commands are replayed, so state is exact).
try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(saved) && saved.length) {
        ws.load(saved);
        ws.terminal.print(`Restored your last session (${saved.length} commands). Type "reset" or press Reset to start over.`, 'muted');
    } else {
        ws.terminal.print('Welcome to GitPlay. Try:  git commit -m "first commit"   or type  help', 'muted');
    }
} catch { /* storage blocked: start fresh */ }

const buttons = {
    undo: document.querySelector('[data-action="undo"]'),
    redo: document.querySelector('[data-action="redo"]'),
    reset: document.querySelector('[data-action="reset"]'),
    share: document.querySelector('[data-action="share"]'),
};

function sync() {
    buttons.undo.disabled = !ws.history.canUndo;
    buttons.redo.disabled = !ws.history.canRedo;
    buttons.share.disabled = !ws.history.canUndo;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ws.history.lines())); } catch { /* ignore */ }
}

ws.addEventListener('change', sync);
sync();

buttons.undo.addEventListener('click', () => { const r = ws.undo(); ws.terminal.print(r.output, r.ok ? 'muted' : 'error'); });
buttons.redo.addEventListener('click', () => { const r = ws.redo(); ws.terminal.print(r.output, r.ok ? 'muted' : 'error'); });
buttons.reset.addEventListener('click', () => {
    ws.reset();
    ws.terminal.print('Fresh repository. You are on main with one commit.', 'muted');
});

// "reset" typed in the terminal does the same as the button.
const original = ws.execute.bind(ws);
ws.execute = (line) => (line === 'reset' ? (buttons.reset.click(), null) : original(line));

// Share: send the commands to PHP, get back a short link.
const dialog = document.querySelector('[data-share-dialog]');
buttons.share.addEventListener('click', async () => {
    buttons.share.disabled = true;
    buttons.share.textContent = 'Saving…';
    try {
        const { url } = await api.saveSession(ws.history.lines());
        dialog.querySelector('input').value = new URL(url, location.origin).href;
        dialog.showModal();
    } catch (e) {
        ws.terminal.print(`Could not share: ${e.message}`, 'error');
    } finally {
        buttons.share.textContent = 'Share';
        sync();
    }
});
dialog.querySelector('[data-copy]').addEventListener('click', async (e) => {
    const input = dialog.querySelector('input');
    try { await navigator.clipboard.writeText(input.value); e.target.textContent = 'Copied'; }
    catch { input.select(); e.target.textContent = 'Press ⌘C'; }
    setTimeout(() => (e.target.textContent = 'Copy link'), 1500);
});

ws.terminal.input.focus();
