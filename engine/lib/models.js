// Procedural hardware models in the Tech Breakdown style.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, hex, rng, canvasTexture, outline } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- brand mark: 2x2x2 cube with the front-top block lifted out ----------
export function makeBrandCube(M, { unit = 1, gap = 0.07, lift = 0.75, edge = true } = {}) {
  const g = new THREE.Group();
  const geo = new RoundedBoxGeometry(unit, unit, unit, 3, unit * 0.06);
  const inner = new THREE.MeshStandardMaterial({ color: 0x0d4f4a, emissive: PAL.teal, emissiveIntensity: 1.25, metalness: 0.4, roughness: 0.35 });
  const parts = {};
  const s = unit + gap;
  for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
    const isHero = x > 0 && y > 0 && z > 0;
    const m = new THREE.Mesh(geo, M.silver);
    m.position.set(x * s, y * s, z * s);
    m.castShadow = m.receiveShadow = true;
    if (edge) outline(m, { color: PAL.teal, width: 1.4, opacity: isHero ? 0.95 : 0.35, angle: 40 });
    g.add(m);
    parts[`${x > 0 ? 'R' : 'L'}${y > 0 ? 'T' : 'B'}${z > 0 ? 'F' : 'K'}`] = m;
  }
  // Glowing core faces revealed when the hero block lifts.
  const coreGeo = new THREE.BoxGeometry(unit * 0.96, unit * 0.04, unit * 0.96);
  const coreTop = new THREE.Mesh(coreGeo, inner); coreTop.position.set(0.5 * s, 0.02, 0.5 * s);
  const coreSideA = new THREE.Mesh(coreGeo, inner); coreSideA.rotation.z = Math.PI / 2; coreSideA.position.set(0.02, 0.5 * s, 0.5 * s);
  const coreSideB = new THREE.Mesh(coreGeo, inner); coreSideB.rotation.x = Math.PI / 2; coreSideB.position.set(0.5 * s, 0.5 * s, 0.02);
  const cores = new THREE.Group(); cores.add(coreTop, coreSideA, coreSideB);
  g.add(cores);
  parts.RTF.position.y += lift;
  return { group: g, parts, cores, inner };
}

