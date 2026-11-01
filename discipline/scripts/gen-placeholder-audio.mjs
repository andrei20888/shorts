#!/usr/bin/env node
/**
 * Synthesizes PLACEHOLDER audio so renders have timing-correct sound before the real
 * files exist. Replace any file in public/audio/ with your own (same name) — done.
 *
 *   node scripts/gen-placeholder-audio.mjs        (needs ffmpeg on PATH for mp3)
 *
 * music.mp3 starts at film 0:03 (MUSIC.start) and follows the story arc on the
 * 80 BPM grid used by the Act 2 montage cuts.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'audio');
const sfxDir = path.join(outDir, 'sfx');
const tmpDir = path.join(root, 'out', 'tmp-audio');
fs.mkdirSync(sfxDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const SR = 44100;
const TAU = Math.PI * 2;
let seed = 1234567;
const rnd = () => {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

const writeWav = (file, data) => {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.98 ? 0.98 / peak : 1;
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * g)) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
};

const toMp3 = (name, data, dest) => {
  const wav = path.join(tmpDir, `${name}.wav`);
  writeWav(wav, data);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', dest]);
  console.log('✓', path.relative(root, dest));
};

// simple filters
const lowpass = (data, cutoff) => {
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y += a * (data[i] - y);
    data[i] = y;
  }
  return data;
};
const highpass = (data, cutoff) => {
  const lp = Float32Array.from(data);
  lowpass(lp, cutoff);
  for (let i = 0; i < data.length; i++) data[i] -= lp[i];
  return data;
};
/** State-variable band-pass with a per-sample cutoff function. */
const bandSweep = (data, cutoffAt, q = 0.6) => {
  let low = 0;
  let band = 0;
  for (let i = 0; i < data.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffAt(i / SR), SR / 6)) / SR);
    low += f * band;
    const high = data[i] - low - q * band;
    band += f * high;
    data[i] = band;
  }
  return data;
};
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const sat = (x, k = 1.5) => Math.tanh(x * k) / Math.tanh(k);

/* ───────────────────────── SFX ───────────────────────── */

