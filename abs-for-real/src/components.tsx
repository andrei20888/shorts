import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BG, FG, FONT, LIME, ON_LIME, SAFE} from './theme';

/** Full-frame background. */
export const Bg: React.FC<{color?: string; children?: React.ReactNode}> = ({
  color = BG,
  children,
}) => <AbsoluteFill style={{backgroundColor: color}}>{children}</AbsoluteFill>;

/** Centers content inside the TikTok-safe middle third. */
export const Safe: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  justify?: 'center' | 'flex-start' | 'flex-end';
}> = ({children, style, justify = 'center'}) => (
  <AbsoluteFill
    style={{
      paddingLeft: SAFE.left,
      paddingRight: SAFE.right,
      paddingTop: SAFE.top,
      paddingBottom: SAFE.bottom,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: justify,
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Headline text block. */
export const Txt: React.FC<{
  size: number;
  color?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({size, color = FG, children, style}) => (
  <div style={{...FONT, fontSize: size, color, ...style}}>{children}</div>
);

/** Inline word on a lime plate (text on accent is #0E0F10). */
export const Plate: React.FC<{
  children?: React.ReactNode;
  scale?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({children, scale = 1, opacity = 1, style}) => (
  <span
    style={{
      display: 'inline-block',
      backgroundColor: LIME,
      color: ON_LIME,
      padding: '0.04em 0.14em 0.08em',
      borderRadius: '0.1em',
      transform: `scale(${scale})`,
      opacity,
      ...style,
    }}
  >
    {children}
  </span>
);

/** Inline word with an animated strike-through (progress 0..1). */
export const Strike: React.FC<{
  children?: React.ReactNode;
  progress: number;
  color?: string;
  thickness?: number;
}> = ({children, progress, color = LIME, thickness = 0.1}) => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    {children}
    <span
      style={{
        position: 'absolute',
        left: '-0.04em',
        top: '50%',
        width: `${Math.max(0, Math.min(1, progress)) * 108}%`,
        height: `${thickness}em`,
        marginTop: `${-thickness / 2}em`,
        backgroundColor: color,
        transform: 'rotate(-4deg)',
        transformOrigin: 'left center',
        borderRadius: '0.03em',
      }}
    />
  </span>
);

/** Inline word with an animated underline (progress 0..1). */
export const Underline: React.FC<{
  children?: React.ReactNode;
  progress: number;
  color?: string;
}> = ({children, progress, color = LIME}) => (
  <span style={{position: 'relative', display: 'inline-block'}}>
    {children}
    <span
      style={{
        position: 'absolute',
        left: 0,
        bottom: '-0.02em',
        width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
        height: '0.08em',
        backgroundColor: color,
        borderRadius: '0.03em',
      }}
    />
  </span>
);

/** White impact flash overlay. */
export const Flash: React.FC<{opacity: number}> = ({opacity}) =>
  opacity > 0 ? (
    <AbsoluteFill style={{backgroundColor: FG, opacity, pointerEvents: 'none'}} />
  ) : null;

/** Transform wrapper used for punch/slam/shake/pulse on a block. */
export const Move: React.FC<{
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({scale = 1, x = 0, y = 0, opacity = 1, children, style}) => (
  <div
    style={{
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity,
      transformOrigin: 'center center',
      ...style,
    }}
  >
    {children}
  </div>
);
