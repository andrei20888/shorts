/**
 * ACT 1 — THE STRUGGLE (0:03–0:25). Fast cuts, ≈3 s each. DAY 1.
 * alarm → snooze again → phone glow → the feed → junk food → mirror → the loop.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ReachArm } from '../characters/Arm';
import { Bean } from '../characters/Bean';
import { POSES, sitUpInBed } from '../characters/poses';
import { v2 } from '../characters/rig';
import { Shot } from '../components/Shot';
import { Stage, type Cam } from '../components/Stage';
import { COLORS, PALETTES } from '../config/theme';
import { EASE, hash, keys, kick, lerp, prog } from '../lib/anim';
import { useFormat, useSvgId } from '../lib/format';
import { Bedroom, ROOM, clockLight, type BlanketMode } from '../props/Bedroom';
import { BATH, Bathroom, ChipsBag, Feed, Phone, PizzaBox, Slice, SodaCan } from '../props/Sets';
import { BEATS, SCENES } from '../timing';

const P = PALETTES.night;
const S = SCENES.act1;
const sh = S.shots;
const AMB = { color: P.ambient, amount: P.ambientAmount };

/** Portrait re-framing: same world, a touch wider. */
const useCam = (c: Cam, port?: Partial<Cam>): Cam => {
  const { portrait } = useFormat();
  return portrait ? { ...c, zoom: c.zoom * 0.9, ...port } : c;
};

/* ───────── 1 · ALARM 5:00 → snooze again ───────── */
export const AlarmShot: React.FC<{ t?: number; punch?: number }> = ({ t, punch = 1 }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const ring0 = BEATS.act1.alarmRings[0] - sh.alarm.start;
  const slap = BEATS.act1.alarmSlap - sh.alarm.start;
  const pull = prog(f, 0, 34, EASE.out);
  const cam = useCam(
    {
      x: lerp(ROOM.clockFace.x, -236, pull),
      y: lerp(ROOM.clockFace.y, -214, pull),
      zoom: Math.exp(lerp(Math.log(11), Math.log(3.1), pull)) * (1 + 0.06 * prog(f, 34, 96, EASE.soft)) * punch,
      rot: lerp(0, -2, pull),
    },
    { zoom: Math.exp(lerp(Math.log(8), Math.log(2.5), pull)) * punch, x: lerp(ROOM.clockFace.x, -250, pull) },
  );
  const hand = v2(
    keys(f, [
      [slap - 16, -196],
      [slap - 6, -296, EASE.out],
      [slap, -318, EASE.inStrong],
      [slap + 14, -316],
      [slap + 30, -214, EASE.inOut],
    ]),
    keys(f, [
      [slap - 16, -184],
      [slap - 6, -296, EASE.out],
      [slap, -232, EASE.inStrong],
      [slap + 14, -230],
      [slap + 30, -186, EASE.inOut],
    ]),
  );
  const armOn = f > slap - 16 && f < slap + 30;
  return (
    <Stage cam={cam} bg={P.wall} seed="a1alarm">
      <Bedroom
        palette={P}
        sky="night"
        frame={f}
        blanket="buried"
        clock={{
          time: '5:00',
          ring: f >= ring0 && f < slap ? 1 : 0,
          squash: kick(f, slap, 3),
          glow: 1.25 + 0.4 * kick(f, slap, 5),
          spill: 340,
        }}
        occupant={
          <Bean
            x={ROOM.lying.x}
            y={ROOM.lying.y}
            pose={POSES.lieBack}
            eyebrowMood="tired"
            lid={0.15 + 0.25 * kick(f, slap, 8)}
            turn={-0.6}
            look={{ x: -0.5, y: -0.1 }}
            blink={f > 70 && f < 74 ? 1 : 0}
            ambient={AMB}
            light={clockLight(0.8, 340)}
          />
        }
        over={armOn ? <ReachArm from={v2(-178, -184)} to={hand} bend={-1} ambient={{ color: '#FF6A55', amount: 0.18 }} /> : null}
      />
    </Stage>
  );
};

