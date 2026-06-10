import Link from "next/link";
import { Football, Vuvuzela, KitParade } from "./Decor";

const SITE = "https://alex-fleetwood.com"; // personal site

export default function Home() {
  return (
    <>
      <div className="hero">
        <h1>Build Your Own <span className="u">World Cup</span> Sweepstake</h1>
        <p className="lead">Two mates or forty-eight. We draw the teams, track every game live, and run an
          absurdly over-engineered scoring system that pays out for when the underdog triumphs.</p>
        <p className="lead" style={{ fontSize: 13.5, marginTop: -2 }}>A free thing made by{" "}
          <a href={SITE} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)", textDecoration: "underline" }}>Alex Fleetwood</a>{" "}
          with Claude Fable 5.</p>
        <Link href="/new" className="btn">Create a sweepstake →</Link>
      </div>

      <div className="steps">
        <div className="step"><div className="n">1</div><h3>Add your players</h3><p>2, 3, 4, 6, 8, 12, 16, 24 or 48 of you. The 48 World Cup teams split evenly between everyone.</p></div>
        <div className="step"><div className="n">2</div><h3>Set the stake & draw</h3><p>Pick a buy-in (£1–£20). One click runs a fair tiered draw so everyone gets a mix of giants and minnows.</p></div>
        <div className="step"><div className="n">3</div><h3>Share the link</h3><p>Send the link to the group. Scores, bonuses and the live payout update themselves through the tournament.</p></div>
      </div>

      <div className="card">
        <h2>Why it&apos;s fun</h2>
        <p className="note" style={{ marginTop: 8, fontSize: 14 }}>
          It&apos;s not just &quot;my team won&quot;. Lowly-ranked sides earn big <strong>giant-killing</strong> and
          <strong> smash-and-grab</strong> bonuses for upsetting the favourites — and those bonuses
          <strong> double every knockout round</strong>, so a shock in the final is worth 32× one in the group stage.
          Teams also bank ranking-weighted points for going deep, so a minnow on a cup run can carry you.
          The £-pot is split by final position. Everyone has a reason to watch every game.
        </p>
        <div style={{ marginTop: 14 }}><Link href="/new" className="btn alt">Get started →</Link></div>
      </div>

      <div className="foot">
        <div className="foot-decor"><Vuvuzela size={44} /><KitParade /><Football size={28} /></div>
        <div className="cred">Built by <a href={SITE} target="_blank" rel="noopener noreferrer">Alex Fleetwood</a></div>
        <div className="legal">
          <div>© {new Date().getFullYear()} Alex Fleetwood · World Cup 2026 · free to create &amp; play</div>
          <p>For entertainment only. Not affiliated with, endorsed by, or connected to FIFA or any football
            governing body. This site does not collect, hold, or distribute money — stakes and any payouts are
            arranged privately between players, who are solely responsible for ensuring their sweepstake complies
            with the laws where they live (including gambling regulations and age restrictions). Payout amounts
            shown are <strong>recommendations only</strong> — collecting stakes and settling up is entirely
            between you and your players. Team data and scores are provided “as is” with no guarantee of accuracy.</p>
          <p>We&apos;ll only ever use your email to let you know about new builds — never shared, no spam.</p>
        </div>
      </div>
    </>
  );
}
