/**
 * Smaller sets & props for Acts 1–2: phone, bathroom mirror, desk, notebook,
 * street, hill road, junk food. World units: character ≈ 270 tall, floor at y = 0.
 */
import React from 'react';
import { HIP_H } from '../characters/rig';
import { COLORS, SUNRISE, TEXT, type Palette } from '../config/theme';
import { hash } from '../lib/anim';
import { mix } from '../lib/color';
import { useSvgId } from '../lib/format';

/* ───────────────────────── PHONE ───────────────────────── */

/** The feed: endless cards scrolling up. (w × h screen-space box at 0,0.) */
export const Feed: React.FC<{ w: number; h: number; scroll: number; dim?: number }> = ({ w, h, scroll, dim = 1 }) => {
  const cardH = h * 0.34;
  const gap = h * 0.04;
  const step = cardH + gap;
  const first = Math.floor(scroll / step) - 1;
  const cards = [];
  for (let i = first; i < first + 5; i++) {
    const y = i * step - scroll + gap;
    const hue = ['#FF6B8B', '#7AD3FF', '#FFC24B', '#9B8CFF', '#5BE3A8'][((i % 5) + 5) % 5];
    cards.push(
      <g key={i} transform={`translate(${w * 0.07} ${y})`}>
        <rect width={w * 0.86} height={cardH} rx={w * 0.06} fill="#F3F6FF" opacity={0.95 * dim} />
        <rect x={w * 0.05} y={cardH * 0.24} width={w * 0.76} height={cardH * 0.5} rx={w * 0.04} fill={hue} opacity={0.85 * dim} />
        <circle cx={w * 0.1} cy={cardH * 0.12} r={w * 0.045} fill={hue} opacity={dim} />
        <rect x={w * 0.18} y={cardH * 0.08} width={w * 0.4} height={cardH * 0.07} rx={3} fill="#B9C3DA" opacity={dim} />
        <path
          d={`M${w * 0.1} ${cardH * 0.86} c${w * 0.02} -${w * 0.03} ${w * 0.06} -${w * 0.02} ${w * 0.05} ${w * 0.01} c-${w * 0.01} ${w * 0.02} -${w * 0.03} ${w * 0.04} -${w * 0.05} ${w * 0.05} c-${w * 0.02} -${w * 0.01} -${w * 0.04} -${w * 0.03} -${w * 0.05} -${w * 0.05} c-${w * 0.01} -${w * 0.03} ${w * 0.03} -${w * 0.04} ${w * 0.05} -${w * 0.01}Z`}
          fill="#FF4D6D"
          opacity={dim}
        />
      </g>,
    );
  }
  return <g>{cards}</g>;
};

export const Phone: React.FC<{
  x: number;
  y: number;
  rot?: number;
  scale?: number;
  scroll?: number;
  palette: Palette;
  glow?: number;
}> = ({ x, y, rot = 0, scale = 1, scroll = 0, palette, glow = 1 }) => {
  const id = useSvgId('phone');
  const W = 40;
  const H = 76;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <defs>
        <clipPath id={`${id}-scr`}>
          <rect x={-W / 2 + 4} y={-H / 2 + 6} width={W - 8} height={H - 12} rx={4} />
        </clipPath>
        <radialGradient id={`${id}-g`}>
          <stop offset="0" stopColor={COLORS.phoneGlow} stopOpacity={0.55} />
          <stop offset="1" stopColor={COLORS.phoneGlow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow > 0 ? <circle cx={0} cy={0} r={170} fill={`url(#${id}-g)`} opacity={glow} style={{ mixBlendMode: 'screen' }} /> : null}
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={8} fill={palette.fill} stroke={palette.line} strokeWidth={3} />
      <g clipPath={`url(#${id}-scr)`}>
        <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#5C7CFA" />
        <g transform={`translate(${-W / 2 + 4} ${-H / 2 + 6})`}>
          <Feed w={W - 8} h={H - 12} scroll={scroll} />
        </g>
      </g>
    </g>
  );
};

