import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as S from './shaders.js';
import { Hud, ease, clamp01, lerp, fmtInt } from './hud.js';

const q = new URLSearchParams(location.search);
const W = +q.get('w') || 1080, H = +q.get('h') || 1920, FPS = +q.get('fps') || 30;
const TL = await (await fetch('/timeline.json')).json();
const beats = TL.beats; const B = Object.fromEntries(beats.map((b) => [b.id, b]));
const lines = beats.flatMap((b) => b.lines); const L = Object.fromEntries(lines.map((l) => [l.id, l]));
const CD = TL.countdown;

// ---------- renderer / camera ----------
const canvas = document.getElementById('gl'); canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const FOV = 20, D = 300;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, 6000); camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1);
const PX = (2 * D * Math.tan((FOV / 2) * Math.PI / 180)) / H; // world units per pixel at depth D
const scene = new THREE.Scene();
const LIGHT_DIR = new THREE.Vector3(-0.55, 0.45, 1.0).normalize();
const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.copy(LIGHT_DIR.clone().multiplyScalar(500)); scene.add(sun);
scene.add(new THREE.AmbientLight(0x3350a0, 0.18));

// ---------- background ----------
const bgMat = new THREE.ShaderMaterial({ vertexShader: S.BG_VERT, fragmentShader: S.BG_FRAG, depthWrite: false, depthTest: false,
  uniforms: { res: { value: new THREE.Vector2(W, H) }, time: { value: 0 }, zoom: { value: 0 }, nebulaAmt: { value: 1 }, dim: { value: 1 } } });
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat); bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

