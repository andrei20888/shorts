/**
 * Bean rig — skeleton math. Pure functions, no React.
 *
 * Conventions (local units, y down, origin = pelvis):
 *   • Angles are degrees measured from "straight down", positive = toward +x
 *     (+x = the direction the character faces in side view).
 *   • Arm angles are relative to the torso; leg angles are absolute.
 *   • Elbow bend +  = forearm swings forward.  Knee bend + = shin swings back.
 */
export type V2 = { x: number; y: number };
export const v2 = (x: number, y: number): V2 => ({ x, y });
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const dirOf = (a: number): V2 => ({ x: Math.sin(rad(a)), y: Math.cos(rad(a)) });
export const addV = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
export const mulV = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });
export const rotV = (p: V2, a: number): V2 => {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};
const clampN = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Body proportions (scale 1 ≈ 270 units tall standing). */
export const RIG = {
  headR: 50,
  headY: -138, //   head center, torso frame
  neckY: -96,
  shoulderSide: v2(4, -74),
  shoulderFrontX: 31,
  shoulderFrontY: -70,
  hipFrontX: 15,
  upperArm: 36,
  foreArm: 32,
  armR: 7.4,
  handR: 9.2,
  thigh: 43,
  shin: 41,
  legR: 8.6,
  footLen: 21,
  footR: 8.4,
  eyeDX: 17,
  eyeY: 3,
  eyeR: 6.8,
  browY: -18,
  browLen: 24,
  browW: 9.5,
} as const;

export const LEG_LEN = RIG.thigh + RIG.shin;
/** Pelvis height above the ground with straight legs (ankle sits footR above ground). */
export const HIP_H = LEG_LEN + RIG.footR - 1;

export type Limb = { a: number; b: number };
export type Pose = {
  torso: number;
  squash: number;
  head: number;
  /** Rotates only the face/head graphic (keeps a lying character's face upright). */
  faceRot: number;
  headDrop: number;
  bob: number;
  arm1: Limb; // side: near arm   · front: screen-right arm
  arm2: Limb; // side: far arm    · front: screen-left arm (mirrored)
  leg1: Limb;
  leg2: Limb;
  foot1: number;
  foot2: number;
};

/** IK targets in pelvis space (pre-bob). They override the matching limb angles. */
export type Targets = { hand1?: V2; hand2?: V2; foot1?: V2; foot2?: V2 };
export type View = 'side' | 'front';

