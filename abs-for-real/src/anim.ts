import {Easing, interpolate, random, spring} from 'remotion';

export const easeOut = Easing.out(Easing.cubic);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0..1 eased progress starting at frame `at`, lasting `dur` frames. */
export const prog = (f: number, at: number, dur: number): number =>
  interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: easeOut});

/** Linear 0..1 progress (for fades). */
export const lin = (f: number, at: number, dur: number): number =>
  interpolate(f, [at, at + dur], [0, 1], clamp);

/** Text "punch": scale 1.15 -> 1 with a short fade-in. */
export const punch = (f: number, at = 0, dur = 9, from = 1.15) => ({
  scale: interpolate(f, [at, at + dur], [from, 1], {...clamp, easing: easeOut}),
  opacity: interpolate(f, [at, at + 3], [0, 1], clamp),
});

/** Harder entrance: scale 1.3 -> 1 in 5 frames, no fade (hard cut feel). */
export const slam = (f: number, at = 0) => ({
  scale: interpolate(f, [at, at + 5], [1.3, 1], {...clamp, easing: easeOut}),
  opacity: f >= at ? 1 : 0,
});

/** Deterministic camera shake for `frames` frames starting at `at`. */
export const shake = (f: number, at = 0, frames = 3, amp = 14, seed = 's') => {
  const t = f - at;
  if (t < 0 || t >= frames) return {x: 0, y: 0};
  const decay = 1 - t / frames;
  return {
    x: (random(`${seed}x${t}`) - 0.5) * 2 * amp * decay,
    y: (random(`${seed}y${t}`) - 0.5) * 2 * amp * decay,
  };
};

/** One heartbeat-like pulse: 1 -> 1+amt -> 1 over `dur` frames. */
export const pulse = (f: number, at: number, dur = 8, amt = 0.08): number => {
  const t = f - at;
  if (t < 0 || t > dur) return 1;
  return 1 + amt * Math.sin((Math.PI * t) / dur);
};

/** Slow continuous zoom so a held frame never feels frozen. */
export const drift = (f: number, dur: number, to = 1.04, from = 1): number =>
  interpolate(f, [0, dur], [from, to], clamp);

/** Spring with visible overshoot (for the lime square, "CAN", "Nov 23"). */
export const overshoot = (f: number, at: number, fps: number): number =>
  f < at
    ? 0
    : spring({frame: f - at, fps, config: {damping: 9, stiffness: 170, mass: 0.8}});

/** Whole-frame white impact flash on frame `at` (1 frame). */
export const impact = (f: number, at = 0): number => (f === at ? 1 : f === at + 1 ? 0.35 : 0);
