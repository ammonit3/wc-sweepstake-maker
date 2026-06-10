import { PLAYER_COUNTS, STAKE_MIN, STAKE_MAX } from "../../../lib/teams.js";
import { drawTeams } from "../../../lib/draw.js";
import { buildLadder } from "../../../lib/ladder.js";
import { saveSweep, allowCreate } from "../../../lib/store.js";
import { newId, newToken } from "../../../lib/ids.js";
import { verifyTurnstile, clientIp, validEmail } from "../../../lib/security.js";
import { sendAdminLink } from "../../../lib/email.js";

export const runtime = "nodejs";

function err(message, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return err("Bad request."); }
  const { name, players, stake, creatorName, creatorEmail, turnstileToken, website } = b || {};

  if (website) return err("Bot detected.", 400); // honeypot — humans never fill this
  const cleanName = (name || "").trim().slice(0, 80);
  const list = Array.isArray(players) ? players.map((p) => (p || "").trim()).filter(Boolean) : [];
  if (!cleanName) return err("Give your sweepstake a name.");
  if (!PLAYER_COUNTS.includes(list.length)) return err("Pick a valid number of players (2, 3, 4, 6, 8, 12, 16, 24 or 48).");
  if (new Set(list.map((s) => s.toLowerCase())).size !== list.length) return err("Player names must be unique.");
  if (list.some((n) => n.length > 40)) return err("A player name is too long.");
  const st = Math.round(Number(stake));
  if (!Number.isFinite(st) || st < STAKE_MIN || st > STAKE_MAX) return err(`Stake must be £${STAKE_MIN}–£${STAKE_MAX} per player.`);
  if (!(creatorName || "").trim()) return err("Enter your name.");
  if (!validEmail(creatorEmail)) return err("Enter a valid email address.");

  const ip = clientIp(req);
  if (!(await verifyTurnstile(turnstileToken, ip))) return err("Bot check failed — please retry.", 403);
  if (!(await allowCreate(ip))) return err("You've created several recently — please try again later.", 429);

  const pot = st * list.length;
  const sweep = {
    id: newId(), adminToken: newToken(), name: cleanName, players: list,
    allocation: drawTeams(list), stake: st, pot, ladder: buildLadder(list.length, pot),
    creatorName: creatorName.trim().slice(0, 80), creatorEmail: creatorEmail.trim().toLowerCase(),
    createdAt: Date.now(), locked: true,
  };
  await saveSweep(sweep);

  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const viewUrl = `${base}/s/${sweep.id}`;
  const adminUrl = `${base}/s/${sweep.id}/admin?t=${sweep.adminToken}`;
  const email = await sendAdminLink({ to: sweep.creatorEmail, creatorName: sweep.creatorName, sweepName: sweep.name, viewUrl, adminUrl });

  return Response.json({ id: sweep.id, adminToken: sweep.adminToken, viewUrl, adminUrl, emailed: !!email.sent });
}
