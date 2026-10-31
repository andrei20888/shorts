// Channel banner 2560x1440. Everything essential sits in the 1546x423 mobile-safe box;
// 3D objects fill the desktop strip (2560x423) and the TV area around it.
import * as THREE from 'three';
import { createStage, materials, shadowFloor } from '../engine/kit/stage.js';
import { brandCube, microchip, serverRack, rocket, gear } from '../engine/kit/models.js';

export default async ({ width, height }) => {
  document.getElementById('root').style.cssText = `width:${width}px;height:${height}px`;
  const st = createStage({ width, height, bloom: 0.55 });
  const M = materials();
  st.rig.size = 14;                       // 1440px -> 14 world units (~103 px/unit)
  st.grid.material.uniforms.uFade.value = 34;
  st.grid.material.uniforms.uAlpha.value = 0.5;
  const S = new THREE.Vector3(1, 0, -1).normalize();   // screen-right direction in iso view
  const U = new THREE.Vector3(-1, 0, -1).normalize();  // screen-up (on the floor plane)
  const put = (o, sx, sy, y = 0) => { o.position.copy(S.clone().multiplyScalar(sx)).add(U.clone().multiplyScalar(sy * 1.22)); o.position.y = y; st.scene.add(o); return o; };
  st.scene.add(shadowFloor(80, 0.4));

  const cube = put(brandCube(M), -6.05, -1.0, 0); cube.scale.setScalar(1.0);
  const chip = put(microchip(M), -10.0, -1.2, 0); chip.userData.setExplode(0.55); chip.scale.setScalar(0.85);
  chip.userData.blocks.forEach((b, i) => { b.material.emissiveIntensity = i % 2 ? 3 : 1.2; });
  const rack = put(serverRack(M), 10.0, -2.3, 0); rack.scale.setScalar(0.6);
  rack.userData.leds.forEach((l, i) => { l.material.emissiveIntensity = (i * 7) % 5 > 1 ? 4 : 0.3; });
  const r = put(rocket(M), 7.6, 3.9, 0); r.scale.setScalar(0.62);
  r.children[1].material = M.tealSoft;
  const g1 = put(gear(M, 14, 1.1), -9.2, -4.8, 0.2), g2 = put(gear(M, 10, 0.75, M.steel), -7.55, -4.25, 0.2);
  g2.rotation.z = 0.3;
  const g3 = put(gear(M, 12, 0.9, M.steel), 11.4, -5.2, 0.2);

  // wordmark + tagline (HTML), aligned right of the cube inside the safe box
  const ui = document.getElementById('ui');
  ui.innerHTML = `<div class="vignette"></div>
  <div style="position:absolute;left:${width / 2 - 430}px;top:${height / 2 - 128}px;width:1220px">
    <div style="font:500 28px JBM,monospace;letter-spacing:.42em;color:#19e3c4;margin-bottom:10px">3D VISUAL BREAKDOWNS</div>
    <div style="font:900 110px/1 Inter;white-space:nowrap;letter-spacing:-.025em;text-transform:uppercase">
      <span class="headline" style="padding:0">Tech</span> <span class="headline" style="padding:0"><em>Breakdown</em></span></div>
    <div style="font:600 37px/1.3 Inter;color:#c7d3df;margin-top:16px">How machines, microchips, rockets &amp; servers <b style="color:#fff">actually work.</b></div>
    <div style="margin-top:14px;font:700 24px JBM,monospace;letter-spacing:.18em;color:#7f97ad">@TECHBREAKDOWN3D</div>
  </div>
`;
  return { update() { st.render(); } };
};
