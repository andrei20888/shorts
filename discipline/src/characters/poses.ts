/**
 * Pose library + procedural cycles (walk, run, climb, push-up, sit-up-in-bed, slump).
 * Everything returns plain data for <Bean pose targets />.
 */
import { BASE_POSE, HIP_H, LEG_LEN, RIG, blendPose, rotV, v2, withPose, type Pose, type Targets, type V2 } from './rig';

const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Ankle y on flat ground, in root space. */
export const GROUND_ANKLE = HIP_H - RIG.footR;

export const POSES = {
  stand: BASE_POSE,
  standTall: withPose(BASE_POSE, { torso: -2, head: -5, arm1: { a: 4, b: 6 }, arm2: { a: -4, b: 8 } }),
  standSlump: withPose(BASE_POSE, {
    torso: 14,
    squash: 0.95,
    head: 16,
    headDrop: 6,
    bob: 4,
    arm1: { a: 2, b: 4 },
    arm2: { a: -2, b: 4 },
    leg1: { a: 4, b: 9 },
    leg2: { a: -2, b: 9 },
  }),
  /** Sitting on an edge (bed / step), facing +x. */
  sit: withPose(BASE_POSE, {
    torso: 6,
    head: 0,
    arm1: { a: 34, b: 34 },
    arm2: { a: 28, b: 38 },
    leg1: { a: 86, b: 88 },
    leg2: { a: 80, b: 84 },
  }),
  sitSlump: withPose(BASE_POSE, {
    torso: 30,
    squash: 0.94,
    head: 20,
    headDrop: 8,
    arm1: { a: 44, b: 40 },
    arm2: { a: 40, b: 44 },
    leg1: { a: 70, b: 104 },
    leg2: { a: 64, b: 98 },
  }),
  /** Lying on the back in bed, head toward -x (face kept upright for readability). */
  lieBack: withPose(BASE_POSE, {
    torso: -76,
    head: 4,
    faceRot: 66,
    arm1: { a: 6, b: 6 },
    arm2: { a: 4, b: 6 },
    leg1: { a: 92, b: 0 },
    leg2: { a: 90, b: 0 },
  }),
  /** Sitting up in bed, legs straight under the blanket. */
  sitInBed: withPose(BASE_POSE, {
    torso: -6,
    head: 2,
    faceRot: 0,
    arm1: { a: 22, b: 30 },
    arm2: { a: 18, b: 34 },
    leg1: { a: 92, b: 0 },
    leg2: { a: 90, b: 0 },
  }),
  armsUp: withPose(BASE_POSE, { torso: -4, head: -10, arm1: { a: 138, b: 14 }, arm2: { a: -152, b: -10 } }),
  /** Front view: both arms up in a V. */
  victory: withPose(BASE_POSE, { torso: 0, head: -6, arm1: { a: 148, b: 8 }, arm2: { a: 148, b: 8 }, leg1: { a: 8, b: 0 }, leg2: { a: 8, b: 0 } }),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

/** Sit-up-in-bed: 0 = lying, 1 = sitting (legs stay under the blanket). */
export const sitUpInBed = (t: number): Pose => {
  const p = blendPose(POSES.lieBack, POSES.sitInBed, smooth(Math.min(1, Math.max(0, t))));
  // Arms push off the mattress mid-way.
  const push = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
  return withPose(p, { arm1: { a: p.arm1.a + push * 30, b: p.arm1.b + push * 20 }, head: p.head - push * 10 });
};

/** Slump: 0 = upright, 1 = collapsed. Works for standing or sitting bases. */
export const slump = (t: number, base: 'stand' | 'sit' = 'sit'): Pose =>
  base === 'sit' ? blendPose(POSES.sit, POSES.sitSlump, smooth(t)) : blendPose(POSES.stand, POSES.standSlump, smooth(t));

/* ───────────────────────── WALK ───────────────────────── */

export type CycleOpts = { stride?: number; lift?: number; lean?: number; swing?: number; bob?: number };

/** In-place walk cycle. phase 0..1 per full stride (two steps). */
export const walk = (phase: number, o: CycleOpts = {}): { pose: Pose; targets: Targets } => {
  const S = o.stride ?? 62;
  const lift = o.lift ?? 15;
  const swing = o.swing ?? 24;
  const foot = (off: number): V2 => {
    const q = frac(phase + off);
    if (q < 0.6) return v2(S / 2 - (S * q) / 0.6, GROUND_ANKLE);
    const u = (q - 0.6) / 0.4;
    return v2(-S / 2 + S * smooth(u), GROUND_ANKLE - lift * Math.sin(Math.PI * u));
  };
  const c = Math.cos(TAU * phase);
  const pose = withPose(BASE_POSE, {
    torso: (o.lean ?? 4) + Math.sin(TAU * phase * 2) * 1.2,
    bob: (o.bob ?? 7) + 2.5 * Math.cos(TAU * phase * 2),
    head: -2 + Math.sin(TAU * phase * 2) * 1.5,
    arm1: { a: -swing * c, b: 14 + 10 * Math.max(0, -c) },
    arm2: { a: swing * c, b: 14 + 10 * Math.max(0, c) },
  });
  return { pose, targets: { foot1: foot(0), foot2: foot(0.5) } };
};

/* ───────────────────────── RUN ───────────────────────── */

const catmull = (pts: V2[], t: number): V2 => {
  const n = pts.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(x);
  const u = x - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return v2(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y));
};

