// Micro-scale models: standard-cell array, FinFET transistors, hair, red blood cell, virus.
import * as THREE from 'three';
import { PAL, rng, canvasTexture, outline } from './core.js';

// Dense interconnect / standard-cell field seen at the micrometre scale.
export function makeCellArray(M, { size = 48, seed = 4 } = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  const dummy = new THREE.Object3D();
  const cells = [];
  const rowH = 0.8;
  for (let z = -size / 2; z < size / 2; z += rowH) {
    let x = -size / 2;
    while (x < size / 2) { const w = 0.3 + R() * 1.2; cells.push([x + w / 2, z + rowH / 2, w, 0.1 + R() * 0.16]); x += w + 0.06; }
  }
  const cellMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.5 }), cells.length);
  const col = new THREE.Color();
  cells.forEach(([x, z, w, h], i) => {
    dummy.position.set(x, h / 2, z); dummy.scale.set(w, h, rowH - 0.08); dummy.updateMatrix();
    cellMesh.setMatrixAt(i, dummy.matrix);
    col.setHex([0x18325c, 0x1f3d6b, 0x14294d, 0x2a4876][Math.floor(R() * 4)]);
    cellMesh.setColorAt(i, col);
  });
  cellMesh.receiveShadow = true;
  // metal 1 (x direction) and metal 2 (z direction)
  const m1 = [], m2 = [];
  for (let z = -size / 2 + 0.2; z < size / 2; z += 0.4) if (R() < 0.7) m1.push([z, 0.06 + R() * 0.05]);
  for (let x = -size / 2 + 0.3; x < size / 2; x += 0.6) if (R() < 0.6) m2.push([x, 0.08 + R() * 0.06]);
  const metal = new THREE.MeshStandardMaterial({ color: 0xaab8c8, metalness: 0.6, roughness: 0.35 });
  const lines1 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal, m1.length);
  m1.forEach(([z, w], i) => { dummy.position.set(0, 0.34, z); dummy.scale.set(size, 0.05, w); dummy.updateMatrix(); lines1.setMatrixAt(i, dummy.matrix); });
  const lines2 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal, m2.length);
  m2.forEach(([x, w], i) => { dummy.position.set(x, 0.5, 0); dummy.scale.set(w, 0.06, size); dummy.updateMatrix(); lines2.setMatrixAt(i, dummy.matrix); });
  lines1.castShadow = lines2.castShadow = true;
  // glowing vias at a subset of crossings
  const vias = [];
  for (const [z] of m1) for (const [x] of m2) if (R() < 0.12) vias.push([x, z]);
  const viaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), new THREE.MeshBasicMaterial({ toneMapped: false }), vias.length);
  vias.forEach(([x, z], i) => { dummy.position.set(x, 0.42, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); viaMesh.setMatrixAt(i, dummy.matrix); viaMesh.setColorAt(i, col.setHex(PAL.teal)); });
  g.add(cellMesh, lines1, lines2, viaMesh);
  const tealC = new THREE.Color(PAL.tealHot), dimC = new THREE.Color(0x0b3b3a);
  // Light vias with a radial wave; strength 0..1 blends from dim to lit.
  const lightVias = (t, strength = 1) => {
    vias.forEach(([x, z], i) => {
      const d = Math.hypot(x, z);
      const w = 0.5 + 0.5 * Math.sin(d * 0.9 - t * 9 + (i % 7));
      const k = Math.min(1, Math.max(0, w * strength * 1.3));
      viaMesh.setColorAt(i, col.copy(dimC).lerp(tealC, k));
    });
    viaMesh.instanceColor.needsUpdate = true;
  };
  lightVias(0, 0.4);
  return { group: g, lightVias };
}

// One FinFET: source/drain blocks joined by a silicon fin, wrapped by a gate.
export function makeFinFET(M, { glowColor = PAL.teal } = {}) {
  const g = new THREE.Group();
  const finMat = new THREE.MeshStandardMaterial({ color: 0x2b4a6e, metalness: 0.3, roughness: 0.3, emissive: glowColor, emissiveIntensity: 0 });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0x8e9db0, metalness: 0.55, roughness: 0.35, emissive: glowColor, emissiveIntensity: 0 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.3), M.navyPlastic); base.position.y = -0.125; base.receiveShadow = true;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 0.14), finMat); fin.position.y = 0.17; fin.castShadow = true;
  const sdGeo = new THREE.BoxGeometry(0.36, 0.46, 0.46);
  const src = new THREE.Mesh(sdGeo, M.silver); src.position.set(-0.62, 0.23, 0); src.castShadow = true;
  const drn = new THREE.Mesh(sdGeo, M.silver); drn.position.set(0.62, 0.23, 0); drn.castShadow = true;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.58, 0.9), gateMat); gate.position.set(0, 0.29, 0); gate.castShadow = true;
  const cGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 16);
  const cs = new THREE.Mesh(cGeo, M.chrome); cs.position.set(-0.62, 0.6, 0);
  const cd = new THREE.Mesh(cGeo, M.chrome); cd.position.set(0.62, 0.6, 0);
  const cg = new THREE.Mesh(cGeo, M.chrome); cg.position.set(0, 0.72, 0.28);
  outline(gate, { width: 1.4, opacity: 0.6 }); outline(src, { width: 1.1, opacity: 0.35 }); outline(drn, { width: 1.1, opacity: 0.35 });
  g.add(base, fin, src, drn, gate, cs, cd, cg);
  return { group: g, gate, gateMat, fin, finMat, src, drn, anchors: { source: [-0.62, 0.46, 0], gate: [0, 0.58, 0], drain: [0.62, 0.46, 0] } };
}

