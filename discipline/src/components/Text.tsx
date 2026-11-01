import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { toLines } from '../config/copy';
import { TEXT } from '../config/theme';
import { hash } from '../lib/anim';

/** White word with a thick dark outline (outline layer behind a clean fill layer). */
export const StrokeText: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  stroke?: string;
  strokeRatio?: number;
  weight?: number;
  spacing?: string;
  shadow?: boolean;
}> = ({ children, size, color = TEXT.color, stroke = TEXT.stroke, strokeRatio = TEXT.strokeRatio, weight = TEXT.weight, spacing = '-0.01em', shadow = true }) => {
  const base: React.CSSProperties = {
    fontFamily: TEXT.family,
    fontWeight: weight,
    fontSize: size,
    lineHeight: 1.04,
    letterSpacing: spacing,
    whiteSpace: 'pre',
  };
  return (
    <span style={{ ...base, position: 'relative', display: 'inline-block' }}>
      <span
        aria-hidden
        style={{
          ...base,
          position: 'absolute',
          left: 0,
          top: 0,
          color: stroke,
          WebkitTextStroke: `${size * strokeRatio}px ${stroke}`,
          textShadow: shadow ? `0 ${size * 0.075}px 0 ${stroke}` : undefined,
        }}
      >
        {children}
      </span>
      <span style={{ ...base, position: 'relative', color }}>{children}</span>
    </span>
  );
};

/**
 * Word-by-word pop-in with spring overshoot. Layout is fixed from frame 0, so words
 * never shift as later ones appear. `at[i]` = local frame word i pops.
 */
export const KineticText: React.FC<{
  text: string;
  at: number[];
  size: number;
  emphasis?: readonly string[];
  /** Vertical center as a fraction of frame height. */
  y?: number;
  hideFrom?: number;
  lineGap?: number;
}> = ({ text, at, size, emphasis = [], y = 0.5, hideFrom, lineGap = 0.0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (hideFrom !== undefined && frame >= hideFrom) return null;
  const lines = toLines(text);
  let wi = 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${y * 100}%`,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: size * lineGap,
        }}
      >
        {lines.map((words, li) => (
          <div key={li} style={{ display: 'flex', justifyContent: 'center', gap: size * 0.24 }}>
            {words.map((w) => {
              const i = wi++;
              const t0 = at[Math.min(i, at.length - 1)];
              const emph = emphasis.includes(w);
              const s = spring({ frame: frame - t0 + 1, fps, config: { damping: 10, stiffness: 300, mass: 0.55 } });
              const visible = frame >= t0;
              const scale = (0.5 + 0.5 * s) * (emph ? TEXT.emphasisScale : 1);
              const rot = (1 - s) * (hash(i * 3.7) - 0.5) * 22;
              const ty = (1 - s) * size * 0.3;
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    margin: emph ? `0 ${size * 0.07}px` : undefined,
                    visibility: visible ? 'visible' : 'hidden',
                    transform: `translateY(${ty}px) rotate(${rot}deg) scale(${scale})`,
                    transformOrigin: '50% 60%',
                  }}
                >
                  <StrokeText size={size} color={emph && TEXT.emphasisColor ? TEXT.emphasisColor : TEXT.color}>
                    {w}
                  </StrokeText>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Full-screen flash frame with centered text. */
export const FlashCard: React.FC<{ text: string; size: number; bg?: string; color?: string }> = ({
  text,
  size,
  bg = '#F4F0E6',
  color = '#0B0B10',
}) => (
  <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {toLines(text).map((l, i) => (
        <span
          key={i}
          style={{ fontFamily: TEXT.family, fontWeight: 900, fontSize: size, lineHeight: 1.02, color, letterSpacing: '-0.015em' }}
        >
          {l.join(' ')}
        </span>
      ))}
    </div>
  </AbsoluteFill>
);
