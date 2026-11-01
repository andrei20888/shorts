import { noise2D } from '@remotion/noise';
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { hash } from '../lib/anim';
import { useFormat } from '../lib/format';

/** Screen-space rain streaks (use inside a Stage `overlay`). */
export const Rain: React.FC<{
  intensity?: number;
  angle?: number;
  color?: string;
  count?: number;
  speed?: number;
  seed?: number;
}> = ({ intensity = 1, angle = 14, color = '#DCE3EA', count = 140, speed = 1, seed = 1 }) => {
  const f = useCurrentFrame();
  const { width, height } = useFormat();
  if (intensity <= 0.01) return null;
  const a = (angle * Math.PI) / 180;
  const drops = [];
  const n = Math.round(count * Math.min(1, intensity) * (width * height) / (1920 * 1080));
  for (let i = 0; i < n; i++) {
    const z = 0.35 + 0.65 * hash(i * 1.7 + seed);
    const len = (34 + 70 * z) * (0.7 + 0.3 * intensity);
    const v = (26 + 46 * z) * speed;
    const span = height + len * 2 + 200;
    const y = ((hash(i * 3.3 + seed) * span + f * v) % span) - len - 100;
    const x0 = hash(i * 9.1 + seed) * (width + 400) - 200;
    const x = x0 + Math.tan(a) * y;
    drops.push(
      <line
        key={i}
        x1={x}
        y1={y}
        x2={x - Math.sin(a) * len}
        y2={y - Math.cos(a) * len}
        stroke={color}
        strokeOpacity={(0.12 + 0.3 * z) * Math.min(1, intensity)}
        strokeWidth={z > 0.8 ? 2.2 : 1.4}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{drops}</g>;
};

/** World-space floating dust motes (for light beams). */
export const Dust: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  count?: number;
  color?: string;
  opacity?: number;
  seed?: number;
  size?: number;
}> = ({ x, y, w, h, count = 40, color = '#FFE2B0', opacity = 0.7, seed = 3, size = 2.4 }) => {
  const f = useCurrentFrame();
  const motes = [];
  for (let i = 0; i < count; i++) {
    const px = x + hash(i * 2.1 + seed) * w + noise2D(`dx${seed}`, i, f * 0.012) * 26;
    const py = y + ((hash(i * 5.3 + seed) * h - f * (0.25 + hash(i) * 0.5)) % h + h) % h + noise2D(`dy${seed}`, f * 0.01, i) * 18;
    const tw = 0.4 + 0.6 * Math.abs(noise2D(`dt${seed}`, i * 0.7, f * 0.04));
    motes.push(<circle key={i} cx={px} cy={py} r={size * (0.5 + hash(i * 7.7) * 0.9)} fill={color} opacity={opacity * tw} />);
  }
  return <g style={{ mixBlendMode: 'screen' }}>{motes}</g>;
};

/** Screen-space zoom lines radiating from (cx, cy) — for slam zooms. */
export const SpeedLines: React.FC<{
  cx: number;
  cy: number;
  amount: number;
  color?: string;
  count?: number;
  seed?: number;
}> = ({ cx, cy, amount, color = '#E8E4D8', count = 46, seed = 5 }) => {
  const f = useCurrentFrame();
  const { width, height } = useFormat();
  if (amount <= 0.01) return null;
  const R = Math.hypot(width, height) * 0.6;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const ang = hash(i * 4.4 + seed + Math.floor(f / 2) * 0.13) * Math.PI * 2;
    const r1 = R * (0.35 + 0.4 * hash(i * 1.3 + f * 0.7));
    const r2 = r1 + R * (0.2 + 0.5 * amount) * (0.4 + hash(i * 8.8));
    lines.push(
      <line
        key={i}
        x1={cx + Math.cos(ang) * r1}
        y1={cy + Math.sin(ang) * r1}
        x2={cx + Math.cos(ang) * r2}
        y2={cy + Math.sin(ang) * r2}
        stroke={color}
        strokeOpacity={0.25 + 0.5 * amount * hash(i * 2.9)}
        strokeWidth={1.5 + 3 * hash(i * 6.1)}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{lines}</g>;
};
