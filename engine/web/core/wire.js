// Gold "hologram blueprint" building blocks on top of Three.js.
// Every builder returns a THREE.Group whose children are LineSegments / Mesh / Points.
// wire.reveal(group, p) draws lines on progressively (p 0..1) – the signature "constructing" look.
export class Wire {
  constructor(THREE, pal = {}) {
    this.THREE = THREE;
    this.gold = new THREE.Color(pal.gold || '#ffc24a');
    this.bright = new THREE.Color(pal.gold_bright || '#ffe3a0');
    this.dim = new THREE.Color(pal.gold_dim || '#8a6a2a');
    this.alert = new THREE.Color(pal.accent_alert || '#ff4d2e');
    this.cyan = new THREE.Color(pal.accent_cyan || '#5ad7ff');
    this.nodeTex = this._discTexture();
  }
  _discTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,246,220,1)'); g.addColorStop(0.35, 'rgba(255,215,120,0.9)'); g.addColorStop(0.6, 'rgba(255,194,74,0.25)'); g.addColorStop(1, 'rgba(255,194,74,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new this.THREE.CanvasTexture(c); return t;
  }
  lineMat(opts = {}) {
    const T = this.THREE;
    return new T.LineBasicMaterial({ color: opts.color || this.gold, transparent: true, opacity: opts.opacity ?? 0.95, depthWrite: false, blending: opts.additive === false ? T.NormalBlending : T.AdditiveBlending });
  }
  fillMat(opts = {}) {
    const T = this.THREE;
    return new T.MeshBasicMaterial({ color: opts.color || this.gold, transparent: true, opacity: opts.opacity ?? 0.055, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
  }
  // Edge-lines of a geometry (+ faint fill). threshold: angle in degrees for EdgesGeometry.
  edges(geometry, opts = {}) {
    const T = this.THREE; const g = new T.Group();
    const eg = new T.EdgesGeometry(geometry, opts.threshold ?? 12);
    const ls = new T.LineSegments(eg, this.lineMat(opts)); ls.name = 'lines'; g.add(ls);
    if (opts.fill !== false) { const m = new T.Mesh(geometry, this.fillMat({ color: opts.color, opacity: opts.fillOpacity })); m.name = 'fill'; g.add(m); }
    g.userData.total = eg.attributes.position.count;
    return g;
  }
  // Full triangle wireframe (denser "mesh" look, good for masonry / surfaces)
  mesh(geometry, opts = {}) {
    const T = this.THREE; const g = new T.Group();
    const wg = new T.WireframeGeometry(geometry);
    const ls = new T.LineSegments(wg, this.lineMat({ opacity: opts.opacity ?? 0.35, color: opts.color })); ls.name = 'lines'; g.add(ls);
    if (opts.fill) { const m = new T.Mesh(geometry, this.fillMat({ color: opts.color, opacity: opts.fillOpacity })); m.name = 'fill'; g.add(m); }
    g.userData.total = wg.attributes.position.count;
    return g;
  }
  polyline(points, opts = {}) {
    const T = this.THREE; const g = new T.Group();
    const geo = new T.BufferGeometry().setFromPoints(opts.closed ? [...points, points[0]] : points);
    const l = new T.Line(geo, this.lineMat(opts)); l.name = 'lines'; g.add(l);
    g.userData.total = geo.attributes.position.count; g.userData.isLine = true;
    return g;
  }
  segments(pairs, opts = {}) { // flat array of points, 2 per segment
    const T = this.THREE; const g = new T.Group();
    const geo = new T.BufferGeometry().setFromPoints(pairs);
    const l = new T.LineSegments(geo, this.lineMat(opts)); l.name = 'lines'; g.add(l);
    g.userData.total = geo.attributes.position.count; return g;
  }
  nodes(points, size = 0.25, opts = {}) {
    const T = this.THREE;
    const geo = new T.BufferGeometry().setFromPoints(points);
    const m = new T.PointsMaterial({ size, map: this.nodeTex, transparent: true, opacity: opts.opacity ?? 1, depthWrite: false, blending: T.AdditiveBlending, color: opts.color || this.bright, sizeAttenuation: true });
    const p = new T.Points(geo, m); p.name = 'nodes'; return p;
  }
  // circle outline in XY plane
  circle(r, seg = 64, opts = {}) {
    const T = this.THREE; const pts = [];
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    return this.polyline(pts, opts);
  }
  // 2D gear profile -> extruded geometry (teeth along XY, thickness along Z)
  gearGeometry(teeth, pitchRadius, thickness, opts = {}) {
    const T = this.THREE; const addendum = opts.addendum ?? pitchRadius * 2.0 / teeth; const dedendum = addendum * 1.15;
    const rTip = pitchRadius + addendum, rRoot = pitchRadius - dedendum;
    const shape = new T.Shape(); const n = teeth;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, da = Math.PI * 2 / n;
      const pts = [[rRoot, a0], [rRoot, a0 + da * 0.20], [rTip, a0 + da * 0.34], [rTip, a0 + da * 0.58], [rRoot, a0 + da * 0.72], [rRoot, a0 + da]];
      for (const [r, a] of pts) { const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0 && r === pts[0][0] && a === a0) shape.moveTo(x, y); else shape.lineTo(x, y); }
    }
    const hub = opts.hub ?? Math.max(0.15, pitchRadius * 0.12);
    const hole = new T.Path(); hole.absarc(0, 0, hub, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
    geo.translate(0, 0, -thickness / 2);
    return geo;
  }
  gear(teeth, pitchRadius, thickness = 0.3, opts = {}) {
    const T = this.THREE; const g = this.edges(this.gearGeometry(teeth, pitchRadius, thickness, opts), { threshold: 20, fillOpacity: 0.04, ...opts });
    // spokes
    const spokes = opts.spokes ?? (pitchRadius > 1.2 ? 6 : 0); const pairs = [];
    const rIn = (opts.hub ?? Math.max(0.15, pitchRadius * 0.12)) * 1.1, rOut = pitchRadius * 0.86;
    for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2; pairs.push(new T.Vector3(Math.cos(a) * rIn, Math.sin(a) * rIn, 0), new T.Vector3(Math.cos(a) * rOut, Math.sin(a) * rOut, 0)); }
    if (spokes) g.add(this.segments(pairs, { opacity: 0.8 }));
    const rim = this.circle(pitchRadius * 0.88, 72, { opacity: 0.6 }); g.add(rim);
    g.userData.teeth = teeth; g.userData.r = pitchRadius;
    return g;
  }
  // "draw-on" reveal: p in 0..1
  reveal(group, p) {
    p = Math.max(0, Math.min(1, p));
    group.traverse((o) => {
      if (o.isLineSegments || o.isLine) {
        const total = o.geometry.attributes.position.count;
        o.geometry.setDrawRange(0, Math.floor(total * p));
        o.visible = p > 0;
      } else if (o.isMesh && o.material && o.material.transparent) {
        if (o.userData.baseOpacity === undefined) o.userData.baseOpacity = o.material.opacity;
        o.material.opacity = o.userData.baseOpacity * p; o.visible = p > 0;
      } else if (o.isPoints) { o.visible = p >= 0.999; }
    });
  }
  setOpacity(group, k) {
    group.traverse((o) => { if (o.material) { if (o.userData.baseOpacity === undefined) o.userData.baseOpacity = o.material.opacity; o.material.opacity = o.userData.baseOpacity * k; } });
  }
  setColor(group, color) { group.traverse((o) => { if (o.material && o.material.color) o.material.color.set(color); }); }
  // Ground grid in 3D (fades with distance)
  ground(size = 40, div = 40) {
    const T = this.THREE; const gh = new T.GridHelper(size, div, this.dim, this.dim);
    gh.material.transparent = true; gh.material.opacity = 0.28; gh.material.depthWrite = false; gh.material.blending = T.AdditiveBlending;
    return gh;
  }
  box(w, h, d, opts = {}) { return this.edges(new this.THREE.BoxGeometry(w, h, d), { threshold: 1, ...opts }); }
  cyl(rt, rb, h, seg = 24, opts = {}) { return this.edges(new this.THREE.CylinderGeometry(rt, rb, h, seg, 1, opts.open ?? false), { threshold: opts.threshold ?? 30, ...opts }); }
  // stick figure (height h), facing +x; .walk(phase) animates legs/arms
  figure(h = 1.7, opts = {}) {
    const T = this.THREE; const g = new T.Group(); const u = h / 8;
    const head = this.circle(u * 0.55, 20, { opacity: 0.95, color: opts.color }); head.position.y = u * 7.3; g.add(head);
    const pts = { hipL: new T.Vector3(0, u * 3.6, 0), hipR: new T.Vector3(0, u * 3.6, 0), sh: new T.Vector3(0, u * 6.4, 0) };
    const body = this.segments([new T.Vector3(0, u * 6.7, 0), new T.Vector3(0, u * 3.6, 0)], { color: opts.color }); g.add(body);
    const limbs = new T.BufferGeometry().setFromPoints(new Array(8).fill(0).map(() => new T.Vector3()));
    const ls = new T.LineSegments(limbs, this.lineMat({ color: opts.color })); g.add(ls);
    g.userData.total = 999;
    g.walk = (phase, amp = 0.6) => {
      const a = Math.sin(phase) * amp, b = Math.sin(phase + Math.PI) * amp; const P = limbs.attributes.position;
      const set = (i, x, y, z) => P.setXYZ(i, x, y, z);
      set(0, 0, u * 3.6, 0); set(1, Math.sin(a) * u * 3.4, u * 3.6 - Math.cos(a) * u * 3.4, 0);
      set(2, 0, u * 3.6, 0); set(3, Math.sin(b) * u * 3.4, u * 3.6 - Math.cos(b) * u * 3.4, 0);
      set(4, 0, u * 6.4, 0); set(5, Math.sin(b * 0.8) * u * 2.6, u * 6.4 - Math.cos(b * 0.8) * u * 2.6, 0);
      set(6, 0, u * 6.4, 0); set(7, Math.sin(a * 0.8) * u * 2.6, u * 6.4 - Math.cos(a * 0.8) * u * 2.6, 0);
      P.needsUpdate = true;
    };
    g.walk(0); return g;
  }
  // dimension line between two 3D points (returns group + a label anchor for 2D annotation)
  dimension(a, b, offset, opts = {}) {
    const T = this.THREE; const g = new T.Group();
    const a2 = a.clone().add(offset), b2 = b.clone().add(offset);
    const tick = offset.clone().normalize().multiplyScalar(0.25);
    g.add(this.segments([a, a2.clone().add(tick), b, b2.clone().add(tick), a2, b2], { opacity: 0.7, color: opts.color }));
    g.userData.mid = a2.clone().lerp(b2, 0.5); return g;
  }
}
