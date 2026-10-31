// "LAST BALL STANDING" — offline physics sim (Rapier). 5 balls fight on a hex platform that
// crumbles, tilts, gets hit by meteors and shockwaves. Records per-video-frame transforms + events.
//   node sim/last_ball.mjs --seed 7 [--out build/lb_7]      -> writes .json (meta+events) and .bin (transforms)
//   node sim/last_ball.mjs --scan 1-40                       -> scores seeds, prints the best ones
import RAPIER from '@dimforge/rapier3d-compat';
import fs from 'fs';

const FPS = 60, SUB = 4;
const BALLS = [
  { name: 'ORANGE', color: '#ff6a13' }, { name: 'CYAN', color: '#00e5ff' }, { name: 'PINK', color: '#ff2e88' },
  { name: 'LIME', color: '#8cff2e' }, { name: 'VIOLET', color: '#a66bff' },
];
// round schedule in sim seconds
const ROUNDS = [
  { t: 2.6, id: 'crumble', title: 'ROUND 1', sub: 'THE FLOOR IS BREAKING' },
  { t: 8.5, id: 'tilt', title: 'ROUND 2', sub: 'GRAVITY TILT' },
  { t: 14.0, id: 'meteor', title: 'ROUND 3', sub: 'METEOR STORM' },
  { t: 19.5, id: 'shock', title: 'ROUND 4', sub: 'SHOCKWAVES' },
];
const TARGET_ELIMS = [7.0, 12.5, 18.0, 23.5];

