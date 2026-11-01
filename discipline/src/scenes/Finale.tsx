/**
 * FINALE (2:05–2:30). The same bedroom at 5:00 — the bed is EMPTY, sunrise floods the
 * room (payoff of the hook's right side). Cut to him on top, silhouetted against the
 * sun: DAY 365. Hold. Then D-I-S-C-I-P-L-I-N-E, then the final line.
 */
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Bean } from '../characters/Bean';
import { POSES } from '../characters/poses';
import { HIP_H, blendPose } from '../characters/rig';
import { Shot } from '../components/Shot';
import { Stage, type Cam } from '../components/Stage';
import { KineticText, StrokeText } from '../components/Text';
import { COPY, toLines } from '../config/copy';
import { PALETTES, SUNRISE, TEXT } from '../config/theme';
import { EASE, hash, lerp, prog } from '../lib/anim';
import { useFormat, useSvgId } from '../lib/format';
import { Bedroom, ROOM } from '../props/Bedroom';
import { Birds, Cloud, Sun } from '../props/Sky';
import { BEATS, SCENES } from '../timing';

const S = SCENES.finale;
const sh = S.shots;
const B = BEATS.finale;
const DAWN = PALETTES.sunrise;

/* ───────── 5:00 — the bed is empty ───────── */
const EmptyRoom: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const ring = B.alarmRing - sh.emptyRoom.start;
  const t = prog(f, 0, sh.emptyRoom.dur, EASE.soft);
  const W = ROOM.window;
  const cam: Cam = portrait
    ? { x: lerp(-20, W.x + W.w / 2, t), y: lerp(-380, W.y + W.h * 0.55, t), zoom: lerp(1.45, 2.6, t) }
    : { x: lerp(-40, W.x + W.w / 2, t), y: lerp(-330, W.y + W.h * 0.55, t), zoom: lerp(1.5, 3.0, t), rot: lerp(0, 1.5, t) };
  return (
    <Stage cam={cam} bg={DAWN.wall} seed="fnroom">
      <Bedroom
        palette={DAWN}
        sky="sunrise"
        frame={f + 40}
        flood={1}
        blanket="made"
        shoes="none"
        runner
        clock={{ time: '5:00', ring: f >= ring && f < ring + 22 ? 1 : 0, glow: 0.9, spill: 260 }}
      />
    </Stage>
  );
};

/* ───────── the summit ───────── */
export const SummitWorld: React.FC<{ f: number; arms: number }> = ({ f, arms }) => {
  const id = useSvgId('summit');
  const peakY = -420;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={-2600} x2="0" y2={200}>
          <stop offset="0" stopColor={SUNRISE.top} />
          <stop offset="0.35" stopColor={SUNRISE.upper} />
          <stop offset="0.62" stopColor={SUNRISE.mid} />
          <stop offset="0.82" stopColor={SUNRISE.low} />
          <stop offset="1" stopColor={SUNRISE.gold} />
        </linearGradient>
        <radialGradient id={`${id}-rays`}>
          <stop offset="0" stopColor={SUNRISE.sun} stopOpacity={0.5} />
          <stop offset="1" stopColor={SUNRISE.sun} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-12000} y={-12000} width={24000} height={24000} fill={`url(#${id}-sky)`} />
      {/* sun rays */}
      <g transform={`translate(0 ${peakY - 260}) rotate(${f * 0.05})`} opacity={0.55} style={{ mixBlendMode: 'screen' }}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const a2 = a + 0.09;
          return <path key={i} d={`M0 0 L${Math.cos(a) * 3200} ${Math.sin(a) * 3200} L${Math.cos(a2) * 3200} ${Math.sin(a2) * 3200} Z`} fill={`url(#${id}-rays)`} />;
        })}
      </g>
      <Sun x={0} y={peakY - 260} r={300} id={`${id}-sun`} glow={1} />
      <Birds x={-700} y={-1250} frame={f} count={4} color={SUNRISE.silhouette} s={1.6} />
      {/* sea of clouds */}
      {Array.from({ length: 18 }, (_, i) => (
        <Cloud
          key={i}
          x={-3200 + i * 380 + Math.sin(f * 0.01 + i) * 30}
          y={140 + hash(i * 1.9) * 160}
          s={3.2 + hash(i * 4.4) * 2.6}
          fill={i % 2 ? '#F6B984' : '#E9906A'}
          opacity={0.92}
        />
      ))}
      {/* the peak + the last steps */}
      <path
        d={`M-1400 400 C-900 120 -500 -40 -220 ${peakY + 70} L-110 ${peakY + 2} L110 ${peakY + 2} L240 ${peakY + 80} C520 -60 900 120 1400 400 Z`}
        fill={SUNRISE.silhouette}
        stroke={SUNRISE.rim}
        strokeWidth={2.5}
        strokeOpacity={0.8}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          x={-520 + i * 52}
          y={peakY + 80 + (6 - i) * 0 + (7 - i) * 26 - 182 + 182}
          width={54}
          height={30 + (7 - i) * 26}
          fill={SUNRISE.silhouette}
          stroke={SUNRISE.rim}
          strokeWidth={2}
          strokeOpacity={0.6}
        />
      ))}
      <Bean
        x={0}
        y={peakY - HIP_H}
        view="front"
        pose={blendPose(POSES.standTall, POSES.victory, arms)}
        silhouette={{ fill: SUNRISE.silhouette, rim: SUNRISE.rim, rimWidth: 3 }}
        headband
        flutter={f * 1.3}
      />
    </g>
  );
};