// ---------- dust (parallax particles) ----------
const DUST_N = 700; const dustPos = new Float32Array(DUST_N * 3); const dustBase = new Float32Array(DUST_N * 3);
for (let i = 0; i < DUST_N; i++) { dustBase[i * 3] = (Math.random() - 0.5) * 220; dustBase[i * 3 + 1] = (Math.random() - 0.5) * 380; dustBase[i * 3 + 2] = -Math.random() * 600 - 150; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
dust.frustumCulled = false; scene.add(dust);

// ---------- helpers ----------
const texLoader = new THREE.TextureLoader();
const loadTex = (u, srgb = true) => new Promise((res, rej) => texLoader.load(u, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const v3 = (r, g, b) => new THREE.Vector3(r, g, b);
const lin = (r, g, b) => new THREE.Vector3(r ** 2.2, g ** 2.2, b ** 2.2); // sRGB palette → linear
function placeable(group) {
  group.visible = false;
  group.setPx = (x, y, r) => { group.position.set((x - W / 2) * PX, -(y - H / 2) * PX, -D); group.scale.setScalar(Math.max(1e-4, r * PX)); group.visible = r > 0.35; };
  return group;
}
function sphereShader(frag, uniforms, extra = {}) {
  return new THREE.ShaderMaterial({ vertexShader: S.SPHERE_VERT, fragmentShader: frag, uniforms, ...extra });
}
function makeStar(cfg) {
  const g = new THREE.Group();
  const u = { time: { value: 0 }, cellScale: { value: cfg.cellScale }, speed: { value: cfg.speed }, brightness: { value: cfg.brightness }, limbPow: { value: cfg.limbPow },
    hot: { value: cfg.hot }, mid: { value: cfg.mid }, cool: { value: cfg.cool }, laneAmt: { value: cfg.lanes ?? 0.55 } };
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), sphereShader(S.STAR_FRAG, u)); g.add(body);
  const halo1 = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), sphereShader(S.HALO_FRAG, { color: { value: cfg.halo }, power: { value: cfg.haloPow || 3.5 }, intensity: { value: cfg.haloInt || 1.1 } },
    { side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo1.scale.setScalar(cfg.haloScale || 1.9); g.add(halo1);
  const halo2 = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sphereShader(S.HALO_FRAG, { color: { value: cfg.halo }, power: { value: 7 }, intensity: { value: 0.22 } },
    { side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo2.scale.setScalar((cfg.haloScale || 1.9) * 1.7); g.add(halo2);
  g.userData.u = u; g.userData.body = body; return placeable(g);
}

// ---------- Earth ----------
const [tEarth, tSpec, tNorm, tClouds] = await Promise.all([
  loadTex('/assets/textures/earth_atmos_2048.jpg'), loadTex('/assets/textures/earth_specular_2048.jpg', false),
  loadTex('/assets/textures/earth_normal_2048.jpg', false), loadTex('/assets/textures/earth_clouds_1024.png')]);
const earth = new THREE.Group();
const earthBody = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshPhongMaterial({ map: tEarth, specularMap: tSpec, normalMap: tNorm, normalScale: new THREE.Vector2(0.7, 0.7), specular: new THREE.Color(0x4a5a70), shininess: 18 }));
const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 72), new THREE.MeshLambertMaterial({ map: tClouds, transparent: true, opacity: 0.95, depthWrite: false }));
const earthAtmo = new THREE.Mesh(new THREE.SphereGeometry(1.025, 96, 72), sphereShader(S.ATMO_FRAG, { color: { value: lin(0.42, 0.75, 1.0) }, power: { value: 3.2 }, intensity: { value: 2.2 }, lightDir: { value: LIGHT_DIR } }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
const earthHalo = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), sphereShader(S.HALO_FRAG, { color: { value: v3(0.3, 0.6, 1.0) }, power: { value: 6 }, intensity: { value: 0.75 } }, { side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
earthHalo.scale.setScalar(1.22); earth.add(earthBody, earthClouds, earthAtmo, earthHalo); earthBody.rotation.z = 0.41; earthClouds.rotation.z = 0.41; placeable(earth); scene.add(earth);

// ---------- Jupiter ----------
const jupU = { time: { value: 0 }, lightDir: { value: LIGHT_DIR }, c0: { value: lin(0.93, 0.86, 0.72) }, c1: { value: lin(0.72, 0.54, 0.37) }, c2: { value: lin(0.48, 0.31, 0.20) }, c3: { value: lin(0.98, 0.95, 0.90) }, c4: { value: lin(0.75, 0.33, 0.20) }, spot: { value: 1 } };
const jupiter = new THREE.Group(); const jupBody = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), sphereShader(S.GAS_GIANT_FRAG, jupU)); jupBody.rotation.z = 0.05; jupiter.add(jupBody);
const jupHalo = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), sphereShader(S.HALO_FRAG, { color: { value: v3(0.9, 0.75, 0.55) }, power: { value: 8 }, intensity: { value: 0.35 } }, { side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
jupHalo.scale.setScalar(1.12); jupiter.add(jupHalo); placeable(jupiter); scene.add(jupiter);

// ---------- Stars ----------
const sol = makeStar({ cellScale: 16, speed: 0.1, brightness: 2.1, limbPow: 0.5, lanes: 0.3, hot: lin(1.0, 0.98, 0.9), mid: lin(1.0, 0.74, 0.28), cool: lin(0.95, 0.45, 0.08), halo: lin(1.0, 0.65, 0.28), haloScale: 1.8, haloPow: 3.0, haloInt: 0.9 }); scene.add(sol);
const betel = makeStar({ cellScale: 2.6, speed: 0.035, brightness: 1.35, limbPow: 1.0, hot: lin(1.0, 0.78, 0.5), mid: lin(1.0, 0.40, 0.12), cool: lin(0.30, 0.05, 0.015), halo: lin(1.0, 0.36, 0.12), haloScale: 1.6, haloPow: 3.2, haloInt: 0.6 }); scene.add(betel);
const steph = makeStar({ cellScale: 1.9, speed: 0.03, brightness: 1.25, limbPow: 1.35, hot: lin(1.0, 0.66, 0.4), mid: lin(0.96, 0.34, 0.09), cool: lin(0.24, 0.04, 0.01), halo: lin(1.0, 0.3, 0.1), haloScale: 1.9, haloPow: 2.6, haloInt: 0.6 }); scene.add(steph);

// ---------- Black hole (half-res raymarch → full-screen quad) ----------
const bhTarget = new THREE.WebGLRenderTarget(Math.round(W / 2), Math.round(H / 2), { type: THREE.HalfFloatType, depthBuffer: false });
const bhU = { res: { value: new THREE.Vector2(W / 2, H / 2) }, time: { value: 0 }, camPos: { value: new THREE.Vector3(0, 4, 18) }, camRot: { value: new THREE.Matrix3() }, focal: { value: 1.5 },
  diskIn: { value: 2.2 }, diskOut: { value: 7.5 }, diskBright: { value: 0.55 }, starAmt: { value: 0.4 }, shift: { value: new THREE.Vector2(0, (960 - 840) / 1920) } };
const bhScene = new THREE.Scene(); const bhCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bhScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: S.BG_VERT, fragmentShader: S.BH_FRAG, uniforms: bhU, depthTest: false, depthWrite: false })));
const bhShow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: S.BG_VERT, depthTest: false, depthWrite: false, transparent: true,
  fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb*opacity, opacity); }`,
  uniforms: { map: { value: bhTarget.texture }, opacity: { value: 0 } } }));
bhShow.frustumCulled = false; bhShow.renderOrder = -5; bhShow.visible = false; scene.add(bhShow);
function setBhCamera(dist, elevDeg, yawDeg) {
  const el = elevDeg * Math.PI / 180, yaw = yawDeg * Math.PI / 180;
  const pos = new THREE.Vector3(Math.sin(yaw) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(yaw) * Math.cos(el) * dist);
  const fwd = pos.clone().negate().normalize(); const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(); const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  bhU.camPos.value.copy(pos); bhU.camRot.value.set(right.x, up.x, -fwd.x, right.y, up.y, -fwd.y, right.z, up.z, -fwd.z);
}

// ---------- post ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.4, 0.85); composer.addPass(bloom);
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, vignette: { value: 0.42 }, grain: { value: 0.028 }, fade: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`, fragmentShader: S.GRADE_FRAG });
composer.addPass(grade); composer.addPass(new OutputPass());

