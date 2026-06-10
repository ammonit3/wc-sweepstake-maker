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
          {tab === "rules" && <RulesTab />}
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

/* ---------- Rules (static, from the shared config) ---------- */
function RulesTab() {
  const k = CFG, F = k.UPSET_STAGE_FACTOR, r = Math.round;
  const gapA = 76;
  const A = { win: k.RESULT.win, gk: r(gapA * k.GIANT_KILLING_K), grab: r(gapA * k.UPSET_GOAL_K), cs: r(gapA * k.CLEAN_SHEET_K) };
  A.total = A.win + A.gk + A.grab + A.cs;
  const gapB = 16, fB = F.QUARTER_FINALS;
  const groupVer = k.RESULT.win + r(gapB * k.GIANT_KILLING_K) + r(gapB * k.UPSET_GOAL_K) + r(gapB * k.CLEAN_SHEET_K);
  const koVer = k.RESULT.win + r(gapB * k.GIANT_KILLING_K) * fB + r(gapB * k.UPSET_GOAL_K) * fB + r(gapB * k.CLEAN_SHEET_K) * fB;
  const mult20 = 1 + 20 / 10;
  const deep20 = r(k.STAGE_BASE.LAST_32 * mult20) + r(k.STAGE_BASE.LAST_16 * mult20) + r(k.STAGE_BASE.QUARTER_FINALS * mult20);
  return (
    <>
      <div className="callout"><b>The one idea →</b> the <b>gap</b> = your team&apos;s FIFA world rank minus the opponent&apos;s. Underdogs (big positive gap) earn the fireworks; favourites get a small flat return.</div>

      <h2>1 · Match points</h2>
      <table className="rules"><tbody><tr><th>Result</th><th>Points</th></tr>
        <tr><td>Win</td><td className="n">+{k.RESULT.win}</td></tr><tr><td>Draw</td><td className="n">+{k.RESULT.draw}</td></tr><tr><td>Loss</td><td className="n">0</td></tr></tbody></table>

      <h2>2 · Underdog bonuses</h2>
      <table className="rules"><tbody><tr><th>Bonus</th><th>Earned by</th><th>Points</th></tr>
        <tr><td><b>Giant-killing</b></td><td>underdog wins</td><td className="n">round(gap × {k.GIANT_KILLING_K})</td></tr>
        <tr><td><b>Backs-to-the-wall</b></td><td>underdog draws</td><td className="n">round(gap × {k.PLUCKY_DRAW_K})</td></tr>
        <tr><td><b>Smash-and-grab</b></td><td>each underdog goal</td><td className="n">round(gap × {k.UPSET_GOAL_K}) × goals</td></tr>
        <tr><td><b>Park-the-bus</b></td><td>underdog clean sheet</td><td className="n">round(gap × {k.CLEAN_SHEET_K})</td></tr>
        <tr><td><b>Bottle-job</b> 💸</td><td>big favourite (gap ≤ −{k.BOTTLEJOB_GAP}) loses</td><td className="n">−round(|gap| × {k.BOTTLEJOB_K})</td></tr></tbody></table>

      <div className="callout"><b>⚡ KNOCKOUT MULTIPLIER.</b> Every Section-2 bonus (and the bottle-job) <b>doubles each knockout round:</b>
        <table className="rules" style={{ marginTop: 10 }}><tbody>
          <tr><th>Stage</th><th>Group</th><th>R32</th><th>R16</th><th>QF</th><th>SF</th><th>Final</th></tr>
          <tr><td className="n">×</td><td>{F.GROUP_STAGE}</td><td>{F.LAST_32}</td><td>{F.LAST_16}</td><td>{F.QUARTER_FINALS}</td><td>{F.SEMI_FINALS}</td><td>{F.FINAL}</td></tr>
        </tbody></table>
        A shock in the final is worth <b>{F.FINAL}×</b> one in the group stage.</div>

      <div className="example"><div className="eh">Example A — group shock</div>#85 beats #9 1–0 (gap {gapA}): win +{A.win} · giant-killing +{A.gk} · smash-and-grab +{A.grab} · clean sheet +{A.cs} = <b>+{A.total}</b>.</div>
      <div className="example"><div className="eh">Example B — the same shock in the QF (×{fB})</div>A #20 beats a #4 1–0. In the group that&apos;s +{groupVer}; in the quarter-final the bonuses balloon to <b>+{koVer}</b> — about {Math.round(koVer / groupVer)}× the reward.</div>

      <h2>3 · Going deep</h2>
      <p className="note">Base points per round reached (they accrue), then × a ranking multiplier = 1 + rank/10 (weaker = bigger).</p>
      <table className="rules"><tbody><tr><th>Round</th><th>Base</th></tr>
        <tr><td>Round of 32</td><td className="n">{k.STAGE_BASE.LAST_32}</td></tr><tr><td>Round of 16</td><td className="n">{k.STAGE_BASE.LAST_16}</td></tr>
        <tr><td>Quarter-final</td><td className="n">{k.STAGE_BASE.QUARTER_FINALS}</td></tr><tr><td>Semi-final</td><td className="n">{k.STAGE_BASE.SEMI_FINALS}</td></tr>
        <tr><td>Final</td><td className="n">{k.STAGE_BASE.FINAL}</td></tr><tr><td><b>Win it all</b> (+ on top)</td><td className="n">+{k.CHAMPION_BASE}</td></tr><tr><td>3rd-place win</td><td className="n">+{k.BRONZE}</td></tr></tbody></table>
      <div className="example"><div className="eh">Example C</div>A #20 (×{mult20}) reaching the QF banks {k.STAGE_BASE.LAST_32}×{mult20} + {k.STAGE_BASE.LAST_16}×{mult20} + {k.STAGE_BASE.QUARTER_FINALS}×{mult20} = <b>{deep20}</b>. The world #1 doing the same banks ~{r((k.STAGE_BASE.LAST_32 + k.STAGE_BASE.LAST_16 + k.STAGE_BASE.QUARTER_FINALS) * 1.1)}.</div>

      <h2>4 · Trophies</h2>
      <table className="rules"><tbody>
        <tr><td>Goal Machine (most goals)</td><td className="n">+{k.GOAL_MACHINE}</td></tr>
        <tr><td>Iron Curtain (most clean sheets)</td><td className="n">+{k.IRON_CURTAIN}</td></tr>
        <tr><td>Giant-slayer streak (3+ upsets)</td><td className="n">+{k.GIANT_SLAYER}</td></tr>
        <tr><td>Perfect group (won all 3)</td><td className="n">+{k.PERFECT_GROUP}</td></tr>
        <tr><td>Group of Death survivor</td><td className="n">+{k.GROUP_OF_DEATH}</td></tr></tbody></table>

      <h2>5 · The money</h2>
      <p className="note">The pot is split by <b>final finishing position</b> (top-heavy, set when the sweepstake was created). Ties pool the prize money for the places they cover and split it evenly.</p>
    </>
  );
}