/* ───────────────────────── BATHROOM ───────────────────────── */

export const BATH = { mirror: { x: -170, y: -560, w: 340, h: 300 }, sinkTop: -150 };

export const Bathroom: React.FC<{
  palette: Palette;
  frame: number;
  /** Reflection drawn inside the mirror (world coords). */
  reflection?: React.ReactNode;
  flicker?: boolean;
  water?: number;
}> = ({ palette: p, frame, reflection, flicker = false, water = 0 }) => {
  const id = useSvgId('bath');
  const M = BATH.mirror;
  const lightOn = !flicker || !(frame % 37 < 2 || frame % 53 === 7);
  const tiles = [];
  for (let i = -12; i <= 12; i++) tiles.push(<line key={`v${i}`} x1={i * 90} y1={-1400} x2={i * 90} y2={0} stroke={p.line} strokeOpacity={0.08} strokeWidth={2} />);
  for (let j = 0; j < 16; j++) tiles.push(<line key={`h${j}`} x1={-1200} y1={-j * 90} x2={1200} y2={-j * 90} stroke={p.line} strokeOpacity={0.08} strokeWidth={2} />);
  return (
    <g>
      <defs>
        <clipPath id={`${id}-m`}>
          <rect x={M.x} y={M.y} width={M.w} height={M.h} rx={10} />
        </clipPath>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9F4FF" stopOpacity={0.45} />
          <stop offset="1" stopColor="#E9F4FF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={-3000} y={-3000} width={6000} height={3000} fill={p.wall} />
      {tiles}
      <rect x={-3000} y={0} width={6000} height={2000} fill={p.floor} />
      <line x1={-3000} y1={0} x2={3000} y2={0} stroke={p.line} strokeWidth={3} />
      {/* light bar + cone */}
      <rect x={-110} y={M.y - 44} width={220} height={18} rx={8} fill={lightOn ? '#F4F8FF' : p.fill3} stroke={p.line} strokeWidth={3} />
      {lightOn ? <path d={`M-110 ${M.y - 26} L110 ${M.y - 26} L330 ${BATH.sinkTop} L-330 ${BATH.sinkTop} Z`} fill={`url(#${id}-light)`} style={{ mixBlendMode: 'screen' }} /> : null}
      {/* mirror */}
      <rect x={M.x - 12} y={M.y - 12} width={M.w + 24} height={M.h + 24} rx={16} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <g clipPath={`url(#${id}-m)`}>
        <rect x={M.x} y={M.y} width={M.w} height={M.h} fill={mix(p.wall, '#9FB4C8', 0.18)} />
        {reflection}
        <path d={`M${M.x + 40} ${M.y + M.h} L${M.x + 150} ${M.y}`} stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={40} className="scale-stroke" />
        <path d={`M${M.x + 190} ${M.y + M.h} L${M.x + 250} ${M.y}`} stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={16} className="scale-stroke" />
      </g>
      <rect x={M.x} y={M.y} width={M.w} height={M.h} rx={10} fill="none" stroke={p.line} strokeWidth={3} />
      {/* sink */}
      <rect x={-200} y={BATH.sinkTop} width={400} height={26} rx={8} fill={p.fill3} stroke={p.line} strokeWidth={3} />
      <path d={`M-140 ${BATH.sinkTop + 26} Q-130 ${BATH.sinkTop + 110} 0 ${BATH.sinkTop + 112} Q130 ${BATH.sinkTop + 110} 140 ${BATH.sinkTop + 26} Z`} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <rect x={-12} y={BATH.sinkTop + 110} width={24} height={-(BATH.sinkTop + 110)} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <path d={`M30 ${BATH.sinkTop} L30 ${BATH.sinkTop - 40} Q30 ${BATH.sinkTop - 58} 10 ${BATH.sinkTop - 58} L-24 ${BATH.sinkTop - 58}`} fill="none" stroke={p.line} strokeWidth={8} strokeLinecap="round" className="scale-stroke" />
      <path d={`M30 ${BATH.sinkTop} L30 ${BATH.sinkTop - 40} Q30 ${BATH.sinkTop - 58} 10 ${BATH.sinkTop - 58} L-24 ${BATH.sinkTop - 58}`} fill="none" stroke={p.fill3} strokeWidth={4} strokeLinecap="round" className="scale-stroke" />
      {water > 0 ? (
        <path d={`M-22 ${BATH.sinkTop - 52} Q-26 ${BATH.sinkTop - 10} -24 ${BATH.sinkTop + 40}`} stroke="#BFE3FF" strokeWidth={7} strokeLinecap="round" opacity={water} className="scale-stroke" fill="none" />
      ) : null}
    </g>
  );
};

