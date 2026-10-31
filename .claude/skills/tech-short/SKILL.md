---
name: tech-short
description: Create or re-render a Tech Breakdown (@TechBreakdown3D) YouTube Short with this repo's 3D pipeline (Three.js isometric scenes + Kokoro voice + synthesized music/SFX). Use when asked for a new Short, a new topic, or changes to an existing video, banner or logo.
---

# Tech Breakdown Short — workflow

Pipeline: `videos/<id>/script.json` → `python3 engine/build.py videos/<id>` → `output/<id>.mp4` (1080×1920, 30 fps, -14 LUFS).

## New Short in 4 steps
1. Copy `videos/01-microchip/` to `videos/NN-topic/`, set `id` in `script.json`.
2. Write `beats` (one idea each; `say` = spoken, numbers as words; optional `caption` with digits, `pre`, `hold`, `pause`).
   Required shape (see docs/PLAYBOOK.md): triple hook in beat 1 (visual slam + text counter/headline + curiosity line),
   re-hook ~every 6 s, one comment question (music `break` + `pill`), a reveal with riser→impact, last line flows into the first (loop).
3. Write `scene.js`: build sets from `engine/kit/models.js`, schedule everything from beat/word times
   (`B(id).start`, `W(id, 'word')`), add overlay calls (`ov.counter/headline/callout/pill/tag/flash`) and sound `cue(t, name)`.
   SFX names: whoosh impact riser blip pop zap ding glitch swell tick hum rumble, plus `break` (mutes drums for `dur`).
   Last frame must equal first frame (seamless loop).
4. Check stills before the full render (~6-8 min per 45 s):
   `python3 engine/build.py videos/NN-topic --skip-render` (TTS + timeline, ignore the final mux error), then
   `node engine/render.mjs still videos/NN-topic/scene.js "/tmp/f%d.png" --timeline build/NN-topic/timeline.json --t 0.1,3,8,15`
   and finally `python3 engine/build.py videos/NN-topic --skip-tts`.

## Style rules
- Palette from `engine/kit/stage.js` `C`: navy bg, silver/steel metal, teal glow for "active/energy", `hot` only for heat/fire.
- Emissive materials bloom (threshold 1.5); keep glows small or they blow out.
- Text safe zone: headlines at y 0.11–0.2, captions at 0.6, prompts ≤ 0.76; nothing important in the right 120 px or bottom 20 %.
- English voice-over, `af_heart` @ 1.1 speed by default.

## Setup on a fresh machine
`npm install`, `pip install kokoro-onnx soundfile scipy`, Playwright + Chromium, ffmpeg, and the Kokoro model files
(`kokoro-v1.0.onnx`, `voices-v1.0.bin` from github.com/thewh1teagle/kokoro-onnx releases `model-files-v1.0`) in `~/.cache/tb-models`.