/** In-place run cycle with flight phase, high back-kick and pumping arms. */
export const run = (phase: number, o: CycleOpts = {}): { pose: Pose; targets: Targets } => {
  const S = o.stride ?? 78;
  const lift = o.lift ?? 1;
  const contact = 0.32;
  const G = GROUND_ANKLE;
  const swingPts = [
    v2(-0.6 * S, G),
    v2(-0.78 * S, G - 46 * lift),
    v2(-0.2 * S, G - 62 * lift),
    v2(0.36 * S, G - 50 * lift),
    v2(0.52 * S, G - 18 * lift),
    v2(0.4 * S, G),
  ];
  const foot = (off: number): V2 => {
    const q = frac(phase + off);
    if (q < contact) return v2(0.4 * S - (S * q) / contact, G);
    return catmull(swingPts, (q - contact) / (1 - contact));
  };
  const c = Math.cos(TAU * phase);
  const swing = o.swing ?? 52;
  const pose = withPose(BASE_POSE, {
    torso: (o.lean ?? 13) + Math.sin(TAU * phase * 2) * 1.5,
    bob: (o.bob ?? 13) + 6 * Math.cos(TAU * 2 * (phase - contact / 2)),
    head: -6,
    arm1: { a: -swing * c + 8, b: 82 + 12 * Math.max(0, -c) },
    arm2: { a: swing * c + 8, b: 82 + 12 * Math.max(0, c) },
  });
  return { pose, targets: { foot1: foot(0), foot2: foot(0.5) } };
};

/* ───────────────────────── CLIMB (stairs) ───────────────────────── */

/** Tread j: horizontal segment from x0 to x1 at height y (world). */
export type TreadFn = (j: number) => { x0: number; x1: number; y: number };

export type ClimbResult = { root: V2; pose: Pose; targets: Targets; facing: 1 | -1 };

/**
 * Feet land on real treads. `s` = progress in steps (float). Each foot alternates,
 * moving two steps per swing; `w` = fraction of a step spent swinging.
 */
export const climb = (
  s: number,
  tread: TreadFn,
  o: { w?: number; lift?: number; lean?: number; swing?: number; crouch?: number; run?: boolean } = {},
): ClimbResult => {
  const w = o.w ?? 0.8;
  const crouch = o.crouch ?? 4;
  const center = (j: number) => {
    const t = tread(j);
    return v2((t.x0 + t.x1) / 2, t.y);
  };
  const j0 = Math.floor(s);
  const fr = s - j0;
  const a = center(j0);
  const b = center(j0 + 1);
  const root = v2(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr - HIP_H + crouch);
  const facing: 1 | -1 = b.x >= a.x ? 1 : -1;
  const lift = o.lift ?? 30;
  const foot = (p: number): V2 => {
    const j = p + 2 * Math.floor((s + 1 - p) / 2);
    const u = s - (j - 1);
    let wx: number;
    let wy: number;
    if (u < 2 - w) {
      const c = center(j);
      wx = c.x;
      wy = c.y;
    } else {
      const t = (u - (2 - w)) / w;
      const c1 = center(j);
      const c2 = center(j + 2);
      const e = smooth(t);
      wx = c1.x + (c2.x - c1.x) * e;
      wy = c1.y + (c2.y - c1.y) * e - lift * Math.sin(Math.PI * t);
    }
    // world → root space (character may face -x on reversed flights)
    return v2((wx - root.x) * facing, wy - RIG.footR - root.y);
  };
  const ph = Math.PI * s;
  const swing = o.swing ?? (o.run ? 46 : 22);
  const pose = withPose(BASE_POSE, {
    torso: (o.lean ?? (o.run ? 16 : 8)) + Math.sin(ph * 2) * 1.2,
    bob: 0,
    head: o.run ? -8 : -3,
    arm1: { a: swing * Math.cos(ph) + (o.run ? 10 : 2), b: o.run ? 80 : 18 },
    arm2: { a: -swing * Math.cos(ph) + (o.run ? 10 : 2), b: o.run ? 80 : 18 },
  });
  return { root, pose, targets: { foot1: foot(0), foot2: foot(1) }, facing };
};

/* ───────────────────────── PUSH-UP ───────────────────────── */

/**
 * Push-up on a floor at world y = floorY, toes at world x = toeX, facing +x.
 * p: 0 = top, 0.5 = bottom, 1 = top.
 */
export const pushup = (p: number, floorY: number, toeX: number) => {
  const depth = (1 - Math.cos(Math.PI * 2 * p)) / 2; // 0 top → 1 bottom
  const elev = 30 - 15 * depth; // body angle above the floor
  const rot = 90 - elev;
  const ankle = v2(toeX, floorY - RIG.footR);
  const er = (elev * Math.PI) / 180;
  const root = v2(ankle.x + LEG_LEN * Math.cos(er), ankle.y - LEG_LEN * Math.sin(er));
  const pose = withPose(BASE_POSE, {
    torso: 0,
    head: -34 + 8 * depth,
    leg1: { a: 0, b: 0 },
    leg2: { a: 0, b: 0 },
    foot1: 70,
    foot2: 70,
  });
  // Shoulder in world → hand target under it, back to root-local.
  const shLocal = v2(RIG.shoulderSide.x, RIG.shoulderSide.y);
  const shWorld = rotV(shLocal, rot);
  const handWorld = v2(root.x + shWorld.x + 6, floorY - RIG.handR);
  const toLocal = (w: V2) => rotV(v2(w.x - root.x, w.y - root.y), -rot);
  return {
    root,
    rot,
    pose,
    targets: { hand1: toLocal(handWorld), hand2: toLocal(v2(handWorld.x - 10, handWorld.y)) } as Targets,
    depth,
  };
};