// alarm_beep — four piercing digital beeps (~0.55 s)
{
  const d = buf(0.6);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const k = Math.floor(t / 0.14);
    const local = t - k * 0.14;
    if (k > 3 || local > 0.075) continue;
    const a = Math.min(1, local / 0.002) * Math.min(1, (0.075 - local) / 0.004);
    const f = 2730;
    let v = 0;
    for (const h of [1, 3, 5]) v += Math.sin(TAU * f * h * t) / h;
    d[i] = 0.9 * a * v;
  }
  toMp3('alarm_beep', d, path.join(sfxDir, 'alarm_beep.mp3'));
}
// slap — palm on plastic
{
  const d = buf(0.35);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = noise() * env(t, 0.001, 0.025) * 0.9 + Math.sin(TAU * 140 * t) * env(t, 0.002, 0.05) * 0.8;
  }
  bandSweep(d, () => 1800, 0.9);
  for (let i = 0; i < d.length; i++) d[i] += Math.sin(TAU * 95 * (i / SR)) * env(i / SR, 0.002, 0.06) * 0.5;
  toMp3('slap', d, path.join(sfxDir, 'slap.mp3'));
}
// whoosh — swept noise
{
  const d = buf(0.75);
  for (let i = 0; i < d.length; i++) d[i] = noise();
  bandSweep(d, (t) => 300 + 2600 * Math.sin(Math.PI * Math.min(1, t / 0.7)) ** 2, 0.35);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] *= 2.2 * Math.sin(Math.PI * Math.min(1, t / 0.72)) ** 1.6;
  }
  toMp3('whoosh', d, path.join(sfxDir, 'whoosh.mp3'));
}
// bass_hit — massive sub drop + transient
{
  const d = buf(2.4);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 38 + 80 * Math.exp(-t / 0.12);
    ph += (TAU * f) / SR;
    d[i] = sat(Math.sin(ph) * env(t, 0.003, 0.7) * 1.6, 2) + noise() * env(t, 0.0005, 0.02) * 0.6;
  }
  lowpass(d, 2400);
  toMp3('bass_hit', d, path.join(sfxDir, 'bass_hit.mp3'));
}
// impact — punchy thud + crack + short tail
{
  const d = buf(1.3);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 45 + 50 * Math.exp(-t / 0.05);
    ph += (TAU * f) / SR;
    d[i] = Math.sin(ph) * env(t, 0.002, 0.22) * 1.1 + noise() * (env(t, 0.0005, 0.03) * 0.7 + env(t, 0.01, 0.35) * 0.06);
  }
  lowpass(d, 3500);
  toMp3('impact', d, path.join(sfxDir, 'impact.mp3'));
}
// heartbeat — lub-dub
{
  const d = buf(0.9);
  const thump = (t0, f0, amp) => {
    let ph = 0;
    for (let i = Math.floor(t0 * SR); i < d.length; i++) {
      const t = i / SR - t0;
      const f = f0 + 30 * Math.exp(-t / 0.03);
      ph += (TAU * f) / SR;
      d[i] += Math.sin(ph) * env(t, 0.006, 0.07) * amp;
    }
  };
  thump(0.0, 52, 1);
  thump(0.24, 46, 0.75);
  lowpass(d, 220);
  toMp3('heartbeat', d, path.join(sfxDir, 'heartbeat.mp3'));
}
// rain — 20 s loopable bed
{
  const d = buf(20);
  for (let i = 0; i < d.length; i++) d[i] = noise() * 0.5;
  highpass(d, 400);
  lowpass(d, 6000);
  for (let n = 0; n < 2600; n++) {
    const at = Math.floor(rnd() * (d.length - 2000));
    const amp = 0.15 + rnd() * 0.35;
    for (let k = 0; k < 600; k++) d[at + k] += noise() * amp * Math.exp(-k / 90);
  }
  // crossfade ends for a seamless loop
  const xf = SR * 0.5;
  for (let i = 0; i < xf; i++) {
    const a = i / xf;
    d[i] = d[i] * a + d[d.length - xf + i] * (1 - a);
  }
  toMp3('rain', d.subarray(0, d.length - xf), path.join(sfxDir, 'rain.mp3'));
}
// wind — 20 s loopable, slow gusts
{
  const d = buf(20);
  let b = 0;
  for (let i = 0; i < d.length; i++) {
    b = (b + 0.02 * noise()) * 0.995;
    d[i] = b * 6;
  }
  bandSweep(d, (t) => 260 + 220 * Math.sin((TAU * t) / 7.3) + 120 * Math.sin((TAU * t) / 3.1), 0.8);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] *= 2.4 * (0.55 + 0.45 * Math.sin((TAU * t) / 6.7) * Math.sin((TAU * t) / 2.9 + 1));
  }
  const xf = SR * 1;
  for (let i = 0; i < xf; i++) {
    const a = i / xf;
    d[i] = d[i] * a + d[d.length - xf + i] * (1 - a);
  }
  toMp3('wind', d.subarray(0, d.length - xf), path.join(sfxDir, 'wind.mp3'));
}

/* ───────────────────────── MUSIC (temp score) ───────────────────────── */
// Film-time sections (seconds). music.mp3 t=0 ↔ film 3.0 s.
const FILM0 = 3.0;
const END = 150;
const BEAT = 60 / 80;
const music = buf(END - FILM0);
const at = (filmSec) => Math.floor((filmSec - FILM0) * SR);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const tone = (filmT, dur, freq, amp, { attack = 0.01, decay = dur, harm = [1, 0.4, 0.15], vib = 0 } = {}) => {
  const s = at(filmT);
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n && s + i < music.length; i++) {
    if (s + i < 0) continue;
    const t = i / SR;
    const a = (t < attack ? t / attack : Math.exp(-(t - attack) / decay)) * Math.min(1, (dur - t) / 0.05);
    let v = 0;
    harm.forEach((h, k) => {
      v += h * Math.sin(TAU * freq * (k + 1) * t + vib * Math.sin(TAU * 5 * t));
    });
    music[s + i] += amp * a * v;
  }
};
const pad = (filmT, dur, notes, amp) => {
  notes.forEach((n, i) => {
    const f = midi(n);
    const s = at(filmT);
    const len = Math.floor(dur * SR);
    for (let k = 0; k < len && s + k < music.length; k++) {
      if (s + k < 0) continue;
      const t = k / SR;
      const a = Math.min(1, t / 0.8) * Math.min(1, (dur - t) / 0.8);
      music[s + k] += (amp / notes.length) * a * (Math.sin(TAU * f * t + i) + 0.3 * Math.sin(TAU * f * 2.003 * t));
    }
  });
};
const kickAt = (filmT, amp = 0.9) => {
  const s = at(filmT);
  let ph = 0;
  for (let i = 0; i < SR * 0.35 && s + i < music.length; i++) {
    const t = i / SR;
    const f = 48 + 90 * Math.exp(-t / 0.03);
    ph += (TAU * f) / SR;
    music[s + i] += amp * Math.sin(ph) * Math.exp(-t / 0.12);
  }
};
const hatAt = (filmT, amp = 0.12) => {
  const s = at(filmT);
  for (let i = 0; i < SR * 0.05 && s + i < music.length; i++) music[s + i] += amp * noise() * Math.exp(-i / SR / 0.012);
};
const snareAt = (filmT, amp = 0.35) => {
  const s = at(filmT);
  for (let i = 0; i < SR * 0.25 && s + i < music.length; i++) {
    const t = i / SR;
    music[s + i] += amp * (noise() * Math.exp(-t / 0.07) + 0.5 * Math.sin(TAU * 190 * t) * Math.exp(-t / 0.05));
  }
};

