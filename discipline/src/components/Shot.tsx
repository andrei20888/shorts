import React from 'react';
import { Sequence } from 'remotion';
import type { Span } from '../timing';

/** Place a shot by its ABSOLUTE span (from timing.ts) inside a scene that starts at `sceneStart`. */
export const Shot: React.FC<{ span: Span; sceneStart: number; name?: string; children: React.ReactNode }> = ({
  span,
  sceneStart,
  name,
  children,
}) => (
  <Sequence from={span.start - sceneStart} durationInFrames={span.dur} name={name}>
    {children}
  </Sequence>
);
