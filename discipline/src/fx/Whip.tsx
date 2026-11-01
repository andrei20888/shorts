import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE, clamp } from '../lib/anim';
import { useSvgId } from '../lib/format';

export type WhipDir = 'left' | 'right' | 'up' | 'down';
const VEC: Record<WhipDir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/**
 * Whip-pan wrapper for one shot (no overlap needed: the motion blur hides the cut).
 * `inDir` = direction the picture travels while arriving, `outDir` while leaving.
 */
export const Whip: React.FC<{
  dur: number;
  inDir?: WhipDir | null;
  outDir?: WhipDir | null;
  frames?: number;
  maxBlur?: number;
  children: React.ReactNode;
}> = ({ dur, inDir = null, outDir = null, frames = 4, maxBlur = 70, children }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useSvgId('whip');
  let dx = 0;
  let dy = 0;
  let blur = 0;
  let axis: [number, number] = [1, 0];
  if (inDir && f < frames) {
    const p = clamp(f / frames);
    const [vx, vy] = VEC[inDir];
    const rem = 1 - EASE.whipIn(p);
    dx = -vx * width * 0.55 * rem;
    dy = -vy * height * 0.55 * rem;
    blur = maxBlur * rem;
    axis = [Math.abs(vx), Math.abs(vy)];
  } else if (outDir && f >= dur - frames) {
    const p = clamp((f - (dur - frames) + 1) / frames);
    const [vx, vy] = VEC[outDir];
    const e = EASE.whipOut(p);
    dx = vx * width * 0.55 * e;
    dy = vy * height * 0.55 * e;
    blur = maxBlur * e;
    axis = [Math.abs(vx), Math.abs(vy)];
  }
  const active = blur > 0.5;
  return (
    <>
      {active ? (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={`${blur * axis[0]} ${blur * axis[1]}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px, ${dy}px)`,
          filter: active ? `url(#${id})` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </>
  );
};
