/**
 * Batch still renderer — bundles once, reuses one browser.
 * Equivalent to many `npx remotion still <comp> <out> --frame=N` calls.
 *
 *   npm run stills                                   # hook + key moments + rig sheet
 *   npm run stills -- hooks key-vertical             # pick groups
 *   npm run stills -- Discipline:1170 Hook-B:45      # ad-hoc frames
 *
 * Output: out/stills/
 */
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { HOOK_STILL_FRAMES, KEY_MOMENTS } from '../src/timing';

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out', 'stills');
fs.mkdirSync(outDir, { recursive: true });

const HOOK_FRAMES = HOOK_STILL_FRAMES;
const KEY = KEY_MOMENTS.map((k) => [k.name, k.frame] as const);

const args = process.argv.slice(2);
type Job = { comp: string; frame: number; name: string };
const jobs: Job[] = [];
const wantAll = args.length === 0;
const want = (k: string) => wantAll || args.includes(k);
if (want('hooks')) {
  for (const v of ['A', 'B', 'C']) {
    for (const fr of HOOK_FRAMES) jobs.push({ comp: `Hook-${v}`, frame: fr, name: `hook${v}_f${String(fr).padStart(3, '0')}` });
  }
}
if (want('hooks-vertical')) {
  for (const v of ['A', 'B', 'C']) {
    for (const fr of HOOK_FRAMES) jobs.push({ comp: `Hook-${v}-Vertical`, frame: fr, name: `vertical_hook${v}_f${String(fr).padStart(3, '0')}` });
  }
}
if (want('key')) for (const [name, fr] of KEY) jobs.push({ comp: 'Discipline', frame: fr, name: `key${name}` });
if (want('key-vertical')) for (const [name, fr] of KEY) jobs.push({ comp: 'Discipline-Vertical', frame: fr, name: `vertical_key${name}` });
if (want('rig')) jobs.push({ comp: 'CharacterSheet', frame: 8, name: 'rig_sheet' });
for (const a of args) {
  const m = a.match(/^([\w-]+):(\d+)$/);
  if (m) jobs.push({ comp: m[1], frame: Number(m[2]), name: `${m[1]}_f${m[2]}` });
}

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const main = async () => {
console.log(`Bundling… (${jobs.length} stills)`);
const serveUrl = await bundle({ entryPoint: path.join(root, 'src', 'index.ts'), rspack: true });
const browser = await openBrowser('chrome', { browserExecutable });
const comps = new Map<string, Awaited<ReturnType<typeof selectComposition>>>();
for (const job of jobs) {
  if (!comps.has(job.comp)) {
    comps.set(job.comp, await selectComposition({ serveUrl, id: job.comp, puppeteerInstance: browser, browserExecutable }));
  }
  const composition = comps.get(job.comp)!;
  const output = path.join(outDir, `${job.name}.png`);
  const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame: job.frame, output, puppeteerInstance: browser, browserExecutable, overwrite: true });
  console.log(`✓ ${job.name}.png  (${job.comp} @ ${job.frame})  ${Date.now() - t0} ms`);
}
await browser.close({ silent: true });
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