const Am = [57, 60, 64];
const F = [53, 57, 60];
const C = [48, 55, 64];
const G = [50, 55, 59];
const prog = [Am, F, C, G];

// ACT 1 (3–25): dark drone + sparse plucks
pad(3, 22.5, [33, 40, 45], 0.22);
[57, 60, 64, 62, 60, 57, 55, 57].forEach((n, i) => tone(4 + i * BEAT * 3.5, 2.2, midi(n), 0.11, { decay: 0.8 }));
// TURNING (25–42): pad swells, filter opens; dead silence 42–43; riser 43–47
pad(25, 17, [45, 52, 57, 60], 0.18);
pad(33, 9, [41, 48, 53, 57], 0.16);
for (let t = 43; t < 47; t += 1 / 64) tone(t, 0.06, 300 + (t - 43) * 260, 0.012 * (t - 43), { harm: [1] });
// ACT 2 (47–77): driving grind on the 80 BPM grid
for (let b = 0; b < 40; b++) {
  const t = 47 + b * BEAT;
  kickAt(t, 0.85);
  hatAt(t + BEAT / 2);
  if (b % 2 === 1) snareAt(t, 0.28);
  const chord = prog[Math.floor(b / 8) % 4];
  tone(t, BEAT * 0.45, midi(chord[0] - 12), 0.22, { decay: 0.2, harm: [1, 0.5] });
  tone(t + BEAT / 2, BEAT * 0.45, midi(chord[0] - 12), 0.18, { decay: 0.2, harm: [1, 0.5] });
  if (b % 8 === 0) pad(t, BEAT * 8, chord.map((n) => n + 12), 0.14);
}
// DOUBT (77–99): near silence — one soft pad, a distant note
pad(77.5, 21, [45, 52, 59], 0.07);
[81, 88, 95].forEach((t) => tone(t, 3, midi(69), 0.05, { decay: 1.5 }));
// ACT 3 (99–125): the build
pad(99, 26, [45, 52, 57, 64], 0.16);
for (let b = 0; b < 34; b++) {
  const t = 99 + b * BEAT;
  const chord = prog[Math.floor(b / 8) % 4];
  tone(t, BEAT * 0.4, midi(chord[0] - 12), 0.16 + 0.004 * b, { decay: 0.2, harm: [1, 0.5] });
  if (t > 103) kickAt(t, 0.6 + 0.01 * b);
  if (t > 110) hatAt(t + BEAT / 2, 0.14);
  if (t > 112) for (let k = 0; k < 4; k++) tone(t + (k * BEAT) / 4, BEAT / 4, midi(chord[k % 3] + 24), 0.05, { decay: 0.08 });
  if (t > 121.5) for (let k = 0; k < 4; k++) snareAt(t + (k * BEAT) / 4, 0.1 + 0.05 * k);
}
// FINALE (125–150): resolution, title hit at ~141.6 s, fade out
pad(125, 8, [53, 57, 60, 65], 0.26);
pad(133, 8, [48, 55, 60, 64], 0.24);
kickAt(125, 1);
kickAt(141.6, 1);
pad(141.6, 8.2, [45, 52, 57, 60, 64], 0.22);
[64, 67, 69, 72].forEach((n, i) => tone(126 + i * 3, 2.8, midi(n), 0.08, { decay: 1.2 }));
for (let i = 0; i < music.length; i++) {
  const ft = FILM0 + i / SR;
  if (ft > 146) music[i] *= Math.max(0, (150 - ft) / 4);
  music[i] = sat(music[i], 1.2) * 0.8;
}
toMp3('music', music, path.join(outDir, 'music.mp3'));

/* ───────────────────────── VO (silent placeholder) ───────────────────────── */
toMp3('vo', buf(1), path.join(outDir, 'vo.mp3'));

fs.rmSync(tmpDir, { recursive: true, force: true });
