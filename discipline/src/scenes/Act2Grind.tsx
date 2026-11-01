/**
 * ACT 2 — THE GRIND (0:47–1:17). A cut every MONTAGE_BEAT (1.5 s, 2 beats @ 80 BPM),
 * whip-pans between beats. The same 5:00 alarm shot returns 3× — he wakes faster
 * each time (visual rhyme). Day counter rolls 30 → 180 (DAY_KEYS in timing.ts).
 */
import { noise2D } from '@remotion/noise';
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Bean } from '../characters/Bean';
import { POSES, pushup, run, sitUpInBed } from '../characters/poses';
import { HIP_H, v2 } from '../characters/rig';
import { dayAt } from '../components/DayLabel';
import { Stage, type Cam } from '../components/Stage';
import { COPY } from '../config/copy';
import { COLORS, PALETTES, type Palette } from '../config/theme';
import { Whip, type WhipDir } from '../fx/Whip';
import { EASE, hash, lerp, prog } from '../lib/anim';
import { mix, mixPalette } from '../lib/color';
import { useFormat } from '../lib/format';
import { Bedroom, ROOM, clockLight } from '../props/Bedroom';
import { BATH, Bathroom, Desk, HillRoad, Notebook, OpenBook, Street, hillGroundY } from '../props/Sets';
import { ALARM_BEEP_OFFSET, ALARM_WAKE_DELAY, MONTAGE, SCENES, WHIP_FRAMES, type MontageBeat } from '../timing';

const S = SCENES.act2;
const N = MONTAGE.length;

/** Palette drifts from pre-dawn blue to grey-blue across the montage. */
const paletteAt = (i: number): Palette => mixPalette(PALETTES.predawn, PALETTES.grind, Math.min(1, i / (N * 0.6)));
const ambientOf = (p: Palette) => ({ color: p.ambient, amount: p.ambientAmount });

const useCam = (c: Cam, port?: Partial<Cam>): Cam => {
  const { portrait } = useFormat();
  return portrait ? { ...c, zoom: c.zoom * 0.88, ...port } : c;
};

/* ───────── ALARM (visual rhyme ×3) ───────── */
const AlarmBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const p = paletteAt(b.index);
  const beep = ALARM_BEEP_OFFSET;
  const wake = beep + ALARM_WAKE_DELAY[b.rep];
  const up = prog(f, wake, wake + 6, EASE.out);
  const awakeAlready = b.rep >= 2;
  const ringing = f >= beep && f < wake + 8;
  // identical framing every time — that's the rhyme
  const cam = useCam({ x: -190, y: -236, zoom: 2.4, rot: 0 }, { x: -200, y: -250, zoom: 2.3 });
  const sitting = up > 0.5;
  return (
    <Stage cam={cam} bg={p.wall} seed="a2alarm" handheld={0.5}>
      <Bedroom
        palette={p}
        sky="predawn"
        frame={f + b.index * 7}
        blanket={sitting ? 'lap' : 'covered'}
        shoes="used"
        clock={{ time: '5:00', ring: ringing ? 1 : 0, glow: 1.2, spill: 320 }}
        occupant={
          <Bean
            x={lerp(ROOM.lying.x, ROOM.sitting.x, up)}
            y={lerp(ROOM.lying.y, ROOM.sitting.y, up)}
            pose={sitUpInBed(up)}
            eyebrowMood="determined"
            blink={f < beep && !awakeAlready ? 1 : 0}
            turn={lerp(0.1, -0.8, up)}
            look={{ x: -0.3, y: 0 }}
            ambient={ambientOf(p)}
            light={clockLight(0.7, 320)}
          />
        }
      />
    </Stage>
  );
};

