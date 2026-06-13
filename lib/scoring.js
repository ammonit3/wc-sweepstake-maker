// ============================================================================
//  ARCANE SWEEPSTAKE SCORING ENGINE (multi-tenant)
//  Same rules as v1, but parameterised by a sweepstake's players/allocation/ladder.
//  Pure functions of (matches, sweepstake). Runs identically on server & client.
// ============================================================================
import { TEAMS, NAME_ALIASES } from "./teams.js";
import { applyLadder } from "./ladder.js";

export const CFG = {
  RESULT: { win: 10, draw: 4, loss: 0 },
  GIANT_KILLING_K: 0.5,
  PLUCKY_DRAW_K: 0.25,
  UPSET_GOAL_K: 0.1,
  CLEAN_SHEET_K: 0.15,
  BOTTLEJOB_K: 0.1,
  BOTTLEJOB_GAP: 20,
  UPSET_STAGE_FACTOR: { GROUP_STAGE: 1, LAST_32: 2, LAST_16: 4, QUARTER_FINALS: 8, SEMI_FINALS: 16, THIRD_PLACE: 16, FINAL: 32 },
  STAGE_BASE: { LAST_32: 5, LAST_16: 10, QUARTER_FINALS: 20, SEMI_FINALS: 35, FINAL: 55 },
  CHAMPION_BASE: 90,
  BRONZE: 10,
  GOAL_MACHINE: 25,
  IRON_CURTAIN: 20,
  GIANT_SLAYER: 20,
  PERFECT_GROUP: 15,
  GROUP_OF_DEATH: 15,
};

const KO_STAGES = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

export function canon(name) {
  if (!name) return name;
  if (TEAMS[name]) return name;
  if (NAME_ALIASES[name]) return NAME_ALIASES[name];
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/gi, "").toLowerCase();
  const target = norm(name);
  for (const k of Object.keys(TEAMS)) if (norm(k) === target) return k;
  return name;
}

// {teamName: ownerName} from a sweepstake allocation
export function ownerMap(allocation) {
  const m = {};
  for (const [player, teams] of Object.entries(allocation || {})) for (const t of teams) m[t] = player;
  return m;
}

const rankMult = (rank) => 1 + rank / 10;
const isFinished = (m) => m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;

function scoreSide(ownName, oppName, ownGoals, oppGoals, stage) {
  const own = TEAMS[ownName], opp = TEAMS[oppName];
  if (!own || !opp) return { points: 0, events: [] };
  const gap = own.rank - opp.rank;
  const f = CFG.UPSET_STAGE_FACTOR[stage] || 1;
  const sfx = f > 1 ? ` ×${f}` : "";
  const mul = f > 1 ? ` × ${f}` : "";
  const events = [];
  let pts = 0;
  const add = (label, p, formula) => { if (p !== 0) { pts += p; events.push({ label, p, formula }); } };

  const win = ownGoals > oppGoals, draw = ownGoals === oppGoals;
  add(win ? "Win" : draw ? "Draw" : "Loss", win ? CFG.RESULT.win : draw ? CFG.RESULT.draw : CFG.RESULT.loss, `base ${win ? "win" : draw ? "draw" : "loss"}`);

  if (gap > 0) {
    if (win) add(`Giant-killing (beat #${opp.rank})${sfx}`, Math.round(gap * CFG.GIANT_KILLING_K) * f, `round(${gap} × ${CFG.GIANT_KILLING_K})${mul}`);
    if (draw) add(`Backs-to-the-wall draw (vs #${opp.rank})${sfx}`, Math.round(gap * CFG.PLUCKY_DRAW_K) * f, `round(${gap} × ${CFG.PLUCKY_DRAW_K})${mul}`);
    const perGoal = Math.round(gap * CFG.UPSET_GOAL_K);
    if (perGoal > 0 && ownGoals > 0) add(`Smash-and-grab (${ownGoals}g vs #${opp.rank})${sfx}`, perGoal * ownGoals * f, `round(${gap} × ${CFG.UPSET_GOAL_K}) × ${ownGoals} goal${ownGoals > 1 ? "s" : ""}${mul}`);
    if (oppGoals === 0) add(`Park-the-bus clean sheet (vs #${opp.rank})${sfx}`, Math.round(gap * CFG.CLEAN_SHEET_K) * f, `round(${gap} × ${CFG.CLEAN_SHEET_K})${mul}`);
  } else if (gap <= -CFG.BOTTLEJOB_GAP && ownGoals < oppGoals) {
    add(`Bottle-job (lost to #${opp.rank})${sfx}`, -Math.round(Math.abs(gap) * CFG.BOTTLEJOB_K) * f, `−round(${Math.abs(gap)} × ${CFG.BOTTLEJOB_K})${mul}`);
  }
  return { points: pts, events, win, draw, isGiantKilling: gap > 0 && win };
}