/* ───────── 2 · wide: blanket over the head, snooze AGAIN ───────── */
export const BedShot: React.FC<{ t?: number; punch?: number }> = ({ t, punch = 1 }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const ring = BEATS.act1.bedRing - sh.bed.start;
  const slap = BEATS.act1.bedSlap - sh.bed.start;
  const over = f >= 12;
  const rustle = kick(f, 12, 4);
  const cam = useCam(
    { x: lerp(-170, -60, prog(f, 0, 90, EASE.soft)), y: -300, zoom: 1.45 * punch, rot: 1 },
    { x: lerp(-150, -90, prog(f, 0, 90, EASE.soft)), y: -360 },
  );
  const hand = v2(
    keys(f, [
      [slap - 12, -190],
      [slap - 4, -290, EASE.out],
      [slap, -318, EASE.inStrong],
      [slap + 12, -316],
      [slap + 26, -200, EASE.inOut],
    ]),
    keys(f, [
      [slap - 12, -170],
      [slap - 4, -290, EASE.out],
      [slap, -232, EASE.inStrong],
      [slap + 12, -230],
      [slap + 26, -170, EASE.inOut],
    ]),
  );
  return (
    <Stage cam={cam} bg={P.wall} seed="a1bed">
      <g transform={`translate(0 ${-rustle * 6}) scale(1 ${1 + rustle * 0.02})`}>
        <Bedroom
          palette={P}
          sky="night"
          frame={f}
          blanket={(over ? 'pulledOver' : 'buried') as BlanketMode}
          clock={{ time: '5:09', ring: f >= ring && f < slap ? 1 : 0, squash: kick(f, slap, 3), glow: 1.2, spill: 320 }}
          occupant={
            over ? null : (
              <Bean x={ROOM.lying.x} y={ROOM.lying.y} pose={POSES.lieBack} eyebrowMood="tired" turn={-0.5} ambient={AMB} light={clockLight(0.7, 320)} />
            )
          }
          over={f > slap - 12 && f < slap + 26 ? <ReachArm from={v2(-182, -176)} to={hand} bend={-1} ambient={{ color: '#FF6A55', amount: 0.16 }} /> : null}
        />
      </g>
    </Stage>
  );
};

/* ───────── 3 · scrolling in bed — phone glow on a tired face ───────── */
export const PhoneShot: React.FC<{ t?: number; punch?: number }> = ({ t, punch = 1 }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const scroll = Math.floor(f / 22) * 40 + 40 * EASE.out(Math.min(1, (f % 22) / 7));
  const phone = v2(-112 + Math.sin(f * 0.05) * 3, -300 + Math.sin(f * 0.07) * 2);
  const cam = useCam(
    { x: -150, y: -262, zoom: (3.5 + 0.5 * prog(f, 0, 105, EASE.soft)) * punch, rot: -3 },
    { x: -140, y: -250 },
  );
  const glow = 0.9 + 0.1 * Math.sin(f * 0.6);
  return (
    <Stage cam={cam} bg={P.wall} seed="a1phone">
      <Bedroom
        palette={P}
        sky="night"
        frame={f}
        blanket="covered"
        clock={{ time: '7:42', glow: 0.7, spill: 240 }}
        occupant={
          <Bean
            x={ROOM.lying.x}
            y={ROOM.lying.y}
            pose={POSES.lieBack}
            eyebrowMood="tired"
            lid={0.12}
            turn={0.15}
            look={{ x: 0.4, y: -0.9 }}
            blink={f % 48 > 44 ? 1 : 0}
            ambient={AMB}
            light={{ x: phone.x, y: phone.y + 40, r: 220, color: COLORS.phoneGlow, opacity: 0.75 * glow }}
            worldTargets={{ hand1: v2(phone.x + 8, phone.y + 30) }}
            reach={1.4}
          />
        }
        over={<Phone x={phone.x} y={phone.y} rot={-10} scale={1.05} scroll={scroll} palette={P} glow={glow} />}
      />
    </Stage>
  );
};