// ---------- HUD ----------
const hudCanvas = document.createElement('canvas'); hudCanvas.width = W; hudCanvas.height = H; const hud = new Hud(hudCanvas);
const hudTex = new THREE.CanvasTexture(hudCanvas); hudTex.colorSpace = THREE.SRGBColorSpace; hudTex.minFilter = THREE.LinearFilter; hudTex.generateMipmaps = false;
const hudScene = new THREE.Scene(); const hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
hudScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })));
await document.fonts.load('900 100px "Inter Display"'); await document.fonts.load('700 40px "JetBrains Mono"'); await document.fonts.load('800 40px "Inter Display"');

// ---------- choreography ----------
const OBJ = { earth, jupiter, sun: sol, betelgeuse: betel, stephenson: steph };
const HERO_Y = 860;
// layouts: screen-space (px) circles; ratios between objects are true size ratios
const LAY = {
  earth: { earth: [540, 880, 430] },
  jupiter: { jupiter: [640, 850, 470], earth: [150, 1070, 470 / 11.21] },
  sun: { sun: [540, 790, 600], jupiter: [185, 1160, 600 / 9.96], earth: [300, 1215, 600 / 9.96 / 11.21] },
  betelgeuse: { betelgeuse: [540, 720, 760], sun: [210, 1240, 760 / 764], jupiter: [0, 0, 0], earth: [0, 0, 0] },
  find: { betelgeuse: [540, 720, 760], sun: [210, 1240, 760 / 764] },
  stephenson: { stephenson: [620, 780, 640], betelgeuse: [175, 1185, 640 / 2.81], sun: [0, 0, 0] },
  onemore: { stephenson: [540, 820, 640], betelgeuse: [175, 1185, 640 / 2.81] },
  ton618: { stephenson: [330, 1180, 3.1], betelgeuse: [0, 0, 0] },
  nested: {}, cta: {},
};
const HERO = { earth: 'earth', jupiter: 'jupiter', sun: 'sun', betelgeuse: 'betelgeuse', stephenson: 'stephenson', ton618: null };
const INFO = {
  earth: ['EARTH', 'DIAMETER 12,742 KM', null], jupiter: ['JUPITER', 'DIAMETER 139,820 KM', '×11'], sun: ['THE SUN', 'DIAMETER 1,392,700 KM', '×10'],
  betelgeuse: ['BETELGEUSE', 'DIAMETER ≈1,060,000,000 KM', '×764'], find: ['BETELGEUSE', 'DIAMETER ≈1,060,000,000 KM', null],
  stephenson: ['STEPHENSON 2-18', 'DIAMETER ≈2,990,000,000 KM', '×2.8'], onemore: ['STEPHENSON 2-18', 'DIAMETER ≈2,990,000,000 KM', null],
  ton618: ['TON 618', 'DIAMETER ≈390,000,000,000 KM', '×130'], nested: ['TON 618', 'EVENT HORIZON ≈2,600 AU', null], cta: ['EARTH', 'DIAMETER 12,742 KM', null],
};
const TR_PRE = 0.22, TR_LEN = 0.85; // transition window around beat start
const transitions = beats.slice(1).filter((b) => !['find', 'nested', 'cta'].includes(b.id)).map((b) => ({ id: b.id, t0: b.t0 - TR_PRE }));
const ZOOM_STEP = { jupiter: 2.4, sun: 2.3, betelgeuse: 6.6, stephenson: 1.0, onemore: 0.0, ton618: 4.9 };

