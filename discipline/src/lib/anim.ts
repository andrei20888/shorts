import { Easing, interpolate } from 'remotion';

export type Ease = (t: number) => number;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/** House easing curves. Nothing in the film moves linearly. */
export const EASE = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  soft: Easing.bezier(0.45, 0.05, 0.55, 0.95),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outSoft: Easing.bezier(0.25, 0.6, 0.35, 1),
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.45),
  inStrong: Easing.bezier(0.8, 0, 0.95, 0.35),
  slam: Easing.bezier(0.9, 0, 0.1, 1),
  push: Easing.bezier(0.33, 0.12, 0.25, 1),
  whipIn: Easing.bezier(0.15, 0.85, 0.35, 1),
  whipOut: Easing.bezier(0.7, 0, 0.9, 0.3),
} as const;

/** Clamped, eased tween from v0→v1 while f goes f0→f1. */
export const tween = (f: number, f0: number, f1: number, v0: number, v1: number, ease: Ease = EASE.inOut) => {
  if (f1 <= f0) return f >= f0 ? v1 : v0;
  return interpolate(f, [f0, f1], [v0, v1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

/** 0→1 progress over [f0, f1]. */
export const prog = (f: number, f0: number, f1: number, ease: Ease = EASE.inOut) => tween(f, f0, f1, 0, 1, ease);

/** Keyframes: [[frame, value, easeIntoThisKey?], …] */
export type Key = [number, number, Ease?];
export const keys = (f: number, ks: Key[]) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [f1, v1, e] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (f <= f1) return tween(f, f0, f1, v0, v1, e ?? EASE.inOut);
  }
  return ks[ks.length - 1][1];
};

/** Exponential decay "kick" after frame `at` (0 before it). */
export const kick = (f: number, at: number, decayFrames: number) => (f < at ? 0 : Math.exp(-(f - at) / decayFrames));

/** Deterministic hash → [0,1). */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Damped oscillation used for little settles / wobbles. */
export const wobble = (f: number, at: number, amp: number, freq = 0.9, decay = 6) =>
  f < at ? 0 : amp * Math.sin((f - at) * freq) * Math.exp(-(f - at) / decay);
