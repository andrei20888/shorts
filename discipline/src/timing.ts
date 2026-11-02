/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DISCIPLINE — MASTER TIMING SHEET  (30 fps · 4500 frames · 2:30)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every scene / shot / beat / cue frame of the film is defined in this file.
 *
 *  HOW TO RETIME
 *   • Change a shot duration in the `lay(...)` lists below. Starts are derived,
 *     so everything after it (shots, beats, SFX, VO, day counter) shifts with it.
 *   • Beat offsets (e.g. `at(shot, 50)`) are relative to their shot start.
 *   • Run `npm run docs` to regenerate SFX_CUES.md and VOICEOVER.md from here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { HookVariant } from './config/copy';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const sec = (s: number) => Math.round(s * FPS);

/** Music grid used for montage cuts. 80 BPM → 22.5 f / beat, 2 beats = 1.5 s. */
export const BPM = 80;
export const BEAT = (60 / BPM) * FPS;
export const MONTAGE_BEAT = 45;

export type Span = { start: number; end: number; dur: number };

type ShotList<K extends string> = ReadonlyArray<readonly [K, number]>;
const lay = <K extends string>(start: number, list: ShotList<K>) => {
  const shots = {} as Record<K, Span>;
  let t = start;
  for (const [id, dur] of list) {
    shots[id] = { start: t, end: t + dur, dur };
    t += dur;
  }
  return { start, end: t, dur: t - start, shots };
};
/** Absolute frame `offset` frames into a span. */
const at = (s: Span, offset: number) => s.start + offset;

/* ═════════════════════════════ SCENES & SHOTS ═════════════════════════════ */

/** 0:00 – 0:03 · TRIPLE HOOK */
const hook = lay(0, [['main', 90]] as const);

/** 0:03 – 0:25 · ACT 1 – THE STRUGGLE (fast cuts ≈ 3 s) */
const act1 = lay(hook.end, [
  ['alarm', 96], //   5:00 close-up → snooze again
  ['bed', 90], //     wide: blanket over head, snooze AGAIN
  ['phone', 105], //  scrolling in bed, phone glow on face
  ['scroll', 75], //  phone screen close-up, endless feed
  ['junk', 105], //   junk food
  ['mirror', 105], // mirror — looks away
  ['loop', 84], //    the loop repeats, faster and faster
] as const);

/** 0:25 – 0:47 · THE TURNING POINT */
const turning = lay(act1.end, [
  ['awakeWide', 120], //  lying awake, overhead
  ['awakeClose', 210], // eyebrows: sad → angry-determined
  ['dayJump', 30], //     DAY 1 → DAY 30
  ['sittingUp', 150], //  alarm rings — he's ALREADY sitting up, staring at it
  ['silence', 30], //     1 s of dead silence
  ['getsUp', 120], //     he gets up
] as const);

/** 0:47 – 1:17 · ACT 2 – THE GRIND (montage, one cut every MONTAGE_BEAT) */
export type MontageKind = 'alarm' | 'run' | 'pushup' | 'books' | 'water' | 'checklist';
export const MONTAGE_ORDER: MontageKind[] = [
  'alarm', 'run', 'pushup', 'books', 'water', 'checklist',
  'run', 'alarm', 'pushup', 'books', 'water', 'checklist',
  'run', 'alarm', 'pushup', 'books', 'water', 'checklist',
  'run', 'run',
];
const act2 = lay(
  turning.end,
  MONTAGE_ORDER.map((_, i) => [`b${i}`, MONTAGE_BEAT] as const),
);

/** 1:17 – 1:39 · THE DOUBT (near-silence) */
const doubt = lay(act2.end, [
  ['climbSlow', 150], // climbing in the rain, slowing
  ['slump', 150], //     slumps, sits on a step
  ['pullOut', 360], //   camera pulls out: the stairs are endless
] as const);

