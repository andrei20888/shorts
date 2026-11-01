/**
 * ACT 3 — THE CLIMB (1:39–2:05). He looks up, brows sad → determined, ties the red
 * headband (the alarm's red), stands, and climbs — faster and faster — up a flight
 * that curves toward the sun. Light warms. DAY 270 → 364.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../characters/Bean';
import { climb } from '../characters/poses';
import { v2 } from '../characters/rig';
import { Shot } from '../components/Shot';
import { Stage, camScale, type Cam } from '../components/Stage';
import { SUNRISE } from '../config/theme';
import { SpeedLines } from '../fx/Atmos';
import { EASE, clamp, hash, keys, lerp, prog } from '../lib/anim';
import { mix } from '../lib/color';
import { useFormat, useSvgId } from '../lib/format';
import { Cloud, Sun } from '../props/Sky';
import { ASCENT_STAIRS, STAIR_COLORS, Staircase, treadOf } from '../props/Stairs';
import { BEATS, SCENES } from '../timing';
import { SitOnStep, sitRoot } from './Doubt';

const S = SCENES.act3;
const sh = S.shots;
const B = BEATS.act3;
const TREAD = treadOf(ASCENT_STAIRS);

/* ───────── he looks up, headband on, stands ───────── */
const Rise: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const abs = sh.rise.start + f;
  const lookUp = prog(abs, B.lookUp, B.lookUp + 14, EASE.out);
  const brow = prog(abs, B.browShift[0], B.browShift[1], EASE.inOut);
  const armsUp = prog(abs, B.headbandTie[0], B.headbandTie[0] + 12, EASE.out) * (1 - prog(abs, B.headbandTie[1] - 6, B.headbandTie[1] + 6, EASE.inOut));
  const band = prog(abs, B.headbandTie[0] + 8, B.headbandTie[1], EASE.inOut);
  const stand = prog(abs, B.standUp[0], B.standUp[1], EASE.inOut);
  const warmth = prog(f, 30, 150, EASE.soft);
  const rain = 1 - prog(f, 8, 70, EASE.soft);
  const sr = sitRoot();
  const cam: Cam = {
    x: sr.x + 26,
    y: sr.y - 90 - 40 * stand,
    zoom: (portrait ? 3.2 : 3.5) - 1.0 * stand,
    rot: 2 - 2 * stand,
  };
  const ray = (
    <path
      d={`M${sr.x + 1200} ${sr.y - 1600} L${sr.x + 1500} ${sr.y - 1500} L${sr.x + 80} ${sr.y + 40} L${sr.x - 120} ${sr.y - 20} Z`}
      fill="#FFD58A"
      opacity={0.32 * warmth}
      style={{ mixBlendMode: 'screen' }}
    />
  );
  return (
    <SitOnStep
      f={f + 520}
      sitT={1 - stand}
      slumpT={1 - stand}
      cam={cam}
      mood={{ from: 'sad', to: 'determined', t: brow }}
      look={{ x: 0.1, y: lerp(0.5, -0.55, lookUp) + 0.3 * stand }}
      rain={rain}
      headband={band}
      armsUp={armsUp}
      warmth={warmth}
      extra={ray}
    />
  );
};

/* ───────── faster and faster ───────── */
const SPEED: number[] = (() => {
  const total = sh.climb.dur + sh.ascent.dur;
  const s: number[] = [10];
  for (let g = 1; g <= total; g++) {
    const v =
      g < sh.climb.dur
        ? lerp(0.075, 0.3, EASE.in(g / sh.climb.dur))
        : lerp(0.3, 0.44, EASE.soft((g - sh.climb.dur) / sh.ascent.dur));
    s.push(s[g - 1] + v);
  }
  return s;
})();

