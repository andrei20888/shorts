// 01 — How a transistor works. Phone -> chip -> silicon -> one transistor -> billions -> phone (loops).
import * as THREE from 'three';
import { createStage, materials, shadowFloor, shadowed, C } from '../../engine/kit/stage.js';
import { createOverlay } from '../../engine/kit/overlay.js';
import { rbox, box, microchip } from '../../engine/kit/models.js';
import { kf, prog, ease, lerp, shake, rand, beats, clamp } from '../../engine/kit/anim.js';

export default async ({ timeline, width, height }) => {
  const st = createStage({ width, height, bloom: 0.6 });
  const M = materials();
  const ov = createOverlay({ width, height, timeline });
  const B = beats(timeline);
  const W = (id, word) => { const w = B(id).words.find(x => x.w.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(word)); if (!w) throw new Error(`word ${word} in ${id}`); return w.start; };
  const cues = [];
  const cue = (t, sfx, o = {}) => cues.push({ t: Math.max(0, t), sfx, ...o });
  const T = timeline.duration;
  st.scene.add(shadowFloor(80, 0.45));

  // ---------------------------------------------------------------- A: exploded phone
  const phone = new THREE.Group(); phone.rotation.y = Math.PI / 4; st.scene.add(phone);
  const fade = m => { const c = m.clone(); c.transparent = true; return c; };
  const screenTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#0d3550'); gr.addColorStop(1, '#06182b'); g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
    g.strokeStyle = '#19e3c4'; g.lineWidth = 6;
    for (let r = 0; r < 5; r++) for (let q = 0; q < 4; q++) { g.globalAlpha = 0.35 + 0.5 * rand(r * 4 + q); g.beginPath(); g.roundRect(48 + q * 110, 200 + r * 130, 80, 80, 20); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = '#dfe7ef'; g.font = '800 96px Inter'; g.textAlign = 'center'; g.fillText('9:41', 256, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const layers = [
    rbox(3, 0.14, 6.2, 0.07, fade(M.brushed)),
    (() => { // logic board with chip
      const b = rbox(2.7, 0.06, 5.7, 0.03, fade(M.navy));
      for (let i = 0; i < 9; i++) { const tr = box(0.03, 0.02, 1.5 + rand(i) * 2, M.tealSoft); tr.position.set(-1.1 + i * 0.27, 0.04, 0.6 + rand(i + 9) * 1.2); b.add(tr); }
      for (let i = 0; i < 6; i++) { const c = rbox(0.35, 0.12, 0.25 + rand(i) * 0.3, 0.02, M.dark); c.position.set(rand(i + 3) * 1.8 - 0.9, 0.08, 1.3 + rand(i + 5) * 1.8); b.add(c); }
      return b;
    })(),
    rbox(2.5, 0.16, 2.9, 0.05, fade(M.steel)),
    (() => { const d = rbox(2.92, 0.06, 6.1, 0.05, fade(M.dark));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5.8), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, toneMapped: false }));
      s.rotation.x = -Math.PI / 2; s.position.y = 0.035; d.add(s); return d; })(),
    rbox(3.0, 0.04, 6.2, 0.06, fade(M.glass)),
  ];
  layers[2].position.z = 1.4;
  layers[4].material.opacity = 0.22;
  layers.forEach(l => { phone.add(shadowed(l)); l.traverse(o => { if (o.material) o.userData.op = o.material.opacity; }); });
  const base = [0, 0.1, 0.17, 0.27, 0.32], home = { target: new THREE.Vector3(0, 1.1, 0), size: 10, rot: Math.PI / 4 + 0.25 };
  const chip = microchip(M); chip.scale.setScalar(0.3); chip.position.set(0, 0.06, -1.3); layers[1].add(chip);
  const chipWorld = new THREE.Vector3();

  // ---------------------------------------------------------------- C: silicon array + human hair
  const arr = new THREE.Group(); st.scene.add(arr);
  const N = 120, sp = 0.07;
  const fin = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.03, 0.03), M.silver, N * N);
  const gt = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.05, 0.045), M.tealSoft, N * N);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i - N / 2) * sp, z = (j - N / 2) * sp;
    m4.makeTranslation(x, 0.015, z); fin.setMatrixAt(k, m4);
    m4.makeTranslation(x, 0.025, z); gt.setMatrixAt(k++, m4);
  }
  const wafer = box(N * sp + 0.4, 0.1, N * sp + 0.4, M.dark); wafer.position.y = -0.05;
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 22, 48), new THREE.MeshStandardMaterial({ color: 0x7a6a5c, metalness: 0.1, roughness: 0.55 }));
  hair.rotation.set(0, Math.PI / 4, Math.PI / 2); hair.position.set(0, 1.65, 0);
  arr.add(wafer, fin, gt, shadowed(hair));

  // ---------------------------------------------------------------- D: one transistor (cross-section)
  const tr = new THREE.Group(); st.scene.add(tr);
  const sub = rbox(5.2, 1.2, 2.6, 0.06, M.steel); sub.position.y = 0.6;
  const src = rbox(1.3, 0.5, 2.3, 0.05, M.silver); src.position.set(-1.85, 1.2, 0);
  const drn = rbox(1.3, 0.5, 2.3, 0.05, M.silver); drn.position.set(1.85, 1.2, 0);
  const oxide = box(1.9, 0.08, 2.3, M.tealSoft); oxide.position.set(0, 1.25, 0);
  const gateMat = M.brushed.clone(); gateMat.emissive = new THREE.Color(C.teal);
  const gate = rbox(1.9, 0.55, 2.3, 0.05, gateMat); gate.position.set(0, 1.58, 0);
  const chanMat = M.teal.clone(); chanMat.transparent = true;
  const chan = box(2.4, 0.06, 2.1, chanMat); chan.position.set(0, 1.19, 0);
  const pins = [-1.85, 0, 1.85].map((x, i) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 12), i === 1 ? gateMat : M.brushed); p.position.set(x, i === 1 ? 2.55 : 2.15, 0); return p; });
  tr.add(shadowed(sub), shadowed(src), shadowed(drn), oxide, shadowed(gate), chan, ...pins);
  const NE = 110;
  const elecMat = M.ice.clone(); elecMat.emissiveIntensity = 1.1;
  const elec = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 8), elecMat, NE);
  tr.add(elec);

  // ---------------------------------------------------------------- E: billions of switches
  const G = 70;
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.12, 0.36), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3 }), G * G);
  k = 0; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { m4.makeTranslation((i - G / 2) * 0.5, 0.06, (j - G / 2) * 0.5); cells.setMatrixAt(k, m4); cells.setColorAt(k++, new THREE.Color(C.steel)); }
  st.scene.add(cells);
  const cOn = new THREE.Color(C.teal).multiplyScalar(3), cOff = new THREE.Color(0x1d2a3c);

  // ---------------------------------------------------------------- timing
  const tHook2 = B('hook2').start, tZoom = B('zoom').start, tSize = B('size').start, tParts = B('parts').start;
  const tOff = B('off').start, tOn = B('on').start, tQ = B('question').start, tA = B('answer').start;
  const tScale = B('scale').start, tLoop = B('loop').start;
  const cutArr = tSize - 0.05, cutTr = tParts - 0.05, cutGrid = W('scale', 'logic') - 0.25, cutPhone = tLoop - 0.6;
  const voltOn = W('on', 'add') + 0.15;
  const qA = W('question', 'how'), aEnd = B('answer').end;

  // gate state: 0 off .. 1 on, with a slow then frantic toggle during the question/answer
  const gateOn = t => {
    if (t < voltOn) return 0;
    if (t < qA) return ease.out(prog(t, voltOn, voltOn + 0.25));
    if (t < tScale) { const f = t < tA ? 1.2 : 1.2 + 26 * prog(t, tA, tA + 1.2); const ph = (t - qA) * f; return Math.sin(ph * Math.PI * 2) > 0 ? 1 : 0; }
    return 1;
  };

  // ---------------------------------------------------------------- overlay script
  ov.counter(0.08, tHook2 - 0.05, 0, 20e9, { y: 0.115, size: 112, dur: 1.6, label: 'SWITCHES IN YOUR PHONE' });
  ov.headline(W('hook2', 'zero') - 0.05, tZoom, '<em>0</em> moving parts', { y: 0.13, size: 118 });
  ov.tag(tZoom, cutArr, 'ZOOM <b>×1,000,000</b>');
  ov.callout(tSize + 0.6, cutTr, () => st.project(new THREE.Vector3(-1.2, 3.0, -1.2)), 'HUMAN HAIR', { dx: -60, dy: -120, sub: '≈ 0.07 MM WIDE' });
  ov.callout(W('size', 'over') - 0.1, cutTr, () => st.project(new THREE.Vector3(1.6, 0.05, 1.6)), '× 1,000+', { dx: 30, dy: 230, sub: 'TRANSISTORS ACROSS' });
  const part = (word, pos, text, dx, dy) => ov.callout(W('parts', word), tQ, () => st.project(tr.localToWorld(pos.clone())), text, { dx, dy });
  part('source', new THREE.Vector3(-1.85, 2.85, 0), 'SOURCE', -60, -170);
  part('drain', new THREE.Vector3(1.85, 2.85, 0), 'DRAIN', 60, -120);
  part('gate', new THREE.Vector3(0, 3.25, 0), 'GATE', 40, -300);
  ov.headline(W('off', 'thats') - 0.05, tOn, '0<div style="font-size:.22em;letter-spacing:.3em;margin-top:.2em">OFF</div>', { y: 0.12, size: 300 });
  ov.headline(W('on', 'thats') - 0.05, tQ, '<em>1</em><div style="font-size:.22em;letter-spacing:.3em;margin-top:.2em">ON</div>', { y: 0.12, size: 300 });
  ov.headline(qA, tA, 'How fast<em>?</em>', { y: 0.14, size: 130 });
  ov.pill(W('question', 'comment') - 0.1, tA, 'Comment your guess 👇', { y: 0.715 });
  ov.counter(W('answer', '3'), tScale, 0, 3e9, { y: 0.12, size: 104, dur: 0.9, label: 'TIMES EVERY SECOND' });
  ov.headline(W('scale', 'logic') - 0.05, W('scale', 'math'), 'Logic', { y: 0.14, size: 140 });
  ov.headline(W('scale', 'math'), W('scale', 'every') - 0.1, '<em>Math</em>', { y: 0.14, size: 140 });
  ov.headline(W('scale', 'every') - 0.1, cutPhone, 'Every<em>thing</em>', { y: 0.14, size: 140 });
  ov.tag(tLoop - 0.2, T, 'FOLLOW FOR MORE <b>BREAKDOWNS</b>', { y: 0.12 });
  ov.flash(0.12, 0.4); ov.flash(cutArr, 0.3); ov.flash(cutTr, 0.3); ov.flash(voltOn, 0.35, '#7dfbe8', 0.55);
  ov.flash(W('answer', '3') + 0.85, 0.4); ov.flash(cutGrid, 0.25); ov.flash(cutPhone, 0.3);

  // ---------------------------------------------------------------- sound design
  cue(0, 'whoosh', { gain: 0.5 }); cue(0.1, 'impact', { gain: 0.9 }); cue(1.65, 'blip', { gain: 0.35 });
  cue(tHook2 - 0.1, 'whoosh', { gain: 0.45, pan: -0.3 }); cue(W('hook2', 'zero') - 0.05, 'glitch', { gain: 0.45 });
  cue(tZoom - 0.1, 'riser', { dur: cutArr - tZoom + 0.1, gain: 0.4 }); cue(cutArr, 'impact', { gain: 0.6 }); cue(cutArr, 'whoosh', { gain: 0.4 });
  cue(tSize + 0.6, 'pop', { gain: 0.35 }); cue(W('size', 'over') - 0.1, 'pop', { gain: 0.35 });
  cue(cutTr, 'whoosh', { gain: 0.45, pan: 0.3 });
  for (const w of ['source', 'drain', 'gate']) cue(W('parts', w), 'pop', { gain: 0.4 });
  cue(W('off', 'cant') - 0.05, 'blip', { gain: 0.35 }); cue(W('off', 'thats'), 'impact', { gain: 0.35 });
  cue(voltOn - 0.05, 'zap', { gain: 0.55 }); cue(W('on', 'thats'), 'impact', { gain: 0.45 });
  cue(tQ, 'break', { dur: tA - tQ }); cue(qA, 'swell', { gain: 0.25, dur: 0.8 });
  for (let t = qA; t < tA - 0.2; t += 0.5) cue(t, 'tick', { gain: 0.35 });
  cue(tA - 1.0, 'riser', { dur: 1.0, gain: 0.45 }); cue(W('answer', '3') + 0.85, 'impact', { gain: 0.8 }); cue(W('answer', '3') + 0.85, 'ding', { gain: 0.3 });
  cue(cutGrid, 'whoosh', { gain: 0.5 });
  for (const w of ['math', 'every']) cue(W('scale', w) - 0.05, 'whoosh', { gain: 0.3, pan: w === 'math' ? -0.4 : 0.4 });
  cue(cutPhone - 0.8, 'swell', { dur: 0.8, gain: 0.35 }); cue(cutPhone, 'impact', { gain: 0.5 });

  // ---------------------------------------------------------------- per-frame update
  const sets = { phone, arr, tr, cells };
  const show = name => { for (const [n, o] of Object.entries(sets)) o.visible = n === name; };
  const tmp = new THREE.Vector3();

  function update(t) {
    const rig = st.rig;
    rig.az = 45; rig.el = 35.264; rig.roll = 0;
    let sk = shake(t, 0.1, 0.5, 0.35);
    if (t < cutArr || t >= cutPhone) {
      show('phone');
      // explode on the hook, collapse back at the end so the last frame == first frame
      const e = t < cutPhone ? ease.outBack(prog(t, 0.1, 0.6)) : 1 - ease.inOut(prog(t, cutPhone, T - 0.15));
      const lift = [0, 1.0, 1.75, 2.6, 3.35];
      const away = t < cutPhone ? ease.in(prog(t, tHook2, tHook2 + 1.0)) : 0;
      layers.forEach((l, i) => {
        l.position.y = base[i] + lift[i] * e * 1.5 + (i >= 2 ? away * (6 + i * 2) : 0);
        if (i >= 2) l.traverse(o => { if (o.material) o.material.opacity = o.userData.op * (1 - away); });
      });
      chip.userData.setExplode(t < cutPhone ? ease.outBack(prog(t, W('zoom', 'past') - 0.1, W('zoom', 'past') + 0.5)) : 0);
      chip.getWorldPosition(chipWorld);
      if (t >= cutPhone) { // settle into exactly the first frame's framing -> seamless loop
        const k5 = ease.out(prog(t, cutPhone, T - 0.1));
        phone.rotation.y = lerp(Math.PI / 4 - 0.4, home.rot, k5);
        rig.target.copy(home.target); rig.size = lerp(16, home.size, k5);
      } else {
        phone.rotation.y = Math.PI / 4 + 0.25 * (1 - ease.outExpo(prog(t, 0, 0.9)));
        const zk = ease.inOut(prog(t, tHook2, tZoom + 0.3));
        const dive = ease.inExpo(prog(t, W('zoom', 'into') - 0.2, cutArr));
        rig.target.lerpVectors(new THREE.Vector3(0, 1.9, 0), chipWorld, zk);
        rig.target.lerp(home.target, 1 - ease.outExpo(prog(t, 0.1, 0.7)));
        rig.size = lerp(lerp(12, 3.4, zk), 0.25, dive);
        if (t < 0.7) rig.size = lerp(home.size, 12, ease.outExpo(prog(t, 0.1, 0.7)));
        rig.az = 45 + 10 * zk;
      }
    } else if (t < cutTr) {
      show('arr');
      const k2 = prog(t, cutArr, cutTr);
      rig.target.set(0, 0.6, 0);
      rig.size = lerp(4.2, 9.5, ease.out(prog(t, cutArr, cutArr + 2.2)));
      rig.az = 45 - 12 * k2;
      gt.material = M.tealSoft;
    } else if (t < cutGrid) {
      show('tr');
      const k3 = prog(t, cutTr, cutGrid);
      rig.target.set(0, 0.7, 0);
      rig.size = lerp(12.5, 10.4, ease.out(prog(t, cutTr, cutTr + 1.5))) - (t > tA ? 0.6 * ease.outExpo(prog(t, W('answer', '3') + 0.85, W('answer', '3') + 1.2)) : 0);
      rig.az = 52 - 14 * k3;
      const g = gateOn(t);
      gateMat.emissiveIntensity = g * 0.8;
      chanMat.emissiveIntensity = g * 3; chanMat.opacity = 0.15 + g * 0.85;
      // electrons: clustered/jiggling in the source when off, streaming source -> drain when on
      for (let i = 0; i < NE; i++) {
        const r1 = rand(i), r2 = rand(i + 99), r3 = rand(i + 333);
        const zz = (r2 - 0.5) * 1.9;
        const offX = -1.85 + (r1 - 0.5) * 1.1 + Math.sin(t * 7 + i) * 0.05, offY = 1.5 + r3 * 0.15 + Math.cos(t * 6 + i) * 0.04;
        const ph = (r1 + t * (0.55 + 0.6 * clamp(g))) % 1;
        const onX = lerp(-2.4, 2.4, ph), onY = ph > 0.28 && ph < 0.72 ? 1.24 : 1.5 + r3 * 0.1;
        const gg = t < voltOn ? 0 : (t < qA ? ease.inOut(prog(t, voltOn, voltOn + 0.6)) : g);
        tmp.set(lerp(offX, onX, gg), lerp(offY, onY, gg), zz);
        const s = gg > 0.5 ? Math.min(1, Math.min(ph, 1 - ph) * 12) : 1;
        m4.makeScale(s, s, s).setPosition(tmp);
        elec.setMatrixAt(i, m4);
      }
      elec.instanceMatrix.needsUpdate = true;
      sk = shake(t, voltOn, 0.4, 0.2);
      const sk2 = shake(t, W('answer', '3') + 0.85, 0.5, 0.3);
      sk = [sk[0] + sk2[0], sk[1] + sk2[1]];
      if (t > tA) sk = [sk[0] + (rand(Math.floor(t * 30)) - 0.5) * 0.06, sk[1]];
    } else {
      show('cells');
      const k4 = prog(t, cutGrid, cutPhone);
      rig.target.set(0, 0, 0);
      rig.size = lerp(2.2, 27, ease.inOut(k4) ** 1.2);
      rig.az = 45 + 25 * ease.inOut(k4);
      const frame = Math.floor(t * 14);
      for (let i = 0; i < G * G; i++) cells.setColorAt(i, rand(i * 7.3 + frame * 0.37) > 0.55 ? cOn : cOff);
      cells.instanceColor.needsUpdate = true;
      sk = shake(t, W('scale', 'math') - 0.05, 0.3, 0.12);
    }
    rig.shakeX = sk[0]; rig.shakeY = sk[1];
    st.render();
    ov.update(t);
  }
  return { duration: T, update, cues };
};
