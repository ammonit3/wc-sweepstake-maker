// Cloudflare Turnstile verification. Skips (returns true) if not configured,
// so the app runs locally without keys.
export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export const clientIp = (req) =>
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";

export const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
