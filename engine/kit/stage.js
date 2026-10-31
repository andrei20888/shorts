// Shared 3D stage: isometric camera rig, studio lighting, metal env-map, blueprint floor, bloom.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const C = {
  navy: 0x071427, navy2: 0x0c2240, steel: 0x2b3a4f, silver: 0xcfd8e2,
  teal: 0x19e3c4, tealDeep: 0x0a8f86, hot: 0xff6a3d, ice: 0x7fe9ff, white: 0xf3f7fb,
};

export function materials() {
  return {
    silver: new THREE.MeshStandardMaterial({ color: C.silver, metalness: 1, roughness: 0.26 }),
    brushed: new THREE.MeshStandardMaterial({ color: 0xa9b6c4, metalness: 0.9, roughness: 0.42 }),
    steel: new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.75, roughness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111c2c, metalness: 0.5, roughness: 0.5 }),
    navy: new THREE.MeshStandardMaterial({ color: C.navy2, metalness: 0.2, roughness: 0.65 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b1626, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.85 }),
    teal: new THREE.MeshStandardMaterial({ color: C.teal, emissive: C.teal, emissiveIntensity: 4, roughness: 0.4 }),
    tealSoft: new THREE.MeshStandardMaterial({ color: C.tealDeep, emissive: C.teal, emissiveIntensity: 0.35, roughness: 0.5 }),
    hot: new THREE.MeshStandardMaterial({ color: C.hot, emissive: C.hot, emissiveIntensity: 4.5 }),
    ice: new THREE.MeshStandardMaterial({ color: C.ice, emissive: C.ice, emissiveIntensity: 3 }),
    white: new THREE.MeshStandardMaterial({ color: C.white, metalness: 0.1, roughness: 0.35 }),
    line: new THREE.LineBasicMaterial({ color: C.teal, transparent: true, opacity: 0.55 }),
  };
}

export function createStage({ width, height, canvas = document.getElementById('gl'), bloom = 0.55, floor = true }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.navy);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  // Lights: warm-neutral key with shadows, teal rim from behind, soft hemisphere fill.
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3, 14, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 60 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(C.teal, 1.0);
  rim.position.set(-8, 1.5, -10);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xdfe8f5, 0x0a1424, 0.45));

  // Isometric rig: orthographic camera orbiting a target. `size` = visible world height.
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const rig = { target: new THREE.Vector3(), size: 12, az: 45, el: 35.264, roll: 0, shakeX: 0, shakeY: 0 };
  function applyRig() {
    const az = THREE.MathUtils.degToRad(rig.az), el = THREE.MathUtils.degToRad(rig.el);
    const d = 60;
    camera.position.set(
      rig.target.x + d * Math.cos(el) * Math.sin(az),
      rig.target.y + d * Math.sin(el),
      rig.target.z + d * Math.cos(el) * Math.cos(az));
    camera.up.set(0, 1, 0);
    camera.lookAt(rig.target);
    camera.rotateZ(THREE.MathUtils.degToRad(rig.roll));
    const h = rig.size / 2, w = h * aspect;
    camera.left = -w + rig.shakeX; camera.right = w + rig.shakeX;
    camera.top = h + rig.shakeY; camera.bottom = -h + rig.shakeY;
    camera.updateProjectionMatrix();
    key.position.copy(rig.target).add(new THREE.Vector3(-3, 14, 9));
    key.target.position.copy(rig.target);
  }

  let grid = null;
  if (floor) { grid = blueprintFloor(); scene.add(grid); }

  const rt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), bloom, 0.4, 1.5);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const v = new THREE.Vector3();
  return {
    THREE, renderer, scene, camera, rig, grid, bloomPass, key, rim,
    render() { applyRig(); composer.render(); },
    // World position -> CSS pixel coordinates of the frame.
    project(p) { applyRig(); v.copy(p).project(camera); return { x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height }; },
  };
}

// Navy floor with fine + major teal grid lines that fade out radially (technical drawing feel).
export function blueprintFloor(size = 120) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(C.teal) }, uFade: { value: 26 }, uAlpha: { value: 1 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFade; uniform float uAlpha; varying vec3 vW;
      float gridLine(vec2 p, float s, float w){ vec2 g = abs(fract(p/s - .5) - .5) / fwidth(p/s); return 1. - min(min(g.x,g.y)/w, 1.); }
      void main(){ float fine = gridLine(vW.xz, 1., 1.0) * .10; float major = gridLine(vW.xz, 5., 1.4) * .26;
        float fade = 1. - smoothstep(uFade*.25, uFade, length(vW.xz));
        gl_FragColor = vec4(uColor, (fine + major) * fade * uAlpha); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.001;
  m.renderOrder = -1;
  return m;
}

// Soft shadow catcher so objects sit on the blueprint.
export function shadowFloor(size = 60, opacity = 0.35) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function shadowed(obj) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
