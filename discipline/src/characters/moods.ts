/**
 * Eyebrows carry all the emotion. Each mood = brow shape + eyelid.
 *   inner/outer : vertical offset of the inner / outer brow end (+ = down)
 *   arch        : + = arched up in the middle
 *   w           : thickness multiplier
 *   y           : whole-brow offset (+ = down)
 *   lid         : eyelid closure 0..1
 *   lidTilt     : deg, + = lid lower at the inner corner (focused / angry)
 */
export type Brow = { inner: number; outer: number; arch: number; w: number; y: number; lid: number; lidTilt: number };

export const MOODS = {
  neutral: { inner: 0, outer: 0, arch: 2.5, w: 1, y: 0, lid: 0.06, lidTilt: 0 },
  tired: { inner: -1.5, outer: 7, arch: 0.5, w: 0.95, y: 4, lid: 0.52, lidTilt: -8 },
  sad: { inner: -9, outer: 5, arch: -1, w: 1, y: -1, lid: 0.24, lidTilt: -12 },
  determined: { inner: 10, outer: -4, arch: -1.5, w: 1.14, y: 2, lid: 0.3, lidTilt: 16 },
  angry: { inner: 13, outer: -6, arch: -2.5, w: 1.22, y: 3, lid: 0.34, lidTilt: 20 },
  proud: { inner: -4, outer: -2, arch: 5, w: 1, y: -4, lid: 0.34, lidTilt: 0 },
  surprised: { inner: -10, outer: -8, arch: 6, w: 0.95, y: -9, lid: 0, lidTilt: 0 },
  focused: { inner: 5, outer: -1, arch: 0, w: 1.05, y: 1, lid: 0.18, lidTilt: 8 },
} satisfies Record<string, Brow>;

export type MoodName = keyof typeof MOODS;
export type MoodInput = MoodName | Brow | { from: MoodName | Brow; to: MoodName | Brow; t: number };

const asBrow = (m: MoodName | Brow): Brow => (typeof m === 'string' ? MOODS[m] : m);

export const mixBrow = (a: Brow, b: Brow, t: number): Brow => {
  const out = {} as Brow;
  (Object.keys(a) as Array<keyof Brow>).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
};

export const resolveMood = (m: MoodInput | undefined): Brow => {
  if (!m) return MOODS.neutral;
  if (typeof m === 'string') return MOODS[m];
  if ('from' in m) return mixBrow(asBrow(m.from), asBrow(m.to), m.t);
  return m;
};
