// DOM overlay helpers for Shorts: pop animations and word-synced captions.
import { clamp, ease, lerp } from './core.js';

export const setShow = (el, on) => el.classList.toggle('hide', !on);
export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');

// Scale/opacity pop driven by absolute time (deterministic per frame).
export function popIn(el, t, t0, dur = 0.24) {
  const k = clamp((t - t0) / dur);
  el.style.setProperty('--s', lerp(0.6, 1, ease.outBack(k, 2.4)));
  el.style.opacity = clamp((t - t0) / 0.07);
}

// Splits each line into 1-3 word chunks; highlights the word being spoken.
export class Captions {
  constructor(root, lines, { maxWords = 3 } = {}) {
    this.root = root;
    this.chunks = [];
    for (const ln of lines) {
      let cur = [];
      ln.words.forEach((w, i) => {
        cur.push(w);
        const brk = /[.,?!…]$/.test(w.w) || cur.length >= maxWords;
        if (brk || i === ln.words.length - 1) { this.chunks.push(cur); cur = []; }
      });
    }
    this.chunks.forEach((c, i) => {
      const next = this.chunks[i + 1];
      c.start = c[0].start;
      c.end = next && next.start - c[c.length - 1].end < 0.6 ? next.start : c[c.length - 1].end + 0.25;
    });
    this.current = null;
  }
  update(t) {
    const c = this.chunks.find((c) => t >= c.start && t < c.end);
    if (c !== this.current) {
      this.current = c;
      this.root.innerHTML = c ? `<div class="chunk">${c.map((w) => `<span class="w">${w.w.replace(/[.,]$/, '')}</span>`).join('')}</div>` : '';
    }
    if (!c) return;
    const el = this.root.firstChild;
    popIn(el, t, c.start, 0.16);
    const spans = el.children;
    let active = 0;
    c.forEach((w, i) => { if (t >= w.start - 0.03) active = i; });
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i === active);
  }
}