const Summit: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const t = prog(f, 0, sh.summit.dur, EASE.soft);
  const arms = prog(f, 120, 150, EASE.outBack);
  const big = B.bigDay - sh.summit.start;
  const cam: Cam = { x: 0, y: lerp(-560, -760, t), zoom: (portrait ? lerp(2.4, 1.15, t) : lerp(2.6, 1.25, t)), rot: 0 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={SUNRISE.mid} seed="fnsummit" handheld={0.6}>
        <SummitWorld f={f} arms={arms} />
      </Stage>
      <KineticText text="DAY 365" at={[big, big + 7]} size={portrait ? 170 : 190} emphasis={['365']} y={portrait ? 0.24 : 0.2} />
    </AbsoluteFill>
  );
};

/* ───────── D I S C I P L I N E ───────── */
const TitleLetters: React.FC<{ frame: number; start: number; every: number; size: number; y: number; scale?: number }> = ({
  frame: f,
  start,
  every,
  size,
  y,
  scale = 1,
}) => {
  const { fps } = useVideoConfig();
  const letters = COPY.title.split('');
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${y * 100}%`,
        transform: `translateY(-50%) scale(${scale})`,
        display: 'flex',
        justifyContent: 'center',
        gap: size * 0.04,
      }}
    >
      {letters.map((ch, i) => {
        const at = start + i * every;
        const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 320, mass: 0.6 } });
        const vis = f >= at;
        const sc = lerp(2.4, 1, s);
        const blur = (1 - s) * 10;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              visibility: vis ? 'visible' : 'hidden',
              opacity: Math.min(1, s * 2),
              transform: `translateY(${(1 - s) * -size * 0.2}px) scale(${sc})`,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
            }}
          >
            <StrokeText size={size} spacing="0">
              {ch}
            </StrokeText>
          </span>
        );
      })}
    </div>
  );
};

const TitleAndQuote: React.FC<{ phase: 'title' | 'quote' }> = ({ phase }) => {
  const f = useCurrentFrame();
  const { portrait, orientation } = useFormat();
  const abs = (phase === 'title' ? sh.title.start : sh.quote.start) + f;
  const g = abs - sh.title.start; // continuous across both shots
  const total = sh.title.dur + sh.quote.dur;
  const t = prog(g, 0, total, EASE.soft);
  const cam: Cam = { x: 0, y: lerp(-760, -1050, t), zoom: portrait ? lerp(1.15, 0.95, t) : lerp(1.25, 1.05, t) };
  const size = TEXT.title[orientation];
  const qStart = B.quoteStart - sh.title.start;
  const lift = prog(g, qStart - 10, qStart + 10, EASE.inOut);
  const quoteLines = toLines(COPY.finalLine[orientation]);
  const lineAt = (i: number) => qStart + 8 + i * (portrait ? 14 : 28);
  const fadeOut = prog(abs, S.end - 20, S.end, EASE.in);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={SUNRISE.mid} seed="fntitle" handheld={0.5}>
        <SummitWorld f={g + sh.summit.dur} arms={1} />
      </Stage>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,240,200,0.18), rgba(0,0,0,0) 60%)' }} />
      <TitleLetters frame={g} start={B.titleStart - sh.title.start} every={B.titleEvery} size={size} y={lerp(portrait ? 0.36 : 0.4, portrait ? 0.27 : 0.27, lift)} scale={lerp(1, 0.78, lift)} />
      {quoteLines.map((words, i) => {
        const at = lineAt(i);
        const vis = g >= at;
        const s = prog(g, at, at + 12, EASE.out);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(portrait ? 0.46 : 0.52) * 100 + i * (portrait ? 5.2 : 9.5)}%`,
              display: 'flex',
              justifyContent: 'center',
              visibility: vis ? 'visible' : 'hidden',
              opacity: s,
              transform: `translateY(${(1 - s) * 24}px)`,
            }}
          >
            <StrokeText size={TEXT.finalLine[orientation]} strokeRatio={0.18} weight={800}>
              {words.join(' ')}
            </StrokeText>
          </div>
        );
      })}
      {fadeOut > 0 ? <AbsoluteFill style={{ background: '#000', opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};

export const Finale: React.FC = () => (
  <AbsoluteFill>
    <Shot span={sh.emptyRoom} sceneStart={S.start} name="empty bed, 5:00">
      <EmptyRoom />
    </Shot>
    <Shot span={sh.summit} sceneStart={S.start} name="summit — DAY 365">
      <Summit />
    </Shot>
    <Shot span={sh.title} sceneStart={S.start} name="DISCIPLINE">
      <TitleAndQuote phase="title" />
    </Shot>
    <Shot span={sh.quote} sceneStart={S.start} name="final line">
      <TitleAndQuote phase="quote" />
    </Shot>
  </AbsoluteFill>
);
