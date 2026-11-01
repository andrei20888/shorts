import { noise2D } from '@remotion/noise';
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { HookVariant } from '../config/copy';
import { FX } from '../config/theme';
import { useSvgId } from '../lib/format';
import { IMPACTS } from '../timing';

/** 0..~1.4 impact energy at an absolute frame. */
export const impactEnergy = (frame: number, variant?: HookVariant) => {
  let a = 0;
  for (const im of IMPACTS) {
    if (im.variants && variant && !im.variants.includes(variant)) continue;
    const d = frame - im.at;
    if (d >= 0 && d < 30) a += im.strength * Math.exp(-d / FX.shake.decayFrames);
  }
  return Math.min(a, 1.4);
};

/**
 * Wraps the picture: camera shake + punch-in + RGB split on every IMPACT in timing.ts.
 * Must be rendered at the film root (uses the absolute frame).
 */
export const ImpactLayer: React.FC<{ variant?: HookVariant; children: React.ReactNode }> = ({ variant, children }) => {
  const frame = useCurrentFrame();
  const id = useSvgId('chroma');
  const a = impactEnergy(frame, variant);
  const dx = a * FX.shake.maxPx * noise2D('shake-x', frame * 0.85, 0.5);
  const dy = a * FX.shake.maxPx * 0.75 * noise2D('shake-y', 0.5, frame * 0.85);
  const rot = a * 0.6 * noise2D('shake-r', frame * 0.6, 2);
  const scale = 1 + a * 0.045;
  const off = a * FX.chroma.maxOffset;
  const chroma = off > 0.5;
  return (
    <>
      {chroma ? (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feOffset in="r" dx={-off} dy={off * 0.3} result="ro" />
              <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
              <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
              <feOffset in="b" dx={off} dy={-off * 0.3} result="bo" />
              <feBlend in="ro" in2="g" mode="screen" result="rg" />
              <feBlend in="rg" in2="bo" mode="screen" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`,
          filter: chroma ? `url(#${id})` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </>
  );
};