// ---------- PCB with routed traces ----------
export function makePCB(M, { size = 16, chipSize = 4.4, seed = 3, thickness = 0.2 } = {}) {
  const R = rng(seed);
  const px = 2048, k = px / size;
  const routes = [];
  const half = chipSize / 2;
  for (let side = 0; side < 4; side++) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const u = -half + 0.25 + (i / (n - 1)) * (chipSize - 0.5);
      const d1 = 0.4 + R() * 1.6, d2 = 0.3 + R() * 1.4, d3 = 0.8 + R() * 3.5;
      const bend = (R() < 0.5 ? -1 : 1) * (u > 0 ? 1 : -1);
      // in a local frame: start at (u, half), go +y, then diagonal, then +y
      const pts = [[u, half], [u, half + d1], [u + bend * d2, half + d1 + d2], [u + bend * d2, half + d1 + d2 + d3]];
      const rot = (p) => { const [x, y] = p; return side === 0 ? [x, y] : side === 1 ? [y, -x] : side === 2 ? [-x, -y] : [-y, x]; };
      routes.push(pts.map(rot));
    }
  }
  const draw = (g, glow) => {
    g.fillStyle = glow ? '#000' : '#0a1a30'; g.fillRect(0, 0, px, px);
    if (!glow) {
      // subtle fibreglass weave
      g.globalAlpha = 0.05; g.strokeStyle = '#4c7aa8';
      for (let i = 0; i < px; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, px); g.stroke(); }
      g.globalAlpha = 1;
    }
    const toPx = ([x, y]) => [(x + size / 2) * k, (y + size / 2) * k];
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of routes) {
      g.strokeStyle = glow ? '#19e3c1' : '#123e4c';
      g.lineWidth = glow ? 3 : 7;
      g.beginPath(); r.forEach((p, i) => { const [x, y] = toPx(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      const [ex, ey] = toPx(r[r.length - 1]);
      g.fillStyle = glow ? '#19e3c1' : '#8fa3b8';
      g.beginPath(); g.arc(ex, ey, glow ? 5 : 9, 0, Math.PI * 2); g.fill();
      if (!glow) { g.fillStyle = '#0a1a30'; g.beginPath(); g.arc(ex, ey, 4, 0, Math.PI * 2); g.fill(); }
    }
    // chip footprint pads
    if (!glow) {
      g.strokeStyle = 'rgba(160,190,215,0.35)'; g.lineWidth = 3;
      const a = (size / 2 - half - 0.15) * k, b = (chipSize + 0.3) * k;
      g.strokeRect(a, a, b, b);
      // silkscreen labels
      g.fillStyle = 'rgba(200,215,230,0.55)'; g.font = '600 34px "JetBrains Mono"';
      g.fillText('U1  TB-X1', a, a - 18);
      g.fillText('C14', (size / 2 + 3.2) * k, (size / 2 - 3.6) * k);
      g.fillText('L2', (size / 2 - 4.6) * k, (size / 2 + 3.9) * k);
    }
  };
  const map = canvasTexture(px, px, (g) => draw(g, false));
  const emissiveMap = canvasTexture(px, px, (g) => draw(g, true));
  const top = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.6 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x0c2036, roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(size, thickness, size), [edge, edge, top, edge, edge, edge]);
  board.position.y = -thickness / 2;
  board.receiveShadow = true;
  const g = new THREE.Group(); g.add(board);
  // A few passives so the board reads as real hardware.
  const capGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.7, 32);
  const capTopGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.02, 32);
  const capTopTex = canvasTexture(256, 256, (c, w, h) => { c.fillStyle = '#c4cfdb'; c.fillRect(0, 0, w, h); c.strokeStyle = '#59677a'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 20); c.moveTo(20, h / 2); c.lineTo(w - 20, h / 2); c.stroke(); });
  const capTopMat = new THREE.MeshStandardMaterial({ map: capTopTex, metalness: 1, roughness: 0.3 });
  const capSpots = [[4.2, -3.2], [4.9, -3.2], [4.2, -2.5], [-4.4, 3.6], [-3.7, 3.6], [5.6, 2.4]];
  for (const [x, z] of capSpots) {
    const c = new THREE.Mesh(capGeo, M.silverBrushed); c.position.set(x, 0.35, z); c.castShadow = true;
    const t = new THREE.Mesh(capTopGeo, capTopMat); t.position.y = 0.36; c.add(t);
    g.add(c);
  }
  const ind = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.45, 0.9, 2, 0.06), M.gunmetal);
  ind.position.set(-4.4, 0.225, 4.6); ind.castShadow = true; g.add(ind);
  const smd = new THREE.BoxGeometry(0.3, 0.12, 0.16);
  const R2 = rng(11);
  for (let i = 0; i < 26; i++) {
    const a = R2() * Math.PI * 2, r = 3.2 + R2() * 3.8;
    const s = new THREE.Mesh(smd, i % 3 ? M.darkPlastic : M.silver);
    s.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r); s.rotation.y = R2() < 0.5 ? 0 : Math.PI / 2; s.castShadow = true;
    g.add(s);
  }
  return { group: g, board, topMat: top };
}