export function computeScoring(rawMatches, sweep) {
  const { players = [], allocation = {}, ladder = [] } = sweep || {};
  const owners = ownerMap(allocation);
  const matches = (rawMatches || []).map((m) => ({ ...m, home: canon(m.home), away: canon(m.away) }));

  const team = {};
  for (const name of Object.keys(TEAMS)) {
    team[name] = { name, ...TEAMS[name], owner: owners[name] || null, pts: 0, events: [], goalsFor: 0, cleanSheets: 0, giantKills: 0, groupWins: 0, groupGames: 0, stages: new Set(["GROUP_STAGE"]), champion: false, bronze: false };
  }

  for (const m of matches) {
    const H = team[m.home], A = team[m.away];
    if (H) H.stages.add(m.stage);
    if (A) A.stages.add(m.stage);
    if (!isFinished(m)) continue;
    const hg = m.homeGoals, ag = m.awayGoals;
    for (const [self, other, gf, ga] of [[H, A, hg, ag], [A, H, ag, hg]]) {
      if (!self || !other) continue;
      const r = scoreSide(self.name, other.name, gf, ga, m.stage);
      self.pts += r.points;
      self.goalsFor += gf;
      if (ga === 0) self.cleanSheets += 1;
      if (r.isGiantKilling) self.giantKills += 1;
      for (const e of r.events) self.events.push({ ...e, stage: m.stage, vs: other.name, date: m.utcDate });
      if (m.stage === "GROUP_STAGE") { self.groupGames += 1; if (r.win) self.groupWins += 1; }
    }
    if (m.stage === "FINAL") { const w = hg > ag ? H : ag > hg ? A : null; if (w) w.champion = true; }
    if (m.stage === "THIRD_PLACE") { const w = hg > ag ? H : ag > hg ? A : null; if (w) w.bronze = true; }
  }

  for (const t of Object.values(team)) {
    const mult = rankMult(t.rank);
    for (const s of KO_STAGES) if (t.stages.has(s)) { const p = Math.round(CFG.STAGE_BASE[s] * mult); t.pts += p; t.events.push({ label: `Reached ${prettyStage(s)} (rank x${mult.toFixed(2)})`, p, stage: s }); }
    if (t.champion) { const p = Math.round(CFG.CHAMPION_BASE * mult); t.pts += p; t.events.push({ label: `WORLD CHAMPIONS (rank x${mult.toFixed(2)})`, p, stage: "FINAL" }); }
    if (t.bronze) { t.pts += CFG.BRONZE; t.events.push({ label: "Won 3rd-place playoff", p: CFG.BRONZE, stage: "THIRD_PLACE" }); }
    if (t.groupGames === 3 && t.groupWins === 3) { t.pts += CFG.PERFECT_GROUP; t.events.push({ label: "Perfect group (won all 3)", p: CFG.PERFECT_GROUP, stage: "GROUP_STAGE" }); }
    if (t.giantKills >= 3) { t.pts += CFG.GIANT_SLAYER; t.events.push({ label: `Giant-slayer streak (${t.giantKills} upsets)`, p: CFG.GIANT_SLAYER }); }
  }

  // "Of the tournament" superlatives can change hands as new games finish, which
  // would make a player's running total go DOWN mid-tournament. Award them only
  // once the tournament is over (the final has been played) so totals never drop.
  const tournamentOver = matches.some((m) => m.stage === "FINAL" && isFinished(m));
  if (tournamentOver) {
    awardMax(team, "goalsFor", CFG.GOAL_MACHINE, "Goal Machine (most goals)");
    awardMax(team, "cleanSheets", CFG.IRON_CURTAIN, "Iron Curtain (most clean sheets)");
  }
  const groupStrength = {};
  for (const t of Object.values(team)) groupStrength[t.group] = (groupStrength[t.group] || 0) + t.rank;
  const death = Object.entries(groupStrength).sort((a, b) => a[1] - b[1])[0]?.[0];
  for (const t of Object.values(team)) if (t.group === death && [...t.stages].some((s) => KO_STAGES.includes(s))) { t.pts += CFG.GROUP_OF_DEATH; t.events.push({ label: `Survived the Group of Death (Grp ${death})`, p: CFG.GROUP_OF_DEATH }); }

  let ranked = players.map((name) => {
    const teams = Object.values(team).filter((t) => t.owner === name).sort((a, b) => b.pts - a.pts);
    return { name, points: teams.reduce((s, t) => s + t.pts, 0), teams };
  }).sort((a, b) => b.points - a.points);

  ranked = applyLadder(ranked, ladder);
  const pot = ladder.reduce((s, v) => s + (v || 0), 0);
  ranked.forEach((p) => { p.share = pot > 0 ? (p.payout / pot) * 100 : 0; });

  return { players: ranked, teams: team, pot, groupOfDeath: death, finishedCount: matches.filter(isFinished).length };
}

