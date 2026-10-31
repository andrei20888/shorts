import type {CSSProperties} from 'react';

export const BG = '#0E0F10';
export const FG = '#FFFFFF';
export const LIME = '#C8FF3D';
export const ON_LIME = '#0E0F10';
export const MUTED = 'rgba(255,255,255,0.6)';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/** seconds -> frames */
export const sec = (s: number): number => Math.round(s * FPS);

/**
 * TikTok covers the bottom (caption, sound, actions) and the right column (buttons).
 * Everything lives in the middle third, with extra right margin.
 */
export const SAFE = {left: 60, right: 150, top: 560, bottom: 560};

export const FONT: CSSProperties = {
  fontFamily: 'Archivo, "Archivo Fallback", sans-serif',
  fontWeight: 900,
  fontStretch: '80%',
  letterSpacing: '-0.02em',
  lineHeight: 0.95,
  fontVariationSettings: '"wdth" 80, "wght" 900',
};