/* ───────── 4 · the feed, endless ───────── */
export const ScrollShot: React.FC<{ t?: number; punch?: number }> = ({ t, punch = 1 }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const swipes = BEATS.act1.swipes.map((s) => s - sh.scroll.start);
  let scroll = 0;
  swipes.forEach((s) => {
    scroll += 300 * EASE.out(prog(f, s, s + 9, EASE.soft));
  });
  scroll += f * 2;
  const thumbT = swipes.reduce((acc, s) => (f >= s - 6 && f < s + 10 ? (f - (s - 6)) / 16 : acc), -1);
  const { width, height, portrait } = useFormat();
  const clip = useSvgId('scr');
  const ph = portrait ? height * 0.78 : height * 0.92;
  const pw = ph * 0.5;
  const cam: Cam = { x: 0, y: 0, zoom: (1 + 0.08 * prog(f, 0, 75, EASE.soft)) * punch, rot: 4 - 3 * prog(f, 0, 75, EASE.soft) };
  return (
    <Stage cam={cam} bg="#06070B" seed="a1scroll">
      <circle cx={0} cy={0} r={pw * 1.6} fill={COLORS.phoneGlow} opacity={0.12} />
      <rect x={-pw / 2 - 14} y={-ph / 2 - 14} width={pw + 28} height={ph + 28} rx={56} fill={P.fill} stroke={P.line} strokeWidth={3} />
      <g>
        <clipPath id={clip}>
          <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={44} />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} fill="#4E6BEA" />
          <g transform={`translate(${-pw / 2} ${-ph / 2})`}>
            <Feed w={pw} h={ph} scroll={scroll} dim={0.95} />
          </g>
          {/* his tired reflection on the glass */}
          <g opacity={0.14}>
            <Bean x={0} y={ph * 0.35} scale={2.4} view="front" pose="stand" eyebrowMood="tired" lid={0.2} />
          </g>
        </g>
      </g>
      {thumbT >= 0 ? (
        <g transform={`translate(${pw * 0.3} ${ph * (0.42 - 0.5 * EASE.inOut(Math.min(1, thumbT)))})`}>
          <ellipse cx={0} cy={0} rx={pw * 0.14} ry={pw * 0.19} fill={COLORS.cream} stroke={COLORS.line} strokeWidth={3} />
        </g>
      ) : null}
      <rect x={-width} y={-height} width={width * 2} height={height * 2} fill="none" />
    </Stage>
  );
};