/* ───────── RUN ───────── */
const Puffs: React.FC<{ x: number; y: number; f: number; every?: number }> = ({ x, y, f, every = 16 }) => (
  <g>
    {[0, 1, 2].map((k) => {
      const t0 = Math.floor(f / every) * every - k * every;
      const tt = f - t0;
      if (tt < 0 || tt > every * 2.5) return null;
      const u = tt / (every * 2.5);
      return <circle key={k} cx={x - 30 - 70 * u} cy={y - 6 - 18 * u} r={6 + 16 * u} fill="#E8E4D8" opacity={0.35 * (1 - u)} />;
    })}
  </g>
);

const RunBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const p = paletteAt(b.index);
  const sprint = b.rep >= 3;
  const speed = sprint ? 30 : 22;
  const dist = f * speed + b.index * 900;
  const cyc = run(f / (sprint ? 13 : 16) + b.index * 0.3, { lean: sprint ? 18 : 13 });
  const amb = ambientOf(p);
  const variant = b.rep % 2 === 0 && b.rep < 4 ? 'street' : 'hill';
  const gy = hillGroundY(0);
  const streetCam = useCam(
    { x: 40, y: -230, zoom: (b.rep === 4 ? 2.4 : 1.7) * (1 + 0.05 * prog(f, 0, 45, EASE.soft)), rot: b.rep === 4 ? -3 : 0 },
    { y: -260 },
  );
  const hillCam = useCam({ x: 60, y: gy - 230, zoom: portrait ? 1.6 : 1.75, rot: 4 }, { y: gy - 260 });
  if (variant === 'street') {
    const dawn = Math.min(1, b.index / 18);
    const cam = streetCam;
    return (
      <Stage cam={cam} bg="#0B0E18" seed="a2run">
        <Street palette={p} scroll={dist} dawn={dawn} frame={f} />
        <Bean x={0} y={-HIP_H} pose={cyc.pose} targets={cyc.targets} eyebrowMood="determined" mouth="o" ambient={amb} sweat={sprint ? 0.6 : 0} />
        <Puffs x={40} y={-150} f={f} />
      </Stage>
    );
  }
  const warmth = Math.min(0.5, b.index / 36);
  const cam = hillCam;
  return (
    <Stage cam={cam} bg="#1E2532" seed="a2hill">
      <HillRoad scroll={dist} warmth={warmth} />
      <Bean x={0} y={gy - HIP_H - 4} rot={-8} pose={cyc.pose} targets={cyc.targets} eyebrowMood="determined" mouth="o" ambient={amb} sweat={0.5} />
      <Puffs x={40} y={gy - 150} f={f} />
    </Stage>
  );
};

/* ───────── PUSH-UPS ───────── */
const PushupBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const p = paletteAt(b.index);
  const pu = pushup((f / 22.5 + 0.25) % 1, 0, 250);
  const cams: Cam[] = [
    { x: 300, y: -90, zoom: 2.8, rot: 0 },
    { x: 360, y: -110, zoom: 4.6, rot: -4 },
    { x: 200, y: -200, zoom: 1.9, rot: 2 },
  ];
  const c = cams[b.rep % 3];
  const cam = useCam({ ...c, zoom: c.zoom * (1 + 0.05 * prog(f, 0, 45, EASE.soft)) });
  return (
    <Stage cam={cam} bg={p.wall} seed="a2push">
      <Bedroom palette={p} sky="predawn" frame={f} blanket="thrownBack" shoes="none" clock={{ time: `5:${String(12 + b.rep * 3).padStart(2, '0')}`, glow: 1 }} door={false} />
      <Bean x={pu.root.x} y={pu.root.y} rot={pu.rot} pose={pu.pose} targets={pu.targets} eyebrowMood="angry" mouth={pu.depth > 0.6 ? 'grit' : 'o'} sweat={0.5 + 0.2 * b.rep} ambient={ambientOf(p)} />
      {/* sweat drops falling */}
      {[0, 1].map((k) => {
        const t0 = 12 + k * 18;
        const tt = f - t0;
        if (tt < 0 || tt > 14) return null;
        return <circle key={k} cx={pu.root.x + 120 + k * 8} cy={pu.root.y - 30 + tt * tt * 0.6} r={4} fill="#BFE3FF" />;
      })}
    </Stage>
  );
};

