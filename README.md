# Tech Breakdown — Shorts pipeline

Isometric 3D explainers (silver + teal on navy), rendered from code.

```
brand/     logo (800/1600 px), banner (2560x1440), fonts, source pages
engine/    Three.js stage + models, renderers, TTS, audio mixer
shorts/    one folder per Short: script.json → timeline.json → scene.html → final.mp4
```

## Make a Short

1. Write `shorts/NNN-name/script.json` (lines + pauses).
2. Voice-over and word timings:
   ```bash
   python3 engine/tts/make_vo.py shorts/NNN-name
   ```
3. Build `scene.html` (copy 001 as a template; it exposes `renderAt(t)` and sound cues).
4. Preview frames:
   ```bash
   node engine/still.js shorts/NNN-name/scene.html /tmp/f.png 1080 1920 1 0.5,5,10
   ```
5. Render video, mix audio, mux:
   ```bash
   node engine/render.js shorts/NNN-name/scene.html shorts/NNN-name/_work/render --workers 2
   python3 engine/audio/mix.py shorts/NNN-name
   engine/mux.sh shorts/NNN-name
   ```

## Setup in a fresh container

```bash
cd engine && npm install
pip install kokoro-onnx soundfile scipy
curl -L -o engine/tts/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o engine/tts/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

## Every Short follows the same retention recipe

- **Triple hook in the first 3 s:** a visual shock, an on-screen number or claim, and a spoken claim.
- **Interaction at about 3 s:** a quiz or poll that makes the viewer pick an answer.
- **An open loop:** a running gauge (scale ruler, counter) that only resolves near the end.
- **A pattern break every 1.5–2.5 s:** a cut, zoom, stamp, pop or sound hit.
- **The payoff, then a CTA with concrete options** to drive comments.
- **The last frame equals the first frame,** so the Short loops seamlessly.
