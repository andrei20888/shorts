import React from 'react';
import type { TreadFn } from '../characters/poses';
import { COLORS } from '../config/theme';
import { mix } from '../lib/color';

/**
 * Endless wavy staircase. Step k's tread spans x_k → x_{k+1} at height y_k = y0 − k·R.
 * The run of each step is D·cos θ(k): θ waves, so the flight meanders, steepens,
 * even doubles back — read from afar it winds up into the clouds.
 */
export type StairSpec = {
  key: string;
  x0: number;
  y0: number;
  D: number;
  R: number;
  /** Slab thickness under each tread. */
  T: number;
  theta: (k: number) => number;
  kMin: number;
  kMax: number;
};

type Geom = { xs: Float64Array; spec: StairSpec };
const cache = new Map<string, Geom>();

export const stairGeom = (spec: StairSpec): Geom => {
  const hit = cache.get(spec.key);
  if (hit) return hit;
  const n = spec.kMax - spec.kMin + 3;
  const xs = new Float64Array(n);
  // integrate outward from k = 0
  const i0 = -spec.kMin;
  xs[i0] = spec.x0;
  for (let k = 0; k < spec.kMax + 2; k++) xs[i0 + k + 1] = xs[i0 + k] + spec.D * Math.cos(spec.theta(k));
  for (let k = -1; k >= spec.kMin; k--) xs[i0 + k] = xs[i0 + k + 1] - spec.D * Math.cos(spec.theta(k));
  const g = { xs, spec };
  cache.set(spec.key, g);
  return g;
};

const xAt = (g: Geom, k: number) => {
  const i = Math.max(0, Math.min(g.xs.length - 1, k - g.spec.kMin));
  return g.xs[i];
};

export const treadOf = (spec: StairSpec): TreadFn => {
  const g = stairGeom(spec);
  return (j: number) => ({ x0: xAt(g, j), x1: xAt(g, j + 1), y: spec.y0 - j * spec.R });
};

/** Continuous point on the stair "nose line" (for cameras that follow the flight). */
export const stairPoint = (spec: StairSpec, s: number) => {
  const g = stairGeom(spec);
  const j = Math.floor(s);
  const fr = s - j;
  const a = (xAt(g, j) + xAt(g, j + 1)) / 2;
  const b = (xAt(g, j + 1) + xAt(g, j + 2)) / 2;
  return { x: a + (b - a) * fr, y: spec.y0 - (j + fr) * spec.R };
};

export type StairColors = { top: string; body: string; under: string; line: string };
export const STAIR_COLORS = {
  sand: { top: '#E7C79C', body: '#C79D6D', under: '#A47A50', line: COLORS.line },
  wet: { top: '#B8A58C', body: '#97836C', under: '#7B6956', line: COLORS.line },
  warm: { top: '#F6D3A0', body: '#D89D5F', under: '#B47844', line: COLORS.line },
  gold: { top: '#FFE2A8', body: '#E9AE62', under: '#C4823F', line: '#FFF3DC' },
} satisfies Record<string, StairColors>;

/**
 * Draw steps k0..k1. `pxPerUnit` (camera scale) picks the level of detail:
 * blocks + outlines up close, a single ribbon when steps are a few px tall.
 */
