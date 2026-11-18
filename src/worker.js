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
  const pkHost = /(^|\.)pokeytivity\.com$/i.test(new URL(request.url).hostname);   /* app.pokeytivity.com: the coach is Pokey */
  const system = [{ type: 'text', text: (pkHost ? PERSONA.replace(/(?<!Onyemachi, )HearandPlay/g, 'Pokey') : PERSONA) + '\n\n## Setting\nYou are inside Class, one of the three places in Piano Suite. Class has a whiteboard, a keyboard and this chat. The other two places are the Studio (students create what they want to practice: they type a chord chart and a band plays it) and Studio+ (students upload a recording they want to break down, and see its notes). A student can move between the three at any time, so when it helps, point them to the right room. Keep replies short enough to read in a small window (about 60–140 words at most; say one idea, then one thing to play or answer). Plain text with simple **bold** and line breaks; no tables.\n\n## How you teach here: Socratic, one step at a time\nDo not give everything the student asked for in one reply. Teach in small turns: say one short thing (one idea), then ask one question that makes the student think or try something (answer a question, play something on the keyboard, name something), and stop and wait. When they answer, confirm what is right, gently correct what is not, and move to the next small piece, so the full answer builds up over several turns and the student stays engaged. On a new topic, when it helps, start with one quick question to find out what they already know. If the student asks for the whole thing at once, give only the first step and say in one sentence what comes next (for example: first the notes, then the fingering). Give the full explanation or full chart in one go only when the student clearly says they want it all now. Keep each reply under about 80 words and end with exactly one question or one thing to try. When you use the whiteboard or keyboard, show only the part for the current step.', cache_control: { type: 'ephemeral' } }];
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
const ROLES = ['student', 'teacher', 'none'];
const pub = (a, token) => Object.assign(token ? { token } : {}, { name: a.name || '', email: a.email, role: a.role || 'none', teachers: a.teachers || [], tcode: a.tcode || null, pending: (a.students || []).filter(x => x.status === 'pending').length, data: a.data || null });
/* an account is stored under the hash of the email it was made with; after an email change, "mail:<hash of new email>" points to it */
async function findAcct(env, email) {
  const h = await sha(email); const a = await env.LESSONS.get('acct:' + h, 'json');
  if (a && a.email === email) return { id: h, acct: a };
  const al = await env.LESSONS.get('mail:' + h);
  if (al) { const b = await env.LESSONS.get('acct:' + al, 'json'); if (b && b.email === email) return { id: al, acct: b }; }
  return { id: h, acct: null, taken: !!a };
}
async function account(request, env) {
  if (!env.LESSONS) return json({ error: 'no_kv_binding' }, 503);
  if (request.method === 'GET') {
    const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
    return json(pub(u.acct, null), 200);
  }
  if (request.method === 'PUT') {
    const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
    const raw = await request.text(); if (raw.length > 120000) return json({ error: 'too_big' }, 413);
    let b; try { b = JSON.parse(raw); } catch (e) { return json({ error: 'bad_json' }, 400); }
    if (b.data !== undefined) u.acct.data = b.data;
    if (typeof b.name === 'string') u.acct.name = b.name.slice(0, 60);
    if (typeof b.role === 'string' && ROLES.includes(b.role)) { u.acct.role = b.role; }
    /* email and password can be changed from the Account page while signed in */
    if (typeof b.email === 'string') {
      const ne = b.email.trim().toLowerCase();
      if (ne !== u.acct.email) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ne) || ne.length > 120) return json({ error: 'bad_email' }, 400);
        const f = await findAcct(env, ne); if ((f.acct || f.taken) && f.id !== u.id) return json({ error: 'email_taken' }, 409);
        const oh = await sha(u.acct.email), nh = await sha(ne);
        if (oh !== u.id) await env.LESSONS.delete('mail:' + oh);
        if (nh !== u.id) await env.LESSONS.put('mail:' + nh, u.id);
        u.acct.email = ne;
      }
    }
    if (typeof b.password === 'string' && b.password.length) {
      if (b.password.length < 6 || b.password.length > 100) return json({ error: 'weak_password' }, 400);
      u.acct.salt = rnd(16); u.acct.hash = await pbk(b.password, u.acct.salt);
    }
    await env.LESSONS.put('acct:' + u.id, JSON.stringify(u.acct));
    return json(pub(u.acct, null), 200);
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const action = String(b.action || '');
  if (action === 'logout') { const u = await sessionUser(request, env); if (u) await env.LESSONS.delete('sess:' + u.tok); return json({ ok: true }, 200); }
  const email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || '');
  if (action === 'adminlist') {
    if (!env.ADMIN_TOKEN || !same(b.adminToken, env.ADMIN_TOKEN)) return json({ error: 'auth' }, 401);
    const keys = []; let cursor; for (let i = 0; i < 10; i++) { const l = await env.LESSONS.list({ prefix: 'acct:', limit: 1000, cursor }); keys.push(...l.keys.map(k => k.name)); if (l.list_complete) break; cursor = l.cursor; }
    const rows = []; for (let i = 0; i < keys.length; i += 40) { const got = await Promise.all(keys.slice(i, i + 40).map(k => env.LESSONS.get(k, 'json'))); got.forEach(a => { if (a) rows.push({ name: a.name || '', email: a.email || '', role: a.role || 'none', made: a.made || 0, teachers: (a.teachers || []).length, students: (a.students || []).length, code: a.tcode || '' }); }); }
    rows.sort((x, y) => y.made - x.made); return json({ total: rows.length, rows }, 200);
  }
  if (action === 'adminreset') {
    if (!env.ADMIN_TOKEN || !same(b.adminToken, env.ADMIN_TOKEN)) return json({ error: 'auth' }, 401);
    const { id, acct } = await findAcct(env, email); if (!acct) return json({ error: 'no_account' }, 404);
    if (pw.length < 6) return json({ error: 'weak_password' }, 400);
    acct.salt = rnd(16); acct.hash = await pbk(pw, acct.salt); await env.LESSONS.put('acct:' + id, JSON.stringify(acct)); return json({ ok: true }, 200);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json({ error: 'bad_email' }, 400);
  if (pw.length < 6 || pw.length > 100) return json({ error: 'weak_password' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || 'x', day = new Date().toISOString().slice(0, 10), lk = 'lim:acct:' + day + ':' + ip;
  const tries = +(await env.LESSONS.get(lk)) || 0; if (tries >= 40) return json({ error: 'slow_down' }, 429);
  await env.LESSONS.put(lk, String(tries + 1), { expirationTtl: 172800 });
  const f = await findAcct(env, email), id = f.id; let acct = f.acct;
  if (action === 'signup') {
    if (acct || f.taken) return json({ error: 'exists' }, 409);
    const salt = rnd(16); acct = { email, name: String(b.name || '').trim().slice(0, 60), role: ROLES.includes(b.role) ? b.role : 'none', salt, hash: await pbk(pw, salt), made: Date.now(), data: null };
    await env.LESSONS.put('acct:' + id, JSON.stringify(acct));
  } else if (action === 'login') {
    if (!acct || (await pbk(pw, acct.salt)) !== acct.hash) return json({ error: 'wrong' }, 401);
  } else return json({ error: 'bad_action' }, 400);
  const tok = rnd(24); await env.LESSONS.put('sess:' + tok, id, { expirationTtl: SESS_TTL });
  return json(pub(acct, tok), 200);
}


/* ---------- teachers and student results (ear training). Needs a signed-in account: teachers have a code, students join it. ---------- */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const a = crypto.getRandomValues(new Uint8Array(6)); return [...a].map(x => CODE_CHARS[x % CODE_CHARS.length]).join(''); };
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
/* a day of a practice plan: practice item ids (older plans) or session blocks {e: element, m: minutes, items, note} */
const PEL = ['warmup', 'practice', 'rehearsal', 'breakdown', 'break', 'study', 'research', 'listening', 'ear', 'meditation'];
const cleanDay = d => (Array.isArray(d) ? d : []).slice(0, 30).map(x => typeof x === 'string' ? clip(x, 24) : (x && typeof x === 'object' && PEL.includes(x.e)) ? { e: x.e, m: Math.max(0, Math.min(240, Math.round(+x.m || 0))), items: (Array.isArray(x.items) ? x.items : []).slice(0, 30).map(v => clip(v, 24)).filter(Boolean), note: clip(x.note, 200) } : null).filter(Boolean);
let _env = null; const env_get = id => _env.LESSONS.get('acct:' + id, 'json');
const putAcct = (id, a) => _env.LESSONS.put('acct:' + id, JSON.stringify(a));
const who = (a, id) => (a.name || (a.email || '').split('@')[0] || 'Student');
const AKINDS = ['chart', 'ear', 'exercise'];
const cleanSpec = (kind, sp) => {
  sp = sp && typeof sp === 'object' ? sp : {};
  if (kind === 'chart') { const steps = (Array.isArray(sp.steps) ? sp.steps : []).slice(0, 64).map(x => ({ label: clip(x && x.label, 40), lh: clip(x && x.lh, 80), rh: clip(x && x.rh, 80) })).filter(x => x.lh || x.rh); return { steps }; }
  if (kind === 'ear') return { area: clip(sp.area, 20), mode: clip(sp.mode, 12) };
  return { room: clip(sp.room, 12), prog: clip(sp.prog, 600), bpm: Math.max(0, Math.min(300, +sp.bpm || 0)), key: clip(sp.key, 4), type: clip(sp.type, 30) };
};
async function teach(request, env, act) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  _env = env;
  let b = {}; try { b = await request.json(); } catch (_) {}
  const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
  const a = u.acct, save = () => putAcct(u.id, a), isT = a.role === 'teacher';
  if (act === 'mycode') {
    if (!isT) return json({ error: 'role' }, 403);
    if (!a.tcode) { let code = newCode(); for (let i = 0; i < 5 && await env.LESSONS.get('tch:' + code); i++) code = newCode(); a.tcode = code; await env.LESSONS.put('tch:' + code, JSON.stringify({ name: a.name || 'Teacher', owner: u.id, made: Date.now() })); await save(); }
    else { const t = await env.LESSONS.get('tch:' + a.tcode, 'json'); if (t && t.name !== (a.name || 'Teacher')) { t.name = a.name || 'Teacher'; await env.LESSONS.put('tch:' + a.tcode, JSON.stringify(t)); } }
    return json({ code: a.tcode, name: a.name || 'Teacher' }, 200);
  }
  /* a student asks to join a teacher by code; the teacher has to accept */
  if (act === 'join') {
    if (a.role !== 'student') return json({ error: 'role' }, 403);
    const code = clip(b.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, ''), t = code ? await env.LESSONS.get('tch:' + code, 'json') : null;
    if (!t || t.owner === u.id) return json({ error: 'no_code' }, 404);
    const ta = await env.LESSONS.get('acct:' + t.owner, 'json'); if (!ta || ta.tcode !== code) return json({ error: 'no_code' }, 404);
    a.teachers = a.teachers || []; ta.students = ta.students || [];
    if (a.teachers.some(x => x.code === code)) return json({ error: 'already' }, 409);
    if (a.teachers.length >= 30 || ta.students.length >= 500) return json({ error: 'full' }, 409);
    a.teachers.push({ code, name: t.name, status: 'pending' });
    const m = ta.students.find(x => x.id === u.id); if (m) { m.status = m.status === 'active' ? 'active' : 'pending'; m.name = who(a); } else ta.students.push({ id: u.id, name: who(a), status: 'pending' });
    await save(); await putAcct(t.owner, ta); return json({ ok: true, teachers: a.teachers }, 200);
  }
  /* either side ends a link, or a student cancels a request */
  if (act === 'leave') {
    const code = clip(b.code, 12).toUpperCase();
    a.teachers = (a.teachers || []).filter(x => x.code !== code);
    const t = await env.LESSONS.get('tch:' + code, 'json');
    if (t) { const ta = await env.LESSONS.get('acct:' + t.owner, 'json'); if (ta && ta.students) { ta.students = ta.students.filter(x => x.id !== u.id); await putAcct(t.owner, ta); } }
    await save(); return json({ ok: true }, 200);
  }
  if (act === 'respond' || act === 'removestudent') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const id = clip(b.id, 80), m = (a.students || []).find(x => x.id === id); if (!m) return json({ error: 'none' }, 404);
    const sa = await env.LESSONS.get('acct:' + id, 'json');
    const accept = act === 'respond' && !!b.accept;
    if (accept) m.status = 'active'; else a.students = a.students.filter(x => x.id !== id);
    if (sa) { sa.teachers = sa.teachers || []; const t = sa.teachers.find(x => x.code === a.tcode); if (t) { if (accept) { t.status = 'active'; t.name = a.name || 'Teacher'; } else sa.teachers = sa.teachers.filter(x => x.code !== a.tcode); } await putAcct(id, sa); }
    await save(); return json({ ok: true, students: a.students }, 200);
  }
  if (act === 'submit') {
    const act1 = (a.teachers || []).filter(x => x.status === 'active'), code = clip(b.code, 12).toUpperCase();
    const t = a.role === 'student' && (code ? act1.find(x => x.code === code) : act1.length === 1 ? act1[0] : null);
    if (!t) return json({ error: 'role' }, 403);
    const r = b.result; if (!r || typeof r !== 'object') return json({ error: 'result' }, 400);
    const body = JSON.stringify({ student: who(a), uid: u.id.slice(0, 12), at: Date.now(), result: r });
    if (body.length > 8000) return json({ error: 'too_big' }, 413);
    await env.LESSONS.put('tr:' + t.code + ':' + String(Date.now()).padStart(14, '0') + ':' + rnd(3), body, { expirationTtl: 60 * 60 * 24 * 730 });
    return json({ ok: true, teacher: t.name }, 200);
  }
  if (act === 'results') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const students = a.students || [], ok = new Set(students.filter(x => x.status === 'active').map(x => x.id.slice(0, 12)));
    const l = await env.LESSONS.list({ prefix: 'tr:' + a.tcode + ':', limit: 1000 });
    const names = l.keys.map(k => k.name).slice(-300);
    const items = (await Promise.all(names.map(n => env.LESSONS.get(n, 'json')))).filter(x => x && ok.has(x.uid)).reverse();
    return json({ teacher: a.name || 'Teacher', code: a.tcode, students, items }, 200);
  }
  /* assignments: a chord chart (left and right hand notes), an ear-training task, or a scale/chord exercise */
  if (act === 'acreate') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const kind = AKINDS.includes(b.kind) ? b.kind : null, title = clip(b.title, 80); if (!kind || !title) return json({ error: 'bad' }, 400);
    const ids = new Set((a.students || []).filter(x => x.status === 'active').map(x => x.id));
    const to = Array.isArray(b.to) ? b.to.filter(x => ids.has(x)).slice(0, 500) : 'all';
    const body = JSON.stringify({ kind, title, note: clip(b.note, 600), spec: cleanSpec(kind, b.spec), to: to === 'all' || (Array.isArray(to) && !to.length) ? 'all' : to, at: Date.now() });
    if (body.length > 9000) return json({ error: 'too_big' }, 413);
    const key = 'as:' + a.tcode + ':' + String(Date.now()).padStart(14, '0') + ':' + rnd(3);
    await env.LESSONS.put(key, body, { expirationTtl: 60 * 60 * 24 * 730 }); return json({ ok: true, id: key }, 200);
  }
  if (act === 'alist') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const l = await env.LESSONS.list({ prefix: 'as:' + a.tcode + ':', limit: 1000 }), names = l.keys.map(k => k.name).slice(-60);
    const items = (await Promise.all(names.map(async n => { const v = await env.LESSONS.get(n, 'json'); return v && Object.assign({ id: n }, v); }))).filter(Boolean).reverse();
    return json({ items }, 200);
  }
  if (act === 'adelete') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const id = clip(b.id, 80); if (!id.startsWith('as:' + a.tcode + ':')) return json({ error: 'bad' }, 400);
    await env.LESSONS.delete(id); return json({ ok: true }, 200);
  }
  /* ---------- practice plans: a teacher writes a week of scale/chord/progression ids for a student; a student can ask for one; the teacher can see the plan and the 90 Day Challenge progress ---------- */
  const cleanWeek = w => (Array.isArray(w) ? w : []).slice(0, 7).concat([[], [], [], [], [], [], []]).slice(0, 7).map(cleanDay);
  if (act === 'plset') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const id = clip(b.id, 80); if (!(a.students || []).some(x => x.id === id && x.status === 'active')) return json({ error: 'none' }, 404);
    const week = cleanWeek(b.week); if (!week.some(d => d.length)) return json({ error: 'bad' }, 400);
    await env.LESSONS.put('pl:' + a.tcode + ':' + id, JSON.stringify({ name: clip(b.name, 60) || 'Practice plan', note: clip(b.note, 400), week, at: Date.now() }));
    await env.LESSONS.delete('rq:' + a.tcode + ':' + id); return json({ ok: true }, 200);
  }
  if (act === 'plmine') {
    const ts = (a.teachers || []).filter(x => x.status === 'active').slice(0, 10), plans = [];
    await Promise.all(ts.map(async t => { const v = await env.LESSONS.get('pl:' + t.code + ':' + u.id, 'json'); if (v) plans.push(Object.assign({ teacher: t.name, code: t.code }, v)); }));
    const asked = {}; await Promise.all(ts.map(async t => { asked[t.code] = !!(await env.LESSONS.get('rq:' + t.code + ':' + u.id)); }));
    return json({ plans, teachers: ts.map(t => ({ code: t.code, name: t.name, asked: asked[t.code] })) }, 200);
  }
  if (act === 'plreq') {
    const code = clip(b.code, 12).toUpperCase(), t = a.role === 'student' && (a.teachers || []).find(x => x.code === code && x.status === 'active'); if (!t) return json({ error: 'role' }, 403);
    await env.LESSONS.put('rq:' + code + ':' + u.id, JSON.stringify({ student: who(a), note: clip(b.note, 300), at: Date.now() }), { expirationTtl: 60 * 60 * 24 * 90 }); return json({ ok: true }, 200);
  }
  if (act === 'plstudents') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const l = await env.LESSONS.list({ prefix: 'rq:' + a.tcode + ':', limit: 200 }), reqs = {};
    await Promise.all(l.keys.map(async k => { reqs[k.name.split(':')[2]] = await env.LESSONS.get(k.name, 'json'); }));
    const out = await Promise.all((a.students || []).filter(x => x.status === 'active').map(async st => {
      const pl = await env.LESSONS.get('pl:' + a.tcode + ':' + st.id, 'json'); return { id: st.id, name: st.name, plan: pl ? pl.name : '', request: reqs[st.id] || null }; }));
    return json({ students: out }, 200);
  }
  if (act === 'plprogress') {
    if (!isT || !a.tcode) return json({ error: 'role' }, 403);
    const id = clip(b.id, 80); if (!(a.students || []).some(x => x.id === id && x.status === 'active')) return json({ error: 'none' }, 404);
    const sa = await env.LESSONS.get('acct:' + id, 'json'), d = (sa && sa.data) || {}, pl = await env.LESSONS.get('pl:' + a.tcode + ':' + id, 'json');
    return json({ name: sa ? who(sa) : '', sent: pl, challenge: { plan: d.plan ? { name: d.plan.name, week: d.plan.week } : null, start: d.start || null, checks: d.checks || {}, history: (d.history || []).slice(0, 10) } }, 200);
  }
  if (act === 'mine') {
    const ts = (a.teachers || []).filter(x => x.status === 'active').slice(0, 10), out = [];
    await Promise.all(ts.map(async t => {
      const l = await env.LESSONS.list({ prefix: 'as:' + t.code + ':', limit: 1000 });
      const vals = await Promise.all(l.keys.map(k => k.name).slice(-30).map(async n => { const v = await env.LESSONS.get(n, 'json'); return v && Object.assign({ id: n, teacher: t.name, code: t.code }, v); }));
      vals.forEach(v => { if (v && (v.to === 'all' || (Array.isArray(v.to) && v.to.includes(u.id)))) out.push(v); });
    }));
    out.sort((x, y) => y.at - x.at); return json({ items: out.slice(0, 40) }, 200);
  }
  return json({ error: 'unknown' }, 404);
}


