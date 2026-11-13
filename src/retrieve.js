// Small BM25 search over excerpts from the teacher's own past lessons.
// The excerpts are not in this (public) repo: they live in a private
// Cloudflare KV namespace bound as LESSONS, sharded so each request reads
// and parses only a few small keys. Without it the coach still works from
// the persona alone. Keys: "meta", "p:<n>" (term postings), "d:<n>" (passages).
const STOP = new Set("the a an and or of to in on for with is are was be it this that you your we i me my so do does can what how why when which there here just like okay ok yes no not but if then now let let's go get got one two three four five six seven".split(' '));
const tok = s => (s.toLowerCase().match(/[a-z0-9#']+/g) || []).filter(w => w.length > 1 && !STOP.has(w));

// crc32, same as Python's zlib.crc32
const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = s => { let c = 0xFFFFFFFF; for (const b of new TextEncoder().encode(s)) c = T[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

let meta = null;
const cache = new Map();
async function getJSON(env, key) {
  if (cache.has(key)) return cache.get(key);
  const v = await env.LESSONS.get(key, { type: 'json', cacheTtl: 3600 });
  if (cache.size > 200) cache.clear();
  cache.set(key, v); return v;
}

export async function searchLessons(env, query, { k = 4, level = '', tags = [] } = {}) {
  if (!env.LESSONS) return [];
  meta = meta || await getJSON(env, 'meta');
  if (!meta) return [];
  const q = [...new Set(tok(query))].slice(0, 12); if (!q.length) return [];
  const shardIds = [...new Set(q.map(w => crc32(w) % meta.P))];
  const shards = await Promise.all(shardIds.map(s => getJSON(env, 'p:' + s)));
  const byId = Object.fromEntries(shardIds.map((s, i) => [s, shards[i] || {}]));
  const N = meta.n, k1 = 1.4, b = 0.75, score = new Map();
  for (const w of q) {
    const pl = byId[crc32(w) % meta.P][w]; if (!pl) continue;
    const idf = Math.log(1 + (N - pl.length + 0.5) / (pl.length + 0.5));
    for (const [i, f] of pl) score.set(i, (score.get(i) || 0) + idf * f * (k1 + 1) / (f + k1 * (1 - b + b * meta.len[i] / meta.avg)));
  }
  const top = [...score].sort((a, b) => b[1] - a[1]).slice(0, k * 4);
  const docShards = [...new Set(top.map(([i]) => i % meta.D))];
  const ds = await Promise.all(docShards.map(s => getJSON(env, 'd:' + s)));
  const docs = Object.assign({}, ...ds.filter(Boolean));
  const lv = level.toLowerCase().slice(0, 5);
  const ranked = top.map(([i, s]) => {
    const d = docs[i]; if (!d) return null;
    if (lv && d.l && d.l.toLowerCase().startsWith(lv)) s *= 1.15;
    if (tags.length && d.g && d.g.some(g => tags.includes(g))) s *= 1.2;
    return [s, d];
  }).filter(Boolean).sort((a, b) => b[0] - a[0]);
  const seen = new Set(), res = [];
  for (const [, d] of ranked) { const key = d.k + d.d; if (seen.has(key)) continue; seen.add(key); res.push(d); if (res.length >= k) break; }
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
