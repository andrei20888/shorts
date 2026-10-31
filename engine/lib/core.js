// Shared rendering core for Tech Breakdown: isometric stage, materials, helpers.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export { THREE };

// Brand palette: navy base, silver hardware, teal energy.
export const PAL = {
  navy0: 0x040a17, navy1: 0x081530, navy2: 0x0e2247, navy3: 0x173463,
  teal: 0x19e3c1, tealHot: 0x8dfff0, tealDeep: 0x0b8c7a,
  silver: 0xc4cfdb, silverHi: 0xf1f5f9, silverLo: 0x6f7f93,
  amber: 0xffb547, coral: 0xff5468,
};
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---------- math / timing ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- materials ----------
export function makeMaterials() {
  return {
    silver: new THREE.MeshStandardMaterial({ color: 0xd2dae4, metalness: 0.35, roughness: 0.4 }),
    silverBrushed: new THREE.MeshStandardMaterial({ color: 0xc6d0db, metalness: 0.5, roughness: 0.42 }),
    chrome: new THREE.MeshStandardMaterial({ color: PAL.silverHi, metalness: 0.7, roughness: 0.2 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x4a586c, metalness: 0.5, roughness: 0.45 }),
    navyPlastic: new THREE.MeshPhysicalMaterial({ color: PAL.navy2, metalness: 0.1, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    darkPlastic: new THREE.MeshStandardMaterial({ color: 0x0b1424, metalness: 0.2, roughness: 0.55 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xe9eef4, metalness: 0.15, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    teal: new THREE.MeshStandardMaterial({ color: PAL.teal, emissive: PAL.teal, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.4 }),
    tealSoft: new THREE.MeshStandardMaterial({ color: PAL.tealDeep, emissive: PAL.teal, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4 }),
    glow: new THREE.MeshBasicMaterial({ color: PAL.tealHot, toneMapped: false }),
  };
}

// ---------- textures ----------
export function canvasTexture(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function radialBackground(inner = PAL.navy2, outer = PAL.navy0, cx = 0.5, cy = 0.45) {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * 0.78);
    gr.addColorStop(0, hex(inner));
    gr.addColorStop(1, hex(outer));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // faint dithering noise to avoid banding
    const img = g.getImageData(0, 0, w, h); const r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 6; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}

// ---------- blueprint grid floor ----------
export function makeGrid({ size = 400, cell = 1, major = 5, color = PAL.teal, opacity = 0.22, fade = 40, y = 0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uCell: { value: cell }, uMajor: { value: major },
      uFade: { value: fade }, uCenter: { value: new THREE.Vector3() }, uOpacity: { value: opacity },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uCell, uMajor, uFade, uOpacity; uniform vec3 uCenter; varying vec3 vW;
      float line(vec2 p, float cell, float wpx){ vec2 q = p / cell; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y) / wpx, 1.0); }
      void main(){
        float a = line(vW.xz, uCell, 1.0) * 0.32 + line(vW.xz, uCell * uMajor, 1.6) * 0.75;
        float d = length(vW.xz - uCenter.xz);
        a *= 1.0 - smoothstep(uFade * 0.35, uFade, d);
        gl_FragColor = vec4(uColor, a * uOpacity);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = -1;
  return m;
}

// ---------- outlines (schematic look) ----------
const lineMats = new Set();
export function lineMaterial(color = PAL.teal, width = 2, opacity = 1, dashed = false) {
  const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, dashed, dashSize: 0.12, gapSize: 0.08, toneMapped: false });
  lineMats.add(m);
  return m;
}
export function outline(mesh, { color = PAL.teal, width = 1.6, opacity = 0.9, angle = 25 } = {}) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, angle);
  const g = new LineSegmentsGeometry().fromEdgesGeometry(eg);
  const l = new LineSegments2(g, lineMaterial(color, width, opacity));
  l.computeLineDistances();
  mesh.add(l);
  return l;
}
// Arbitrary segment list [[x,y,z],[x,y,z], ...] pairs -> fat lines.
export function segments(points, { color = PAL.teal, width = 2, opacity = 1, dashed = false } = {}) {
  const g = new LineSegmentsGeometry();
  g.setPositions(points.flat());
  const l = new LineSegments2(g, lineMaterial(color, width, opacity, dashed));
  l.computeLineDistances();
  return l;
}

// ---------- stage ----------
export function createStage({ canvas, width, height, bloom = { strength: 0.7, radius: 0.55, threshold: 0.96 }, exposure = 1.0, background, envIntensity = 0.3, samples = 4, shadowExtent = 12 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = background ?? radialBackground();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = envIntensity;

  // Lights: cool key from upper-left, teal rim from behind, soft fill.
  // Tuned so iso faces read top > left > right (right faces pick up the teal rim).
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x0a1a33, 0.1);
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-1.5, 14, 2.5);
  key.castShadow = true;
  const E = shadowExtent;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -E; key.shadow.camera.right = E; key.shadow.camera.top = E; key.shadow.camera.bottom = -E;
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 80;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.55);
  fill.position.set(-1, 2.5, 10);
  const rim = new THREE.DirectionalLight(PAL.teal, 0.45);
  rim.position.set(10, 3, -3);
  scene.add(hemi, key, key.target, fill, rim);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const aspect = width / height;

  const rt = new THREE.WebGLRenderTarget(width, height, { samples, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), bloom.strength, bloom.radius, bloom.threshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  for (const m of lineMats) m.resolution.set(width, height);

  const stage = {
    renderer, scene, camera, composer, bloomPass, key, fill, rim, hemi, width, height, aspect,
    // Isometric camera: azimuth 45deg, elevation ~35.26deg (true iso) unless overridden.
    iso({ target = [0, 0, 0], view = 10, azimuth = 45, elevation = 35.264, roll = 0, shift = [0, 0] } = {}) {
      const az = THREE.MathUtils.degToRad(azimuth), el = THREE.MathUtils.degToRad(elevation);
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      const t = new THREE.Vector3(...target);
      camera.position.copy(t).addScaledVector(dir, 100);
      camera.up.set(0, 1, 0);
      camera.lookAt(t);
      if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
      const h = view / 2, w = h * aspect;
      camera.left = -w + shift[0]; camera.right = w + shift[0];
      camera.top = h + shift[1]; camera.bottom = -h + shift[1];
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    },
    // Project a world point to pixel coordinates of the output frame.
    toScreen(v) {
      const p = (v.isVector3 ? v.clone() : new THREE.Vector3(...v)).project(camera);
      return [(p.x * 0.5 + 0.5) * width, (-p.y * 0.5 + 0.5) * height];
    },
    // World point on plane y=planeY under a pixel position.
    groundAt(px, py, planeY = 0) {
      const ndc = new THREE.Vector2((px / width) * 2 - 1, -(py / height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const p = new THREE.Vector3();
      ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY), p);
      return p;
    },
    render() {
      for (const m of lineMats) m.resolution.set(width, height);
      composer.render();
    },
  };
  stage.iso();
  return stage;
}

// Soft blob shadow for objects floating above the floor.
export function contactShadow(radius = 1, opacity = 0.5) {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.002;
  return m;
}

// Invisible floor that only shows shadows.
export function shadowCatcher(size = 200, opacity = 0.35) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity, color: 0x000814 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}