/* ---------- teacher suites: hearandplay.app/<handle>. A teacher claims a handle (@name) for their suite and customizes it;
   anyone can see a suite's front page; a signed-in student subscribes with a PIN of their choosing, and enters with that PIN.
   KV: su:h:<handle> -> owner id · su:t:<owner> -> the suite · su:al:<old handle> -> new handle · su:p:<owner>:<student> -> PIN hash · su:e:<token> -> entry */
/* ---------- visitors: who came, from where, which spaces they opened and for how long (D1 database "visitors") ----------
   Only the owner's account can read it. An account becomes an owner once, by entering the owner key while signed in. */
const VIS_KEY_HASH = '3fb277d6135889e11628fd63c66d1b71115dae6c9b03dc033cfd9256e7bb3d75';
let VDB_READY = false;
async function vdb(env) {
  if (!env.VDB) return null;
  if (!VDB_READY) {
    await env.VDB.batch([
      env.VDB.prepare('CREATE TABLE IF NOT EXISTS visits(id TEXT PRIMARY KEY, vid TEXT, host TEXT, path TEXT, started INTEGER, last INTEGER, dur INTEGER DEFAULT 0, pages INTEGER DEFAULT 0, country TEXT, region TEXT, city TEXT, ref TEXT, device TEXT, os TEXT, browser TEXT, lang TEXT, uname TEXT, urole TEXT, back INTEGER DEFAULT 0)'),
      env.VDB.prepare('CREATE INDEX IF NOT EXISTS visits_started ON visits(started)'),
      env.VDB.prepare('CREATE INDEX IF NOT EXISTS visits_vid ON visits(vid)'),
      env.VDB.prepare('CREATE TABLE IF NOT EXISTS views(visit TEXT, seq INTEGER, space TEXT, at INTEGER, dur INTEGER, PRIMARY KEY(visit, seq))'),
      env.VDB.prepare('CREATE TABLE IF NOT EXISTS owners(id TEXT PRIMARY KEY, at INTEGER)')
    ]);
    VDB_READY = true;
  }
  return env.VDB;
}
const cut = (s, n) => (s == null ? null : String(s).slice(0, n));
function uaInfo(ua) {
  ua = ua || '';
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'Tablet' : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'Phone' : 'Computer';
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows' : /CrOS/i.test(ua) ? 'ChromeOS' : /Mac OS X|Macintosh/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Other';
  const browser = /FBAN|FBAV/i.test(ua) ? 'Facebook app' : /Instagram/i.test(ua) ? 'Instagram app' : /WhatsApp/i.test(ua) ? 'WhatsApp' : /Edg\//i.test(ua) ? 'Edge' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /SamsungBrowser/i.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//i.test(ua) ? 'Chrome' : /FxiOS|Firefox\//i.test(ua) ? 'Firefox' : /Safari\//i.test(ua) ? 'Safari' : 'Other';
  return { device, os, browser };
}
async function isOwner(request, env, db) {
  const u = await sessionUser(request, env); if (!u) return { u: null, owner: false };
  const r = await db.prepare('SELECT 1 FROM owners WHERE id=?').bind(u.id).first();
  return { u, owner: !!r };
}
async function visits(request, env) {
  const db = await vdb(env); if (!db) return json({ error: 'nodb' }, 503);
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b; try { b = JSON.parse(await request.text()); } catch (_) { return json({ error: 'bad' }, 400); }
  const a = b && b.a;
  if (a === 'log') {
    const ua = request.headers.get('user-agent') || '';
    if (/bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp\/\d/i.test(ua) && !/WhatsApp\/\d.*Mobile/i.test(ua)) return json({ ok: true });
    const id = String(b.sid || ''), vid = String(b.vid || '');
    if (!/^[a-z0-9]{8,32}$/.test(id) || !/^[a-z0-9]{8,32}$/.test(vid)) return json({ error: 'bad' }, 400);
    const now = Date.now(), cf = request.cf || {}, inf = uaInfo(ua);
    const dur = Math.max(0, Math.min(86400, Math.round(+b.total || 0)));
    const views = Array.isArray(b.views) ? b.views.slice(0, 40) : [];
    const pages = Math.max(0, Math.min(10000, Math.round(+b.seq || views.length)));
    const st = [db.prepare(`INSERT INTO visits(id,vid,host,path,started,last,dur,pages,country,region,city,ref,device,os,browser,lang,uname,urole,back)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,(SELECT COUNT(*)>0 FROM visits WHERE vid=?))
        ON CONFLICT(id) DO UPDATE SET last=excluded.last, dur=MAX(visits.dur,excluded.dur), pages=MAX(visits.pages,excluded.pages), uname=COALESCE(excluded.uname,visits.uname), urole=COALESCE(excluded.urole,visits.urole)`)
      .bind(id, vid, cut(new URL(request.url).hostname, 60), cut(b.path, 80), now - dur * 1000, now, dur, pages, cut(cf.country, 4), cut(cf.region, 60), cut(cf.city, 60), cut(b.ref, 80) || 'Direct', inf.device, inf.os, inf.browser, cut(b.lang, 16), cut(b.uname, 60) || null, cut(b.urole, 12) || null, vid)];
    for (const v of views) {
      const seq = Math.round(+v.seq), d = Math.max(0, Math.min(86400, Math.round(+v.dur || 0))), at = Math.round(+v.at || now);
      if (!(seq >= 1 && seq <= 10000) || typeof v.space !== 'string') continue;
      st.push(db.prepare('INSERT INTO views(visit,seq,space,at,dur) VALUES(?,?,?,?,?) ON CONFLICT(visit,seq) DO UPDATE SET dur=MAX(views.dur,excluded.dur)').bind(id, seq, cut(v.space, 60), Math.min(at, now), d));
    }
    await db.batch(st);
    return json({ ok: true });
  }
  const { u, owner } = await isOwner(request, env, db);
  if (a === 'me') return json({ owner });
  if (a === 'claim') {
    if (!u) return json({ error: 'auth' }, 401);
    const ip = request.headers.get('cf-connecting-ip') || 'x'; if (limited('vk' + ip)) return json({ error: 'slow' }, 429);
    if (!same(await sha(String(b.key || '').trim().toLowerCase()), VIS_KEY_HASH)) return json({ error: 'key' }, 403);
    await db.prepare('INSERT OR IGNORE INTO owners(id,at) VALUES(?,?)').bind(u.id, Date.now()).run();
    return json({ ok: true, owner: true });
  }
  if (!u) return json({ error: 'auth' }, 401);
  if (!owner) return json({ error: 'owner' }, 403);
  if (a === 'board') {
    const days = Math.max(1, Math.min(365, Math.round(+b.days || 7))), since = Date.now() - days * 86400000;
    const host = ['hearandplay.app', 'app.pokeytivity.com'].includes(b.host) ? b.host : null;
    const tz = Math.max(-840, Math.min(840, Math.round(+b.tz || 0))) * 60000; // minutes east of UTC, for the day chart
    const W = 'started>=?' + (host ? ' AND host=?' : ''), P = host ? [since, host] : [since];
    const q = (sql, ...extra) => db.prepare(sql).bind(...P, ...extra);
    if (Math.random() < 0.05) await db.batch([db.prepare('DELETE FROM views WHERE visit IN (SELECT id FROM visits WHERE started<?)').bind(Date.now() - 400 * 86400000), db.prepare('DELETE FROM visits WHERE started<?').bind(Date.now() - 400 * 86400000)]);
    const r = await db.batch([
      q(`SELECT COUNT(*) n, COUNT(DISTINCT vid) people, COALESCE(SUM(dur),0) total, COALESCE(AVG(dur),0) avg, COALESCE(SUM(back),0) back FROM visits WHERE ${W}`),
      q(`SELECT country k, COUNT(*) n, SUM(dur) t FROM visits WHERE ${W} GROUP BY country ORDER BY n DESC LIMIT 20`),
      q(`SELECT city k, country c, COUNT(*) n FROM visits WHERE ${W} AND city IS NOT NULL GROUP BY city, country ORDER BY n DESC LIMIT 20`),
      q(`SELECT ref k, COUNT(*) n FROM visits WHERE ${W} GROUP BY ref ORDER BY n DESC LIMIT 20`),
      q(`SELECT device||' · '||os k, COUNT(*) n FROM visits WHERE ${W} GROUP BY k ORDER BY n DESC LIMIT 12`),
      q(`SELECT space k, COUNT(*) n, SUM(dur) t, AVG(dur) a, COUNT(DISTINCT visit) v FROM views WHERE visit IN (SELECT id FROM visits WHERE ${W}) GROUP BY space ORDER BY t DESC LIMIT 40`),
      q(`SELECT CAST((started+?)/86400000 AS INTEGER) d, COUNT(*) n, COUNT(DISTINCT vid) p FROM visits WHERE ${W} GROUP BY d ORDER BY d`.replace('(started+?)', '(started+' + tz + ')')),
      q(`SELECT host k, COUNT(*) n FROM visits WHERE ${W} GROUP BY host`),
      q(`SELECT * FROM visits WHERE ${W} ORDER BY started DESC LIMIT 150`),
      q(`SELECT visit, seq, space, dur FROM views WHERE visit IN (SELECT id FROM visits WHERE ${W} ORDER BY started DESC LIMIT 150) ORDER BY visit, seq`)
    ]);
    const R = i => r[i].results || [];
    return json({ days, host, totals: R(0)[0] || {}, countries: R(1), cities: R(2), refs: R(3), devices: R(4), spaces: R(5), byDay: R(6), hosts: R(7), recent: R(8), views: R(9), now: Date.now() });
  }
  return json({ error: 'action' }, 400);
}

