/**
 * THE TURNING POINT (0:25–0:47).
 * Lying awake → eyebrows sad → angry-determined → DAY 30 → the alarm rings and he's
 * ALREADY sitting up, staring at it → 1 s of silence → he gets up.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../characters/Bean';
import { POSES, sitUpInBed, walk } from '../characters/poses';
import { HIP_H, blendPose, v2 } from '../characters/rig';
import { Shot } from '../components/Shot';
import { Stage, type Cam } from '../components/Stage';
import { PALETTES } from '../config/theme';
import { EASE, hash, kick, lerp, prog } from '../lib/anim';
import { mixPalette } from '../lib/color';
import { useFormat } from '../lib/format';
import { Bedroom, ROOM, clockLight } from '../props/Bedroom';
import { BEATS, SCENES } from '../timing';

const S = SCENES.turning;
const sh = S.shots;
const NIGHT = PALETTES.night;
const PRE = PALETTES.predawn;
const B = BEATS.turning;

const useCam = (c: Cam, port?: Partial<Cam>): Cam => {
  const { portrait } = useFormat();
  return portrait ? { ...c, zoom: c.zoom * 0.9, ...port } : c;
};

const lyingHead = () => v2(ROOM.lying.x - 133, ROOM.lying.y - 34);

/* ───────── lying awake (wide) ───────── */
const AwakeWide: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = prog(f, 10, 110, EASE.soft);
  const cam = useCam({ x: lerp(-80, -120, sweep), y: lerp(-300, -250, sweep), zoom: lerp(1.35, 1.95, prog(f, 0, 120, EASE.soft)), rot: 0 }, { y: -320 });
  return (
    <Stage cam={cam} bg={NIGHT.wall} seed="tpwide">
      <Bedroom
        palette={NIGHT}
        sky="night"
        frame={f + 300}
        blanket="covered"
        clock={{ time: '3:47', glow: 0.95, spill: 280 }}
        occupant={
          <Bean
            x={ROOM.lying.x}
            y={ROOM.lying.y}
            pose={POSES.lieBack}
            eyebrowMood="sad"
            turn={0.05}
            look={{ x: 0.1, y: -0.8 }}
            blink={f > 60 && f < 64 ? 1 : 0}
            ambient={{ color: NIGHT.ambient, amount: NIGHT.ambientAmount }}
            light={clockLight(0.6, 300)}
          />
        }
        front={
          // headlights sweeping across the wall
          <path
            d={`M${lerp(-900, 700, sweep)} -760 L${lerp(-700, 900, sweep)} -760 L${lerp(-560, 1040, sweep)} -120 L${lerp(-980, 620, sweep)} -120 Z`}
            fill="#CFD8FF"
            opacity={0.07 * Math.sin(Math.PI * sweep)}
            style={{ mixBlendMode: 'screen' }}
          />
        }
      />
    </Stage>
  );
};

/* ───────── close-up: the brows change ───────── */
const AwakeClose: React.FC = () => {
  const f = useCurrentFrame();
  const abs = sh.awakeClose.start + f;
  const t = prog(abs, B.browShift[0], B.browShift[1], EASE.inOut);
  const beats = B.heartbeats.map((h) => kick(abs, h, 4)).reduce((a, b) => a + b, 0);
  const head = lyingHead();
  const z = (6.4 + 1.4 * prog(f, 0, 210, EASE.soft)) * (1 + 0.012 * beats);
  const cam = useCam({ x: head.x + 6, y: head.y + 2, zoom: z, rot: -6 + 3 * t }, { zoom: z * 0.95 });
  const blink = (f > 64 && f < 68) || (f > 128 && f < 131) ? 1 : 0;
  return (
    <Stage cam={cam} bg={NIGHT.wall} seed="tpclose" handheld={0.6}>
      <Bedroom
        palette={NIGHT}
        sky="night"
        frame={f + 420}
        blanket="covered"
        clock={{ time: '3:52', glow: 0.9 + 0.35 * beats, spill: 300 }}
        occupant={
          <Bean
            x={ROOM.lying.x}
            y={ROOM.lying.y}
            pose={POSES.lieBack}
            eyebrowMood={{ from: 'sad', to: 'determined', t }}
            lid={0.06 * (1 - t)}
            turn={0.05 - 0.3 * t}
            look={{ x: -0.2 * t, y: -0.7 + 0.5 * t }}
            blink={blink}
            ambient={{ color: NIGHT.ambient, amount: NIGHT.ambientAmount }}
            light={clockLight(0.75 + 0.3 * beats, 300)}
          />
        }
      />
    </Stage>
  );
};