/** 1:39 – 2:05 · ACT 3 – THE CLIMB */
const act3 = lay(doubt.end, [
  ['rise', 150], //   looks up, headband on, stands
  ['climb', 330], //  climbs faster and faster
  ['ascent', 300], // staircase curves upward, light warms
] as const);

/** 2:05 – 2:30 · FINALE */
const finale = lay(act3.end, [
  ['emptyRoom', 180], // 5:00, bed EMPTY, sunrise floods the room (hook payoff)
  ['summit', 240], //    silhouette on top against the sun — DAY 365
  ['title', 180], //     D I S C I P L I N E
  ['quote', 150], //     final line
] as const);

export const SCENES = { hook, act1, turning, act2, doubt, act3, finale };
export const DURATION = finale.end; // 4500
export const HOOK_PREVIEW_DURATION = sec(6);

/* ═════════════════════════════ ACT 2 MONTAGE ═════════════════════════════ */

export type MontageBeat = Span & { kind: MontageKind; index: number; rep: number };
export const MONTAGE: MontageBeat[] = MONTAGE_ORDER.map((kind, index) => {
  const span = act2.shots[`b${index}` as keyof typeof act2.shots] as Span;
  const rep = MONTAGE_ORDER.slice(0, index).filter((k) => k === kind).length;
  return { ...span, kind, index, rep };
});
/** Visual rhyme: frames after the beep before he sits up, alarm #1/#2/#3. */
export const ALARM_WAKE_DELAY = [24, 10, 1];
export const ALARM_BEEP_OFFSET = 4;
/** Whip-pan length (frames) on each side of a montage cut. */
export const WHIP_FRAMES = 4;

/* ═════════════════════════════ HOOK (0–90) ═════════════════════════════ */

export const HOOK = {
  alarm: 0, //        loud alarm beep — no silence before it
  vo: 12, //          0.4 s: "Nobody was coming to save him."
  slap: 20, //        (A) hand slaps snooze
  crack: 37, //       (A) divider starts cracking
  impact: 45, //      1.5 s: shatter / brows slam / landing — bass hit + whoosh
  slamEnd: 60, //     (A) slam zoom lands on the 5:00 clock
  silence: 75, //     2.5 s: dead silence
  flash: 75, //       2-frame flash "This is what happened."
  flashDur: 2,
  heartbeat: 78, //   single heartbeat
  end: hook.end,
} as const;

/** Frame each hook word pops in (one per beat). Last word lands on the impact. */
export const HOOK_WORDS: Record<HookVariant, number[]> = {
  A: [0, 6, 12, 18, 24, 32, 38, 43], //  He woke up at 5AM / for 365 days.
  B: [4, 11, 18, 26, 34, 43], //         Day 1 of becoming / someone else.
  C: [5, 13, 21, 30, 43], //             Every staircase / starts in bed.
};

/* ═════════════════════════════ STORY BEATS ═════════════════════════════ */

const s1 = act1.shots;
const s2 = turning.shots;
const s4 = doubt.shots;
const s5 = act3.shots;
const s6 = finale.shots;