/* ───────────────────────── DESK ───────────────────────── */

export const Desk: React.FC<{ palette: Palette; books: number; lamp?: number; x?: number; top?: number }> = ({ palette: p, books, lamp = 1, x = 0, top = -168 }) => {
  const id = useSvgId('desk');
  const bookColors = ['#C8553D', '#E0A458', '#4F7CAC', '#7BA05B', '#9C6FB6', '#D9D3C2', '#C8553D', '#4F7CAC', '#E0A458', '#7BA05B', '#9C6FB6', '#D9D3C2'];
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <radialGradient id={`${id}-l`} cx={150} cy={top - 150} r={420} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD58A" stopOpacity={0.55} />
          <stop offset="0.5" stopColor="#FFB45A" stopOpacity={0.18} />
          <stop offset="1" stopColor="#FFB45A" stopOpacity={0} />
        </radialGradient>
      </defs>
      {lamp > 0 ? <circle cx={150} cy={top - 150} r={420} fill={`url(#${id}-l)`} opacity={lamp} style={{ mixBlendMode: 'screen' }} /> : null}
      <rect x={-30} y={top} width={300} height={18} rx={4} fill={p.fill3} stroke={p.line} strokeWidth={3} />
      <rect x={-18} y={top + 18} width={14} height={-top - 18} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <rect x={244} y={top + 18} width={14} height={-top - 18} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      {/* lamp */}
      <g fill="none" stroke={p.line} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx={226} cy={top - 4} rx={26} ry={6} fill={p.fill2} />
        <path d={`M226 ${top - 6} L196 ${top - 120} L150 ${top - 150}`} />
        <path d={`M164 ${top - 168} L128 ${top - 128} L176 ${top - 120} Z`} fill={lamp > 0 ? '#FFE3A6' : p.fill2} />
      </g>
      {/* book stack */}
      {Array.from({ length: books }, (_, i) => (
        <rect
          key={i}
          x={130 - (i % 2) * 6 + hash(i) * 8}
          y={top - 16 * (i + 1)}
          width={78 + hash(i * 3) * 14}
          height={15}
          rx={3}
          fill={bookColors[i % bookColors.length]}
          stroke={p.line}
          strokeWidth={2.5}
        />
      ))}
    </g>
  );
};

/** An open book held at (x, y), page turning with progress `turn` 0..1. */
export const OpenBook: React.FC<{ x: number; y: number; rot?: number; turn?: number; palette: Palette; s?: number }> = ({ x, y, rot = 0, turn = 0, palette: p, s = 1 }) => {
  const flip = Math.sin(Math.PI * Math.min(1, Math.max(0, turn)));
  const pageX = 34 - 68 * Math.min(1, Math.max(0, turn));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-36 0 L-36 -46 Q-18 -54 0 -46 Q18 -54 36 -46 L36 0 Q18 -8 0 0 Q-18 -8 -36 0 Z" fill="#F2EBDB" stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      <line x1={0} y1={-46} x2={0} y2={0} stroke={p.line} strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={-30} y1={-38 + i * 9} x2={-6} y2={-38 + i * 9} stroke="#8A8577" strokeWidth={2} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line key={`r${i}`} x1={6} y1={-38 + i * 9} x2={30} y2={-38 + i * 9} stroke="#8A8577" strokeWidth={2} />
      ))}
      {turn > 0 && turn < 1 ? (
        <path d={`M0 -46 Q${pageX * 0.5} ${-58 - flip * 16} ${pageX} ${-50 - flip * 10} L${pageX} ${-4 - flip * 10} Q${pageX * 0.5} ${-10 - flip * 16} 0 0 Z`} fill="#FFF8EA" stroke={p.line} strokeWidth={2.5} />
      ) : null}
    </g>
  );
};

