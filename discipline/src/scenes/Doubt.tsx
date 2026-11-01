/**
 * THE DOUBT (1:17–1:39). Endless wavy staircase in sand tones, rain, near-silence.
 * He slows, slumps, sits on a step. The camera pulls out: the stairs never end.
 * DAY 200 → 250.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../characters/Bean';
import { POSES, climb, slump } from '../characters/poses';
import { blendPose, v2 } from '../characters/rig';
import { Shot } from '../components/Shot';
import { Stage, camScale, type Cam } from '../components/Stage';
import { PALETTES } from '../config/theme';
import { Rain } from '../fx/Atmos';
import { EASE, clamp, hash, lerp, prog, smoothstep } from '../lib/anim';
import { mix } from '../lib/color';
import { useFormat, useSvgId } from '../lib/format';
import { Cloud } from '../props/Sky';
import { K_SIT, MAIN_STAIRS, STAIR_COLORS, Staircase, stairPoint, treadOf } from '../props/Stairs';
import { BEATS, SCENES } from '../timing';

const S = SCENES.doubt;
const sh = S.shots;
const P = PALETTES.doubt;
export const TREAD = treadOf(MAIN_STAIRS);

/** Where he sits: on step K_SIT, feet two steps down. */
export const sitRoot = () => {
  const t = TREAD(K_SIT);
  return v2((t.x0 + t.x1) / 2 - 8, t.y - 16);
};
/** Feet rest one step down (he sits facing downhill). */
export const sitFeet = () => {
  const t = TREAD(K_SIT - 1);
  return v2((t.x0 + t.x1) / 2 - 4, t.y - 8.4);
};

/** Overcast world around the staircase: sky, mist banks, clouds. */
export const StairWorld: React.FC<{ f: number; k0: number; k1: number; pxPerUnit: number; warmth?: number; fogColor?: string }> = ({
  f,
  k0,
  k1,
  pxPerUnit,
  warmth = 0,
  fogColor = '#8F857A',
}) => {
  const id = useSvgId('sw');
  const top = -(K_SIT + 900) * MAIN_STAIRS.R;
  const fog = (k: number) => smoothstep((k - (K_SIT + 120)) / 380) * 0.9 + smoothstep((K_SIT - 160 - k) / 260) * 0.8;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={-(K_SIT - 400) * MAIN_STAIRS.R}>
          <stop offset="0" stopColor={mix('#4E4A45', '#F2C27E', warmth)} />
          <stop offset="0.55" stopColor={mix(P.skyTop, '#D9935E', warmth)} />
          <stop offset="1" stopColor={mix(P.skyBottom, '#B3714A', warmth)} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#FFD9A0" stopOpacity={0.35} />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-60000} y={top - 20000} width={120000} height={60000} fill={`url(#${id}-sky)`} />
      {/* where the stairs vanish: a faint warm glow — a destination */}
      <circle cx={stairPoint(MAIN_STAIRS, K_SIT + 700).x} cy={stairPoint(MAIN_STAIRS, K_SIT + 700).y} r={5200} fill={`url(#${id}-glow)`} />
      {/* cloud banks at many heights (parallax-free, big) */}
      {Array.from({ length: 22 }, (_, i) => {
        const kk = K_SIT - 300 + i * 60;
        const p = stairPoint(MAIN_STAIRS, kk);
        return (
          <Cloud
            key={i}
            x={p.x + (hash(i * 3.7) - 0.5) * 5000 + Math.sin(f * 0.004 + i) * 60}
            y={p.y - 200}
            s={6 + hash(i * 1.3) * 8}
            fill={mix(fogColor, '#F6D2A2', warmth)}
            opacity={(0.35 + 0.3 * hash(i * 9.1)) * (1 - 0.5 * warmth)}
          />
        );
      })}
      <Staircase
        spec={MAIN_STAIRS}
        k0={k0}
        k1={k1}
        colors={{
          top: mix(STAIR_COLORS.wet.top, STAIR_COLORS.warm.top, warmth),
          body: mix(STAIR_COLORS.wet.body, STAIR_COLORS.warm.body, warmth),
          under: mix(STAIR_COLORS.wet.under, STAIR_COLORS.warm.under, warmth),
          line: STAIR_COLORS.wet.line,
        }}
        pxPerUnit={pxPerUnit}
        fogColor={mix(fogColor, '#F0C08A', warmth)}
        fog={fog}
      />
    </g>
  );
};

const visibleK = (cam: Cam, width: number, height: number) => {
  const k = camScale(cam.zoom, { x: 0, y: 0, w: width, h: height });
  const half = (Math.hypot(width, height) / 2 / k) * 1.05;
  const yTop = cam.y - half;
  const yBot = cam.y + half;
  return { k0: Math.floor(-yBot / MAIN_STAIRS.R) - 4, k1: Math.ceil(-yTop / MAIN_STAIRS.R) + 4, k };
};

