// Archimedes screw – tilted tube, double helix, trapped water pockets climbing; ship bilge; reverse-mode turbine.
import { CamRig } from '../core/camrig.js';
export function create({ THREE, wire, scene, camera, tl, E }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.add(wire.ground(60, 40));
  const root = new THREE.Group(); scene.add(root);
  const Lr = 9, R = 1.1, pitch = 1.3, turns = Lr / pitch; const screw = new THREE.Group(); root.add(screw); // local axis = +x
  const tube = wire.cyl(R, R, Lr, 24, { open: true, opacity: 0.55, fillOpacity: 0.02, threshold: 80 }); tube.rotation.z = -Math.PI / 2; screw.add(tube);
  const ringsPts = []; for (let i = 0; i <= 8; i++) { const x = -Lr / 2 + i * Lr / 8; const rg = wire.circle(R, 48, { opacity: 0.5 }); rg.rotation.y = Math.PI / 2; rg.position.x = x; screw.add(rg); }
  const shaft = wire.cyl(0.14, 0.14, Lr + 1.2, 10, { opacity: 0.8 }); shaft.rotation.z = -Math.PI / 2; screw.add(shaft);
  const rotor = new THREE.Group(); screw.add(rotor);
  for (const ph of [0, Math.PI]) { const pts = []; const N = Math.round(turns * 48); for (let i = 0; i <= N; i++) { const x = -Lr / 2 + i / N * Lr; const a = i / N * turns * Math.PI * 2 + ph; pts.push(V(x, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92)); } rotor.add(wire.polyline(pts, { opacity: 1, color: wire.bright })); const inner = pts.map((p, i) => V(p.x, p.y * 0.35, p.z * 0.35)); rotor.add(wire.polyline(inner, { opacity: 0.4 })); const ribs = []; for (let i = 0; i <= N; i += 6) ribs.push(pts[i], inner[i]); rotor.add(wire.segments(ribs, { opacity: 0.45 })); }
  // water particles: pockets
  const NP = 60; const pts = []; for (let i = 0; i < NP; i++) pts.push(V(0, 0, 0)); const water = wire.nodes(pts, 0.55, { color: wire.cyan }); screw.add(water); const WP = water.geometry.attributes.position;
  // trough (bottom) + channel (top)
  const trough = wire.box(3.2, 1.0, 3.0, { opacity: 0.6, fillOpacity: 0.05, color: wire.cyan }); root.add(trough);
  const channel = wire.box(3.0, 0.5, 1.6, { opacity: 0.6, fillOpacity: 0.05, color: wire.cyan }); root.add(channel);
  const troughWater = wire.nodes(new Array(40).fill(0).map((_, i) => V((i % 8) * 0.38 - 1.3, 0.1, Math.floor(i / 8) * 0.55 - 1.1)), 0.5, { color: wire.cyan }); trough.add(troughWater);
  const crank = wire.polyline([V(Lr / 2 + 0.6, 0, 0), V(Lr / 2 + 1.1, 0, 0), V(Lr / 2 + 1.1, 0.8, 0), V(Lr / 2 + 1.6, 0.8, 0)], { opacity: 0.9 }); rotor.add(crank);
  const figure = wire.figure(1.7); root.add(figure); figure.visible = false;
  // ship hull outline (for 'ship' cue)
  const hull = new THREE.Group(); const hp = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const x = -14 + 28 * u; const y = -2.2 * Math.sin(u * Math.PI) ** 0.6 + 0.3; hp.push(V(x, -y, 0)); } hull.add(wire.polyline(hp, { opacity: 0.8 })); hull.add(wire.polyline([V(-14, 0.3, 0), V(14, 0.3, 0)], { opacity: 0.6 })); hull.add(wire.polyline([V(-13, 0.3, 0), V(-13, 3.5, 0), V(13, 3.5, 0), V(13, 0.3, 0)], { opacity: 0.45 }));
  const decks = []; for (let k = 1; k < 4; k++) decks.push(V(-13 + k * 0.5, 0.3 + k * 0.9, 0), V(13 - k * 0.5, 0.3 + k * 0.9, 0)); hull.add(wire.segments(decks, { opacity: 0.35 }));
  hull.position.set(0, 1.5, -3); hull.visible = false; root.add(hull);
  // generator (reverse)
  const gen = wire.box(1.6, 1.2, 1.2, { opacity: 0.9, fillOpacity: 0.08 }); root.add(gen); gen.visible = false;
  const bolt = wire.polyline([V(0.2, 0.9, 0), V(-0.15, 0.2, 0), V(0.15, 0.2, 0), V(-0.2, -0.6, 0)], { opacity: 1, color: wire.cyan }); gen.add(bolt);
  const rig = new CamRig(camera, tl, THREE).add(
    { at: 0, pos: [1.2, 3.0, 7.0], look: [-0.6, 2.4, 0], fov: 44, orbit: 0.25, dur: 0.01 },
    { at: 1.0, pos: [5, 4.2, 8.5], look: [1.8, 2.9, 0], fov: 46, dur: 0.01, drift: [-0.8, 0.1, -0.6] },
    { at: 'assemble', pos: [3, 3.5, 15], look: [0, 1.6, 0], fov: 54, orbit: 0.05, dur: 0.01 },
    { at: 'tilt', pos: [0, 2.5, 14], look: [0, 2.2, 0], fov: 50, dur: 0.01, orbit: 0.02 },
    { at: 'spin', pos: [1.5, 2.6, 9], look: [-1.2, 1.4, 0], fov: 48, dur: 0.01, orbit: 0.05 },
    { at: 'climb', pos: [3, 3.5, 10], look: [0.5, 2.6, 0], fov: 48, dur: 0.9, drift: [0.15, 0.12, 0] },
    { at: 'ship', pos: [2, 4, 22], look: [0, 1.5, 0], fov: 54, dur: 0.01, orbit: 0.03 },
    { at: 'reverse', pos: [-4, 4, 13], look: [-0.5, 2.4, 0], fov: 52, dur: 0.01, orbit: 0.05 },
    { at: 'end_number', pos: [3, 3.5, 14], look: [0, 2, 0], fov: 54, dur: 0.9, orbit: 0.06 },
    { at: 'cta', pos: [1.2, 3.0, 7.0], look: [-0.6, 2.4, 0], fov: 44, orbit: 0.25, dur: 0.8 });
  let angle = 0, lastT = 0;
  return {
    update(api) {
      const { t, cue, project, E } = api; rig.apply(t); const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t; const cold = cue('assemble') < 0 || cue('cta') > 0;
      const rev0 = cold ? 1 : E.easeOutCubic(E.win(cue('assemble'), 0, 1.2)); wire.reveal(screw, rev0); wire.reveal(trough, rev0); wire.reveal(channel, rev0);
      // tilt: flat until 'tilt', then rotate to 30°
      const tiltDeg = cold ? 30 : (cue('tilt') > 0 ? E.lerp(8, 30, E.easeInOutCubic(E.win(cue('tilt'), 0.3, 1.3))) : 8); const th = tiltDeg * Math.PI / 180;
      screw.rotation.z = th; screw.position.set(0, Lr / 2 * Math.sin(th) + R + 0.2, 0);
      const bottom = V(-Lr / 2, -R, 0).applyAxisAngle(V(0, 0, 1), th).add(screw.position); const top = V(Lr / 2, -R, 0).applyAxisAngle(V(0, 0, 1), th).add(screw.position);
      trough.position.set(bottom.x - 0.6, 0.5, 0); channel.position.set(top.x + 1.2, top.y + 0.4, 0);
      // rotation: slow idle, spin from 'spin', reverse from 'reverse'
      const rev = cue('reverse') > 0.4; const sp = cold ? 2.4 : (cue('spin') > 0 ? (rev ? -1.6 : 1.5) : 0.25); angle += sp * dt; rotor.rotation.x = angle;
      // water pockets: param along axis advances with rotation; sit at the gravity-low side of the tube
      const pockets = cold || cue('spin') > 0.2; const flow = (angle / (2 * Math.PI)) * pitch; const low = V(0, -1, 0).applyAxisAngle(V(0, 0, 1), -th); // gravity dir in screw frame
      for (let i = 0; i < NP; i++) { const k = i % 12; const lane = Math.floor(i / 12); const x0 = -Lr / 2 + ((k * pitch * 0.5 + flow) % (Lr + 0.4) + (Lr + 0.4)) % (Lr + 0.4) - 0.2; const visible = pockets && x0 > -Lr / 2 + 0.1 && x0 < Lr / 2 - 0.1; const rr = R * (0.55 + 0.25 * (lane % 3) / 2); const jitter = (lane - 2) * 0.16; WP.setXYZ(i, visible ? x0 + jitter : 999, visible ? low.y * rr + 0.12 * ((lane + 1) % 2) : 999, visible ? low.x * rr * 0 + (lane - 2) * 0.22 : 999); }
      WP.needsUpdate = true; water.visible = pockets;
      figure.visible = !cold && cue('spin') > 0 && cue('ship') < 0; figure.position.set(top.x + 1.3, 0, 0.3); figure.walk(angle * 0.8, 0.25); figure.scale.x = -1;
      const ann = [], readouts = [], scans = [];
      if (cue('assemble') > 0 && cue('assemble') < 1.6) scans.push({ t0: tl.cues.find((c) => c.name === 'assemble').t + 0.1, dur: 1.2, y0: 300, y1: 1200, label: 'SECTION' });
      if (!cold && cue('tilt') > 0 && cue('ship') < 0) { const p = project(bottom.clone().add(V(1.2, -0.3, 0))); ann.push({ x: p.x + 40, y: p.y + 90, lx: p.x, ly: p.y, text: `TILT ${Math.round(tiltDeg)}°`, alpha: E.win(cue('tilt'), 0.5, 0.3) }); readouts.push({ label: 'angle', value: Math.round(tiltDeg) + '°', blink: tiltDeg < 29.5 }); }
      if (pockets && !cold && cue('ship') < 0) { readouts.push({ label: 'rotation', value: (Math.abs(sp) * 9.5).toFixed(0) + ' RPM' }, { label: 'lift', value: (Lr * Math.sin(th) * 0.9).toFixed(1) + ' M' }); const i0 = 5; const p = project(V(WP.getX(i0), WP.getY(i0), WP.getZ(i0)).applyAxisAngle(V(0, 0, 1), th).add(screw.position)); if (WP.getX(i0) < 500) ann.push({ x: p.x + 170, y: p.y - 120, lx: p.x, ly: p.y, text: 'TRAPPED POCKET', kind: 'cyan', alpha: E.win(cue('spin'), 1.8, 0.3) }); }
      if (cue('climb') > 0 && cue('geometry') < 0) { const p = project(top); ann.push({ x: p.x - 60, y: p.y - 140, lx: p.x, ly: p.y, text: 'OUT · UPHILL', kind: 'cyan' }); }
      hull.visible = cue('ship') > 0 && cue('reverse') < 0; if (hull.visible) { wire.reveal(hull, E.win(cue('ship'), 0.2, 1.4)); const p = project(V(0, 4.2, -3)); ann.push({ x: p.x, y: p.y - 40, text: 'SYRACUSIA · c. 240 BC · 55 m', alpha: E.win(cue('ship'), 1.2, 0.3) }); readouts.push({ label: 'bilge', value: 'DRAINING', blink: true }); }
      const rv = cue('reverse'); gen.visible = rv > 0 && !cold; if (gen.visible) { gen.position.set(top.x + 1.4, top.y + 1.6, 0); wire.reveal(gen, E.win(rv, 0.5, 1)); const kw = Math.round(E.easeOutCubic(E.win(rv, 2.4, 3)) * 250); readouts.push({ label: 'power', value: kw + ' KW', blink: rv > 2.4 && rv < 3.4, color: wire.cyan.getStyle() }); const p = project(gen.position); ann.push({ x: p.x + 40, y: p.y - 120, lx: p.x, ly: p.y, text: 'GENERATOR', kind: 'cyan', alpha: E.win(rv, 2.4, 0.3) }); readouts.push({ label: 'flow', value: rev ? 'DOWN ↓' : 'UP ↑' }); channel.position.y += 0; }
      return { annotations: ann, readouts, scans };
    }
  };
}