/* ───────── the days blur: DAY 1 → DAY 30 ───────── */
const DayJump: React.FC = () => {
  const f = useCurrentFrame();
  const land = B.dayLand - sh.dayJump.start;
  const spinning = f < land;
  const time = spinning ? `${1 + Math.floor(hash(f * 3.1) * 12)}:${String(Math.floor(hash(f * 7.7) * 60)).padStart(2, '0')}` : '4:59';
  const strobe = spinning ? (f % 4 < 2 ? 1 : 0) : 0;
  const pal = mixPalette(NIGHT, PALETTES.grind, strobe * 0.5);
  const z = spinning ? 10 + f * 0.25 : 13 * (1 + 0.05 * kick(f, land, 3));
  return (
    <Stage cam={{ x: ROOM.clockFace.x, y: ROOM.clockFace.y, zoom: z, rot: spinning ? Math.sin(f * 0.8) * 3 : 0 }} bg={pal.wall} seed="tpjump">
      <Bedroom palette={pal} sky="night" frame={f} blanket="covered" clock={{ time, glow: 1.2, squash: kick(f, land, 3), spill: 300 }} />
    </Stage>
  );
};

/* ───────── DAY 30: he's ALREADY sitting up, staring at it ───────── */
const SittingUp: React.FC<{ t?: number; cam?: Cam }> = ({ t, cam: camOverride }) => {
  const cf = useCurrentFrame();
  const f = t ?? cf;
  const abs = sh.sittingUp.start + f;
  const flip = B.clockFlip - sh.sittingUp.start;
  const off = B.alarmOff - sh.sittingUp.start;
  const ringing = abs >= B.alarmRings[0] && abs < B.alarmOff;
  const reachT = prog(f, off - 26, off - 2, EASE.inOut) * (1 - prog(f, off + 10, off + 34, EASE.inOut));
  const press = kick(f, off, 3);
  const base = sitUpInBed(1);
  const pose = { ...base, torso: -6 - 10 * reachT, head: 4 };
  const snooze = v2(ROOM.clock.x, ROOM.clock.y - 66);
  const rest = v2(ROOM.sitting.x + 50, ROOM.sitting.y - 30);
  const hand = v2(lerp(rest.x, snooze.x, reachT), lerp(rest.y, snooze.y, reachT) + 6 * press);
  const autoCam = useCam(
    { x: -200, y: -232, zoom: 2.25 + 0.45 * prog(f, 0, 150, EASE.soft), rot: 0 },
    { x: -205, y: -250, zoom: 2.2 + 0.4 * prog(f, 0, 150, EASE.soft) },
  );
  const cam = camOverride ?? autoCam;
  return (
    <Stage cam={cam} bg={PRE.wall} seed="tpsit">
      <Bedroom
        palette={PRE}
        sky="predawn"
        frame={f + 600}
        blanket="lap"
        clock={{
          time: f < flip ? '4:59' : '5:00',
          ring: ringing ? 1 : 0,
          squash: press,
          glow: 1.1 + 0.3 * (ringing ? 1 : 0),
          spill: 320,
        }}
        occupant={
          <Bean
            x={ROOM.sitting.x}
            y={ROOM.sitting.y}
            pose={pose}
            eyebrowMood="determined"
            turn={-1}
            look={{ x: -0.3, y: 0.15 }}
            blink={f > 20 && f < 23 ? 1 : 0}
            ambient={{ color: PRE.ambient, amount: PRE.ambientAmount }}
            light={clockLight(0.7, 330)}
            worldTargets={reachT > 0.01 ? { hand1: hand } : undefined}
            reach={1 + 1.05 * reachT}
          />
        }
      />
    </Stage>
  );
};

/* ───────── 1 s of dead silence ───────── */
const Silence: React.FC = () => {
  const f = useCurrentFrame();
  const headPos = v2(ROOM.sitting.x - 8, ROOM.sitting.y - 138);
  return (
    <SittingUp
      t={sh.sittingUp.dur + f}
      cam={{ x: headPos.x - 18, y: headPos.y + 6, zoom: 7.2 + 0.5 * prog(f, 0, 30, EASE.soft), rot: 0 }}
    />
  );
};

