// KV-backed store with an in-memory dev fallback (works with no env keys locally).
// Sweepstakes are tiny and immutable once created.
const mem = new Map(); // dev fallback (per-process)
const TTL = 60 * 60 * 24 * 120; // ~120 days
const hasKV = () => !!process.env.KV_REST_API_URL;
async function kv() { return (await import("@vercel/kv")).kv; }

export async function saveSweep(s) {
  if (hasKV()) {
    const k = await kv();
    await k.set(`sweep:${s.id}`, s, { ex: TTL });
    await k.sadd("sweeps:index", s.id);
  } else {
    mem.set(s.id, s);
  }
  return s;
}

export async function getSweep(id) {
  if (hasKV()) return (await (await kv()).get(`sweep:${id}`)) || null;
  return mem.get(id) || null;
}

export async function listSweeps() {
  if (hasKV()) {
    const k = await kv();
    const ids = (await k.smembers("sweeps:index")) || [];
    const out = [];
    for (const id of ids) { const s = await k.get(`sweep:${id}`); if (s) out.push(s); }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }
  return [...mem.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSweep(id) {
  if (hasKV()) { const k = await kv(); await k.del(`sweep:${id}`); await k.srem("sweeps:index", id); }
  else mem.delete(id);
}

// Per-IP rate limit for creation. Allows freely if KV isn't configured (dev).
export async function allowCreate(ip, limit = 5) {
  if (!hasKV()) return true;
  const k = await kv();
  const key = `rl:${ip}:${Math.floor(Date.now() / 3600000)}`;
  const n = await k.incr(key);
  if (n === 1) await k.expire(key, 3600);
  return n <= limit;
}
