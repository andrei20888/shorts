#!/usr/bin/env node
/**
 * Renders the Cosmic Scale brand assets with headless Chromium (Playwright).
 *
 *   node brand/render_brand.cjs            # everything
 *   node brand/render_brand.cjs logo       # only the profile picture (+ preview)
 *   node brand/render_brand.cjs banner     # only the banner (+ safe-area preview)
 *
 * Outputs (next to this file):
 *   logo_1024.png, logo_preview.png,
 *   banner_2560x1440.png, banner_safe_preview.png
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const DIR = __dirname;
const what = (process.argv[2] || 'all').toLowerCase();

async function shoot(browser, file, w, h, out, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(`[${file}] page error:`, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[${file}] console:`, m.text()); });
  await page.goto('file://' + path.join(DIR, file) + query);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const outPath = path.join(DIR, out);
  await page.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`✔ ${out}  (${w}×${h}, ${kb} KB)`);
}

function sh(cmd) { execSync(cmd, { stdio: 'inherit', cwd: DIR }); }

function logoPreview() {
  // Simulates YouTube's circular crop at the sizes YouTube actually displays.
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cs-logo-'));
  const circ = path.join(tmp, 'circle.png');
  sh(`convert -size 1024x1024 xc:none -fill white -draw "circle 511.5,511.5 511.5,0" "${tmp}/mask.png"`);
  sh(`convert logo_1024.png "${tmp}/mask.png" -alpha off -compose CopyOpacity -composite "${circ}"`);
  for (const s of [176, 98, 48]) sh(`convert "${circ}" -filter Lanczos -resize ${s}x${s} "${tmp}/l${s}.png"`);
  const font = '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf';
  sh([
    `convert -size 1560x1104 xc:"#0A1020" -depth 8`,
    `"${circ}" -geometry +40+40 -composite`,
    `"${tmp}/l176.png" -geometry +1150+60 -composite`,
    `"${tmp}/l98.png" -geometry +1150+300 -composite`,
    `"${tmp}/l48.png" -geometry +1150+460 -composite`,
    // light-theme row (YouTube light mode)
    `-fill "#FFFFFF" -draw "rectangle 1110,600 1540,760"`,
    `"${tmp}/l98.png" -geometry +1150+620 -composite`,
    `"${tmp}/l48.png" -geometry +1290+645 -composite`,
    `-font ${font} -pointsize 20 -fill "#8CA0C8"`,
    `-annotate +40+1090 "1024 px — upload size"`,
    `-annotate +1350+160 "176 px"`,
    `-annotate +1270+350 "98 px (channel page)"`,
    `-annotate +1220+490 "48 px (feed / comments)"`,
    `-fill "#0A1020" -annotate +1150+790 "light theme"`,
    `logo_preview.png`,
  ].join(' '));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('✔ logo_preview.png');
}

(async () => {
  const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
  try {
    if (what === 'all' || what === 'logo') {
      await shoot(browser, 'logo.html', 1024, 1024, 'logo_1024.png');
      logoPreview();
    }
    if (what === 'all' || what === 'banner') {
      await shoot(browser, 'banner.html', 2560, 1440, 'banner_2560x1440.png');
      await shoot(browser, 'banner.html', 2560, 1440, 'banner_safe_preview.png', '?guides=1');
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
