# SFX CUES — DISCIPLINE

> Generated from `src/timing.ts` by `npm run docs`. 30 fps · 4500 frames (2:30.00).
> Every cue is already wired in `src/audio/Soundtrack.tsx` — drop a file with the same name into
> `public/audio/sfx/` and it plays at that exact frame. Missing files are skipped, never fail a render.

## Files

| file | used for |
|---|---|
| `sfx/alarm_beep.mp3` | short, piercing digital alarm burst (≈0.5 s). Placed repeatedly for ringing. |
| `sfx/slap.mp3` | palm slapping the snooze button |
| `sfx/whoosh.mp3` | whip-pans, the hook shatter, swipes |
| `sfx/bass_hit.mp3` | massive sub drop (hook at 1.5 s, summit, title) |
| `sfx/impact.mp3` | punchy hit / thud (landing, cuts, title letters) |
| `sfx/heartbeat.mp3` | single lub-dub |
| `sfx/rain.mp3` | loopable rain bed (≥ 10 s) |
| `sfx/wind.mp3` | loopable wind bed (≥ 10 s) |

## The audio hook (0–90)

- **Frame 0** — loud alarm beep, no silence before it.
- **Frame 12 (0:00.40)** — VO: “Nobody was coming to save him.”
- **Frame 45 (0:01.50)** — massive `bass_hit` + `whoosh`, synced to the divider shattering (A) / brows slamming (B) / landing (C).
- **Frames 75–90 (2.5–3.0 s)** — dead silence except one `heartbeat` at frame 78. Music does not start until frame 90.

## All cues

