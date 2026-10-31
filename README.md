# Tech Breakdown (@TechBreakdown3D) — Shorts 3D

*How do everyday machines, microchips, rockets, and servers actually work? 3D visual breakdowns of complex technology made simple and satisfying.*

Animații 3D izometrice (argintiu + teal pe navy), generate 100 % din cod: modele procedurale Three.js, voce Kokoro TTS, muzică și efecte sonore sintetizate (fără probleme de copyright).

## Ce e aici
| | |
|---|---|
| `brand/banner-2560x1440.png` | Banner YouTube (text în zona sigură 1546×423, obiecte 3D pe desktop/TV) |
| `brand/logo-800.png` | Poză de profil 800×800 (încape în decupajul rotund) |
| `brand/watermark-150.png` | Watermark pentru video (YouTube Studio → Customization → Branding) |
| `output/*.mp4` | Shorts gata de urcat (1080×1920, 30 fps, audio -14 LUFS) |
| `videos/<id>/script.json` | Scriptul (beats, subtitrări, titlu, descriere, comentariu fixat) |
| `videos/<id>/scene.js` | Animația 3D sincronizată pe cuvinte |
| `docs/PLAYBOOK.md` | Formula: triplu hook, retenție, interacțiune, loop, idei următoare |
| `.claude/skills/tech-short/` | Skill pentru Claude Code: „fă un Short nou despre X” |

## Rulare
```bash
npm install
pip install kokoro-onnx soundfile scipy
python3 engine/build.py videos/01-microchip          # TTS -> randare 3D -> mix -> output/01-microchip.mp4
node engine/render.mjs still brand/banner.scene.js brand/banner-2560x1440.png --w 2560 --h 1440
```
Necesită ffmpeg, Playwright + Chromium și modelele Kokoro în `~/.cache/tb-models` (vezi skill-ul).

## Upload branding
YouTube Studio → **Customization → Branding**: Picture = `logo-800.png`, Banner = `banner-2560x1440.png`, Video watermark = `watermark-150.png`.
