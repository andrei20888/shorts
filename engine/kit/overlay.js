// DOM overlay layer: kinetic captions, slam headlines, schematic callouts, counters, prompts, flashes.
import { clamp, prog, ease, lerp } from './anim.js';

export const MARK_SVG = `<svg viewBox="0 0 100 100"><g stroke-linejoin="round">
<path d="M50 14 84 33 50 52 16 33Z" fill="#e8eef4"/><path d="M16 39 50 58v8L16 47Z" fill="#9fb0c2"/><path d="M84 39 50 58v8l34-19Z" fill="#5d6f86"/>
<path d="M16 55 50 74v12L16 67Z" fill="#9fb0c2"/><path d="M84 55 50 74v12l34-19Z" fill="#5d6f86"/>
<path d="M30 33 50 22l20 11-20 11Z" fill="none" stroke="#19e3c4" stroke-width="3.2"/><circle cx="50" cy="33" r="4" fill="#19e3c4"/></g></svg>`;

export function createOverlay({ width, height, timeline, brand = true }) {
  const ui = document.getElementById('ui');
  const root = document.getElementById('root');
  root.style.width = width + 'px'; root.style.height = height + 'px';
  ui.innerHTML = '';
  const add = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; ui.appendChild(d); return d; };

  add('vignette');
  const grain = add('grain'); grain.style.backgroundImage = `url(${noiseTile()})`;
  if (brand) add('bug', MARK_SVG + 'TECH BREAKDOWN');

  const items = [];
  const reg = (t0, t1, el, draw) => { items.push({ t0, t1, el, draw }); return el; };
  const flashEl = add('flash');
  const flashes = [];

  // Captions from word timings: chunks of <=3 words / ~16 chars, active word lit in teal.
  const capEl = add('item cap'); capEl.style.top = Math.round(height * 0.6) + 'px';
  const chunks = [];
  for (const b of timeline?.beats || []) {
    if (b.noCaption) continue;
    let cur = [];
    const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
    for (const w of b.words) {
      const len = cur.reduce((s, x) => s + x.w.length + 1, 0) + w.w.length;
      if (cur.length >= 3 || (cur.length && len > 16)) flush();
      cur.push(w);
      if (/[.,!?;:—]$/.test(w.w)) flush();
    }
    flush();
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    c.start = c[0].start;
    c.end = i + 1 < chunks.length ? Math.min(chunks[i + 1][0].start, c[c.length - 1].end + 0.6) : c[c.length - 1].end + 0.6;
  }
  const hiddenCaps = [];

  const api = {
    hideCaptions(t0, t1) { hiddenCaps.push([t0, t1]); },
    headline(t0, t1, html, { y = 0.17, size = 120, shakeIn = true } = {}) {
      const el = add('item headline', html);
      el.style.top = Math.round(height * y) + 'px'; el.style.fontSize = size + 'px';
      return reg(t0, t1, el, (t) => {
        const a = prog(t, t0, t0 + 0.22), z = prog(t, t1 - 0.2, t1);
        const s = lerp(1.7, 1, ease.outExpo(a)) * lerp(1, 0.9, z);
        const jx = shakeIn ? Math.sin(t * 70) * 10 * (1 - prog(t, t0 + 0.2, t0 + 0.5)) * (a >= 1 ? 1 : 0) : 0;
        el.style.opacity = a * (1 - z);
        el.style.transform = `translateX(${jx}px) scale(${s})`;
        el.style.filter = `blur(${(1 - a) * 14}px)`;
      });
    },
    // anchor: () => {x,y} in px (use stage.project). dx/dy: label offset from anchor.
    callout(t0, t1, anchor, text, { dx = 180, dy = -140, sub = '' } = {}) {
      const el = add('item callout');
      el.style.top = 0; el.style.height = '100%';
      el.innerHTML = `<svg width="${width}" height="${height}"><line stroke="#19e3c4" stroke-width="3"/><circle r="9" fill="#19e3c4"/><circle r="18" fill="none" stroke="#19e3c4" stroke-width="2"/></svg><div class="box">${text}${sub ? `<small>${sub}</small>` : ''}</div>`;
      const [line, dot, ring] = el.querySelectorAll('line,circle');
      const box = el.querySelector('.box');
      return reg(t0, t1, el, (t) => {
        const p = anchor(), a = prog(t, t0, t0 + 0.35), z = prog(t, t1 - 0.2, t1);
        const k = ease.out(a), ex = p.x + dx * k, ey = p.y + dy * k;
        for (const [c, r] of [[dot, 9], [ring, 18 + 10 * ((t * 1.5) % 1)]]) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', r * ease.outBack(a)); }
        ring.setAttribute('opacity', 1 - ((t * 1.5) % 1));
        line.setAttribute('x1', p.x); line.setAttribute('y1', p.y); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
        const bw = box.offsetWidth, bh = box.offsetHeight;
        box.style.left = (dx >= 0 ? ex : ex - bw) + 'px'; box.style.top = (ey - bh / 2) + 'px';
        box.style.opacity = prog(t, t0 + 0.2, t0 + 0.4);
        el.style.opacity = 1 - z;
      });
    },
    counter(t0, t1, from, to, { y = 0.2, size = 120, label = '', dur = 1.2, fmt = n => Math.round(n).toLocaleString('en-US'), suffix = '' } = {}) {
      const el = add('item counter'); el.style.top = Math.round(height * y) + 'px'; el.style.fontSize = size + 'px';
      return reg(t0, t1, el, (t) => {
        const k = ease.outExpo(prog(t, t0, t0 + dur));
        el.innerHTML = fmt(lerp(from, to, k)) + suffix + (label ? `<small>${label}</small>` : '');
        el.style.opacity = prog(t, t0, t0 + 0.12) * (1 - prog(t, t1 - 0.2, t1));
        el.style.transform = `scale(${1 + 0.08 * Math.sin(Math.PI * prog(t, t0 + dur - 0.1, t0 + dur + 0.25))})`;
      });
    },
    pill(t0, t1, html, { y = 0.76 } = {}) {
      const el = add('item', `<span class="pill">${html}</span>`); el.style.top = Math.round(height * y) + 'px';
      const p = el.firstChild;
      return reg(t0, t1, el, (t) => {
        const a = prog(t, t0, t0 + 0.35), z = prog(t, t1 - 0.2, t1);
        p.style.transform = `scale(${ease.outBack(a) * (1 + 0.04 * Math.sin((t - t0) * 9)) * (1 - z)})`;
        el.style.opacity = 1 - z;
      });
    },
    tag(t0, t1, html, { y = 0.115 } = {}) {
      const el = add('item tag', html); el.style.top = Math.round(height * y) + 'px';
      return reg(t0, t1, el, (t) => {
        const a = prog(t, t0, t0 + 0.25);
        el.style.opacity = a * (1 - prog(t, t1 - 0.2, t1));
        el.style.letterSpacing = lerp(0.6, 0.2, ease.out(a)) + 'em';
      });
    },
    flash(t0, dur = 0.35, color = '#e9fffb', peak = 0.9) { flashes.push({ t0, dur, color, peak }); },
    update(t) {
      for (const it of items) {
        const on = t >= it.t0 && t < it.t1;
        it.el.style.display = on ? 'block' : 'none';
        if (on) it.draw(t);
      }
      // captions
      const hidden = hiddenCaps.some(([a, b]) => t >= a && t < b);
      const c = hidden ? null : chunks.find(c => t >= c.start && t < c.end);
      if (c) {
        capEl.style.display = 'block';
        capEl.innerHTML = c.map(w => `<span class="${t >= w.start ? 'on' : ''}">${w.w.replace(/[,;:]$/, '')}</span>`).join('');
        const pop = ease.outBack(prog(t, c.start, c.start + 0.12));
        capEl.style.transform = `scale(${lerp(0.82, 1, pop)})`;
      } else capEl.style.display = 'none';
      // flashes
      let op = 0, col = '#fff';
      for (const f of flashes) { const k = (t - f.t0) / f.dur; if (k >= 0 && k <= 1) { const v = f.peak * (1 - k) ** 2; if (v > op) { op = v; col = f.color; } } }
      flashEl.style.opacity = op; flashEl.style.background = col;
      grain.style.transform = `translate(${(Math.floor(t * 24) * 37) % 200 - 100}px, ${(Math.floor(t * 24) * 53) % 200 - 100}px)`;
    },
  };
  return api;
}

function noiseTile() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = s % 256; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return c.toDataURL();
}
