import type { Palette } from '../config/theme';

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('');

/** Mix two hex colors (t=0 → a, t=1 → b). */
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

export const alpha = (hex: string, a: number) => {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Interpolate every color token of two palettes. */
export const mixPalette = (a: Palette, b: Palette, t: number): Palette => {
  const out = {} as Record<string, string | number>;
  for (const k of Object.keys(a) as Array<keyof Palette>) {
    const va = a[k];
    const vb = b[k];
    out[k] = typeof va === 'number' ? va + ((vb as number) - va) * t : mix(va, vb as string, t);
  }
  return out as unknown as Palette;
};
