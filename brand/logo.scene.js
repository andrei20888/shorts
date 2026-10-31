// Profile picture (800x800, safe for YouTube's circle crop).
import * as THREE from 'three';
import { createStage, materials } from '../engine/kit/stage.js';
import { brandCube } from '../engine/kit/models.js';

export default async ({ width, height }) => {
  document.getElementById('root').style.cssText = `width:${width}px;height:${height}px`;
  const st = createStage({ width, height, floor: false, bloom: 0.5 });
  const M = materials();
  st.scene.background = radial(width, '#14365f', '#050c18');
  const cube = brandCube(M, { gap: 0.36 });
  cube.position.y = -1.05;
  st.scene.add(cube);
  st.rig.size = 4.6;
  st.rig.target.set(0, 0.05, 0);
  return { update() { st.render(); } };
};

export function radial(size, inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'), gr = g.createRadialGradient(512, 470, 40, 512, 512, 600);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
