import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FX } from '../config/theme';

export const Vignette: React.FC<{ strength?: number; inner?: number; color?: string }> = ({
  strength = FX.vignette.strength,
  inner = FX.vignette.inner,
  color = '0,0,0',
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at 50% 48%, rgba(${color},0) ${inner * 100}%, rgba(${color},${strength * 0.55}) ${
        (inner + (1 - inner) * 0.6) * 100
      }%, rgba(${color},${strength}) 100%)`,
    }}
  />
);
