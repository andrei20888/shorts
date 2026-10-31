// Headless renderer: serves the project, opens a scene page in Chromium (SwiftShader WebGL)
// and either screenshots it (still mode) or streams raw RGBA frames into ffmpeg (video mode).
//
//   node tools/render.js --page scenes/logo.html --still output/brand/logo.png --w 800 --h 800
//   node tools/render.js --page scenes/short1.html --video output/short1/video.mp4 --w 1080 --h 1920 --fps 60
//
// Extra query params for the page: --q "data=sim/short1.json&from=0&to=120"
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const W = +(args.w || 1080), H = +(args.h || 1920), FPS = +(args.fps || 60), DPR = +(args.dpr || 1);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.bin': 'application/octet-stream' };

let ff = null, ffDone = null, frames = 0, t0 = Date.now();

function startFfmpeg(out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  ffDone = new Promise(r => ff.on('close', r));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/frame') {
    let pending = 0;
    req.on('data', chunk => { if (!ff.stdin.write(chunk)) { pending++; req.pause(); ff.stdin.once('drain', () => { pending--; req.resume(); }); } });
    req.on('end', () => {
      frames++;
      if (frames % 60 === 0) {
        const fps = frames / ((Date.now() - t0) / 1000);
        process.stdout.write(`\r  frame ${frames}  (${fps.toFixed(1)} fps render)   `);
      }
      res.end('ok');
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/log') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => { console.log('[page]', body); res.end('ok'); });
    return;
  }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  if (args.video) startFfmpeg(path.resolve(ROOT, args.video));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-gpu-vsync', '--disable-frame-rate-limit', '--js-flags=--max-old-space-size=8192'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || args.verbose) console.log('[console]', m.type(), m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  const q = `w=${W}&h=${H}&dpr=${DPR}&fps=${FPS}&mode=${args.video ? 'video' : 'still'}` + (args.q ? '&' + args.q : '');
  await page.goto(`http://127.0.0.1:${port}/${args.page}?${q}`, { timeout: 0, waitUntil: 'commit' });
  await page.waitForFunction(() => window.__done === true || window.__error, null, { timeout: 0, polling: 500 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.error('Page error:', err); process.exitCode = 1; }
  if (args.still) {
    const out = path.resolve(ROOT, args.still);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', quality: out.endsWith('.jpg') ? 95 : undefined });
    console.log('saved', out);
  }
  await browser.close();
  if (ff) { ff.stdin.end(); await ffDone; console.log(`\nvideo: ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  server.close();
})();
