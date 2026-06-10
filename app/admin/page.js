import { listSweeps } from "../../lib/store.js";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }) {
  const ok = process.env.OWNER_TOKEN && searchParams?.t === process.env.OWNER_TOKEN;
  if (!ok) return <><h1>Owner admin</h1><p className="sub">Append <code>?t=YOUR_OWNER_TOKEN</code> to this URL to view usage.</p></>;

  const sweeps = await listSweeps();
  const totalPlayers = sweeps.reduce((s, x) => s + (x.players?.length || 0), 0);
  const totalPot = sweeps.reduce((s, x) => s + (x.pot || 0), 0);

  return (
    <>
      <h1>Usage</h1>
      <p className="sub">{sweeps.length} sweepstakes · {totalPlayers} players · £{totalPot} staked in total</p>
      <table className="rules">
        <tbody>
          <tr><th>Created</th><th>Name</th><th>Creator</th><th>Email</th><th>Players</th><th>Stake</th><th>Pot</th></tr>
          {sweeps.map((s) => (
            <tr key={s.id}>
              <td>{new Date(s.createdAt).toLocaleDateString("en-GB")}</td>
              <td><a href={`/s/${s.id}`}>{s.name}</a></td>
              <td>{s.creatorName}</td>
              <td>{s.creatorEmail}</td>
              <td>{s.players?.length}</td>
              <td>£{s.stake}</td>
              <td>£{s.pot}</td>
            </tr>
          ))}
          {sweeps.length === 0 && <tr><td colSpan={7} className="note">No sweepstakes created yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
