import React from 'react';
import { Bean } from '../characters/Bean';
import { HIP_H } from '../characters/rig';
import { COLORS, SUNRISE, type Palette } from '../config/theme';
import { Dust } from '../fx/Atmos';
import { alpha, mix } from '../lib/color';
import { useSvgId } from '../lib/format';
import { AlarmClock, type AlarmClockProps } from './AlarmClock';
import { Birds, SkyGradientDef, Stars, Sun, type SkyMode } from './Sky';

/** Bedroom layout in world units (floor at y = 0). Shared by every bedroom shot. */
export const ROOM = {
  bed: { x0: -206, x1: 206, top: -138, mattressBottom: -100, rail: -74 },
  nightstand: { x0: -382, x1: -254, top: -160 },
  clock: { x: -318, y: -160 },
  /** Clock display center (for slam zooms). */
  clockFace: { x: -317, y: -193 },
  window: { x: -40, y: -650, w: 300, h: 300 },
  frame: { x: -380, y: -510, w: 120, h: 100 },
  door: { x: 470, w: 172, h: 476 },
  shoes: { x: 352 },
  ceiling: -1080,
  lamp: { x: 108, y: -860 },
  /** Lying in bed: pelvis position for POSES.lieBack. */
  lying: { x: -6, y: -170 },
  /** Sitting up in bed: pelvis position for POSES.sitInBed. */
  sitting: { x: -96, y: -150 },
  center: { x: -40, y: -330 },
};

export type BlanketMode = 'buried' | 'covered' | 'pulledOver' | 'made' | 'thrownBack' | 'lap' | 'none';

const DRAPE = 'C213 -132 215 -108 213 -80 C168 -70 92 -88 30 -78';
export const BLANKETS: Record<Exclude<BlanketMode, 'none'>, string> = {
  covered: `M-104 -196 C-84 -216 -22 -224 18 -202 C46 -188 70 -206 96 -202 C132 -196 170 -172 198 -146 ${DRAPE} C-20 -72 -80 -86 -112 -84 C-120 -118 -118 -168 -104 -196Z`,
  buried: `M-198 -168 C-176 -180 -128 -184 -102 -208 C-70 -238 -10 -242 30 -216 C56 -200 82 -214 108 -206 C144 -196 176 -170 200 -146 ${DRAPE} C-40 -70 -120 -88 -190 -84 C-204 -108 -206 -150 -196 -176Z`,
  pulledOver: `M-202 -150 C-208 -196 -182 -262 -136 -262 C-100 -262 -88 -232 -70 -234 C-30 -242 20 -238 44 -214 C66 -202 86 -214 110 -206 C146 -196 178 -170 200 -146 ${DRAPE} C-40 -70 -130 -88 -198 -84 C-206 -104 -206 -130 -202 -150Z`,
  made: `M-98 -147 C0 -151 120 -151 198 -147 ${DRAPE} C-20 -76 -60 -84 -98 -82Z`,
  lap: `M-84 -150 C-60 -184 6 -192 46 -176 C86 -164 150 -168 198 -146 ${DRAPE} C-20 -74 -60 -86 -92 -84 C-98 -110 -96 -134 -84 -150Z`,
  thrownBack: `M26 -140 C44 -180 98 -198 128 -178 C150 -202 196 -188 206 -150 ${DRAPE} C28 -80 26 -84 24 -82 C20 -100 20 -124 26 -140Z`,
};

export type BedroomProps = {
  palette: Palette;
  sky: SkyMode;
  frame: number;
  /** Sunrise light flood 0..1. */
  flood?: number;
  clock?: Partial<AlarmClockProps> | null;
  blanket?: BlanketMode;
  /** Drawn on the mattress, under the blanket (the sleeper). */
  occupant?: React.ReactNode;
  /** Drawn over the blanket (e.g. an arm slapping the snooze). */
  over?: React.ReactNode;
  /** Drawn in front of the whole set. */
  front?: React.ReactNode;
  runner?: boolean;
  /** Running shoes by the door: dusty (Act 1), used (Act 2), none (he's out running). */
  shoes?: 'dusty' | 'used' | 'none';
  lamp?: number;
  windowLight?: number;
  /** Cut the room off at this height (open ceiling) — used in Hook C. */
  shellTop?: number;
  door?: boolean;
};

