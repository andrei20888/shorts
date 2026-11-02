# DISCIPLINE — production plan

**2:30 · 1920×1080 + 1080×1920 · 30 fps · 4 500 frames · Remotion (React + TS) · 100 % code-drawn SVG**

Status: **Step 3 — released.** Style approved; polish pass done (`review/04_all_shots.jpg` = one still per shot); final films, hook clips, thumbnails and `PUBLISH.md` are in `../output/short03_discipline/`. Audio is still the synthesized placeholder set (no voice-over yet).

---

## 1. Timeline (all frames live in `src/timing.ts`)

| time | frames | scene | shots | palette | DAY |
|---|---|---|---|---|---|
| 0:00–0:03 | 0–90 | **Triple hook** | variant A / B / C | split: night ↔ sunrise | 1 ↔ 365 |
| 0:03–0:25 | 90–750 | **Act 1 · The Struggle** | alarm 5:00 → snooze again (wide) → phone glow → the feed → junk food → mirror, looks away → the loop | near-black blues `#0E0F14` | 1 |
| 0:25–0:47 | 750–1410 | **Turning point** | lying awake → close-up, brows sad → angry-determined → days blur → alarm rings, he's ALREADY sitting up → 1 s silence → feet hit the floor, rises, out the door | night → pre-dawn | 1 → 30 |
| 0:47–1:17 | 1410–2310 | **Act 2 · The Grind** | 20 beat-synced cuts (45 f = 2 beats @ 80 BPM), whip-pans: run (street / hill), push-ups, books, cold water (mirror rhyme), checklist, **same 5:00 alarm shot ×3 — he wakes faster each time** | grey-blue | 30 → 180 |
| 1:17–1:39 | 2310–2970 | **The Doubt** | climbing in the rain, slowing → slumps, sits on a step → long pull-out: the stairs never end | sand, washed by rain | 200 → 250 |
| 1:39–2:05 | 2970–3750 | **Act 3 · The Climb** | looks up, brows → determined, ties the red headband, stands → climbs faster (face close-up, wide, low-angle roll) as the flight curves up into the sun | sand → orange `#C08A5B` | 270 → 364 |
| 2:05–2:30 | 3750–4500 | **Finale** | same bedroom at 5:00, bed EMPTY, sunrise floods in (hook payoff) → silhouette on the summit vs. the sun, **DAY 365** → D-I-S-C-I-P-L-I-N-E → final line | sunrise purple → orange → gold | 365 |

Retiming: change a duration in the `lay(...)` lists → everything after it (shots, beats, SFX, VO, day counter, impacts) shifts. `npm run docs` rewrites `SFX_CUES.md` + `VOICEOVER.md`.

## 2. The triple hook (0–3 s)

Every variant shares the audio skeleton: **alarm at frame 0 → VO at 0.4 s → bass hit + whoosh at 1.5 s → dead silence + one heartbeat (2.5–3 s)**, the 2-frame flash *“This is what happened.”* (f75–76), and continuity into Act 1 on the glowing 5:00.

| f | A — split DAY 1 / DAY 365 | B — eyes ECU | C — the fall |
|---|---|---|---|
| 0 | already moving: alarm ringing, “He” pops | eyes closed, tired brows, alarm | summit silhouette vs. sun, camera already falling |
| 5–20 | arm sneaks out, **slaps snooze** (f20) | eyes **snap open** (f2–5), dart to the clock | fall accelerates down the winding flight |
| 0–43 | 8 words pop on a 6-frame grid | 6 words | 5 words |
| 37–44 | divider **cracks** | brows sink into worry | sky darkens to night |
| **45** | **shatter** — DAY 365 breaks into shards, DAY 1 swallows the screen | brows **slam** into angry-determined | **lands** at the bed |
| 46–60 | **slam zoom into the 5:00 clock** (exp. zoom + zoom lines) | punch-in, tremble | bounce, push to the clock |
| 75 | flash card, silence | flash card | flash card |
| 78 | heartbeat, clock glow pulses | heartbeat | heartbeat |

Rules checked: something changes ≤ every 15 f; handheld noise on every camera; the clock digits use a near-white core + red bloom so they read as the hottest light in the frame.

