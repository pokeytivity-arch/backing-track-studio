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

// ---- access code + daily limits ----
// ACCESS_CODE (secret, optional): when set, every coach/transcribe call needs it.
// ADMIN_TOKEN as the code skips the daily limits (for the owner).
// DAILY_COACH (default 40 messages/device, 150/IP) and DAILY_TRANSCRIBE (default 3/device, 8/IP).
function same(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function gate(request, env, kind) {
  const code = request.headers.get('x-access') || '';
  if (env.ACCESS_CODE && !same(code, env.ACCESS_CODE) && !(env.ADMIN_TOKEN && same(code, env.ADMIN_TOKEN))) return json({ error: 'access' }, 401);
  if (env.ADMIN_TOKEN && code && same(code, env.ADMIN_TOKEN)) return null;
  const dev = (request.headers.get('x-device') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const day = new Date().toISOString().slice(0, 10);
  const perDev = +(kind === 'coach' ? env.DAILY_COACH : env.DAILY_TRANSCRIBE) || (kind === 'coach' ? 40 : 3);
  const perIp = perDev * (kind === 'coach' ? 4 : 3);
  const checks = [['d', dev, perDev], ['i', ip, perIp]].filter(c => c[1]);
  try {
    const vals = await Promise.all(checks.map(c => env.LESSONS.get(`lim:${kind}:${day}:${c[0]}:${c[1]}`)));
    for (let i = 0; i < checks.length; i++) if ((+vals[i] || 0) >= checks[i][2]) return json({ error: 'daily_limit' }, 429);
    await Promise.all(checks.map((c, i) => env.LESSONS.put(`lim:${kind}:${day}:${c[0]}:${c[1]}`, String((+vals[i] || 0) + 1), { expirationTtl: 172800 })));
  } catch (e) { console.log('gate', e); }
  return null;
}

async function teacher(request, env) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);
  if (limited(request.headers.get('cf-connecting-ip') || 'x')) return json({ error: 'slow_down' }, 429);
  { const g = await gate(request, env, 'coach'); if (g) return g; }

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
  if (c.keyboard) ctx += `\nThe student's Class keyboard is currently showing these chords: ${clip(c.keyboard, 300)}.`;
  if (c.heard) ctx += `\nFrom Studio+ (the student took this to Class): ${clip(c.heard, 900)}\nThe notes come from software that listens to a recording, so treat them as a good but imperfect guess: name the chord or run they most likely make, say what to double-check by ear, and teach it in your method.`;
  let lessons = '';
  try {
    {
      const q = msgs.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
      const found = await searchLessons(env, q, { k: 4, level: c.level || '', tags: tagHints(q) });
      if (found.length) lessons = '\n\n## From your own past lessons\nExcerpts dated with a lesson date are rough auto-transcripts of things you said in class (speech-to-text, so words can be garbled). Excerpts marked Book or Blog are your older written work (about 10 years old or more; the books and quick references are your own work): use them for definitions, formulas and structure, but where they differ from what you teach in recent lessons, the recent lessons win. Use them to stay true to how you explain, the order you teach things, your examples and your voice. Don\'t quote them word for word, don\'t mention that they are transcripts, and never mention or invent student names ([name] marks a removed name). If an excerpt contains song lyrics, do not repeat them.\n' +
        found.map((d, i) => `\n[${i + 1}] ${d.k} (${d.d}, ${d.l})\n${d.t}`).join('\n');
    }
  } catch (e) { console.log('lessons', e); }
  const system = [{ type: 'text', text: PERSONA + '\n\n## Setting\nYou are inside Class, one of the three places in Piano Suite. Class has a whiteboard, a keyboard and this chat. The other two places are the Studio (students create what they want to practice: they type a chord chart and a band plays it) and Studio+ (students upload a recording they want to break down, and see its notes). A student can move between the three at any time, so when it helps, point them to the right room. Keep replies short enough to read in a small window (about 60–140 words unless the student asks for more; say one idea, then one thing to play or answer). Plain text with simple **bold** and line breaks; no tables.', cache_control: { type: 'ephemeral' } }];
  { const dyn = (ctx ? ctx.replace(/^\n/, '') : '') + lessons; if (dyn.trim()) system.push({ type: 'text', text: dyn.trim() }); }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.TEACHER_MODEL || MODEL_DEFAULT, max_tokens: 2000, system, messages: msgs }),
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


