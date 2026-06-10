"use client";
import { useEffect, useRef, useState } from "react";
import { PLAYER_COUNTS, STAKE_DEFAULTS, STAKE_MIN, STAKE_MAX, teamsPer } from "../../lib/teams";
import { buildLadder } from "../../lib/ladder";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function NewSweep() {
  const [name, setName] = useState("");
  const [count, setCount] = useState(6);
  const [names, setNames] = useState(Array(6).fill(""));
  const [stake, setStake] = useState(STAKE_DEFAULTS[6]);
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [tsToken, setTsToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const tsRendered = useRef(false);

  // resize the names array when the player count changes; reset stake default
  useEffect(() => {
    setNames((prev) => Array.from({ length: count }, (_, i) => prev[i] || ""));
    setStake(STAKE_DEFAULTS[count]);
  }, [count]);

  // load + render Turnstile (skipped entirely if no site key configured)
  useEffect(() => {
    if (!SITE_KEY) return;
    const render = () => {
      if (tsRendered.current || !window.turnstile) return;
      tsRendered.current = true;
      window.turnstile.render("#ts-widget", { sitekey: SITE_KEY, callback: setTsToken });
    };
    if (window.turnstile) return render();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true; s.defer = true; s.onload = render;
    document.head.appendChild(s);
  }, []);

  const pot = stake * count;
  const ladder = buildLadder(count, pot);
  const potOk = pot >= 100 && pot <= 150;

  async function submit(e) {
    e.preventDefault();
    setError("");
    const players = names.map((n) => n.trim()).filter(Boolean);
    if (players.length !== count) return setError(`Please name all ${count} players.`);
    if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) return setError("Player names must be unique.");
    if (!creatorName.trim() || !creatorEmail.trim()) return setError("Add your name and email so we can send your admin link.");
    setBusy(true);
    try {
      const res = await fetch("/api/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, players, stake, creatorName, creatorEmail, turnstileToken: tsToken, website: hp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); window.turnstile?.reset?.(); setTsToken(""); }
      else setResult(data);
    } catch { setError("Network error — please try again."); }
    setBusy(false);
  }

  if (result) {
    return (
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <h1>You&apos;re <span className="u">in!</span></h1>
        <div className="success">
          <p style={{ marginTop: 0 }}><strong>{name}</strong> is live and the draw is done. {result.emailed ? "We've emailed your links too." : ""}</p>
          <label style={{ fontWeight: 800, fontSize: 12 }}>SHARE THIS WITH YOUR PLAYERS (view-only)</label>
          <div className="linkbox"><input readOnly value={result.viewUrl} onFocus={(e) => e.target.select()} /><CopyButton text={result.viewUrl} /><a className="btn" href={result.viewUrl}>Open</a></div>
          <label style={{ fontWeight: 800, fontSize: 12 }}>⚠️ KEEP THIS PRIVATE — YOUR ADMIN LINK</label>
          <div className="linkbox"><input readOnly value={result.adminUrl} onFocus={(e) => e.target.select()} /><CopyButton text={result.adminUrl} /></div>
          <p className="note"><strong>Copy your admin link now</strong> — it&apos;s only shown here. Bookmark it to rename or delete later. Scores update automatically once the tournament starts.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>Create a <span className="u">Sweepstake</span></h1>

      <div className="field">
        <label>Sweepstake name</label>
        <input type="text" value={name} maxLength={80} placeholder="e.g. The Office World Cup 2026" onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="field">
        <label>How many players?</label>
        <div className="count-grid">
          {PLAYER_COUNTS.map((c) => (
            <button type="button" key={c} className={`count-btn ${c === count ? "sel" : ""}`} onClick={() => setCount(c)}>
              {c}<small>{teamsPer(c)} each</small>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Player names</label>
        <div className="names-grid">
          {names.map((v, i) => (
            <input key={i} type="text" value={v} maxLength={40} placeholder={`Player ${i + 1}`}
              onChange={(e) => setNames((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
        </div>
      </div>

      <div className="field">
        <label>Stake per player (£{STAKE_MIN}–£{STAKE_MAX})</label>
        <input type="number" min={STAKE_MIN} max={STAKE_MAX} value={stake}
          onChange={(e) => setStake(Math.max(STAKE_MIN, Math.min(STAKE_MAX, Math.round(Number(e.target.value) || 0))))} />
      </div>

      <div className="preview">
        <div className="pot-line">Pot: £{pot} <span className="note" style={{ fontSize: 12 }}>({count} × £{stake})</span></div>
        {!potOk && <div className="note">Tip: a pot of £100–£150 plays best — reachable from 6 players up given the £20 cap.</div>}
        <div className="note" style={{ marginTop: 6 }}>Payout by finishing position:</div>
        <div className="ladder-chips">
          {ladder.map((v, i) => <span className="lc" key={i}>{ordinal(i + 1)}: £{v}</span>)}
        </div>
      </div>

      <div className="field">
        <label>Your name</label>
        <input type="text" value={creatorName} maxLength={80} onChange={(e) => setCreatorName(e.target.value)} required />
      </div>
      <div className="field">
        <label>Your email</label>
        <input type="email" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} required />
        <div className="note" style={{ marginTop: 5 }}>Used to register your sweepstake. Your links are shown on the next screen — copy them then.</div>
      </div>

      {/* honeypot — hidden from humans */}
      <input className="hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" placeholder="Leave this empty" />

      {SITE_KEY && <div id="ts-widget" style={{ margin: "14px 0" }} />}
      {error && <div className="err">{error}</div>}

      <button type="submit" className="btn" disabled={busy}>{busy ? "Running the draw…" : "Run the draw →"}</button>
    </form>
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn alt" style={{ fontSize: 13, padding: "9px 14px" }}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>
      {done ? "Copied!" : "Copy"}
    </button>
  );
}
