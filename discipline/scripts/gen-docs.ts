/**
 * Regenerates SFX_CUES.md and VOICEOVER.md from src/timing.ts.
 *   npm run docs
 */
import fs from 'node:fs';
import path from 'node:path';
import { DURATION, FPS, HOOK, MUSIC, SCENES, SFX_CUES, VO_LINES, VO_MODE, type Cue } from '../src/timing';

const root = path.resolve(__dirname, '..');
const tc = (f: number) => {
  const s = f / FPS;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
const sceneOf = (f: number) => {
  const names: Record<string, string> = {
    hook: 'HOOK',
    act1: 'ACT 1 · The Struggle',
    turning: 'TURNING POINT',
    act2: 'ACT 2 · The Grind',
    doubt: 'THE DOUBT',
    act3: 'ACT 3 · The Climb',
    finale: 'FINALE',
  };
  for (const [k, s] of Object.entries(SCENES)) if (f >= s.start && f < s.end) return names[k];
  return 'FINALE';
};

/* ───────── SFX_CUES.md ───────── */
const rows = [...SFX_CUES].sort((a, b) => a.at - b.at || a.sfx.localeCompare(b.sfx));
const line = (c: Cue) =>
  `| ${c.at} | ${tc(c.at)} | \`${c.sfx}.mp3\` | ${c.volume.toFixed(2)} | ${c.loop ? `loop ${c.dur}f` : c.dur ? `cut @ ${c.dur}f` : 'full'} | ${
    c.variants ? c.variants.join(',') : 'all'
  } | ${c.note} |`;
const sfxDoc = [
  '# SFX CUES — DISCIPLINE',
  '',
  `> Generated from \`src/timing.ts\` by \`npm run docs\`. ${FPS} fps · ${DURATION} frames (${tc(DURATION)}).`,
  '> Every cue is already wired in `src/audio/Soundtrack.tsx` — drop a file with the same name into',
  '> `public/audio/sfx/` and it plays at that exact frame. Missing files are skipped, never fail a render.',
  '',
  '## Files',
  '',
  '| file | used for |',
  '|---|---|',
  '| `sfx/alarm_beep.mp3` | short, piercing digital alarm burst (≈0.5 s). Placed repeatedly for ringing. |',
  '| `sfx/slap.mp3` | palm slapping the snooze button |',
  '| `sfx/whoosh.mp3` | whip-pans, the hook shatter, swipes |',
  '| `sfx/bass_hit.mp3` | massive sub drop (hook at 1.5 s, summit, title) |',
  '| `sfx/impact.mp3` | punchy hit / thud (landing, cuts, title letters) |',
  '| `sfx/heartbeat.mp3` | single lub-dub |',
  '| `sfx/rain.mp3` | loopable rain bed (≥ 10 s) |',
  '| `sfx/wind.mp3` | loopable wind bed (≥ 10 s) |',
  '',
  '## The audio hook (0–90)',
  '',
  `- **Frame ${HOOK.alarm}** — loud alarm beep, no silence before it.`,
  `- **Frame ${HOOK.vo} (0:00.40)** — VO: “Nobody was coming to save him.”`,
  `- **Frame ${HOOK.impact} (0:01.50)** — massive \`bass_hit\` + \`whoosh\`, synced to the divider shattering (A) / brows slamming (B) / landing (C).`,
  `- **Frames ${HOOK.silence}–${HOOK.end} (2.5–3.0 s)** — dead silence except one \`heartbeat\` at frame ${HOOK.heartbeat}. Music does not start until frame ${MUSIC.start}.`,
  '',
  '## All cues',
  '',
  '| frame | time | file | vol | length | hook variant | note |',
  '|---:|---:|---|---:|---|---|---|',
  ...rows.map(line),
  '',
  '## Music bed',
  '',
  `\`public/audio/music.mp3\` starts at **frame ${MUSIC.start} (${tc(MUSIC.start)})** — after the hook's dead silence. Its volume follows this envelope (eased between keys):`,
  '',
  '| frame | time | volume |',
  '|---:|---:|---:|',
  ...MUSIC.envelope.map(([f, v]) => `| ${f} | ${tc(f)} | ${v.toFixed(2)} |`),
  '',
  'Grid: **80 BPM** (1 beat = 22.5 frames). Act 2 cuts land every 2 beats (45 frames). Pick or edit music at 80 BPM (or 160) with the',
  'downbeat at 0:47.00 so the montage stays beat-synced; or change `BPM`/`MONTAGE_BEAT` in timing.ts.',
  '',
  '## Voice-over',
  '',
  VO_MODE === 'stem'
    ? '`public/audio/vo.mp3` is placed at **frame 0** as one stem aligned to film time (first line at 0:00.40 inside the file). See VOICEOVER.md.'
    : 'VO is placed per line: `public/audio/vo/line_NN.mp3` at the frames listed in VOICEOVER.md.',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'SFX_CUES.md'), sfxDoc);

