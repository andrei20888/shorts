#!/usr/bin/env node
/**
 * Post-process the masters from scripts/render-final.sh:
 *  1. out/release/*.mp4  — loudness-normalised to -14 LUFS / -1.5 dBTP (two-pass, linear),
 *                          video stream copied bit-for-bit (still H.264 CRF 18).
 *  2. ../output/short03_discipline/ — repo copies under GitHub's 100 MB limit
 *     (films: two-pass x264 to ~90 MB; hooks: CRF 20) + thumbnails.
 *
 *   node scripts/finish.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const finalDir = path.join(root, 'out', 'final');
const releaseDir = path.join(root, 'out', 'release');
const repoOut = path.resolve(root, '..', 'output', 'short03_discipline');
const tmp = path.join(root, 'out', 'tmp-finish');
for (const d of [releaseDir, repoOut, tmp]) fs.mkdirSync(d, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const duration = (f) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1);

const LN = 'I=-14:TP=-1.5:LRA=11';
const masters = fs.readdirSync(finalDir).filter((f) => f.endsWith('.mp4')).sort();
if (!masters.length) throw new Error('No masters in out/final — run scripts/render-final.sh first.');

for (const name of masters) {
  const src = path.join(finalDir, name);
  const dst = path.join(releaseDir, name);
  // pass 1: measure
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', `loudnorm=${LN}:print_format=json`, '-vn', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  // pass 2: apply (linear), copy video
  ff([
    '-i', src, '-map', '0:v', '-map', '0:a', '-c:v', 'copy',
    '-af', `loudnorm=${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', dst,
  ]);
  console.log(`✓ release/${name}  ${mb(dst)} MB  (was ${Number(m.input_i).toFixed(1)} LUFS)`);
}

// repo copies
for (const name of masters) {
  const src = path.join(releaseDir, name);
  const dst = path.join(repoOut, name);
  if (name.startsWith('discipline_')) {
    const dur = duration(src);
    const vbit = Math.floor((90e6 * 8) / dur - 192e3);
    const log = path.join(tmp, name.replace('.mp4', ''));
    const common = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', String(vbit), '-maxrate', String(Math.floor(vbit * 1.6)), '-bufsize', String(vbit * 3), '-pix_fmt', 'yuv420p', '-passlogfile', log];
    ff(['-i', src, ...common, '-pass', '1', '-an', '-f', 'null', '/dev/null']);
    ff(['-i', src, ...common, '-pass', '2', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]);
  } else {
    ff(['-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]);
  }
  console.log(`✓ output/short03_discipline/${name}  ${mb(dst)} MB`);
}

// thumbnails (rendered by: npm run stills -- Thumbnail:0 Thumbnail-Vertical:0)
const thumbs = [
  ['Thumbnail_f0.png', 'thumbnail.jpg', '1280:720'],
  ['Thumbnail-Vertical_f0.png', 'thumbnail_9x16.jpg', '1080:1920'],
];
for (const [src, dst, size] of thumbs) {
  const p = path.join(root, 'out', 'stills', src);
  if (!fs.existsSync(p)) continue;
  ff(['-i', p, '-vf', `scale=${size}:flags=lanczos`, '-q:v', '2', path.join(repoOut, dst)]);
  console.log(`✓ output/short03_discipline/${dst}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