// ---------- CPU package: lid (IHS), die, substrate, solder balls ----------
function dieTextures(seed = 5) {
  const px = 2048;
  const R = rng(seed);
  const blocks = [];
  // 2x4 cores, GPU block, cache, IO ring
  for (let i = 0; i < 8; i++) blocks.push({ type: 'core', x: 0.07 + (i % 4) * 0.115, y: 0.08 + Math.floor(i / 4) * 0.27, w: 0.1, h: 0.24 });
  blocks.push({ type: 'gpu', x: 0.56, y: 0.08, w: 0.37, h: 0.51 });
  blocks.push({ type: 'cache', x: 0.07, y: 0.64, w: 0.45, h: 0.28 });
  blocks.push({ type: 'npu', x: 0.56, y: 0.64, w: 0.18, h: 0.28 });
  blocks.push({ type: 'io', x: 0.76, y: 0.64, w: 0.17, h: 0.28 });
  const draw = (g, glow) => {
    if (!glow) {
      const gr = g.createLinearGradient(0, 0, px, px);
      gr.addColorStop(0, '#141a3a'); gr.addColorStop(0.5, '#0b2a3a'); gr.addColorStop(1, '#1d1640');
      g.fillStyle = gr;
    } else g.fillStyle = '#000';
    g.fillRect(0, 0, px, px);
    for (const b of blocks) {
      const x = b.x * px, y = b.y * px, w = b.w * px, h = b.h * px;
      g.fillStyle = glow ? '#000' : ({ core: '#1c3557', gpu: '#162c4d', cache: '#203a5c', npu: '#173a46', io: '#24304a' })[b.type];
      g.fillRect(x, y, w, h);
      g.strokeStyle = glow ? 'rgba(25,227,193,0.9)' : 'rgba(170,200,225,0.55)';
      g.lineWidth = glow ? 3 : 4; g.strokeRect(x, y, w, h);
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (b.type === 'cache') {
        g.strokeStyle = glow ? 'rgba(25,227,193,0.35)' : 'rgba(150,180,210,0.35)'; g.lineWidth = 2;
        for (let yy = y + 6; yy < y + h; yy += 7) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
      } else if (b.type === 'gpu') {
        const n = 6;
        for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
          const cx = x + 14 + i * ((w - 28) / n), cy = y + 14 + j * ((h - 28) / 4);
          g.strokeStyle = glow ? 'rgba(25,227,193,0.6)' : 'rgba(150,180,210,0.45)'; g.lineWidth = 2;
          g.strokeRect(cx, cy, (w - 28) / n - 10, (h - 28) / 4 - 10);
        }
      } else {
        for (let i = 0; i < 90; i++) {
          const rx = x + R() * w, ry = y + R() * h, rw = 8 + R() * 50, rh = 6 + R() * 30;
          g.fillStyle = glow ? `rgba(25,227,193,${0.1 + R() * 0.4})` : `rgba(${110 + R() * 60},${150 + R() * 50},${190 + R() * 40},${0.12 + R() * 0.25})`;
          g.fillRect(rx, ry, rw, rh);
        }
      }
      g.restore();
    }
    // IO pad ring
    g.fillStyle = glow ? 'rgba(25,227,193,0.8)' : '#9fb2c6';
    for (let i = 0; i < 60; i++) {
      const t = 0.03 + i * (0.94 / 59);
      g.fillRect(t * px - 6, 16, 12, 18); g.fillRect(t * px - 6, px - 34, 12, 18);
      g.fillRect(16, t * px - 6, 18, 12); g.fillRect(px - 34, t * px - 6, 18, 12);
    }
  };
  return {
    map: canvasTexture(px, px, (g) => draw(g, false)),
    emissiveMap: canvasTexture(px, px, (g) => draw(g, true)),
    blocks,
  };
}

function lidLabel() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,52,70,0.75)';
    g.font = '700 92px "Space Grotesk"'; g.fillText('TB-X1', 110, 640);
    g.font = '500 40px "JetBrains Mono"'; g.fillText('BREAKDOWN SILICON', 112, 712);
    g.fillText('3NM · 15.2B T', 112, 768);
    // small cube glyph
    g.strokeStyle = 'rgba(40,52,70,0.75)'; g.lineWidth = 10; g.lineJoin = 'round';
    const cx = 200, cy = 420, r = 80;
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.moveTo(cx, cy); g.lineTo(cx, cy - r); g.moveTo(cx, cy); g.lineTo(cx + r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6)); g.moveTo(cx, cy); g.lineTo(cx - r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6)); g.stroke();
    // pin-1 triangle
    g.fillStyle = 'rgba(40,52,70,0.75)'; g.beginPath(); g.moveTo(60, 60); g.lineTo(150, 60); g.lineTo(60, 150); g.fill();
  });
}