/* ───────── he gets up ───────── */
const GetsUp: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const land = B.standUp - sh.getsUp.start + 6;
  const D = ROOM.door;
  if (f < 34) {
    // feet hit the floor
    const drop = prog(f, 0, land, EASE.in);
    const y = lerp(-260, 0, drop) - HIP_H + 10;
    const squash = kick(f, land, 3);
    return (
      <Stage cam={{ x: 250, y: -70, zoom: portrait ? 3.4 : 3.8, rot: 0 }} bg={PRE.wall} seed="tpfeet">
        <Bedroom palette={PRE} sky="predawn" frame={f} blanket="thrownBack" clock={{ time: '5:00', glow: 0.9 }} />
        <g transform={`translate(0 ${squash * 4})`}>
          <Bean x={250} y={y} view="front" pose={{ ...POSES.stand, leg1: { a: 6, b: 10 }, leg2: { a: 6, b: 10 } }} eyebrowMood="determined" ambient={{ color: PRE.ambient, amount: 0.3 }} />
        </g>
      </Stage>
    );
  }
  if (f < 76) {
    // he rises into frame — the camera tilts up with him
    const u = prog(f, 34, 64, EASE.out);
    const pose = blendPose({ ...POSES.sitSlump, leg1: { a: 40, b: 80 }, leg2: { a: 36, b: 76 } }, POSES.standTall, u);
    const breath = 1 + 0.025 * Math.sin(Math.max(0, f - 60) * 0.25);
    return (
      <Stage cam={{ x: 250, y: lerp(-100, -250, u), zoom: portrait ? 2.9 : 3.2, rot: lerp(3, 0, u) }} bg={PRE.wall} seed="tprise">
        <Bedroom palette={PRE} sky="predawn" frame={f} blanket="thrownBack" clock={{ time: '5:00', glow: 0.9 }} />
        <Bean
          x={250}
          y={-HIP_H + lerp(34, 0, u)}
          pose={{ ...pose, squash: pose.squash * breath }}
          eyebrowMood="determined"
          turn={lerp(0.3, 0.1, u)}
          view="side"
          ambient={{ color: PRE.ambient, amount: 0.3 }}
        />
      </Stage>
    );
  }
  // walks to the door, opens it, gone
  const w = prog(f, 76, 116, EASE.soft);
  const x = lerp(250, D.x + D.w * 0.55, w);
  const cyc = walk((f - 76) / 22);
  const doorOpen = prog(f, 88, 100, EASE.out);
  const inside = x > D.x + 20;
  return (
    <Stage cam={{ x: 300, y: -280, zoom: portrait ? 1.7 : 1.9, rot: 0 }} bg={PRE.wall} seed="tpwalk">
      <Bedroom
        palette={PRE}
        sky="predawn"
        frame={f}
        blanket="thrownBack"
        clock={{ time: '5:01', glow: 0.9 }}
        shoes={f > 80 ? 'none' : 'used'}
        front={
          <g>
            {/* doorway opening */}
            <rect x={D.x} y={-D.h} width={D.w * doorOpen} height={D.h} fill="#090B12" />
            <rect x={D.x + D.w * doorOpen} y={-D.h} width={D.w * (1 - doorOpen)} height={D.h} fill={PRE.fill} stroke={PRE.line} strokeWidth={3} opacity={doorOpen > 0 ? 1 : 0} />
            <g opacity={inside ? 1 - prog(f, 104, 114, EASE.soft) : 1}>
              <Bean x={x} y={-HIP_H} pose={cyc.pose} targets={cyc.targets} eyebrowMood="determined" ambient={{ color: PRE.ambient, amount: 0.3 }} />
            </g>
          </g>
        }
      />
    </Stage>
  );
};

export const TurningPoint: React.FC = () => (
  <AbsoluteFill>
    <Shot span={sh.awakeWide} sceneStart={S.start} name="lying awake">
      <AwakeWide />
    </Shot>
    <Shot span={sh.awakeClose} sceneStart={S.start} name="the brows change">
      <AwakeClose />
    </Shot>
    <Shot span={sh.dayJump} sceneStart={S.start} name="DAY 1 → 30">
      <DayJump />
    </Shot>
    <Shot span={sh.sittingUp} sceneStart={S.start} name="already sitting up">
      <SittingUp />
    </Shot>
    <Shot span={sh.silence} sceneStart={S.start} name="silence">
      <Silence />
    </Shot>
    <Shot span={sh.getsUp} sceneStart={S.start} name="he gets up">
      <GetsUp />
    </Shot>
  </AbsoluteFill>
);