function beatAt(t) { let cur = beats[0]; for (const b of beats) if (t >= b.t0) cur = b; return cur; }
function prevBeat(b) { const i = beats.indexOf(b); return i > 0 ? beats[i - 1] : null; }
function lineAt(t, b) { let cur = null; for (const l of b.lines) if (t >= l.t0) cur = l; return cur; }
function layoutFor(id) { return LAY[id] || {}; }

function applyLayouts(t, b) {
  // interpolate between previous beat's layout and this beat's layout during the transition window
  const pb = prevBeat(b); const trStart = b.t0 - TR_PRE; let k = 1;
  const isTr = pb && !['find', 'nested', 'cta'].includes(b.id);
  if (isTr) k = ease.inOutCubic(clamp01((t - trStart) / TR_LEN));
  const from = pb ? layoutFor(pb.id) : {}, to = layoutFor(b.id);
  const hero = HERO[b.id];
  const names = new Set([...Object.keys(from), ...Object.keys(to)]);
  const out = {};
  for (const n of names) {
    let a = from[n], c = to[n];
    if (!c) c = a ? [a[0], a[1], 0] : null;
    if (!a) a = n === hero ? [c[0] + 240, c[1] - 160, c[2] * 3.4] : [c[0], c[1], 0];
    const rA = Math.max(a[2], 0.05), rC = Math.max(c[2], 0.05);
    const r = (a[2] <= 0 && k < 1) ? rC * ease.outCubic(k) : (c[2] <= 0 ? rA * (1 - k) : Math.exp(lerp(Math.log(rA), Math.log(rC), k)));
    out[n] = [lerp(a[0], c[0], k), lerp(a[1], c[1], k), r];
  }
  return { pos: out, k, trStart };
}

let flowAcc = 0; // dust flow integrator state computed analytically below
function dustFlow(t) { let f = 0.9 * t; for (const tr of transitions) f += 55 * ease.inOutCubic(clamp01((t - tr.t0) / TR_LEN)); if (t > B.onemore.t0) f += 90 * clamp01((t - B.onemore.t0) / (B.ton618.t0 - B.onemore.t0)); return f; }
function bgZoom(t) { let z = 0; for (const tr of transitions) z += (ZOOM_STEP[tr.id] || 0) * ease.inOutCubic(clamp01((t - tr.t0) / TR_LEN)); if (t > B.onemore.t0) z += 3.0 * clamp01((t - B.onemore.t0) / (B.ton618.t0 - B.onemore.t0)); return z; }
function shake(t) { let dx = 0, dy = 0; for (const tr of transitions) { const a = t - (tr.t0 + TR_LEN * 0.72); if (a >= 0 && a < 0.5) { const amp = 11 * (1 - a / 0.5) * (1 - a / 0.5); dx += amp * Math.sin(a * 95); dy += amp * Math.cos(a * 71); } } return [dx, dy]; }

