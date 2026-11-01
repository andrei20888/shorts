import React from 'react';
import { COLORS, type Palette } from '../config/theme';
import { useSvgId } from '../lib/format';

const DIGITS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  ' ': '',
};

const CELL_W = 12.5;
const CELL_H = 24;
const T = 3.4;
const SLANT = 0.12;

const H = (yc: number, x0: number, x1: number): number[][] => [
  [x0, yc],
  [x0 + T / 2, yc - T / 2],
  [x1 - T / 2, yc - T / 2],
  [x1, yc],
  [x1 - T / 2, yc + T / 2],
  [x0 + T / 2, yc + T / 2],
];
const V = (xc: number, y0: number, y1: number): number[][] => [
  [xc, y0],
  [xc + T / 2, y0 + T / 2],
  [xc + T / 2, y1 - T / 2],
  [xc, y1],
  [xc - T / 2, y1 - T / 2],
  [xc - T / 2, y0 + T / 2],
];

const segPoints = (seg: string): number[][] => {
  const l = T / 2;
  const r = CELL_W - T / 2;
  const top = T / 2;
  const mid = CELL_H / 2;
  const bot = CELL_H - T / 2;
  const g = 0.7;
  switch (seg) {
    case 'a':
      return H(top, l + g, r - g);
    case 'b':
      return V(r, top + g, mid - g);
    case 'c':
      return V(r, mid + g, bot - g);
    case 'd':
      return H(bot, l + g, r - g);
    case 'e':
      return V(l, mid + g, bot - g);
    case 'f':
      return V(l, top + g, mid - g);
    default:
      return H(mid, l + g, r - g);
  }
};

const poly = (pts: number[][], ox: number, oy: number) =>
  pts.map(([x, y]) => `${ox + x + (CELL_H - y) * SLANT},${oy + y}`).join(' ');

/** 7-segment readout for "H:MM" / "HH:MM", centered at (0,0). */
const Readout: React.FC<{ time: string; lit: boolean; colon: boolean; color: string; ghost?: string }> = ({
  time,
  lit,
  colon,
  color,
  ghost,
}) => {
  const [hh, mm] = time.split(':');
  const chars = [...hh.padStart(2, ' '), ':', ...mm.padEnd(2, '0').slice(0, 2)];
  const xs = [-33, -18.5, -3.5, 2, 16.5];
  const oy = -CELL_H / 2;
  const out: React.ReactNode[] = [];
  chars.forEach((ch, i) => {
    if (ch === ':') {
      if (colon || ghost)
        out.push(
          <g key={`c${i}`} fill={colon ? color : ghost}>
            <rect x={xs[i] - 1.2 + 1.6} y={-6} width={3} height={3} rx={0.8} />
            <rect x={xs[i] - 1.2} y={3} width={3} height={3} rx={0.8} />
          </g>,
        );
      return;
    }
    const on = DIGITS[ch] ?? '';
    for (const s of 'abcdefg') {
      const isOn = lit && on.includes(s);
      if (!isOn && !ghost) continue;
      out.push(<polygon key={`${i}${s}`} points={poly(segPoints(s), xs[i], oy)} fill={isOn ? color : ghost} />);
    }
  });
  return <g>{out}</g>;
};

export type AlarmClockProps = {
  /** Bottom-center (sits on the nightstand). */
  x: number;
  y: number;
  scale?: number;
  time?: string;
  frame: number;
  /** 0..1 ringing: vibration + ring marks. */
  ring?: number;
  /** Light intensity multiplier. */
  glow?: number;
  /** 0..1 slap squash. */
  squash?: number;
  on?: boolean;
  colonBlink?: boolean;
  palette: Palette;
  spill?: number;
};

export const CLOCK_SIZE = { w: 92, h: 56 };

