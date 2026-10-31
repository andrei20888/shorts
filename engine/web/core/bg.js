// Procedural "ancient stone + blueprint grid" background, pre-rendered once (deterministic).
import { rng } from './easing.js';

export function makeBackground(W, H, pal) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // base vertical gradient (warm dark stone)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1610'); g.addColorStop(0.5, '#171209'); g.addColorStop(1, '#0d0a06');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stone noise: layered blotches
  const r = rng(7);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, rad = 40 + r() * 260;
    const a = 0.012 + r() * 0.03;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(120,90,45,${a})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // fine grain
  const img = ctx.getImageData(0, 0, W, H); const d = img.data; const r2 = rng(99);
  for (let i = 0; i < d.length; i += 4) { const n = (r2() - 0.5) * 14; d[i] += n; d[i + 1] += n * 0.9; d[i + 2] += n * 0.7; }
  ctx.putImageData(img, 0, 0);
  // blueprint grid: minor 40px, major 200px, offset so a major line is centered
  const minor = 40, major = 200, ox = (W / 2) % major, oy = (H / 2) % major;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(214,160,70,0.10)';
  ctx.beginPath();
  for (let x = ox % minor; x <= W; x += minor) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = oy % minor; y <= H; y += minor) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,175,80,0.22)';
  ctx.beginPath();
  for (let x = ox; x <= W; x += major) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = oy; y <= H; y += major) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  // sparse "measurement ticks" along major lines
  ctx.fillStyle = 'rgba(230,175,80,0.35)';
  const r3 = rng(3);
  for (let i = 0; i < 70; i++) { const x = ox + Math.floor(r3() * (W / major)) * major; const y = r3() * H; ctx.fillRect(x - 4, y, 9, 1); }
  // vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.5, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  return c;
}
