// 2D overlay: captions, HUD, countdown, interaction overlays. Drawn on a transparent canvas each frame.
const ICE = '#5CC8FF', LUMEN = '#F2F7FF', MUTED = '#8CA0C8', COSMIC = '#2F7BFF', SOLAR = '#FFB54A', EMBER = '#FF5A3C';
const F_HEAD = '"Inter Display", Inter, sans-serif', F_MONO = '"JetBrains Mono", monospace';
export const ease = {
  outCubic: (x) => 1 - Math.pow(1 - x, 3), inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
};
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');

function parseCaption(cap) {
  // '*' toggles emphasis. Returns lines → tokens {text, emph}
  let emph = false; const lines = [];
  for (const raw of cap.split('\n')) {
    const toks = [];
    for (const w of raw.split(' ')) {
      if (!w) continue;
      let text = ''; const parts = w.split('*');
      // emphasis toggles at each '*' inside the word; apply the state at the word's first visible char
      let state = emph;
      for (let i = 0; i < parts.length; i++) { if (i > 0) { emph = !emph; if (!text) state = emph; } text += parts[i]; }
      toks.push({ text, emph: state });
    }
    lines.push(toks);
  }
  return lines;
}

export class Hud {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.W = canvas.width; this.H = canvas.height; }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  brand(alpha = 0.5) {
    const { ctx, W } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.font = `700 24px ${F_HEAD}`; ctx.letterSpacing = '6px';
    ctx.fillStyle = MUTED; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('COSMIC SCALE', W / 2 + 3, 158); ctx.restore();
  }

  // Top-left object readout. jumpT: seconds since the scale jump (for the ×N badge), or null.
  topHud(name, spec, jump, jumpT, alpha = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `500 22px ${F_MONO}`; ctx.fillStyle = MUTED; ctx.letterSpacing = '3px'; ctx.fillText('OBJECT', 72, 232);
    ctx.font = `800 40px ${F_HEAD}`; ctx.fillStyle = ICE; ctx.letterSpacing = '-0.5px';
    ctx.shadowColor = 'rgba(92,200,255,0.55)'; ctx.shadowBlur = 18; ctx.fillText(name, 70, 278); ctx.shadowBlur = 0;
    ctx.font = `500 26px ${F_MONO}`; ctx.fillStyle = LUMEN; ctx.letterSpacing = '0px'; ctx.globalAlpha = alpha * 0.85; ctx.fillText(spec, 72, 316);
    if (jump && jumpT != null && jumpT >= 0 && jumpT < 2.2) {
      const a = jumpT < 0.25 ? ease.outBack(jumpT / 0.25) : 1; const fade = jumpT > 1.7 ? 1 - (jumpT - 1.7) / 0.5 : 1;
      ctx.globalAlpha = alpha * Math.max(0, fade); ctx.font = `900 64px ${F_HEAD}`; ctx.letterSpacing = '-2px'; ctx.textAlign = 'left';
      ctx.fillStyle = COSMIC; ctx.shadowColor = 'rgba(47,123,255,0.8)'; ctx.shadowBlur = 28;
      ctx.save(); ctx.translate(72, 392); ctx.scale(a, a); ctx.fillText(jump, 0, 0); ctx.restore();
    }
    ctx.restore();
  }

  countdown(seconds, alpha = 1) {
    const { ctx, W } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    const s = Math.max(0, seconds); const urgent = s < 6;
    ctx.font = `500 22px ${F_MONO}`; ctx.fillStyle = MUTED; ctx.letterSpacing = '3px'; ctx.fillText('EARTH GONE IN', W - 72, 232);
    const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(Math.floor(s % 60)).padStart(2, '0'), ds = String(Math.floor((s * 10) % 10));
    ctx.font = `700 48px ${F_MONO}`; ctx.letterSpacing = '0px'; ctx.fillStyle = urgent ? EMBER : LUMEN;
    if (urgent) { ctx.shadowColor = 'rgba(255,90,60,0.7)'; ctx.shadowBlur = 20 + 10 * Math.sin(seconds * 12); }
    ctx.fillText(`${mm}:${ss}.${ds}`, W - 70, 284); ctx.restore();
  }

  // Caption card. prog ∈[0,1] karaoke progress; age seconds since appearance; animNums: count-up for integer tokens.
  caption(text, age, prog, { y = 1430, maxW = 930, base = 96, alpha = 1 } = {}) {
    const { ctx, W } = this; if (!text) return;
    const lines = parseCaption(text);
    let size = base;
    const measure = (sz) => { ctx.font = `900 ${sz}px ${F_HEAD}`; ctx.letterSpacing = `${-sz * 0.025}px`; return Math.max(...lines.map((l) => l.reduce((a, t, i) => a + ctx.measureText(t.text).width + (i ? sz * 0.26 : 0), 0))); };
    while (size > 54 && measure(size) > maxW) size -= 4;
    const lh = size * 1.06; const totalH = lh * lines.length;
    const pop = age < 0.22 ? ease.outBack(clamp01(age / 0.22)) : 1; const sc = lerp(0.84, 1, pop);
    const total = lines.flat().reduce((a, t) => a + t.text.length + 1, 0); let seen = 0;
    ctx.save(); ctx.globalAlpha = alpha * clamp01(age / 0.08); ctx.translate(W / 2, y); ctx.scale(sc, sc); ctx.translate(-W / 2, -y);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    lines.forEach((toks, li) => {
      ctx.font = `900 ${size}px ${F_HEAD}`; ctx.letterSpacing = `${-size * 0.025}px`;
      const widths = toks.map((t) => ctx.measureText(t.text).width); const gap = size * 0.26;
      const lineW = widths.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
      let x = W / 2 - lineW / 2; const yy = y - totalH / 2 + lh * (li + 0.5);
      toks.forEach((t, i) => {
        const wStart = seen / total; seen += t.text.length + 1; const wEnd = seen / total;
        const lit = clamp01((prog - wStart) / Math.max(0.001, wEnd - wStart));
        let txt = t.text;
        const m = txt.match(/^([^\d]*)(\d[\d,]*)(.*)$/);
        if (m && age < 0.75) { const val = parseInt(m[2].replace(/,/g, ''), 10); if (val >= 2) { const k = ease.outExpo(clamp01(age / 0.75)); txt = m[1] + fmtInt(val * k) + m[3]; } }
        const col = t.emph ? ICE : LUMEN;
        ctx.save(); ctx.translate(x + widths[i] / 2, yy); const bump = 1 + 0.05 * Math.sin(Math.PI * lit) * (lit < 1 ? 1 : 0); ctx.scale(bump, bump);
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.14; ctx.strokeStyle = 'rgba(5,7,13,0.78)'; ctx.strokeText(txt, -widths[i] / 2, 0);
        ctx.shadowColor = t.emph ? 'rgba(92,200,255,0.75)' : 'rgba(255,255,255,0.35)'; ctx.shadowBlur = t.emph ? 26 : 14;
        ctx.fillStyle = col; ctx.globalAlpha *= lerp(0.62, 1, Math.max(lit, prog >= 1 ? 1 : 0)); ctx.fillText(txt, -widths[i] / 2, 0); ctx.restore();
        x += widths[i] + gap;
      });
    });
    ctx.restore();
  }

  // Pointer: thin line from a label to a tiny target.
  pointer(x, y, label, lx, ly, alpha = 1, color = ICE) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 14 * Math.sign(lx - x), y); ctx.lineTo(lx - 10 * Math.sign(lx - x), ly); ctx.stroke();
    ctx.font = `600 26px ${F_MONO}`; ctx.fillStyle = color; ctx.textAlign = lx > x ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.fillText(label, lx, ly); ctx.restore();
  }

  // Concentric orbit rings around (cx,cy) with labels.
  orbits(cx, cy, rings, alpha = 1, reveal = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = 2; ctx.textBaseline = 'middle';
    rings.forEach((rg, i) => {
      const k = clamp01(reveal * rings.length - i); if (k <= 0) return;
      ctx.strokeStyle = `rgba(242,247,255,${0.55 * k})`; ctx.setLineDash([6, 8]); ctx.shadowColor = 'rgba(92,200,255,0.6)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(cx, cy, rg.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); ctx.setLineDash([]);
      const ang = -Math.PI / 4 - i * 0.35; const px = cx + Math.cos(ang) * rg.r, py = cy + Math.sin(ang) * rg.r;
      ctx.fillStyle = rg.color || LUMEN; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
      ctx.font = `600 24px ${F_MONO}`; ctx.fillStyle = LUMEN; ctx.textAlign = 'left'; ctx.globalAlpha = alpha * k; ctx.fillText(rg.label, px + 14, py - 2); ctx.globalAlpha = alpha;
    });
    ctx.restore();
  }

  sunDot(x, y, r = 2.6, alpha = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#FFF2C8'; ctx.shadowColor = SOLAR; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  ping(x, y, age, label) {
    const { ctx } = this; if (age < 0) return; ctx.save();
    for (let k = 0; k < 3; k++) { const a = age - k * 0.25; if (a < 0) continue; const r = 18 + ease.outCubic(clamp01(a / 1.2)) * 150; const al = Math.max(0, 1 - a / 1.2);
      ctx.strokeStyle = `rgba(92,200,255,${al})`; ctx.lineWidth = 3; ctx.shadowColor = ICE; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
    if (age > 0.35 && label) { const al = clamp01((age - 0.35) / 0.2); ctx.globalAlpha = al; ctx.strokeStyle = ICE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + 90, y - 60); ctx.lineTo(x + 110, y - 60); ctx.stroke();
      ctx.font = `800 30px ${F_HEAD}`; ctx.fillStyle = ICE; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.shadowColor = ICE; ctx.shadowBlur = 14; ctx.fillText(label, x + 118, y - 60); }
    ctx.restore();
  }

  // Light pulse travelling around a circle limb; prog ∈[0,1]; hours label.
  lightLap(cx, cy, r, prog, hours, alpha = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * prog;
    ctx.strokeStyle = 'rgba(92,200,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    ctx.strokeStyle = LUMEN; ctx.lineWidth = 5; ctx.shadowColor = ICE; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx, cy, r, Math.max(a0, a1 - 0.25), a1); ctx.stroke();
    const px = cx + Math.cos(a1) * r, py = cy + Math.sin(a1) * r; ctx.fillStyle = LUMEN; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 34px ${F_MONO}`; ctx.fillStyle = ICE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 10;
    ctx.fillText(`${hours.toFixed(1)} h`, cx, cy - r - 40 < 180 ? cy + r + 60 : cy - r - 40); ctx.restore();
  }

  // Row of N tiny "solar systems" across a diameter.
  row40(cx, cy, R, n, count, alpha = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; const d = (2 * R) / n;
    for (let i = 0; i < Math.min(n, Math.ceil(count)); i++) { const x = cx - R + d * (i + 0.5); const k = clamp01(count - i);
      ctx.strokeStyle = `rgba(92,200,255,${0.9 * k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, cy, d * 0.42 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(255,181,74,${k})`; ctx.beginPath(); ctx.arc(x, cy, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = `600 24px ${F_MONO}`; ctx.fillStyle = MUTED; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '2px';
    ctx.fillText(`${Math.min(n, Math.floor(count))} × SOLAR SYSTEM (NEPTUNE ORBIT)`, cx, cy + 60); ctx.restore();
  }

  // Nested-dots diagram: objects [{name, r (relative, outermost = 1), color}], zoom = screen px per unit, center.
  nested(cx, cy, objs, zoom, alpha = 1) {
    const { ctx } = this; ctx.save(); ctx.globalAlpha = alpha; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    objs.forEach((o, i) => {
      const r = o.r * zoom; if (r < 0.6 || r > 6000) return;
      const vis = r > 2.5;
      ctx.strokeStyle = o.color; ctx.lineWidth = Math.min(4, Math.max(1.5, r * 0.01)); ctx.shadowColor = o.color; ctx.shadowBlur = 16;
      ctx.fillStyle = o.color;
      if (r < 6) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.2, r), 0, Math.PI * 2); ctx.fill(); }
      else { ctx.globalAlpha = alpha * Math.min(1, 1600 / r); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = alpha * 0.08; ctx.fill(); ctx.globalAlpha = alpha; }
      if (vis && r > 40 && r < 1400) { ctx.font = `700 ${Math.round(Math.min(40, 18 + r * 0.03))}px ${F_MONO}`; ctx.fillStyle = LUMEN; ctx.shadowBlur = 8; ctx.fillText(o.name, cx, cy - r - 22); }
    });
    ctx.restore();
  }

  gone(age) {
    const { ctx, W, H } = this; if (age < 0 || age > 1.6) return; ctx.save(); ctx.globalAlpha = 1 - clamp01((age - 1.15) / 0.45);
    const flash = Math.max(0, 1 - age / 0.35) * 0.55; ctx.fillStyle = `rgba(242,247,255,${flash})`; ctx.fillRect(0, 0, W, H);
    const a = ease.outBack(clamp01(age / 0.3)); ctx.globalAlpha *= clamp01(age / 0.1); ctx.translate(W / 2, 900); ctx.scale(a, a);
    ctx.font = `900 150px ${F_HEAD}`; ctx.letterSpacing = '-6px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(5,7,13,0.8)';
    ctx.strokeText('GONE.', 0, 0); ctx.fillStyle = LUMEN; ctx.shadowColor = ICE; ctx.shadowBlur = 40; ctx.fillText('GONE.', 0, 0); ctx.restore();
  }

  // End card: comment prompt + follow pill with mini mark.
  cta(age, alpha = 1) {
    const { ctx, W } = this; if (age < 0) return; ctx.save(); ctx.globalAlpha = alpha;
    const a = ease.outBack(clamp01(age / 0.35)); ctx.translate(W / 2, 1190); ctx.scale(a, a);
    // follow pill
    ctx.fillStyle = 'rgba(10,16,32,0.85)'; ctx.strokeStyle = 'rgba(92,200,255,0.5)'; ctx.lineWidth = 2;
    const pw = 560, ph = 110; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 55); ctx.fill(); ctx.stroke();
    // mini mark
    const mx = -pw / 2 + 60; const g = ctx.createRadialGradient(mx - 8, -8, 2, mx, 0, 28); g.addColorStop(0, '#9FD8FF'); g.addColorStop(0.5, COSMIC); g.addColorStop(1, '#0A3D91');
    ctx.fillStyle = g; ctx.shadowColor = ICE; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(mx, 0, 28, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = ICE; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(mx, 0, 46, 12, -0.45, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `800 30px ${F_HEAD}`; ctx.fillStyle = LUMEN; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('@CosmicScaleShorts', mx + 52, -14);
    ctx.font = `600 22px ${F_MONO}`; ctx.fillStyle = MUTED; ctx.letterSpacing = '2px'; ctx.fillText('FOLLOW · DAILY', mx + 52, 20);
    // subscribe button
    const bx = pw / 2 - 150; const pulse = 1 + 0.04 * Math.sin(age * 6); ctx.save(); ctx.translate(bx, 0); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#FF0033'; ctx.shadowColor = 'rgba(255,0,51,0.6)'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.roundRect(-100, -32, 200, 64, 32); ctx.fill();
    ctx.shadowBlur = 0; ctx.font = `800 26px ${F_HEAD}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.letterSpacing = '0px'; ctx.fillText('SUBSCRIBE', 0, 1); ctx.restore();
    ctx.restore();
  }
}
