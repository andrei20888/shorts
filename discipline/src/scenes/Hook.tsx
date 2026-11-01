import React from 'react';
import type { HookVariant } from '../config/copy';
import { HookA } from './hook/HookA';
import { HookB } from './hook/HookB';
import { HookC } from './hook/HookC';

/**
 * THE TRIPLE HOOK (0–3 s). Visual + text + audio hooks fire together.
 *  A: split screen DAY 1 vs DAY 365 → divider shatters → slam into 5:00
 *  B: extreme close-up, eyes snap open, brows slam into angry-determined
 *  C: fall from the top of the endless staircase down to the bed
 * Audio cues for each variant live in timing.ts (SFX_CUES with `variants`).
 */
export const Hook: React.FC<{ variant: HookVariant }> = ({ variant }) => {
  if (variant === 'B') return <HookB />;
  if (variant === 'C') return <HookC />;
  return <HookA />;
};
