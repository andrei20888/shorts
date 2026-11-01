import React from 'react';
import { SUNRISE } from '../config/theme';
import { hash } from '../lib/anim';

export type SkyMode = 'night' | 'predawn' | 'dawn' | 'sunrise';

export const SKY_STOPS: Record<SkyMode, Array<[number, string]>> = {
  night: [
    [0, '#05070F'],
    [0.7, '#0D1226'],
    [1, '#161D36'],
  ],
  predawn: [
    [0, '#090D1C'],
    [0.6, '#1C2440'],
    [1, '#3A3F63'],
  ],
  dawn: [
    [0, '#2A3346'],
    [0.6, '#56627A'],
    [1, '#A79A93'],
  ],
  sunrise: [
    [0, SUNRISE.top],
    [0.38, SUNRISE.upper],
    [0.7, SUNRISE.mid],
    [0.88, SUNRISE.low],
    [1, SUNRISE.gold],
  ],
};

/** Vertical gradient definition (objectBoundingBox) for a sky mode. */
export const SkyGradientDef: React.FC<{ id: string; mode: SkyMode; stops?: Array<[number, string]> }> = ({ id, mode, stops }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    {(stops ?? SKY_STOPS[mode]).map(([o, c]) => (
      <stop key={o} offset={o} stopColor={c} />
    ))}
  </linearGradient>
);

export const Stars: React.FC<{ x: number; y: number; w: number; h: number; count?: number; frame: number; seed?: number; opacity?: number }> = ({
  x,
  y,
  w,
  h,
  count = 26,
  frame,
  seed = 1,
  opacity = 1,
}) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(frame * 0.07 * (0.5 + hash(i + seed)) + i));
      return (
        <circle
          key={i}
          cx={x + hash(i * 3.1 + seed) * w}
          cy={y + Math.pow(hash(i * 7.3 + seed), 1.4) * h}
          r={0.9 + hash(i * 1.9 + seed) * 1.8}
          fill="#E8E4D8"
          opacity={tw * opacity}
        />
      );
    })}
  </g>
);

/** Sun disc with layered glow. */
export const Sun: React.FC<{ x: number; y: number; r: number; id: string; glow?: number; core?: string; halo?: string }> = ({
  x,
  y,
  r,
  id,
  glow = 1,
  core = SUNRISE.sunCore,
  halo = SUNRISE.sun,
}) => (
  <g>
    <defs>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0" stopColor={halo} stopOpacity={0.9} />
        <stop offset="0.25" stopColor={SUNRISE.gold} stopOpacity={0.55} />
        <stop offset="0.6" stopColor={SUNRISE.low} stopOpacity={0.18} />
        <stop offset="1" stopColor={SUNRISE.mid} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * 4.2} fill={`url(#${id}-halo)`} opacity={glow} style={{ mixBlendMode: 'screen' }} />
    <circle cx={x} cy={y} r={r} fill={core} />
  </g>
);

/** Soft rounded cloud made of overlapping circles. */
export const Cloud: React.FC<{ x: number; y: number; s: number; fill: string; stroke?: string; opacity?: number }> = ({
  x,
  y,
  s,
  fill,
  stroke,
  opacity = 1,
}) => {
  const d = `M${x - 90 * s} ${y} C${x - 100 * s} ${y - 30 * s} ${x - 60 * s} ${y - 44 * s} ${x - 34 * s} ${y - 30 * s} C${x - 26 * s} ${
    y - 70 * s
  } ${x + 30 * s} ${y - 72 * s} ${x + 40 * s} ${y - 34 * s} C${x + 70 * s} ${y - 50 * s} ${x + 104 * s} ${y - 24 * s} ${x + 92 * s} ${y} Z`;
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={stroke ? 3 : 0} opacity={opacity} strokeLinejoin="round" />;
};

/** Birds as tiny flapping "v"s. */
export const Birds: React.FC<{ x: number; y: number; frame: number; count?: number; color?: string; s?: number }> = ({
  x,
  y,
  frame,
  count = 3,
  color = '#1A0E1E',
  s = 1,
}) => (
  <g stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
    {Array.from({ length: count }, (_, i) => {
      const flap = Math.sin(frame * 0.5 + i * 1.3) * 5 * s;
      const bx = x + i * 34 * s + frame * 0.6 * s;
      const by = y + hash(i * 4.4) * 30 * s + Math.sin(frame * 0.05 + i) * 6 * s;
      return <path key={i} d={`M${bx - 10 * s} ${by - flap} Q${bx - 4 * s} ${by - 2 * s} ${bx} ${by} Q${bx + 4 * s} ${by - 2 * s} ${bx + 10 * s} ${by - flap}`} />;
    })}
  </g>
);
