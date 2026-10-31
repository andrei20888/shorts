// Antikythera mechanism – meshing gear train (ratios by tooth count), dial with sun/moon pointers, pin-and-slot lunar anomaly.
import { CamRig } from '../core/camrig.js';
export function create({ THREE, wire, scene, camera, tl, E }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group(); scene.add(root);
  const M = 0.0135 * 2; // module: radius = M * teeth / 2
  const gears = []; const add = (teeth, x, y, z, th = 0.14, opts = {}) => { const g = wire.gear(teeth, M * teeth / 2, th, { spokes: teeth > 100 ? 4 : teeth > 40 ? 0 : 0, ...opts }); g.position.set(x, y, z); g.userData.w = 0; root.add(g); gears.push(g); return g; };
  const r = (n) => M * n / 2;
  const b1 = add(223, 0, 0, 0, 0.16, { spokes: 4 });                       // main 4-spoke wheel
  const a1 = add(48, r(223) + r(48), 0, 0);                                // crown/drive gear (crank)
  const b2 = add(64, -(r(223) + r(64)) * Math.cos(0.6), (r(223) + r(64)) * Math.sin(0.6), 0.25);
  const c1 = add(38, b2.position.x, b2.position.y, 0.5, 0.12);             // coaxial with b2
  const c2 = add(48, c1.position.x - (r(38) + r(48)) * Math.cos(0.2), c1.position.y + (r(38) + r(48)) * Math.sin(0.2), 0.5, 0.12);
  const d1 = add(24, c2.position.x, c2.position.y, 0.75, 0.1);
  const d2 = add(127, d1.position.x - (r(24) + r(127)) * Math.cos(-0.9), d1.position.y + (r(24) + r(127)) * Math.sin(-0.9), 0.75, 0.14, { spokes: 0 });
  const e1 = add(32, r(223) * Math.cos(-2.2) + (r(32)) * Math.cos(-2.2), r(223) * Math.sin(-2.2) + r(32) * Math.sin(-2.2), 0);
  const e2 = add(53, e1.position.x, e1.position.y, -0.25, 0.12);
  const e3 = add(96, e2.position.x + (r(53) + r(96)) * Math.cos(-1.2), e2.position.y + (r(53) + r(96)) * Math.sin(-1.2), -0.25, 0.12, { spokes: 0 });
  // pin-and-slot pair (k1, k2): same tooth count, offset axes, exaggerated eccentricity
  const kc = V(b1.position.x + (r(223) + r(50)) * Math.cos(2.0), b1.position.y + (r(223) + r(50)) * Math.sin(2.0), 0);
  const ecc = 0.16; const k1 = add(50, kc.x, kc.y, 0.0, 0.1); const k2 = add(50, kc.x + ecc, kc.y, 0.26, 0.1);
  const pinR = r(50) * 0.6; const pin = wire.cyl(0.06, 0.06, 0.5, 8, { opacity: 1, color: wire.cyan }); pin.rotation.x = Math.PI / 2; root.add(pin);
  const slot = wire.polyline([V(pinR - ecc - 0.05, 0.08, 0.14), V(pinR + ecc + 0.05, 0.08, 0.14), V(pinR + ecc + 0.05, -0.08, 0.14), V(pinR - ecc - 0.05, -0.08, 0.14)], { closed: true, opacity: 1, color: wire.cyan }); k2.add(slot);
  const pinNode = wire.nodes([V(0, 0, 0)], 0.5, { color: wire.cyan }); root.add(pinNode);
  // axles
  for (const g of gears) { const ax = wire.cyl(0.05, 0.05, 1.6, 6, { opacity: 0.35, fill: false }); ax.rotation.x = Math.PI / 2; ax.position.copy(g.position); root.add(ax); }
  // crank
  const crank = wire.polyline([V(0, 0, 0.2), V(0, 0, 0.9), V(0.5, 0, 0.9), V(0.5, 0, 1.3)], { opacity: 0.9 }); crank.position.copy(a1.position); root.add(crank);
  // case + front dial
  const box = wire.box(7.2, 8.4, 2.2, { opacity: 0.35, fillOpacity: 0.012 }); box.position.set(-0.6, 0.3, 0.2); root.add(box);
  const dial = new THREE.Group(); dial.position.set(0, 0, 1.3); root.add(dial);
  dial.add(wire.circle(3.2, 96, { opacity: 0.9 })); dial.add(wire.circle(2.75, 96, { opacity: 0.5 }));
  const ticks = []; for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; const L = i % 6 === 0 ? 0.35 : 0.14; ticks.push(V(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0), V(Math.cos(a) * (3.2 - L), Math.sin(a) * (3.2 - L), 0)); }
  dial.add(wire.segments(ticks, { opacity: 0.7 }));
  const sunP = wire.polyline([V(0, 0, 0), V(0, 2.6, 0)], { opacity: 1 }); const sunN = wire.nodes([V(0, 2.6, 0)], 0.6); sunP.add(sunN); dial.add(sunP);
  const moonP = wire.polyline([V(0, 0, 0), V(0, 2.1, 0)], { opacity: 1, color: wire.cyan }); const moonN = wire.nodes([V(0, 2.1, 0)], 0.5, { color: wire.cyan }); moonP.add(moonN); dial.add(moonP);
  const eclipseMarks = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.3; eclipseMarks.push(V(Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0)); }
  const eclipseN = wire.nodes(eclipseMarks, 0.42, { color: wire.alert }); dial.add(eclipseN); eclipseN.visible = false;
  // gear rotation bookkeeping (ratios by tooth count)
  const chain = [[a1, b1], [b1, b2], [b2, c1, 'coax'], [c1, c2], [c2, d1, 'coax'], [d1, d2], [b1, e1], [e1, e2, 'coax'], [e2, e3], [b1, k1]];
  let crankAngle = 0, lastT = 0;
  const rig = new CamRig(camera, tl, THREE).add(
    { at: 0, pos: [1.5, 1.5, 15], look: [-0.3, 0.2, 0], fov: 50, orbit: 0.04 },
    { at: 'reveal', pos: [4, 3, 13], look: [-0.5, 0.3, 0], fov: 50, orbit: 0.05, dur: 1.2 },
    { at: 'crank', pos: [6, 1.5, 9], look: [1.5, 0.2, 0], fov: 46, orbit: 0.06, dur: 1.2 },
    { at: 'g223', pos: [1, -1, 9.5], look: [0, 0, 0], fov: 48, orbit: 0.05, dur: 1.0 },
    { at: 'saros', pos: [0.5, 1.5, 9.5], look: [0, 0.2, 0.8], fov: 46, orbit: 0.04, dur: 1.0 },
    { at: 'predict', pos: [-1, 2, 9], look: [0, 0.2, 1], fov: 46, orbit: 0.05, dur: 1.0 },
    { at: 'focus_pin', pos: [kc.x + 1.5, kc.y + 1.5, 4.5], look: [kc.x, kc.y, 0.1], fov: 40, dur: 1.2, drift: [0, 0, -0.15] },
    { at: 'pinslot', pos: [kc.x + 1.2, kc.y + 0.8, 3.2], look: [kc.x + 0.1, kc.y, 0.1], fov: 40, orbit: 0.08, dur: 1.0 },
    { at: 'moon_speed', pos: [kc.x + 2, kc.y + 1.2, 5.5], look: [kc.x * 0.4, kc.y * 0.4, 0.6], fov: 44, orbit: 0.05, dur: 1.2 },
    { at: 'lost', pos: [3, 2, 14], look: [-0.5, 0.3, 0], fov: 50, orbit: 0.05, dur: 1.4 },
    { at: 'mystery', pos: [-3, 1, 13], look: [-0.5, 0.3, 0], fov: 50, orbit: 0.05, dur: 1.4 },
    { at: 'cta', pos: [2, 3, 15], look: [-0.5, 0, 0], fov: 50, orbit: 0.07, dur: 1.4 });
  return {
    update(api) {
      const { t, cue, project, E } = api; rig.apply(t);
      const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
      // reveal
      const rv = E.easeOutCubic(E.win(t, 0.0, 2.6)); gears.forEach((g, i) => wire.reveal(g, E.win(rv, i / gears.length * 0.6, 0.4))); wire.reveal(box, E.win(t, 0.3, 1.5)); wire.reveal(dial, E.win(t, 1.2, 1.6)); wire.reveal(crank, E.win(t, 1.6, 0.8));
      // crank speed
      const ck = cue('crank'); const speed = ck > 0 ? (cue('lost') > 2.4 ? 0.0 : 1.0) : 0.12; crankAngle += speed * dt * 1.8;
      a1.userData.w = crankAngle; crank.rotation.z = crankAngle;
      for (const [A, B, mode] of chain) B.userData.w = mode === 'coax' ? A.userData.w : -A.userData.w * A.userData.teeth / B.userData.teeth + (B === b1 ? 0 : Math.PI / B.userData.teeth);
      for (const g of gears) g.rotation.z = g.userData.w;
      // pin-and-slot: k2 follows the pin on k1 (variable speed)
      const px = kc.x + Math.cos(k1.userData.w) * pinR, py = kc.y + Math.sin(k1.userData.w) * pinR; pin.position.set(px, py, 0.13); pinNode.position.set(px, py, 0.3);
      const ang2 = Math.atan2(py - kc.y, px - (kc.x + ecc)); k2.rotation.z = ang2; k2.userData.w = ang2;
      const moonSpeed = 1 + 0.45 * Math.cos(k1.userData.w); // visual readout of the anomaly
      // dial pointers
      sunP.rotation.z = -b1.userData.w * 0.5; moonP.rotation.z = -k2.userData.w * 6.5;
      const ann = [], readouts = [], scans = [];
      if (t < 2.8) scans.push({ t0: 0.35, dur: 1.6, y0: 260, y1: 1250, label: 'X-RAY SCAN' });
      if (cue('reveal') > 0 && cue('focus_pin') < 0) readouts.push({ label: 'bronze gears', value: cue('reveal') > 0.8 ? '30+' : '…', blink: cue('reveal') < 0.8 });
      if (ck > 0 && cue('focus_pin') < 0) readouts.push({ label: 'crank', value: speed > 0.5 ? 'TURNING' : 'STOPPED' });
      const g2 = cue('g223');
      if (g2 > 0 && cue('focus_pin') < 0) { const p = project(V(b1.position.x + r(223) * 0.7, b1.position.y + r(223) * 0.7, 0)); ann.push({ x: p.x + 160, y: p.y - 120, lx: p.x, ly: p.y, text: '223 TEETH', alpha: E.win(g2, 0.4, 0.3) }); }
      const sr = cue('saros'); eclipseN.visible = sr > 0.4 && cue('focus_pin') < 0;
      if (sr > 0 && cue('focus_pin') < 0) { const p = project(V(0, -2.9, 1.3)); ann.push({ x: p.x, y: p.y + 70, text: 'SAROS = 223 MONTHS', kind: 'cyan', alpha: E.win(sr, 0.3, 0.3) }); readouts.push({ label: 'next eclipse', value: cue('predict') > 0 ? `+${Math.floor(((cue('predict') * 7) % 223) + 1)} MONTHS` : '…', blink: cue('predict') < 0 }); }
      const fp = cue('focus_pin'); const focusing = fp > 0 && cue('lost') < 0;
      gears.forEach((g) => { if (g !== k1 && g !== k2) wire.setOpacity(g, focusing ? 0.25 : 1); }); wire.setOpacity(box, focusing ? 0.2 : 1); wire.setOpacity(dial, focusing ? 0.25 : 1);
      if (fp > 0 && fp < 2.6) scans.push({ t0: tl.cues.find((c) => c.name === 'focus_pin').t + 0.3, dur: 1.2, y0: 300, y1: 1100, label: 'LOCATING' });
      const ps = cue('pinslot');
      if (ps > 0 && cue('lost') < 0) { const p = project(V(px, py, 0.3)); ann.push({ x: p.x + 170, y: p.y - 130, lx: p.x, ly: p.y, text: 'PIN', kind: 'cyan', alpha: E.win(ps, 1.8, 0.3) }); const c2p = project(V(kc.x + ecc, kc.y + r(50) * 0.95, 0.26)); ann.push({ x: c2p.x - 180, y: c2p.y - 80, lx: c2p.x, ly: c2p.y, text: 'SLOT · OFF-CENTER', kind: 'cyan', alpha: E.win(ps, 0.6, 0.3) }); readouts.push({ label: 'axis offset', value: '1.1 MM' }); }
      if (cue('moon_speed') > 0 && cue('lost') < 0) { readouts.push({ label: 'moon speed', value: moonSpeed.toFixed(2) + ' ×', blink: moonSpeed > 1.35 }); const mp = project(V(0, 2.1, 1.3).applyAxisAngle(V(0, 0, 1), moonP.rotation.z)); ann.push({ x: mp.x + 150, y: mp.y - 90, lx: mp.x, ly: mp.y, text: moonSpeed > 1 ? 'MOON · FAST' : 'MOON · SLOW', kind: 'cyan' }); }
      const lo = cue('lost'); let bloom = 1;
      if (lo > 2.4 && cue('cta') < 0) { const k = E.lerp(1, 0.35, E.win(lo, 2.4, 1.6)) * (E.hash(Math.floor(t * 20)) > 0.3 ? 1 : 0.4); root.traverse((o) => { if (o.material) { if (o.userData.baseOpacity === undefined) o.userData.baseOpacity = o.material.opacity; o.material.opacity = o.userData.baseOpacity * k; } }); bloom = k; readouts.push({ label: 'status', value: 'LOST · 1,400 YRS', blink: true, color: wire.alert.getStyle() }); }
      else if (lo > 0) root.traverse((o) => { if (o.material && o.userData.baseOpacity !== undefined) o.material.opacity = o.userData.baseOpacity; });
      if (cue('mystery') > 0) readouts.push({ label: 'builder', value: 'UNKNOWN', blink: true, color: wire.alert.getStyle() });
      return { annotations: ann, readouts, scans, bloom };
    }
  };
}
