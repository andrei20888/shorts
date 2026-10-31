// Obelisk raising – ramp, sand-filled pit, obelisk tilting on its pedestal edge as sand drains, rope teams; Aswan unfinished obelisk.
import { CamRig } from '../core/camrig.js';
export function create({ THREE, wire, scene, camera, tl, E }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.add(wire.ground(80, 40));
  const S = 1 / 4; const OH = 32 * S, OW = 2.7 * S; const root = new THREE.Group(); scene.add(root);
  // pit (sunken box) + pedestal at its floor, ramp leading to its edge (from -x)
  const pitW = 6, pitD = 5.5, pitDepth = 4.5; const pit = wire.box(pitW, pitDepth, pitD, { opacity: 0.8, fillOpacity: 0.02 }); pit.position.set(0, -pitDepth / 2, 0); root.add(pit);
  const pedestal = wire.box(1.4, 0.6, 1.4, { opacity: 1, fillOpacity: 0.1 }); pedestal.position.set(1.4, -pitDepth + 0.3, 0); root.add(pedestal);
  const rampLen = 11, rampH = 2.4; const rp = [V(-pitW / 2 - rampLen, 0, -1.4), V(-pitW / 2, rampH, -1.4), V(-pitW / 2, 0, -1.4), V(-pitW / 2 - rampLen, 0, 1.4), V(-pitW / 2, rampH, 1.4), V(-pitW / 2, 0, 1.4)];
  const ramp = wire.segments([rp[0], rp[1], rp[1], rp[2], rp[2], rp[0], rp[3], rp[4], rp[4], rp[5], rp[5], rp[3], rp[0], rp[3], rp[1], rp[4]], { opacity: 0.7 }); root.add(ramp);
  const rampTop = wire.box(pitW + 1, rampH, 2.8, { opacity: 0.5 }); rampTop.position.set(0, rampH / 2, 0); // platform over the pit (brick wall)
  // sand: hatched level plane inside the pit
  const sand = new THREE.Group(); root.add(sand); const hatch = []; for (let i = -6; i <= 6; i++) hatch.push(V(-pitW / 2, 0, i * 0.4), V(pitW / 2, 0, i * 0.4)); for (let i = -7; i <= 7; i++) hatch.push(V(i * 0.4, 0, -pitD / 2), V(i * 0.4, 0, pitD / 2));
  sand.add(wire.segments(hatch, { opacity: 0.55 })); const sandGrains = wire.nodes(new Array(90).fill(0).map((_, i) => V((E.hash(i) - 0.5) * pitW * 0.95, -(E.hash(i + 50)) * 0.3, (E.hash(i + 99) - 0.5) * pitD * 0.95)), 0.28); sand.add(sandGrains);
  const sandFill = new THREE.Mesh(new THREE.BoxGeometry(pitW, pitDepth, pitD), wire.fillMat({ opacity: 0.08 })); sandFill.position.set(0, -pitDepth / 2, 0); root.add(sandFill);
  // obelisk: tapered shaft + pyramidion, pivot at its base edge
  const obe = new THREE.Group(); root.add(obe);
  const shaft = wire.edges(new THREE.CylinderGeometry(OW * 0.75 / Math.SQRT2, OW / Math.SQRT2, OH * 0.9, 4), { threshold: 1, fillOpacity: 0.08 }); shaft.rotation.y = Math.PI / 4; shaft.position.y = OH * 0.45; obe.add(shaft);
  const tip = wire.edges(new THREE.ConeGeometry(OW * 0.75 / Math.SQRT2, OH * 0.1, 4), { threshold: 1, fillOpacity: 0.1 }); tip.rotation.y = Math.PI / 4; tip.position.y = OH * 0.95; obe.add(tip);
  const bands = []; for (let k = 1; k < 9; k++) { const y = OH * 0.9 * k / 9; const w = OW * (1 - 0.25 * k / 9) / 2; bands.push(V(-w, y, w), V(w, y, w), V(w, y, w), V(w, y, -w)); } obe.add(wire.segments(bands, { opacity: 0.3 }));
  const glyphs = []; for (let k = 0; k < 14; k++) glyphs.push(V(OW * 0.5 * (1 - 0.25 * (k + 1) / 15) + 0.01, OH * 0.9 * (k + 1) / 15, (E.hash(k) - 0.5) * 0.5)); obe.add(wire.nodes(glyphs, 0.2, { opacity: 0.8 }));
  // rope teams (figures) pulling to +x
  const team = new THREE.Group(); root.add(team); const figs = []; for (let i = 0; i < 12; i++) { const f = wire.figure(1.7); f.position.set(5.5 + i * 1.1 + (i % 2) * 0.3, 0, (i % 3 - 1) * 1.2); figs.push(f); team.add(f); }
  const ropes = wire.segments(new Array(6).fill(0).map(() => V(0, 0, 0)), { opacity: 0.85 }); root.add(ropes); team.visible = false; ropes.visible = false;
  // Aswan unfinished obelisk (lying), crack line
  const aswan = new THREE.Group(); const A = wire.edges(new THREE.CylinderGeometry(0.9 / Math.SQRT2, 1.25 / Math.SQRT2, 10.5, 4), { threshold: 1, fillOpacity: 0.06 }); A.rotation.z = Math.PI / 2; A.rotation.y = Math.PI / 4; aswan.add(A);
  const crack = wire.polyline([V(1.2, 0.7, 0.62), V(1.5, 0.3, 0.62), V(1.3, -0.1, 0.62), V(1.7, -0.5, 0.62), V(1.55, -0.72, 0.62)], { opacity: 1, color: wire.alert }); aswan.add(crack);
  const bedrock = []; for (let i = -6; i <= 6; i++) bedrock.push(V(i * 1.0, -0.9, -2.2), V(i * 1.0 + 0.6, -0.9, 2.2)); aswan.add(wire.segments(bedrock, { opacity: 0.25 }));
  aswan.position.set(0, 0.9, -30); aswan.visible = false; root.add(aswan);
  const rig = new CamRig(camera, tl, THREE).add(
    { at: 0, pos: [-1, 5, 15], look: [-5, 1.8, 0], fov: 58, orbit: 0.05 },
    { at: 'measure', pos: [-3, 4, 13], look: [-6, 2.4, 0], fov: 56, orbit: 0.05, dur: 1.2 },
    { at: 'drag', pos: [-2, 5, 17], look: [-5, 1.8, 0], fov: 56, dur: 1.3, orbit: 0.03 },
    { at: 'sand_out', pos: [7, 2.5, 13], look: [0, -0.8, 0], fov: 52, dur: 1.3, orbit: 0.04 },
    { at: 'tilt', pos: [10, 3, 16], look: [0.5, 1.6, 0], fov: 56, dur: 1.3, orbit: 0.04 },
    { at: 'angle', pos: [12, 4, 15], look: [1, 2.5, 0], fov: 56, dur: 1.2, orbit: 0.05 },
    { at: 'pull', pos: [14, 5, 16], look: [5, 2.5, 0], fov: 56, dur: 1.3, orbit: 0.04 },
    { at: 'risk', pos: [9, 6, 14], look: [1.5, 3.5, 0], fov: 52, dur: 1.2, orbit: 0.06 },
    { at: 'aswan', pos: [6, 6, -16], look: [0, 0.5, -30], fov: 56, dur: 1.6, orbit: 0.04 },
    { at: 'crack', pos: [3, 3.5, -22], look: [1, 0.6, -30], fov: 48, dur: 1.3, orbit: 0.05 },
    { at: 'cta', pos: [11, 6, 19], look: [0, 2.5, 0], fov: 58, dur: 1.6, orbit: 0.08 });
  let lastT = 0;
  return {
    update(api) {
      const { t, cue, project, E } = api; rig.apply(t); const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
      const rv = E.easeOutCubic(E.win(t, 0, 2.4)); wire.reveal(obe, rv); wire.reveal(pit, E.win(t, 0.5, 1.2)); wire.reveal(ramp, E.win(t, 0.8, 1.2)); wire.reveal(sand, E.win(t, 1.0, 1.2)); wire.reveal(pedestal, E.win(t, 1.2, 0.8));
      // sand level 0 (full) → -pitDepth (empty) during tilt
      const so = cue('sand_out'), ti = cue('tilt'); const drain = so > 1.6 ? E.easeInOutCubic(E.win(so, 1.6, 9.5)) : 0;
      const level = -pitDepth * 0.92 * drain; sand.position.y = level; sandFill.scale.y = Math.max(0.02, 1 - drain * 0.92); sandFill.position.y = -pitDepth + (pitDepth * sandFill.scale.y) / 2;
      // obelisk pose: lying on ramp (x from -16 to -3) before 'drag'; after drag, base edge at pit edge (-pitW/2) lying on sand; tilt follows drain (0→~75°), final pull to 90°
      const dg = cue('drag'); const slide = dg > 0 ? E.easeInOutCubic(E.win(dg, 0.3, 2.6)) : 0; const pu = cue('pull'); const finalP = pu > 0 ? E.easeInOutCubic(E.win(pu, 1.2, 2.6)) : 0;
      const ang = E.lerp(0, 72, drain) * Math.PI / 180 + finalP * (18 * Math.PI / 180); // from horizontal (0) to vertical (90)
      const pivot = V(-pitW / 2 + 0.2, level + 0.1 + (1 - drain) * 0.0, 0); // base edge rests on sand surface; ends on pedestal
      const basePos = ang < 0.01 ? V(-10 + slide * 7.0, rampH + (slide > 0.99 ? 0 : 0.2) + 0.1, 0) : V(pivot.x + (pedestal.position.x - pivot.x) * Math.min(1, drain * 1.1), E.lerp(rampH, -pitDepth + 0.6, Math.min(1, drain * 1.1)) + 0.05, 0);
      obe.position.copy(basePos); obe.rotation.z = -(Math.PI / 2 - ang); // rotation: lying → upright
      // ropes from tip to team
      team.visible = pu > 0 && cue('aswan') < 0; ropes.visible = team.visible;
      if (team.visible) { const tipW = V(0, OH * 0.9, 0).applyAxisAngle(V(0, 0, 1), obe.rotation.z).add(obe.position); const P = ropes.children[0].geometry.attributes.position; for (let k = 0; k < 3; k++) { const f = figs[k * 4]; P.setXYZ(k * 2, tipW.x, tipW.y, tipW.z); P.setXYZ(k * 2 + 1, f.position.x, 1.2, f.position.z); } P.needsUpdate = true; figs.forEach((f, i) => f.walk(t * 6 + i, 0.3)); }
      const ann = [], readouts = [], scans = [];
      if (t < 3) scans.push({ t0: 0.4, dur: 1.6, y0: 300, y1: 1250, label: 'SURVEY' });
      const tipW = V(0, OH, 0).applyAxisAngle(V(0, 0, 1), obe.rotation.z).add(obe.position); const baseW = obe.position.clone();
      if (cue('measure') > 0 && cue('drag') < 0) { const a = project(tipW), b = project(baseW); ann.push({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 120, text: '32 m · 455 T', alpha: E.win(cue('measure'), 0.6, 0.3) }); readouts.push({ label: 'granite', value: '455,000 KG' }); }
      if (dg > 0 && cue('sand_out') < 0) { readouts.push({ label: 'drag', value: Math.round(slide * 100) + ' %' }); const p = project(V(0, 0.2, 0)); ann.push({ x: p.x + 160, y: p.y + 120, lx: p.x, ly: p.y, text: 'SAND PIT · FULL', alpha: E.win(dg, 2.2, 0.3) }); }
      if (so > 0 && cue('pull') < 0) { readouts.push({ label: 'sand level', value: Math.round((1 - drain) * 100) + ' %', blink: drain > 0 && drain < 1 }, { label: 'tilt', value: Math.round(ang * 180 / Math.PI) + '°' }); const p = project(V(0, level, pitD / 2)); ann.push({ x: p.x + 150, y: p.y + 70, lx: p.x, ly: p.y, text: 'SAND DRAINING ↓', kind: 'alert', alpha: E.win(so, 1.4, 0.3) }); }
      if (pu > 0 && cue('aswan') < 0) { readouts.push({ label: 'rope teams', value: '~300 MEN' }, { label: 'margin', value: 'ONE TRY', blink: true, color: wire.alert.getStyle() }); const p = project(tipW); ann.push({ x: p.x + 140, y: p.y - 100, lx: p.x, ly: p.y, text: 'FINAL PULL', kind: 'alert', alpha: E.win(pu, 0.4, 0.3) }); }
      if (cue('risk') > 0 && cue('aswan') < 0) readouts.push({ label: 'risk', value: 'SHATTER', blink: true, color: wire.alert.getStyle() });
      aswan.visible = cue('aswan') > 0; if (aswan.visible) { wire.reveal(aswan, E.win(cue('aswan'), 0.3, 1.4)); const c = project(V(1.5, 1.0, -29.4)); if (cue('crack') > 1.8) ann.push({ x: c.x + 160, y: c.y - 120, lx: c.x, ly: c.y, text: 'CRACK · ABANDONED', kind: 'alert' }); readouts.push({ label: 'length', value: '42 M' }, { label: 'mass', value: '1,090 T' }); }
      return { annotations: ann, readouts, scans };
    }
  };
}