/* ───────── VOICEOVER.md ───────── */
const words = VO_LINES.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
const WPS = 2.4; // deep, calm delivery
const voRows = VO_LINES.map((l, i) => {
  const next = VO_LINES[i + 1]?.at ?? DURATION;
  const est = l.text.split(/\s+/).length / WPS + 0.25;
  const window = (next - l.at) / FPS;
  const flag = est > window ? ' ⚠️ tight' : '';
  return `| ${String(i + 1).padStart(2, '0')} | ${tc(l.at)} | ${l.at} | ${sceneOf(l.at)} | ${l.text} | ${est.toFixed(1)} s / ${window.toFixed(1)} s${flag} |`;
});
const voDoc = [
  '# VOICEOVER — DISCIPLINE',
  '',
  `> Generated from \`VO_LINES\` in \`src/timing.ts\` by \`npm run docs\`. ${VO_LINES.length} lines · ${words} words · ${tc(DURATION)}.`,
  '',
  '## Voice',
  '',
  '- **Deep, calm, low and close** — a man telling you something true, not hyping you up. No “movie trailer” voice.',
  '- Short sentences. Let the silences land: the film is built around them (dead silence at 0:02.5, 1 s at 0:42, near-silence 1:17–1:39).',
  '- Slight warmth rises from Act 2 on; the last two lines are almost a smile.',
  '- Target ≈ 2.4 words/s, −16 LUFS integrated, light compression, no reverb tail longer than 0.4 s.',
  '',
  '## Delivery notes',
  '',
  '- **0:00 hook** — first word lands at 0:00.40, under the alarm. Flat, certain: *Nobody was coming to save him.*',
  '- **Act 1** — tired, almost bored. The repetition is the point.',
  '- **Turning point** — slower. Leave air after “His excuses.” *Day thirty* is a statement, not a reveal.',
  '- **Act 2** — on the beat. Clipped. One line per cut feels right; don’t rush to fill.',
  '- **Doubt** — barely there. Most of this section is rain.',
  '- **Act 3** — building. “Motivation leaves. / Discipline stays.” is the thesis — give it weight, not volume.',
  '- **Finale** — “He saved himself.” is the emotional payoff; then silence for the title; read the final line slowly over the card.',
  '',
  '## Script & timing',
  '',
  '`est / window` = estimated read time vs. time until the next line.',
  '',
  '| # | time | frame | scene | line | est / window |',
  '|---:|---:|---:|---|---|---|',
  ...voRows,
  '',
  '## Delivering the file',
  '',
  VO_MODE === 'stem'
    ? '- **Current mode: `stem`.** Export ONE file `public/audio/vo.mp3`, full length, aligned so its 0:00 = film 0:00 (pad the start: the first line begins at 0:00.40). Easiest: record/edit against the rendered video.'
    : '- **Current mode: `lines`.** Export one file per line: `public/audio/vo/line_01.mp3 … line_NN.mp3`; each plays at its frame above.',
  '- Switch modes with `VO_MODE` in `src/timing.ts` (`\'stem\' | \'lines\'`). `lines` is ideal for TTS (one generation per line).',
  '- To retime a line, edit its `at:` in `VO_LINES`, then `npm run docs`.',
  '',
  '## Full script (read-through)',
  '',
  ...VO_LINES.map((l) => `> ${l.text}`),
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'VOICEOVER.md'), voDoc);
console.log(`✓ SFX_CUES.md (${rows.length} cues)  ✓ VOICEOVER.md (${VO_LINES.length} lines, ${words} words)`);
