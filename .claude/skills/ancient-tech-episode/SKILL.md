---
name: ancient-tech-episode
description: Create, preview and render a new Ancient Tech YouTube Short (episode JSON + Three.js scene) with the repo's engine. Use when the user asks for a new short/episode/clip for the Ancient Tech channel, or to re-render an existing one.
---

# Ancient Tech — new episode workflow

1. Read `PLAYBOOK.md` (triple hook, retention structure, interaction rules) and one existing script, e.g. `episodes/01-polyspastos.json`.
2. Pick the subject from the PLAYBOOK backlog (or the user's request). Verify the key numbers (two sources) before writing the hook.
3. Write `episodes/NN-slug.json`:
   - `hook.title` = one big number/claim (≤ 12 chars), `hook.sub` ≠ what the voice says, `hook.tag` = place · date.
   - 10–13 beats, one idea each, ≈ 55 s total. Every beat has a `cue` and at least one of: `sfx`, `number`, `prompt`, `hud`.
   - A `prompt` (red challenge strip) inside the first 12 s; `cta_here: true` on the last beat; `cta.a/b` = real backlog episodes.
   - `metadata`: title ≤ 60 chars with the hook number, description with sources, hashtags, pinned comment with A/B.
4. Write `engine/web/scenes/slug.js` following `engine/web/scenes/antikythera.js`: build with `wire.*`, camera with `CamRig` keyed to cue names, return `{annotations, readouts, scans}` from `update(api)`.
5. Syntax check: `node --experimental-default-type=module --check engine/web/scenes/slug.js`
6. Preview: `python3 engine/build.py episodes/NN-slug.json --preview 0.6,2,8,14,20,27,33,40,46` → inspect `work/NN-slug/preview/*.jpg` (subject fills the upper 60 %, captions readable, nothing vital in the bottom 300 px).
7. Render: `python3 engine/build.py episodes/NN-slug.json` → `output/NN-slug.mp4`, `.cover.jpg`, `.md` (title/description/pinned comment).
8. Commit `episodes/`, `engine/web/scenes/`, `output/` and report the title + CTA options.

Rendering takes ~5 min per episode on 4 CPU cores; run at most two renders in parallel.
