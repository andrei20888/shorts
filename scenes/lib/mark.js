// The Physics Sandbox mark: a 2x2x2 lab cube with one block blasting out (destruction)
// and an orbit ring (gravity). Shared by the logo, the banner and the Shorts end card.
import * as THREE from 'three';
import { BRAND, edgeTexture, emissiveEdgeTexture, rng } from './lab.js';

function shardGeometry(r) {
  // irregular chunk: a jittered octahedron
  const g = new THREE.OctahedronGeometry(1, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.6 + r() * 0.8), p.getY(i) * (0.5 + r() * 0.9), p.getZ(i) * (0.4 + r() * 0.8));
  g.computeVertexNormals();
  return g;
}

export function makeMark({ env = null, ringColor = BRAND.cyan, edge = 0.05, gap = 0.1, burst = 0.78, shards = true, view = new THREE.Vector3(1, 0.74, 1) } = {}) {
  const group = new THREE.Group();
  const s = 1, step = (s + gap) / 2;
  const box = new THREE.BoxGeometry(s, s, s);

  const darkMat = new THREE.MeshStandardMaterial({
    map: edgeTexture({ face: '#1e2228', glow: BRAND.cyanHex, edge }),
    emissiveMap: emissiveEdgeTexture({ glow: BRAND.cyanHex, edge }),
    emissive: 0xffffff, emissiveIntensity: 0.85,
    metalness: 0.7, roughness: 0.3, envMap: env, envMapIntensity: 0.55,
  });
  const hotMat = new THREE.MeshStandardMaterial({
    map: edgeTexture({ face: BRAND.orangeHex, glow: '#ffe2c4', edge, inner: false }),
    emissiveMap: edgeTexture({ face: '#5a1c00', glow: '#ffb070', edge, inner: false }),
    emissive: 0xffffff, emissiveIntensity: 0.75,
    metalness: 0.2, roughness: 0.4, envMap: env, envMapIntensity: 0.5,
  });

  const cube = new THREE.Group();
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) {
    const hot = i === 1 && j === 1 && k === -1;
    const m = new THREE.Mesh(box, hot ? hotMat : darkMat);
    m.position.set(i * step, j * step, k * step);
    if (hot) {
      m.position.add(new THREE.Vector3(0.62, 0.72, -0.5).multiplyScalar(burst));
      m.rotation.set(0.32, 0.18, -0.42);
      group.userData.hot = m;
    }
    cube.add(m);
  }
  group.add(cube);

  if (shards) {
    const r = rng(7);
    const shardMatO = new THREE.MeshStandardMaterial({ color: BRAND.orange, emissive: BRAND.orange, emissiveIntensity: 1.2, roughness: 0.5 });
    const shardMatC = new THREE.MeshStandardMaterial({ color: BRAND.cyan, emissive: BRAND.cyan, emissiveIntensity: 1.1, roughness: 0.5 });
    const origin = new THREE.Vector3(step, step, -step);
    const dir = new THREE.Vector3(0.62, 0.72, -0.5).normalize();
    for (let n = 0; n < 11; n++) {
      const sh = new THREE.Mesh(shardGeometry(r), n % 4 === 3 ? shardMatC : shardMatO);
      const t = 0.35 + r() * 0.9;
      const side = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9);
      sh.position.copy(origin).addScaledVector(dir, t * burst * 1.25).add(side);
      sh.scale.setScalar(0.035 + r() * 0.07);
      sh.rotation.set(r() * 6, r() * 6, r() * 6);
      group.add(sh);
    }
  }

  // orbit ring + satellite
  const ringMat = new THREE.MeshStandardMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 1.3, roughness: 0.4 });
  const R = 2.0;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.034, 16, 260), ringMat);
  // orient the orbit so it reads as a tilted ellipse (~68deg from the viewer, rotated 22deg on screen)
  const v = view.clone().normalize();
  const right = new THREE.Vector3().crossVectors(v.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, v.clone().negate()).normalize();
  const th = THREE.MathUtils.degToRad(22), ph = THREE.MathUtils.degToRad(70);
  const w = up.clone().multiplyScalar(Math.cos(th)).addScaledVector(right, Math.sin(th));
  const n = v.clone().multiplyScalar(Math.cos(ph)).addScaledVector(w, Math.sin(ph)).normalize();
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const ringPivot = new THREE.Group();
  ringPivot.add(ring);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16),
    new THREE.MeshStandardMaterial({ color: BRAND.orange, emissive: BRAND.orange, emissiveIntensity: 1.6 }));
  const a = 3.75;
  sat.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
  ring.add(sat);
  group.add(ringPivot);
  group.userData.ring = ring;
  group.userData.cube = cube;
  return group;
}

export function markLights(target) {
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 4);
  const fill = new THREE.DirectionalLight(BRAND.cyan, 1.2); fill.position.set(4, -1, -3);
  const rim = new THREE.PointLight(BRAND.orange, 6, 5, 1.5); rim.position.set(1.4, 1.6, -0.6);
  const amb = new THREE.AmbientLight(0x404858, 0.6);
  target.add(key, fill, rim, amb);
}