/* ───────── 5 · junk food ───────── */
export const JunkShot: React.FC<{ t?: number; punch?: number }> = ({ t, punch = 1 }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const bites = [18, 62];
  const toMouth = Math.max(...bites.map((b) => prog(f, b - 12, b, EASE.inOut) * (1 - prog(f, b + 6, b + 20, EASE.inOut))));
  const pose = sitUpInBed(1);
  const lean = { ...pose, torso: 10, head: 6 };
  const mouthPos = v2(ROOM.sitting.x + 34, ROOM.sitting.y - 96);
  const restPos = v2(ROOM.sitting.x + 70, ROOM.sitting.y - 34);
  const hand = v2(lerp(restPos.x, mouthPos.x, toMouth), lerp(restPos.y, mouthPos.y, toMouth));
  const chew = f > 20 && f < 50 ? (Math.floor(f / 4) % 2 ? 'o' : 'flat') : f > 64 && f < 95 ? (Math.floor(f / 4) % 2 ? 'o' : 'flat') : 'none';
  const cam = useCam(
    { x: lerp(-220, -20, prog(f, 0, 105, EASE.soft)), y: -230, zoom: 2.1 * punch, rot: -1 },
    { x: lerp(-170, -60, prog(f, 0, 105, EASE.soft)), y: -240, zoom: 1.9 * punch },
  );
  const crumbs = Array.from({ length: 8 }, (_, i) => {
    const t0 = bites[i % 2] + (i % 4) * 2;
    const tt = f - t0;
    if (tt < 0 || tt > 24) return null;
    return <circle key={i} cx={mouthPos.x + (hash(i) - 0.5) * 30} cy={mouthPos.y + 20 + tt * tt * 0.35} r={2.5} fill="#F2B04B" />;
  });
  return (
    <Stage cam={cam} bg={P.wall} seed="a1junk">
      <Bedroom
        palette={P}
        sky="night"
        frame={f}
        blanket="lap"
        clock={{ time: '1:16', glow: 0.9, spill: 260 }}
        occupant={
          <Bean
            x={ROOM.sitting.x}
            y={ROOM.sitting.y}
            pose={lean}
            eyebrowMood="tired"
            lid={0.1}
            look={{ x: 0.2, y: 0.3 }}
            mouth={chew as 'o' | 'flat' | 'none'}
            ambient={AMB}
            light={{ x: 40, y: -190, r: 200, color: COLORS.phoneGlow, opacity: 0.35 }}
            worldTargets={{ hand1: hand }}
            reach={1.2}
          />
        }
        over={
          <g>
            <PizzaBox x={60} y={-176} p={P} slices={2} />
            <ChipsBag x={150} y={-150} rot={18} p={P} />
            <Slice x={hand.x + 10} y={hand.y} rot={-170 + 30 * (1 - toMouth)} bite={f > bites[0] ? 0.8 : 0} p={P} />
            <Phone x={-10} y={-160} rot={-80} scale={0.9} scroll={f} palette={P} glow={0.5} />
            <SodaCan x={-268} y={-172} p={P} />
            <SodaCan x={-282} y={-6} rot={88} p={P} color="#E63946" />
            <SodaCan x={250} y={0} p={P} color="#2A9D8F" />
            {crumbs}
          </g>
        }
      />
    </Stage>
  );
};

/* ───────── 6 · the mirror — he looks away ───────── */
export const MirrorShot: React.FC<{ t?: number; punch?: number; mood?: 'sad' | 'determined'; lookAway?: boolean }> = ({
  t,
  punch = 1,
  mood = 'sad',
  lookAway = true,
}) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const away = lookAway ? prog(f, 46, 62, EASE.inOut) : 0;
  const cam = useCam(
    { x: -40, y: -330, zoom: (2.0 + 0.55 * prog(f, 0, 105, EASE.soft)) * punch },
    { x: -20, y: -330, zoom: (1.9 + 0.5 * prog(f, 0, 105, EASE.soft)) * punch },
  );
  const M = BATH.mirror;
  const reflScale = 1.25;
  const refl = (
    <Bean
      x={40}
      y={-440 + 138 * reflScale}
      scale={reflScale}
      view="front"
      pose={{ ...POSES.stand, head: away * 10, faceRot: away * 6 }}
      eyebrowMood={mood}
      look={{ x: -0.85 * away, y: 0.55 * away - 0.05 }}
      blink={f > 30 && f < 34 ? 1 : 0}
      ambient={{ color: '#9FB4C8', amount: 0.15 }}
    />
  );
  return (
    <Stage cam={cam} bg={P.wall} seed="a1mirror">
      <Bathroom palette={P} frame={f} reflection={refl} flicker />
      {/* him, from behind */}
      <Bean x={-230} y={-120} scale={1.35} view="front" back pose={{ ...POSES.stand, head: away * 8 }} ambient={{ color: '#05060A', amount: 0.55 }} />
      <rect x={M.x} y={M.y} width={0} height={0} />
    </Stage>
  );
};