/* ───────── BOOKS ───────── */
const BooksBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const p = mixPalette(paletteAt(b.index), PALETTES.night, 0.25);
  const seatY = -40;
  const root = v2(-60, seatY - 12);
  const turn = prog(f, 18, 30, EASE.inOut);
  const book = v2(root.x + 80, root.y - 38);
  const cams: Cam[] = [
    { x: 30, y: -150, zoom: 2.5, rot: 0 },
    { x: 0, y: -170, zoom: 4.2, rot: 3 },
    { x: 60, y: -200, zoom: 1.9, rot: -2 },
  ];
  const cam = useCam({ ...cams[b.rep % 3], zoom: cams[b.rep % 3].zoom * (1 + 0.06 * prog(f, 0, 45, EASE.soft)) });
  return (
    <Stage cam={cam} bg={p.wall} seed="a2books">
      <rect x={-3000} y={-3000} width={6000} height={3000} fill={p.wall} />
      <rect x={-3000} y={0} width={6000} height={2000} fill={p.floor} />
      <line x1={-3000} y1={0} x2={3000} y2={0} stroke={p.line} strokeWidth={3} />
      <Desk palette={p} books={3 + b.rep * 4} x={10} top={-112} />
      {/* stool */}
      <rect x={root.x - 46} y={seatY} width={92} height={12} rx={5} fill={p.fill3} stroke={p.line} strokeWidth={3} />
      <rect x={root.x - 34} y={seatY + 12} width={10} height={-seatY - 12} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <rect x={root.x + 24} y={seatY + 12} width={10} height={-seatY - 12} fill={p.fill2} stroke={p.line} strokeWidth={3} />
      <Bean
        x={root.x}
        y={root.y}
        pose={{ ...POSES.sit, torso: 10, head: 14 }}
        eyebrowMood="focused"
        look={{ x: 0.3, y: 0.55 }}
        worldTargets={{ hand1: v2(book.x + 22, book.y - 10), hand2: v2(book.x - 18, book.y - 6) }}
        ambient={{ color: '#FFB45A', amount: 0.12 }}
        light={{ x: 150, y: -260, r: 380, color: '#FFD58A', opacity: 0.45 }}
      />
      <OpenBook x={book.x} y={book.y} rot={-14} turn={turn} palette={p} s={1.15} />
    </Stage>
  );
};

/* ───────── COLD WATER (mirror rhyme — this time he looks) ───────── */
const WaterBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const p = paletteAt(b.index);
  const splash = 12;
  const hands = prog(f, 4, splash, EASE.in) * (1 - prog(f, splash + 6, splash + 16, EASE.out));
  const reflScale = 1.25;
  const head = v2(40, -440);
  const rootY = head.y + 138 * reflScale;
  const handT = v2(head.x, head.y + 30);
  const drops = Array.from({ length: 22 }, (_, i) => {
    const tt = f - splash;
    if (tt < 0 || tt > 20) return null;
    const a = hash(i * 2.3) * Math.PI * 2;
    const sp = 6 + 12 * hash(i * 5.1);
    return (
      <circle
        key={i}
        cx={head.x + Math.cos(a) * sp * tt * 1.6}
        cy={head.y + 10 + Math.sin(a) * sp * tt * 1.2 + 0.5 * tt * tt}
        r={(3 + 5 * hash(i)) * reflScale}
        fill="#CDEBFF"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        opacity={1 - tt / 20}
      />
    );
  });
  const refl = (
    <g>
      <Bean
        x={head.x}
        y={rootY}
        scale={reflScale}
        view="front"
        pose="stand"
        eyebrowMood={f > splash + 6 ? 'determined' : 'focused'}
        blink={f >= splash - 2 && f < splash + 5 ? 1 : 0}
        look={{ x: 0, y: 0 }}
        worldTargets={hands > 0.02 ? { hand1: v2(handT.x + 26 * reflScale, handT.y), hand2: v2(handT.x - 26 * reflScale, handT.y) } : undefined}
        sweat={f > splash ? 1 : 0}
        ambient={{ color: '#9FB4C8', amount: 0.12 }}
      />
      {drops}
    </g>
  );
  const cam = useCam({ x: -20, y: -360, zoom: 2.4 + 0.25 * b.rep + 0.3 * prog(f, 0, 45, EASE.soft), rot: 0 });
  return (
    <Stage cam={cam} bg={p.wall} seed="a2water">
      <Bathroom palette={p} frame={f} reflection={refl} water={1 - prog(f, splash, splash + 10)} />
      <Bean x={-230} y={-120} scale={1.35} view="front" back pose={{ ...POSES.stand, arm1: { a: 20 + 140 * hands, b: 30 }, arm2: { a: 20 + 140 * hands, b: 30 } }} ambient={{ color: '#05060A', amount: 0.55 }} />
      <rect x={BATH.mirror.x} y={0} width={0} height={0} />
    </Stage>
  );
};

