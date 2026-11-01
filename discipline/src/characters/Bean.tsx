import React from 'react';
import { COLORS, LINE } from '../config/theme';
import { mix } from '../lib/color';
import { useSvgId } from '../lib/format';
import { resolveMood, type Brow, type MoodInput } from './moods';
import { POSES, run, walk, type PoseName } from './poses';
import { RIG, capsule, rotV, solve, torsoPath, v2, type Pose, type Targets, type V2, type View } from './rig';

export type Mouth = 'none' | 'o' | 'flat' | 'smile' | 'frown' | 'grit';
export type Part = 'arm1' | 'arm2' | 'leg1' | 'leg2' | 'torso' | 'head';

export type BeanProps = {
  /** Root = standing pelvis position (ground is HIP_H below). */
  x?: number;
  y?: number;
  scale?: number;
  facing?: 1 | -1;
  rot?: number;
  view?: View;
  /** Preset name, a cycle ('walk' | 'run' driven by legPhase) or a full Pose. */
  pose?: PoseName | 'walk' | 'run' | Pose;
  legPhase?: number;
  /** Override [shoulder, elbow] angles. */
  armAngles?: { arm1?: [number, number]; arm2?: [number, number] };
  targets?: Targets;
  /** IK targets in WORLD coords (converted with this Bean's transform). */
  worldTargets?: Targets;
  eyebrowMood?: MoodInput;
  /** 0 = open, 1 = closed. */
  blink?: number;
  look?: { x?: number; y?: number };
  /** Side view head turn: 1 = profile toward facing, 0 = to camera, -1 = looking back. */
  turn?: number;
  lid?: number;
  mouth?: Mouth;
  sparkle?: boolean;
  /** Headband tie progress 0..1 (true = tied). */
  headband?: number | boolean;
  flutter?: number;
  ambient?: { color: string; amount: number };
  /** Radial light in WORLD coords (e.g. phone glow, clock glow, sunrise). */
  light?: { x: number; y: number; r: number; color: string; opacity: number } | null;
  light2?: { x: number; y: number; r: number; color: string; opacity: number } | null;
  silhouette?: { fill: string; rim?: string; rimWidth?: number } | null;
  outline?: string;
  outlineWidth?: number;
  only?: Part[];
  hide?: Part[];
  opacity?: number;
  sweat?: number;
  /** Back view: no face. */
  back?: boolean;
  /** Arm1 length multiplier (cartoon stretch for a reach). */
  reach?: number;
};

