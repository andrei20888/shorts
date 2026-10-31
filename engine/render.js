// Render a scene page to video frames in parallel segments.
// usage: node render.js <page> <outDir> [--fps 30] [--workers 2] [--from 0] [--to <dur>]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const [page, outDir] = args;
const fps = +opt('fps', 30), workers = +opt('workers', 2);
const W = 1080, H = 1920;

async function openPage(url) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exit(1); });
  await p.goto(`${url}/${page}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  const cdp = await ctx.newCDPSession(p);
  return { browser, p, cdp };
}

async function renderSegment(url, idx, f0, f1) {
  const { browser, p, cdp } = await openPage(url);
  const file = path.join(outDir, `seg_${String(idx).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await p.evaluate((t) => window.renderAt(t), f / fps);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) console.log(`seg ${idx}: frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / Math.max(1, f - f0)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  return file;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, url } = await serve();
  const probe = await openPage(url);
  const dur = await probe.p.evaluate(() => window.__duration);
  fs.writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(await probe.p.evaluate(() => window.__cues), null, 1));
  await probe.browser.close();
  const from = Math.round(+opt('from', 0) * fps), to = Math.round(+opt('to', dur) * fps);
  const n = to - from, per = Math.ceil(n / workers);
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = from + w * per, b = Math.min(to, a + per);
    if (a < b) jobs.push(renderSegment(url, w, a, b));
  }
  const segs = await Promise.all(jobs);
  const list = path.join(outDir, 'segments.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${path.resolve(s)}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(outDir, 'video.mp4')], { stdio: 'inherit' }).on('close', r));
  console.log('video ->', path.join(outDir, 'video.mp4'), `${n} frames`);
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
