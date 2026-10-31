// Reusable procedural models in the channel style (silver / steel / navy with teal glow).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { shadowed } from './stage.js';

export const rbox = (w, h, d, r = 0.06, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
export const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

// Brand mark: a cube "broken down" into three floating slabs with teal energy between them.
export function brandCube(M, { gap = 0.34 } = {}) {
  const g = new THREE.Group();
  const slabs = [];
  const mats = [M.silver, M.steel, M.silver];
  for (let i = 0; i < 3; i++) {
    const s = rbox(2, 0.56, 2, 0.08, mats[i]);
    s.position.y = i * (0.56 + gap);
    g.add(s); slabs.push(s);
    if (i < 2) {
      const core = box(1.5, 0.05, 1.5, M.teal);
      core.position.y = i * (0.56 + gap) + 0.28 + gap / 2;
      g.add(core);
    }
  }
  // circuit on top face
  const top = slabs[2];
  const plate = rbox(1.62, 0.04, 1.62, 0.03, M.navy); plate.position.y = 0.28; top.add(plate);
  const y = 0.305;
  const pad = box(0.62, 0.03, 0.62, M.teal); pad.position.y = y; top.add(pad);
  const inner = box(0.4, 0.035, 0.4, M.dark); inner.position.y = y + 0.005; top.add(inner);
  const traces = [[0.31, 0, 0.62, 0], [-0.31, 0, -0.62, 0], [0, 0.31, 0, 0.62], [0, -0.31, 0, -0.62], [0.2, 0.31, 0.45, 0.75], [-0.2, -0.31, -0.45, -0.75]];
  for (const [x0, z0, x1, z1] of traces) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const tr = box(len, 0.02, 0.06, M.teal);
    tr.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    tr.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    top.add(tr);
    const via = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), M.teal);
    via.position.set(x1, y, z1); top.add(via);
  }
  g.userData.slabs = slabs;
  return shadowed(g);
}

// Microchip with exploded layers: substrate (PCB) -> die -> heat-spreader lid.
export function microchip(M) {
  const g = new THREE.Group();
  const sub = rbox(3.2, 0.18, 3.2, 0.04, M.navy);
  const traceMat = M.tealSoft;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r0 = 0.9, r1 = 1.5;
    const t = box(r1 - r0, 0.02, 0.035, traceMat);
    t.position.set(Math.cos(a) * (r0 + r1) / 2, 0.1, Math.sin(a) * (r0 + r1) / 2);
    t.rotation.y = -a; sub.add(t);
  }
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), M.brushed, 144);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { m4.makeTranslation(-1.35 + i * 0.245, -0.12, -1.35 + j * 0.245); balls.setMatrixAt(k++, m4); }
  sub.add(balls);
  const die = rbox(1.6, 0.12, 1.6, 0.02, M.dark);
  // die floorplan: blocks that can glow (cores, GPU, cache)
  const blocks = [];
  const plan = [[-0.4, -0.4, 0.6, 0.6], [0.4, -0.4, 0.6, 0.6], [-0.4, 0.4, 0.6, 0.6], [0.25, 0.4, 0.3, 0.6], [0.6, 0.4, 0.25, 0.6]];
  for (const [x, z, w, d] of plan) {
    const mat = M.tealSoft.clone();
    const b = box(w - 0.06, 0.03, d - 0.06, mat);
    b.position.set(x, 0.07, z); die.add(b); blocks.push(b);
  }
  const lid = rbox(2.4, 0.16, 2.4, 0.05, M.silver);
  g.add(sub, die, lid);
  g.userData = { sub, die, lid, blocks };
  g.userData.setExplode = (e) => { sub.position.y = 0; die.position.y = 0.15 + e * 1.1; lid.position.y = 0.26 + e * 2.3; };
  g.userData.setExplode(0);
  return shadowed(g);
}

export function serverRack(M) {
  const g = new THREE.Group();
  const frame = rbox(2.2, 4.6, 1.8, 0.06, M.steel); frame.position.y = 2.3; g.add(frame);
  const leds = [];
  for (let i = 0; i < 8; i++) {
    const u = rbox(2.0, 0.42, 0.1, 0.03, M.brushed); u.position.set(0, 0.45 + i * 0.52, 0.9); g.add(u);
    for (let j = 0; j < 3; j++) {
      const l = box(0.08, 0.08, 0.04, M.teal.clone()); l.position.set(0.55 + j * 0.16, 0.45 + i * 0.52, 0.96); g.add(l); leds.push(l);
    }
    for (let j = 0; j < 6; j++) { const v = box(0.05, 0.22, 0.02, M.dark); v.position.set(-0.8 + j * 0.12, 0.45 + i * 0.52, 0.96); g.add(v); }
  }
  g.userData.leds = leds;
  return shadowed(g);
}

export function rocket(M) {
  const pts = [[0, 4.6], [0.25, 4.2], [0.48, 3.5], [0.55, 2.8], [0.55, 0.6], [0.5, 0.35], [0.35, 0.3], [0.45, 0], [0.18, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.silver));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.14, 48), M.teal); band.position.y = 2.6; g.add(band);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.55, -0.1); s.lineTo(0.55, 0.3); s.lineTo(0, 1.0);
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }), M.steel);
    f.position.y = 0.35; f.rotation.y = (i * Math.PI) / 2; f.translateX(0.5); g.add(f);
  }
  return shadowed(g);
}

export function gear(M, teeth = 12, r = 1, mat) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.82 : r;
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(hole);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), mat || M.brushed);
  m.rotation.x = -Math.PI / 2;
  return shadowed(m);
}