export const Staircase: React.FC<{
  spec: StairSpec;
  k0: number;
  k1: number;
  colors?: StairColors;
  pxPerUnit?: number;
  fogColor?: string;
  /** fog(k) 0..1 → mix toward fogColor (atmospheric depth). */
  fog?: (k: number) => number;
  lineOpacity?: number;
}> = ({ spec, k0, k1, colors = STAIR_COLORS.sand, pxPerUnit = 1, fogColor, fog, lineOpacity = 1 }) => {
  const g = stairGeom(spec);
  const lo = Math.max(spec.kMin, Math.floor(k0));
  const hi = Math.min(spec.kMax, Math.ceil(k1));
  const { R, T } = spec;
  const stepPx = R * pxPerUnit;
  const col = (c: string, k: number) => (fog && fogColor ? mix(c, fogColor, Math.min(1, Math.max(0, fog(k)))) : c);

  if (stepPx < 5) {
    // Ribbon LOD: chunks of 12 steps so fog can still vary along the flight.
    const chunks: React.ReactNode[] = [];
    const CH = 12;
    const w = Math.max(4.5, Math.min(14, T * pxPerUnit));
    for (let c0 = lo; c0 < hi; c0 += CH) {
      const c1 = Math.min(hi, c0 + CH + 1);
      const pts: string[] = [];
      for (let k = c0; k <= c1; k++) {
        const xa = xAt(g, k);
        const xb = xAt(g, k + 1);
        const y = spec.y0 - k * R;
        pts.push(`${(xa + xb) / 2},${y + T * 0.35}`);
      }
      const mid = (c0 + c1) / 2;
      chunks.push(
        <g key={c0}>
          <polyline points={pts.join(' ')} fill="none" stroke={col(colors.under, mid)} strokeWidth={w + 2} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts.join(' ')} fill="none" stroke={col(colors.body, mid)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts.join(' ')} fill="none" stroke={col(colors.top, mid)} strokeWidth={Math.max(1.5, w * 0.3)} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      );
    }
    return <g>{chunks}</g>;
  }

  const steps: React.ReactNode[] = [];
  const depth = Math.min(10, R * 0.32);
  for (let k = lo; k <= hi; k++) {
    const xa = xAt(g, k);
    const xb = xAt(g, k + 1);
    const y = spec.y0 - k * R;
    const l = Math.min(xa, xb);
    const r = Math.max(xa, xb);
    const dirSign = xb >= xa ? 1 : -1;
    const sk = depth * 0.45 * dirSign;
    steps.push(
      <g key={k}>
        <rect x={l} y={y} width={Math.max(1, r - l)} height={T} fill={col(colors.body, k)} />
        <rect x={l} y={y + T - 6} width={Math.max(1, r - l)} height={6} fill={col(colors.under, k)} />
        <polygon points={`${xa},${y} ${xb},${y} ${xb + sk},${y - depth} ${xa + sk},${y - depth}`} fill={col(colors.top, k)} />
      </g>,
    );
  }
  // profile + underside lines
  const prof: string[] = [];
  const under: string[] = [];
  for (let k = lo; k <= hi; k++) {
    const xa = xAt(g, k);
    const xb = xAt(g, k + 1);
    const y = spec.y0 - k * R;
    prof.push(`${xa},${y} ${xb},${y}`);
    under.push(`${xa},${y + T} ${xb},${y + T}`);
  }
  return (
    <g>
      {steps}
      <polyline points={prof.join(' ')} fill="none" stroke={colors.line} strokeWidth={3} strokeLinejoin="round" opacity={lineOpacity} />
      <polyline points={under.join(' ')} fill="none" stroke={colors.line} strokeWidth={3} strokeLinejoin="round" opacity={lineOpacity * 0.75} />
    </g>
  );
};

/* ───────── The film's staircases ───────── */

/** The endless meandering flight (Doubt + Hook C). Gentle near k≈K_SIT, doubling back far away. */
export const K_SIT = 420;
export const MAIN_STAIRS: StairSpec = {
  key: 'main',
  x0: 0,
  y0: 0,
  D: 60,
  R: 30,
  T: 64,
  theta: (k) => 2.2 * Math.sin(((k - K_SIT) * 2 * Math.PI) / 330),
  kMin: -40,
  kMax: 1400,
};

/** Act 3: one flight that steepens and curves up toward the sun. */
export const ASCENT_STAIRS: StairSpec = {
  key: 'ascent',
  x0: 0,
  y0: 0,
  D: 62,
  R: 30,
  T: 70,
  theta: (k) => 1.22 * Math.pow(Math.min(1, Math.max(0, (k - 30) / 150)), 1.4),
  kMin: -30,
  kMax: 520,
};
