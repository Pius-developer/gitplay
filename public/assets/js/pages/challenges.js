import { Workspace } from '../ui/Workspace.js';
import { checkEach, checkGoal } from '../engine/goals.js';
import { api } from '../api.js';
import { History } from '../engine/History.js';

const DONE_KEY = 'gitplay.done';
const list = document.querySelector('[data-challenge-list]');
const panel = document.querySelector('[data-challenge]');
const ws = new Workspace(document.querySelector('[data-workspace]'));

let challenges = [];
let current = null;
let done = new Set();
try { done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]')); } catch { /* ignore */ }

function saveDone() {
    try { localStorage.setItem(DONE_KEY, JSON.stringify([...done])); } catch { /* ignore */ }
}

function renderList() {
    list.replaceChildren(...challenges.map((c, i) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'challenge-item';
        btn.setAttribute('aria-current', current?.id === c.id ? 'true' : 'false');
        btn.innerHTML = `<span class="num"></span><span class="t"></span><span class="tick" aria-hidden="true"></span>`;
        btn.querySelector('.num').textContent = String(i + 1).padStart(2, '0');
        btn.querySelector('.t').textContent = c.title;
        btn.querySelector('.tick').textContent = done.has(c.id) ? '✓' : '';
        if (done.has(c.id)) btn.classList.add('is-done');
        btn.addEventListener('click', () => start(c));
        li.append(btn);
        return li;
    }));
}

function renderChecklist() {
    const results = checkEach(ws.repo, current.goal);
    const ul = panel.querySelector('[data-checklist]');
    ul.replaceChildren(...results.map((r, i) => {
        const li = document.createElement('li');
        li.className = r.passed ? 'pass' : '';
        li.textContent = current.checklist[i] ?? JSON.stringify(r.rule);
        return li;
    }));
}

function start(challenge) {
    current = challenge;
    panel.querySelector('[data-title]').textContent = challenge.title;
    panel.querySelector('[data-intro]').textContent = challenge.intro;
    panel.querySelector('[data-hint]').textContent = challenge.hint;
    panel.querySelector('details').open = false;
    panel.querySelector('[data-success]').hidden = true;
    ws.load(challenge.setup);
    ws.history = new History(); // setup steps are not undoable
    ws.terminal.clear();
    ws.terminal.print(`Challenge: ${challenge.title}`, 'muted');
    renderList();
    renderChecklist();
    ws.terminal.input.focus();
}

ws.addEventListener('change', () => {
    if (!current) return;
    renderChecklist();
    const success = panel.querySelector('[data-success]');
    if (checkGoal(ws.repo, current.goal) && success.hidden) {
        success.hidden = false;
        // Print after the command's own output (the terminal prints it once execute() returns).
        setTimeout(() => ws.terminal.print(`✓ Challenge complete: ${current.title}`, 'success'), 0);
        done.add(current.id);
        saveDone();
        renderList();
    }
});

panel.querySelector('[data-restart]').addEventListener('click', () => current && start(current));
panel.querySelector('[data-next]').addEventListener('click', () => {
    const i = challenges.findIndex((c) => c.id === current.id);
    if (challenges[i + 1]) start(challenges[i + 1]);
});

try {
    challenges = await api.challenges();
    start(challenges.find((c) => !done.has(c.id)) ?? challenges[0]);
} catch (e) {
    panel.querySelector('[data-title]').textContent = 'Could not load challenges';
    panel.querySelector('[data-intro]').textContent = e.message;
}
