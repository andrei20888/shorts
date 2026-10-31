// Kinetic captions: word-by-word pop, keyword highlight, big "number" style, 2-line wrap.
import { clamp, easeOutBack, win } from './easing.js';

export class Captions {
  constructor(ctx, W, H, pal) { this.ctx = ctx; this.W = W; this.H = H; this.pal = pal; this.y = H * 0.70; }
  // beat: {start,end,words:[{w,s,e,key}],chunks:[{s,e,wi:[...]}],style}
  draw(tl, t, opts = {}) {
    const ctx = this.ctx; const beat = tl.beats.find((b) => t >= b.start - 0.05 && t < b.end + 0.45);
    if (!beat || opts.hidden) return;
    if (beat.style === 'number') return this.drawNumber(beat, t);
    // active chunk: the last chunk whose start <= t (held until next chunk)
    const chunks = beat.chunks || []; let ci = -1;
    for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].s - 0.03) ci = i;
    if (ci < 0) return; const ch = chunks[ci];
    const isLast = ci === chunks.length - 1; const holdEnd = isLast ? beat.end + 0.45 : chunks[ci + 1].s;
    if (t > holdEnd) return;
    const fadeOut = isLast ? 1 - win(t, beat.end + 0.25, 0.2) : 1;
    const words = ch.wi.map((i) => beat.words[i]);
    const size = beat.size || 74; const font = `900 ${size}px Inter, sans-serif`;
    ctx.save(); ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const space = size * 0.32; const maxW = this.W - 150;
    // layout lines
    const lines = [[]]; let lw = 0;
    for (const w of words) {
      const wd = ctx.measureText(w.w.toUpperCase()).width * (w.key ? 1.1 : 1);
      if (lw + wd + (lines[lines.length - 1].length ? space : 0) > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push({ ...w, wd }); lw += wd + space;
    }
    const lh = size * 1.18; const y0 = (beat.y || this.y) - ((lines.length - 1) * lh) / 2;
    ctx.globalAlpha = fadeOut;
    lines.forEach((line, li) => {
      const total = line.reduce((s, w) => s + w.wd, 0) + space * (line.length - 1);
      let x = this.W / 2 - total / 2; const y = y0 + li * lh;
      for (const w of line) {
        const p = win(t, w.s - 0.02, 0.16); const sc = 0.6 + 0.4 * easeOutBack(p); const al = clamp(p * 1.6);
        const cx = x + w.wd / 2;
        ctx.save(); ctx.translate(cx, y); ctx.scale(sc * (w.key ? 1.1 : 1), sc * (w.key ? 1.1 : 1)); ctx.globalAlpha = fadeOut * al;
        const text = w.w.toUpperCase();
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = 'rgba(8,5,2,0.9)'; ctx.textAlign = 'center';
        ctx.strokeText(text, 0, 0);
        if (w.key) { ctx.shadowColor = 'rgba(255,194,74,0.85)'; ctx.shadowBlur = 28; ctx.fillStyle = this.pal.gold; }
        else { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.fillStyle = this.pal.text; }
        ctx.fillText(text, 0, 0);
        if (w.key) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,246,220,0.55)'; ctx.fillText(text, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
        ctx.restore(); x += w.wd + space;
      }
    });
    ctx.restore();
  }
  drawNumber(beat, t) {
    const ctx = this.ctx; const p = win(t, beat.start, 0.35); const sc = 1.6 - 0.6 * easeOutBack(p);
    const fade = 1 - win(t, beat.end + 0.2, 0.25); if (fade <= 0) return;
    let text = beat.text; if (beat.count_to !== undefined) { const k = clamp((t - beat.start) / Math.max(0.3, (beat.end - beat.start) * 0.7)); const v = Math.round((beat.count_from || 0) + (beat.count_to - (beat.count_from || 0)) * (1 - Math.pow(1 - k, 3))); text = v.toLocaleString('en-US') + (beat.unit ? ' ' + beat.unit : ''); }
    const size = beat.size || 150;
    ctx.save(); ctx.translate(this.W / 2, beat.y || this.H * 0.62); ctx.scale(sc, sc); ctx.globalAlpha = fade * clamp(p * 2);
    ctx.font = `900 ${size}px Cinzel, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.1; ctx.strokeStyle = 'rgba(8,5,2,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(text, 0, 0);
    ctx.shadowColor = 'rgba(255,194,74,0.9)'; ctx.shadowBlur = 50; ctx.fillStyle = this.pal.gold; ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,246,220,0.6)'; ctx.fillText(text, 0, 0);
    if (beat.sub) { ctx.font = `700 ${Math.round(size * 0.26)}px Inter, sans-serif`; ctx.fillStyle = this.pal.text; ctx.lineWidth = 8; ctx.strokeText(beat.sub.toUpperCase(), 0, size * 0.78); ctx.fillText(beat.sub.toUpperCase(), 0, size * 0.78); }
    ctx.restore();
  }
}