export function makeFinFETArray(M, { nx = 5, nz = 5, px = 1.95, pz = 1.45 } = {}) {
  const g = new THREE.Group();
  const items = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const f = makeFinFET(M);
    f.group.position.set((i - (nx - 1) / 2) * px, 0, (j - (nz - 1) / 2) * pz);
    f.i = i; f.j = j;
    g.add(f.group); items.push(f);
  }
  const center = items.find((f) => f.i === (nx - 1) / 2 && f.j === (nz - 1) / 2);
  return { group: g, items, center };
}

// Electrons streaming through the fin of a transistor.
export function makeElectrons(count = 48, seed = 9) {
  const R = rng(seed);
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: PAL.tealHot, toneMapped: false }), count);
  const seeds = Array.from({ length: count }, () => [R(), R(), R()]);
  const dummy = new THREE.Object3D();
  // flow: 0..1 how many electrons are travelling; speed scales motion
  const update = (t, flow) => {
    seeds.forEach(([a, b, c], i) => {
      const active = a < flow;
      const u = (b + t * (0.55 + c * 0.35)) % 1;
      dummy.position.set(-0.75 + u * 1.5, 0.17 + (c - 0.5) * 0.24, (a - 0.5) * 0.1);
      const s = active ? Math.sin(Math.PI * u) * 1.2 : 0.0001;
      dummy.scale.setScalar(s);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  return { mesh, update };
}

export function makeHair({ radius = 4, length = 80 } = {}) {
  const tex = canvasTexture(1024, 512, (g, w, h) => {
    g.fillStyle = '#4e3a2c'; g.fillRect(0, 0, w, h);
    // overlapping cuticle scales
    for (let row = 0; row < 18; row++) for (let i = 0; i < 26; i++) {
      const x = i * 42 + (row % 2) * 21, y = row * 30;
      g.strokeStyle = `rgba(${150 + (i * 7) % 40},${120 + (row * 5) % 30},95,0.55)`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y + 40, 34, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }, { repeat: [2, 10] });
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xd8c2ad, roughness: 0.55, metalness: 0.05 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 96, 1, false), mat);
  m.rotation.x = Math.PI / 2; m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return { group: g, mesh: m };
}

export function makeBloodCell({ radius = 1.6 } = {}) {
  // Evans-Fung biconcave profile.
  const pts = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const r = (i / N) * radius, q = r / radius;
    const h = radius * Math.sqrt(Math.max(0, 1 - q * q)) * (0.14 + 1.0 * q * q - 0.74 * q * q * q * q) * 0.95;
    pts.push([r, h]);
  }
  const prof = [];
  for (const [r, h] of pts) prof.push(new THREE.Vector2(r, h));
  for (let i = pts.length - 1; i >= 0; i--) prof.push(new THREE.Vector2(pts[i][0], -pts[i][1]));
  const geo = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(Math.max(p.x, 0.0001), p.y)), 96);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xd8344a, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 1, sheenColor: new THREE.Color(0xff9aa6) });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return { group: g, mesh: m };
}

export function makeVirus({ radius = 1, spikes = 70, seed = 12 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 5), new THREE.MeshStandardMaterial({ color: 0x8a3157, roughness: 0.5, metalness: 0.1, emissive: 0x3a0820, emissiveIntensity: 0.6 }));
  body.castShadow = true;
  g.add(body);
  const stalk = new THREE.CylinderGeometry(0.035, 0.05, radius * 0.38, 8); stalk.translate(0, radius * 0.19, 0);
  const head = new THREE.SphereGeometry(0.1, 12, 8); head.translate(0, radius * 0.4, 0);
  const stalkM = new THREE.InstancedMesh(stalk, new THREE.MeshStandardMaterial({ color: 0xff6b7d, roughness: 0.45 }), spikes);
  const headM = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ color: 0xff8a98, emissive: PAL.coral, emissiveIntensity: 0.6, roughness: 0.4 }), spikes);
  const dummy = new THREE.Object3D(); const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < spikes; i++) {
    const y = 1 - (i / (spikes - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963;
    const n = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    dummy.position.copy(n).multiplyScalar(radius * 0.95);
    dummy.quaternion.setFromUnitVectors(up, n); dummy.updateMatrix();
    stalkM.setMatrixAt(i, dummy.matrix); headM.setMatrixAt(i, dummy.matrix);
  }
  g.add(stalkM, headM);
  return { group: g };
}