function update(t, frame) {
  const b = beatAt(t); const u = clamp01((t - b.t0) / Math.max(0.01, b.t1 - b.t0)); const line = lineAt(t, b);
  for (const o of Object.values(OBJ)) o.visible = false;
  const { pos, k, trStart } = applyLayouts(t, b);
  // continuous zoom-out during "one more"
  let extra = 1; if (b.id === 'onemore') extra = Math.exp(-3.0 * ease.inOutCubic(u));
  for (const [n, p] of Object.entries(pos)) { let [x, y, r] = p; if (b.id === 'onemore') { x = lerp(x, 540, 1 - extra); y = lerp(y, 840, 1 - extra); r *= extra; } OBJ[n].setPx(x, y, r); }
  if (b.id === 'ton618' && k < 1) { /* stars shrink into dots handled by layout */ }
  // uniforms / rotations
  earthBody.rotation.y = 0.07 * t + 2.2; earthClouds.rotation.y = 0.085 * t + 2.2; jupBody.rotation.y = 0.045 * t;
  jupU.time.value = t; for (const s of [sol, betel, steph]) { s.userData.u.time.value = t; s.userData.body.rotation.y = 0.01 * t; }
  bgMat.uniforms.time.value = t; bgMat.uniforms.zoom.value = bgZoom(t);
  const flow = dustFlow(t); for (let i = 0; i < DUST_N; i++) { dustPos[i * 3] = dustBase[i * 3]; dustPos[i * 3 + 1] = dustBase[i * 3 + 1]; let z = dustBase[i * 3 + 2] + flow; z = -150 - (((-z - 150) % 600) + 600) % 600; dustPos[i * 3 + 2] = z; } dustGeo.attributes.position.needsUpdate = true;
  const [sx, sy] = shake(t); camera.position.set(sx * PX, -sy * PX, 0); camera.rotation.z = sx * 0.0003;

  // black hole
  const bhOn = (t >= B.ton618.t0 - TR_PRE) && (t < B.cta.t0 + 0.6);
  bhShow.visible = bhOn;
  let bhOp = 0;
  if (bhOn) {
    const inK = ease.outCubic(clamp01((t - (B.ton618.t0 - TR_PRE)) / 0.9));
    bhOp = inK; if (t >= B.nested.t0) bhOp = lerp(1, 0.28, ease.inOutCubic(clamp01((t - B.nested.t0) / 0.8))); if (t >= B.cta.t0) bhOp = 0.28 * (1 - clamp01((t - B.cta.t0) / 0.6));
    const tt = t - B.ton618.t0; setBhCamera(lerp(30, 22, ease.outCubic(clamp01((tt + TR_PRE) / 2.2))), 19 + 3 * clamp01(tt / 8), -4 + tt * 0.9);
    bhU.time.value = t;
    bhShow.material.uniforms.opacity.value = bhOp;
    bgMat.uniforms.dim.value = 1 - 0.85 * bhOp;
    renderer.setRenderTarget(bhTarget); renderer.render(bhScene, bhCam); renderer.setRenderTarget(null);
  } else bgMat.uniforms.dim.value = (b.id === 'onemore') ? 1 - 0.35 * ease.inOutCubic(u) : 1;

  // nested finale: 3D earth re-appears at the end of the zoom, then vanishes at countdown zero
  const tGone = CD ? CD.t_to : B.cta.t0;
  if (b.id === 'nested' || (b.id === 'cta')) {
    const n2 = L.n2; const zEnd = n2.t1 - 0.25, zStart = n2.t0 + 0.15;
    if (b.id === 'nested') {
      const kz = ease.inOutCubic(clamp01((t - zStart) / (zEnd - zStart)));
      const eR = 300 * clamp01((kz - 0.93) / 0.07);
      let r = eR; if (t > tGone - 0.45) r = 300 * Math.pow(1 - clamp01((t - (tGone - 0.45)) / 0.45), 2.2);
      earth.setPx(540, 900, r);
    } else {
      const g1 = clamp01((t - (B.cta.t0 + 0.25)) / (L.c2.t1 - B.cta.t0 - 0.25)); const g2 = clamp01((t - L.c2.t1) / (TL.duration - L.c2.t1));
      const r = g2 > 0 ? lerp(120, 430, ease.inOutCubic(g2)) : lerp(6, 120, ease.outCubic(g1));
      earth.setPx(540, lerp(900, 880, g2), r);
    }
  }

  grade.uniforms.seed.value = frame; grade.uniforms.fade.value = 1;
  composer.render();

  // ---------- HUD ----------
  hud.clear(); hud.brand(0.45);
  const info = INFO[b.id]; const jumpT = info && info[2] ? t - (trStart + TR_LEN * 0.55) : null;
  if (!(b.id === 'cta' && t > B.cta.t0 + 0.3)) hud.topHud(info[0], info[1], info[2], jumpT, b.id === 'nested' ? 0.8 : 1);
  if (CD && t >= CD.t_from && t < CD.t_to + 0.05) { const a = clamp01((t - CD.t_from) / 0.3); hud.countdown(CD.seconds_spoken * (CD.t_to - t) / (CD.t_to - CD.t_from), a); }

  // scene overlays
  if (b.id === 'sun' && line && line.id === 's3') { const p = pos.earth; hud.pointer(p[0], p[1], 'EARTH', p[0] + 150, p[1] + 60, clamp01((t - line.t0 - 0.2) / 0.3)); }
  if (b.id === 'betelgeuse' || b.id === 'find') {
    const sd = pos.sun; if (sd && t > trStart + TR_LEN * 0.9) hud.sunDot(sd[0], sd[1], 2.6, b.id === 'find' ? 0.95 : 1);
    if (b.id === 'betelgeuse' && line && line.id === 'b2') { const bp = pos.betelgeuse; const sc = bp[2] / 764; const a = clamp01((t - line.t0 - 0.1) / 0.3);
      hud.orbits(bp[0], bp[1], [{ r: 83 * sc, label: 'MERCURY', color: '#C8C8D0' }, { r: 155 * sc, label: 'VENUS', color: '#F0D29A' }, { r: 215 * sc, label: 'EARTH', color: '#5CC8FF' }, { r: 327 * sc, label: 'MARS', color: '#FF7A55' }], a, clamp01((t - line.t0 - 0.1) / 1.6));
      hud.sunDot(bp[0], bp[1], 5, a); }
    if (b.id === 'find') { const f1 = L.f1; const pingT = t - (f1.t1 + 1.05); hud.ping(sd[0], sd[1], pingT, 'THERE IT IS'); }
  }
  if (b.id === 'stephenson' && line && line.id === 'st4') { const sp = pos.stephenson; const lapT = clamp01((t - line.t0 - 0.3) / (B.stephenson.t1 - line.t0 - 0.5)); hud.lightLap(sp[0], sp[1], sp[2] + 10, ease.inOutCubic(lapT), 8.7 * ease.inOutCubic(lapT), clamp01((t - line.t0) / 0.3)); }
  if (b.id === 'ton618') {
    const sp = pos.stephenson; if (line && (line.id === 't1' || line.id === 't2') && t > B.ton618.t0 + 0.9) hud.pointer(sp[0], sp[1], 'STEPHENSON 2-18', sp[0] + 60, sp[1] + 120, clamp01((t - B.ton618.t0 - 0.9) / 0.3));
    if (line && (line.id === 't3' || line.id === 't4')) { const c = clamp01((t - L.t3.t0 - 0.2) / (L.t4.t1 - L.t3.t0 - 0.2)); hud.row40(540, 840, 400, 40, 40 * ease.inOutCubic(c), clamp01((t - L.t3.t0) / 0.3)); }
  }
  if (b.id === 'nested') {
    const n2 = L.n2; const zEnd = n2.t1 - 0.25, zStart = n2.t0 + 0.15; const kz = ease.inOutCubic(clamp01((t - zStart) / (zEnd - zStart)));
    const zoom = Math.exp(lerp(Math.log(400), Math.log(300 / 3.21e-8), kz));
    const objs = [{ name: 'TON 618', r: 1, color: '#5CC8FF' }, { name: 'STEPHENSON 2-18', r: 1 / 130, color: '#FF7A55' }, { name: 'BETELGEUSE', r: 1 / 130 / 2.81, color: '#FF5A3C' },
      { name: 'THE SUN', r: 1 / 130 / 2.81 / 764, color: '#FFB54A' }, { name: 'JUPITER', r: 1 / 130 / 2.81 / 764 / 9.96, color: '#E8C9A0' }, { name: 'EARTH', r: 3.21e-8, color: '#5CC8FF' }];
    const a = t < tGone - 0.45 ? 1 : 1 - clamp01((t - (tGone - 0.45)) / 0.45);
    if (kz < 0.97) hud.nested(540, 900, objs, zoom, a * clamp01((t - zStart + 0.3) / 0.3));
    hud.gone(t - tGone);
  }
  if (b.id === 'cta') { hud.gone(t - tGone); const cf = 1 - clamp01((t - (L.c2.t1 - 0.15)) / 0.3); if (cf > 0) hud.cta(t - L.c2.t0, cf); }

  // caption
  let cap = null, capT0 = 0, prog = 0;
  if (line) { cap = line.caption; capT0 = line.t0; prog = clamp01((t - line.t0) / Math.max(0.05, line.t1 - line.t0)); }
  if (b.id === 'find' && t > L.f1.t1 + 1.05) cap = null;
  if (b.id === 'nested' && t > tGone - 0.1) cap = null;
  if (b.id === 'cta' && t < L.c1.t0) cap = null;
  if (cap) hud.caption(cap, t - capT0, prog, { y: b.id === 'cta' ? 1450 : 1430 });
  hudTex.needsUpdate = true;
  renderer.autoClear = false; renderer.render(hudScene, hudCam); renderer.autoClear = true;
}

// ---------- frame API ----------
const gl = renderer.getContext(); const pixels = new Uint8Array(W * H * 4);
window.__frame = async (i, png) => {
  update(i / FPS, i);
  if (png) { const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')); await fetch(`/frame?i=${i}&png=1`, { method: 'POST', body: blob }); return true; }
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  await fetch(`/frame?i=${i}`, { method: 'POST', body: pixels, headers: { 'Content-Type': 'application/octet-stream' } });
  return true;
};
update(0, 0); // warm-up compile
window.__ready = true;
