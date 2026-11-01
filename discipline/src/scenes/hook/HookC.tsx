import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../../characters/Bean';
import { POSES } from '../../characters/poses';
import { HIP_H } from '../../characters/rig';
import { Stage, type Cam } from '../../components/Stage';
import { FlashCard, KineticText } from '../../components/Text';
import { COPY } from '../../config/copy';
import { PALETTES, SUNRISE, TEXT } from '../../config/theme';
import { EASE, hash, kick, lerp, prog } from '../../lib/anim';
import { useFormat, useSvgId } from '../../lib/format';
import { Bedroom, ROOM, clockLight } from '../../props/Bedroom';
import { Cloud, Stars, Sun } from '../../props/Sky';
import { STAIR_COLORS, Staircase, stairPoint, type StairSpec } from '../../props/Stairs';
import { HOOK, HOOK_WORDS } from '../../timing';

const NIGHT = PALETTES.night;
const TOP_K = 300;

/** Stairs that leave the bedroom floor and wind up into the sunrise. */
export const DREAM_STAIRS: StairSpec = {
  key: 'dream',
  x0: 300,
  y0: 0,
  D: 60,
  R: 30,
  T: 64,
  theta: (k) => 2.05 * Math.min(1, k / 70) * Math.sin((k * 2 * Math.PI) / 300),
  kMin: -2,
  kMax: TOP_K + 4,
};

/** A tall world: dark bedroom at the bottom, sunrise summit at the top. */
export const DreamWorld: React.FC<{ f: number; pxPerUnit: number }> = ({ f, pxPerUnit }) => {
  const id = useSvgId('dream');
  const topY = -TOP_K * DREAM_STAIRS.R;
  const summit = stairPoint(DREAM_STAIRS, TOP_K);
  const fog = (k: number) => 0.55 * (1 - Math.abs(k - 150) / 150);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={topY - 900} x2="0" y2={-900}>
          <stop offset="0" stopColor={SUNRISE.gold} />
          <stop offset="0.12" stopColor={SUNRISE.low} />
          <stop offset="0.3" stopColor={SUNRISE.mid} />
          <stop offset="0.52" stopColor={SUNRISE.upper} />
          <stop offset="0.74" stopColor={SUNRISE.top} />
          <stop offset="0.9" stopColor="#0D1226" />
          <stop offset="1" stopColor="#070912" />
        </linearGradient>
      </defs>
      <rect x={-30000} y={topY - 4000} width={60000} height={-topY + 4000} fill={`url(#${id}-sky)`} />
      <Stars x={-2400} y={-3400} w={6400} h={2400} count={90} frame={f} seed={7} />
      <Sun x={summit.x + 380} y={topY - 380} r={150} id={`${id}-sun`} core="#FFE0A0" />
      {Array.from({ length: 16 }, (_, i) => (
        <Cloud
          key={i}
          x={-1500 + hash(i * 3.3) * 3600}
          y={-1900 - hash(i * 5.1) * (TOP_K * 30 - 1500)}
          s={1.4 + hash(i * 2.2) * 2.2}
          fill={i % 2 ? '#F2B6A0' : '#D98C8C'}
          opacity={0.35}
        />
      ))}
      <Bedroom palette={NIGHT} sky="night" frame={f} blanket="covered" shellTop={-1150} door={false} clock={{ time: '5:00', ring: f < 30 ? 1 : 0, glow: 1.25, spill: 320 }}
        occupant={
          <Bean
            x={ROOM.lying.x}
            y={ROOM.lying.y}
            pose={POSES.lieBack}
            eyebrowMood="tired"
            blink={f < HOOK.impact + 6 ? 1 : 0}
            turn={-0.4}
            ambient={{ color: NIGHT.ambient, amount: NIGHT.ambientAmount }}
            light={clockLight(0.6, 300)}
          />
        }
      />
      <Staircase spec={DREAM_STAIRS} k0={0} k1={TOP_K} colors={STAIR_COLORS.sand} pxPerUnit={pxPerUnit} fogColor="#B46A6A" fog={fog} />
      {/* summit platform + the future self */}
      <rect x={summit.x - 90} y={topY - 30} width={180} height={64} rx={10} fill={STAIR_COLORS.gold.body} stroke={STAIR_COLORS.gold.line} strokeWidth={3} />
      <Bean
        x={summit.x}
        y={topY - 30 - HIP_H}
        view="front"
        pose="victory"
        silhouette={{ fill: SUNRISE.silhouette, rim: SUNRISE.rim, rimWidth: 2.5 }}
        headband
        flutter={f}
      />
    </g>
  );
};

