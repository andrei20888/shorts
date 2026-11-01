/**
 * DISCIPLINE — look & feel. Every color, line weight and FX knob lives here.
 * Tweak values in this file; nothing else hardcodes a color.
 */

export const COLORS = {
  /** Thin "hand-drawn" outline used on every prop / environment line. */
  line: '#E8E4D8',
  /** Hero character fill. */
  cream: '#EDE6D3',
  /** Far-side limbs (gives the flat character a hint of depth). */
  creamShade: '#CFC6B0',
  /** Eyes, eyebrows, inner separation lines. */
  ink: '#15161B',
  /** Hook / title text. */
  text: '#FFFFFF',
  textStroke: '#0A0A0F',
  /** The alarm clock: the brightest thing on screen. */
  clockRed: '#FF3B30',
  clockCore: '#FFE9E4',
  clockGhost: '#2A1013',
  /** Act 3 headband (the alarm red, carried into the climb). */
  headband: '#E5382E',
  phoneGlow: '#9CC2FF',
  black: '#06060A',
} as const;

/** One palette per story beat. Scenes interpolate between them with mixPalette(). */
export type Palette = {
  bg: string;
  wall: string;
  wallShade: string;
  floor: string;
  fill: string;
  fill2: string;
  fill3: string;
  blanket: string;
  blanketShade: string;
  line: string;
  skyTop: string;
  skyBottom: string;
  /** Ambient light the character picks up (mixed into the cream). */
  ambient: string;
  ambientAmount: number;
};

export const PALETTES = {
  /** Act 1 — near-black blues. */
  night: {
    bg: '#0E0F14',
    wall: '#12141B',
    wallShade: '#0C0D12',
    floor: '#0A0B0F',
    fill: '#171A23',
    fill2: '#1C202D',
    fill3: '#262B3B',
    blanket: '#1F2639',
    blanketShade: '#171C2B',
    line: COLORS.line,
    skyTop: '#070912',
    skyBottom: '#141A2E',
    ambient: '#5E6E99',
    ambientAmount: 0.34,
  },
  /** Turning point — the hour before dawn. */
  predawn: {
    bg: '#11141D',
    wall: '#161A25',
    wallShade: '#10131B',
    floor: '#0C0E14',
    fill: '#1C2130',
    fill2: '#222839',
    fill3: '#2C3347',
    blanket: '#242C42',
    blanketShade: '#1B2133',
    line: COLORS.line,
    skyTop: '#0B1020',
    skyBottom: '#28304A',
    ambient: '#6F7FA8',
    ambientAmount: 0.28,
  },
  /** Act 2 — grey-blue grind. */
  grind: {
    bg: '#29313E',
    wall: '#2F3846',
    wallShade: '#262D39',
    floor: '#212833',
    fill: '#3A4453',
    fill2: '#434E5F',
    fill3: '#4D596B',
    blanket: '#3E4A5E',
    blanketShade: '#343F51',
    line: COLORS.line,
    skyTop: '#1E2532',
    skyBottom: '#5A6577',
    ambient: '#8E9BB0',
    ambientAmount: 0.16,
  },
  /** The doubt — sand tones, washed out by rain. */
  doubt: {
    bg: '#6F675F',
    wall: '#776E64',
    wallShade: '#655D55',
    floor: '#5C554E',
    fill: '#A08B72',
    fill2: '#8C7962',
    fill3: '#B49D80',
    blanket: '#8C7962',
    blanketShade: '#7A6955',
    line: COLORS.line,
    skyTop: '#5E5953',
    skyBottom: '#8F857A',
    ambient: '#9A9488',
    ambientAmount: 0.2,
  },
  /** Act 3 — warm sand / orange. */
  climb: {
    bg: '#C08A5B',
    wall: '#C9956A',
    wallShade: '#B07C50',
    floor: '#A8744A',
    fill: '#D6A574',
    fill2: '#BE8C5E',
    fill3: '#E2B887',
    blanket: '#BE8C5E',
    blanketShade: '#A97A50',
    line: COLORS.line,
    skyTop: '#B3714A',
    skyBottom: '#E7B27A',
    ambient: '#FFC88F',
    ambientAmount: 0.18,
  },
  /** Finale / DAY 365 — sunrise room. */
  sunrise: {
    bg: '#2A1A33',
    wall: '#3A2536',
    wallShade: '#2E1D2C',
    floor: '#24161F',
    fill: '#4A2E3E',
    fill2: '#573547',
    fill3: '#6B4253',
    blanket: '#7A4A4F',
    blanketShade: '#663D44',
    line: COLORS.line,
    skyTop: '#3B1E57',
    skyBottom: '#F2A54A',
    ambient: '#FFB27A',
    ambientAmount: 0.22,
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/** Finale sky: deep purple → orange → gold. */
export const SUNRISE = {
  top: '#2B1548',
  upper: '#6A2B5E',
  mid: '#D2603C',
  low: '#F39A3E',
  gold: '#F8CB5C',
  sun: '#FFE9A8',
  sunCore: '#FFF6D8',
  silhouette: '#1A0E1E',
  rim: '#FFD27A',
} as const;

export const LINE = {
  /** Screen-space line width (px), constant at any camera zoom. */
  width: 3,
  /** Inner separation lines on the character (px). */
  innerWidth: 2.5,
} as const;

export const FX = {
  boil: {
    /** Lower = longer wobble wavelength. */
    frequency: 0.011,
    octaves: 2,
    /** Displacement in px. */
    scale: 3.4,
    /** New noise seed every N frames ("animated on threes"). */
    everyNFrames: 3,
  },
  /** Grain re-rolls every `everyNFrames` (on twos keeps the bitrate sane at CRF 18). */
  grain: { opacity: 0.08, tileSize: 256, pixel: 3, everyNFrames: 2 },
  vignette: { strength: 0.62, inner: 0.52 },
  chroma: { maxOffset: 12 },
  shake: { maxPx: 22, decayFrames: 5 },
} as const;

export const TEXT = {
  family: 'Nunito',
  weight: 900,
  color: COLORS.text,
  stroke: COLORS.textStroke,
  /** Outline thickness as a fraction of font size (visible part is half). */
  strokeRatio: 0.2,
  hook: { landscape: 128, portrait: 118 },
  flash: { landscape: 150, portrait: 128 },
  /** null = keep emphasis words white (spec); set e.g. '#FFD166' to A/B a colored keyword. */
  emphasisColor: null as string | null,
  emphasisScale: 1.14,
  day: { landscape: 46, portrait: 54 },
  title: { landscape: 196, portrait: 132 },
  finalLine: { landscape: 76, portrait: 66 },
} as const;
