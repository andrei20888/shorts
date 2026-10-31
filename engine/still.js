// Render a page to a PNG: node still.js <page relative to repo> <out.png> <width> <height> [scale] [t]
const { chromium } = require('playwright');
const { serve } = require('./serve');

(async () => {
  const [page, out, w, h, scale = '1', t = '0'] = process.argv.slice(2);
  const { srv, url } = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  const p = await ctx.newPage();
  p.on('console', (m) => console.log('[page]', m.text()));
  p.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exit(1); });
  await p.goto(`${url}/${page}?scale=${scale}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  for (const tt of t.split(',')) {
    await p.evaluate(async (t) => { if (window.renderAt) await window.renderAt(+t); }, tt);
    const o = t.includes(',') ? out.replace(/\.png$/, `_${tt}.png`) : out;
    await p.screenshot({ path: o, type: 'png' });
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