/** C — fall from the top of the endless staircase down to the bed at the bottom. */
export const HookC: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait, orientation } = useFormat();
  const blurId = useSvgId('fall');
  const I = HOOK.impact;
  const topY = -TOP_K * DREAM_STAIRS.R;
  const startY = topY - 120;
  const landY = portrait ? -300 : -260;
  const t = prog(f, 0, I, EASE.inStrong);
  const camY = lerp(startY, landY, t);
  // follow the flight horizontally, ease into the bedroom at the end
  const k = Math.max(0, Math.min(TOP_K, -camY / DREAM_STAIRS.R));
  const onStairs = stairPoint(DREAM_STAIRS, k).x;
  const roomX = portrait ? -110 : -40;
  const camX = lerp(onStairs, roomX, prog(f, I - 12, I, EASE.inOut));
  const zoomFall = lerp(1.25, 0.75, prog(f, 4, 26, EASE.soft));
  const zoom = f < I ? lerp(zoomFall, portrait ? 1.35 : 1.55, prog(f, 30, I, EASE.out)) : (portrait ? 1.35 : 1.55) * (1 + 0.22 * prog(f, I, HOOK.end, EASE.soft));
  const bounce = f >= I ? -38 * Math.sin((f - I) * 0.75) * Math.exp(-(f - I) / 5) : 0;
  const cam: Cam = { x: camX + (f >= I ? -40 * prog(f, I, HOOK.end, EASE.soft) : 0), y: camY + bounce, zoom, rot: f < I ? 4 * Math.sin(f * 0.12) : 0 };
  // vertical motion blur from camera speed
  const speed = f < I ? Math.abs(lerp(startY, landY, prog(f + 1, 0, I, EASE.inStrong)) - camY) * zoom : 0;
  const blur = Math.min(70, speed * 0.09);
  const heartbeat = f >= HOOK.silence ? 0.8 * kick(f, HOOK.heartbeat, 5) : 0;
  return (
    <AbsoluteFill style={{ background: '#070912' }}>
      {blur > 0.5 ? (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id={blurId} x="-5%" y="-20%" width="110%" height="140%">
            <feGaussianBlur stdDeviation={`${blur * 0.08} ${blur}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: blur > 0.5 ? `url(#${blurId})` : undefined }}>
        <Stage cam={cam} bg="#070912" seed="hookC" handheld={1.2}>
          <DreamWorld f={f} pxPerUnit={zoom} />
        </Stage>
      </AbsoluteFill>
      {heartbeat > 0 ? <AbsoluteFill style={{ background: `rgba(255,59,48,${0.08 * heartbeat})`, mixBlendMode: 'screen' }} /> : null}
      {f >= HOOK.silence + HOOK.flashDur ? (
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.72) 85%)' }} />
      ) : null}
      <KineticText
        text={COPY.hook.C[orientation]}
        at={HOOK_WORDS.C}
        size={TEXT.hook[orientation]}
        emphasis={COPY.hook.C.emphasis}
        y={portrait ? 0.4 : 0.8}
        hideFrom={HOOK.silence}
      />
      {f >= HOOK.flash && f < HOOK.flash + HOOK.flashDur ? <FlashCard text={COPY.flash[orientation]} size={TEXT.flash[orientation]} /> : null}
    </AbsoluteFill>
  );
};