| frame | time | file | vol | length | hook variant | note |
|---:|---:|---|---:|---|---|---|
| 0 | 0:00.00 | `alarm_beep.mp3` | 1.00 | cut @ 20f | A | HOOK: frame 0 alarm, no silence before it |
| 0 | 0:00.00 | `alarm_beep.mp3` | 1.00 | full | B | HOOK: frame 0 alarm — eyes snap open |
| 0 | 0:00.00 | `alarm_beep.mp3` | 0.85 | full | C | HOOK: frame 0 alarm, far below (we fall toward it) |
| 4 | 0:00.13 | `whoosh.mp3` | 0.90 | full | C | HOOK C: the fall |
| 20 | 0:00.67 | `slap.mp3` | 0.90 | full | A | HOOK A: hand slaps snooze |
| 45 | 0:01.50 | `bass_hit.mp3` | 1.00 | full | all | HOOK: massive bass hit at 1.5 s |
| 45 | 0:01.50 | `impact.mp3` | 0.80 | full | C | HOOK C: landing at the bed |
| 45 | 0:01.50 | `whoosh.mp3` | 1.00 | full | A | HOOK A: divider shatters (synced to bass hit) |
| 45 | 0:01.50 | `whoosh.mp3` | 0.90 | full | B | HOOK B: brows slam down |
| 78 | 0:02.60 | `heartbeat.mp3` | 1.00 | full | all | HOOK: dead silence + single heartbeat → Act 1 |
| 96 | 0:03.20 | `alarm_beep.mp3` | 0.90 | full | all | ACT 1: 5:00 alarm rings again |
| 114 | 0:03.80 | `alarm_beep.mp3` | 0.90 | full | all | ACT 1: 5:00 alarm rings again |
| 140 | 0:04.67 | `slap.mp3` | 0.90 | full | all | ACT 1: snooze |
| 210 | 0:07.00 | `alarm_beep.mp3` | 0.75 | full | all | ACT 1: alarm, wide shot |
| 242 | 0:08.07 | `slap.mp3` | 0.80 | full | all | ACT 1: snooze AGAIN |
| 389 | 0:12.97 | `whoosh.mp3` | 0.25 | full | all | ACT 1: thumb swipe |
| 411 | 0:13.70 | `whoosh.mp3` | 0.25 | full | all | ACT 1: thumb swipe |
| 431 | 0:14.37 | `whoosh.mp3` | 0.25 | full | all | ACT 1: thumb swipe |
| 678 | 0:22.60 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 690 | 0:23.00 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 700 | 0:23.33 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 708 | 0:23.60 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 714 | 0:23.80 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 720 | 0:24.00 | `whoosh.mp3` | 0.30 | full | all | ACT 1: loop recap cut |
| 730 | 0:24.33 | `impact.mp3` | 0.50 | full | all | ACT 1: flops into bed |
| 882 | 0:29.40 | `heartbeat.mp3` | 0.35 | full | all | TURNING: heartbeat, building |
| 918 | 0:30.60 | `heartbeat.mp3` | 0.44 | full | all | TURNING: heartbeat, building |
| 952 | 0:31.73 | `heartbeat.mp3` | 0.53 | full | all | TURNING: heartbeat, building |
| 982 | 0:32.73 | `heartbeat.mp3` | 0.63 | full | all | TURNING: heartbeat, building |
| 1010 | 0:33.67 | `heartbeat.mp3` | 0.72 | full | all | TURNING: heartbeat, building |
| 1034 | 0:34.47 | `heartbeat.mp3` | 0.81 | full | all | TURNING: heartbeat, building |
| 1056 | 0:35.20 | `heartbeat.mp3` | 0.90 | full | all | TURNING: heartbeat, building |
| 1080 | 0:36.00 | `whoosh.mp3` | 0.60 | full | all | TURNING: days blur by |
| 1102 | 0:36.73 | `impact.mp3` | 0.70 | full | all | TURNING: DAY 30 lands |
| 1150 | 0:38.33 | `alarm_beep.mp3` | 0.90 | full | all | TURNING: alarm — he is already sitting up |
| 1168 | 0:38.93 | `alarm_beep.mp3` | 0.90 | full | all | TURNING: alarm — he is already sitting up |
| 1186 | 0:39.53 | `alarm_beep.mp3` | 0.90 | full | all | TURNING: alarm — he is already sitting up |
| 1304 | 0:43.47 | `impact.mp3` | 0.35 | full | all | TURNING: feet hit the floor |
| 1405 | 0:46.83 | `whoosh.mp3` | 0.80 | full | all | TURNING: whip into Act 2 |
| 1414 | 0:47.13 | `alarm_beep.mp3` | 0.80 | full | all | ACT 2: 5:00 alarm #1 (wakes faster) |
| 1452 | 0:48.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → run |
| 1497 | 0:49.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → pushup |
| 1542 | 0:51.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → books |
| 1587 | 0:52.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → water |
| 1632 | 0:54.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → checklist |
| 1677 | 0:55.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → run |
| 1722 | 0:57.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → alarm |
| 1729 | 0:57.63 | `alarm_beep.mp3` | 0.80 | full | all | ACT 2: 5:00 alarm #2 (wakes faster) |
| 1767 | 0:58.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → pushup |
| 1812 | 1:00.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → books |
| 1857 | 1:01.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → water |
| 1902 | 1:03.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → checklist |
| 1947 | 1:04.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → run |
| 1992 | 1:06.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → alarm |
| 1999 | 1:06.63 | `alarm_beep.mp3` | 0.80 | full | all | ACT 2: 5:00 alarm #3 (wakes faster) |
| 2037 | 1:07.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → pushup |
| 2082 | 1:09.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → books |
| 2127 | 1:10.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → water |
| 2172 | 1:12.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → checklist |
| 2217 | 1:13.90 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → run |
| 2262 | 1:15.40 | `whoosh.mp3` | 0.38 | full | all | ACT 2: whip-pan → run |
| 2309 | 1:16.97 | `impact.mp3` | 0.55 | full | all | ACT 2 → DOUBT: hard cut |
| 2310 | 1:17.00 | `rain.mp3` | 0.70 | loop 680f | all | DOUBT: rain bed |
| 2460 | 1:22.00 | `wind.mp3` | 0.40 | loop 570f | all | DOUBT: wind |
| 2530 | 1:24.33 | `heartbeat.mp3` | 0.30 | full | all | DOUBT: slow heartbeat |
| 2572 | 1:25.73 | `heartbeat.mp3` | 0.25 | full | all | DOUBT: slow heartbeat |
| 3070 | 1:42.33 | `impact.mp3` | 0.60 | full | all | ACT 3: headband knot pulled tight |
| 3116 | 1:43.87 | `whoosh.mp3` | 0.60 | full | all | ACT 3: he takes off |
| 3120 | 1:44.00 | `wind.mp3` | 0.45 | loop 630f | all | ACT 3: rising wind |
| 3450 | 1:55.00 | `whoosh.mp3` | 0.50 | full | all | ACT 3: camera swoop |
| 3540 | 1:58.00 | `whoosh.mp3` | 0.50 | full | all | ACT 3: camera swoop |
| 3630 | 2:01.00 | `whoosh.mp3` | 0.50 | full | all | ACT 3: camera swoop |
| 3746 | 2:04.87 | `bass_hit.mp3` | 0.90 | full | all | ACT 3 → FINALE: flash |
| 3780 | 2:06.00 | `alarm_beep.mp3` | 0.70 | full | all | FINALE: 5:00 alarm rings to an empty room |
| 3930 | 2:11.00 | `bass_hit.mp3` | 1.00 | full | all | FINALE: summit, DAY 365 |
| 3930 | 2:11.00 | `wind.mp3` | 0.35 | loop 420f | all | FINALE: summit wind |
| 4184 | 2:19.47 | `impact.mp3` | 0.22 | full | all | TITLE: letter D |
| 4189 | 2:19.63 | `impact.mp3` | 0.22 | full | all | TITLE: letter I |
| 4194 | 2:19.80 | `impact.mp3` | 0.22 | full | all | TITLE: letter S |
| 4199 | 2:19.97 | `impact.mp3` | 0.22 | full | all | TITLE: letter C |
| 4204 | 2:20.13 | `impact.mp3` | 0.22 | full | all | TITLE: letter I |
| 4209 | 2:20.30 | `impact.mp3` | 0.22 | full | all | TITLE: letter P |
| 4214 | 2:20.47 | `impact.mp3` | 0.22 | full | all | TITLE: letter L |
| 4219 | 2:20.63 | `impact.mp3` | 0.22 | full | all | TITLE: letter I |
| 4224 | 2:20.80 | `impact.mp3` | 0.22 | full | all | TITLE: letter N |
| 4229 | 2:20.97 | `bass_hit.mp3` | 0.80 | full | all | TITLE: last letter lands |
| 4229 | 2:20.97 | `impact.mp3` | 0.90 | full | all | TITLE: letter E |
| 4474 | 2:29.13 | `heartbeat.mp3` | 0.80 | full | all | END: final heartbeat (bookends the hook) |