## 3. Style guide (`src/config/theme.ts`)

- **Line**: off-white `#E8E4D8`, 3 px, round caps — `vector-effect: non-scaling-stroke`, so it stays 3 px at any zoom (slam zooms included).
- **Boil**: `feTurbulence` + `feDisplacementMap`, applied in screen space, seed changes every 3 frames (“on threes”).
- **Grain**: procedural noise tiles, jittered per frame (overlay + a little normal). **Vignette**: soft radial. **Impacts**: shake + punch-in + RGB split on every entry in `IMPACTS`.
- **Character**: cream `#EDE6D3` bean, outer outline off-white, inner overlaps get a thin ink line; far limbs a shade darker. Dark dot eyes, thick brows — the brows carry every emotion. Ambient tint per act, light overlays (phone blue, clock red, sunrise gold) that never tint the eyes/brows.
- **Accent**: the alarm red becomes the Act 3 headband and survives on the finale silhouette.
- **Type**: Nunito 900 (bundled, OFL), white with thick dark outline; ≤ 8 words on screen.
- **Camera**: every shot moves (push / pan / handheld noise), all eased — `EASE` in `src/lib/anim.ts`; no linear tweens.

## 4. Vertical 9:16

Same scenes, re-framed. Camera zoom is *area-normalised* (a world unit is the same pixel size in both crops), portrait cameras get per-shot center/zoom overrides, Hook A splits top/bottom instead of left/right, and all text has portrait line breaks (`COPY.*.portrait`). Labels sit below the TikTok top-UI band.

## 5. Architecture

```
src/
  timing.ts              ← every frame: scenes, shots, beats, DAY keys, impacts, SFX, music envelope, VO lines, stills
  config/theme.ts        ← palettes, line, FX knobs, type sizes
  config/copy.ts         ← every on-screen word
  characters/            ← Bean.tsx (rig) · rig.ts (FK/IK) · poses.ts (poses + cycles) · moods.ts · Arm.tsx
  props/                 ← Bedroom, AlarmClock (7-seg), Stairs (endless wavy), Sky, Sets (phone, mirror, desk, notebook, street, hill, food)
  fx/                    ← GlobalDefs (boil), Grain, Vignette, ImpactLayer (shake + chroma), Whip, Atmos (rain, dust, speed lines)
  components/            ← Stage + camera, Text (kinetic words), DayLabel (odometer), Shot
  scenes/                ← Hook (+ hook/HookA|B|C), Act1Struggle, TurningPoint, Act2Grind, Doubt, Act3Climb, Finale
  audio/Soundtrack.tsx   ← every <Audio>, placed from timing.ts
  compositions/          ← Film (layer stack), CharacterSheet
```

### Rig API (`<Bean>`)
`pose` (preset · `'walk'`/`'run'` + `legPhase` · Pose object) · `eyebrowMood` (`tired | sad | determined | angry | proud | neutral | surprised | focused`, or `{from, to, t}` blend) · `armAngles` · `legPhase` · `blink` · plus `targets`/`worldTargets` (2-bone IK), `look`, `turn`, `lid`, `mouth`, `headband`, `light`, `ambient`, `silhouette`, `view: side | front`, `back`, `facing`, `reach`.
Cycles: `walk(phase)`, `run(phase)`, `climb(s, tread)` (feet land on real treads), `pushup(p)`, `sitUpInBed(t)`, `slump(t)`.

## 6. Audio

All cues are wired (`src/audio/Soundtrack.tsx`) and listed with exact frames in `SFX_CUES.md`; the narration script with timestamps is in `VOICEOVER.md` (41 lines, ~190 words). `public/audio/` holds **synthesized placeholders** (alarm, slap, whoosh, bass hit, impact, heartbeat, rain, wind + a temp score on the 80 BPM grid) so renders already have correct sync; VO is a silent placeholder. Replace any file with the same name.

## 7. Next steps

- Record the voice-over (`VOICEOVER.md`) and pick licensed music at 80 BPM, drop them into `public/audio/`, then `bash scripts/render-final.sh && node scripts/finish.mjs`.
- Optional polish: secondary animation (breathing, blanket cloth), match cuts between acts, turning-point fist clench, title-card shine.
