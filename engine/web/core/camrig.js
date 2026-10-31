// Camera rig: shots keyed to cue names (or absolute times), eased transitions, optional slow drift/orbit per shot.
import * as E from './easing.js';
export class CamRig {
  constructor(camera, tl, THREE) { this.cam = camera; this.tl = tl; this.T = THREE; this.shots = []; }
  cueT(name) { if (typeof name === 'number') return name; const c = this.tl.cues.find((c) => c.name === name); return c ? c.t : 1e9; }
  // shot: {at, pos:[x,y,z], look:[x,y,z], dur=0.9, orbit=0 (rad/s around look), drift=[dx,dy,dz] per second, fov}
  add(...shots) { for (const s of shots) this.shots.push({ dur: 0.9, orbit: 0, drift: [0, 0, 0], ...s, t: this.cueT(s.at) }); this.shots.sort((a, b) => a.t - b.t); return this; }
  _eval(s, t) {
    const V = this.T.Vector3; const dt = Math.max(0, t - s.t);
    const look = new V(...s.look); let pos = new V(...s.pos).add(new V(...s.drift).multiplyScalar(dt));
    if (s.orbit) { const rel = pos.clone().sub(look); const a = s.orbit * dt; const x = rel.x * Math.cos(a) - rel.z * Math.sin(a), z = rel.x * Math.sin(a) + rel.z * Math.cos(a); rel.x = x; rel.z = z; pos = look.clone().add(rel); }
    return { pos, look, fov: s.fov || 38 };
  }
  apply(t) {
    const S = this.shots; if (!S.length) return; let i = 0; while (i + 1 < S.length && t >= S[i + 1].t) i++;
    let cur = this._eval(S[i], t);
    if (i > 0) { const p = E.easeInOutCubic(E.win(t, S[i].t, S[i].dur)); if (p < 1) { const prev = this._eval(S[i - 1], t); cur = { pos: prev.pos.lerp(cur.pos, p), look: prev.look.lerp(cur.look, p), fov: E.lerp(prev.fov, cur.fov, p) }; } }
    this.cam.position.copy(cur.pos); this.cam.lookAt(cur.look); if (this.cam.fov !== cur.fov) { this.cam.fov = cur.fov; this.cam.updateProjectionMatrix(); }
  }
}
