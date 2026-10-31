// HUD: corner brackets, figure labels, readouts, progress bar, scan sweep, hook card, CTA card, annotations, flash.
import { clamp, win, easeOutBack, easeOutCubic, easeOutExpo, decay, hash } from './easing.js';

export class HUD {
  constructor(ctx, W, H, pal) { this.ctx = ctx; this.W = W; this.H = H; this.pal = pal; }
  brackets(t, k = 1) {
    const ctx = this.ctx, W = this.W, H = this.H; const m = 54, L = 70 * k;
    ctx.save(); ctx.strokeStyle = this.pal.gold; ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.lineCap = 'square';
    ctx.shadowColor = 'rgba(255,194,74,0.6)'; ctx.shadowBlur = 12;
    const c = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
    ctx.beginPath();
    for (const [x, y, sx, sy] of c) { ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); }
    ctx.stroke(); ctx.restore();
  }
  mono(text, x, y, size = 26, color = null, align = 'left', alpha = 1) {
    const ctx = this.ctx; ctx.save(); ctx.font = `500 ${size}px "JetBrains Mono", monospace`; ctx.fillStyle = color || this.pal.text_muted; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.globalAlpha = alpha; ctx.fillText(text, x, y); ctx.restore();
  }
  // top-left figure label with typewriter when it changes
  figLabel(tl, t) {
    const beat = [...tl.beats].reverse().find((b) => b.hud && t >= b.start) || tl.beats.find((b) => b.hud);
    if (!beat) return; const h = beat.hud; const since = t - beat.start; const chars = Math.floor(clamp(since / 0.6) * 60);
    const x = 70, y = 150;
    this.ctx.save(); this.ctx.font = `700 30px Cinzel, serif`; this.ctx.fillStyle = this.pal.gold; this.ctx.textBaseline = 'middle'; this.ctx.shadowColor = 'rgba(255,194,74,0.5)'; this.ctx.shadowBlur = 10;
    this.ctx.fillText('ANCIENT TECH', x, y); this.ctx.restore();
    const line = `${h.fig || ''}  ${h.label || ''}`.slice(0, chars) + (since < 0.7 && Math.floor(t * 8) % 2 ? '▮' : '');
    this.mono(line, x, y + 42, 24, this.pal.text_muted);
    if (h.scale) this.mono(`SCALE ${h.scale}`, x, y + 76, 20, 'rgba(185,166,129,0.7)');
  }
  readouts(items, t) {
    if (!items || !items.length) return; const x = this.W - 70, y0 = 150;
    items.forEach((it, i) => {
      const y = y0 + i * 72; const blink = it.blink && Math.floor(t * 3) % 2 === 0;
      this.mono(it.label.toUpperCase(), x, y - 16, 18, 'rgba(185,166,129,0.75)', 'right');
      this.mono(String(it.value), x, y + 16, 30, blink ? this.pal.accent_alert : (it.color || this.pal.gold), 'right');
    });
  }
  progress(t, dur) {
    const ctx = this.ctx; const y = this.H - 120, x0 = 90, x1 = this.W - 90; const p = clamp(t / dur);
    ctx.save(); ctx.strokeStyle = 'rgba(214,160,70,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = this.pal.gold; ctx.shadowColor = this.pal.gold; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * p, y); ctx.stroke();
    ctx.fillStyle = this.pal.gold_core; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * p, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // horizontal scan line sweeping the subject region after cue time t0
  scan(t, t0, dur = 1.2, y0 = 300, y1 = 1150, label = 'SCANNING') {
    const p = win(t, t0, dur); if (p <= 0 || p >= 1) return; const ctx = this.ctx; const y = y0 + (y1 - y0) * easeOutCubic(p);
    ctx.save(); ctx.globalAlpha = 0.9 * (1 - Math.pow(p, 6));
    const g = ctx.createLinearGradient(0, y - 120, 0, y); g.addColorStop(0, 'rgba(255,194,74,0)'); g.addColorStop(1, 'rgba(255,194,74,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 120, this.W, 120);
    ctx.strokeStyle = this.pal.gold_bright; ctx.lineWidth = 2; ctx.shadowColor = this.pal.gold; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    this.mono(`${label} ${Math.floor(p * 100)}%`, this.W - 90, y - 22, 20, this.pal.gold_bright, 'right');
    ctx.restore();
  }
  // Opening hook card v2: on screen from frame 0, auto-fits width, leaves on a hard cut at hook.end
  hookCard(hook, t) {
    if (!hook) return; const end = hook.end ?? 1.9; if (t > end) return;
    const ctx = this.ctx, W = this.W; const y = hook.y || this.H * 0.47; const maxW = 880;
    const inP = easeOutExpo(win(t, hook.start || 0, 0.3)); const sc = 1.1 - 0.1 * inP;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    let size = hook.size || 150; ctx.font = `900 ${size}px Cinzel, serif`; const tw = ctx.measureText(hook.title).width;
    if (tw > maxW) { size = Math.floor(size * maxW / tw); ctx.font = `900 ${size}px Cinzel, serif`; }
    ctx.lineWidth = size * 0.12; ctx.strokeStyle = 'rgba(8,5,2,0.92)'; ctx.strokeText(hook.title, 0, 0);
    ctx.shadowColor = 'rgba(255,194,74,0.95)'; ctx.shadowBlur = 40 * (1 - inP) + 24; ctx.fillStyle = this.pal.gold; ctx.fillText(hook.title, 0, 0);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,246,220,0.55)'; ctx.fillText(hook.title, 0, 0);
    if (hook.sub) {
      let ss = Math.round((hook.size || 150) * 0.31); ctx.font = `900 ${ss}px Inter, sans-serif`; const sub = hook.sub.toUpperCase(); const sw = ctx.measureText(sub).width;
      if (sw > maxW) { ss = Math.floor(ss * maxW / sw); ctx.font = `900 ${ss}px Inter, sans-serif`; }
      ctx.lineWidth = ss * 0.22; ctx.strokeText(sub, 0, size * 0.74); ctx.fillStyle = '#ffffff'; ctx.fillText(sub, 0, size * 0.74);
    }
    ctx.restore();
    if (hook.tag) { ctx.save(); ctx.translate(W / 2, y - size * 0.8 * sc); ctx.font = `800 32px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(hook.tag).width + 48; ctx.fillStyle = this.pal.accent_alert; ctx.fillRect(-w / 2, -28, w, 56); ctx.fillStyle = '#fff'; ctx.fillText(hook.tag, 0, 1); ctx.restore(); }
  }
  // Interactive end card
  ctaCard(cta, t, dur) {
    if (!cta || t < cta.t) return; const ctx = this.ctx, W = this.W; const s = t - cta.t; const p = easeOutBack(win(t, cta.t, 0.45));
    const y = cta.y || this.H * 0.56; const bw = 820, bh = 560; const x0 = W / 2 - bw / 2, y0 = y - bh / 2;
    ctx.save(); ctx.globalAlpha = clamp(s * 3); ctx.translate(W / 2, y); ctx.scale(p, p); ctx.translate(-W / 2, -y);
    ctx.fillStyle = 'rgba(10,7,3,0.72)'; ctx.fillRect(x0, y0, bw, bh); ctx.strokeStyle = this.pal.gold; ctx.lineWidth = 3; ctx.shadowColor = this.pal.gold; ctx.shadowBlur = 18; ctx.strokeRect(x0, y0, bw, bh);
    ctx.shadowBlur = 0; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 56px Cinzel, serif`; ctx.fillStyle = this.pal.gold; ctx.fillText(cta.title || 'WHICH ONE NEXT?', W / 2, y0 + 80);
    const opts = [['A', cta.a], ['B', cta.b]];
    opts.forEach(([k, label], i) => {
      const oy = y0 + 170 + i * 150; const pulse = (Math.floor((s - 0.6) * 1.6) % 2 === i) && s > 0.6 ? 1 : 0; const ap = win(t, cta.t + 0.3 + i * 0.15, 0.3);
      ctx.save(); ctx.globalAlpha = ap; ctx.translate(0, (1 - easeOutCubic(ap)) * 30);
      ctx.fillStyle = pulse ? 'rgba(255,194,74,0.18)' : 'rgba(255,194,74,0.06)'; ctx.fillRect(x0 + 50, oy - 55, bw - 100, 110);
      ctx.strokeStyle = pulse ? this.pal.gold_bright : 'rgba(255,194,74,0.6)'; ctx.lineWidth = pulse ? 4 : 2; ctx.shadowColor = this.pal.gold; ctx.shadowBlur = pulse ? 22 : 0; ctx.strokeRect(x0 + 50, oy - 55, bw - 100, 110);
      ctx.shadowBlur = 0; ctx.font = `900 60px Cinzel, serif`; ctx.fillStyle = this.pal.gold; ctx.textAlign = 'left'; ctx.fillText(k, x0 + 85, oy + 2);
      ctx.font = `800 40px Inter, sans-serif`; ctx.fillStyle = this.pal.text; ctx.fillText(label.toUpperCase(), x0 + 165, oy + 2); ctx.restore();
    });
    const fp = win(t, cta.t + 0.9, 0.3); ctx.globalAlpha = clamp(s * 3) * fp; ctx.textAlign = 'center';
    ctx.font = `800 38px Inter, sans-serif`; ctx.fillStyle = this.pal.accent_alert; ctx.fillText((cta.footer || 'COMMENT A OR B').toUpperCase(), W / 2, y0 + bh - 95);
    ctx.font = `600 28px Inter, sans-serif`; ctx.fillStyle = this.pal.text_muted; ctx.fillText((cta.sub || 'Follow — the winner gets rebuilt in 3D next').toUpperCase(), W / 2, y0 + bh - 45);
    ctx.restore();
  }
  // 3D annotations projected to screen: [{x,y,text,kind:'dim'|'tag'|'alert', lx,ly (leader start)}]
  annotations(items, t) {
    if (!items) return; const ctx = this.ctx;
    for (const a of items) {
      if (a.alpha !== undefined && a.alpha <= 0) continue; const al = a.alpha ?? 1; const color = a.kind === 'alert' ? this.pal.accent_alert : a.kind === 'cyan' ? this.pal.accent_cyan : this.pal.gold;
      ctx.save(); ctx.globalAlpha = al;
      if (a.lx !== undefined) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(a.lx, a.ly); ctx.lineTo(a.x, a.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(a.lx, a.ly, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = `600 ${a.size || 26}px "JetBrains Mono", monospace`; ctx.textAlign = a.align || 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(a.text).width + 28; const x = a.align === 'left' ? a.x : a.align === 'right' ? a.x - w : a.x - w / 2;
      ctx.fillStyle = 'rgba(10,7,3,0.78)'; ctx.fillRect(x, a.y - 22, w, 44); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x, a.y - 22, w, 44);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillText(a.text, a.align === 'left' ? a.x + 14 : a.align === 'right' ? a.x - 14 : a.x, a.y + 1);
      ctx.restore();
    }
  }
  flash(amount, color = '255,230,170') { if (amount <= 0.01) return; const ctx = this.ctx; ctx.save(); ctx.globalAlpha = clamp(amount); ctx.fillStyle = `rgba(${color},1)`; ctx.fillRect(0, 0, this.W, this.H); ctx.restore(); }
  // alert strip ("PAUSE HERE" / "SPOT THE TRICK") – mid-video interaction prompt
  prompt(text, t, t0, dur = 2.2) {
    const p = win(t, t0, 0.25) * (1 - win(t, t0 + dur, 0.25)); if (p <= 0) return; const ctx = this.ctx; const y = 1010;
    ctx.save(); ctx.globalAlpha = p; ctx.translate(this.W / 2, y); ctx.scale(0.9 + 0.1 * easeOutBack(win(t, t0, 0.3)), 1);
    ctx.font = `800 34px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(text).width + 60;
    ctx.fillStyle = this.pal.accent_alert; ctx.fillRect(-w / 2, -32, w, 64); ctx.fillStyle = '#fff'; ctx.fillText(text, 0, 2); ctx.restore();
  }
}
