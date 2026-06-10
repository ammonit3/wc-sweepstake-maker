import { getSweep, saveSweep, deleteSweep } from "../../../lib/store.js";

export const runtime = "nodejs";

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const { id, token, action, name } = b || {};
  const s = await getSweep(id);
  if (!s) return Response.json({ error: "Not found" }, { status: 404 });
  if (token !== s.adminToken) return Response.json({ error: "Not authorised" }, { status: 403 });

  if (action === "rename") {
    s.name = (name || "").trim().slice(0, 80) || s.name;
    await saveSweep(s);
    return Response.json({ ok: true, name: s.name });
  }
  if (action === "delete") {
    await deleteSweep(id);
    return Response.json({ ok: true, deleted: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