export const BEATS = {
  act1: {
    alarmRings: [at(s1.alarm, 6), at(s1.alarm, 24)],
    alarmSlap: at(s1.alarm, 50),
    bedRing: at(s1.bed, 24),
    bedSlap: at(s1.bed, 56),
    swipes: [at(s1.scroll, 8), at(s1.scroll, 30), at(s1.scroll, 50)],
    /** Rapid recap cuts inside the loop shot (absolute frames). */
    loopCuts: [at(s1.loop, 0), at(s1.loop, 14), at(s1.loop, 26), at(s1.loop, 36), at(s1.loop, 44), at(s1.loop, 50), at(s1.loop, 56)],
    loopFlop: at(s1.loop, 64),
  },
  turning: {
    browShift: [at(s2.awakeClose, 40), at(s2.awakeClose, 175)] as const,
    fistClench: at(s2.awakeClose, 150),
    heartbeats: [12, 48, 82, 112, 140, 164, 186].map((o) => at(s2.awakeClose, o)),
    dayLand: at(s2.dayJump, 22),
    clockFlip: at(s2.sittingUp, 36), //   4:59 → 5:00
    alarmRings: [at(s2.sittingUp, 40), at(s2.sittingUp, 58), at(s2.sittingUp, 76)],
    alarmOff: at(s2.sittingUp, 104),
    standUp: at(s2.getsUp, 8),
  },
  doubt: {
    stop: at(s4.climbSlow, 125),
    sitDown: [at(s4.slump, 30), at(s4.slump, 95)] as const,
  },
  act3: {
    lookUp: at(s5.rise, 14),
    browShift: [at(s5.rise, 22), at(s5.rise, 62)] as const,
    headbandTie: [at(s5.rise, 50), at(s5.rise, 100)] as const,
    standUp: [at(s5.rise, 104), at(s5.rise, 138)] as const,
    flashOut: act3.end - 8,
  },
  finale: {
    alarmRing: at(s6.emptyRoom, 30),
    day365: at(s6.emptyRoom, 44),
    bigDay: at(s6.summit, 30),
    /** Title letters D-I-S-C-I-P-L-I-N-E pop every N frames from here. */
    titleStart: at(s6.title, 14),
    titleEvery: 5,
    quoteStart: at(s6.quote, 6),
  },
};

/* ═════════════════════════════ DAY COUNTER ═════════════════════════════ */

export type DayKey = { at: number; day: number; roll: number };
/** At frame `at`, roll from the previous value to `day` over `roll` frames. */
export const DAY_KEYS: DayKey[] = [
  { at: act1.start, day: 1, roll: 0 },
  { at: s2.dayJump.start, day: 30, roll: 24 },
  ...MONTAGE.slice(1).map((b, i) => ({
    at: b.start,
    day: Math.round(30 + (150 * (i + 1)) / (MONTAGE.length - 1)),
    roll: 10,
  })),
  { at: doubt.start, day: 200, roll: 14 },
  { at: at(s4.pullOut, 20), day: 250, roll: 320 },
  { at: act3.start, day: 270, roll: 14 },
  { at: s5.climb.start, day: 364, roll: act3.end - 30 - s5.climb.start },
  { at: BEATS.finale.day365, day: 365, roll: 12 },
];
/** Top-left "DAY X" label is visible in this window. */
export const DAY_LABEL = { from: act1.start + 3, to: s6.summit.start + 28 };

/* ═════════════════════════════ IMPACTS (shake + chroma) ═════════════════════════════ */

export type Impact = { at: number; strength: number; variants?: HookVariant[] };
export const IMPACTS: Impact[] = [
  { at: HOOK.impact, strength: 1 },
  { at: BEATS.act1.alarmSlap, strength: 0.35 },
  { at: BEATS.act1.bedSlap, strength: 0.3 },
  { at: BEATS.act1.loopFlop, strength: 0.3 },
  { at: BEATS.turning.dayLand, strength: 0.45 },
  ...MONTAGE.slice(1).map((b) => ({ at: b.start, strength: 0.16 })),
  { at: doubt.start, strength: 0.25 },
  { at: BEATS.act3.headbandTie[1], strength: 0.35 },
  { at: s5.ascent.end - 4, strength: 0.6 },
  { at: s6.summit.start, strength: 0.5 },
  { at: BEATS.finale.titleStart + BEATS.finale.titleEvery * 9, strength: 0.55 },
];

/* ═════════════════════════════ AUDIO ═════════════════════════════ */

export type SfxName =
  | 'alarm_beep'
  | 'slap'
  | 'whoosh'
  | 'bass_hit'
  | 'impact'
  | 'heartbeat'
  | 'rain'
  | 'wind';