/** Digital alarm clock — the brightest thing on screen. */
export const AlarmClock: React.FC<AlarmClockProps> = ({
  x,
  y,
  scale = 1,
  time = '5:00',
  frame,
  ring = 0,
  glow = 1,
  squash = 0,
  on = true,
  colonBlink = true,
  palette,
  spill = 260,
}) => {
  const id = useSvgId('clk');
  const { w, h } = CLOCK_SIZE;
  const vib = ring > 0 ? Math.sin(frame * 2.9) * 2.4 * ring : 0;
  const tilt = ring > 0 ? Math.sin(frame * 3.7 + 1) * 3.2 * ring : 0;
  const hop = ring > 0 ? -Math.abs(Math.sin(frame * 1.9)) * 2.5 * ring : 0;
  const sx = 1 + 0.12 * squash;
  const sy = 1 - 0.2 * squash;
  const colon = !colonBlink || Math.floor(frame / 15) % 2 === 0;
  const g = on ? glow : 0;
  const ringOn = ring > 0.05 && Math.floor(frame / 2) % 2 === 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <radialGradient id={`${id}-spill`}>
          <stop offset="0" stopColor={COLORS.clockRed} stopOpacity={0.62} />
          <stop offset="0.35" stopColor={COLORS.clockRed} stopOpacity={0.22} />
          <stop offset="1" stopColor={COLORS.clockRed} stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-bloom`} x="-80%" y="-120%" width="260%" height="340%">
          <feGaussianBlur stdDeviation={3.6} />
        </filter>
        <filter id={`${id}-bloom2`} x="-150%" y="-250%" width="400%" height="600%">
          <feGaussianBlur stdDeviation={11} />
        </filter>
      </defs>
      {/* light spill on wall / nightstand */}
      {g > 0 ? (
        <circle cx={0} cy={-h * 0.55} r={spill} fill={`url(#${id}-spill)`} opacity={Math.min(1, g)} style={{ mixBlendMode: 'screen' }} />
      ) : null}
      <g transform={`translate(${vib} ${hop}) rotate(${tilt}) scale(${sx} ${sy})`}>
        {/* feet */}
        <rect x={-w / 2 + 10} y={-5} width={12} height={5} rx={2} fill={palette.fill3} stroke={palette.line} strokeWidth={3} />
        <rect x={w / 2 - 22} y={-5} width={12} height={5} rx={2} fill={palette.fill3} stroke={palette.line} strokeWidth={3} />
        {/* snooze bar */}
        <rect x={-22} y={-h - 9} width={44} height={10} rx={4} fill={palette.fill3} stroke={palette.line} strokeWidth={3} />
        {/* body */}
        <rect x={-w / 2} y={-h - 3} width={w} height={h} rx={14} fill={palette.fill2} stroke={palette.line} strokeWidth={3} />
        {/* display */}
        <rect x={-w / 2 + 8} y={-h + 5} width={w - 16} height={h - 18} rx={7} fill="#0A0607" stroke={palette.line} strokeOpacity={0.55} strokeWidth={2} />
        <g transform={`translate(1 ${-h / 2 - 5})`}>
          <Readout time={time} lit={false} colon={false} color="" ghost={COLORS.clockGhost} />
          {g > 0 ? (
            <>
              <g filter={`url(#${id}-bloom2)`} opacity={0.95 * Math.min(1.4, g)}>
                <Readout time={time} lit colon={colon} color={COLORS.clockRed} />
              </g>
              <g filter={`url(#${id}-bloom)`} opacity={Math.min(1, g)}>
                <Readout time={time} lit colon={colon} color="#FF6A55" />
              </g>
              <Readout time={time} lit colon={colon} color={COLORS.clockCore} />
            </>
          ) : null}
        </g>
      </g>
      {/* ring marks */}
      {ringOn ? (
        <g stroke={COLORS.clockRed} strokeWidth={3} strokeLinecap="round" fill="none" opacity={Math.min(1, ring)}>
          <path d={`M${-w / 2 - 10} ${-h - 4} q-8 6 -4 16`} />
          <path d={`M${-w / 2 - 20} ${-h - 10} q-12 10 -6 26`} />
          <path d={`M${w / 2 + 10} ${-h - 4} q8 6 4 16`} />
          <path d={`M${w / 2 + 20} ${-h - 10} q12 10 6 26`} />
        </g>
      ) : null}
    </g>
  );
};
