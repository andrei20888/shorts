# Abs For Real: TikTok upload notes

## Files
- `out/abs-for-real-long.mp4`: main post (28 s), voice + music + SFX in the file
- `out/abs-for-real-short.mp4`: short cut (16 s): hook, "honest one" + logo, price, date, CTA
- `out/thumbnail.png`: cover (hook frame, lime screen)

## Caption (under 150 characters)
Every "abs in 30 days" app is lying. I'm building the honest one. Founder spots: 29 € lifetime. Starts Nov 7. Link in bio.

(122 characters)

## Hashtags
#absforreal #honestfitness #coreworkout #fitnessmyths #buildinpublic

## Upload checklist
- Sound is already in the file (original, royalty-free: generated in `audio/build_audio.py`). Do NOT add a TikTok library sound on top; keep "original sound".
- The voice is synthetic (Kokoro TTS). Turn on TikTok's "AI-generated content" label. If you record the lines yourself, drop the WAVs into `audio/lines/` (same file names) and run `npm run audio` + `npm run render:all`; the cut re-times itself to your delivery.
- Cover: upload `thumbnail.png` as the custom cover, or pick the frame at 1.0 s.
- Captions are burned in, mid-screen; no need for TikTok auto-captions.
- Keep the caption's claims aligned with the video: no guaranteed results, no countdown, no invented scarcity.