const RESERVED = new Set('api admin www app index home suite suites teacher teachers student students dashboard settings account login signup signin logout help about class hall studio plus challenge arena practice hearandplay pokeytivity myprogressions privacy terms support visitors visit'.split(' '));
const HANDLE = /^[a-z0-9]{3,30}$/;
const cleanItems = (o) => { o = o && typeof o === 'object' ? o : {}; const L = (x, n) => (Array.isArray(x) ? x : []).slice(0, n);
  return { arena: L(o.arena, 40).map(x => ({ id: clip(x && x.id, 30), title: clip(x && x.title, 80), room: clip(x && x.room, 12), prog: clip(x && x.prog, 600), bpm: Math.max(0, Math.min(300, +(x && x.bpm) || 0)), key: clip(x && x.key, 4), type: clip(x && x.type, 30) })).filter(x => x.id && x.title),
    studio: L(o.studio, 30).map(x => ({ id: clip(x && x.id, 30), title: clip(x && x.title, 80), chords: clip(x && x.chords, 3000), style: clip(x && x.style, 30), bpm: Math.max(0, Math.min(300, +(x && x.bpm) || 0)), transpose: Math.max(-12, Math.min(12, +(x && x.transpose) || 0)), meter: clip(x && x.meter, 6) })).filter(x => x.id && x.title),
    plans: L(o.plans, 20).map(x => ({ id: clip(x && x.id, 30), name: clip(x && x.name, 60), week: (Array.isArray(x && x.week) ? x.week : []).slice(0, 7).map(cleanDay) })).filter(x => x.id && x.name) }; };