/* ───────────────────────── NOTEBOOK (top-down) ───────────────────────── */

export const Notebook: React.FC<{
  items: readonly string[];
  /** 0..items.length — how many boxes are ticked (fractional = ticking now). */
  ticks: number;
  title: string;
  palette: Palette;
  frame: number;
}> = ({ items, ticks, title, palette: p, frame }) => {
  const W = 620;
  const H = 780;
  const ink = '#24262E';
  const rowH = 104;
  const y0 = -H / 2 + 190;
  const cur = Math.floor(ticks);
  const part = ticks - cur;
  const penRow = Math.min(items.length - 1, cur);
  const penT = part;
  const penX = -W / 2 + 92 + 26 * Math.sin(penT * Math.PI) + 4 * Math.sin(frame * 0.9);
  const penY = y0 + penRow * rowH - 6 - 20 * Math.sin(penT * Math.PI);
  return (
    <g>
      <rect x={-W / 2 + 14} y={-H / 2 + 18} width={W} height={H} rx={18} fill="#000" opacity={0.25} />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={18} fill="#F1EBDD" stroke={p.line} strokeWidth={3} />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} x1={-W / 2 + 30} y1={-H / 2 + 150 + i * rowH - 40} x2={W / 2 - 30} y2={-H / 2 + 150 + i * rowH - 40} stroke="#BFD3E6" strokeWidth={2} />
      ))}
      <line x1={-W / 2 + 70} y1={-H / 2} x2={-W / 2 + 70} y2={H / 2} stroke="#E8A0A0" strokeWidth={2} />
      <text x={-W / 2 + 92} y={-H / 2 + 92} fontFamily={TEXT.family} fontWeight={900} fontSize={54} fill={ink}>
        {title}
      </text>
      {items.map((it, i) => {
        const y = y0 + i * rowH;
        const done = i < cur ? 1 : i === cur ? part : 0;
        return (
          <g key={it}>
            <rect x={-W / 2 + 92} y={y - 40} width={44} height={44} rx={8} fill="none" stroke={ink} strokeWidth={4} className="scale-stroke" />
            <text x={-W / 2 + 160} y={y - 4} fontFamily={TEXT.family} fontWeight={800} fontSize={40} fill={ink}>
              {it}
            </text>
            {done > 0 ? (
              <path
                d={`M${-W / 2 + 98} ${y - 22} L${-W / 2 + 112} ${y - 6} L${-W / 2 + 148} ${y - 52}`}
                fill="none"
                stroke={COLORS.headband}
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="scale-stroke"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - Math.min(1, done)}
              />
            ) : null}
          </g>
        );
      })}
      {/* pen */}
      <g transform={`translate(${penX + 60} ${penY - 40}) rotate(38)`}>
        <rect x={-9} y={-150} width={18} height={150} rx={6} fill="#2E3440" stroke={p.line} strokeWidth={3} />
        <path d="M-9 0 L0 22 L9 0 Z" fill="#D9D3C2" stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </g>
  );
};

/* ───────────────────────── STREET (night run) ───────────────────────── */

