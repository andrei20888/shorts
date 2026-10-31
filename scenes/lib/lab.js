// Shared "digital lab" look for every Physics Sandbox render: brand palette, renderer,
// bloom pipeline, procedural textures and the frame-streaming helper used by video scenes.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const BRAND = {
  orange: 0xff6a13, orangeHex: '#ff6a13',
  cyan: 0x00e5ff, cyanHex: '#00e5ff',
  charcoal: 0x1a1d21, charcoalHex: '#1a1d21',
  deep: 0x0c0e11, deepHex: '#0c0e11',
  steel: 0x2b3038,
};

export const params = Object.fromEntries(new URLSearchParams(location.search));
export const W = +(params.w || 1080), H = +(params.h || 1920), FPS = +(params.fps || 60);

window.addEventListener('error', e => { window.__error = String(e.message || e); });
window.addEventListener('unhandledrejection', e => { window.__error = String(e.reason && e.reason.stack || e.reason); });

export function log(...a) { fetch('/log', { method: 'POST', body: a.join(' ') }); }

export function makeRenderer(w = W, h = H, { alpha = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (alpha) renderer.setClearColor(0x000000, 0);
  return renderer;
}

export function envMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return tex;
}

// Vignette + subtle chromatic aberration + grain, applied after bloom.
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.9 }, uCA: { value: 0.0012 }, uGrain: { value: 0.035 }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uCA, uGrain, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 off = c * uCA * 2.0;
      vec4 col = texture2D(tDiffuse, vUv);
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.b = texture2D(tDiffuse, vUv - off).b;
      vec2 cv = c; cv.x *= uAspect;
      float v = smoothstep(0.95, 0.25, length(cv) * uVig);
      col.rgb *= mix(0.55, 1.0, v);
      col.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * uGrain;
      gl_FragColor = col;
    }`,
};

export function makeComposer(renderer, scene, camera, { w = W, h = H, bloom = 0.9, radius = 0.55, threshold = 0.82, samples = 4, finish = true } = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), bloom, radius, threshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  let finishPass = null;
  if (finish) {
    finishPass = new ShaderPass(FinishShader);
    finishPass.uniforms.uAspect.value = w / h;
    composer.addPass(finishPass);
  }
  return { composer, bloomPass, finishPass };
}

// Dark face + glowing border, used as map/emissiveMap for "lab blocks".
export function edgeTexture({ size = 512, edge = 0.055, face = '#262a31', glow = '#00e5ff', inner = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = face; g.fillRect(0, 0, size, size);
  // faint inner panel line, like machined plates
  if (inner) {
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = size * 0.01;
    g.strokeRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
  }
  const e = size * edge;
  g.strokeStyle = glow; g.lineWidth = e;
  g.strokeRect(e / 2, e / 2, size - e, size - e);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function emissiveEdgeTexture({ size = 512, edge = 0.055, glow = '#00e5ff' } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const e = size * edge;
  g.strokeStyle = glow; g.lineWidth = e;
  g.strokeRect(e / 2, e / 2, size - e, size - e);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Big glowing lab grid (shader plane): fine lines + major lines, fading with distance.
export function gridPlane({ size = 400, color = BRAND.cyan, minor = 1, major = 5, opacity = 1, fade = 120 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uMinor: { value: minor }, uMajor: { value: major }, uOpacity: { value: opacity }, uFade: { value: fade } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uMinor, uMajor, uOpacity, uFade; varying vec3 vW;
      float line(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y) / w, 1.0); }
      void main(){
        float a = line(vW.xz, uMinor, 1.0) * 0.28 + line(vW.xz, uMajor, 1.6) * 0.9;
        float d = length(vW.xz - cameraPosition.xz);
        a *= smoothstep(uFade, uFade * 0.15, d);
        gl_FragColor = vec4(uColor * 1.6, a * uOpacity);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function gradientBackground(top = '#1d2026', bottom = '#0a0b0e') {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function loadFonts() {
  const faces = [
    ['Orbitron', '/node_modules/@fontsource/orbitron/files/orbitron-latin-900-normal.woff2', 900],
    ['Orbitron', '/node_modules/@fontsource/orbitron/files/orbitron-latin-800-normal.woff2', 800],
    ['Orbitron', '/node_modules/@fontsource/orbitron/files/orbitron-latin-700-normal.woff2', 700],
    ['Chakra Petch', '/node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2', 700],
    ['Chakra Petch', '/node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2', 600],
    ['Chakra Petch', '/node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff2', 500],
  ];
  for (const [fam, url, weight] of faces) {
    try { const f = new FontFace(fam, `url(${url})`, { weight: String(weight) }); await f.load(); document.fonts.add(f); } catch (e) { /* weight may not exist */ }
  }
}

// Streams one composited frame (2D canvas) to the render server -> ffmpeg.
export async function sendFrame(ctx2d) {
  const img = ctx2d.getImageData(0, 0, ctx2d.canvas.width, ctx2d.canvas.height);
  await fetch('/frame', { method: 'POST', body: img.data.buffer });
}

// Deterministic PRNG
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
export const clamp01 = x => Math.max(0, Math.min(1, x));
