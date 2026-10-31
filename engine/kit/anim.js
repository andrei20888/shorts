// Time helpers: everything is a pure function of t (seconds) so frames render deterministically.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  lin: k => k,
  out: k => 1 - (1 - k) ** 3,
  in: k => k ** 3,
  inOut: k => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  outExpo: k => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  inExpo: k => (k <= 0 ? 0 : 2 ** (10 * k - 10)),
  outBack: k => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
};
// Keyframes: [[time, value], ...]; value may be a number or array. Eased per segment.
export function kf(t, keys, e = ease.inOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = (e1 || e)((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
// Damped screen shake that starts at t0.
export function shake(t, t0, dur = 0.4, amp = 0.15, freq = 38) {
  const k = (t - t0) / dur;
  if (k < 0 || k > 1) return [0, 0];
  const d = (1 - k) ** 2 * amp;
  return [Math.sin(t * freq) * d, Math.cos(t * freq * 1.3) * d];
}
// Deterministic pseudo-random.
export function rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// Timeline lookup: beat(id) -> {start, end, dur}; throws early if a scene references a missing beat.
export function beats(tl) {
  const map = Object.fromEntries(tl.beats.map(b => [b.id, b]));
  return id => { const b = map[id]; if (!b) throw new Error('missing beat ' + id); return b; };
}
