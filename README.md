# Physics Sandbox (@PhysicsSandbox3D): brand + Shorts pipeline

Brand assets and 3D physics Shorts, rendered offline: Rapier for physics, Three.js in headless Chromium for 3D, ffmpeg for video and numpy for procedural sound.

## Output
- `output/brand/logo_800.png`: avatar YouTube (800×800, gândit pentru crop circular)
- `output/brand/logo_1600.png`: master
- `output/brand/banner_2560x1440.jpg` / `.png`: banner (textul stă integral în zona sigură 1546×423)
- `output/short01_last_ball_standing/`: Short #01 + `PUBLISH.md` (titlu, descriere, pinned comment)

## Structură
- `scenes/lib/lab.js`: look-ul „digital lab” (paletă, bloom, grid, texturi), streaming de cadre
- `scenes/lib/mark.js`: simbolul canalului (cub 2×2×2 + bloc care explodează + orbită)
- `scenes/logo.html`, `scenes/banner.html`: randări statice
- `sim/last_ball.mjs`: simularea „Last Ball Standing” (alegere seed + director de ritm)
- `scenes/last_ball.html`: randare 3D + overlay-uri (hook-uri, legendă, eliminări, câștigător)
- `tools/audio_last_ball.py`: muzică + SFX generate din evenimentele simulării
- `tools/render.js`: server local + Chromium → ffmpeg
- `discipline/`: **DISCIPLINE** — scurtmetraj animat 2:30 (Remotion + SVG, 16:9 și 9:16, 3 hook-uri A/B/C). Vezi `discipline/README.md` și `discipline/PLAN.md`

## Comenzi
```bash
npm install && pip install numpy scipy
node tools/render.js --page scenes/logo.html --still build/logo.png --w 800 --h 800 --dpr 2
node tools/render.js --page scenes/banner.html --still build/banner.png --w 2560 --h 1440 --dpr 1.5
node sim/last_ball.mjs --scan 1-40          # caută seed-ul cu cel mai bun ritm dramatic
tools/make_last_ball.sh 39 short01_last_ball_standing
```
Un episod nou = alt seed (alt câștigător, alte eliminări), adică un Short nou fără cod nou.