/* ---------- Studio+ piano transcription (hosted piano model on Replicate) ---------- */
const PIANO_MODEL_DEFAULT = 'e7mac/piano_transcription'; // returns a MIDI file; override with env PIANO_MODEL
const sleep = ms => new Promise(r => setTimeout(r, ms));
function collectUrls(o, out = []) {
  if (typeof o === 'string') { if (/^https?:\/\//.test(o)) out.push(o); }
  else if (Array.isArray(o)) o.forEach(x => collectUrls(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach(x => collectUrls(x, out));
  return out;
}
async function transcribePiano(request, env) {
  if (!env.REPLICATE_API_TOKEN) return json({ error: 'not_configured' }, 503);
  const audio = await request.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > 40e6) return json({ error: 'bad_audio' }, 400);
  const auth = { authorization: 'Bearer ' + env.REPLICATE_API_TOKEN };
  const form = new FormData();
  form.append('content', new Blob([audio], { type: 'audio/wav' }), 'recording.wav');
  const up = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers: auth, body: form });
  if (!up.ok) { const t = await up.text(); console.log('upload', up.status, t); return json({ error: 'upload_failed', status: up.status, detail: t.slice(0, 200) }, 502); }
  const file = await up.json();
  const fileUrl = (file.urls && file.urls.get) || file.url;
  const mi = await fetch('https://api.replicate.com/v1/models/' + (env.PIANO_MODEL || PIANO_MODEL_DEFAULT), { headers: auth });
  if (!mi.ok) { const t = await mi.text(); console.log('model', mi.status, t); return json({ error: 'model_lookup_failed', status: mi.status, detail: t.slice(0, 200) }, 502); }
  const info = await mi.json(), ver = info.latest_version;
  if (!ver || !ver.id) return json({ error: 'no_version' }, 502);
  const props = (((ver.openapi_schema || {}).components || {}).schemas || {}).Input;
  const names = props && props.properties ? Object.keys(props.properties) : [];
  const field = names.includes('audio_input') ? 'audio_input' : (names.find(n => /audio|file|input/i.test(n)) || 'audio_input');
  let pred = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json', },
    body: JSON.stringify({ version: ver.id, input: { [field]: fileUrl, ...(names.includes('make_video') ? { make_video: false } : {}) } }),
  });
  if (!pred.ok) { const t = await pred.text(); console.log('predict', pred.status, t); return json({ error: 'predict_failed', status: pred.status, detail: t.slice(0, 200) }, 502); }
  pred = await pred.json();
  return json({ id: pred.id, status: pred.status });
}
async function pianoStatus(request, env) {
  if (!env.REPLICATE_API_TOKEN) return json({ error: 'not_configured' }, 503);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return json({ error: 'bad_id' }, 400);
  const auth = { authorization: 'Bearer ' + env.REPLICATE_API_TOKEN };
  const pred = await (await fetch('https://api.replicate.com/v1/predictions/' + id, { headers: auth })).json();
  if (pred.status === 'failed' || pred.status === 'canceled') return json({ error: 'model_failed', detail: String(pred.error || pred.status).slice(0, 200) }, 502);
  if (pred.status !== 'succeeded') {
    const m = String(pred.logs || '').match(/(\d{1,3})\s*%/g);
    const pct = m ? Math.min(99, parseInt(m[m.length - 1], 10)) : null;
    return json({ status: pred.status, pct });
  }
  const urls = collectUrls(pred.output);
  urls.sort((a, b) => (/\.midi?(\?|$)/i.test(b) ? 1 : 0) - (/\.midi?(\?|$)/i.test(a) ? 1 : 0));
  for (const u of urls.slice(0, 4)) {
    const r = await fetch(u, { headers: u.includes('api.replicate.com') ? auth : {} });
    if (!r.ok) continue;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 12 && new TextDecoder().decode(buf.slice(0, 4)) === 'MThd') {
      return new Response(buf, { headers: { 'content-type': 'audio/midi', 'cache-control': 'no-store' } });
    }
  }
  console.log('no midi in output', JSON.stringify(pred.output).slice(0, 300));
  return json({ error: 'no_midi', detail: JSON.stringify(pred.output).slice(0, 180) }, 502);
}

const HOT_IDS = ['phraseology','melody','bass','scales34','neighborhood','run736','251','cadences'];
async function hotTopics(request, env) {
  let counts = {};
  try { counts = (await env.LESSONS.get('hot', 'json')) || {}; } catch (e) {}
  if (request.method === 'POST') {
    let id = ''; try { id = String((await request.json()).id || ''); } catch (e) {}
    if (!HOT_IDS.includes(id)) return json({ error: 'bad_id' }, 400);
    counts[id] = (counts[id] || 0) + 1;
    try { await env.LESSONS.put('hot', JSON.stringify(counts)); } catch (e) {}
  }
  return json({ counts }, 200);
}


