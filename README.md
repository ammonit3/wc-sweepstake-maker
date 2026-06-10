# ⚽ WC Sweepstake Maker

Self-serve site where anyone can create their own World Cup 2026 sweepstake: pick players, set a stake, run an instant fair draw, and get a shareable live leaderboard with the full arcane scoring system (underdog bonuses, knockout multipliers, deep-run rewards). "It's Mathematically Possible!"

Built on the v1 engine (`../wc2026-sweepstake`). All the heavy data (48 teams, rankings, fixtures, live scores, rules) is **global and shared**; each sweepstake stores only a tiny config, so it's cheap to run at any scale.

## Run locally
```bash
npm install
npm run dev    # http://localhost:3000
```
Works with **no env keys**: KV falls back to an in-memory store, Turnstile and Resend are skipped, and live scores fall back to bundled fixtures. Great for trying the create flow and the sweepstake view.

## How it works
- `/new` → create form (players, stake, live pot + ladder preview, name/email, Turnstile) → `POST /api/create` runs the draw, saves to KV, and **shows the share + admin links on screen** (email capture is for sign-up/tracking; sending is optional — see below).
- `/s/[id]` → the sweepstake (leaderboard, players, fixtures, rules) — ISR-cached, live scores client-side.
- `/s/[id]/admin?t=token` → rename/delete (creator only).
- `/admin?t=OWNER_TOKEN` → your private usage dashboard.
- `GET /api/matches` → one shared, cached football-data feed for the whole site.

## Deploy
See **DEPLOY.md**. Short version: push to GitHub → import on Vercel → add a KV store → set env vars (Turnstile, Resend, football-data, OWNER_TOKEN) → deploy.

## Tuning
Scoring rules live in `lib/scoring.js → CFG` (shared by all sweepstakes). Stake defaults/bounds and the team table are in `lib/teams.js`. The payout-ladder shape is in `lib/ladder.js`.
