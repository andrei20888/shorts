import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FX } from '../config/theme';
import { useFormat } from '../lib/format';

export const BOIL = 'url(#boil)';

/**
 * Document-wide SVG defs + CSS.
 *  • "boil": feTurbulence + feDisplacementMap, new seed every N frames (on threes).
 *    Applied in screen space (outside the camera) so the wobble never scales with zoom.
 *  • `.stage *` strokes are non-scaling → a constant 3px line at any camera zoom.
 *    Add className="scale-stroke" to opt a group out (thick world-space strokes).
 */
export const GlobalDefs: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useFormat();
  const seed = (Math.floor(frame / FX.boil.everyNFrames) % 89) + 1;
  return (
    <svg width={0} height={0} style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden>
      <style>{`
        .stage * { vector-effect: non-scaling-stroke; }
        .stage .scale-stroke, .stage .scale-stroke * { vector-effect: none; }
      `}</style>
      <defs>
        <filter
          id="boil"
          filterUnits="userSpaceOnUse"
          x={-40}
          y={-40}
          width={width + 80}
          height={height + 80}
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={FX.boil.frequency}
            numOctaves={FX.boil.octaves}
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={FX.boil.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
};
