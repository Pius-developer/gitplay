/**
 * Draws the commit graph as SVG and animates changes.
 *
 * Elements are "keyed" by commit id / branch name: on every render we
 * reuse existing SVG nodes and only move them, so CSS transitions can
 * animate commits appearing and branch labels sliding to new commits.
 */
const NS = 'http://www.w3.org/2000/svg';
const GAP_X = 92;
const GAP_Y = 96;
const PAD_X = 60;
const PAD_Y = 84;
const R = 15;

const el = (name, attrs = {}) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
};

export class Graph {
    constructor(container) {
        this.container = container;
        this.svg = el('svg', { class: 'graph', role: 'img', 'aria-label': 'Commit graph' });
        this.edges = el('g', { class: 'edges' });
        this.nodes = el('g', { class: 'nodes' });
        this.labels = el('g', { class: 'labels' });
        this.svg.append(this.edges, this.nodes, this.labels);
        container.append(this.svg);
        this.nodeEls = new Map();
        this.labelEls = new Map();
    }

    position(commit) {
        return { x: PAD_X + commit.seq * GAP_X, y: PAD_Y + commit.lane * GAP_Y };
    }

    render(repo) {
        const commits = [...repo.commits.values()].sort((a, b) => a.seq - b.seq);
        const maxSeq = Math.max(...commits.map((c) => c.seq));
        const maxLane = Math.max(...commits.map((c) => c.lane));
        const width = PAD_X * 2 + maxSeq * GAP_X;
        const height = PAD_Y + maxLane * GAP_Y + 64;
        this.svg.setAttribute('viewBox', `0 0 ${Math.max(width, 420)} ${Math.max(height, 220)}`);
        this.svg.style.width = `${Math.max(width, 420)}px`;
        this.svg.style.height = `${Math.max(height, 220)}px`;

        const headId = repo.headCommit();

        // Edges are cheap: redraw them, but fade in the ones that are new.
        const oldEdges = new Set([...this.edges.children].map((p) => p.dataset.key));
        this.edges.replaceChildren();
        for (const c of commits) {
            const to = this.position(c);
            c.parents.forEach((pid, i) => {
                const p = repo.commits.get(pid);
                if (!p) return;
                const from = this.position(p);
                const key = `${pid}>${c.id}`;
                // Same lane: straight line. Branching out: curve right after the parent.
                // Merging in: run along the branch lane, then curve just before the merge.
                const h = GAP_X / 2;
                let d;
                if (from.y === to.y) d = `M${from.x},${from.y} L${to.x},${to.y}`;
                else if (to.y > from.y) d = `M${from.x},${from.y} C${from.x + h},${from.y} ${from.x + h},${to.y} ${from.x + GAP_X},${to.y} L${to.x},${to.y}`;
                else d = `M${from.x},${from.y} L${to.x - GAP_X},${from.y} C${to.x - h},${from.y} ${to.x - h},${to.y} ${to.x},${to.y}`;
                const path = el('path', { d, class: `edge${i > 0 ? ' edge-merge' : ''}${oldEdges.has(key) ? '' : ' enter'}` });
                path.dataset.key = key;
                this.edges.append(path);
            });
        }

        // Commit nodes: keyed, so existing ones stay and new ones pop in.
        const live = new Set();
        for (const c of commits) {
            live.add(c.id);
            const { x, y } = this.position(c);
            let g = this.nodeEls.get(c.id);
            if (!g) {
                g = el('g', { class: 'commit enter' });
                const circle = el('circle', { r: R, cx: 0, cy: 0 });
                const id = el('text', { class: 'commit-id', x: 0, y: R + 22, 'text-anchor': 'middle' });
                id.textContent = c.id;
                const title = el('title');
                title.textContent = `${c.id} ${c.message}`;
                g.append(circle, id, title);
                this.nodes.append(g);
                this.nodeEls.set(c.id, g);
            }
            g.style.transform = `translate(${x}px, ${y}px)`;
            g.classList.toggle('is-head', c.id === headId);
            g.classList.toggle('is-merge', c.parents.length > 1);
        }
        for (const [id, g] of this.nodeEls) {
            if (!live.has(id)) { g.remove(); this.nodeEls.delete(id); }
        }

        // Branch + HEAD labels: keyed by name so they slide when a branch moves.
        const stacks = new Map();
        const labels = [...repo.branches].map(([name, id]) => ({ key: `b:${name}`, text: name, id, kind: 'branch' }));
        if (repo.currentBranch()) {
            labels.find((l) => l.text === repo.currentBranch()).kind = 'branch current';
        } else {
            labels.push({ key: 'HEAD', text: 'HEAD', id: headId, kind: 'head' });
        }
        const liveLabels = new Set();
        for (const l of labels) {
            const c = repo.commits.get(l.id);
            if (!c) continue;
            liveLabels.add(l.key);
            const { x, y } = this.position(c);
            const n = stacks.get(l.id) ?? 0;
            stacks.set(l.id, n + 1);
            let g = this.labelEls.get(l.key);
            if (!g) {
                g = el('g', { class: 'label enter' });
                g.append(el('rect', { rx: 11, ry: 11, height: 24, y: -12 }), el('text', { x: 0, y: 5, 'text-anchor': 'middle' }));
                this.labels.append(g);
                this.labelEls.set(l.key, g);
            }
            const text = g.querySelector('text');
            const label = l.kind.includes('current') ? `${l.text} ← HEAD` : l.text;
            text.textContent = label;
            const w = label.length * 7.6 + 22;
            const rect = g.querySelector('rect');
            rect.setAttribute('width', w);
            rect.setAttribute('x', -w / 2);
            g.setAttribute('class', `label ${l.kind}`);
            g.style.transform = `translate(${x}px, ${y - R - 22 - n * 28}px)`;
        }
        for (const [key, g] of this.labelEls) {
            if (!liveLabels.has(key)) { g.remove(); this.labelEls.delete(key); }
        }

        // Clear the "enter" class after the animation so it doesn't replay.
        requestAnimationFrame(() => setTimeout(() => {
            this.svg.querySelectorAll('.enter').forEach((n) => n.classList.remove('enter'));
        }, 450));

        // Keep the newest work in view.
        const head = repo.commits.get(headId);
        const hx = this.position(head).x;
        const box = this.container;
        if (hx > box.scrollLeft + box.clientWidth - 80 || hx < box.scrollLeft) {
            box.scrollTo({ left: Math.max(0, hx - box.clientWidth / 2), behavior: 'smooth' });
        }
    }
}
