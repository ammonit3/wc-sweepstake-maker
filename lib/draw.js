// Tiered snake draw: fair allocation of the 48 teams to N players.
// Sort by rank → split into (48/N) tiers of N → snake-assign one per player per tier.
import { TEAMS } from "./teams.js";

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawTeams(players, rng = Math.random) {
  const N = players.length;
  if (48 % N !== 0) throw new Error(`Player count ${N} does not divide 48`);
  const ordered = Object.values(TEAMS).sort((a, b) => a.rank - b.rank).map((t) => t.name);
  const tiers = 48 / N;
  const alloc = Object.fromEntries(players.map((p) => [p, []]));
  for (let k = 0; k < tiers; k++) {
    const tier = shuffle(ordered.slice(k * N, (k + 1) * N), rng);
    const order = k % 2 === 0 ? players : [...players].reverse(); // snake
    order.forEach((p, i) => alloc[p].push(tier[i]));
  }
  for (const p of players) alloc[p].sort((a, b) => TEAMS[a].rank - TEAMS[b].rank);
  return alloc;
}
