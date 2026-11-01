import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FX } from '../config/theme';
import { hash } from '../lib/anim';

/** Procedural noise tile (seeded xorshift). Generated in code, once per tab. */
const makeTile = (seed: number, size: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = 0; i < size * size; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    const v = s & 255;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
};

/** Paints a jittered, tiled noise pattern synchronously (no async image loading). */
const GrainCanvas: React.FC<{ tile: HTMLCanvasElement; ox: number; oy: number; style: React.CSSProperties }> = ({ tile, ox, oy, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) return;
    pattern.setTransform(new DOMMatrix().translate(ox, oy).scale(FX.grain.pixel));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }, [tile, ox, oy, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }} />;
};

/** Animated film grain: 3 tiles cycled + jittered every frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = FX.grain.opacity }) => {
  const raw = useCurrentFrame();
  const frame = Math.floor(raw / FX.grain.everyNFrames);
  const tiles = useMemo(() => (typeof document === 'undefined' ? [] : [11, 23, 37].map((s) => makeTile(s, FX.grain.tileSize))), []);
  if (tiles.length === 0) return null;
  const tile = tiles[frame % tiles.length];
  const size = FX.grain.tileSize * FX.grain.pixel;
  const ox = Math.floor(hash(frame * 3.17) * size);
  const oy = Math.floor(hash(frame * 7.71 + 0.3) * size);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <GrainCanvas tile={tile} ox={ox} oy={oy} style={{ opacity, mixBlendMode: 'overlay' }} />
      <GrainCanvas tile={tile} ox={ox} oy={oy} style={{ opacity: opacity * 0.22 }} />
    </AbsoluteFill>
  );
};