const cleanSpaces = (L) => (Array.isArray(L) ? L : []).slice(0, 16).map(x => ({ id: clip(x && x.id, 30), k: clip(x && x.k, 12), name: clip(x && x.name, 40), blurb: clip(x && x.blurb, 200), go: clip(x && x.go, 12) })).filter(x => x.id && x.name);
async function suiteOf(env, handle) {
  let h = handle, owner = await env.LESSONS.get('su:h:' + h), moved = null;
  if (!owner) { const to = await env.LESSONS.get('su:al:' + h); if (to) { moved = to; h = to; owner = await env.LESSONS.get('su:h:' + h); } }
  if (!owner) return null;
  const st = await env.LESSONS.get('su:t:' + owner, 'json'); if (!st || st.handle !== h) return null;
  return { owner, st, moved };
}
async function ensureCode(env, id, a) {
  if (a.tcode) return a.tcode;
  let code = newCode(); for (let i = 0; i < 5 && await env.LESSONS.get('tch:' + code); i++) code = newCode();
  a.tcode = code; await env.LESSONS.put('tch:' + code, JSON.stringify({ name: a.name || 'Teacher', owner: id, made: Date.now() }));
  await env.LESSONS.put('acct:' + id, JSON.stringify(a)); return code;
}
async function suite(request, env, url) {
  if (!env.LESSONS) return json({ error: 'no_kv_binding' }, 503);
  _env = env;
  if (request.method === 'GET') {
    const c = url.searchParams.get('check');
    if (c != null) { const h = String(c).toLowerCase(); if (!HANDLE.test(h) || RESERVED.has(h)) return json({ available: false, reason: 'bad' }, 200);
      const o = await env.LESSONS.get('su:h:' + h), al = await env.LESSONS.get('su:al:' + h); const u = await sessionUser(request, env);
      return json({ available: (!o && !al) || (!!u && (o === u.id || (al && (await env.LESSONS.get('su:h:' + al)) === u.id))) }, 200); }
    const h = String(url.searchParams.get('h') || '').toLowerCase(); if (!HANDLE.test(h)) return json({ error: 'none' }, 404);
    const f = await suiteOf(env, h); if (!f) return json({ error: 'none' }, 404);
    const ta = await env.LESSONS.get('acct:' + f.owner, 'json');
    return json({ handle: f.st.handle, moved: f.moved, name: f.st.name, spaces: f.st.spaces, teacher: ta ? (ta.name || 'Teacher') : 'Teacher', at: f.st.at }, 200);
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (_) {}
  const u = await sessionUser(request, env); if (!u) return json({ error: 'auth' }, 401);
  const a = u.acct, act = String(b.action || '');
  if (act === 'mine') { const st = await env.LESSONS.get('su:t:' + u.id, 'json'); return json({ suite: st || null, role: a.role || 'none' }, 200); }
  if (act === 'save') {
    if (a.role !== 'teacher') return json({ error: 'role' }, 403);
    const old = await env.LESSONS.get('su:t:' + u.id, 'json');
    const h = String(b.handle || (old && old.handle) || '').toLowerCase().replace(/^@/, '');
    if (!HANDLE.test(h) || RESERVED.has(h)) return json({ error: 'bad_handle' }, 400);
    const o = await env.LESSONS.get('su:h:' + h); if (o && o !== u.id) return json({ error: 'taken' }, 409);
    const al = await env.LESSONS.get('su:al:' + h); if (al && (await env.LESSONS.get('su:h:' + al)) !== u.id) return json({ error: 'taken' }, 409);
    const code = await ensureCode(env, u.id, a);
    const st = { handle: h, name: clip(b.name, 60) || (old && old.name) || (a.name ? a.name + "'s Suite" : 'My HearandPlay Suite'), spaces: b.spaces ? cleanSpaces(b.spaces) : ((old && old.spaces) || []), items: b.items ? cleanItems(b.items) : ((old && old.items) || cleanItems({})), code, at: Date.now() };
    if (JSON.stringify(st).length > 90000) return json({ error: 'too_big' }, 413);
    if (old && old.handle && old.handle !== h) { await env.LESSONS.delete('su:h:' + old.handle); await env.LESSONS.put('su:al:' + old.handle, h); }
    if (al) await env.LESSONS.delete('su:al:' + h);
    await env.LESSONS.put('su:h:' + h, u.id); await env.LESSONS.put('su:t:' + u.id, JSON.stringify(st));
    return json({ suite: st }, 200);
  }
  const h = String(b.h || '').toLowerCase(), f = HANDLE.test(h) ? await suiteOf(env, h) : null; if (!f) return json({ error: 'none' }, 404);
  const pk = 'su:p:' + f.owner + ':' + u.id;
  if (act === 'status') { const p = await env.LESSONS.get(pk); return json({ subscribed: !!p, owner: f.owner === u.id }, 200); }
  if (act === 'subscribe') {
    if (f.owner === u.id) return json({ error: 'own' }, 400);
    const pin = String(b.pin || ''); if (!/^\d{4,6}$/.test(pin)) return json({ error: 'bad_pin' }, 400);
    const salt = rnd(8); await env.LESSONS.put(pk, JSON.stringify({ salt, hash: await sha(salt + ':' + pin), at: Date.now() }));
    /* the student and the teacher are linked (active), so assignments and plans reach the student */
    const ta = await env.LESSONS.get('acct:' + f.owner, 'json'); const code = f.st.code || (ta && ta.tcode);
    if (ta && code) { ta.students = ta.students || []; const m = ta.students.find(x => x.id === u.id); if (m) { m.status = 'active'; m.name = who(a); } else ta.students.push({ id: u.id, name: who(a), status: 'active', suite: true });
      a.teachers = a.teachers || []; const t = a.teachers.find(x => x.code === code); if (t) { t.status = 'active'; t.name = ta.name || 'Teacher'; } else a.teachers.push({ code, name: ta.name || 'Teacher', status: 'active' });
      await putAcct(f.owner, ta); await putAcct(u.id, a); }
    return json({ ok: true }, 200);
  }
  if (act === 'enter') {
    const own = f.owner === u.id;
    if (!own) { const p = await env.LESSONS.get(pk, 'json'); if (!p) return json({ error: 'not_subscribed' }, 403);
      const lk = 'lim:pin:' + pk, tries = +(await env.LESSONS.get(lk)) || 0; if (tries >= 10) return json({ error: 'slow_down' }, 429);
      if ((await sha(p.salt + ':' + String(b.pin || ''))) !== p.hash) { await env.LESSONS.put(lk, String(tries + 1), { expirationTtl: 900 }); return json({ error: 'wrong_pin' }, 401); }
      await env.LESSONS.delete(lk); }
    const code = f.st.code, items = [];
    if (code) { const l = await env.LESSONS.list({ prefix: 'as:' + code + ':', limit: 1000 });
      const vals = await Promise.all(l.keys.map(k => k.name).slice(-40).map(async n => { const v = await env.LESSONS.get(n, 'json'); return v && Object.assign({ id: n }, v); }));
      vals.forEach(v => { if (v && (own || v.to === 'all' || (Array.isArray(v.to) && v.to.includes(u.id)))) items.push({ id: v.id, kind: v.kind, title: v.title, note: v.note, spec: v.spec, at: v.at }); }); }
    items.sort((x, y) => y.at - x.at);
    return json({ ok: true, preview: own, assignments: items.slice(0, 30), items: f.st.items || cleanItems({}) }, 200);
  }
  return json({ error: 'unknown' }, 404);
}

/* ---------- practice feed: who is practising right now ----------
   Students who switch the feed on send a heartbeat while they practise (nickname, what they are playing); the city comes from Cloudflare.
   One Durable Object keeps the list in memory; anyone silent for 75 seconds drops off. Nothing is stored. */
export class Presence {
  constructor(state) { this.state = state; this.m = new Map(); }
  async fetch(request) {
    const now = Date.now(); for (const [k, v] of this.m) if (now - v.t > 75000) this.m.delete(k);
    if (request.method === 'POST') { const b = await request.json(); if (b && b.id) { if (b.off) this.m.delete(b.id); else if (this.m.size < 500 || this.m.has(b.id)) this.m.set(b.id, Object.assign(b, { t: now })); } return json({ ok: true }); }
    const me = new URL(request.url).searchParams.get('me') || ''; const list = [...this.m.values()].filter(v => v.id !== me).sort((x, y) => y.t - x.t).slice(0, 60).map(v => ({ nick: v.nick, city: v.city, cc: v.cc, scale: v.scale, hands: v.hands, bpm: v.bpm, rhy: v.rhy, min: v.min }));
    return json({ list, count: this.m.size });
  }
}
const pclip = (v, n) => String(v == null ? "" : v).replace(/[<>\u0000-\u001f]/g, '').slice(0, n);
async function presence(request, env) {
  if (!env.PRESENCE) return json({ list: [], count: 0, off: true });
  const stub = env.PRESENCE.get(env.PRESENCE.idFromName('global'));
  if (request.method === 'GET') { const r = await stub.fetch('https://presence/list?me=' + encodeURIComponent(new URL(request.url).searchParams.get('me') || '')); const d = await r.json(); d.samples = env.FEED_SAMPLES !== 'off'; return json(d); }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (_) { return json({ error: 'bad' }, 400); }
  const id = pclip(b.id, 40); if (!/^[a-z0-9]{8,40}$/i.test(id)) return json({ error: 'bad' }, 400);
  if (b.off) return stub.fetch('https://presence/set', { method: 'POST', body: JSON.stringify({ id, off: true }) });
  const nick = pclip(b.nick, 24).replace(/[^\p{L}\p{N} _.\-]/gu, '').trim(); if (nick.length < 2) return json({ error: 'nick' }, 400);
  const cf = request.cf || {}, city = pclip(cf.city, 60), cc = /^[A-Z]{2}$/.test(cf.country || '') ? cf.country : '';
  const rec = { id, nick, city, cc, scale: pclip(b.scale, 60), hands: pclip(b.hands, 30), bpm: Math.max(20, Math.min(300, +b.bpm || 0)), rhy: pclip(b.rhy, 20), min: Math.max(0, Math.min(600, Math.round(+b.min || 0))) };
  return stub.fetch('https://presence/set', { method: 'POST', body: JSON.stringify(rec) });
}

/* chord-room progression codes: a short code (HP-XXXXXX) that pulls up a saved progression and its console settings */
const PCA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function progCode(request, env, url) {
  if (!env.LESSONS) return json({ error: 'store' }, 500);
  if (request.method === 'GET') {
    const c = String(url.searchParams.get('c') || '').toUpperCase().replace(/^HP-?/, '').replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) return json({ error: 'bad' }, 400);
    const v = await env.LESSONS.get('pc:' + c); if (!v) return json({ error: 'missing' }, 404);
    return json({ d: JSON.parse(v) });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const txt = await request.text(); if (txt.length > 8000) return json({ error: 'big' }, 413);
  let b; try { b = JSON.parse(txt); } catch (_) { return json({ error: 'bad' }, 400); }
  if (!b || typeof b.d !== 'object' || Array.isArray(b.d)) return json({ error: 'bad' }, 400);
  for (let i = 0; i < 6; i++) {
    const r = crypto.getRandomValues(new Uint8Array(6)); let c = ''; r.forEach(x => { c += PCA[x % PCA.length]; });
    if (await env.LESSONS.get('pc:' + c)) continue;
    await env.LESSONS.put('pc:' + c, JSON.stringify(b.d)); return json({ code: 'HP-' + c });
  }
  return json({ error: 'busy' }, 503);
}

function pkPage(res) {
  const O = 'https://app.pokeytivity.com/';
  const attr = (n, v) => ({ element(e) { e.setAttribute(n, v); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent('Pokeytivity Piano Suite'); } })
    .on('meta[property="og:site_name"]', attr('content', 'Pokeytivity'))
    .on('meta[property="og:title"],meta[name="twitter:title"]', attr('content', 'Pokeytivity Piano Suite'))
    .on('meta[property="og:url"]', attr('content', O))
    .on('meta[property="og:image"],meta[name="twitter:image"]', attr('content', O + 'icon-512.png'))
    .on('link[rel="manifest"]', attr('href', 'manifest-pk.webmanifest'))
    .on('link[rel="apple-touch-icon"]', attr('href', 'pk-apple-180.png'))
    .on('link[rel="icon"]', { element(e) { const h = e.getAttribute('href') || ''; e.setAttribute('href', h.replace('hp-fav-', 'pk-fav-')); } })
    .on('link[rel="preload"][href="hp-logo.png"]', { element(e) { e.remove(); } })
    .transform(res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    /* app.pokeytivity.com (the Old Testament) and hearandplay.app (the New Testament) serve the same suite; the page itself
       hides the teacher wing on app.pokeytivity.com, so student-wing changes reach both. */
    if (url.pathname === '/api/code') {
      try { return await progCode(request, env, url); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/presence') {
      try { return await presence(request, env); } catch (e) { console.log(e); return json({ list: [], count: 0 }, 200); }
    }
    if (url.pathname === '/api/admin/lessons') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      try { return await adminLessons(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname.startsWith('/api/teach/')) {
      try { return await teach(request, env, url.pathname.slice(11)); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/acct') {
      try { return await account(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/suite') {
      try { return await suite(request, env, url); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
    }
    if (url.pathname === '/api/visit') {
      try { return await visits(request, env); } catch (e) { console.log(e); return json({ error: 'server' }, 500); }
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
    /* a teacher's suite: hearandplay.app/<handle> (and /@handle) opens the suite page (not on app.pokeytivity.com, which has no teacher wing) */
    /* the suite page is public/shell.html, so "/" always reaches this worker (no index.html for the assets to serve first) */
    let res0 = await env.ASSETS.fetch(request);
    if (res0.status === 404 && (url.pathname === '/' || url.pathname === '/index.html') && (request.method === 'GET' || request.method === 'HEAD')) {
      const r = await env.ASSETS.fetch(new Request(url.origin + '/shell', { headers: request.headers }));
      res0 = new Response(r.body, { status: r.status, headers: r.headers });
    }
    /* app.pokeytivity.com: link previews (WhatsApp, iMessage, Facebook…) read the page without running it, so the name, icons and preview card are swapped here */
    const res = (/(^|\.)pokeytivity\.com$/i.test(url.hostname) && (res0.headers.get('content-type') || '').includes('text/html')) ? pkPage(res0) : res0;
    if (res.status !== 404 || url.hostname === 'app.pokeytivity.com') return res;
    { const m = /^\/(@?)([A-Za-z0-9]{3,30})\/?$/.exec(url.pathname);
      if (m && (request.method === 'GET' || request.method === 'HEAD') && !RESERVED.has(m[2].toLowerCase())) {
        const h = m[2].toLowerCase(); if (m[1] || h !== m[2] || url.pathname.endsWith('/')) return Response.redirect(url.origin + '/' + h + url.search, 301);
        const r = await env.ASSETS.fetch(new Request(url.origin + '/shell', { headers: request.headers }));
        return new Response(r.body, { status: 200, headers: r.headers });
      } }
    return res;
  },
};
