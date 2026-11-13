// Backing Track Studio worker: serves the static app and the
// "Ask Piano Study Suite" endpoint, which calls the Claude API.
import PERSONA from './persona.txt';

const MODEL_DEFAULT = 'claude-sonnet-5-5';
const MAX_MSGS = 24, MAX_CHARS = 4000, MAX_TOTAL = 40000;
const hits = new Map(); // best-effort per-isolate rate limit

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function limited(ip) {
  const now = Date.now(), w = 10 * 60 * 1000, max = 40;
  const arr = (hits.get(ip) || []).filter(t => now - t < w);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

async function teacher(request, env) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);
  if (limited(request.headers.get('cf-connecting-ip') || 'x')) return json({ error: 'slow_down' }, 429);

  let body; try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  let msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_MSGS) : [];
  msgs = msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
             .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'no_question' }, 400);
  if (msgs.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL) return json({ error: 'too_long' }, 413);

  const c = body.context || {};
  const clip = (v, n) => String(v ?? '').slice(0, n);
  let ctx = '';
  if (c.level) ctx += `\nStudent level: ${clip(c.level, 40)}.`;
  if (c.chart) ctx += `\nThe student's current Backing Track Studio session (chords are typed one per bar, '.' = hold, [L / R] = a voicing with left and right hand):\n` +
    `Title: ${clip(c.title, 120) || '(untitled)'}\nStyle: ${clip(c.style, 40)} · Tempo: ${clip(c.bpm, 8)} BPM · Time: ${clip(c.meter, 8)} · Transpose: ${clip(c.transpose, 6)}\nChart:\n${clip(c.chart, 3000)}`;
  const system = PERSONA + '\n\n## Setting\nYou are inside Backing Track Studio, a web app where students type chord charts and a band plays them. Keep replies short enough to read in a small window (about 120–220 words unless asked for more). Plain text with simple **bold** and line breaks; no tables.' + (ctx ? '\n' + ctx : '');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.TEACHER_MODEL || MODEL_DEFAULT, max_tokens: 900, system, messages: msgs }),
  });
  if (!r.ok) { const t = await r.text(); console.log('anthropic error', r.status, t.slice(0, 300)); return json({ error: 'upstream', status: r.status }, 502); }
  const data = await r.json();
  const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return json({ reply: reply || '…' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/teacher') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await teacher(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