/* ───────── 7 · the loop — again, again, again ───────── */
const LOOP: Array<{ kind: 'alarm' | 'phone' | 'junk' | 'mirror'; t: number }> = [
  { kind: 'alarm', t: 52 },
  { kind: 'phone', t: 60 },
  { kind: 'junk', t: 20 },
  { kind: 'mirror', t: 80 },
  { kind: 'alarm', t: 54 },
  { kind: 'phone', t: 70 },
  { kind: 'junk', t: 64 },
];

const LoopShot: React.FC = () => {
  const f = useCurrentFrame();
  const cuts = BEATS.act1.loopCuts.map((c) => c - sh.loop.start);
  const flop = BEATS.act1.loopFlop - sh.loop.start;
  if (f < flop - 2) {
    let idx = 0;
    cuts.forEach((c, i) => {
      if (f >= c) idx = i;
    });
    const item = LOOP[idx];
    const local = f - cuts[idx];
    const punch = 1.15 + 0.12 * idx + 0.03 * local;
    const tt = item.t + local;
    return (
      <AbsoluteFill>
        {item.kind === 'alarm' ? <AlarmShot t={tt} punch={punch} /> : null}
        {item.kind === 'phone' ? <PhoneShot t={tt} punch={punch} /> : null}
        {item.kind === 'junk' ? <JunkShot t={tt} punch={punch} /> : null}
        {item.kind === 'mirror' ? <MirrorShot t={tt} punch={punch} /> : null}
        <AbsoluteFill style={{ background: '#000', opacity: local < 1 ? 0.5 : 0 }} />
      </AbsoluteFill>
    );
  }
  // he flops back into bed; the room goes dark
  const ft = f - (flop - 2);
  const fall = prog(ft, 0, 7, EASE.in);
  const pose = sitUpInBed(1 - fall);
  const bounce = ft > 7 ? -10 * Math.sin((ft - 7) * 0.9) * Math.exp(-(ft - 7) / 4) : 0;
  return (
    <AbsoluteFill>
      <Stage cam={{ x: -100, y: -260, zoom: 1.9, rot: -2 }} bg={P.wall} seed="a1flop">
        <Bedroom
          palette={P}
          sky="night"
          frame={f}
          blanket={fall > 0.7 ? 'covered' : 'lap'}
          clock={{ time: '3:12', glow: 0.8, spill: 260 }}
          occupant={
            <Bean
              x={lerp(ROOM.sitting.x, ROOM.lying.x, fall)}
              y={lerp(ROOM.sitting.y, ROOM.lying.y, fall) + bounce}
              pose={pose}
              eyebrowMood="sad"
              turn={0.2}
              ambient={AMB}
              light={clockLight(0.6, 300)}
            />
          }
        />
      </Stage>
      <AbsoluteFill style={{ background: '#000', opacity: prog(ft, 8, 22, EASE.inOut) * 0.85 }} />
    </AbsoluteFill>
  );
};

export const Act1Struggle: React.FC = () => (
  <AbsoluteFill>
    <Shot span={sh.alarm} sceneStart={S.start} name="alarm 5:00">
      <AlarmShot />
    </Shot>
    <Shot span={sh.bed} sceneStart={S.start} name="snooze again">
      <BedShot />
    </Shot>
    <Shot span={sh.phone} sceneStart={S.start} name="phone glow">
      <PhoneShot />
    </Shot>
    <Shot span={sh.scroll} sceneStart={S.start} name="the feed">
      <ScrollShot />
    </Shot>
    <Shot span={sh.junk} sceneStart={S.start} name="junk food">
      <JunkShot />
    </Shot>
    <Shot span={sh.mirror} sceneStart={S.start} name="mirror">
      <MirrorShot />
    </Shot>
    <Shot span={sh.loop} sceneStart={S.start} name="the loop">
      <LoopShot />
    </Shot>
  </AbsoluteFill>
);
