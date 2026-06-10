"use client";
import { useEffect, useState } from "react";
import { computeScoring, explainMatch, matchSummary, canon, prettyStage, ownerMap, CFG } from "../../../lib/scoring";
import { TEAMS } from "../../../lib/teams";
import { Football, Vuvuzela, KitParade } from "../../Decor";

const gbp = (n) => "£" + Number(n).toFixed(2);
const finished = (m) => m.status === "FINISHED" && m.homeGoals != null;
const STAGE_ORDER = ["GROUP_STAGE", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function SweepView({ sweep }) {
  const owners = ownerMap(sweep.allocation);
  const [s, setS] = useState({ loading: true, matches: [], result: null, source: null, note: null });
  const [tab, setTab] = useState("table");

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        const data = await res.json();
        if (!live) return;
        const matches = data.matches || [];
        setS({ loading: false, matches, result: computeScoring(matches, sweep), source: data.source, note: data.note });
      } catch { if (live) setS((p) => ({ ...p, loading: false, note: "Could not load match data." })); }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { live = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS = [["table", "Leaderboard"], ["players", "Players"], ["fixtures", "Fixtures"], ["rules", "Rules"]];

  return (
    <>
      <div className="sweep-title">
        <Football size={30} />
        <h1 style={{ margin: "16px 0 4px" }}>{sweep.name}</h1>
      </div>
      <p className="sub">{sweep.players.length} players · £{sweep.stake} each · £{sweep.pot} pot</p>

      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? "sel" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {s.loading ? <p className="sub" style={{ marginTop: 20 }}>Loading…</p> : (
        <>
          {tab === "table" && <TableTab s={s} owners={owners} sweep={sweep} />}
          {tab === "players" && <PlayersTab s={s} />}
          {tab === "fixtures" && <FixturesTab s={s} owners={owners} />}
          {tab === "rules" && <RulesTab sweep={sweep} />}
        </>
      )}

      <div className="foot">
        <div className="foot-decor"><Football size={26} /><KitParade /><Football size={26} /></div>
        <div>It&apos;s Mathematically Possible! · refreshes every 60s</div>
      </div>
    </>
  );
}

/* ---------- Leaderboard + latest results ---------- */
function TableTab({ s, owners, sweep }) {
  const { result, matches, source } = s;
  if (!result) return <p className="sub">{s.note || "No data."}</p>;
  const live = source && source !== "seed";
  const ko = matches.filter((m) => m.stage !== "GROUP_STAGE");
  const inKO = new Set(); ko.forEach((m) => { inKO.add(canon(m.home)); inKO.add(canon(m.away)); });
  const lostKO = new Set();
  ko.filter(finished).forEach((m) => { if (m.homeGoals !== m.awayGoals) lostKO.add(canon(m.homeGoals > m.awayGoals ? m.away : m.home)); });
  const anyKO = ko.length > 0;
  const status = (n) => !anyKO ? "" : (lostKO.has(n) || !inKO.has(n)) ? "out" : "alive";
  const latest = matches.filter(finished).sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate)).slice(0, 8).map((m) => matchSummary(m, owners)).filter(Boolean);

  return (
    <>
      <p className="sub">
        {live ? <span className="tag live">● Live · {source}</span> : <span className="tag">Fixtures only — live scores start at kickoff</span>}{" "}
        <span className="tag">{result.finishedCount} games scored</span>{" "}
        <span className="tag">Group of Death: {result.groupOfDeath}</span>
      </p>

      {result.players.map((p, i) => (
        <div key={p.name} className={`lb-row ${i === 0 && result.finishedCount ? "top" : ""}`}>
          <div className="pos">{i + 1}</div>
          <div>
            <div className="lb-name">{p.name} {i === 0 && result.finishedCount ? "👑" : ""}</div>
            <div className="lb-teams">{p.teams.map((t) => <span key={t.name} className={`chip ${status(t.name)}`} title={`#${t.rank} · ${t.pts} pts`}>{t.name}</span>)}</div>
          </div>
          <div className="lb-pts">{p.points}<small>PTS</small></div>
          <div className="lb-pay"><div className="gbp">{gbp(p.payout)}</div><div className="pct">{p.share.toFixed(0)}%</div></div>
        </div>
      ))}
      {anyKO && <p className="note" style={{ marginTop: 8 }}><span className="chip alive" style={{ padding: "0 6px" }}>green</span> = still in · <span className="chip out" style={{ padding: "0 6px" }}>grey</span> = out</p>}
      <p className="note" style={{ marginTop: 8 }}>£ figures are a <strong>suggested split</strong> — collecting and settling up is between players.</p>

      <h2>Latest Results</h2>
      {latest.length === 0 && <p className="note">No games played yet — everyone&apos;s tied on an even split until kickoff (11 June).</p>}
      {latest.map((m, i) => (
        <div key={i} className={`result ${m.upset ? "up" : ""}`}>
          <div className="emoji">{m.emoji}</div>
          <div>
            <div className="rscore">{m.home} {m.homeGoals}–{m.awayGoals} {m.away} <span className="pill">{m.stageName}</span></div>
            <div className="rhead">{m.headline}</div>
            <div className="rflav">{m.flavour}</div>
            <div className="rpts">Match points → {m.homeOwner} {m.homePts >= 0 ? "+" : ""}{m.homePts} · {m.awayOwner} {m.awayPts >= 0 ? "+" : ""}{m.awayPts}</div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Players ---------- */
function PlayersTab({ s }) {
  const { result } = s;
  if (!result) return null;
  return (
    <>
      <p className="sub">Tap a team to see where its points came from.</p>
      {result.players.map((p) => (
        <div key={p.name} style={{ marginTop: 22 }}>
          <div className="lb-row" style={{ gridTemplateColumns: "1fr auto", marginBottom: 10 }}>
            <span className="lb-name">{p.name}</span>
            <span className="tag acc" style={{ fontSize: 13 }}>{p.points} pts · {gbp(p.payout)}</span>
          </div>
          {p.teams.map((t) => (
            <details key={t.name}>
              <summary><span>{t.name} <span className="pill">#{t.rank} · Grp {t.group}</span></span><span className="tp">{t.pts} pts</span></summary>
              <div style={{ paddingBottom: 10 }}>
                {t.events.length === 0 && <div className="note" style={{ padding: "8px 0" }}>No points yet.</div>}
                {t.events.map((e, i) => (
                  <div className="evt" key={i}>
                    <span>{e.label}{e.vs ? <span className="muted"> · vs {e.vs}</span> : null}</span>
                    <span className={`p ${e.p >= 0 ? "pos" : "neg"}`}>{e.p >= 0 ? "+" : ""}{e.p}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ))}
    </>
  );
}

/* ---------- Fixtures (with hover tooltip + summary) ---------- */
function SideBreakdown({ side }) {
  return (
    <div className="tip-side">
      <div className="tip-team"><span>{side.name} <span className="muted">#{side.rank} · {side.owner}</span></span><span className={side.total >= 0 ? "pos" : "neg"}>{side.total >= 0 ? "+" : ""}{side.total} pts</span></div>
      {side.events.map((e, i) => (
        <div className="tip-row" key={i}><span className="tip-lbl">{e.label}</span><span className="tip-calc">{e.formula}</span><span className={e.p >= 0 ? "pos" : "neg"}>{e.p >= 0 ? "+" : ""}{e.p}</span></div>
      ))}
    </div>
  );
}
function Score({ m, owners }) {
  const done = m.status === "FINISHED" && m.homeGoals != null;
  const live = m.status === "IN_PLAY";
  const ex = done ? explainMatch(m, owners) : null;
  const sum = done ? matchSummary(m, owners) : null;
  return (
    <div className={`scorewrap ${done || live ? "" : "sched"}`} tabIndex={ex ? 0 : -1}>
      <div className={`score ${done || live ? "" : "sched"}`}>
        {done || live ? `${m.homeGoals ?? 0}–${m.awayGoals ?? 0}` : fmt(m.utcDate)}
        {live && <div className="upset">● LIVE</div>}
      </div>
      {ex && (
        <div className="tip" role="tooltip">
          {sum && <div className="tip-summary"><span className="em">{sum.emoji}</span><span><span className="sh">{sum.headline}</span><span className="fl"> {sum.flavour}</span></span></div>}
          <div className="tip-h">How the points broke down · {prettyStage(ex.stage)}{ex.factor > 1 ? ` · upset bonuses ×${ex.factor}` : ""}</div>
          <SideBreakdown side={ex.home} /><SideBreakdown side={ex.away} />
          <div className="tip-foot">Plus per-team “going deep” &amp; trophy points — see Players.</div>
        </div>
      )}
    </div>
  );
}
function FixturesTab({ s, owners }) {
  const byStage = {};
  for (const m of s.matches) (byStage[m.stage] = byStage[m.stage] || []).push(m);
  const stages = STAGE_ORDER.filter((x) => byStage[x]);
  return (
    <>
      <p className="sub">Owner tags show who profits. ⚡ marks a shock. <strong>Hover (or tap) a score</strong> for the full points breakdown.</p>
      {stages.map((st) => (
        <div key={st}>
          <h2>{prettyStage(st)}</h2>
          {byStage[st].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)).map((m) => {
            const done = m.status === "FINISHED" && m.homeGoals != null;
            const hr = TEAMS[canon(m.home)]?.rank, ar = TEAMS[canon(m.away)]?.rank;
            let upset = false;
            if (done && hr && ar) {
              if (m.homeGoals > m.awayGoals && hr > ar) upset = true;
              if (m.awayGoals > m.homeGoals && ar > hr) upset = true;
              if (m.homeGoals === m.awayGoals && Math.abs(hr - ar) >= 20) upset = true;
            }
            return (
              <div className="fx" key={m.id}>
                <div className="h"><div>{m.home} {hr ? <span className="pill">#{hr}</span> : null}</div>{owners[canon(m.home)] && <div className="own">{owners[canon(m.home)]}</div>}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><Score m={m} owners={owners} />{upset && <div className="upset">⚡ UPSET</div>}</div>
                <div className="a"><div>{m.away} {ar ? <span className="pill">#{ar}</span> : null}</div>{owners[canon(m.away)] && <div className="own">{owners[canon(m.away)]}</div>}</div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

/* ---------- Rules (full rulebook; money section uses this sweepstake's ladder) ---------- */
function RulesTab({ sweep }) {
  const k = CFG, F = k.UPSET_STAGE_FACTOR, r = Math.round;
  const gapA = 76;
  const A = { win: k.RESULT.win, gk: r(gapA * k.GIANT_KILLING_K), grab: r(gapA * k.UPSET_GOAL_K) * 1, cs: r(gapA * k.CLEAN_SHEET_K) };
  A.total = A.win + A.gk + A.grab + A.cs;
  const gapB = 16, fB = F.QUARTER_FINALS;
  const groupVer = k.RESULT.win + r(gapB * k.GIANT_KILLING_K) + r(gapB * k.UPSET_GOAL_K) + r(gapB * k.CLEAN_SHEET_K);
  const koVer = k.RESULT.win + r(gapB * k.GIANT_KILLING_K) * fB + r(gapB * k.UPSET_GOAL_K) * fB + r(gapB * k.CLEAN_SHEET_K) * fB;
  const mult20 = 1 + 20 / 10;
  const deep20 = r(k.STAGE_BASE.LAST_32 * mult20) + r(k.STAGE_BASE.LAST_16 * mult20) + r(k.STAGE_BASE.QUARTER_FINALS * mult20);
  const deep1 = r((k.STAGE_BASE.LAST_32 + k.STAGE_BASE.LAST_16 + k.STAGE_BASE.QUARTER_FINALS) * 1.1);
  const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const stake = sweep.stake;
  return (
    <>
      <p className="sub">Everything is worked out automatically from each game&apos;s final score plus the two teams&apos; <strong>FIFA world rankings</strong>. You never tot anything up yourself.</p>

      <div className="callout">
        <b>The one idea behind everything →</b> the <b>gap</b>. For any match, <code>gap = your team&apos;s world rank − the opponent&apos;s rank</code>. If your team is ranked #60 and plays #6, your gap is <b>+54</b> — a big underdog. The bigger the underdog, the bigger the reward for doing well. Favourites get a small, flat return; underdogs get the fireworks.
      </div>

      <h2>1 · Match points</h2>
      <p className="note">Awarded for the result of every single game, group or knockout.</p>
      <table className="rules"><tbody>
        <tr><th>Result</th><th>Points</th></tr>
        <tr><td>Win</td><td className="n">+{k.RESULT.win}</td></tr>
        <tr><td>Draw</td><td className="n">+{k.RESULT.draw}</td></tr>
        <tr><td>Loss</td><td className="n">0</td></tr>
      </tbody></table>

      <h2>2 · Underdog bonuses</h2>
      <p className="note">The good stuff. These only trigger when <strong>your team is the underdog</strong> (positive gap).</p>
      <table className="rules"><tbody>
        <tr><th>Bonus</th><th>What earns it</th><th>Points</th></tr>
        <tr><td><strong>Giant-killing</strong></td><td>your lower-ranked team <em>wins</em></td><td className="n">round(gap × {k.GIANT_KILLING_K})</td></tr>
        <tr><td><strong>Backs-to-the-wall</strong></td><td>underdog grabs a <em>draw</em></td><td className="n">round(gap × {k.PLUCKY_DRAW_K})</td></tr>
        <tr><td><strong>Smash-and-grab</strong></td><td><em>each goal</em> an underdog scores</td><td className="n">round(gap × {k.UPSET_GOAL_K}) ×&nbsp;goals</td></tr>
        <tr><td><strong>Park-the-bus</strong></td><td>underdog keeps a <em>clean sheet</em></td><td className="n">round(gap × {k.CLEAN_SHEET_K})</td></tr>
        <tr><td><strong>Bottle-job</strong> 💸</td><td>a big favourite (gap ≤ −{k.BOTTLEJOB_GAP}) <em>loses</em></td><td className="n">−round(|gap| × {k.BOTTLEJOB_K})</td></tr>
      </tbody></table>

      <div className="callout">
        <b>⚡ THE KNOCKOUT MULTIPLIER — the big one.</b> A shock in the final matters far more than one in a dead group game, so <b>every underdog bonus and the bottle-job penalty in Section 2 is multiplied at each knockout round:</b>
        <table className="rules" style={{ marginTop: 10 }}><tbody>
          <tr><th>Stage</th><th>Group</th><th>R32</th><th>R16</th><th>QF</th><th>SF</th><th>Final</th></tr>
          <tr><td className="n">multiplier</td><td>×{F.GROUP_STAGE}</td><td>×{F.LAST_32}</td><td>×{F.LAST_16}</td><td>×{F.QUARTER_FINALS}</td><td>×{F.SEMI_FINALS}</td><td>×{F.FINAL}</td></tr>
        </tbody></table>
        It <b>doubles every round</b> — a giant-killing in the final is worth <b>{F.FINAL}×</b> the same one in the group stage. (Match points in Section 1 and the &quot;going deep&quot; points below are <i>not</i> multiplied.)
      </div>

      <div className="example">
        <div className="eh">Worked example A — a group-stage shock</div>
        Minnow <code>#85</code> beats giant <code>#9</code> <b>1–0</b> in the group stage. Gap = <code>{gapA}</code>, multiplier ×1:
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Win: <b>+{A.win}</b></li>
          <li>Giant-killing: round({gapA} × {k.GIANT_KILLING_K}) = <b>+{A.gk}</b></li>
          <li>Smash-and-grab: round({gapA} × {k.UPSET_GOAL_K}) × 1 goal = <b>+{A.grab}</b></li>
          <li>Park-the-bus clean sheet: round({gapA} × {k.CLEAN_SHEET_K}) = <b>+{A.cs}</b></li>
        </ul>
        <div style={{ marginTop: 6 }}>Total to the owner: <b>+{A.total} points.</b></div>
      </div>

      <div className="example">
        <div className="eh">Worked example B — the same kind of shock, but in the quarter-final</div>
        A <code>#20</code> side beats a <code>#4</code> side <b>1–0</b> in the QF. Gap = <code>{gapB}</code>. In the <b>group stage</b> that would be worth <b>+{groupVer}</b>. But the QF multiplier is <b>×{fB}</b>, so the underdog bonuses balloon:
        <div style={{ marginTop: 6 }}>Win +{k.RESULT.win} &nbsp;+&nbsp; giant-killing {r(gapB * k.GIANT_KILLING_K)}×{fB} &nbsp;+&nbsp; smash-and-grab {r(gapB * k.UPSET_GOAL_K)}×{fB} &nbsp;+&nbsp; clean sheet {r(gapB * k.CLEAN_SHEET_K)}×{fB} = <b>+{koVer} points.</b></div>
        <div style={{ marginTop: 6 }}>Same result, <b>{Math.round(koVer / groupVer)}× the reward</b> for doing it on the big stage.</div>
      </div>

      <h2>3 · Going deep</h2>
      <p className="note">Reward for survival, tilted towards weaker teams. Two parts.</p>
      <p className="note"><strong>Part 1 — base points for each round reached</strong> (they <em>accrue</em>; you keep the points from every round your team passes through):</p>
      <table className="rules"><tbody>
        <tr><th>Round reached</th><th>Base</th></tr>
        <tr><td>Round of 32</td><td className="n">{k.STAGE_BASE.LAST_32}</td></tr>
        <tr><td>Round of 16</td><td className="n">{k.STAGE_BASE.LAST_16}</td></tr>
        <tr><td>Quarter-final</td><td className="n">{k.STAGE_BASE.QUARTER_FINALS}</td></tr>
        <tr><td>Semi-final</td><td className="n">{k.STAGE_BASE.SEMI_FINALS}</td></tr>
        <tr><td>Final</td><td className="n">{k.STAGE_BASE.FINAL}</td></tr>
        <tr><td><strong>Win the World Cup</strong> (on top of the final)</td><td className="n">+{k.CHAMPION_BASE}</td></tr>
        <tr><td>Win the 3rd-place playoff</td><td className="n">+{k.BRONZE}</td></tr>
      </tbody></table>
      <p className="note"><strong>Part 2 — a ranking multiplier</strong> = <code>1 + (world rank ÷ 10)</code>. The weaker the team, the bigger it is: #1 → ×1.1, #10 → ×2, #20 → ×3, #40 → ×5. Each base above is multiplied by it.</p>
      <div className="example">
        <div className="eh">Worked example C — going deep rewards the underdog</div>
        A <code>#20</code> team (multiplier ×{mult20}) reaching the quarter-final banks: R32 {k.STAGE_BASE.LAST_32}×{mult20}={r(k.STAGE_BASE.LAST_32 * mult20)} + R16 {k.STAGE_BASE.LAST_16}×{mult20}={r(k.STAGE_BASE.LAST_16 * mult20)} + QF {k.STAGE_BASE.QUARTER_FINALS}×{mult20}={r(k.STAGE_BASE.QUARTER_FINALS * mult20)} = <b>{deep20} points</b>. The world <code>#1</code> doing exactly the same banks about <b>{deep1}</b>. Same run, far bigger reward for the long-shot.
      </div>

      <h2>4 · Trophies (one-offs)</h2>
      <table className="rules"><tbody>
        <tr><th>Trophy</th><th>Points</th></tr>
        <tr><td><strong>Goal Machine</strong> — your team scores the most goals of the tournament</td><td className="n">+{k.GOAL_MACHINE}</td></tr>
        <tr><td><strong>Iron Curtain</strong> — most clean sheets</td><td className="n">+{k.IRON_CURTAIN}</td></tr>
        <tr><td><strong>Giant-slayer streak</strong> — a team racks up 3+ giant-killings</td><td className="n">+{k.GIANT_SLAYER}</td></tr>
        <tr><td><strong>Perfect Group</strong> — won all 3 group games</td><td className="n">+{k.PERFECT_GROUP}</td></tr>
        <tr><td><strong>Group of Death</strong> — advanced from the single strongest group</td><td className="n">+{k.GROUP_OF_DEATH}</td></tr>
      </tbody></table>
      <p className="note">Ties on a trophy: everyone tied collects it.</p>

      <h2>5 · The money</h2>
      <p className="note">£{stake} each = a <strong>£{sweep.pot} pot</strong>, paid by <strong>final finishing position</strong>:</p>
      <table className="rules"><tbody>
        <tr><th>Position</th><th>Payout</th><th>Net (−£{stake} stake)</th></tr>
        {sweep.ladder.map((v, i) => {
          const net = v - stake;
          return <tr key={i}><td>{ord(i + 1)}</td><td className="n">£{v}</td><td>{net > 0 ? `+£${net}` : net < 0 ? `−£${-net}` : "break even"}</td></tr>;
        })}
      </tbody></table>
      <p className="note">Top-heavy: the upper places profit, the lower places pay in. <strong>Ties</strong> pool the money for the positions they cover and split it evenly. These payouts are a <strong>suggested split only</strong> — collecting stakes and settling up is entirely between you and your players.</p>
    </>
  );
}
