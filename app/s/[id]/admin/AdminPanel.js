"use client";
import { useState } from "react";

export default function AdminPanel({ id, token, name, players, stake, pot }) {
  const [nm, setNm] = useState(name);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const viewUrl = typeof window !== "undefined" ? `${location.origin}/s/${id}` : `/s/${id}`;

  async function call(body) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, token, ...body }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    return { ok: r.ok, d };
  }
  async function rename() { const { ok, d } = await call({ action: "rename", name: nm }); setMsg(ok ? "Saved." : d.error || "Error"); }
  async function del() { if (!confirm("Delete this sweepstake permanently? This can't be undone.")) return; const { ok } = await call({ action: "delete" }); if (ok) setDeleted(true); }

  if (deleted) return <><h1>Deleted</h1><p className="sub">This sweepstake has been removed.</p></>;

  return (
    <>
      <h1>Admin · <span className="u">{name}</span></h1>
      <p className="sub">{players.length} players · £{stake} each · £{pot} pot. The draw and rules are locked; you can rename or delete.</p>

      <div className="linkbox" style={{ marginTop: 12 }}>
        <input readOnly value={viewUrl} onFocus={(e) => e.target.select()} />
        <a className="btn" href={viewUrl}>Open</a>
      </div>

      <div className="field" style={{ maxWidth: 480 }}>
        <label>Rename</label>
        <input type="text" value={nm} maxLength={80} onChange={(e) => setNm(e.target.value)} />
      </div>
      <button className="btn" disabled={busy} onClick={rename}>Save name</button>
      {msg && <span className="note" style={{ marginLeft: 10 }}>{msg}</span>}

      <div style={{ marginTop: 28 }}>
        <button className="btn" style={{ background: "var(--red)" }} disabled={busy} onClick={del}>Delete sweepstake</button>
      </div>
    </>
  );
}
