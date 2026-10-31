// "1 TON BALL vs 10 FLOORS" — offline Rapier sim. A 1-ton wrecking ball drops through a shaft of
// ten floors of increasing strength; the fragments of each floor are fixed until the ball reaches
// them, then released with crack propagation. Records per-frame transforms + events.
//   node sim/drop_test.mjs [--out build/dt]
import RAPIER from '@dimforge/rapier3d-compat';
import fs from 'fs';

const FPS = 60, SUB = 4, SPACING = 5.2, HALF = 3.0, BALL_R = 0.75, LAVA_Y = -9 * SPACING - 8.5;
export const FLOORS = [
  { name: 'GLASS', color: '#a8f4ff', kind: 'glass', grid: [12, 12], size: [0.5, 0.05, 0.5], radius: 99, prop: 0.012, vExit: 11, density: 2500, slow: 0.35, slowDur: 0.7 },
  { name: 'ICE', color: '#c9ecff', kind: 'ice', grid: [8, 8], size: [0.75, 0.22, 0.75], radius: 99, prop: 0.03, vExit: 9, density: 900, slow: 0.4, slowDur: 0.6 },
  { name: 'WOOD', color: '#c98a46', kind: 'wood', planks: true, grid: [10, 3], size: [0.6, 0.12, 2.0], radius: 2.4, prop: 0.02, vExit: 8, density: 700, slow: 0.4, slowDur: 0.6 },
  { name: 'BRICK', color: '#e0653a', kind: 'brick', grid: [8, 8], layers: 2, size: [0.75, 0.2, 0.75], radius: 2.0, prop: 0.025, vExit: 6.5, density: 900, slow: 0.35, slowDur: 0.7 },
  { name: 'TRIPLE GLASS', color: '#a8f4ff', kind: 'glass', grid: [8, 8], layers: 3, gap: 0.22, size: [0.75, 0.05, 0.75], radius: 99, prop: 0.01, vExit: 7, density: 2500, slow: 0.3, slowDur: 0.8 },
  { name: 'CONCRETE', color: '#a3a8ae', kind: 'concrete', grid: [6, 6], size: [1, 0.35, 1], radius: 1.9, prop: 0.03, vExit: 5, density: 500, slow: 0.3, slowDur: 0.8 },
  { name: 'STEEL', color: '#d6dde6', kind: 'steel', bars: true, size: [0.14, 0.14, 1.5], radius: 2.1, prop: 0.02, vExit: 4.5, density: 3000, slow: 0.3, slowDur: 0.9 },
  { name: 'GRANITE', color: '#8e939c', kind: 'granite', grid: [5, 5], size: [1.2, 0.45, 1.2], radius: 1.7, prop: 0.04, vExit: 3.5, density: 300, slow: 0.28, slowDur: 0.9 },
  { name: 'TITANIUM', color: '#86bfff', kind: 'titanium', grid: [4, 4], size: [1.5, 0.3, 1.5], radius: 1.6, prop: 0.09, vExit: 1.5, density: 250, hold: 0.7, bounce: 0.1, slow: 0.3, slowDur: 0.8 },
  { name: 'DIAMOND', color: '#ffffff', kind: 'diamond', grid: [6, 6], size: [1, 0.4, 1], radius: 99, prop: 0.06, vExit: 2.5, density: 300, hold: 2.3, bounce: 0.65, slow: 0.3, slowDur: 0.6 },
];

function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

await RAPIER.init();
const R = rng(11), rr = (a, b) => a + R() * (b - a);
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const eq = new RAPIER.EventQueue(true);
const events = []; let frame = 0, simT = 0;
const ev = (type, o = {}) => events.push({ f: frame, t: +simT.toFixed(3), type, ...o });

const ballBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0.3, 1.25, -0.2).setLinvel(0, -13, 0).setAngvel({ x: 1.5, y: 0.4, z: -1.0 }).setCcdEnabled(true));
const ballCol = world.createCollider(RAPIER.ColliderDesc.ball(BALL_R).setDensity(565).setFriction(0.5).setRestitution(0.1)
  .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(1500), ballBody);

// invisible shaft walls keep the ball inside the tower
for (const [x, z, hx, hz] of [[HALF + 0.3, 0, 0.25, HALF + 1], [-HALF - 0.3, 0, 0.25, HALF + 1], [0, HALF + 0.3, HALF + 1, 0.25], [0, -HALF - 0.3, HALF + 1, 0.25]]) {
  const wb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, LAVA_Y / 2, z));
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, -LAVA_Y / 2 + 6, hz).setFriction(0).setRestitution(0.2), wb);
}