export type Cue = {
  sfx: SfxName;
  at: number;
  volume: number;
  /** Frames to play (cuts the sound); loops repeat until this length. */
  dur?: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  /** Only for these hook variants (hook cues). */
  variants?: HookVariant[];
  note: string;
};

const c = (sfx: SfxName, frame: number, volume: number, note: string, extra: Partial<Cue> = {}): Cue => ({
  sfx,
  at: frame,
  volume,
  note,
  ...extra,
});

export const SFX_CUES: Cue[] = [
  // ── HOOK ──
  c('alarm_beep', HOOK.alarm, 1, 'HOOK: frame 0 alarm, no silence before it', { dur: HOOK.slap, variants: ['A'] }),
  c('alarm_beep', HOOK.alarm, 1, 'HOOK: frame 0 alarm — eyes snap open', { variants: ['B'] }),
  c('alarm_beep', HOOK.alarm, 0.85, 'HOOK: frame 0 alarm, far below (we fall toward it)', { variants: ['C'] }),
  c('slap', HOOK.slap, 0.9, 'HOOK A: hand slaps snooze', { variants: ['A'] }),
  c('whoosh', HOOK.impact, 0.7, 'HOOK A: divider shatters (synced to bass hit)', { variants: ['A'] }),
  c('whoosh', HOOK.impact, 0.65, 'HOOK B: brows slam down', { variants: ['B'] }),
  c('whoosh', 4, 0.9, 'HOOK C: the fall', { variants: ['C'] }),
  c('bass_hit', HOOK.impact, 0.85, 'HOOK: massive bass hit at 1.5 s'),
  c('impact', HOOK.impact, 0.6, 'HOOK C: landing at the bed', { variants: ['C'] }),
  c('heartbeat', HOOK.heartbeat, 1, 'HOOK: dead silence + single heartbeat → Act 1'),
  // ── ACT 1 ──
  ...BEATS.act1.alarmRings.map((f) => c('alarm_beep', f, 0.9, 'ACT 1: 5:00 alarm rings again')),
  c('slap', BEATS.act1.alarmSlap, 0.9, 'ACT 1: snooze'),
  c('alarm_beep', BEATS.act1.bedRing, 0.75, 'ACT 1: alarm, wide shot'),
  c('slap', BEATS.act1.bedSlap, 0.8, 'ACT 1: snooze AGAIN'),
  ...BEATS.act1.swipes.map((f) => c('whoosh', f, 0.25, 'ACT 1: thumb swipe')),
  ...BEATS.act1.loopCuts.slice(1).map((f) => c('whoosh', f - 2, 0.3, 'ACT 1: loop recap cut')),
  c('impact', BEATS.act1.loopFlop, 0.5, 'ACT 1: flops into bed'),
  // ── TURNING POINT ──
  ...BEATS.turning.heartbeats.map((f, i) =>
    c('heartbeat', f, 0.35 + (0.55 * i) / (BEATS.turning.heartbeats.length - 1), 'TURNING: heartbeat, building'),
  ),
  c('whoosh', s2.dayJump.start, 0.6, 'TURNING: days blur by'),
  c('impact', BEATS.turning.dayLand, 0.7, 'TURNING: DAY 30 lands'),
  ...BEATS.turning.alarmRings.map((f) => c('alarm_beep', f, 0.9, 'TURNING: alarm — he is already sitting up')),
  c('impact', BEATS.turning.standUp + 6, 0.35, 'TURNING: feet hit the floor'),
  c('whoosh', s2.getsUp.end - 5, 0.8, 'TURNING: whip into Act 2'),
  // ── ACT 2 ──
  ...MONTAGE.filter((b) => b.kind === 'alarm').map((b) =>
    c('alarm_beep', b.start + ALARM_BEEP_OFFSET, 0.8, `ACT 2: 5:00 alarm #${b.rep + 1} (wakes faster)`),
  ),
  ...MONTAGE.slice(1).map((b) => c('whoosh', b.start - 3, 0.38, `ACT 2: whip-pan → ${b.kind}`)),
  c('impact', act2.end - 1, 0.55, 'ACT 2 → DOUBT: hard cut'),
  // ── DOUBT ──
  c('rain', doubt.start, 0.7, 'DOUBT: rain bed', { dur: doubt.dur + 20, loop: true, fadeIn: 8, fadeOut: 40 }),
  c('wind', s4.slump.start, 0.4, 'DOUBT: wind', { dur: s4.slump.dur + s4.pullOut.dur + 60, loop: true, fadeIn: 40, fadeOut: 50 }),
  c('heartbeat', s4.slump.start + 70, 0.3, 'DOUBT: slow heartbeat'),
  c('heartbeat', s4.slump.start + 112, 0.25, 'DOUBT: slow heartbeat'),
  // ── ACT 3 ──
  c('impact', BEATS.act3.headbandTie[1], 0.6, 'ACT 3: headband knot pulled tight'),
  c('whoosh', s5.rise.end - 4, 0.6, 'ACT 3: he takes off'),
  c('wind', s5.climb.start, 0.45, 'ACT 3: rising wind', { dur: s5.climb.dur + s5.ascent.dur, loop: true, fadeIn: 120, fadeOut: 20 }),
  ...[0, 90, 180].map((o) => c('whoosh', s5.ascent.start + o, 0.5, 'ACT 3: camera swoop')),
  c('bass_hit', s5.ascent.end - 4, 0.9, 'ACT 3 → FINALE: flash'),
  // ── FINALE ──
  c('alarm_beep', BEATS.finale.alarmRing, 0.7, 'FINALE: 5:00 alarm rings to an empty room'),
  c('bass_hit', s6.summit.start, 1, 'FINALE: summit, DAY 365'),
  c('wind', s6.summit.start, 0.35, 'FINALE: summit wind', { dur: s6.summit.dur + s6.title.dur, loop: true, fadeIn: 20, fadeOut: 60 }),
  ...Array.from({ length: 10 }, (_, i) =>
    c('impact', BEATS.finale.titleStart + i * BEATS.finale.titleEvery, i === 9 ? 0.9 : 0.22, `TITLE: letter ${'DISCIPLINE'[i]}`),
  ),
  c('bass_hit', BEATS.finale.titleStart + 9 * BEATS.finale.titleEvery, 0.8, 'TITLE: last letter lands'),
  c('heartbeat', finale.end - 26, 0.8, 'END: final heartbeat (bookends the hook)'),
];

