import { hasKV, kvPing } from "../../../lib/store.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe diagnostics — booleans only, no secret values. Visit /api/health.
export async function GET() {
  return Response.json({
    kvDetected: hasKV(),
    kvLiveTest: await kvPing(),
    envPresent: {
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      FOOTBALL_DATA_API_KEY: !!process.env.FOOTBALL_DATA_API_KEY,
      TURNSTILE_SECRET: !!process.env.TURNSTILE_SECRET,
      OWNER_TOKEN: !!process.env.OWNER_TOKEN,
    },
  });
}
