import { getSweep } from "../../../lib/store.js";
import { notFound } from "next/navigation";
import SweepView from "./SweepView";

export const revalidate = 60; // edge-cache the render; live scores refresh client-side

export async function generateMetadata({ params }) {
  const s = await getSweep(params.id);
  return { title: s ? `${s.name} — Sweepstake` : "Sweepstake not found" };
}

export default async function Page({ params }) {
  const sweep = await getSweep(params.id);
  if (!sweep) notFound();
  const { adminToken, creatorEmail, ...safe } = sweep; // never ship secrets to viewers
  return <SweepView sweep={safe} />;
}
