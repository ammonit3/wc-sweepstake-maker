// KV-backed store with an in-memory dev fallback (works with no env keys locally).
// Sweepstakes are tiny and immutable once created.
const mem = new Map(); // dev fallback (per-process)
const TTL = 60 * 60 * 24 * 120; // ~120 days

// Support both Vercel KV (`KV_REST_API_*`) and raw Upstash (`UPSTASH_REDIS_REST_*`)
// env var names, since the marketplace integration may set either.
const kvUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasKV = () => !!(kvUrl() && kvToken());
async function kv() {
  const { createClient } = await import("@vercel/kv");
  return createClient({ url: kvUrl(), token: kvToken() });
}

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

// Live self-test: confirms the deployed app can actually read/write KV.
export async function kvPing() {
  if (!hasKV()) return { ok: false, reason: "no KV env vars detected" };
  try {
    const k = await kv();
    await k.set("health:ping", Date.now(), { ex: 60 });
    const v = await k.get("health:ping");
    return { ok: v != null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
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
