// Shared timeline for Animation 3, in seconds from the section-enter trigger. The canvas
// (OrbitCanvas) and the DOM controller (SoftwareModes) both read these so the coin merge,
// the toggle flip and the glow bloom stay in lockstep.
//
//   0.00  enter → headline dissolves char-by-char (L→R)
//   0.70  coins begin spiralling inward (radius↓, speed↑)
//   2.90  coins compressed into a dense sphere
//   +hold anticipation beat
//   3.20  sphere morphs → hero token (scale 90→100, float, rotate, edge-light)
//   4.10  toggle slides OFF→ON + cyan glow blooms
//   4.20  token fully formed
//   4.90  settled → 8s idle breathing loop
export const SEQ = {
  spiralStart: 0.7,
  spiralEnd: 2.9,
  tokenStart: 3.2,
  tokenEnd: 4.2,
  toggleAt: 4.1,
  settleEnd: 4.9,
  idlePeriod: 8, // seconds per breathe cycle
} as const;

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
