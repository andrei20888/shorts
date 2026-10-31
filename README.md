# Ancient Tech — Shorts Engine

Pipeline complet, offline, care transformă un script JSON într-un YouTube Short 1080×1920 @ 30 fps, în stilul canalului
**Ancient Tech (@AncientTech3D)**: reconstrucții 3D wireframe aurii pe fundal de piatră + grilă blueprint, HUD de inginerie,
subtitrări cinetice, voce documentar și sound design cinematic.

```
episodes/*.json  ──►  engine/build.py  ──►  output/<id>.mp4  (+ cover.jpg + metadata.md)
                        │
                        ├─ tts.py      voce (Kokoro, offline) + timing pe cuvinte (espeak-ng)
                        ├─ sfx.py      sound design procedural (drone, heartbeat, riser, impact, whoosh, chime…)
                        ├─ render.js   Chromium headless + Three.js → cadre → ffmpeg
                        └─ web/        compositor (fundal, bloom, HUD, captions, hook card, CTA) + scenes/*.js
```

## Structură

| Cale | Ce conține |
|---|---|
| `brand/` | logo, banner, `palette.json` (culorile canalului), fonturi (Cinzel, Inter, JetBrains Mono) |
| `episodes/` | scripturile episoadelor (hook, beats, cue-uri, SFX, CTA, metadata YouTube) |
| `engine/web/core/` | `compositor.js` (compune cadrul), `hud.js`, `captions.js`, `wire.js` (builder wireframe auriu), `camrig.js`, `bg.js` |
| `engine/web/scenes/` | o scenă 3D per episod: `polyspastos`, `antikythera`, `pyramid`, `screw`, `obelisk` |
| `output/` | clipurile finale + cover + metadata |
| `PLAYBOOK.md` | formula Triple Hook, structura de retenție, reguli de interacțiune, idei pentru următoarele episoade |

## Instalare (o singură dată)

```bash
cd engine && ./setup.sh
```
Instalează `kokoro-onnx`, `soundfile`, `espeak-ng`, descarcă modelul Kokoro (~350 MB, în `engine/models/`, ignorat de git)
și Playwright + Chromium dacă nu există deja. Necesită `ffmpeg` și `node` ≥ 18.

## Generare

```bash
# clip complet (voce → mix audio → randare → mux → output/)
python3 engine/build.py episodes/01-polyspastos.json

# doar cadre de verificare (rapid, fără randare completă)
python3 engine/build.py episodes/01-polyspastos.json --preview 0.6,5,12,25,40

# doar audio (work/<id>/mix.wav)
python3 engine/build.py episodes/01-polyspastos.json --audio-only
```
Un episod de ~55 s se randează în ~5 minute pe 4 nuclee (fără GPU). Fișierele intermediare stau în `work/<id>/`
(vocea e cache-uită: schimbi un singur beat, se regenerează doar acela).

## Cum adaugi un episod nou

1. **Scriptul** — copiază `episodes/01-polyspastos.json` și editează:
   * `hook`: `title` (număr/claim mare), `sub`, `tag` (eticheta roșie), `end` (secunde cât stă pe ecran).
   * `beats[]`: fiecare are `vo` (textul rostit), `keys` (cuvintele evidențiate cu auriu), `cue` (numele evenimentului pe care
     îl primește scena 3D), `sfx` (`"impact@0.0"`, `"riser@1.2"`… offset în secunde față de startul beat-ului),
     opțional `hud` (eticheta FIG. din stânga-sus), `prompt` (banda roșie de interacțiune: „PAUSE — …”),
     `number` + `count_from/count_to/unit/sub` (card numeric mare, cu numărătoare), `gap` (pauza după beat).
   * `cta_here: true` pe beat-ul în care vocea cere comentariul A/B; `cta` definește cardul final.
   * `metadata`: titlu, descriere, hashtaguri, comentariu fixat — ajung în `output/<id>.md`.
2. **Scena 3D** — creează `engine/web/scenes/<nume>.js` cu `export function create({THREE, wire, scene, camera, tl, E})`
   care construiește obiectele cu `wire.*` (`edges`, `box`, `cyl`, `gear`, `polyline`, `segments`, `nodes`, `figure`, `ground`)
   și returnează `{ update(api) }`. În `update`, `api.cue('nume')` dă secundele scurse de la cue (negativ = încă nu a venit),
   `api.project(vec3)` proiectează un punct 3D în pixeli pentru adnotări. Returnează
   `{ annotations:[{x,y,text,lx,ly,kind}], readouts:[{label,value,blink}], scans:[{t0,dur}], bloom }`.
   Camera se programează pe cue-uri cu `CamRig` (`add({at:'cue', pos, look, fov, orbit, drift, dur})`).
3. `python3 engine/build.py episodes/<id>.json --preview 1,10,20,30,40` → verifică cadrele din `work/<id>/preview/` → build complet.

## Voce

Kokoro (offline, 24 kHz). Voci recomandate pentru documentar: `bm_george` (folosită), `bm_daniel`, `am_onyx`, `am_michael`,
`bf_emma`. Se schimbă din `voice` / `speed` în JSON. Pentru voce premium (ElevenLabs etc.) pune fișierele WAV per beat în
`work/<id>/` cu numele din cache sau înlocuiește `tts.synth()`.

## Conectare skills / servicii (dacă vrei mai mult)

* **Skills Claude Code**: pune skill-urile în acest repo, în `.claude/skills/<nume>/SKILL.md` — le văd automat. Un repo separat
  de skills îl conectezi din claude.ai → Settings → Connectors → GitHub (dă acces la repo), apoi îmi spui numele lui și îl atașez sesiunii.
* **Voce premium**: cheie API ca *secret* în environment-ul Claude Code (Settings → Environments → Secrets) + hostul API în network policy.
* **Publicare**: Metricool e deja conectat (pot programa postări din clipurile din `output/`). Upload direct pe YouTube cere
  credențiale YouTube Data API (OAuth) în secrets.
* **Muzică licențiată**: pune track-uri în `assets/music/` și setează `"music": "assets/music/x.wav"` în `params` (bed-ul procedural rămâne fallback).