/** Night street. `scroll` = world distance run (parallax layers move at different rates). */
export const Street: React.FC<{ palette: Palette; scroll: number; dawn?: number; frame: number }> = ({ palette: p, scroll, dawn = 0, frame }) => {
  const id = useSvgId('street');
  const far = [];
  const sp = 220;
  const farShift = -scroll * 0.3;
  const k0 = Math.floor((-farShift - 2400) / sp);
  for (let k = k0; k < k0 + 26; k++) {
    const x = k * sp + farShift;
    const h = 260 + hash(k * 1.7) * 420;
    const w = 150 + hash(k * 2.9) * 60;
    far.push(
      <g key={k}>
        <rect x={x} y={-h - 120} width={w} height={h + 120} fill={mix('#0B0E18', p.fill, dawn * 0.6)} stroke={p.line} strokeOpacity={0.25} strokeWidth={2} />
        {Array.from({ length: 6 }, (_, j) =>
          hash(k * 13 + j) > 0.72 ? (
            <rect key={j} x={x + 20 + (j % 3) * 44} y={-h - 90 + Math.floor(j / 3) * 70} width={18} height={26} fill="#F2C46B" opacity={0.75 * (1 - dawn)} />
          ) : null,
        )}
      </g>,
    );
  }
  const lamps = [];
  const ls = 640;
  const lShift = -scroll;
  const l0 = Math.floor((-lShift - 2400) / ls);
  for (let k = l0; k < l0 + 10; k++) {
    const x = k * ls + lShift;
    lamps.push(
      <g key={k}>
        <path d={`M${x} 0 L${x} -470 Q${x} -500 ${x + 30} -500 L${x + 70} -500`} fill="none" stroke={p.line} strokeWidth={6} className="scale-stroke" strokeLinecap="round" />
        <rect x={x + 56} y={-512} width={50} height={16} rx={6} fill="#FFE7B0" stroke={p.line} strokeWidth={3} />
        <path d={`M${x + 58} -496 L${x + 104} -496 L${x + 250} 0 L${x - 90} 0 Z`} fill={`url(#${id}-cone)`} opacity={1 - dawn * 0.7} style={{ mixBlendMode: 'screen' }} />
      </g>,
    );
  }
  const dashes = [];
  const ds = 200;
  const d0 = Math.floor((scroll - 2400) / ds);
  for (let k = d0; k < d0 + 30; k++) {
    const x = k * ds - scroll;
    dashes.push(<line key={k} x1={x} y1={70} x2={x + 90} y2={70} stroke={p.line} strokeOpacity={0.55} strokeWidth={3} />);
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix('#060813', '#3A4458', dawn)} />
          <stop offset="1" stopColor={mix('#151B2E', '#8D8A93', dawn)} />
        </linearGradient>
        <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE2A6" stopOpacity={0.5} />
          <stop offset="1" stopColor="#FFE2A6" stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <rect x={-4000} y={-2600} width={8000} height={2600} fill={`url(#${id}-sky)`} />
      {far}
      <rect x={-4000} y={0} width={8000} height={2000} fill={mix('#0C0E15', p.floor, 0.5)} />
      <line x1={-4000} y1={0} x2={4000} y2={0} stroke={p.line} strokeWidth={3} />
      <line x1={-4000} y1={24} x2={4000} y2={24} stroke={p.line} strokeOpacity={0.4} strokeWidth={2} />
      {dashes}
      {lamps}
      <circle cx={-900 + (frame % 2)} cy={-1300} r={0} fill="none" />
    </g>
  );
};

/* ───────────────────────── HILL ROAD (dawn run) ───────────────────────── */