function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function simulate(seed, record = true) {
  await RAPIER.init();
  const R = rng(seed);
  const rounds = ROUNDS.map(r => ({ ...r }));
  const rr = (a, b) => a + R() * (b - a);
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const eq = new RAPIER.EventQueue(true);
  const events = [];
  let frame = 0, simT = 0;
  const ev = (type, o = {}) => events.push({ f: frame, t: +simT.toFixed(3), type, ...o });

  // ---- hex platform ----
  const HR = 0.62, GAP = 0.035, TH = 0.4, RINGS = 5;
  const tiles = [];
  const hexPts = [];
  for (const y of [-TH, 0]) for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; hexPts.push((HR - GAP) * Math.cos(a), y, (HR - GAP) * Math.sin(a)); }
  const hexHull = new Float32Array(hexPts);
  const W = Math.sqrt(3) * HR; // flat-to-flat spacing
  for (let q = -RINGS; q <= RINGS; q++) for (let r = -RINGS; r <= RINGS; r++) {
    const s = -q - r; const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    if (ring > RINGS) continue;
    const x = W * (q + r / 2), z = HR * 1.5 * r;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 0, z));
    const col = world.createCollider(RAPIER.ColliderDesc.convexHull(hexHull).setFriction(0.8).setRestitution(0.2).setDensity(2.5)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(40), body);
    tiles.push({ i: tiles.length, x, z, ring, body, col, state: 0, warnT: 0, kind: 'tile' });
  }

  // ---- balls ----
  const BR = 0.48;
  const balls = BALLS.map((b, i) => {
    const a = (i / BALLS.length) * Math.PI * 2 + rr(-0.2, 0.2), d = 2.6;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.cos(a) * d, 5.5 + rr(0, 1.5), Math.sin(a) * d)
      .setLinvel(0, -9, 0).setCcdEnabled(true).setLinearDamping(0.05).setAngularDamping(0.2));
    const col = world.createCollider(RAPIER.ColliderDesc.ball(BR).setDensity(2.2).setFriction(0.7).setRestitution(0.55)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(25), body);
    return { ...b, i, body, col, alive: true, dashT: rr(0.8, 1.6), wander: rr(0, 100), kind: 'ball', minEdge: 99, landed: false };
  });

  // ---- meteors (pre-allocated, disabled until spawned) ----
  const meteors = [];
  for (let i = 0; i < 26; i++) {
    const size = rr(0.55, 0.95);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, -200 - i * 3, 0).setCcdEnabled(true));
    const col = world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setDensity(6).setRestitution(0.15).setFriction(0.6)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(400), body);
    body.setEnabled(false);
    meteors.push({ i, size, body, col, active: false, kind: 'meteor', hit: false });
  }
  const byCollider = new Map();
  for (const o of [...tiles, ...balls, ...meteors]) byCollider.set(o.col.handle, o);

  // ---- platform tilt (kinematic) ----
  let tiltAmp = 0, tiltPhase = 0;
  const tiltQuat = () => {
    // wobble: tilt axis rotates around Y
    const ax = Math.cos(tiltPhase), az = Math.sin(tiltPhase), ang = tiltAmp;
    const s = Math.sin(ang / 2);
    return { x: ax * s, y: 0, z: az * s, w: Math.cos(ang / 2) };
  };
  const rotVec = (q, v) => { // rotate v by unit quat q
    const { x, y, z, w } = q; const ix = w * v.x + y * v.z - z * v.y, iy = w * v.y + z * v.x - x * v.z, iz = w * v.z + x * v.y - y * v.x, iw = -x * v.x - y * v.y - z * v.z;
    return { x: ix * w + iw * -x + iy * -z - iz * -y, y: iy * w + iw * -y + iz * -x - ix * -z, z: iz * w + iw * -z + ix * -y - iy * -x };
  };

  const dropTile = (t, reason) => {
    if (t.state === 2) return;
    t.state = 2;
    t.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    t.body.setLinvel({ x: rr(-0.4, 0.4), y: rr(-1.5, -0.5), z: rr(-0.4, 0.4) }, true);
    t.body.setAngvel({ x: rr(-2, 2), y: rr(-1, 1), z: rr(-2, 2) }, true);
    ev('drop', { tile: t.i, reason });
  };
  const warnTile = (t, delay = 0.5) => { if (t.state !== 0) return; t.state = 1; t.warnT = simT + delay; ev('warn', { tile: t.i }); };

  const aliveTiles = () => tiles.filter(t => t.state === 0);
  const ballPos = b => b.body.translation();
  const aliveBalls = () => balls.filter(b => b.alive);

  // pick tiles to drop: outermost first, optionally the one near a ball ("threat")
  const pickTile = (mode) => {
    const cand = aliveTiles();
    if (!cand.length) return null;
    if (mode === 'threat') {
      const ab = aliveBalls(); if (!ab.length) return null;
      // ball closest to the edge of what's left
      const b = ab[Math.floor(R() * ab.length)]; const p = ballPos(b);
      cand.sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z));
      return cand[Math.floor(R() * Math.min(3, cand.length))];
    }
    if (mode === 'safe') {
      // far from all balls
      const ab = aliveBalls().map(ballPos);
      let best = null, bd = -1;
      for (const t of cand) { const d = Math.min(...ab.map(p => Math.hypot(t.x - p.x, t.z - p.z))); const score = d + Math.hypot(t.x, t.z) * 0.5 + R(); if (score > bd) { bd = score; best = t; } }
      return best;
    }
    // outermost (by radius of what remains) with randomness
    cand.sort((a, c) => (Math.hypot(c.x, c.z) + R() * 1.6) - (Math.hypot(a.x, a.z) + R() * 1.6));
    return cand[0];
  };

  let round = null, dropAcc = 0, meteorAcc = 0, shockAcc = 0, timeScale = 1, slowUntil = -1, finalDone = false, winner = null, endFrame = Infinity;
  const elims = [];
  const lastPair = new Map();
  const N_BODIES = tiles.length + balls.length + meteors.length;
  const frames = [];
  const meta = [];

  const totalFramesCap = 46 * FPS;
  while (frame < totalFramesCap && frame < endFrame) {
    // ---------- director (once per video frame) ----------
    const vT = frame / FPS;
    if (vT < slowUntil) timeScale = Math.max(timeScale * 0.88, 0.3); else timeScale = Math.min(1, timeScale + 0.04);
    for (const rd of rounds) if (!rd.done && simT >= rd.t && aliveBalls().length > 2) { rd.done = true; round = rd.id; ev('round', { id: rd.id, title: rd.title, sub: rd.sub }); }
    const nAlive = aliveBalls().length;
    if (nAlive === 2 && !finalDone && !winner) { finalDone = true; round = 'final'; ev('round', { id: 'final', title: 'FINAL 2', sub: 'WHO WINS?' }); }
    const expectedElims = TARGET_ELIMS.filter(x => simT > x + 0.6).length;
    const lastElimT = elims.length ? elims[elims.length - 1].t : -9;
    const grace = simT - lastElimT < 2.4; // let the audience breathe after a knockout
    let behind = grace ? -1 : expectedElims - elims.length; // >0: need more chaos
    if (!grace && expectedElims === elims.length && TARGET_ELIMS[elims.length] - simT > 2.2) behind = -1; // ahead of schedule: calm down
    const lateness = behind > 0 ? simT - TARGET_ELIMS[elims.length] : 0;

    const frameDt = 1 / FPS * timeScale;
    for (let s = 0; s < SUB; s++) {
      const dt = frameDt / SUB;
      world.timestep = dt;
      // tile drop rate per round
      let rate = 0;
      if (!winner) {
        if (round === 'crumble') rate = 3.2;
        else if (round === 'tilt') rate = 2.0;
        else if (round === 'meteor') rate = 1.4;
        else if (round === 'shock') rate = 2.4;
        else if (round === 'final') rate = 3.0;
      }
      if (behind > 0) rate *= 1 + Math.min(2, lateness * 0.6);
      if (behind < 0) rate *= 0.6;
      dropAcc += rate * dt;
      while (dropAcc >= 1) {
        dropAcc -= 1;
        const mode = behind > 0 && R() < Math.min(0.95, 0.5 + lateness * 0.2) ? 'threat' : behind < 0 ? 'safe' : (R() < 0.18 ? 'threat' : 'edge');
        const t = pickTile(mode); if (t) warnTile(t, 0.55);
      }
      for (const t of tiles) if (t.state === 1 && simT >= t.warnT) dropTile(t, 'crumble');

      // tilt wobble
      const tiltTarget = winner ? 0 : (round === 'tilt' ? 0.13 : round === 'meteor' ? 0.05 : round === 'shock' || round === 'final' ? 0.07 : 0) * (behind > 0 ? 1.3 : behind < 0 ? 0.55 : 1);
      tiltAmp += (tiltTarget - tiltAmp) * Math.min(1, dt * 1.2);
      tiltPhase += dt * (round === 'tilt' ? 1.25 : 0.8);
      const tq = tiltQuat();
      for (const t of tiles) if (t.state !== 2) {
        const p = rotVec(tq, { x: t.x, y: 0, z: t.z });
        t.body.setNextKinematicTranslation(p); t.body.setNextKinematicRotation(tq);
      }

      // meteors
      if (round === 'meteor' && !winner) {
        meteorAcc += 3.4 * dt;
        while (meteorAcc >= 1) {
          meteorAcc -= 1;
          const m = meteors.find(m => !m.active);
          if (m) {
            const ab = aliveBalls();
            let tx, tz;
            if (ab.length && R() < (behind > 0 ? 0.75 : 0.45)) { const p = ballPos(ab[Math.floor(R() * ab.length)]); tx = p.x + rr(-0.8, 0.8); tz = p.z + rr(-0.8, 0.8); }
            else { const a = rr(0, Math.PI * 2), d = rr(0, 4.5); tx = Math.cos(a) * d; tz = Math.sin(a) * d; }
            m.active = true; m.body.setEnabled(true);
            m.body.setTranslation({ x: tx + 2.5, y: 15, z: tz - 1.5 }, true);
            m.body.setLinvel({ x: -2.5 * 1.25, y: -16, z: 1.5 * 1.25 }, true);
            m.body.setAngvel({ x: rr(-4, 4), y: rr(-4, 4), z: rr(-4, 4) }, true);
            ev('meteor', { m: m.i, x: tx, z: tz });
          }
        }
      }

      // shockwaves
      if ((round === 'shock' || round === 'final') && !winner) {
        shockAcc += dt;
        const period = round === 'final' ? 2.2 : 1.7;
        if (shockAcc >= period) {
          shockAcc = 0;
          const cand = aliveTiles(); const c = cand.length ? cand[Math.floor(R() * cand.length)] : { x: 0, z: 0 };
          const power = (behind > 0 ? 7 + Math.min(4, lateness * 1.5) : behind < 0 ? 4.2 : 5.5) * (round === 'final' ? 1.15 : 1);
          ev('shock', { x: c.x, z: c.z, power });
          for (const b of aliveBalls()) {
            const p = ballPos(b); let dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
            const m = b.body.mass(), k = power / (1 + d * 0.35);
            b.body.applyImpulse({ x: dx * k * m, y: 1.6 * m, z: dz * k * m }, true);
          }
        }
      }

      // ball brains: stay on the platform, dodge warned tiles, ram opponents
      const safe = aliveTiles();
      let cx = 0, cz = 0; for (const t of safe) { cx += t.x; cz += t.z; } if (safe.length) { cx /= safe.length; cz /= safe.length; }
      for (const b of balls) {
        if (!b.alive) continue;
        const p = ballPos(b), v = b.body.linvel(), m = b.body.mass();
        if (p.y < -0.9 && !winner) {
          b.alive = false; elims.push({ name: b.name, t: simT, f: frame });
          ev('elim', { ball: b.i, name: b.name, x: p.x, y: p.y, z: p.z, left: aliveBalls().length });
          slowUntil = vT + 0.75;
          if (aliveBalls().length === 1) {
            winner = aliveBalls()[0]; ev('winner', { ball: winner.i, name: winner.name }); endFrame = frame + Math.round(4.2 * FPS);
            // victory levitation: the champion rises above the wreckage
            winner.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
            const wp = winner.body.translation(); winner.rise = { x: wp.x, y: wp.y, z: wp.z, t0: simT, spin: 0 };
            for (const t of tiles) if (t.state === 1) { t.state = 0; ev('unwarn', { tile: t.i }); }
          }
          continue;
        }
        if (winner && b === winner && b.rise) {
          const k = Math.min(1, (simT - b.rise.t0) / 1.4), e = 1 - Math.pow(1 - k, 3);
          b.rise.spin += dt * (2 + 6 * e);
          b.body.setNextKinematicTranslation({ x: b.rise.x * (1 - e), y: b.rise.y + (2.4 - b.rise.y) * e + Math.sin(simT * 3) * 0.06 * e, z: b.rise.z * (1 - e) });
          b.body.setNextKinematicRotation({ x: 0, y: Math.sin(b.rise.spin / 2), z: 0, w: Math.cos(b.rise.spin / 2) });
          continue;
        }
        if (winner) continue;
        const grounded = p.y > -0.1 && p.y < BR + 0.35;
        if (grounded) b.landed = true;
        // edge proximity (for "near miss" scoring)
        let nearest = 99; for (const t of safe) nearest = Math.min(nearest, Math.hypot(t.x - p.x, t.z - p.z));
        if (b.landed) b.minEdge = Math.min(b.minEdge, nearest > 0.75 ? 99 : 1 - nearest);
        if (!grounded || !b.landed) continue;
        b.wander += dt * 0.7;
        let tx = cx + Math.sin(b.wander * 1.3 + b.i) * 1.4, tz = cz + Math.cos(b.wander * 1.1 + b.i * 2) * 1.4;
        let ax = (tx - p.x) * 2.2 - v.x * 1.6, az = (tz - p.z) * 2.2 - v.z * 1.6;
        for (const t of tiles) if (t.state === 1) { const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz); if (d < 1.3) { ax += dx / (d + 0.2) * 7; az += dz / (d + 0.2) * 7; } }
        const amax = 5.5, al = Math.hypot(ax, az); if (al > amax) { ax *= amax / al; az *= amax / al; }
        b.body.applyImpulse({ x: ax * m * dt, y: 0, z: az * m * dt }, true);
        // dash
        b.dashT -= dt;
        if (b.dashT <= 0 && simT > 1.2 && !winner) {
          const aggr = (round === 'final' ? 1.35 : 1) * (behind > 0 ? 1 + Math.min(0.6, lateness * 0.2) : behind < 0 ? 0.75 : 1);
          b.dashT = rr(1.3, 2.6) / aggr;
          let tgt = null, td = 4.5;
          for (const o of aliveBalls()) if (o !== b) { const q = ballPos(o), d = Math.hypot(q.x - p.x, q.z - p.z); if (d < td) { td = d; tgt = o; } }
          if (tgt) {
            const q = ballPos(tgt); const dx = (q.x - p.x) / td, dz = (q.z - p.z) / td, sp = rr(5.5, 7.5) * aggr;
            b.body.applyImpulse({ x: dx * sp * m, y: 0.6 * m, z: dz * sp * m }, true);
            ev('dash', { ball: b.i, target: tgt.i, speed: sp });
          }
        }
      }

      world.step(eq);
      simT += dt;
      eq.drainContactForceEvents(e => {
        const a = byCollider.get(e.collider1()), c = byCollider.get(e.collider2());
        if (!a || !c) return;
        const key = a.kind + a.i + '|' + c.kind + c.i;
        if (simT - (lastPair.get(key) || -1) < 0.09) return;
        lastPair.set(key, simT);
        const F = e.totalForceMagnitude();
        const kinds = [a.kind, c.kind].sort().join('-');
        const pa = a.body.translation();
        // meteors smash tiles loose
        for (const [x, y] of [[a, c], [c, a]]) if (x.kind === 'meteor' && y.kind === 'tile' && y.state !== 2 && F > 3000) { dropTile(y, 'smash'); }
        const mass = Math.min(a.body.mass() || 1, c.body.mass() || 1);
        const dv = F * world.timestep / mass;
        if (dv < 0.35) return;
        ev('hit', { k: kinds, s: +dv.toFixed(2), x: +pa.x.toFixed(2), y: +pa.y.toFixed(2), z: +pa.z.toFixed(2), b: a.kind === 'ball' ? a.i : c.kind === 'ball' ? c.i : -1 });
      });
    }
    // cull far-fallen debris
    for (const t of tiles) if (t.state === 2 && t.body.isEnabled() && t.body.translation().y < -40) t.body.setEnabled(false);
    for (const m of meteors) if (m.active && m.body.isEnabled() && m.body.translation().y < -40) m.body.setEnabled(false);

    if (record) {
      const arr = new Float32Array(N_BODIES * 7);
      let o = 0;
      for (const x of [...tiles, ...balls, ...meteors]) {
        const p = x.body.translation(), q = x.body.rotation();
        arr[o++] = p.x; arr[o++] = p.y; arr[o++] = p.z; arr[o++] = q.x; arr[o++] = q.y; arr[o++] = q.z; arr[o++] = q.w;
      }
      frames.push(arr);
      meta.push([+simT.toFixed(4), +timeScale.toFixed(3), +tiltAmp.toFixed(4)]);
    }
    frame++;
  }

  // ---- score this seed for drama ----
  const et = elims.map(e => e.f / FPS);
  let score = 0;
  if (!winner) score -= 1000;
  if (elims.length === 4 && winner) {
    TARGET_ELIMS.forEach((x, i) => { score -= Math.abs(et[i] - (x + 0.8 + i * 0.7)) * 2; });
    for (let i = 1; i < 4; i++) if (et[i] - et[i - 1] < 2.6) score -= 25;
    const firstLanded = balls.every(b => b.landed);
    if (!firstLanded) score -= 50;
    if (winner && winner.minEdge > 0 && winner.minEdge < 99) score += Math.min(8, winner.minEdge * 12); // winner had a near-miss
    if (frame / FPS > 33) score -= (frame / FPS - 33) * 4;
    if (frame / FPS < 24) score -= 20;
  }
  return { seed, score, elims: elims.map(e => `${e.name}@${(e.f / FPS).toFixed(1)}`), winner: winner && winner.name, frames, meta, events, nFrames: frame,
    layout: { tiles: tiles.map(t => ({ x: t.x, z: t.z, ring: t.ring })), HR, GAP, TH, BR, balls: BALLS, meteors: meteors.map(m => m.size), N_BODIES } };
}

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? a.concat([[x.slice(2), arr[i + 1]]]) : a), []));
if (args.scan) {
  const [a, b] = args.scan.split('-').map(Number);
  const res = [];
  for (let s = a; s <= b; s++) {
    const r = await simulate(s, false);
    res.push(r);
    console.log(`seed ${s}  score ${r.score.toFixed(1)}  winner ${r.winner}  ${r.elims.join(' ')}  len ${(r.nFrames / FPS).toFixed(1)}s`);
  }
  res.sort((x, y) => y.score - x.score);
  console.log('BEST:', res.slice(0, 5).map(r => `${r.seed}(${r.score.toFixed(1)})`).join(' '));
} else if (args.seed) {
  const r = await simulate(+args.seed, true);
  const out = args.out || `build/lb_${args.seed}`;
  fs.mkdirSync('build', { recursive: true });
  const bin = Buffer.alloc(r.frames.length * r.layout.N_BODIES * 7 * 4);
  r.frames.forEach((f, i) => Buffer.from(f.buffer).copy(bin, i * f.byteLength));
  fs.writeFileSync(out + '.bin', bin);
  fs.writeFileSync(out + '.json', JSON.stringify({ seed: r.seed, fps: FPS, nFrames: r.nFrames, winner: r.winner, elims: r.elims, layout: r.layout, meta: r.meta, events: r.events }));
  console.log(`seed ${r.seed} winner ${r.winner} ${r.elims.join(' ')} frames ${r.nFrames} events ${r.events.length} -> ${out}.{json,bin}`);
}