function awardMax(team, key, pts, label) {
  const max = Math.max(...Object.values(team).map((t) => t[key]));
  if (max <= 0) return;
  for (const t of Object.values(team)) if (t[key] === max) { t.pts += pts; t.events.push({ label: `${label}: ${max}`, p: pts }); }
}

export function explainMatch(m, owners = {}) {
  const home = canon(m.home), away = canon(m.away);
  const finished = m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;
  if (!finished || !TEAMS[home] || !TEAMS[away]) return null;
  const H = scoreSide(home, away, m.homeGoals, m.awayGoals, m.stage);
  const A = scoreSide(away, home, m.awayGoals, m.homeGoals, m.stage);
  return {
    stage: m.stage, factor: CFG.UPSET_STAGE_FACTOR[m.stage] || 1,
    home: { name: home, rank: TEAMS[home].rank, owner: owners[home] || "—", events: H.events, total: H.points },
    away: { name: away, rank: TEAMS[away].rank, owner: owners[away] || "—", events: A.events, total: A.points },
  };
}

export function matchSummary(m, owners = {}) {
  const ex = explainMatch(m, owners);
  if (!ex) return null;
  const H = ex.home, A = ex.away, hg = m.homeGoals, ag = m.awayGoals;
  const draw = hg === ag;
  const winner = draw ? null : hg > ag ? H : A, loser = draw ? null : hg > ag ? A : H;
  const has = (s, kw) => s.events.some((e) => e.label.includes(kw));
  const gk = has(H, "Giant-killing") ? H : has(A, "Giant-killing") ? A : null;
  const bj = has(H, "Bottle-job") ? H : has(A, "Bottle-job") ? A : null;
  const grab = has(H, "Smash-and-grab") ? H : has(A, "Smash-and-grab") ? A : null;
  const fmul = ex.factor > 1 ? ` (upset bonuses ×${ex.factor} at this stage)` : "";
  const stageName = prettyStage(ex.stage);
  let emoji = "⚽", headline, flavour;
  if (gk) { const opp = gk === H ? A : H; emoji = "⚡"; headline = "Giant-killing!"; flavour = `${gk.owner}'s ${gk.name} (#${gk.rank}) ${draw ? "held" : "took down"} #${opp.rank} ${opp.name}${fmul}.`; }
  else if (bj) { const opp = bj === H ? A : H; emoji = "💸"; headline = "Bottle-job"; flavour = `Heavy favourite ${bj.name} (#${bj.rank}) lost to #${opp.rank} ${opp.name} — minus points for ${bj.owner}.`; }
  else if (grab && draw) { const opp = grab === H ? A : H; emoji = "🧱"; headline = "Plucky point"; flavour = `${grab.owner}'s ${grab.name} (#${grab.rank}) dug in against #${opp.rank} ${opp.name}.`; }
  else if (draw) { emoji = "🤝"; headline = "Honours even"; flavour = `${H.name} and ${A.name} couldn't be separated.`; }
  else { emoji = "✅"; headline = "Form holds"; flavour = `${winner.owner}'s ${winner.name} saw off ${loser.name}.`; }
  return { stage: ex.stage, factor: ex.factor, stageName, home: m.home, away: m.away, homeGoals: hg, awayGoals: ag, emoji, headline, flavour, homeOwner: H.owner, awayOwner: A.owner, homePts: H.total, awayPts: A.total, upset: !!gk || !!bj };
}

export function prettyStage(s) {
  return ({ GROUP_STAGE: "Group Stage", LAST_32: "Round of 32", LAST_16: "Round of 16", QUARTER_FINALS: "Quarter-final", SEMI_FINALS: "Semi-final", THIRD_PLACE: "3rd-place playoff", FINAL: "Final" }[s] || s);
}
