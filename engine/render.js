// Frame renderer: loads player.html in headless Chromium (SwiftShader WebGL), steps time deterministically,
// pipes JPEG frames into ffmpeg. Usage:
//   node render.js --timeline work/ep.timeline.json --out work/ep.video.mp4 [--fps 30] [--preview 0,2.5,10]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; }
(async () => {
  const tlPath = arg('timeline'); const out = arg('out'); const fps = parseInt(arg('fps', '30'), 10);
  const preview = arg('preview', null); const start = parseFloat(arg('start', '0')); const endArg = arg('end', null);
  const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  const pal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brand', 'palette.json'), 'utf8'));
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => { console.error('[pageerror]', e.message); });
  await page.goto('file://' + path.join(__dirname, 'web', 'player.html'));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.evaluate(([tl, pal]) => window.__setup(tl, pal), [tl, pal]);
  const grab = async (t) => { const d = await page.evaluate((t) => window.__renderAt(t), t); return Buffer.from(d.split(',')[1], 'base64'); };
  if (preview) {
    const dir = arg('previewDir', path.dirname(out || tlPath)); fs.mkdirSync(dir, { recursive: true });
    for (const ts of preview.split(',')) { const t = parseFloat(ts); fs.writeFileSync(path.join(dir, `preview_${t.toFixed(2)}.jpg`), await grab(t)); }
    console.log('previews written to', dir); await browser.close(); return;
  }
  const end = endArg ? parseFloat(endArg) : tl.duration; const n = Math.ceil((end - start) * fps);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = start + i / fps; const buf = await grab(t);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}  t=${t.toFixed(1)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await browser.close();
  console.log(`rendered ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
