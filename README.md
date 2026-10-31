# Cosmic Scale — Shorts pipeline

Production pipeline for **@CosmicScaleShorts**: fully offline, deterministic, one command per video.

```
brand/            logo + banner sources (HTML) and rendered PNGs (see brand/README.md, brand/BRAND.md)
content/scripts/  one JSON per Short: voice lines, captions, pauses, facts, YouTube metadata
pipeline/
  audio/tts.py    Kokoro TTS (ONNX, offline) → voice.wav + timeline.json (line/word timings, countdown)
  audio/music.py  procedural cinematic score + SFX (risers, impacts, heartbeat, ping) aligned to the timeline
  render/         three.js scene (Earth, gas giant, stars, ray-marched black hole) + 2D HUD/captions,
                  rendered frame-by-frame in headless Chromium (Playwright) and piped to ffmpeg
  compose/mux.py  voice-ducked mix at -14 LUFS, muxed into final.mp4
  build_short.py  orchestrator
out/<id>/         final.mp4, metadata.json (title/description/hashtags), intermediates
```

## Setup (once)
```bash
cd pipeline && npm install && cd ..
pip3 install kokoro-onnx soundfile numpy
bash pipeline/models/fetch.sh          # ~340 MB Kokoro model + voices (GitHub releases)
```
Requires: ffmpeg (libx264 + aac), Node 20+, Playwright's Chromium, fonts Inter / Inter Display / JetBrains Mono.

## Build a Short
```bash
python3 pipeline/build_short.py content/scripts/001-earth-to-ton618.json
```
Preview a few frames without a full render (PNGs in `out/<id>/preview/`):
```bash
python3 pipeline/build_short.py content/scripts/001-earth-to-ton618.json --preview "0,300,900,1300"
```
Full render ≈ 30–40 min on 4 CPU cores (software WebGL). Re-run only one stage with `--skip tts,music` etc.

## Writing a new script
Copy `content/scripts/001-earth-to-ton618.json`. Each **beat** maps to a scene in `pipeline/render/main.js`
(`earth`, `jupiter`, `sun`, `betelgeuse`, `find_sun`, `stephenson`, `one_more`, `ton618`, `nested`, `cta`).
Each **line** has the spoken text, an on-screen caption (`*word*` = highlighted in ice-blue, `\n` = line break)
and a pause after it. Numbers in captions count up automatically. `{N}` in the hook is replaced with the real
countdown length measured from the timeline.

Retention devices built in: triple hook (visual Earth + caption + spoken promise with a countdown),
a scale jump with sub-bass impact every ~5 s, a pause-and-find challenge, a payoff (“GONE.”) at countdown zero,
a comment prompt + next-episode tease, and a seamless loop (last frame ≈ first frame).
