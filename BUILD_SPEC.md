# WC Sweepstake Maker — Build Spec

Self-serve site where anyone can spin up their own World Cup 2026 sweepstake. Separate site/repo from v1 (`~/Sweepstake/wc2026-sweepstake`), but reuses v1's scoring engine, components and Panini styling.

## Locked decisions
- **Tournament:** World Cup 2026 only (48 teams, shared global data — same as v1).
- **Players:** 2, 3, 4, 6, 8, 12, 16, 24, 48 (divisors of 48 → `48 / N` teams each).
- **Rules:** the fixed v1 "arcane" ruleset, including knockout-round doubling of upset bonuses. Not customisable.
- **Draw:** instant tiered snake draw, locks at creation.
- **Stake:** editable per player, **min £1, max £20**. Smart default per field (table below). Pot = stake × players.
- **Payout:** auto-scaled top-heavy ladder summing to the pot (algorithm below).
- **Storage:** Vercel KV (Upstash). Configs are tiny and immutable once locked → edge-cache hard; ISR the views; one shared cached scores route. Cost scales with sweepstakes created, not traffic ⇒ ≈£0 at realistic scale.
- **Security (creation only; viewing is open/frictionless):** Cloudflare Turnstile + per-IP rate limit + honeypot + input caps + TTL on abandoned sweepstakes.
- **Registration:** name + email required to create (for usage tracking + admin link). No passwords. Email the admin link via Resend (only ever to the creator's own address, rate-limited).

## Stake defaults
| Players | Default stake | Pot | Teams each |
|---|---|---|---|
| 2 | £20 | £40 | 24 |
| 3 | £20 | £60 | 16 |
| 4 | £20 | £80 | 12 |
| 6 | £20 | £120 | 8 |
| 8 | £15 | £120 | 6 |
| 12 | £10 | £120 | 4 |
| 16 | £8 | £128 | 3 |
| 24 | £5 | £120 | 2 |
| 48 | £3 | £144 | 1 |
Create form live-previews pot + ladder; soft nudge if pot falls outside £100–150 (only achievable at 6+ players given the £20 cap). Hard bounds £1–£20.

## Payout-ladder algorithm
Top-heavy, pays roughly the top half, sums exactly to the pot, rounded to whole pounds.
1. `paid = max(1, round(N / 2))` places win money; the rest get £0.
2. Geometric weights `w_i = 0.62^i` for `i = 0 … paid-1`; normalise so `Σw = 1`.
3. `payout_i = round(weight_i × pot)`; assign 0 to unpaid places.
4. Fix rounding drift by adding the remainder (pot − Σpayouts) to 1st place.
5. **Ties** pool the money for the positions they span and split evenly.
Anchor/reference: v1's hand-tuned N=6 ladder was £50/35/20/10/5/0 — the generator should feel similar (top-heavy, break-even just above the middle). Always display the computed ladder to the creator before they commit. Special-case N=2 → winner-take-most (e.g. 70/30).

## Routes / screens
- `/` — landing: what it is, the tagline ("It's Mathematically Possible!"), "Create a sweepstake".
- `/new` — create form: name → players (divisor picker, shows teams-each) → name fields (count-matched) → stake (live pot + ladder preview) → creator name + email → Turnstile → "Run the draw".
- `POST /api/create` — validates (Turnstile, rate limit, honeypot, bounds), runs the draw, writes KV, returns `{ id, adminToken }`, emails the admin link.
- `/s/[id]` — the sweepstake: v1 app exactly (leaderboard with all teams + chips, latest results w/ summaries, fixtures w/ tooltips, players, rules) driven by this record. ISR + edge-cached.
- `/s/[id]/admin?t=TOKEN` — minimal: rename, delete. (Draw & rules are fixed; little to manage.)
- `/admin` — owner-only (gated by `OWNER_TOKEN`): list every sweepstake (creator name/email, players, stake, pot, createdAt). Usage view.
- `GET /api/matches` — shared cached scores route (ported from v1; one football-data call / 30s for the whole site).

## Data model (one KV record per sweepstake)
`{ id, name, players: string[], allocation: { [player]: teamName[] }, stake, pot, ladder: number[], creatorName, creatorEmail, adminToken, createdAt, locked: true }`
Teams, rankings, fixtures, scores and the ruleset stay global/shared. Key: `sweep:{id}`. Optional `index` set for the owner dashboard. TTL (e.g. 120 days) refreshed on view; abandoned ones expire.

## Reuse from v1 (`~/Sweepstake/wc2026-sweepstake`)
- `lib/scoring.js` — the engine, verbatim, but `computeScoring`/`TEAMS` parameterised by the sweepstake's `players` + `allocation` instead of importing the hardcoded `lib/data.js`. Refactor: make team→owner mapping an argument.
- `lib/data.js` — keep the **TEAMS** table (48 teams, ranks, groups) and aliases as global data; drop the hardcoded PLAYERS/allocation.
- `app/Decor.js`, `app/globals.css` — verbatim (Panini look, tagline banner, fonts).
- `app/page.js`, `app/players/page.js`, `app/fixtures/page.js`, `app/rules/page.js` — port into `/s/[id]` as components that take the sweepstake record as a prop; the leaderboard/results/tooltips logic is unchanged.
- `app/api/matches/route.js` — verbatim (shared scores + seed fallback).

## Provisioning (all free tiers)
New GitHub repo + Vercel project · Vercel KV store · Cloudflare Turnstile (site + secret keys) · Resend API key · shared `FOOTBALL_DATA_API_KEY` · `OWNER_TOKEN` secret.
Env: `KV_*` (auto from Vercel KV), `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `RESEND_API_KEY`, `FOOTBALL_DATA_API_KEY`, `OWNER_TOKEN`, `APP_URL`.
All integrations degrade gracefully if a key is absent (KV→in-memory dev store; Turnstile/Resend→skipped) so it runs locally without secrets.

## Build order
1. Scaffold + port shared lib/components.
2. KV module + data model (+ in-memory dev fallback).
3. `/new` form + stake defaults + ladder generator (+ unit tests).
4. `/api/create`: Turnstile + rate limit + honeypot + validation + draw + write + email.
5. `/s/[id]` view wired to KV (ISR).
6. `/admin` owner dashboard.
7. Verify (build, ladder/scoring tests, edge cases) + deploy.

## Acceptance / edge cases
- Every player count divides 48 cleanly; reject anything else.
- Ladder always sums exactly to pot; ties pool & split.
- Duplicate/blank player names rejected; stake clamped £1–£20; ≤ N names.
- Works with no live API key (fixtures + even split shown).
- Rate-limited & Turnstile-gated creation; open viewing.

## Out of scope (v1 of the maker)
Other tournaments, custom rules, live draft, accounts/passwords, manual score entry.
