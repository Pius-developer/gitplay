/**
 * The only file that talks to the PHP back end.
 * Every request goes through `request()`, which:
 *   - sends JSON and asks for JSON back,
 *   - adds the CSRF token PHP printed into <meta name="csrf-token">,
 *   - turns non-2xx responses into thrown errors with the server's message.
 */
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

async function request(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
}

export const api = {
    /** GET /api/challenges → [{ id, title, intro, hint, setup: [...], goal: {...}, checklist: [...] }] */
    challenges: () => request('GET', '/api/challenges'),

    /** POST /api/sessions { commands } → { id, url } */
    saveSession: (commands) => request('POST', '/api/sessions', { commands }),

    /** GET /api/sessions/{id} → { id, commands, created_at } */
    session: (id) => request('GET', `/api/sessions/${encodeURIComponent(id)}`),
};