/* ---------- player accounts (90 Day Challenge progress). Email + password, kept in KV. No email is sent. ---------- */
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(str) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(str))); }
async function pbk(pw, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
}
const rnd = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const SESS_TTL = 60 * 60 * 24 * 120;
async function sessionUser(request, env) {
  const tok = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!/^[a-f0-9]{48}$/.test(tok)) return null;
  const id = await env.LESSONS.get('sess:' + tok);
  if (!id) return null;
  const acct = await env.LESSONS.get('acct:' + id, 'json');
  return acct ? { id, acct, tok } : null;
}
async function account(request, env) {
  if (!env.LESSONS) return json({ error: 'no_kv_binding' }, 503);
  if (request.method === 'GET') {
    const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
    return json({ name: u.acct.name || '', email: u.acct.email, data: u.acct.data || null }, 200);
  }
  if (request.method === 'PUT') {
    const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
    const raw = await request.text(); if (raw.length > 120000) return json({ error: 'too_big' }, 413);
    let b; try { b = JSON.parse(raw); } catch (e) { return json({ error: 'bad_json' }, 400); }
    if (b.data !== undefined) u.acct.data = b.data;
    if (typeof b.name === 'string') u.acct.name = b.name.slice(0, 60);
    await env.LESSONS.put('acct:' + u.id, JSON.stringify(u.acct));
    return json({ ok: true }, 200);
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const action = String(b.action || '');
  if (action === 'logout') { const u = await sessionUser(request, env); if (u) await env.LESSONS.delete('sess:' + u.tok); return json({ ok: true }, 200); }
  const email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || '');
  if (action === 'adminreset') {
    if (!env.ADMIN_TOKEN || !same(b.adminToken, env.ADMIN_TOKEN)) return json({ error: 'auth' }, 401);
    const id = await sha(email), acct = await env.LESSONS.get('acct:' + id, 'json'); if (!acct) return json({ error: 'no_account' }, 404);
    if (pw.length < 6) return json({ error: 'weak_password' }, 400);
    acct.salt = rnd(16); acct.hash = await pbk(pw, acct.salt); await env.LESSONS.put('acct:' + id, JSON.stringify(acct)); return json({ ok: true }, 200);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json({ error: 'bad_email' }, 400);
  if (pw.length < 6 || pw.length > 100) return json({ error: 'weak_password' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || 'x', day = new Date().toISOString().slice(0, 10), lk = 'lim:acct:' + day + ':' + ip;
  const tries = +(await env.LESSONS.get(lk)) || 0; if (tries >= 40) return json({ error: 'slow_down' }, 429);
  await env.LESSONS.put(lk, String(tries + 1), { expirationTtl: 172800 });
  const id = await sha(email); let acct = await env.LESSONS.get('acct:' + id, 'json');
  if (action === 'signup') {
    if (acct) return json({ error: 'exists' }, 409);
    const salt = rnd(16); acct = { email, name: String(b.name || '').trim().slice(0, 60), salt, hash: await pbk(pw, salt), made: Date.now(), data: null };
    await env.LESSONS.put('acct:' + id, JSON.stringify(acct));
  } else if (action === 'login') {
    if (!acct || (await pbk(pw, acct.salt)) !== acct.hash) return json({ error: 'wrong' }, 401);
  } else return json({ error: 'bad_action' }, 400);
  const tok = rnd(24); await env.LESSONS.put('sess:' + tok, id, { expirationTtl: SESS_TTL });
  return json({ token: tok, name: acct.name || '', email: acct.email, data: acct.data || null }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/lessons') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await adminLessons(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/acct') {
      try { return await account(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/hot') {
      try { return await hotTopics(request, env); } catch (e) { console.log(e); return json({ counts: {} }, 200); }
    }
    if (url.pathname === '/api/teacher') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await teacher(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/transcribe') {
      try { if (request.method !== 'GET') { const g = await gate(request, env, 'transcribe'); if (g) return g; } else if (env.ACCESS_CODE && !same(request.headers.get('x-access'), env.ACCESS_CODE) && !(env.ADMIN_TOKEN && same(request.headers.get('x-access'), env.ADMIN_TOKEN))) return json({ error: 'access' }, 401); return request.method === 'GET' ? await pianoStatus(request, env) : await transcribePiano(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