/** Music bed (public/audio/music.mp3) starts after the hook's dead silence. */
export const MUSIC = {
  start: act1.start,
  /** [frame, volume] keyframes — eased between points. */
  envelope: [
    [act1.start, 0],
    [act1.start + 12, 0.5],
    [act1.end - 10, 0.5],
    [turning.start + 10, 0.28],
    [s2.sittingUp.start, 0.3],
    [s2.silence.start - 4, 0.3],
    [s2.silence.start, 0],
    [s2.silence.end, 0],
    [s2.getsUp.start + 20, 0.35],
    [act2.start, 0.85],
    [act2.end - 6, 0.85],
    [doubt.start + 4, 0.1],
    [doubt.end, 0.12],
    [s5.climb.start, 0.45],
    [act3.end - 10, 1],
    [s6.title.start, 0.9],
    [finale.end - 40, 0.6],
    [finale.end, 0],
  ] as Array<[number, number]>,
};

/**
 * Voice-over. VO_MODE 'stem': public/audio/vo.mp3 is ONE full-length stem aligned
 * to film time 0:00 (first line sits at 0:00.4 inside the file).
 * VO_MODE 'lines': drop public/audio/vo/line_01.mp3 … and each plays at its frame.
 */
export const VO_MODE: 'stem' | 'lines' = 'stem';
export type VoLine = { at: number; text: string };
export const VO_LINES: VoLine[] = [
  { at: HOOK.vo, text: 'Nobody was coming to save him.' },
  { at: sec(4.2), text: 'Every morning started the same way.' },
  { at: sec(7.6), text: 'Snooze. Again. And again.' },
  { at: sec(10.6), text: 'He kept telling himself: tomorrow.' },
  { at: sec(13.6), text: 'Tomorrow turned into a habit.' },
  { at: sec(16.3), text: 'He fed the comfort. Starved the dream.' },
  { at: sec(19.6), text: 'And the person in the mirror…' },
  { at: sec(22.6), text: '…became a stranger.' },
  { at: sec(26.6), text: 'Then one night, something broke.' },
  { at: sec(30.6), text: 'Not his heart.' },
  { at: sec(33.0), text: 'His excuses.' },
  { at: sec(36.2), text: 'Day thirty.' },
  { at: sec(37.8), text: "The alarm didn't wake him." },
  { at: sec(40.4), text: 'He was waiting for it.' },
  { at: sec(43.6), text: 'And he got up.' },
  { at: sec(47.8), text: 'No one was watching.' },
  { at: sec(50.0), text: 'No one clapped.' },
  { at: sec(52.4), text: 'He ran while the city slept.' },
  { at: sec(55.8), text: 'He read when he wanted to scroll.' },
  { at: sec(59.4), text: 'He chose cold water over warm excuses.' },
  { at: sec(63.6), text: 'Five A.M. Every. Single. Day.' },
  { at: sec(67.8), text: "He didn't feel like it." },
  { at: sec(70.4), text: 'He did it anyway.' },
  { at: sec(73.4), text: 'Day after day after day.' },
  { at: sec(80.0), text: 'Around day two hundred, the stairs stopped ending.' },
  { at: sec(86.6), text: 'Progress went quiet.' },
  { at: sec(92.0), text: 'And quiet is where most people quit.' },
  { at: sec(96.0), text: 'He almost stayed there.' },
  { at: sec(99.6), text: "But he'd learned something." },
  { at: sec(102.2), text: 'Motivation leaves.' },
  { at: sec(104.2), text: 'Discipline stays.' },
  { at: sec(108.4), text: 'One step.' },
  { at: sec(110.4), text: 'Then the next.' },
  { at: sec(112.6), text: 'Then the next.' },
  { at: sec(116.0), text: 'His legs burned. He kept going.' },
  { at: sec(119.6), text: 'Three hundred sixty-four days of showing up.' },
  { at: sec(125.6), text: 'Day three hundred sixty-five.' },
  { at: sec(128.6), text: 'The alarm rang… to an empty room.' },
  { at: sec(132.6), text: 'Nobody came to save him.' },
  { at: sec(135.8), text: 'He saved himself.' },
  { at: sec(145.4), text: 'Motivation gets you started. Discipline keeps you going.' },
];

/* ═════════════════════════════ REVIEW STILLS ═════════════════════════════ */

export const HOOK_STILL_FRAMES = [0, 15, 45, 75];
export const KEY_MOMENTS: Array<{ name: string; frame: number; label: string }> = [
  { name: '1_act1_phone', frame: at(s1.phone, 62), label: 'Act 1 — phone glow, tired brows' },
  { name: '2_turning_alarm', frame: at(s2.sittingUp, 64), label: 'Turning point — already sitting up, staring at the alarm' },
  { name: '3_act2_run', frame: MONTAGE[1].start + 24, label: 'Act 2 — running in the dark' },
  { name: '4_doubt_pullout', frame: at(s4.pullOut, 230), label: 'Doubt — the endless staircase' },
  { name: '5_act3_climb', frame: at(s5.climb, 250), label: 'Act 3 — the climb, staircase curves up, light warms' },
  { name: '6_finale_summit', frame: at(s6.summit, 110), label: 'Finale — DAY 365 against the sun' },
];
