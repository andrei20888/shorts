# Abs For Real: presale TikTok (Remotion)

Vertical 1080×1920, 30 fps, H.264, no audio in the file (add a sound from TikTok's commercial library at upload).
Fully typographic: no footage folder existed, no AI-generated people.

## Compositions
- `AbsForReal28`: 29.0 s (870 frames), full script, triple hook.
- `AbsForReal15`: 15.0 s (450 frames), scenes 1, 4, 5, 6.
- `Thumbnail`: still, hook frame H1 (lime screen, "30 days" struck through).

## Render
```bash
cd abs-for-real
npm install
npm run render:all          # out/abs-for-real-28s.mp4, out/abs-for-real-15s.mp4, out/thumbnail.png
npm run studio              # preview / scrub in Remotion Studio
```
If you already have Chromium and don't want Remotion to download one:
`BROWSER_EXECUTABLE=/path/to/chromium npm run render:all`.

## Structure
- `src/theme.ts`: palette (#0E0F10 / #FFFFFF / #C8FF3D), font (Archivo 900, width 80%), TikTok-safe box.
- `src/fonts.ts`: loads the variable Archivo TTF from `public/fonts` (OFL licence in the same folder).
- `src/anim.ts`: punch, slam, shake, pulse, drift, overshoot, impact flash.
- `src/components.tsx`: `Safe` (middle-third box), `Txt`, `Plate` (lime plate), `Strike`, `Underline`, `Flash`, `Move`.
- `src/Logo.tsx`: SVG mark, 2×3 rounded rectangles, last one lime with an animated check.
- `src/scenes/*`: one file per scene; every beat time is a frame constant at the top of the file.
- `src/Videos.tsx`: the two timelines (cuts laid back to back) and the thumbnail.
- `PUBLISH.md`: caption, hashtags, upload notes.

## Safety rules baked in
Text lives in y 560–1360 px with 150 px right margin (TikTok UI never covers it).
Flashes stay under 3 per second, shakes last at most 3 frames.
No countdown, no "spots left", no guaranteed results; "results vary" is on screen during the benefits scene.