export const BASE_POSE: Pose = {
  torso: 2,
  squash: 1,
  head: 0,
  faceRot: 0,
  headDrop: 0,
  bob: 0,
  arm1: { a: 8, b: 12 },
  arm2: { a: -6, b: 14 },
  leg1: { a: 3, b: 4 },
  leg2: { a: -3, b: 4 },
  foot1: 0,
  foot2: 0,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpLimb = (a: Limb, b: Limb, t: number): Limb => ({ a: lerp(a.a, b.a, t), b: lerp(a.b, b.b, t) });

export const blendPose = (p: Pose, q: Pose, t: number): Pose => ({
  torso: lerp(p.torso, q.torso, t),
  squash: lerp(p.squash, q.squash, t),
  head: lerp(p.head, q.head, t),
  faceRot: lerp(p.faceRot, q.faceRot, t),
  headDrop: lerp(p.headDrop, q.headDrop, t),
  bob: lerp(p.bob, q.bob, t),
  arm1: lerpLimb(p.arm1, q.arm1, t),
  arm2: lerpLimb(p.arm2, q.arm2, t),
  leg1: lerpLimb(p.leg1, q.leg1, t),
  leg2: lerpLimb(p.leg2, q.leg2, t),
  foot1: lerp(p.foot1, q.foot1, t),
  foot2: lerp(p.foot2, q.foot2, t),
});

/** Merge a partial pose over a base. */
export const withPose = (base: Pose, over: Partial<Pose>): Pose => ({ ...base, ...over });

/** 2-bone IK. Returns absolute angles of both segments. */
export const ik2 = (root: V2, target: V2, l1: number, l2: number, bendForward: boolean) => {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const d = clampN(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const base = deg(Math.atan2(dx, dy));
  const A = deg(Math.acos(clampN((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)));
  const a1 = bendForward ? base + A : base - A;
  const mid = addV(root, mulV(dirOf(a1), l1));
  const a2 = deg(Math.atan2(target.x - mid.x, target.y - mid.y));
  return { a1, a2 };
};

/** Torso frame: pelvis + rotate(torso) + vertical squash. */
const torsoPt = (pose: Pose, p: V2): V2 => {
  const r = rotV({ x: p.x, y: p.y * pose.squash }, pose.torso);
  return { x: r.x, y: r.y + pose.bob };
};

export type Skeleton = {
  pelvis: V2;
  neck: V2;
  head: V2;
  headAngle: number;
  shoulder1: V2;
  shoulder2: V2;
  elbow1: V2;
  elbow2: V2;
  hand1: V2;
  hand2: V2;
  hip1: V2;
  hip2: V2;
  knee1: V2;
  knee2: V2;
  ankle1: V2;
  ankle2: V2;
  toe1: V2;
  toe2: V2;
  pose: Pose;
};

/** Apply IK targets → angles, then forward kinematics → joint positions. */
export const solve = (input: Pose, view: View, targets: Targets = {}, reach = 1): Skeleton => {
  const UA1 = RIG.upperArm * reach;
  const FA1 = RIG.foreArm * reach;
  const pose: Pose = { ...input, arm1: { ...input.arm1 }, arm2: { ...input.arm2 }, leg1: { ...input.leg1 }, leg2: { ...input.leg2 } };
  const front = view === 'front';
  const pelvis = v2(0, pose.bob);
  const sh1 = front ? torsoPt(pose, v2(RIG.shoulderFrontX, RIG.shoulderFrontY)) : torsoPt(pose, RIG.shoulderSide);
  const sh2 = front ? torsoPt(pose, v2(-RIG.shoulderFrontX, RIG.shoulderFrontY)) : sh1;
  const hp1 = front ? v2(RIG.hipFrontX, pose.bob) : pelvis;
  const hp2 = front ? v2(-RIG.hipFrontX, pose.bob) : pelvis;
  const mirror2 = front ? -1 : 1;

  // IK (targets are pelvis-space, pre-bob → shift by bob)
  const tgt = (t?: V2) => (t ? v2(t.x, t.y) : undefined);
  const h1 = tgt(targets.hand1);
  const h2 = tgt(targets.hand2);
  const f1 = tgt(targets.foot1);
  const f2 = tgt(targets.foot2);
  // Elbows point back in side view, outward in front view.
  if (h1) {
    const s = ik2(sh1, h1, UA1, FA1, front);
    pose.arm1 = { a: s.a1 - pose.torso, b: s.a2 - s.a1 };
  }
  if (h2) {
    const s = ik2(sh2, h2, RIG.upperArm, RIG.foreArm, false);
    pose.arm2 = front ? { a: -(s.a1 - pose.torso), b: -(s.a2 - s.a1) } : { a: s.a1 - pose.torso, b: s.a2 - s.a1 };
  }
  if (f1) {
    const s = ik2(hp1, f1, RIG.thigh, RIG.shin, true);
    pose.leg1 = { a: s.a1, b: s.a1 - s.a2 };
  }
  if (f2) {
    const s = ik2(hp2, f2, RIG.thigh, RIG.shin, !front);
    pose.leg2 = front ? { a: -s.a1, b: -(s.a1 - s.a2) } : { a: s.a1, b: s.a1 - s.a2 };
  }

  const A1 = pose.torso + pose.arm1.a;
  const A2 = pose.torso + mirror2 * pose.arm2.a;
  const elbow1 = addV(sh1, mulV(dirOf(A1), UA1));
  const elbow2 = addV(sh2, mulV(dirOf(A2), RIG.upperArm));
  const hand1 = addV(elbow1, mulV(dirOf(A1 + pose.arm1.b), FA1));
  const hand2 = addV(elbow2, mulV(dirOf(A2 + mirror2 * pose.arm2.b), RIG.foreArm));

  const L1 = pose.leg1.a;
  const L2 = mirror2 * pose.leg2.a;
  const knee1 = addV(hp1, mulV(dirOf(L1), RIG.thigh));
  const knee2 = addV(hp2, mulV(dirOf(L2), RIG.thigh));
  const shin1 = L1 - pose.leg1.b;
  const shin2 = L2 - mirror2 * pose.leg2.b;
  const ankle1 = addV(knee1, mulV(dirOf(shin1), RIG.shin));
  const ankle2 = addV(knee2, mulV(dirOf(shin2), RIG.shin));
  // Feet point forward (side) — flat by default, follow the shin a little.
  const footA1 = front ? 90 : 90 - (shin1 > 0 ? 0 : shin1 * 0.25) - pose.foot1;
  const footA2 = front ? -90 : 90 - (shin2 > 0 ? 0 : shin2 * 0.25) - pose.foot2;
  const toe1 = front ? addV(ankle1, v2(5, 3)) : addV(ankle1, mulV(dirOf(footA1), RIG.footLen));
  const toe2 = front ? addV(ankle2, v2(-5, 3)) : addV(ankle2, mulV(dirOf(footA2), RIG.footLen));

  const neck = torsoPt(pose, v2(0, RIG.neckY));
  const neckAngle = pose.torso + pose.head;
  const head = addV(neck, rotV(v2(0, RIG.headY - RIG.neckY + pose.headDrop), neckAngle));
  const headAngle = neckAngle + pose.faceRot;

  return {
    pelvis,
    neck,
    head,
    headAngle,
    shoulder1: sh1,
    shoulder2: sh2,
    elbow1,
    elbow2,
    hand1,
    hand2,
    hip1: hp1,
    hip2: hp2,
    knee1,
    knee2,
    ankle1,
    ankle2,
    toe1,
    toe2,
    pose,
  };
};

/* ───────────── shape helpers (path data in pelvis space) ───────────── */

export const capsule = (a: V2, b: V2, r: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 0.0001;
  const nx = (-dy / L) * r;
  const ny = (dx / L) * r;
  return `M${a.x + nx} ${a.y + ny}L${b.x + nx} ${b.y + ny}A${r} ${r} 0 0 0 ${b.x - nx} ${b.y - ny}L${a.x - nx} ${a.y - ny}A${r} ${r} 0 0 0 ${a.x + nx} ${a.y + ny}Z`;
};

/** Egg/bean torso outline (torso frame), as cubic segments. */
const TORSO: Array<[number, number]> = [
  [0, -104],
  [24, -104], [33, -84], [34.5, -56],
  [36.5, -24], [40, 0], [31, 12],
  [23, 21], [-23, 21], [-31, 12],
  [-40, 0], [-36.5, -24], [-34.5, -56],
  [-33, -84], [-24, -104], [0, -104],
];

export const torsoPath = (pose: Pose) => {
  const pts = TORSO.map(([x, y]) => torsoPt(pose, v2(x, y)));
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i += 3) {
    d += `C${pts[i].x} ${pts[i].y} ${pts[i + 1].x} ${pts[i + 1].y} ${pts[i + 2].x} ${pts[i + 2].y}`;
  }
  return `${d}Z`;
};