/* ───────── CHECKLIST (top-down) ───────── */
const ChecklistBeat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  const f = useCurrentFrame();
  const { portrait } = useFormat();
  const p = paletteAt(b.index);
  const from = [0, 2, 4][Math.min(2, b.rep)];
  const to = [2, 4, 5][Math.min(2, b.rep)];
  const ticks = lerp(from, to, prog(f, 6, 40, EASE.inOut));
  const day = Math.round(dayAt(b.start + 6));
  const cam: Cam = { x: 0, y: 0, zoom: (portrait ? 1.05 : 1.12) * (1 + 0.05 * prog(f, 0, 45, EASE.soft)), rot: -4 + b.rep * 3 + noise2D('ck', f * 0.02, b.rep) };
  return (
    <Stage cam={cam} bg={mix(p.fill, '#2A1F1A', 0.6)} seed="a2check">
      <rect x={-3000} y={-3000} width={6000} height={6000} fill={mix(p.fill, '#2A1F1A', 0.6)} />
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={-3000} y1={-1400 + i * 200} x2={3000} y2={-1400 + i * 200 + 60} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />
      ))}
      <Notebook items={COPY.checklist} ticks={ticks} title={`DAY ${day}`} palette={p} frame={f} />
    </Stage>
  );
};

/* ───────── the montage ───────── */
const BOUNDARY: WhipDir[] = Array.from({ length: N + 1 }, (_, j) => (j % 3 === 2 ? 'up' : j % 2 ? 'left' : 'right'));

const Beat: React.FC<{ b: MontageBeat }> = ({ b }) => {
  switch (b.kind) {
    case 'alarm':
      return <AlarmBeat b={b} />;
    case 'run':
      return <RunBeat b={b} />;
    case 'pushup':
      return <PushupBeat b={b} />;
    case 'books':
      return <BooksBeat b={b} />;
    case 'water':
      return <WaterBeat b={b} />;
    default:
      return <ChecklistBeat b={b} />;
  }
};

export const Act2Grind: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.black }}>
    {MONTAGE.map((b) => (
      <Sequence key={b.index} from={b.start - S.start} durationInFrames={b.dur} name={`${b.index + 1}. ${b.kind}`}>
        <Whip
          dur={b.dur}
          frames={WHIP_FRAMES}
          inDir={b.index === 0 ? 'left' : BOUNDARY[b.index]}
          outDir={b.index === N - 1 ? null : BOUNDARY[b.index + 1]}
        >
          <Beat b={b} />
        </Whip>
      </Sequence>
    ))}
  </AbsoluteFill>
);