// ---- floors ----
const frags = [];
const floors = FLOORS.map((F, i) => {
  const top = -i * SPACING, list = [], [sx, sy, sz] = F.size, layers = F.layers || 1, gap = F.gap || 0;
  const place = (x, y, z, rotY = 0) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z).setRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) }).setCcdEnabled(true));
    const hx = rotY ? sz : sx, hz = rotY ? sx : sz;
    const col = world.createCollider(RAPIER.ColliderDesc.cuboid(hx / 2 - 0.01, sy / 2 - 0.005, hz / 2 - 0.01).setDensity(F.density).setFriction(0.6).setRestitution(F.bounce ?? 0.2), body);
    const fr = { i: frags.length, floor: i, body, col, x, y, z, state: 0, relT: 0 };
    frags.push(fr); list.push(fr); return fr;
  };
  if (F.bars) { // steel: 7 bars along x and 7 along z, 4 segments each, two levels
    for (let k = 0; k < 7; k++) for (let s = 0; s < 4; s++) {
      const a = -HALF + 0.43 + k * (2 * HALF - 0.86) / 6, b = -HALF + sz / 2 + s * sz;
      place(b, top - sy / 2, a, 0); place(a, top - sy * 1.5, b, Math.PI / 2);
    }
  } else if (F.planks) {
    for (let k = 0; k < F.grid[0]; k++) for (let s = 0; s < F.grid[1]; s++) place(-HALF + sx / 2 + k * sx, top - sy / 2, -HALF + sz / 2 + s * sz);
  } else {
    for (let l = 0; l < layers; l++) for (let k = 0; k < F.grid[0]; k++) for (let s = 0; s < F.grid[1]; s++) {
      const off = (l % 2) * (F.kind === 'brick' ? sx / 2 : 0);
      const x = -HALF + sx / 2 + k * sx + off; if (x + sx / 2 > HALF + 0.01) continue;
      place(x, top - sy / 2 - l * (sy + gap), -HALF + sz / 2 + s * sz);
    }
  }
  const thick = F.bars ? sy * 2 : layers * sy + (layers - 1) * gap;
  return { F, i, top, thick, frags: list, triggered: false, holdUntil: null, released: false, done: false, rested: false };
});
const byCollider = new Map(frags.map(f => [f.col.handle, f]));

function release(fl, p, speed) {
  fl.released = true;
  ev('break', { floor: fl.i, x: +p.x.toFixed(2), z: +p.z.toFixed(2), speed: +speed.toFixed(1) });
  for (const fr of fl.frags) {
    if (fr.state !== 0) continue;
    const d = Math.hypot(fr.x - p.x, fr.z - p.z);
    if (d > fl.F.radius) continue;
    fr.state = 1; fr.relT = simT + Math.max(0, d - BALL_R) * fl.F.prop;
    const dd = d || 1; fr.dir = { x: (fr.x - p.x) / dd, z: (fr.z - p.z) / dd }; fr.d = d; fr.speed = speed;
  }
}

let lastPassT = 0, nextFloor = 0;
let slowUntil = -1, slowLevel = 1, timeScale = 1, endFrame = Infinity, splashed = false, pendingSlow = null;
const frames = [], meta = [];
const NB = 1 + frags.length;

