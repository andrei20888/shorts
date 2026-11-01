import { noise2D } from '@remotion/noise';
import React, { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';
import { BOIL } from '../fx/GlobalDefs';
import { useFormat, useSvgId } from '../lib/format';
import { HEIGHT, WIDTH } from '../timing';

/**
 * Camera in world units. `zoom` is area-normalised: zoom 1 shows a 1920×1080-unit
 * window in landscape AND a 1080×1920-unit window in portrait (same pixel size per
 * unit), so characters read at the same size in both crops.
 */
export type Cam = { x: number; y: number; zoom: number; rot?: number };
export type Viewport = { x: number; y: number; w: number; h: number };

export const camScale = (zoom: number, vp: Viewport) => zoom * Math.sqrt((vp.w * vp.h) / (WIDTH * HEIGHT));

export const camTransform = (cam: Cam, vp: Viewport) => {
  const k = camScale(cam.zoom, vp);
  return `translate(${vp.x + vp.w / 2} ${vp.y + vp.h / 2}) rotate(${cam.rot ?? 0}) scale(${k}) translate(${-cam.x} ${-cam.y})`;
};

/** World → screen for a camera (used to anchor screen-space FX to world points). */
export const worldToScreen = (cam: Cam, vp: Viewport, wx: number, wy: number) => {
  const k = camScale(cam.zoom, vp);
  const r = ((cam.rot ?? 0) * Math.PI) / 180;
  const dx = (wx - cam.x) * k;
  const dy = (wy - cam.y) * k;
  return {
    x: vp.x + vp.w / 2 + dx * Math.cos(r) - dy * Math.sin(r),
    y: vp.y + vp.h / 2 + dx * Math.sin(r) + dy * Math.cos(r),
  };
};

type StageInfo = { cam: Cam; vp: Viewport; k: number };
const StageContext = createContext<StageInfo>({
  cam: { x: 0, y: 0, zoom: 1 },
  vp: { x: 0, y: 0, w: WIDTH, h: HEIGHT },
  k: 1,
});
export const useStage = () => useContext(StageContext);

/**
 * One drawing surface: full-frame SVG → (clip to viewport) → line boil → bg → camera → world.
 * `overlay` is drawn in screen space on top of the world (still boiled).
 * `handheld` adds a subtle noise drift so the camera is never perfectly static.
 */
export const Stage: React.FC<{
  cam: Cam;
  viewport?: Viewport;
  bg?: string;
  boil?: boolean;
  handheld?: number;
  seed?: string;
  overlay?: React.ReactNode;
  under?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ cam, viewport, bg, boil = true, handheld = 1, seed = 'cam', overlay, under, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useFormat();
  const clipId = useSvgId('vp');
  const vp = viewport ?? { x: 0, y: 0, w: width, h: height };
  const k0 = camScale(cam.zoom, vp);
  const hx = noise2D(`${seed}x`, frame * 0.017, 0) * 7 * handheld;
  const hy = noise2D(`${seed}y`, 0, frame * 0.015) * 6 * handheld;
  const hr = noise2D(`${seed}r`, frame * 0.011, 3) * 0.25 * handheld;
  const c2: Cam = { ...cam, x: cam.x + hx / k0, y: cam.y + hy / k0, rot: (cam.rot ?? 0) + hr };
  const full = vp.x === 0 && vp.y === 0 && vp.w === width && vp.h === height;
  return (
    <svg
      className="stage"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden' }}
    >
      {full ? null : (
        <defs>
          <clipPath id={clipId}>
            <rect x={vp.x} y={vp.y} width={vp.w} height={vp.h} />
          </clipPath>
        </defs>
      )}
      <g clipPath={full ? undefined : `url(#${clipId})`}>
        <g filter={boil ? BOIL : undefined}>
          {bg ? <rect x={vp.x - 60} y={vp.y - 60} width={vp.w + 120} height={vp.h + 120} fill={bg} /> : null}
          {under}
          <StageContext.Provider value={{ cam: c2, vp, k: k0 }}>
            <g transform={camTransform(c2, vp)}>{children}</g>
          </StageContext.Provider>
          {overlay}
        </g>
      </g>
    </svg>
  );
};