const Shoe: React.FC<{ x: number; flip?: boolean; p: Palette; used: boolean }> = ({ x, flip, p, used }) => (
  <g transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`}>
    <path
      d="M0 0 L0 -16 C0 -27 12 -32 24 -29 L36 -22 C48 -18 60 -12 62 -3 L62 0 Z"
      fill={used ? '#D9D3C2' : mix(p.fill3, '#8A8A8A', 0.2)}
      stroke={p.line}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M2 -4 L60 -4" stroke={p.line} strokeWidth={3} strokeLinecap="round" />
    <path d="M18 -26 L28 -18 M24 -28 L34 -20" stroke={used ? COLORS.headband : p.line} strokeWidth={2.5} strokeLinecap="round" />
  </g>
);

/** The bedroom — shared set for hook, Act 1, turning point, Act 2 alarm rhyme, finale. */
export const Bedroom: React.FC<BedroomProps> = ({
  palette: p,
  sky,
  frame,
  flood = 0,
  clock,
  blanket = 'covered',
  occupant,
  over,
  front,
  runner = false,
  shoes = 'dusty',
  lamp = 0,
  windowLight = 0,
  shellTop,
  door = true,
}) => {
  const id = useSvgId('room');
  const W = ROOM.window;
  const B = ROOM.bed;
  const N = ROOM.nightstand;
  const D = ROOM.door;
  const F = ROOM.frame;
  const horizon = W.y + W.h * 0.74;
  const glow = flood;
  // runner moving uphill inside the window
  const rt = ((frame / 150) % 1) * 0.55 + 0.12;
  const hillY = (x: number) => W.y + W.h * (0.98 - 0.42 * ((x - W.x) / W.w));
  const runX = W.x + W.w * rt;
  const runScale = 0.2;
  return (
    <g>
      <defs>
        <SkyGradientDef id={`${id}-sky`} mode={sky} />
        <clipPath id={`${id}-glass`}>
          <rect x={W.x} y={W.y} width={W.w} height={W.h} />
        </clipPath>
        <radialGradient id={`${id}-wallglow`} cx={W.x + W.w / 2} cy={W.y + W.h * 0.6} r={900} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={SUNRISE.low} stopOpacity={0.55} />
          <stop offset="0.4" stopColor={SUNRISE.mid} stopOpacity={0.22} />
          <stop offset="1" stopColor={SUNRISE.mid} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SUNRISE.gold} stopOpacity={0.55} />
          <stop offset="0.55" stopColor={SUNRISE.low} stopOpacity={0.2} />
          <stop offset="1" stopColor={SUNRISE.low} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-walltone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.wallShade} />
          <stop offset="1" stopColor={p.wall} />
        </linearGradient>
      </defs>

      {/* shell */}
      <rect x={-4000} y={shellTop ?? -4000} width={8000} height={-(shellTop ?? -4000)} fill={`url(#${id}-walltone)`} />
      {glow > 0 ? <rect x={-4000} y={shellTop ?? -4000} width={8000} height={-(shellTop ?? -4000)} fill={`url(#${id}-wallglow)`} opacity={glow} /> : null}
      <line x1={-4000} y1={shellTop ?? ROOM.ceiling} x2={4000} y2={shellTop ?? ROOM.ceiling} stroke={p.line} strokeWidth={3} opacity={0.5} />
      {/* hanging lamp */}
      <g opacity={shellTop === undefined ? 1 : 0}>
        <line x1={ROOM.lamp.x} y1={ROOM.ceiling} x2={ROOM.lamp.x} y2={ROOM.lamp.y} stroke={p.line} strokeWidth={3} />
        <path
          d={`M${ROOM.lamp.x - 34} ${ROOM.lamp.y} L${ROOM.lamp.x + 34} ${ROOM.lamp.y} L${ROOM.lamp.x + 52} ${ROOM.lamp.y + 46} L${ROOM.lamp.x - 52} ${ROOM.lamp.y + 46} Z`}
          fill={p.fill2}
          stroke={p.line}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <circle cx={ROOM.lamp.x} cy={ROOM.lamp.y + 54} r={10} fill={lamp > 0 ? '#FFE8B8' : p.fill3} stroke={p.line} strokeWidth={2.5} />
      </g>

      {/* framed doodle: a mountain + sun (foreshadowing) */}
      <g>
        <rect x={F.x} y={F.y} width={F.w} height={F.h} rx={4} fill={p.fill} stroke={p.line} strokeWidth={3} />
        <path
          d={`M${F.x + 14} ${F.y + F.h - 16} L${F.x + 50} ${F.y + 34} L${F.x + 70} ${F.y + 58} L${F.x + 84} ${F.y + 44} L${F.x + F.w - 14} ${F.y + F.h - 16}`}
          fill="none"
          stroke={p.line}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={F.x + 88} cy={F.y + 26} r={9} fill="none" stroke={p.line} strokeWidth={3} />
      </g>

      {/* window */}
      <g>
        <rect x={W.x - 14} y={W.y - 14} width={W.w + 28} height={W.h + 28} rx={6} fill={p.fill} stroke={p.line} strokeWidth={3} />
        <g clipPath={`url(#${id}-glass)`}>
          <rect x={W.x} y={W.y} width={W.w} height={W.h} fill={`url(#${id}-sky)`} />
          {sky === 'night' || sky === 'predawn' ? (
            <Stars x={W.x} y={W.y} w={W.w} h={W.h * 0.7} frame={frame} count={sky === 'night' ? 24 : 12} opacity={sky === 'night' ? 1 : 0.6} />
          ) : null}
          {sky === 'night' ? (
            <g>
              <circle cx={W.x + W.w * 0.72} cy={W.y + W.h * 0.26} r={22} fill="#E8E4D8" opacity={0.92} />
              <circle cx={W.x + W.w * 0.72 + 10} cy={W.y + W.h * 0.26 - 6} r={20} fill="#0B1022" />
              {/* sleeping city */}
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const bw = 30 + ((i * 37) % 22);
                const bh = 50 + ((i * 53) % 70);
                const bx = W.x - 10 + i * 46;
                return (
                  <g key={i}>
                    <rect x={bx} y={W.y + W.h - bh} width={bw} height={bh + 4} fill="#080A14" stroke={p.line} strokeOpacity={0.35} strokeWidth={2} />
                    {i % 3 === 1 ? <rect x={bx + 8} y={W.y + W.h - bh + 14} width={6} height={8} fill="#F2C46B" opacity={0.7} /> : null}
                  </g>
                );
              })}
            </g>
          ) : null}
          {sky === 'predawn' || sky === 'dawn' ? (
            <path
              d={`M${W.x - 20} ${horizon + 30} C${W.x + 60} ${horizon - 10} ${W.x + 160} ${horizon + 20} ${W.x + W.w + 20} ${horizon - 6} L${W.x + W.w + 20} ${W.y + W.h + 20} L${W.x - 20} ${W.y + W.h + 20} Z`}
              fill={sky === 'predawn' ? '#0B0E1A' : '#2A2F3D'}
              stroke={p.line}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
          ) : null}
          {sky === 'sunrise' ? (
            <g>
              <Sun x={W.x + W.w * 0.68} y={W.y + W.h * 0.56} r={36} id={`${id}-sun`} core="#FFE3A6" glow={0.8} />
              <Birds x={W.x + 30} y={W.y + 60} frame={frame} count={3} color="#3A1E3F" s={0.8} />
              {/* far hill */}
              <path
                d={`M${W.x - 20} ${W.y + W.h * 0.8} C${W.x + 80} ${W.y + W.h * 0.66} ${W.x + 180} ${W.y + W.h * 0.74} ${W.x + W.w + 20} ${W.y + W.h * 0.62} L${W.x + W.w + 20} ${W.y + W.h + 20} L${W.x - 20} ${W.y + W.h + 20} Z`}
                fill="#7A3448"
                opacity={0.85}
              />
              {/* near hill (uphill to the right) */}
              <path
                d={`M${W.x - 20} ${hillY(W.x - 20)} L${W.x + W.w + 20} ${hillY(W.x + W.w + 20)} L${W.x + W.w + 20} ${W.y + W.h + 20} L${W.x - 20} ${W.y + W.h + 20} Z`}
                fill={SUNRISE.silhouette}
              />
              {runner ? (
                <Bean
                  x={runX}
                  y={hillY(runX) - HIP_H * runScale + 2}
                  scale={runScale}
                  rot={-12}
                  pose="run"
                  legPhase={frame / 13}
                  silhouette={{ fill: SUNRISE.silhouette, rim: SUNRISE.rim, rimWidth: 1.2 }}
                />
              ) : null}
            </g>
          ) : null}
          {/* glass glint */}
          <path d={`M${W.x + 40} ${W.y + W.h} L${W.x + 160} ${W.y}`} stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={26} className="scale-stroke" />
        </g>
        {windowLight > 0 ? (
          <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="#FFFFFF" opacity={windowLight} style={{ mixBlendMode: 'screen' }} />
        ) : null}
        <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="none" stroke={p.line} strokeWidth={3} />
        <line x1={W.x + W.w / 2} y1={W.y} x2={W.x + W.w / 2} y2={W.y + W.h} stroke={p.line} strokeWidth={5} />
        <line x1={W.x} y1={W.y + W.h * 0.48} x2={W.x + W.w} y2={W.y + W.h * 0.48} stroke={p.line} strokeWidth={5} />
        <rect x={W.x - 30} y={W.y + W.h + 12} width={W.w + 60} height={14} rx={4} fill={p.fill3} stroke={p.line} strokeWidth={3} />
      </g>

      {/* door */}
      <g opacity={door ? 1 : 0}>
        <rect x={D.x} y={-D.h} width={D.w} height={D.h} rx={4} fill={p.fill} stroke={p.line} strokeWidth={3} />
        <rect x={D.x + 22} y={-D.h + 26} width={D.w - 44} height={D.h * 0.36} rx={6} fill="none" stroke={p.line} strokeWidth={2.5} opacity={0.7} />
        <rect x={D.x + 22} y={-D.h * 0.52} width={D.w - 44} height={D.h * 0.42} rx={6} fill="none" stroke={p.line} strokeWidth={2.5} opacity={0.7} />
        <circle cx={D.x + 24} cy={-D.h * 0.47} r={7} fill={p.fill3} stroke={p.line} strokeWidth={3} />
      </g>

      {/* floor */}
      <rect x={-4000} y={0} width={8000} height={3000} fill={p.floor} />
      <line x1={-4000} y1={0} x2={4000} y2={0} stroke={p.line} strokeWidth={3} />
      <line x1={-4000} y1={-18} x2={4000} y2={-18} stroke={p.line} strokeWidth={2} opacity={0.35} />

      {/* nightstand */}
      <g>
        <rect x={N.x0 + 8} y={N.top} width={N.x1 - N.x0 - 16} height={-N.top} fill={p.fill2} stroke={p.line} strokeWidth={3} />
        <rect x={N.x0} y={N.top - 12} width={N.x1 - N.x0} height={14} rx={4} fill={p.fill3} stroke={p.line} strokeWidth={3} />
        <line x1={N.x0 + 8} y1={N.top + 52} x2={N.x1 - 8} y2={N.top + 52} stroke={p.line} strokeWidth={2.5} opacity={0.8} />
        <circle cx={(N.x0 + N.x1) / 2} cy={N.top + 26} r={5} fill={p.fill3} stroke={p.line} strokeWidth={2.5} />
      </g>

      {/* bed frame */}
      <g>
        <path d={`M${B.x0 - 22} 0 L${B.x0 - 22} -248 Q${B.x0 - 22} -270 ${B.x0 - 2} -270 Q${B.x0 + 2} -270 ${B.x0 + 2} -248 L${B.x0 + 2} 0 Z`} fill={p.fill2} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
        <path d={`M${B.x1 - 2} 0 L${B.x1 - 2} -164 Q${B.x1 - 2} -182 ${B.x1 + 10} -182 Q${B.x1 + 22} -182 ${B.x1 + 22} -164 L${B.x1 + 22} 0 Z`} fill={p.fill2} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
        <rect x={B.x0} y={B.mattressBottom} width={B.x1 - B.x0} height={B.rail - B.mattressBottom + 2} fill={p.fill} stroke={p.line} strokeWidth={3} />
        <rect x={B.x0} y={B.top} width={B.x1 - B.x0} height={B.mattressBottom - B.top} rx={14} fill={p.fill3} stroke={p.line} strokeWidth={3} />
        {/* pillow */}
        <path
          d="M-198 -146 C-202 -170 -182 -184 -152 -182 L-120 -182 C-96 -184 -86 -164 -92 -146 C-98 -134 -192 -134 -198 -146Z"
          fill={mix(p.fill3, '#E8E4D8', 0.12)}
          stroke={p.line}
          strokeWidth={3}
        />
      </g>

      {/* the alarm clock */}
      {clock ? <AlarmClock x={ROOM.clock.x} y={ROOM.clock.y} frame={frame} palette={p} {...clock} /> : null}

      {occupant}

      {blanket !== 'none' ? (
        <g>
          <path d={BLANKETS[blanket]} fill={p.blanket} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
          <path
            d={blanket === 'thrownBack' ? 'M32 -138 L204 -140' : 'M-100 -140 L204 -140'}
            stroke={alpha('#000000', 0.25)}
            strokeWidth={6}
            className="scale-stroke"
          />
          {blanket === 'made' ? <line x1={-52} y1={-148} x2={-50} y2={-84} stroke={p.line} strokeWidth={2.5} opacity={0.7} /> : null}
        </g>
      ) : null}
      {over}

      {/* running shoes by the door */}
      {shoes !== 'none' ? (
        <>
          <Shoe x={ROOM.shoes.x} p={p} used={shoes === 'used'} />
          <Shoe x={ROOM.shoes.x + 50} p={p} used={shoes === 'used'} />
        </>
      ) : null}

      {/* sunrise flood */}
      {glow > 0 ? (
        <g opacity={glow} style={{ mixBlendMode: 'screen' }}>
          <path d={`M${W.x} ${W.y + 20} L${W.x + W.w / 2 - 8} ${W.y + 10} L${-60} 0 L${-460} 0 Z`} fill={`url(#${id}-beam)`} />
          <path d={`M${W.x + W.w / 2 + 8} ${W.y + 30} L${W.x + W.w} ${W.y + 20} L${230} 0 L${-90} 0 Z`} fill={`url(#${id}-beam)`} />
          <path d={`M${W.x + 20} ${W.y + W.h * 0.55} L${W.x + W.w} ${W.y + W.h * 0.5} L${520} 0 L${300} 0 Z`} fill={`url(#${id}-beam)`} opacity={0.6} />
          <Dust x={-460} y={W.y} w={760} h={-W.y} count={46} seed={4} />
        </g>
      ) : null}

      {front}
    </g>
  );
};

/** World-space helper: a light that follows the clock glow (for <Bean light>). */
export const clockLight = (opacity = 0.55, r = 330) => ({
  x: ROOM.clockFace.x,
  y: ROOM.clockFace.y,
  r,
  color: COLORS.clockRed,
  opacity,
});
