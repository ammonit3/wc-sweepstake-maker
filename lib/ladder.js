// Auto-scaled, top-heavy payout ladder. Pays roughly the top half; sums exactly
// to the pot; whole pounds; rounding drift absorbed by 1st place.
export function buildLadder(N, pot) {
  pot = Math.round(pot);
  if (N <= 1) return [pot];
  if (N === 2) { const first = Math.round(pot * 0.7); return [first, pot - first]; }

  const paid = Math.max(1, Math.round(N / 2));
  const r = 0.62; // decay — gives a top-heavy curve close in spirit to the v1 ladder
  const w = Array.from({ length: paid }, (_, i) => Math.pow(r, i));
  const sum = w.reduce((a, b) => a + b, 0);
  const pay = w.map((x) => Math.round((x / sum) * pot));
  while (pay.length < N) pay.push(0);
  pay[0] += pot - pay.reduce((a, b) => a + b, 0); // fix rounding drift
  return pay;
}

// Apply a ladder to a points-sorted player list, pooling ties (equal points)
// across the positions they span and splitting evenly. Returns [{...p, payout}].
export function applyLadder(sortedPlayers, ladder) {
  const out = sortedPlayers.map((p) => ({ ...p }));
  let i = 0;
  while (i < out.length) {
    let j = i;
    while (j + 1 < out.length && out[j + 1].points === out[i].points) j++;
    const pool = ladder.slice(i, j + 1).reduce((s, v) => s + (v || 0), 0);
    const each = pool / (j - i + 1);
    for (let k = i; k <= j; k++) out[k].payout = each;
    i = j + 1;
  }
  return out;
}