const circ = (c: V2, r: number) => `M${c.x - r} ${c.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

const resolvePose = (p: BeanProps): { pose: Pose; targets: Targets } => {
  const phase = p.legPhase ?? 0;
  let pose: Pose;
  let targets: Targets = {};
  if (p.pose === 'walk') ({ pose, targets } = walk(phase));
  else if (p.pose === 'run') ({ pose, targets } = run(phase));
  else if (typeof p.pose === 'string') pose = POSES[p.pose];
  else pose = p.pose ?? POSES.stand;
  if (p.armAngles?.arm1) pose = { ...pose, arm1: { a: p.armAngles.arm1[0], b: p.armAngles.arm1[1] } };
  if (p.armAngles?.arm2) pose = { ...pose, arm2: { a: p.armAngles.arm2[0], b: p.armAngles.arm2[1] } };
  return { pose, targets: { ...targets, ...(p.targets ?? {}) } };
};

/** The film's hero. A rigged, outlined, eyebrow-driven bean. */
export const Bean: React.FC<BeanProps> = (props) => {
  const {
    x = 0,
    y = 0,
    scale = 1,
    facing = 1,
    rot = 0,
    view = 'side',
    blink = 0,
    look = {},
    turn = 1,
    lid = 0,
    mouth = 'none',
    sparkle = false,
    headband = 0,
    flutter = 0,
    ambient,
    light,
    light2,
    silhouette,
    outlineWidth = LINE.width,
    only,
    hide,
    opacity = 1,
    sweat = 0,
    back = false,
    reach = 1,
  } = props;
  const uid = useSvgId('bean');
  // World → local (lights / world-space IK targets)
  const toLocal = (wx: number, wy: number) => {
    const p = rotV(v2((wx - x) / scale, (wy - y) / scale), -rot);
    return v2(p.x * facing, p.y);
  };
  const resolved = resolvePose(props);
  const pose = resolved.pose;
  const targets: Targets = { ...resolved.targets };
  if (props.worldTargets) {
    for (const k of Object.keys(props.worldTargets) as Array<keyof Targets>) {
      const t = props.worldTargets[k];
      if (t) targets[k] = toLocal(t.x, t.y);
    }
  }
  const sk = solve(pose, view, targets, reach);
  const brow = resolveMood(props.eyebrowMood);
  const side = view === 'side';

  const amb = ambient ?? { color: COLORS.cream, amount: 0 };
  const fillMain = silhouette ? silhouette.fill : mix(COLORS.cream, amb.color, amb.amount);
  const fillFar = silhouette ? silhouette.fill : mix(COLORS.creamShade, amb.color, amb.amount * 0.9);
  const outline = silhouette ? silhouette.rim : props.outline ?? COLORS.line;
  const ow = silhouette ? silhouette.rimWidth ?? 2 : outlineWidth;

  const armShapes = (s: V2, e: V2, h: V2) => [capsule(s, e, RIG.armR), capsule(e, h, RIG.armR * 0.95), circ(h, RIG.handR)];
  const legShapes = (hp: V2, k: V2, a: V2, t: V2) =>
    side
      ? [capsule(hp, k, RIG.legR), capsule(k, a, RIG.legR * 0.95), capsule(a, t, RIG.footR)]
      : [capsule(hp, k, RIG.legR), capsule(k, a, RIG.legR * 0.95), capsule(a, t, RIG.footR * 1.05)];

  const shapes: Record<Part, string[]> = {
    arm1: armShapes(sk.shoulder1, sk.elbow1, sk.hand1),
    arm2: armShapes(sk.shoulder2, sk.elbow2, sk.hand2),
    leg1: legShapes(sk.hip1, sk.knee1, sk.ankle1, sk.toe1),
    leg2: legShapes(sk.hip2, sk.knee2, sk.ankle2, sk.toe2),
    torso: [torsoPath(sk.pose)],
    head: [circ(sk.head, RIG.headR)],
  };

  const order: Array<{ part: Part; fill: string; ink?: 'torso' | 'upper' | 'leg2' }> = side
    ? [
        { part: 'arm2', fill: fillFar },
        { part: 'leg2', fill: fillFar },
        { part: 'leg1', fill: fillMain, ink: 'leg2' },
        { part: 'torso', fill: fillMain },
        { part: 'head', fill: fillMain, ink: 'torso' },
        { part: 'arm1', fill: fillMain, ink: 'upper' },
      ]
    : [
        { part: 'leg1', fill: fillMain },
        { part: 'leg2', fill: fillMain },
        { part: 'torso', fill: fillMain },
        { part: 'head', fill: fillMain, ink: 'torso' },
        { part: 'arm1', fill: fillMain, ink: 'torso' },
        { part: 'arm2', fill: fillMain, ink: 'torso' },
      ];
  const visible = order.filter((l) => (!only || only.includes(l.part)) && !(hide && hide.includes(l.part)));

  const lights = [light, light2].filter(Boolean) as NonNullable<BeanProps['light']>[];
  const drawFace = !silhouette && !back && visible.some((l) => l.part === 'head');
  const hb = headband === true ? 1 : headband === false ? 0 : headband;

  const pathsFor = (parts: Part[]) => parts.flatMap((p) => shapes[p]).map((d, i) => <path key={i} d={d} />);

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale * facing} ${scale})`} opacity={opacity}>
      <defs>
        <clipPath id={`${uid}-torso`}>{pathsFor(['torso'])}</clipPath>
        <clipPath id={`${uid}-upper`}>{pathsFor(['torso', 'head', 'leg1', 'leg2'])}</clipPath>
        <clipPath id={`${uid}-leg2`}>{pathsFor(['leg2'])}</clipPath>
        <clipPath id={`${uid}-sil`}>{pathsFor(visible.map((l) => l.part))}</clipPath>
        {lights.map((l, i) => {
          const c = toLocal(l.x, l.y);
          return (
            <radialGradient key={i} id={`${uid}-l${i}`} gradientUnits="userSpaceOnUse" cx={c.x} cy={c.y} r={l.r / scale}>
              <stop offset="0" stopColor={l.color} stopOpacity={1} />
              <stop offset="0.45" stopColor={l.color} stopOpacity={0.45} />
              <stop offset="1" stopColor={l.color} stopOpacity={0} />
            </radialGradient>
          );
        })}
      </defs>
      {visible.map(({ part, fill, ink }) => (
        <g key={part}>
          {outline ? (
            <g fill={outline} stroke={outline} strokeWidth={ow * 2} strokeLinejoin="round">
              {shapes[part].map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          ) : null}
          {ink && !silhouette ? (
            <g clipPath={`url(#${uid}-${ink})`} fill="none" stroke={COLORS.ink} strokeOpacity={0.88} strokeWidth={LINE.innerWidth * 2}>
              {shapes[part].map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          ) : null}
          <g fill={fill}>
            {shapes[part].map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          {part === 'head' && drawFace ? (
            <g transform={`translate(${sk.head.x} ${sk.head.y}) rotate(${sk.headAngle})`}>
              <Face brow={brow} side={side} turn={turn} look={look} blink={blink} lid={lid} mouth={mouth} sparkle={sparkle} skin={fillMain} />
              {hb > 0 ? <Headband t={hb} side={side} flutter={flutter} uid={uid} /> : null}
              {sweat > 0 ? <Sweat amount={sweat} side={side} /> : null}
            </g>
          ) : null}
          {part === 'head' && silhouette && hb > 0 ? (
            <g transform={`translate(${sk.head.x} ${sk.head.y}) rotate(${sk.headAngle})`}>
              <Headband t={hb} side={side} flutter={flutter} uid={uid} />
            </g>
          ) : null}
        </g>
      ))}
      {!silhouette && lights.length ? (
        <mask id={`${uid}-lm`} maskUnits="userSpaceOnUse" x={-400} y={-500} width={800} height={900}>
          <g fill="#FFFFFF">{pathsFor(visible.map((l) => l.part))}</g>
          {drawFace ? (
            <g transform={`translate(${sk.head.x} ${sk.head.y}) rotate(${sk.headAngle})`}>
              <Face brow={brow} side={side} turn={turn} look={look} blink={blink} lid={lid} mouth={mouth} sparkle={false} skin="#FFFFFF" mask />
            </g>
          ) : null}
        </mask>
      ) : null}
      {!silhouette && lights.length ? (
        <g mask={`url(#${uid}-lm)`} style={{ mixBlendMode: 'screen' }}>
          {lights.map((l, i) => {
            const c = toLocal(l.x, l.y);
            return <circle key={i} cx={c.x} cy={c.y} r={l.r / scale} fill={`url(#${uid}-l${i})`} opacity={l.opacity} />;
          })}
        </g>
      ) : null}
    </g>
  );
};

/* ───────────────────────── FACE ───────────────────────── */

const Face: React.FC<{
  brow: Brow;
  side: boolean;
  turn: number;
  look: { x?: number; y?: number };
  blink: number;
  lid: number;
  mouth: Mouth;
  sparkle: boolean;
  skin: string;
  /** Render eyes/brows in black only (light mask). */
  mask?: boolean;
}> = ({ brow, side, turn, look, blink, lid, mouth, sparkle, skin, mask = false }) => {
  const INK = mask ? '#000000' : COLORS.ink;
  const lx = Math.max(-1, Math.min(1, look.x ?? 0));
  const ly = Math.max(-1, Math.min(1, look.y ?? 0));
  const center = side ? 14 * turn + lx * 9 : lx * 15;
  const spacing = side ? RIG.eyeDX * (1 - 0.14 * Math.abs(turn) - 0.1 * Math.abs(lx)) : RIG.eyeDX;
  const ey = RIG.eyeY + ly * 7;
  const r = RIG.eyeR;
  const L = Math.min(1, Math.max(0, brow.lid + lid, blink));
  const tilt = Math.tan((brow.lidTilt * Math.PI) / 180);
  const eyes = [
    { cx: center + spacing, s: 1 },
    { cx: center - spacing, s: -1 },
  ];
  const bw = RIG.browW * brow.w;
  return (
    <g>
      {eyes.map(({ cx, s }, i) => {
        // s = +1: eye on +x side (inner end toward -x)
        const y0 = ey - r + 2 * r * L;
        const xin = cx - s * (r + 3);
        const xout = cx + s * (r + 3);
        const yin = y0 + tilt * (r + 3);
        const yout = y0 - tilt * (r + 3);
        const by = ey + RIG.browY + brow.y;
        const half = RIG.browLen / 2;
        const bx = cx + s * 1.8;
        const bi = { x: bx - s * half, y: by + brow.inner };
        const bo = { x: bx + s * half, y: by + brow.outer };
        const bc = { x: bx, y: (bi.y + bo.y) / 2 - brow.arch * 2 };
        return (
          <g key={i}>
            {L < 0.93 ? <circle cx={cx} cy={ey} r={r} fill={INK} /> : null}
            {sparkle && L < 0.6 ? <circle cx={cx - r * 0.34} cy={ey - r * 0.36} r={r * 0.28} fill={COLORS.cream} /> : null}
            {L > 0.02 && L < 0.93 && !mask ? (
              <polygon
                points={`${xin},${ey - r - 7} ${xout},${ey - r - 7} ${xout},${Math.min(yout, ey + r + 1)} ${xin},${Math.min(yin, ey + r + 1)}`}
                fill={skin}
              />
            ) : null}
            {L >= 0.93 ? (
              <path
                className="scale-stroke"
                d={`M${cx - r * 1.05} ${ey + 1} Q${cx} ${ey + r * 0.75} ${cx + r * 1.05} ${ey + 1}`}
                stroke={INK}
                strokeWidth={3.4}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
            <path
              className="scale-stroke"
              d={`M${bi.x} ${bi.y} Q${bc.x} ${bc.y} ${bo.x} ${bo.y}`}
              stroke={INK}
              strokeWidth={bw}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
      })}
      {mask ? null : <MouthShape type={mouth} x={center * 0.92} y={ey + 22} />}
    </g>
  );
};

const MouthShape: React.FC<{ type: Mouth; x: number; y: number }> = ({ type, x, y }) => {
  if (type === 'none') return null;
  const common = { className: 'scale-stroke', stroke: COLORS.ink, strokeWidth: 3.2, strokeLinecap: 'round' as const, fill: 'none' };
  if (type === 'o') return <ellipse cx={x} cy={y} rx={4.4} ry={5.4} fill={COLORS.ink} />;
  if (type === 'flat') return <path {...common} d={`M${x - 6} ${y}L${x + 6} ${y}`} />;
  if (type === 'smile') return <path {...common} d={`M${x - 8} ${y - 1}Q${x} ${y + 6} ${x + 8} ${y - 1}`} />;
  if (type === 'frown') return <path {...common} d={`M${x - 7} ${y + 3}Q${x} ${y - 3} ${x + 7} ${y + 3}`} />;
  return <rect x={x - 7} y={y - 2.5} width={14} height={5} rx={2.5} fill={COLORS.ink} />;
};

/* ───────────────────────── HEADBAND ───────────────────────── */

const Headband: React.FC<{ t: number; side: boolean; flutter: number; uid: string; color?: string }> = ({
  t,
  side,
  flutter,
  uid,
  color = COLORS.headband,
}) => {
  const R = RIG.headR;
  const wrap = Math.min(1, t / 0.55);
  const tails = Math.max(0, (t - 0.45) / 0.55);
  const clipW = 2 * R * wrap;
  const back = side ? -R + 4 : 0;
  const tailPath = (i: number) => {
    const len = 46 * tails;
    const pts: string[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const px = back - (side ? 1 : 0.2) * len * u - (side ? 0 : (i === 0 ? -1 : 1) * 30 * u);
      const py = -36 + 14 * u + i * 6 + Math.sin(flutter * 0.42 + u * 4.5 + i * 1.7) * 7 * u;
      pts.push(`${k === 0 ? 'M' : 'L'}${px} ${py}`);
    }
    return pts.join('');
  };
  return (
    <g>
      <defs>
        <clipPath id={`${uid}-hb`}>
          <circle cx={0} cy={0} r={R + 0.5} />
        </clipPath>
        <clipPath id={`${uid}-hbw`}>
          <rect x={side ? -R - 2 : -R} y={-R} width={clipW + 4} height={2 * R} />
        </clipPath>
      </defs>
      {tails > 0
        ? [0, 1].map((i) => (
            <path
              key={i}
              className="scale-stroke"
              d={tailPath(i)}
              stroke={color}
              strokeWidth={8 - i * 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))
        : null}
      <g clipPath={`url(#${uid}-hb)`}>
        <g clipPath={`url(#${uid}-hbw)`}>
          <path d={`M${-R - 4} -47 Q0 -40 ${R + 4} -47 L${R + 4} -31 Q0 -24 ${-R - 4} -31 Z`} fill={color} />
          <path
            className="scale-stroke"
            d={`M${-R - 4} -31 Q0 -24 ${R + 4} -31`}
            stroke="#000"
            strokeOpacity={0.18}
            strokeWidth={3}
            fill="none"
          />
        </g>
      </g>
      {tails > 0 && side ? <circle cx={back} cy={-38} r={6.5 * Math.min(1, tails * 1.6)} fill={color} /> : null}
    </g>
  );
};

const Sweat: React.FC<{ amount: number; side: boolean }> = ({ amount, side }) => {
  const a = Math.min(1, amount);
  const drop = (x: number, y: number, s: number, i: number) => (
    <path
      key={i}
      d={`M${x} ${y - 9 * s} Q${x + 6 * s} ${y + 2 * s} ${x} ${y + 6 * s} Q${x - 6 * s} ${y + 2 * s} ${x} ${y - 9 * s} Z`}
      fill="#BFE3FF"
      stroke={COLORS.line}
      strokeWidth={1.5}
      opacity={a}
    />
  );
  return <g>{[drop(side ? -30 : 44, -24, 1, 0), drop(side ? -40 : -46, -2, 0.75, 1)]}</g>;
};