/* ───────── climbing slower and slower ───────── */
const ClimbSlow: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, portrait } = useFormat();
  const stop = BEATS.doubt.stop - sh.climbSlow.start;
  const s = lerp(K_SIT - 7.5, K_SIT - 0.02, EASE.outSoft(clamp(f / stop)));
  const c = climb(s, TREAD, { w: 0.85, lift: 30, lean: 12, swing: 14 });
  const breath = Math.sin(f * 0.2) * 0.012;
  const cam: Cam = { x: c.root.x + 60, y: c.root.y - 60, zoom: portrait ? 1.7 : 1.8, rot: -2 };
  const vis = visibleK(cam, width, height);
  return (
    <Stage cam={cam} bg={P.skyBottom} seed="dclimb" overlay={<Rain intensity={1} angle={12} color="#D7DEE4" />}>
      <StairWorld f={f} k0={vis.k0} k1={vis.k1} pxPerUnit={vis.k} />
      <Bean
        x={c.root.x}
        y={c.root.y}
        facing={c.facing}
        pose={{ ...c.pose, squash: 1 + breath, head: 10 + 8 * prog(f, 60, stop, EASE.soft) }}
        targets={c.targets}
        eyebrowMood={{ from: 'tired', to: 'sad', t: prog(f, 40, 140, EASE.soft) }}
        look={{ x: 0, y: 0.4 }}
        ambient={{ color: P.ambient, amount: 0.3 }}
      />
    </Stage>
  );
};

/* ───────── slumps, sits on a step ───────── */
export const SitOnStep: React.FC<{ f: number; sitT: number; slumpT: number; extra?: React.ReactNode; cam: Cam; mood?: React.ComponentProps<typeof Bean>['eyebrowMood']; look?: { x?: number; y?: number }; rain?: number; headband?: number; armsUp?: number; warmth?: number }> = ({
  f,
  sitT,
  slumpT,
  extra,
  cam,
  mood = 'sad',
  look = { x: 0, y: 0.5 },
  rain = 1,
  headband = 0,
  armsUp = 0,
  warmth = 0,
}) => {
  const { width, height } = useFormat();
  const c = climb(K_SIT - 0.02, TREAD, { w: 0.85, lift: 30, lean: 12, swing: 14 });
  const standPose = blendPose(c.pose, POSES.standSlump, slumpT);
  const seated = slump(1, 'sit');
  const pose = blendPose(standPose, seated, sitT);
  const sr = sitRoot();
  const root = v2(lerp(c.root.x, sr.x, sitT), lerp(c.root.y, sr.y, sitT));
  const feet = sitFeet();
  // he turns around to sit facing downhill
  const facing: 1 | -1 = sitT > 0.4 ? -1 : 1;
  const worldFeet = sitT > 0.4 ? { foot1: v2(feet.x + 10, feet.y), foot2: v2(feet.x - 14, feet.y) } : undefined;
  const targets = sitT > 0.4 ? {} : c.targets;
  // headband tie: hands go to the back of the head
  const hb = armsUp > 0.01 ? { hand1: v2(-30, -150), hand2: v2(-44, -160) } : {};
  const vis = visibleK(cam, width, height);
  return (
    <Stage cam={cam} bg={P.skyBottom} seed="dsit" overlay={<Rain intensity={rain} angle={12} color="#D7DEE4" />}>
      <StairWorld f={f} k0={vis.k0} k1={vis.k1} pxPerUnit={vis.k} warmth={warmth} />
      {extra}
      <Bean
        x={root.x}
        y={root.y}
        facing={facing}
        pose={pose}
        targets={{ ...targets, ...(armsUp > 0.01 ? hb : {}) }}
        worldTargets={worldFeet}
        eyebrowMood={mood}
        look={look}
        headband={headband}
        flutter={f}
        ambient={{ color: warmth > 0 ? '#FFC88F' : P.ambient, amount: 0.3 }}
      />
    </Stage>
  );
};

const Slump: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const [s0, s1] = BEATS.doubt.sitDown.map((x) => x - sh.slump.start);
  const slumpT = prog(f, 0, s0, EASE.soft);
  const sitT = prog(f, s0, s1, EASE.inOut);
  const sr = sitRoot();
  const cam: Cam = { x: sr.x + 20, y: sr.y - 70 + 20 * sitT, zoom: (portrait ? 2.5 : 2.7) + 0.5 * prog(f, 0, 150, EASE.soft), rot: 2 };
  return <SitOnStep f={f} sitT={sitT} slumpT={slumpT} cam={cam} mood={{ from: 'tired', to: 'sad', t: slumpT }} />;
};

/* ───────── the pull-out: the stairs are endless ───────── */
const PullOut: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const t = prog(f, 0, sh.pullOut.dur, EASE.inOut);
  const sr = sitRoot();
  const z0 = portrait ? 2.9 : 3.1;
  const z1 = portrait ? 0.07 : 0.06;
  const zoom = Math.exp(lerp(Math.log(z0), Math.log(z1), t));
  const mid = stairPoint(MAIN_STAIRS, K_SIT + 120);
  const drift = smoothstep(clamp((t - 0.42) / 0.58));
  const cam: Cam = {
    x: lerp(sr.x + 20, mid.x * 0.6 + sr.x * 0.4, drift),
    y: lerp(sr.y - 50, mid.y, drift),
    zoom,
    rot: lerp(2, 0, t),
  };
  return <SitOnStep f={f + 150} sitT={1} slumpT={1} cam={cam} rain={1 - 0.4 * t} />;
};

export const Doubt: React.FC = () => (
  <AbsoluteFill>
    <Shot span={sh.climbSlow} sceneStart={S.start} name="slowing">
      <ClimbSlow />
    </Shot>
    <Shot span={sh.slump} sceneStart={S.start} name="sits on a step">
      <Slump />
    </Shot>
    <Shot span={sh.pullOut} sceneStart={S.start} name="pull-out">
      <PullOut />
    </Shot>
  </AbsoluteFill>
);