## Music bed

`public/audio/music.mp3` starts at **frame 90 (0:03.00)** — after the hook's dead silence. Its volume follows this envelope (eased between keys):

| frame | time | volume |
|---:|---:|---:|
| 90 | 0:03.00 | 0.00 |
| 102 | 0:03.40 | 0.50 |
| 740 | 0:24.67 | 0.50 |
| 760 | 0:25.33 | 0.28 |
| 1110 | 0:37.00 | 0.30 |
| 1256 | 0:41.87 | 0.30 |
| 1260 | 0:42.00 | 0.00 |
| 1290 | 0:43.00 | 0.00 |
| 1310 | 0:43.67 | 0.35 |
| 1410 | 0:47.00 | 0.85 |
| 2304 | 1:16.80 | 0.85 |
| 2314 | 1:17.13 | 0.10 |
| 2970 | 1:39.00 | 0.12 |
| 3120 | 1:44.00 | 0.45 |
| 3740 | 2:04.67 | 1.00 |
| 4170 | 2:19.00 | 0.90 |
| 4460 | 2:28.67 | 0.60 |
| 4500 | 2:30.00 | 0.00 |

Grid: **80 BPM** (1 beat = 22.5 frames). Act 2 cuts land every 2 beats (45 frames). Pick or edit music at 80 BPM (or 160) with the
downbeat at 0:47.00 so the montage stays beat-synced; or change `BPM`/`MONTAGE_BEAT` in timing.ts.

## Voice-over

`public/audio/vo.mp3` is placed at **frame 0** as one stem aligned to film time (first line at 0:00.40 inside the file). See VOICEOVER.md.
