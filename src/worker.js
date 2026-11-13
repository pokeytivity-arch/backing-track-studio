// Backing Track Studio worker: serves the static app and the
// "Ask Piano Study Suite" endpoint, which calls the Claude API.
import PERSONA from './persona.txt';
import { searchLessons, tagHints } from './retrieve.js';

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
  let lessons = '';
  try {
    {
      const q = msgs.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
      const found = await searchLessons(env, q, { k: 4, level: c.level || '', tags: tagHints(q) });
      if (found.length) lessons = '\n\n## From your own past lessons\nExcerpts dated with a lesson date are rough auto-transcripts of things you said in class (speech-to-text, so words can be garbled). Excerpts marked Book or Blog are your older written work (about 10 years old or more; some quick references were co-written with Jermaine Griggs): use them for definitions, formulas and structure, but where they differ from what you teach in recent lessons, the recent lessons win. Use them to stay true to how you explain, the order you teach things, your examples and your voice. Don\'t quote them word for word, don\'t mention that they are transcripts, and never mention or invent student names ([name] marks a removed name). If an excerpt contains song lyrics, do not repeat them.\n' +
        found.map((d, i) => `\n[${i + 1}] ${d.k} (${d.d}, ${d.l})\n${d.t}`).join('\n');
    }
  } catch (e) { console.log('lessons', e); }
  const system = PERSONA + '\n\n## Setting\nYou are inside Backing Track Studio, a web app where students type chord charts and a band plays them. Keep replies short enough to read in a small window (about 120–220 words unless asked for more). Plain text with simple **bold** and line breaks; no tables.' + (ctx ? '\n' + ctx : '') + lessons;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.TEACHER_MODEL || MODEL_DEFAULT, max_tokens: 3000, system, messages: msgs }),
  });
  if (!r.ok) { const t = await r.text(); console.log('anthropic error', r.status, t.slice(0, 300)); return json({ error: 'upstream', status: r.status }, 502); }
  const data = await r.json();
  const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (data.stop_reason && data.stop_reason !== 'end_turn') console.log('stop_reason', data.stop_reason, JSON.stringify(data.usage || {}));
  let out = reply;
  if (data.stop_reason === 'max_tokens') { // never show a half sentence
    const cut = Math.max(out.lastIndexOf('. '), out.lastIndexOf('? '), out.lastIndexOf('! '), out.lastIndexOf('\n'));
    if (cut > out.length * 0.5) out = out.slice(0, cut + 1).trim();
  }
  return json({ reply: out || '…', stop: data.stop_reason || null });
}

// Owner-only upload of the lesson library into KV. Needs the ADMIN_TOKEN secret.
async function adminLessons(request, env) {
  if (!env.LESSONS) return json({ error: 'no_kv_binding' }, 503);
  if (!env.ADMIN_TOKEN || request.headers.get('authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);
  let items; try { items = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  if (!Array.isArray(items) || items.length > 100) return json({ error: 'send at most 100 keys per request' }, 400);
  for (const it of items) {
    if (!it || typeof it.key !== 'string' || !/^(meta|p:\d+|d:\d+)$/.test(it.key) || typeof it.value !== 'string') return json({ error: 'bad_item' }, 400);
  }
  await Promise.all(items.map(it => env.LESSONS.put(it.key, it.value)));
  return json({ ok: true, wrote: items.length });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/lessons') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await adminLessons(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/teacher') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await teacher(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
