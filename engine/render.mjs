// Headless frame renderer. Loads a scene in Chromium (WebGL), steps time deterministically and
// pipes frames to ffmpeg — no frames touch the disk.
//   video: node engine/render.mjs video <scene.js> <timeline.json> <out.mp4> [--fps 30] [--from s] [--to s] [--cues cues.json]
//   still: node engine/render.mjs still <scene.js> <out%d.png> --w 2560 --h 1440 [--t 0,1.5] [--timeline tl.json]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [mode, ...rest] = process.argv.slice(2);
const flags = {}, pos = [];
for (let i = 0; i < rest.length; i++) rest[i].startsWith('--') ? (flags[rest[i].slice(2)] = rest[++i]) : pos.push(rest[i]);

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const rel = p => '/' + path.relative(ROOT, path.resolve(p)).split(path.sep).join('/');

const w = +(flags.w || 1080), h = +(flags.h || 1920);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exit(1); });
const qs = new URLSearchParams({ scene: rel(pos[0]), w, h });
if (mode === 'video') qs.set('timeline', rel(pos[1]));
if (flags.timeline) qs.set('timeline', rel(flags.timeline));
await page.goto(`http://127.0.0.1:${port}/engine/page.html?${qs}`);
await page.waitForFunction('window.TB_READY === true', null, { timeout: 120000 });
const cdp = await page.context().newCDPSession(page);
const shot = async (format, quality) => Buffer.from((await cdp.send('Page.captureScreenshot', { format, quality, optimizeForSpeed: true })).data, 'base64');

if (mode === 'still') {
  // --t accepts a comma list; "%d" in the output name is replaced by the index
  for (const [i, t] of String(flags.t || 0).split(',').entries()) {
    await page.evaluate(t => window.TB.update(t), +t);
    fs.writeFileSync(pos[1].replace('%d', i), await shot('png'));
  }
  console.log('wrote', pos[1]);
} else {
  const fps = +(flags.fps || 30);
  const dur = await page.evaluate('window.TB.duration');
  const from = +(flags.from || 0), to = Math.min(+(flags.to || dur), dur);
  if (flags.cues) fs.writeFileSync(flags.cues, JSON.stringify(await page.evaluate('window.TB.cues || []'), null, 1));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), pos[2]], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.TB.update(t), from + i / fps);
    const buf = await shot('jpeg', 95);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stderr.write(`\r  frame ${i}/${n}  ${((Date.now() - t0) / (i + 1)).toFixed(0)}ms/f   `);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.error(`\n  done ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${pos[2]}`);
}
await browser.close();
server.close();
