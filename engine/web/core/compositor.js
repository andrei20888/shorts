// Deterministic frame compositor: background → WebGL (gold wireframe) + bloom → annotations → HUD → captions.
import * as THREE from '../three.module.js';
import * as E from './easing.js';
import { makeBackground } from './bg.js';
import { Wire } from './wire.js';
import { Captions } from './captions.js';
import { HUD } from './hud.js';

export class Compositor {
  constructor(W = 1080, H = 1920) {
    this.W = W; this.H = H;
    this.out = document.createElement('canvas'); this.out.width = W; this.out.height = H; this.ctx = this.out.getContext('2d', { willReadFrequently: true });
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W, H, false); this.renderer.setClearColor(0x000000, 0);
    this.bloom = document.createElement('canvas'); this.bloom.width = W / 3; this.bloom.height = H / 3; this.bctx = this.bloom.getContext('2d', { willReadFrequently: true });
    this.bloom2 = document.createElement('canvas'); this.bloom2.width = W / 3; this.bloom2.height = H / 3; this.b2ctx = this.bloom2.getContext('2d', { willReadFrequently: true });
    document.body.appendChild(this.out);
  }
  async load(tl, pal) {
    this.tl = tl; this.pal = pal; this.bg = makeBackground(this.W, this.H, pal);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, this.W / this.H, 0.1, 500);
    this.wire = new Wire(THREE, pal);
    this.captions = new Captions(this.ctx, this.W, this.H, pal);
    this.hud = new HUD(this.ctx, this.W, this.H, pal);
    const mod = await import(`../scenes/${tl.scene}.js`);
    this.renderer.localClippingEnabled = true;
    this.impl = mod.create({ THREE, wire: this.wire, scene: this.scene, camera: this.camera, renderer: this.renderer, tl, E, W: this.W, H: this.H });
    this.events = tl.events || [];
  }
  cue(name, t) { const c = this.tl.cues.find((c) => c.name === name); return c ? t - c.t : -1e9; }
  project(v) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H, z: p.z }; }
  renderAt(t) {
    const tl = this.tl, ctx = this.ctx, W = this.W, H = this.H;
    const beat = tl.beats.find((b) => t >= b.start && t < b.end) || null;
    const fx = { punch: 0, flash: 0, shake: 0 };
    for (const ev of this.events) {
      if (ev.kind === 'impact') { fx.punch += 0.06 * E.decay(t, ev.t, 0.22); fx.flash += 0.55 * E.decay(t, ev.t, 0.09); fx.shake += 9 * E.decay(t, ev.t, 0.25); }
      if (ev.kind === 'hit') { fx.punch += 0.035 * E.decay(t, ev.t, 0.16); fx.flash += 0.22 * E.decay(t, ev.t, 0.07); fx.shake += 4 * E.decay(t, ev.t, 0.18); }
      if (ev.kind === 'chime') { fx.flash += 0.18 * E.decay(t, ev.t, 0.3); }
    }
    const api = { t, beat, cue: (n) => this.cue(n, t), project: (v) => this.project(v), E, fx, W, H, wire: this.wire, THREE };
    const P = window.__prof ? (window.__profT = window.__profT || {}) : null; const now = () => performance.now(); let t0 = now();
    const r = this.impl.update(api) || {};
    this.renderer.render(this.scene, this.camera);
    if (P) { P.gl = (P.gl || 0) + now() - t0; t0 = now(); }
    // --- compose
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    // background with slow drift + shake
    const sx = (E.hash(Math.floor(t * 60)) - 0.5) * fx.shake, sy = (E.hash(Math.floor(t * 60) + 7) - 0.5) * fx.shake;
    const drift = 1.02 + 0.01 * Math.sin(t * 0.21);
    ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(drift + fx.punch, drift + fx.punch); ctx.drawImage(this.bg, -W / 2, -H / 2); ctx.restore();
    // bloom (downscaled blur, additive)
    const gl = this.renderer.domElement; const bc = this.bctx, b2 = this.b2ctx; const bw = this.bloom.width, bh = this.bloom.height;
    bc.clearRect(0, 0, bw, bh); bc.drawImage(gl, 0, 0, bw, bh);
    b2.clearRect(0, 0, bw, bh); b2.globalCompositeOperation = 'source-over'; b2.globalAlpha = 1;
    b2.filter = 'blur(5px) brightness(1.5)'; b2.drawImage(this.bloom, 0, 0);
    b2.globalCompositeOperation = 'lighter'; b2.filter = 'blur(1.5px)'; b2.globalAlpha = 0.7; b2.drawImage(this.bloom, 0, 0); b2.filter = 'none';
    ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(1 + fx.punch, 1 + fx.punch);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * (r.bloom ?? 1); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.bloom2, -W / 2, -H / 2, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(gl, -W / 2, -H / 2);
    ctx.restore();
    if (P) { P.bloom = (P.bloom || 0) + now() - t0; t0 = now(); }
    // 2D layers
    this.hud.annotations(r.annotations, t);
    if (r.scans) for (const s of r.scans) this.hud.scan(t, s.t0, s.dur, s.y0, s.y1, s.label);
    this.hud.brackets(t, 1 + fx.punch * 3);
    this.hud.figLabel(tl, t);
    this.hud.readouts(r.readouts, t);
    this.hud.progress(t, tl.duration);
    if (tl.prompts) for (const p of tl.prompts) this.hud.prompt(p.text, t, p.t, p.dur);
    const ctaOn = tl.cta && t >= tl.cta.t;
    this.captions.draw(tl, t, { hidden: r.hideCaptions || ctaOn });
    this.hud.hookCard(tl.hook, t);
    if (ctaOn) { ctx.save(); ctx.globalAlpha = 0.45 * E.win(t, tl.cta.t, 0.4); ctx.fillStyle = '#0a0703'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    this.hud.ctaCard(tl.cta, t, tl.duration);
    this.hud.flash(fx.flash + (r.flash || 0));
    ctx.restore();
    if (P) { P.hud = (P.hud || 0) + now() - t0; t0 = now(); }
    const url = this.out.toDataURL('image/jpeg', 0.93);
    if (P) { P.jpeg = (P.jpeg || 0) + now() - t0; P.n = (P.n || 0) + 1; }
    return url;
  }
}
