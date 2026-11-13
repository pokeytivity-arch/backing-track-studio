// Small BM25 search over excerpts from the teacher's own past lessons.
// The excerpts are not in this repo: they are loaded from a private
// Cloudflare KV namespace (binding LESSONS, key "index"). Without it the
// coach still works, from the persona alone.
const STOP = new Set('the a an and or of to in on for with is are was be it this that you your we i me my so do does can what how why when which there here just like okay ok yes no not but if then now let let\'s go get got one two three four five six seven'.split(' '));
const tok = s => (s.toLowerCase().match(/[a-z0-9#']+/g) || []).filter(w => w.length > 1 && !STOP.has(w));

let cache = null;
export async function loadIndex(env) {
  if (cache) return cache;
  if (!env.LESSONS) return null;
  const docs = await env.LESSONS.get('index', 'json');
  if (!Array.isArray(docs) || !docs.length) return null;
  const tf = [], df = new Map(); let total = 0;
  for (const d of docs) {
    const m = new Map();
    for (const w of tok(d.t + ' ' + d.k)) m.set(w, (m.get(w) || 0) + 1);
    tf.push(m); total += [...m.values()].reduce((a, b) => a + b, 0);
    for (const w of m.keys()) df.set(w, (df.get(w) || 0) + 1);
  }
  const len = tf.map(m => [...m.values()].reduce((a, b) => a + b, 0));
  cache = { docs, tf, df, len, avg: total / docs.length };
  return cache;
}

export function search(ix, query, { k = 4, level = '', tags = [] } = {}) {
  const q = [...new Set(tok(query))]; if (!q.length) return [];
  const N = ix.docs.length, k1 = 1.4, b = 0.75, out = [];
  for (let i = 0; i < N; i++) {
    const m = ix.tf[i]; let s = 0;
    for (const w of q) {
      const f = m.get(w); if (!f) continue;
      const idf = Math.log(1 + (N - ix.df.get(w) + 0.5) / (ix.df.get(w) + 0.5));
      s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * ix.len[i] / ix.avg));
    }
    if (!s) continue;
    const d = ix.docs[i];
    if (level && d.l && d.l.toLowerCase().startsWith(level.toLowerCase().slice(0, 5))) s *= 1.15;
    if (tags.length && d.g && d.g.some(g => tags.includes(g))) s *= 1.2;
    out.push([s, i]);
  }
  out.sort((a, b) => b[0] - a[0]);
  const seen = new Set(), res = [];
  for (const [, i] of out) { const d = ix.docs[i]; if (seen.has(d.k + d.d)) continue; seen.add(d.k + d.d); res.push(d); if (res.length >= k) break; }
  return res;
}

// Tag hints from the student's question, so stories and scripture surface when wanted.
export function tagHints(q) {
  const t = [];
  if (/\b(bible|scripture|verse|god|faith|pray|church|worship|spirit)\b/i.test(q)) t.push('scripture');
  if (/\b(discourag|give up|frustrat|hard|stuck|slow|motivat|tired|can't|cannot|old|late)\b/i.test(q)) t.push('motivation');
  if (/\b(explain|understand|like what|example|picture|simple)\b/i.test(q)) t.push('analogy');
  return t;
}
