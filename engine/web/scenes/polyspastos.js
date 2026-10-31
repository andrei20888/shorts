// Roman treadwheel crane (polyspastos) – A-frame, jib, 5-pass pulley block, treadwheel with two walkers, load.
import { CamRig } from '../core/camrig.js';
export function create({ THREE, wire, scene, camera, tl, E }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.add(wire.ground(60, 60));
  const crane = new THREE.Group(); scene.add(crane);
  // --- mast (A-frame, leaning slightly to +x)
  const apex = V(0.9, 9.2, 0); const legs = [V(-0.3, 0, 1.5), V(-0.3, 0, -1.5)];
  const mast = new THREE.Group();
  mast.add(wire.polyline([legs[0], apex, legs[1]], { opacity: 1 }));
  const rungs = []; for (let k = 1; k <= 5; k++) { const p = k / 6; rungs.push(legs[0].clone().lerp(apex, p), legs[1].clone().lerp(apex, p)); }
  mast.add(wire.segments(rungs, { opacity: 0.8 }));
  mast.add(wire.cyl(0.18, 0.18, 9.4, 8, { opacity: 0.4, fill: false }).translateX(0.3).translateY(4.7).rotateZ(-0.097));
  crane.add(mast);
  // --- jib + ties + backstay
  const jibBase = V(0.3, 0.8, 0), jibTip = V(4.6, 8.0, 0);
  const jib = new THREE.Group();
  jib.add(wire.polyline([jibBase, jibTip], { opacity: 1 }));
  jib.add(wire.polyline([jibBase.clone().add(V(0, 0, 0.35)), jibTip.clone().add(V(0, 0, 0.25))], { opacity: 0.5 }));
  jib.add(wire.polyline([jibBase.clone().add(V(0, 0, -0.35)), jibTip.clone().add(V(0, 0, -0.25))], { opacity: 0.5 }));
  jib.add(wire.polyline([jibTip, apex], { opacity: 0.6 }));
  jib.add(wire.polyline([apex, V(-6.5, 0, 0)], { opacity: 0.6 }));
  jib.add(wire.box(1.2, 0.5, 1.2, { opacity: 0.6 }).translateX(-6.5).translateY(0.25));
  crane.add(jib);
  // --- treadwheel
  const wc = V(-4.6, 2.35, 0), R = 2.25; const wheel = new THREE.Group();
  for (const z of [-0.7, 0.7]) { const rim = wire.circle(R, 72, { opacity: 1 }); rim.position.z = z; wheel.add(rim); const rim2 = wire.circle(R * 0.84, 72, { opacity: 0.6 }); rim2.position.z = z; wheel.add(rim2); }
  const sp = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; for (const z of [-0.7, 0.7]) sp.push(V(Math.cos(a) * 0.3, Math.sin(a) * 0.3, z), V(Math.cos(a) * R, Math.sin(a) * R, z)); }
  wheel.add(wire.segments(sp, { opacity: 0.7 }));
  const treads = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; treads.push(V(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84, -0.7), V(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84, 0.7)); }
  wheel.add(wire.segments(treads, { opacity: 0.45 }));
  wheel.add(wire.cyl(0.22, 0.22, 2.4, 10, { opacity: 0.7 }).rotateX(Math.PI / 2));
  wheel.position.copy(wc); crane.add(wheel);
  const wheelFrame = wire.segments([V(-5.6, 0, 1.0), wc.clone().add(V(0, 0, 1.0)), V(-3.6, 0, 1.0), wc.clone().add(V(0, 0, 1.0)), V(-5.6, 0, -1.0), wc.clone().add(V(0, 0, -1.0)), V(-3.6, 0, -1.0), wc.clone().add(V(0, 0, -1.0))], { opacity: 0.6 });
  crane.add(wheelFrame);
  // walkers inside the wheel
  const walkers = [wire.figure(1.75), wire.figure(1.75)]; walkers[0].position.set(wc.x + 0.9, wc.y - R * 0.84 + 0.05, 0.25); walkers[1].position.set(wc.x - 0.6, wc.y - R * 0.84 + 0.05, -0.25); walkers[1].scale.x = -1;
  walkers.forEach((w) => crane.add(w));
  // --- pulley blocks + rope (5 passes)
  const upper = jibTip.clone().add(V(0, -0.5, 0)); const blockGroup = new THREE.Group(); crane.add(blockGroup);
  const upperBlock = wire.box(0.5, 0.7, 0.8, { opacity: 0.9 }); upperBlock.position.copy(upper); blockGroup.add(upperBlock);
  const lowerBlock = wire.box(0.5, 0.7, 0.8, { opacity: 0.9 }); blockGroup.add(lowerBlock);
  const load = wire.box(1.8, 1.1, 1.1, { opacity: 1, fillOpacity: 0.09 }); blockGroup.add(load);
  const brick = wire.mesh(new THREE.BoxGeometry(1.8, 1.1, 1.1, 3, 2, 2), { opacity: 0.25 }); load.add(brick);
  // rope segments as separate polylines so each pass can light up
  const passes = []; const xs = [-0.16, -0.08, 0, 0.08, 0.16];
  for (let i = 0; i < 5; i++) { const pl = wire.polyline([V(0, 0, 0), V(0, 1, 0)], { opacity: 0.85 }); passes.push(pl); blockGroup.add(pl); }
  const hoist = wire.polyline([wc.clone().add(V(0, R * 0.2, 0)), apex.clone().add(V(0, 0.25, 0)), upper.clone().add(V(-0.25, 0.35, 0))], { opacity: 0.8 }); blockGroup.add(hoist);
  const passNodes = wire.nodes([V(0, 0, 0)], 0.6); blockGroup.add(passNodes); passNodes.visible = false;
  function setLoad(y) {
    lowerBlock.position.set(upper.x, y + 0.55, 0); load.position.set(upper.x, y - 0.55 + 0.05, 0);
    for (let i = 0; i < 5; i++) {
      const g = passes[i].children[0].geometry; const P = g.attributes.position; const x = upper.x + xs[i]; const even = i % 2 === 0;
      P.setXYZ(0, x, even ? upper.y - 0.35 : y + 0.9, 0); P.setXYZ(1, x, even ? y + 0.9 : upper.y - 0.35, 0); P.needsUpdate = true;
    }
  }
  // --- comparison ramp (Egypt) off to the right
  const ramp = new THREE.Group(); const rampGeo = new THREE.BufferGeometry();
  const rp = [V(0, 0, -1.5), V(9, 0, -1.5), V(9, 4, -1.5), V(0, 0, 1.5), V(9, 0, 1.5), V(9, 4, 1.5)];
  ramp.add(wire.segments([rp[0], rp[1], rp[1], rp[2], rp[2], rp[0], rp[3], rp[4], rp[4], rp[5], rp[5], rp[3], rp[0], rp[3], rp[1], rp[4], rp[2], rp[5]], { opacity: 0.7 }));
  const workers = []; for (let i = 0; i < 60; i++) { const s = (i % 20) / 20; workers.push(V(0.4 + s * 8.2, s * 3.65 + 0.15, -1.1 + Math.floor(i / 20) * 1.1)); }
  const workerPts = wire.nodes(workers, 0.45, { color: wire.alert }); ramp.add(workerPts);
  ramp.add(wire.box(1.2, 0.8, 0.8, { opacity: 0.7 }).translateX(8.4).translateY(4.4));
  ramp.position.set(8.5, 0, 0); ramp.visible = false; scene.add(ramp);
  // --- camera
  const rig = new CamRig(camera, tl, THREE).add(
    { at: 0, pos: [9.5, 5.5, 13.5], look: [-0.5, 3.4, 0], fov: 58, orbit: 0.05 },
    { at: 'reveal', pos: [11, 6, 12.5], look: [-0.5, 3.6, 0], fov: 56, orbit: 0.06, dur: 1.2 },
    { at: 'focus_pulleys', pos: [7.5, 6.8, 7.5], look: [4.6, 5.3, 0], fov: 42, dur: 1.0, drift: [0, 0, -0.1] },
    { at: 'rope_trace', pos: [8.6, 5.6, 6.2], look: [4.6, 4.8, 0], fov: 42, dur: 1.0, orbit: 0.04 },
    { at: 'number1', pos: [9.5, 5.5, 9], look: [4.6, 3.6, 0], fov: 50, dur: 1.0, orbit: 0.05 },
    { at: 'wheel_focus', pos: [-4.6, 2.9, 9.5], look: [-4.6, 2.3, 0], fov: 44, dur: 1.2, orbit: 0.04 },
    { at: 'gain', pos: [-2.5, 3.2, 8.0], look: [-4.4, 2.2, 0], fov: 42, dur: 1.0, orbit: 0.05 },
    { at: 'lift', pos: [10, 5, 12], look: [0, 3.4, 0], fov: 58, dur: 1.4, orbit: 0.05 },
    { at: 'lift2', pos: [9, 6, 10], look: [2.5, 3.8, 0], fov: 50, dur: 1.2, orbit: 0.06 },
    { at: 'compare', pos: [6, 7, 22], look: [4.5, 3.2, 0], fov: 55, dur: 1.4, drift: [0, 0, -0.3] },
    { at: 'lost', pos: [9.5, 5.5, 13.5], look: [-0.5, 3.4, 0], fov: 58, dur: 1.6, orbit: 0.05 },
    { at: 'cta', pos: [10, 8, 14], look: [-0.5, 3, 0], fov: 56, dur: 1.4, orbit: 0.08 });
  let wheelAngle = 0, lastT = 0;
  return {
    update(api) {
      const { t, cue, project, E, fx } = api; rig.apply(t);
      const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
      // reveal (draw-on) during hook + assemble
      const rv = E.easeOutCubic(E.win(t, 0.0, 2.2)); wire.reveal(mast, rv); wire.reveal(jib, E.win(t, 0.5, 2.0)); wire.reveal(wheel, E.win(t, 0.9, 2.0)); wire.reveal(wheelFrame, E.win(t, 1.2, 1.0)); wire.reveal(blockGroup, E.win(t, 1.4, 2.0));
      // wheel speed: idle slow, fast during lift
      const liftT = cue('lift'); const lifting = liftT > 2.2 && liftT < 7.5; const wSpeed = lifting ? 1.1 : (cue('wheel_focus') > 0 ? 0.45 : 0.25);
      wheelAngle -= wSpeed * dt; wheel.rotation.z = wheelAngle;
      walkers.forEach((w, i) => w.walk(-wheelAngle * 6 + i * Math.PI, lifting ? 0.75 : 0.45));
      // load height
      const y = 0.6 + 3.6 * E.easeInOutCubic(E.win(t, (tl.cues.find((c) => c.name === 'lift') || { t: 1e9 }).t + 2.3, 4.5)); setLoad(y);
      // rope trace highlight
      const rt = cue('rope_trace'); const ann = []; const readouts = []; const scans = [];
      let litPasses = rt > 1.8 ? Math.min(5, Math.floor((rt - 1.8) / 0.4) + 1) : 0;
      if (cue('divide') > 0 && cue('wheel_focus') < 0) litPasses = 5; if (cue('wheel_focus') > 0) litPasses = 0;
      passes.forEach((p, i) => { const lit = i < litPasses; wire.setOpacity(p, lit ? 1 : 0.55); wire.setColor(p, lit ? wire.bright : wire.gold); });
      if (litPasses > 0 && cue('wheel_focus') < 0) {
        const n = project(new THREE.Vector3(upper.x + xs[litPasses - 1], (upper.y - 0.35 + y + 0.9) / 2, 0));
        ann.push({ x: n.x + 200, y: n.y - 40, lx: n.x, ly: n.y, text: `ROPE PASS ${litPasses} / 5`, kind: litPasses === 5 ? 'cyan' : 'dim' });
        readouts.push({ label: 'rope passes', value: `${litPasses} / 5` });
        if (cue('divide') > 0) { const l = project(load.position.clone().add(new THREE.Vector3(0, 0.9, 0))); ann.push({ x: l.x - 220, y: l.y - 60, lx: l.x, ly: l.y, text: 'LOAD ÷ 5', kind: 'alert', alpha: E.win(t, cue('divide') + 0.2 - 0, 0.3) }); readouts.push({ label: 'rope tension', value: cue('number1') > 0.4 ? '1,200 KG' : '6,000 KG', blink: cue('number1') < 0.4 }); }
      }
      // focus: dim everything except pulleys
      const fp = cue('focus_pulleys'); const focusOn = fp > 0 && cue('wheel_focus') < 0; const dimK = focusOn ? 0.45 : 1;
      [mast, jib, wheel, wheelFrame].forEach((g) => wire.setOpacity(g, dimK)); walkers.forEach((w) => wire.setOpacity(w, dimK));
      if (fp > 0 && fp < 2.6) scans.push({ t0: cue('focus_pulleys') === fp ? t - fp + 0.2 : 0, dur: 1.4, y0: 250, y1: 1150, label: 'LOCATING' });
      // wheel focus annotations
      const wf = cue('wheel_focus');
      if (wf > 0 && cue('lift') < 0) {
        const a = project(wc.clone().add(new THREE.Vector3(-R, 0, 0.7))), b = project(wc.clone().add(new THREE.Vector3(R, 0, 0.7)));
        ann.push({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 170, text: 'Ø 4.5 m', alpha: E.win(t, wf === wf ? t - wf + 1.0 : 0, 0.3) });
        readouts.push({ label: 'wheel gain', value: cue('gain') > 2.0 ? '30 : 1' : '— : 1', blink: cue('gain') > 2.0 && cue('gain') < 3.0 });
        readouts.push({ label: 'crew', value: '2 MEN' });
        const m = project(walkers[0].position.clone().add(new THREE.Vector3(0, 1.9, 0))); ann.push({ x: m.x + 150, y: m.y - 110, lx: m.x, ly: m.y, text: '50 KG · WALKING', alpha: E.win(t, t - wf + 2.0, 0.3) });
      }
      if (cue('lift') > 0 && cue('compare') < 0) {
        const lt = cue('lift'); const kg = Math.round(E.easeOutCubic(E.win(lt, 0.3, 3.2)) * 6000); readouts.push({ label: 'lifting force', value: kg.toLocaleString('en-US') + ' KG', blink: lt > 0.3 && lt < 1.5 });
        readouts.push({ label: 'advantage', value: cue('lift2') > 0 ? '120 : 1' : '5 × 30' });
        const l = project(load.position.clone().add(new THREE.Vector3(1.1, 0, 0))); ann.push({ x: l.x + 180, y: l.y, lx: l.x, ly: l.y, text: 'MARBLE · 6,000 KG', alpha: E.win(lt, 2.8, 0.3) });
      }
      // comparison
      const cp = cue('compare'); ramp.visible = cp > 0 && cue('lost') < 0;
      if (ramp.visible) { wire.reveal(ramp, E.win(cp, 0.2, 1.2)); workerPts.visible = cp > 1.2; const r = project(new THREE.Vector3(13, 5.2, 0)); ann.push({ x: r.x, y: r.y - 60, text: 'RAMP · ~1,000+ WORKERS', kind: 'alert', alpha: E.win(cp, 1.3, 0.3) }); const c = project(new THREE.Vector3(-4.6, 6.0, 0)); ann.push({ x: c.x, y: c.y - 40, text: 'CRANE · 2 MEN', kind: 'cyan', alpha: E.win(cp, 3.2, 0.3) }); readouts.push({ label: 'efficiency', value: '60× PER MAN' }); }
      // lost: flicker + dim + red
      const lo = cue('lost'); let bloom = 1, flash = 0;
      if (lo > 0 && cue('cta') < 0) { const fl = 0.35 + 0.65 * (E.hash(Math.floor(t * 24)) > 0.25 ? 1 : 0.2); const k = lo < 1.6 ? 1 : E.lerp(1, 0.3, E.win(lo, 1.6, 1.5)) * fl; crane.traverse((o) => { if (o.material) { if (o.userData.baseOpacity === undefined) o.userData.baseOpacity = o.material.opacity; o.material.opacity = o.userData.baseOpacity * k; } }); bloom = k; readouts.push({ label: 'status', value: lo > 1.6 ? 'LOST · 1,000 YRS' : 'OPERATIONAL', blink: lo > 1.6, color: lo > 1.6 ? wire.alert.getStyle() : undefined }); }
      else if (lo > 0) { crane.traverse((o) => { if (o.material && o.userData.baseOpacity !== undefined) o.material.opacity = o.userData.baseOpacity; }); }
      return { annotations: ann, readouts, scans, bloom, flash };
    }
  };
}