const ClimbRun: React.FC<{ offset: number }> = ({ offset }) => {
  const f = useCurrentFrame();
  const { width, height, portrait } = useFormat();
  const id = useSvgId('asc');
  const g = offset + f;
  const s = SPEED[Math.min(SPEED.length - 1, g)];
  const v = SPEED[Math.min(SPEED.length - 1, g + 1)] - s;
  const running = clamp((v - 0.13) / 0.08);
  const c = climb(s, TREAD, { w: lerp(0.8, 0.95, running), lift: lerp(30, 40, running), lean: lerp(10, 20, running), run: running > 0.5 });
  const theta = ASCENT_STAIRS.theta(s);
  const slopeDeg = (Math.atan2(ASCENT_STAIRS.R, ASCENT_STAIRS.D * Math.cos(theta)) * 180) / Math.PI;
  const total = sh.climb.dur + sh.ascent.dur;
  const warm = prog(g, 0, total, EASE.soft);
  const ascent = offset > 0 ? prog(f, 0, sh.ascent.dur, EASE.soft) : 0;
  // camera choreography: medium → face close-up → wide → low-angle roll → face → wide into the sun
  const zk = keys(g, [
    [0, 2.0],
    [60, 2.1],
    [84, 3.6, EASE.inOut],
    [140, 3.6],
    [176, 1.5, EASE.inOut],
    [330, 1.75],
    [360, 1.2, EASE.inOut],
    [470, 1.3],
    [500, 2.7, EASE.inOut],
    [548, 2.7],
    [590, 1.05, EASE.inOut],
    [630, 1.0],
  ]);
  const onFace = Math.max(prog(g, 60, 84, EASE.inOut) * (1 - prog(g, 140, 176, EASE.inOut)), prog(g, 470, 500, EASE.inOut) * (1 - prog(g, 548, 590, EASE.inOut)));
  const zoom = zk * (portrait ? 0.92 : 1);
  const lowAngle = prog(g, 330, 380, EASE.inOut);
  const cam: Cam = {
    x: c.root.x + lerp(110 + 40 * running, 30 * c.facing, onFace),
    y: c.root.y + lerp(-40 + 120 * lowAngle, -135, onFace),
    zoom,
    rot: -(slopeDeg - 26) * (0.3 + 0.45 * ascent) * (1 - 0.6 * onFace),
  };
  const k = camScale(zoom, { x: 0, y: 0, w: width, h: height });
  const half = Math.hypot(width, height) / 2 / k;
  const k0 = Math.floor(s - half / ASCENT_STAIRS.R) - 6;
  const k1 = Math.ceil(s + half / ASCENT_STAIRS.R) + 6;
  const sky = {
    top: mix('#B3714A', SUNRISE.gold, warm),
    mid: mix('#D9935E', SUNRISE.low, warm),
    bot: mix('#9C6A4A', SUNRISE.mid, warm),
  };
  const sunPos = v2(c.root.x + 620 - 80 * warm, c.root.y - 360 + 40 * warm);
  const flash = prog(S.shots.ascent.start + f, B.flashOut, S.end, EASE.in) * (offset > 0 ? 1 : 0);
  return (
    <>
      <Stage
        cam={cam}
        bg={sky.mid}
        seed="a3climb"
        overlay={<SpeedLines cx={width / 2} cy={height / 2} amount={Math.max(0, running - 0.4) * 0.9} color="#FFF3DC" count={30} />}
      >
        <defs>
          <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={c.root.y - 1800} x2="0" y2={c.root.y + 900}>
            <stop offset="0" stopColor={sky.top} />
            <stop offset="0.55" stopColor={sky.mid} />
            <stop offset="1" stopColor={sky.bot} />
          </linearGradient>
        </defs>
        <rect x={c.root.x - 20000} y={c.root.y - 20000} width={40000} height={40000} fill={`url(#${id}-sky)`} />
        <Sun x={sunPos.x} y={sunPos.y} r={70 + 150 * warm} id={`${id}-sun`} glow={0.5 + 0.5 * warm} core={mix('#FFE3A6', SUNRISE.sunCore, warm)} />
        {/* sea of clouds below, parting */}
        {Array.from({ length: 14 }, (_, i) => (
          <Cloud
            key={i}
            x={c.root.x - 2400 + i * 420 + (hash(i * 2.2) - 0.5) * 200 - g * 0.6 * (i % 2 ? 1 : 0.6)}
            y={c.root.y + 980 + hash(i * 3.3) * 300}
            s={3 + hash(i) * 3}
            fill={mix('#E9B48A', '#FFE0B8', warm)}
            opacity={0.75}
          />
        ))}
        <Staircase spec={ASCENT_STAIRS} k0={k0} k1={k1} colors={STAIR_COLORS.warm} pxPerUnit={k} />
        <Bean
          x={c.root.x}
          y={c.root.y}
          facing={c.facing}
          pose={c.pose}
          targets={c.targets}
          eyebrowMood={running > 0.6 ? 'angry' : 'determined'}
          mouth={running > 0.4 ? 'o' : 'none'}
          headband
          flutter={g * (1 + running)}
          sweat={0.4 + 0.5 * running}
          ambient={{ color: '#FFC88F', amount: 0.2 }}
          light={{ x: sunPos.x, y: sunPos.y, r: 1700, color: '#FFD58A', opacity: 0.35 * warm }}
        />
      </Stage>
      {flash > 0 ? <AbsoluteFill style={{ background: '#FFF4DE', opacity: flash }} /> : null}
    </>
  );
};

export const Act3Climb: React.FC = () => (
  <AbsoluteFill>
    <Shot span={sh.rise} sceneStart={S.start} name="headband on">
      <Rise />
    </Shot>
    <Shot span={sh.climb} sceneStart={S.start} name="the climb">
      <ClimbRun offset={0} />
    </Shot>
    <Shot span={sh.ascent} sceneStart={S.start} name="the ascent">
      <ClimbRun offset={sh.climb.dur} />
    </Shot>
  </AbsoluteFill>
);