export function makeChip(M, { size = 4, edges = true } = {}) {
  const g = new THREE.Group();
  const subTex = canvasTexture(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0d2b37'; c.fillRect(0, 0, w, h);
    const R = rng(21);
    c.strokeStyle = 'rgba(90,180,190,0.25)'; c.lineWidth = 2;
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 200, y); c.lineTo(x + (R() - 0.5) * 200, y + (R() - 0.5) * 200); c.stroke(); }
    c.fillStyle = 'rgba(200,215,230,0.6)'; c.font = '600 30px "JetBrains Mono"'; c.fillText('TB-X1 · SUBSTRATE', 40, h - 40);
  });
  const subTop = new THREE.MeshStandardMaterial({ map: subTex, metalness: 0.2, roughness: 0.55 });
  const subSide = new THREE.MeshStandardMaterial({ color: 0x0a1f2a, roughness: 0.6 });
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.16, size), [subSide, subSide, subTop, subSide, subSide, subSide]);
  substrate.position.y = 0.08 + 0.12; substrate.castShadow = substrate.receiveShadow = true;
  if (edges) outline(substrate, { color: PAL.teal, width: 1.2, opacity: 0.5 });

  const dt = dieTextures();
  const dieTop = new THREE.MeshStandardMaterial({ map: dt.map, emissiveMap: dt.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.6, metalness: 0.55, roughness: 0.25 });
  const dieSide = new THREE.MeshStandardMaterial({ color: 0x1a2440, metalness: 0.6, roughness: 0.3 });
  const dieSize = size * 0.56;
  const die = new THREE.Mesh(new THREE.BoxGeometry(dieSize, 0.07, dieSize), [dieSide, dieSide, dieTop, dieSide, dieSide, dieSide]);
  die.position.y = substrate.position.y + 0.08 + 0.035; die.castShadow = die.receiveShadow = true;

  // SMD caps around the die
  const capBody = new THREE.BoxGeometry(0.16, 0.08, 0.09);
  const caps = new THREE.Group();
  for (let i = 0; i < 28; i++) {
    const side = i % 4, t = (Math.floor(i / 4) / 6 - 0.5) * dieSize * 1.1;
    const off = dieSize / 2 + 0.28;
    const c = new THREE.Mesh(capBody, i % 2 ? M.gunmetal : M.silver);
    const p = side === 0 ? [t, off] : side === 1 ? [off, t] : side === 2 ? [t, -off] : [-off, t];
    c.position.set(p[0], substrate.position.y + 0.12, p[1]);
    if (side % 2) c.rotation.y = Math.PI / 2;
    caps.add(c);
  }

  const lidW = size * 0.92;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(lidW, 0.26, lidW, 4, 0.09), M.silverBrushed);
  lid.castShadow = lid.receiveShadow = true;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(lidW * 0.9, lidW * 0.9), new THREE.MeshStandardMaterial({ map: lidLabel(), transparent: true, metalness: 0.6, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
  label.rotation.x = -Math.PI / 2; label.position.y = 0.131;
  lid.add(label);
  if (edges) outline(lid, { color: PAL.teal, width: 1.4, opacity: 0.55, angle: 35 });
  const lidRest = substrate.position.y + 0.08 + 0.13 + 0.06;
  lid.position.y = lidRest;

  // BGA balls
  const n = 18;
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 16, 12), M.chrome, n * n);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    mtx.makeTranslation((i / (n - 1) - 0.5) * size * 0.9, 0.06, (j / (n - 1) - 0.5) * size * 0.9);
    balls.setMatrixAt(i * n + j, mtx);
  }
  balls.castShadow = true;

  g.add(substrate, die, caps, lid, balls);
  return { group: g, substrate, die, dieTop, caps, lid, lidRest, balls, dieSize, blocks: dt.blocks };
}

// ---------- rocket with separable stages ----------
export function makeRocket(M, { scale = 1 } = {}) {
  const g = new THREE.Group();
  const r = 0.42;
  const stage1 = new THREE.Group(), stage2 = new THREE.Group(), fairing = new THREE.Group(), engines = new THREE.Group();
  const body1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.0, 48), M.white); body1.position.y = 1.5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.09, 48), M.teal); band.position.y = 2.6;
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, 0.35, 48), M.gunmetal); inter.position.y = 3.17;
  const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(0.55, -0.15); finShape.lineTo(0.55, 0.15); finShape.lineTo(0, 0.95); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(finGeo, M.silver);
    const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 2;
    f.position.set(r * 0.95, 0.12, -0.025); piv.add(f); stage1.add(piv);
  }
  stage1.add(body1, band, inter);
  const bell = new THREE.LatheGeometry([V(0.05, 0, 0), V(0.09, -0.05, 0), V(0.12, -0.2, 0), V(0.19, -0.42, 0), V(0.2, -0.45, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 32);
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(bell, M.gunmetal); const a = i * Math.PI * 2 / 3;
    n.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2); engines.add(n);
  }
  const plumeMat = new THREE.MeshBasicMaterial({ color: PAL.teal, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.6, 32, 1, true), plumeMat);
  plume.rotation.x = Math.PI; plume.position.y = -1.2;
  const plumeCore = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.0, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8fffb, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  plumeCore.rotation.x = Math.PI; plumeCore.position.y = -0.9;
  engines.add(plume, plumeCore);
  stage1.add(engines);
  const body2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 48), M.white); body2.position.y = 0.75;
  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.06, 48), M.teal); band2.position.y = 1.3;
  const n2 = new THREE.Mesh(bell, M.gunmetal); n2.scale.setScalar(1.4);
  stage2.add(body2, band2, n2);
  const ogive = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; ogive.push(new THREE.Vector2(r * Math.sqrt(1 - t * t) * (1 - 0.05 * t), t * 1.35)); }
  const cone = new THREE.Mesh(new THREE.LatheGeometry(ogive, 48), M.white);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.chrome); tip.position.y = 1.35;
  fairing.add(cone, tip);
  for (const o of [body1, body2, cone, inter]) { o.castShadow = true; outline(o, { color: PAL.teal, width: 1.1, opacity: 0.35, angle: 60 }); }
  g.add(stage1, stage2, fairing);
  const layout = (explode = 0) => {
    stage1.position.y = 0.5;
    stage2.position.y = 0.5 + 3.35 + explode * 0.9;
    fairing.position.y = stage2.position.y + 1.5 + explode * 0.7;
  };
  layout(0);
  g.scale.setScalar(scale);
  return { group: g, stage1, stage2, fairing, engines, plume, plumeMat, layout };
}

