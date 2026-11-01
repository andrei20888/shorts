import { useId } from 'react';
import { useVideoConfig } from 'remotion';

/** Orientation-aware frame info. Scenes are authored once and re-framed for 9:16. */
export const useFormat = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    orientation: (portrait ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
    cx: width / 2,
    cy: height / 2,
  };
};

/** Pick a landscape / portrait value. */
export const pick = <T,>(portrait: boolean, landscape: T, portraitValue: T): T => (portrait ? portraitValue : landscape);

/** A unique, url()-safe id for SVG defs (clipPaths, gradients, filters). */
export const useSvgId = (prefix: string) => {
  const id = useId();
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
};
