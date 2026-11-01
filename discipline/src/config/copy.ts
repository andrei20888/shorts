/**
 * DISCIPLINE — every on-screen word. "/" marks a line break.
 * Words are popped one by one at the frames listed in timing.ts (HOOK_WORDS).
 * Keep ≤ 8 words on screen at once.
 */
export type HookVariant = 'A' | 'B' | 'C';

type Lines = { landscape: string; portrait: string };

export const COPY = {
  hook: {
    A: {
      landscape: 'He woke up at 5AM / for 365 days.',
      portrait: 'He woke up / at 5AM / for 365 days.',
      emphasis: ['5AM', '365'],
    },
    B: {
      landscape: 'Day 1 of becoming / someone else.',
      portrait: 'Day 1 of / becoming / someone else.',
      emphasis: ['1', 'else.'],
    },
    C: {
      landscape: 'Every staircase / starts in bed.',
      portrait: 'Every / staircase / starts in bed.',
      emphasis: ['bed.'],
    },
  } satisfies Record<HookVariant, Lines & { emphasis: string[] }>,
  /** 2-frame flash at the end of every hook. */
  flash: { landscape: 'This is what / happened.', portrait: 'This is / what / happened.' } satisfies Lines,
  dayPrefix: 'DAY',
  title: 'DISCIPLINE',
  finalLine: {
    landscape: 'Motivation gets you started. / Discipline keeps you going.',
    portrait: 'Motivation gets / you started. / Discipline keeps / you going.',
  } satisfies Lines,
  /** Checklist page in the Act 2 montage. */
  checklist: ['5:00 WAKE', 'RUN', 'READ 20 PAGES', 'COLD WATER', 'NO EXCUSES'],
} as const;

export type Orientation = 'landscape' | 'portrait';

/** Split "a b / c d" into [["a","b"],["c","d"]]. */
export const toLines = (s: string): string[][] =>
  s
    .split('/')
    .map((l) => l.trim().split(/\s+/).filter(Boolean))
    .filter((l) => l.length > 0);
