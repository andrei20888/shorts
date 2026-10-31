#!/usr/bin/env node
/**
 * Frame renderer: drives pipeline/render/index.html in headless Chromium (SwiftShader WebGL),
 * renders every frame deterministically at t = i / fps, and streams raw RGBA pixels into ffmpeg.
 *
 *   node pipeline/render/render_frames.cjs out/<id>            # full render → out/<id>/video_only.mp4
 *   node pipeline/render/render_frames.cjs out/<id> --preview 0,30,120   # PNG stills → out/<id>/preview/
 *   node pipeline/render/render_frames.cjs out/<id> --every 45           # PNG still every 45 frames
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const outDir = path.resolve(args[0] || 'out/001-earth-to-ton618');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const previewList = opt('--preview');
const every = opt('--every');
const limit = opt('--limit');
const crf = opt('--crf') || '17';
const preset = opt('--preset') || 'slow';

const ROOT = path.resolve(__dirname, '..', '..');
const RENDER_DIR = __dirname;
const timeline = JSON.parse(fs.readFileSync(path.join(outDir, 'timeline.json'), 'utf8'));
const [W, H] = timeline.size || [1080, 1920];
const FPS = timeline.fps || 30;
const TOTAL = Math.ceil(timeline.duration * FPS);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.css': 'text/css', '.wasm': 'application/wasm' };

let ff = null, ffDone = null;
let pending = Promise.resolve();

function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/frame') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const idx = Number(u.searchParams.get('i'));
      if (previewList || every) {
        const png = u.searchParams.get('png') === '1';
        const dir = path.join(outDir, 'preview'); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `f${String(idx).padStart(5, '0')}_t${(idx / FPS).toFixed(2)}s.${png ? 'png' : 'raw'}`), buf);
        res.writeHead(200); res.end('ok');
      } else {
        const ok = ff.stdin.write(buf);
        if (ok) { res.writeHead(200); res.end('ok'); }
        else ff.stdin.once('drain', () => { res.writeHead(200); res.end('ok'); });
      }
    });
    return;
  }
  let p = u.pathname;
  if (p === '/') p = '/index.html';
  if (p === '/timeline.json') return serveFile(res, path.join(outDir, 'timeline.json'));
  if (p.startsWith('/three/')) return serveFile(res, path.join(ROOT, 'pipeline', 'node_modules', 'three', p.slice(7)));
  if (p.startsWith('/assets/')) return serveFile(res, path.join(ROOT, 'pipeline', 'assets', p.slice(8)));
  return serveFile(res, path.join(RENDER_DIR, p));
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/index.html?w=${W}&h=${H}&fps=${FPS}`;

  let frames;
  if (previewList) frames = previewList.split(',').map(Number);
  else if (every) { frames = []; for (let i = 0; i < TOTAL; i += Number(every)) frames.push(i); }
  else { frames = [...Array(limit ? Math.min(TOTAL, Number(limit)) : TOTAL).keys()]; }

  const outFile = path.join(outDir, 'video_only.mp4'); const tmpFile = path.join(outDir, 'frames_lossless.mkv');
  if (!previewList && !every) {
    // Stage 1: lossless, ultrafast intermediate (keeps CPU free for the software GL renderer).
    ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
      '-vf', 'vflip,format=rgb24', '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-threads', '1', tmpFile], { stdio: ['pipe', 'inherit', 'inherit'] });
    ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  }

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none',
    '--disable-lcd-text', '--force-color-profile=srgb', '--js-flags=--max-old-space-size=4096'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  console.log(`[render] ready. ${frames.length} frames @ ${FPS}fps, ${W}x${H}, duration ${timeline.duration}s`);

  const t0 = Date.now();
  for (let n = 0; n < frames.length; n++) {
    const i = frames[n];
    const png = !!(previewList || every);
    await page.evaluate(([i, png]) => window.__frame(i, png), [i, png]);
    if (n % 30 === 0 || n === frames.length - 1) {
      const el = (Date.now() - t0) / 1000; const rate = (n + 1) / el;
      console.log(`[render] ${n + 1}/${frames.length}  ${rate.toFixed(2)} fps  ETA ${((frames.length - n - 1) / rate / 60).toFixed(1)} min`);
    }
  }
  await browser.close();
  if (ff) {
    ff.stdin.end(); await ffDone;
    // Stage 2: final high-quality encode with all cores.
    console.log('[render] encoding final video...');
    const { spawnSync } = require('child_process');
    const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-stats', '-i', tmpFile, '-vf', 'format=yuv420p',
      '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-profile:v', 'high', '-level', '4.2',
      '-x264-params', 'aq-mode=3:aq-strength=1.1:deblock=-1,-1:ref=4:bframes=5', '-g', String(FPS * 2), '-movflags', '+faststart', outFile], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('final encode failed');
    if (!args.includes('--keep-lossless')) fs.unlinkSync(tmpFile);
    console.log('[render] wrote', outFile);
  }
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