// ---------- server rack with one sled pulled out ----------
export function makeServerRack(M, { units = 9, seed = 2 } = {}) {
  const g = new THREE.Group();
  const W = 2.0, H = units * 0.42 + 0.4, D = 1.6;
  const post = new THREE.BoxGeometry(0.1, H, 0.1);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const p = new THREE.Mesh(post, M.gunmetal); p.position.set(x * (W / 2 - 0.05), H / 2, z * (D / 2 - 0.05)); p.castShadow = true; g.add(p);
  }
  const plate = new THREE.BoxGeometry(W, 0.1, D);
  const top = new THREE.Mesh(plate, M.gunmetal); top.position.y = H - 0.05;
  const bot = new THREE.Mesh(plate, M.gunmetal); bot.position.y = 0.05;
  top.castShadow = true; outline(top, { width: 1.2, opacity: 0.5 }); outline(bot, { width: 1.2, opacity: 0.5 });
  g.add(top, bot);
  const face = canvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#b9c4d0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b2638';
    for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) c.fillRect(150 + i * 22, 28 + j * 26, 14, 14);
    c.fillStyle = '#2a3648'; c.fillRect(20, 30, 100, 68);
    c.strokeStyle = '#8796a8'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
  });
  const faceMat = new THREE.MeshStandardMaterial({ map: face, metalness: 0.8, roughness: 0.4 });
  const sledGeo = new THREE.BoxGeometry(W - 0.22, 0.36, D - 0.1);
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
  const sleds = [];
  for (let i = 0; i < units; i++) {
    const s = new THREE.Mesh(sledGeo, [M.gunmetal, M.gunmetal, M.gunmetal, M.gunmetal, faceMat, M.gunmetal]);
    s.position.set(0, 0.32 + i * 0.42, 0); s.castShadow = true;
    for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: PAL.teal, toneMapped: false }));
      l.position.set(W / 2 - 0.35 - k * 0.1, 0.08, (D - 0.1) / 2 + 0.011); s.add(l); leds.push(l);
    }
    g.add(s); sleds.push(s);
  }
  // pulled-out sled internals
  const hero = sleds[Math.floor(units / 2)];
  const fanGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24);
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Mesh(fanGeo, M.darkPlastic); f.rotation.x = Math.PI / 2; f.position.set(-0.6 + k * 0.4, 0.2, 0.25); hero.add(f);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 16), M.teal); hub.rotation.x = Math.PI / 2; hub.position.copy(f.position); hero.add(hub);
  }
  for (let k = 0; k < 2; k++) {
    const hs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), M.silver); hs.position.set(-0.35 + k * 0.7, 0.24, -0.25); hero.add(hs);
  }
  return { group: g, sleds, hero, leds, height: H };
}

// ---------- gear ----------
export function makeGear(M, { teeth = 16, r = 1, depth = 0.3, toothH = 0.18, hole = 0.25, mat } = {}) {
  const s = new THREE.Shape();
  const N = teeth * 4;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const phase = i % 4;
    const rr = phase === 1 || phase === 2 ? r + toothH : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 32 });
  geo.translate(0, 0, -depth / 2); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat ?? M.silver); m.castShadow = m.receiveShadow = true;
  outline(m, { width: 1, opacity: 0.35, angle: 50 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(hole * 0.95, hole * 0.95, depth * 1.4, 32), M.teal);
  const g = new THREE.Group(); g.add(m, hub);
  return { group: g, gear: m };
}

export { hex };
