// Server-side proxy to football-data.org. The API key never reaches the browser.
// Falls back to the bundled seed fixtures if no key is set or the upstream fails.
import seed from "../../../data/matches.seed.json";

export const revalidate = 30; // seconds — cache live data briefly to respect rate limits

function mapStatus(s) {
  if (s === "FINISHED" || s === "AWARDED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED") return "IN_PLAY";
  return "SCHEDULED";
}

function normalize(m) {
  return {
    id: String(m.id),
    stage: m.stage, // GROUP_STAGE | LAST_32 | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
    group: m.group ? String(m.group).replace("GROUP_", "") : null,
    utcDate: m.utcDate,
    status: mapStatus(m.status),
    home: m.homeTeam?.name ?? null,
    away: m.awayTeam?.name ?? null,
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
  };
}

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    return Response.json({ source: "seed", note: "No FOOTBALL_DATA_API_KEY set — showing scheduled fixtures only.", matches: seed });
  }
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": key },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    const matches = (data.matches || []).map(normalize).filter((m) => m.home && m.away);
    if (!matches.length) throw new Error("empty");
    return Response.json({ source: "football-data.org", matches });
  } catch (e) {
    return Response.json({ source: "seed", note: `Live feed unavailable (${e.message}); showing fixtures.`, matches: seed });
  }
}
