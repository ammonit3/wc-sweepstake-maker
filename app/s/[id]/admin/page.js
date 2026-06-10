import { getSweep } from "../../../../lib/store.js";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }) {
  const s = await getSweep(params.id);
  if (!s) return <><h1>Not found</h1><p className="sub">No sweepstake with that link.</p></>;
  const authed = searchParams?.t && searchParams.t === s.adminToken;
  if (!authed) return <><h1>Admin</h1><p className="sub">This link isn&apos;t valid. Use the private admin link we emailed you when you created the sweepstake.</p></>;
  return <AdminPanel id={s.id} token={s.adminToken} name={s.name} players={s.players} stake={s.stake} pot={s.pot} />;
}
