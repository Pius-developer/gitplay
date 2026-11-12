import { Workspace } from '../ui/Workspace.js';
import { api } from '../api.js';

const root = document.querySelector('[data-workspace]');
const id = root.dataset.session;
const ws = new Workspace(root);
const playBtn = document.querySelector('[data-action="play"]');
const stepBtn = document.querySelector('[data-action="step"]');
const restartBtn = document.querySelector('[data-action="restart"]');
const progress = document.querySelector('[data-progress]');

let commands = [];
let index = 0;
let playing = false;

function updateUi() {
    progress.textContent = `${index} / ${commands.length} commands`;
    stepBtn.disabled = playing || index >= commands.length;
    playBtn.textContent = playing ? 'Pause' : (index >= commands.length ? 'Replay' : 'Play');
}

async function step() {
    if (index >= commands.length) return false;
    await ws.terminal.type(commands[index++]);
    updateUi();
    return true;
}

async function play() {
    if (index >= commands.length) restart();
    playing = true;
    updateUi();
    while (playing && (await step())) {
        await new Promise((r) => setTimeout(r, 650));
    }
    playing = false;
    updateUi();
}

function restart() {
    playing = false;
    index = 0;
    ws.reset();
    updateUi();
}

playBtn.addEventListener('click', () => (playing ? (playing = false, updateUi()) : play()));
stepBtn.addEventListener('click', async () => { stepBtn.disabled = true; await step(); });
restartBtn.addEventListener('click', restart);

try {
    ({ commands } = await api.session(id));
    ws.terminal.print(`Replaying a shared session: ${commands.length} commands. Press Play.`, 'muted');
    updateUi();
} catch (e) {
    ws.terminal.print(e.message, 'error');
    playBtn.disabled = true;
}