while (frame < 60 * FPS && frame < endFrame) {
  const vT = frame / FPS;
  if (pendingSlow) { slowUntil = vT + pendingSlow.dur; slowLevel = pendingSlow.level; pendingSlow = null; }
  if (vT < slowUntil) timeScale = Math.max(timeScale * 0.72, slowLevel); else timeScale = Math.min(1, timeScale + 0.05);
  if (frame === 0) { slowUntil = 0.85; slowLevel = 0.3; timeScale = 0.3; }
  for (let s = 0; s < SUB; s++) {
    const dt = (1 / FPS) * timeScale / SUB; world.timestep = dt;
    const bp = ballBody.translation(), bv = ballBody.linvel(), by = bp.y, sp = Math.hypot(bv.x, bv.y, bv.z);
    // gentle centring so the ball keeps hitting near the middle of every floor
    { const m = ballBody.mass(); ballBody.applyImpulse({ x: (-bp.x * 2.5 - bv.x * 1.2) * m * dt, y: 0, z: (-bp.z * 2.5 - bv.z * 1.2) * m * dt }, true); }
    for (const fl of floors) {
      if (fl.done) continue;
      const F = fl.F;
      // trigger a little early (debris from upper floors piles up on the next one), or when the ball stalls on that debris
      if (!fl.triggered && (by - BALL_R < fl.top + 0.45 || (by - BALL_R < fl.top + 2.0 && sp < 2.0 && simT > 0.5) || (fl.i === nextFloor && simT - lastPassT > 1.6 && simT > 1))) {
        fl.triggered = true; fl.trigT = simT;
        ev('trigger', { floor: fl.i, x: +bp.x.toFixed(2), z: +bp.z.toFixed(2), speed: +sp.toFixed(1) });
        pendingSlow = { level: F.slow, dur: F.slowDur };
        if (F.hold) fl.holdUntil = simT + F.hold; else release(fl, bp, sp);
      }
      if (fl.triggered && fl.holdUntil != null) {
        if (!fl.rested && simT > fl.trigT + 0.35 && sp < 0.7 && by - BALL_R < fl.top + 0.7) { fl.rested = true; ev('rest', { floor: fl.i }); }
        if (simT >= fl.holdUntil) { fl.holdUntil = null; release(fl, bp, Math.max(sp, 2.5)); pendingSlow = { level: 0.3, dur: 0.75 }; }
      }
      for (const fr of fl.frags) if (fr.state === 1 && simT >= fr.relT) {
        fr.state = 2; fr.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
        const m = fr.body.mass(), k = fr.speed * Math.max(0.15, 1 - fr.d / 4) * 0.55;
        fr.body.applyImpulse({ x: (fr.dir.x * k + rr(-0.6, 0.6)) * m, y: (-k * 0.8 + rr(-0.4, 0.6)) * m, z: (fr.dir.z * k + rr(-0.6, 0.6)) * m }, true);
        fr.body.setAngvel({ x: rr(-6, 6), y: rr(-6, 6), z: rr(-6, 6) }, true);
      }
      if (fl.released && fl.holdUntil == null && by < fl.top + BALL_R + 0.1 && by > fl.top - fl.thick - BALL_R && bv.y < -F.vExit) {
        ballBody.setLinvel({ x: bv.x * 0.9, y: bv.y + (-F.vExit - bv.y) * 0.35, z: bv.z * 0.9 }, true);
      }
      if (by < fl.top - fl.thick - BALL_R - 0.6) { fl.done = true; lastPassT = simT; nextFloor = fl.i + 1; ev('passed', { floor: fl.i, speed: +sp.toFixed(1) }); }
    }
    if (!splashed && by - BALL_R < LAVA_Y) { splashed = true; ev('splash', { x: +bp.x.toFixed(2), z: +bp.z.toFixed(2) }); pendingSlow = { level: 0.25, dur: 0.9 }; endFrame = frame + Math.round(3.6 * FPS); }
    world.step(eq); simT += dt;
    eq.drainContactForceEvents(e => {
      const a = byCollider.get(e.collider1()) || byCollider.get(e.collider2());
      if (!a || !(e.collider1() === ballCol.handle || e.collider2() === ballCol.handle)) return;
      const F = floors[a.floor].F, key = a.floor;
      if (simT - (floors[key].lastHit || -1) < 0.06) return;
      floors[key].lastHit = simT;
      const p = ballBody.translation();
      ev('hit', { floor: a.floor, kind: F.kind, s: +(e.totalForceMagnitude() / 1000).toFixed(1), x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), fixed: a.state !== 2 });
    });
  }
  for (const fr of frags) if (fr.state === 2 && fr.body.isEnabled() && fr.body.translation().y < LAVA_Y - 3) fr.body.setEnabled(false);
  const arr = new Float32Array(NB * 7); let o = 0;
  for (const b of [ballBody, ...frags.map(f => f.body)]) { const p = b.translation(), q = b.rotation(); arr[o++] = p.x; arr[o++] = p.y; arr[o++] = p.z; arr[o++] = q.x; arr[o++] = q.y; arr[o++] = q.z; arr[o++] = q.w; }
  frames.push(arr);
  const v = ballBody.linvel();
  meta.push([+simT.toFixed(4), +timeScale.toFixed(3), +(Math.hypot(v.x, v.y, v.z) * 3.6).toFixed(1), +ballBody.translation().y.toFixed(3)]);
  frame++;
}

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? a.concat([[x.slice(2), arr[i + 1]]]) : a), []));
const out = args.out || 'build/dt';
fs.mkdirSync('build', { recursive: true });
const bin = Buffer.alloc(frames.length * NB * 7 * 4);
frames.forEach((f, i) => Buffer.from(f.buffer).copy(bin, i * f.byteLength));
fs.writeFileSync(out + '.bin', bin);
fs.writeFileSync(out + '.json', JSON.stringify({ fps: FPS, nFrames: frame, meta, events,
  layout: { NB, BALL_R, HALF, SPACING, LAVA_Y, floors: FLOORS.map((F, i) => ({ ...F, top: -i * SPACING, thick: floors[i].thick, frags: floors[i].frags.map(fr => fr.i), rotY: floors[i].frags.map(fr => (F.bars && Math.abs(fr.x) < HALF && fr.y < -i * SPACING - F.size[1]) ? 1 : 0) })) } }));
const c = {}; events.forEach(e => c[e.type] = (c[e.type] || 0) + 1);
console.log(`frames ${frame} (${(frame / FPS).toFixed(1)}s) bodies ${NB}`, c);
console.log(events.filter(e => ['trigger', 'rest', 'break', 'splash'].includes(e.type)).map(e => `${e.type}:${e.floor ?? ''}@${(e.f / FPS).toFixed(1)}`).join(' '));
