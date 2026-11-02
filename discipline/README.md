# DISCIPLINE

A 2:30 minimalist 2D motivational short, drawn entirely in code (SVG) with [Remotion](https://remotion.dev).
Plan, story and style guide: **[PLAN.md](PLAN.md)** · Sound: **[SFX_CUES.md](SFX_CUES.md)** · Narration: **[VOICEOVER.md](VOICEOVER.md)** · Review stills: **[review/](review)**

## Quick start

```bash
npm install
npm run dev                 # Remotion Studio (scrub every composition)
```

| composition | size | frames |
|---|---|---|
| `Discipline` | 1920×1080 | 4500 (hook A) |
| `Discipline-Vertical` | 1080×1920 | 4500 |
| `Hook-A` · `Hook-B` · `Hook-C` | 1920×1080 | 180 (first 6 s with that hook) |
| `Hook-*-Vertical` | 1080×1920 | 180 |
| `Thumbnail` · `Thumbnail-Vertical` | 1920×1080 · 1080×1920 | DAY 1 vs DAY 365 cover |
| `CharacterSheet` | 1920×1080 | rig / mood model sheet |

## Render

```bash
npm run stills                          # review stills → out/stills (hooks f0/15/45/75 ×3, 6 key moments, rig)
npm run stills -- hooks-vertical key-vertical
npm run stills -- Discipline:1174       # any comp:frame
npx remotion still Hook-B out/hookB.png --frame=45

npm run render                          # out/discipline_16x9.mp4   (H.264, CRF 18)
npm run render:vertical                 # out/discipline_9x16.mp4
npm run render:hooks                    # out/hook_A.mp4, hook_B.mp4, hook_C.mp4
npm run render:all

# Release pipeline (what produced ../output/short03_discipline/)
bash scripts/render-final.sh            # bundle once → out/final/: both films + 6 hook clips (16:9 + 9:16), CRF 18
node scripts/finish.mjs                 # → out/release/ (−14 LUFS, video untouched) + web copies & thumbnails in ../output/
npm run stills -- Thumbnail:0 Thumbnail-Vertical:0
```

No internet / custom Chrome? Point Remotion at a local Chrome Headless Shell:
`REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell npm run render`.

## Tweak

- **Timing** — `src/timing.ts`. Durations cascade; beats, SFX, VO, the DAY counter and impacts follow. Then `npm run docs`.
- **Colors, line weight, boil, grain, vignette, shake, type sizes** — `src/config/theme.ts`.
- **Every on-screen word** — `src/config/copy.ts` (`/` = line break, separate landscape/portrait breaks).
- **Hook variant in the main film** — `defaultProps.variant` in `src/Root.tsx` (or pass `--props='{"variant":"B"}'`).

## Audio

```
public/audio/music.mp3            original score (npm run audio:score → scripts/gen_score.py), starts at frame 90
public/audio/vo/line_01.mp3 …     processed VO lines (npm run audio:vo), each plays at its frame in timing.ts
public/audio/sfx/alarm_beep.mp3 slap.mp3 whoosh.mp3 bass_hit.mp3 impact.mp3 heartbeat.mp3 rain.mp3 wind.mp3
```

VO: raw takes live in `audio_src/vo_raw/` (`scripts/fetch-vo.sh` re-downloads them). After changing a line or its
start frame: `npm run audio:vo` (real durations → `src/config/voTiming.ts`, processed lines, per-line ducking measured against `out/score.wav` from `npm run audio:score` →
`src/config/voDuck.ts`), then `npm run docs`. The score needs `pip install numpy scipy`; the VO step needs
`pip install soundfile pyloudnorm`. SFX are synthesized (`npm run audio:placeholders`, needs `ffmpeg`).
A missing file is skipped — it never breaks a render. Exact frames for every cue: `SFX_CUES.md`.
