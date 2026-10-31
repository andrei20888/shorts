// Easing + small math helpers (deterministic, time-based).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOutCubic = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export const easeInCubic = (t) => { t = clamp(t); return t * t * t; };
export const easeInOutCubic = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutExpo = (t) => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const easeOutBack = (t, s = 1.70158) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const easeOutElastic = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };
// progress of a window: 0 before t0, 1 after t0+dur
export const win = (t, t0, dur) => clamp((t - t0) / Math.max(1e-6, dur));
// pulse that decays after an event at t0 (for impacts / punches)
export const decay = (t, t0, tau = 0.25) => (t < t0 ? 0 : Math.exp(-(t - t0) / tau));
// ping-pong 0..1..0
export const tri = (x) => 1 - Math.abs(2 * (x - Math.floor(x)) - 1);
// deterministic pseudo random
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