export const HillRoad: React.FC<{ scroll: number; warmth?: number; slope?: number }> = ({ scroll, warmth = 0, slope = 0.18 }) => {
  const id = useSvgId('hill');
  const ground = (x: number) => -x * slope;
  const marks = [];
  const ms = 260;
  const m0 = Math.floor((scroll - 2600) / ms);
  for (let k = m0; k < m0 + 24; k++) {
    const x = k * ms - scroll;
    marks.push(<line key={k} x1={x} y1={ground(x) + 40} x2={x + 110} y2={ground(x + 110) + 40} stroke="#E8E4D8" strokeOpacity={0.4} strokeWidth={3} />);
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix('#1E2532', '#3B1E57', warmth)} />
          <stop offset="0.6" stopColor={mix('#4A5568', '#C2513A', warmth)} />
          <stop offset="1" stopColor={mix('#9A97A0', SUNRISE.low, warmth)} />
        </linearGradient>
      </defs>
      <rect x={-5000} y={-3000} width={10000} height={3600} fill={`url(#${id}-sky)`} />
      {/* far mountains + the endless stairs on the horizon (foreshadowing) */}
      <g transform={`translate(${-scroll * 0.08} 0)`}>
        <path d="M-3000 -260 L-2200 -620 L-1700 -380 L-1100 -760 L-500 -420 L200 -820 L900 -460 L1600 -700 L2400 -380 L3200 -560 L3200 400 L-3000 400 Z" fill={mix('#2B3242', '#5A2D4A', warmth)} opacity={0.9} />
        <path d="M640 -560 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0 l0 -14 l14 0" fill="none" stroke="#E8E4D8" strokeOpacity={0.35} strokeWidth={3} />
      </g>
      <path d={`M-5000 ${ground(-5000)} L5000 ${ground(5000)} L5000 2000 L-5000 2000 Z`} fill={mix('#1A1F2A', '#2A1A2A', warmth)} />
      <line x1={-5000} y1={ground(-5000)} x2={5000} y2={ground(5000)} stroke="#E8E4D8" strokeWidth={3} />
      {marks}
    </g>
  );
};
export const hillGroundY = (x: number, slope = 0.18) => -x * slope;

/* ───────────────────────── JUNK FOOD ───────────────────────── */

export const PizzaBox: React.FC<{ x: number; y: number; open?: number; p: Palette; slices?: number }> = ({ x, y, open = 1, p, slices = 3 }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M-70 0 L70 0 L64 -10 L-64 -10 Z`} fill="#C9A06A" stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
    <g transform={`translate(64 -10) rotate(${80 * open})`}>
      <rect x={-128} y={-4} width={128} height={8} rx={2} fill="#D8B27A" stroke={p.line} strokeWidth={3} transform="scale(0.55 1)" />
    </g>
    {Array.from({ length: slices }, (_, i) => (
      <path key={i} d={`M${-52 + i * 34} -10 L${-24 + i * 34} -10 L${-38 + i * 34} -22 Z`} fill="#F2B04B" stroke={p.line} strokeWidth={2.5} strokeLinejoin="round" />
    ))}
  </g>
);

export const Slice: React.FC<{ x: number; y: number; rot?: number; bite?: number; p: Palette }> = ({ x, y, rot = 0, bite = 0, p }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M0 0 L46 -16 L46 16 Z" fill="#F2B04B" stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
    <path d="M42 -14 Q52 0 42 14" fill="none" stroke="#C47A2C" strokeWidth={6} strokeLinecap="round" className="scale-stroke" />
    <circle cx={22} cy={-2} r={4} fill="#C8553D" />
    <circle cx={32} cy={6} r={3.5} fill="#C8553D" />
    {bite > 0 ? <circle cx={4} cy={0} r={9 * bite} fill={p.wall} /> : null}
  </g>
);

export const ChipsBag: React.FC<{ x: number; y: number; rot?: number; p: Palette }> = ({ x, y, rot = 0, p }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M-30 0 L-34 -70 L-26 -76 L-14 -70 L0 -78 L14 -70 L26 -76 L34 -70 L30 0 Z" fill="#E4572E" stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
    <circle cx={0} cy={-38} r={13} fill="#FFC857" stroke={p.line} strokeWidth={2.5} />
  </g>
);

export const SodaCan: React.FC<{ x: number; y: number; rot?: number; p: Palette; color?: string }> = ({ x, y, rot = 0, p, color = '#3A86FF' }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={-14} y={-48} width={28} height={48} rx={5} fill={color} stroke={p.line} strokeWidth={3} />
    <line x1={-14} y1={-40} x2={14} y2={-40} stroke={p.line} strokeWidth={2} />
    <line x1={-14} y1={-8} x2={14} y2={-8} stroke={p.line} strokeWidth={2} />
  </g>
);

export const standY = (groundY: number) => groundY - HIP_H;
