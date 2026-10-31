// Great Pyramid – masonry wireframe, external ramp problem, clipped section, internal spiral ramp (Houdin), Grand Gallery counterweight, 2017 void.
import { CamRig } from '../core/camrig.js';
export function create({ THREE, wire, scene, camera, tl, E }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.add(wire.ground(80, 40));
  const S = 1 / 20; const B = 230.3 * S, Hh = 146.6 * S; const root = new THREE.Group(); scene.add(root);
  const clipPlane = new THREE.Plane(V(0, 0, -1), 100); // clips z > constant
  const pyr = new THREE.Group(); root.add(pyr);
  const corners = (h) => { const s = B / 2 * (1 - h / Hh); return [V(-s, h, -s), V(s, h, -s), V(s, h, s), V(-s, h, s)]; };
  const base = corners(0); const apex = V(0, Hh, 0);
  pyr.add(wire.polyline(base, { closed: true, opacity: 1 }));
  pyr.add(wire.segments([base[0], apex, base[1], apex, base[2], apex, base[3], apex], { opacity: 1 }));
  const layers = []; for (let h = 0.35; h < Hh - 0.2; h += 0.42) { const c = corners(h); for (let i = 0; i < 4; i++) layers.push(c[i], c[(i + 1) % 4]); }
  pyr.add(wire.segments(layers, { opacity: 0.22 }));
  const faces = new THREE.ConeGeometry(B / Math.SQRT2, Hh, 4); faces.translate(0, Hh / 2, 0); faces.rotateY(Math.PI / 4);
  const fill = new THREE.Mesh(faces, wire.fillMat({ opacity: 0.04 })); pyr.add(fill);
  // internal spiral ramp (inset path climbing the edges) + corner notches
  const rampPts = [], notchPts = []; const turns = 5.5; let steps = 0;
  for (let k = 0; k <= turns * 4; k++) { const h = (k / (turns * 4)) * Hh * 0.82; const s = B / 2 * (1 - h / Hh) - 0.55; const i = k % 4; const cs = [V(-s, h, -s), V(s, h, -s), V(s, h, s), V(-s, h, s)]; rampPts.push(cs[i]); if (k > 0) notchPts.push(cs[i]); steps++; }
  const ramp = wire.polyline(rampPts, { opacity: 1, color: wire.bright }); pyr.add(ramp);
  const notches = wire.nodes(notchPts, 0.5); pyr.add(notches); notches.visible = false;
  const travelBlock = wire.box(0.35, 0.25, 0.25, { opacity: 1, fillOpacity: 0.2 }); pyr.add(travelBlock); travelBlock.visible = false;
  const curve = new THREE.CatmullRomCurve3(rampPts, false, 'catmullrom', 0.0);
  // Grand Gallery (sloped box) + King's chamber + counterweight sled + void
  const gal = new THREE.Group(); const gLen = 47 * S * 1.6, gH = 8.6 * S * 1.6, gW = 2.1 * S * 2.5; const gAng = 26.2 * Math.PI / 180;
  const galBox = wire.box(gLen, gH, gW, { opacity: 0.9, fillOpacity: 0.05, color: wire.cyan }); gal.add(galBox);
  gal.rotation.z = gAng; gal.position.set(0.1, 1.6, 0.35); root.add(gal);
  const chamber = wire.box(10.5 * S * 1.5, 5.8 * S * 1.5, 5.2 * S * 1.5, { opacity: 0.9, fillOpacity: 0.05 }); chamber.position.set(-1.6, 2.25, 0.35); root.add(chamber);
  const sled = wire.box(0.9, 0.35, gW * 0.8, { opacity: 1, fillOpacity: 0.15, color: wire.bright }); gal.add(sled);
  const beam = wire.box(0.9, 0.25, 0.25, { opacity: 1, fillOpacity: 0.2 }); root.add(beam);
  const rope = wire.polyline([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], { opacity: 0.9 }); root.add(rope);
  const voidBox = wire.box(30 * S * 1.6, 1.3, gW * 1.4, { opacity: 1, fillOpacity: 0.12, color: wire.cyan }); voidBox.rotation.z = gAng; voidBox.position.set(0.3, 3.7, 0.35); root.add(voidBox); voidBox.visible = false;
  [gal, chamber, beam, rope].forEach((g) => (g.visible = false));
  // external ramp (problem) – long wedge to the right
  const ext = new THREE.Group(); const L = 1600 * S * 0.22; const ep = [V(B / 2, Hh * 0.98, 0.6), V(B / 2 + L, 0, 0.6), V(B / 2, 0, 0.6), V(B / 2, Hh * 0.98, -0.6), V(B / 2 + L, 0, -0.6), V(B / 2, 0, -0.6)];
  ext.add(wire.segments([ep[0], ep[1], ep[1], ep[2], ep[2], ep[0], ep[3], ep[4], ep[4], ep[5], ep[5], ep[3], ep[0], ep[3], ep[1], ep[4]], { opacity: 0.8, color: wire.alert }));
  const extFill = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([ep[0], ep[1], ep[4], ep[0], ep[4], ep[3]]), wire.fillMat({ opacity: 0.08, color: wire.alert })); ext.add(extFill);
  root.add(ext); ext.visible = false;
  // clipping for the cut
  const applyClip = (g, on) => g.traverse((o) => { if (o.material) o.material.clippingPlanes = on ? [clipPlane] : null; });
  applyClip(pyr, true);
  const rig = new CamRig(camera, tl, THREE).add(
    { at: 0, pos: [9, 6, 13], look: [0, 2.8, 0], fov: 60, orbit: 0.06 },
    { at: 'ext_ramp', pos: [14, 7, 17], look: [5, 2.8, 0], fov: 58, orbit: 0.03, dur: 1.3 },
    { at: 'ramp_problem', pos: [24, 10, 26], look: [10, 2.5, 0], fov: 58, dur: 1.4, drift: [0.6, 0, 0] },
    { at: 'cut', pos: [4, 6, 18], look: [0, 3.4, 0], fov: 52, dur: 1.4, orbit: 0.0 },
    { at: 'internal', pos: [2, 5.5, 15], look: [0, 3.2, 0], fov: 50, dur: 1.2, orbit: 0.04 },
    { at: 'spiral_trace', pos: [7, 6, 13], look: [0, 3.4, 0], fov: 50, dur: 1.3, orbit: 0.07 },
    { at: 'beams', pos: [-5, 4.5, 11], look: [-1, 2.6, 0], fov: 46, dur: 1.2, orbit: 0.04 },
    { at: 'counterweight', pos: [1.5, 3.4, 8.5], look: [0.2, 2.4, 0.3], fov: 44, dur: 1.3, orbit: 0.03 },
    { at: 'cw_motion', pos: [3, 3.2, 8], look: [-0.3, 2.5, 0.3], fov: 44, dur: 1.2, orbit: 0.04 },
    { at: 'void', pos: [2.5, 5.5, 9.5], look: [0, 3.2, 0.3], fov: 46, dur: 1.3, orbit: 0.05 },
    { at: 'hold', pos: [6, 6, 13], look: [0, 3.2, 0], fov: 50, dur: 1.4, orbit: 0.06 },
    { at: 'cta', pos: [11, 8, 17], look: [0, 3, 0], fov: 54, dur: 1.4, orbit: 0.08 });
  let lastT = 0;
  return {
    update(api) {
      const { t, cue, project, E } = api; rig.apply(t);
      const rv = E.easeOutCubic(E.win(t, 0, 2.4)); wire.reveal(pyr, rv); ramp.visible = false; notches.visible = false;
      const ann = [], readouts = [], scans = [];
      if (t < 3) scans.push({ t0: 0.4, dur: 1.8, y0: 250, y1: 1250, label: 'SURVEY' });
      if (cue('assemble') > 0 && cue('cut') < 0) readouts.push({ label: 'blocks', value: Math.round(E.easeOutCubic(E.win(t, 0.6, 3.2)) * 2300000).toLocaleString('en-US') }, { label: 'rate', value: '1 / 3 MIN' });
      // external ramp
      const er = cue('ext_ramp'); ext.visible = er > 0 && cue('cut') < 0;
      if (ext.visible) { wire.reveal(ext, E.win(er, 0.2, 1.2)); const p = project(V(B / 2 + L * 0.55, Hh * 0.45, 0)); ann.push({ x: p.x, y: p.y - 80, text: cue('ramp_problem') > 0.5 ? 'RAMP · 1.6 KM · 8% SLOPE' : 'EXTERNAL RAMP ?', kind: 'alert', alpha: E.win(er, 0.9, 0.3) }); readouts.push({ label: 'ramp volume', value: cue('ramp_problem') > 1.5 ? '> PYRAMID' : 'CALCULATING…', blink: cue('ramp_problem') > 1.5 }); }
      // cut: clip plane sweeps from +z to 0
      const ct = cue('cut'); clipPlane.constant = ct > 0 ? E.lerp(10, 0.0, E.easeInOutCubic(E.win(ct, 0.3, 1.4))) : 100;
      if (ct > 0 && ct < 2.2) scans.push({ t0: tl.cues.find((c) => c.name === 'cut').t + 0.3, dur: 1.4, y0: 300, y1: 1200, label: 'SECTION A-A' });
      // internal ramp
      const it = cue('internal');
      if (it > 0) { ramp.visible = true; wire.reveal(ramp, E.win(it, 0.3, 2.6)); notches.visible = cue('spiral_trace') > 0.5; }
      const st = cue('spiral_trace'); travelBlock.visible = st > 0 && cue('counterweight') < 0;
      if (travelBlock.visible) { const u = E.clamp(st / 6.5); const p = curve.getPointAt(u); travelBlock.position.copy(p).add(V(0, 0.12, 0)); const sp = project(p); ann.push({ x: sp.x + 170, y: sp.y - 110, lx: sp.x, ly: sp.y, text: `BLOCK · 2.5 T · ${Math.round(u * 100)}%` }); readouts.push({ label: 'ramp slope', value: '7 %' }, { label: 'corners', value: 'OPEN · TURN' }); }
      if (it > 0 && cue('beams') < 0) { const a = project(V(0, Hh * 0.5, B / 4)); if (st < 0) ann.push({ x: a.x, y: a.y + 180, text: 'INTERNAL SPIRAL RAMP', alpha: E.win(it, 1.2, 0.3) }); }
      // beams / gallery / counterweight
      const bm = cue('beams'); const showGal = bm > 0; [gal, chamber, beam, rope].forEach((g) => (g.visible = showGal));
      if (showGal) {
        wire.reveal(gal, E.win(bm, 0.2, 1.2)); wire.reveal(chamber, E.win(bm, 0.0, 1.0));
        const cw = cue('cw_motion'); const u = cw > 0 ? E.easeInOutCubic(E.win(cw, 0.2, 3.2)) : 0;
        sled.position.set(gLen * 0.42 - gLen * 0.84 * u, 0, 0);
        const beamStart = V(-2.6, 0.5, 0.35), beamEnd = V(-2.1, 2.1, 0.35); beam.position.copy(beamStart.clone().lerp(beamEnd, u));
        const top = V(gLen * 0.5, gH * 0.5, 0).applyAxisAngle(V(0, 0, 1), gAng).add(gal.position); const sledW = sled.position.clone().applyAxisAngle(V(0, 0, 1), gAng).add(gal.position);
        const P = rope.children[0].geometry.attributes.position; P.setXYZ(0, sledW.x, sledW.y, sledW.z); P.setXYZ(1, top.x, top.y, top.z); P.setXYZ(2, beam.position.x, beam.position.y, beam.position.z); P.needsUpdate = true;
        if (cue('counterweight') > 0.8 && cue('void') < 0) { const g = project(top); ann.push({ x: g.x + 150, y: g.y - 100, lx: g.x, ly: g.y, text: 'GRAND GALLERY · 47 m', kind: 'cyan' }); const s = project(sledW); ann.push({ x: s.x + 200, y: s.y + 60, lx: s.x, ly: s.y, text: 'COUNTERWEIGHT SLED', alpha: E.win(cue('counterweight'), 1.6, 0.3) }); }
        if (cw > 0 && cue('void') < 0) { const b = project(beam.position); ann.push({ x: b.x - 200, y: b.y - 60, lx: b.x, ly: b.y, text: 'GRANITE BEAM · 60 T' }); readouts.push({ label: 'beam lift', value: Math.round(u * 100) + ' %' }); }
        if (bm > 0 && cue('counterweight') < 0) readouts.push({ label: 'beam mass', value: '60,000 KG', blink: bm < 1 });
      }
      const vd = cue('void'); voidBox.visible = vd > 0;
      if (voidBox.visible) { wire.reveal(voidBox, E.win(vd, 2.4, 0.8)); const p = project(voidBox.position); if (vd > 2.6) ann.push({ x: p.x, y: p.y - 120, lx: p.x, ly: p.y, text: 'BIG VOID · 30 m · 2017', kind: 'cyan' }); readouts.push({ label: 'muon scan', value: vd < 2.6 ? 'SCANNING…' : 'ANOMALY FOUND', blink: vd < 2.6, color: vd >= 2.6 ? wire.cyan.getStyle() : undefined }); if (vd < 2.6) scans.push({ t0: tl.cues.find((c) => c.name === 'void').t + 0.2, dur: 2.2, y0: 300, y1: 1150, label: 'MUON SCAN' }); }
      if (cue('hold') > 0) readouts.push({ label: 'explored', value: 'NO', blink: true, color: wire.alert.getStyle() });
      return { annotations: ann, readouts, scans };
    }
  };
}
