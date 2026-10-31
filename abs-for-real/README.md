# Abs For Real: presale TikTok (Remotion)

Vertical 1080×1920, 30 fps, H.264, AAC. Fully typographic (no footage, no AI-generated people), with a
synthetic voiceover, a procedural 130 BPM beat and sound effects, all synced frame-accurately.

## Compositions
- `AbsForRealLong`: ~28 s, full script, triple hook (voice + visual + music drop on "LYING").
- `AbsForRealShort`: ~16 s, scenes 1, 4, 5, 6 (voice spoken 6% faster, tighter tails).
- `Thumbnail`: still, hook frame H1 (lime screen, "30 days" struck through).

## Render
```bash
cd abs-for-real
npm install
npm run render:all          # out/abs-for-real-long.mp4, out/abs-for-real-short.mp4, out/thumbnail.png
npm run studio              # preview / scrub in Remotion Studio
```
If you already have Chromium and don't want Remotion to download one:
`BROWSER_EXECUTABLE=/path/to/chromium npm run render:all`.

## Audio + timing (only needed if you change the script, the voice or the music)
```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r audio/requirements.txt
# Kokoro model files (kokoro-v1.0.onnx + voices-v1.0.bin) from
# https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into ~/models
python3 audio/build_audio.py --models ~/models [--voice af_bella] [--speed 1.08]
```
This writes `public/audio/{long,short}.wav` and `src/timing/{long,short}.json`. The Remotion scenes read
the JSON, so every visual cue lands on the word that triggers it, and every cut lands on a beat.

How the timeline is built: each on-screen beat is one voice fragment (cached in `audio/lines/`).
Fragments are placed with small pauses, cues are derived from where each fragment starts, and the next
cut is quantized up to the music grid (beat 0 = the "LYING" drop). The music is composed to that
timeline: intro riser → drop → groove → arpeggio on "CAN do" → breakdown with logo plucks → price
drop → CTA hit. Voice sits ~8 dB above the ducked bed; the mix is leveled to -14 LUFS, -1 dBFS peaks.

To use your own voice: record each fragment, save it over the matching file in `audio/lines/`
(16-bit WAV, any sample rate), rerun the audio build and render.

## Structure
- `src/theme.ts`: palette (#0E0F10 / #FFFFFF / #C8FF3D), font (Archivo 900, width 80%), TikTok-safe box.
- `src/fonts.ts`: loads the variable Archivo TTF from `public/fonts` (OFL licence in the same folder).
- `src/anim.ts`: punch, slam, shake, pulse, drift, overshoot, impact flash.
- `src/components.tsx`: `Safe` (middle-third box), `Txt`, `Plate` (lime plate), `Strike`, `Underline`, `Flash`, `Move`.
- `src/Logo.tsx`: SVG mark, 2×3 rounded rectangles, last one lime with an animated check.
- `src/scenes/*`: one file per scene, driven by the cue sheet.
- `src/Videos.tsx`: lays the scenes out from `src/timing/*.json`, adds the audio and the beat pump.
- `audio/build_audio.py`: voice (Kokoro ONNX), procedural music, SFX, mix, cue sheet.
- `PUBLISH.md`: caption, hashtags, upload notes.

## Safety rules baked in
Text lives in y 560–1360 px with 150 px right margin (TikTok UI never covers it).
Flashes stay under 3 per second, shakes last at most 3 frames.
No countdown, no "spots left", no guaranteed results; "results vary" is on screen during the benefits scene.
