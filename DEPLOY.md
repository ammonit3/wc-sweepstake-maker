# Deploying WC Sweepstake Maker

~20 minutes. Free tiers throughout.

## 1. Push to GitHub (Terminal)
```bash
cd ~/Sweepstake/wc-sweepstake-maker
npm install
chmod +x ship.sh
git init -b main
git add -A
git commit -m "initial wc sweepstake maker"
gh repo create ammonit3/wc-sweepstake-maker --public --source=. --push
```

## 2. Get the free keys (do these in browser tabs)
1. **football-data** — https://www.football-data.org/client/register → copy the API token.
2. **Cloudflare Turnstile** — https://dash.cloudflare.com → Turnstile → Add site (any domain incl. `*.vercel.app`). Copy the **Site key** and **Secret key**.
3. **Resend** — **skip this.** Email is off by default: links are shown on screen at creation, and the email field is just sign-up/tracking. Only add a `RESEND_API_KEY` (and verify a sending domain) later if you want the links emailed too.
4. **OWNER_TOKEN** — make up a long random string (e.g. from a password manager).

## 3. Vercel
1. https://vercel.com/new → import `ammonit3/wc-sweepstake-maker` (auto-detects Next.js).
2. **Storage → Create Database → KV** (Upstash), connect it to this project — this auto-adds the `KV_REST_API_*` env vars.
3. **Settings → Environment Variables**, add:
   - `FOOTBALL_DATA_API_KEY` = football-data token
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Turnstile site key
   - `TURNSTILE_SECRET` = Turnstile secret
   - `RESEND_API_KEY` = Resend key (optional)
   - `EMAIL_FROM` = e.g. `Sweepstake <onboarding@resend.dev>` (or your verified domain sender)
   - `OWNER_TOKEN` = your random string
   - `APP_URL` = your deployment URL once you know it (e.g. `https://wc-sweepstake-maker.vercel.app`)
4. **Deploy.** Visit the URL, hit **Create**, make a test sweepstake.
5. Your usage dashboard: `https://<your-url>/admin?t=YOUR_OWNER_TOKEN`.

## 4. Future changes
```bash
cd ~/Sweepstake/wc-sweepstake-maker && ./ship.sh "what changed"
```

## Notes
- Runs fine before you add keys (in-memory store, no bot check, fixtures only) — but for a real shareable deploy you want **KV** (so sweepstakes persist) and **Turnstile** (so bots can't spam creation).
- Cost: sweepstake configs are tiny and immutable; pages are edge-cached; the scores feed is one shared cached call. Cost scales with sweepstakes created, not traffic.
