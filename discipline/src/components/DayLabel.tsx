import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COPY } from '../config/copy';
import { TEXT } from '../config/theme';
import { EASE, clamp } from '../lib/anim';
import { useFormat } from '../lib/format';
import { DAY_KEYS, DAY_LABEL, type DayKey } from '../timing';
import { StrokeText } from './Text';

/** Continuous day value (float while rolling) at an absolute frame. */
export const dayAt = (frame: number, keys: DayKey[] = DAY_KEYS) => {
  let v = keys[0].day;
  for (const k of keys) {
    if (frame < k.at) break;
    const prev = v;
    if (k.roll > 0 && frame < k.at + k.roll) {
      v = prev + (k.day - prev) * EASE.inOut(clamp((frame - k.at) / k.roll));
      break;
    }
    v = k.day;
  }
  return v;
};

/** One odometer column: strip 0-9,0 translated by a continuous position. */
const DigitColumn: React.FC<{ pos: number; size: number; blur: number }> = ({ pos, size, blur }) => {
  const h = size * 1.04;
  const p = ((pos % 10) + 10) % 10;
  return (
    <span style={{ display: 'inline-block', height: h, overflow: 'hidden', verticalAlign: 'top', padding: `0 ${size * 0.02}px` }}>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${-p * h}px)`,
          filter: blur > 0.3 ? `blur(${Math.min(blur, 6)}px)` : undefined,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span key={i} style={{ height: h, display: 'block' }}>
            <StrokeText size={size} strokeRatio={0.16} shadow={false}>
              {String(d)}
            </StrokeText>
          </span>
        ))}
      </span>
    </span>
  );
};

/** Odometer number: each place rolls only while the lower places pass 9 → 0. */
export const Odometer: React.FC<{ value: number; size: number; velocity?: number }> = ({ value, size, velocity = 0 }) => {
  const digits = String(Math.max(1, Math.floor(value + 1e-6))).length;
  const cols = [];
  for (let k = digits - 1; k >= 0; k--) {
    const p = Math.pow(10, k);
    let pos: number;
    if (k === 0) {
      pos = value;
    } else {
      const lower = value % p;
      const frac = lower > p - 1 ? lower - (p - 1) : 0;
      pos = Math.floor(value / p) + frac;
    }
    cols.push(<DigitColumn key={k} pos={pos} size={size} blur={k === 0 ? velocity * 0.6 : (velocity / Math.pow(10, k)) * 0.6} />);
  }
  return <span style={{ display: 'inline-flex' }}>{cols}</span>;
};

/** Top-left chapter label "DAY X" driven by DAY_KEYS (absolute frames). */
export const DayLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useFormat();
  if (frame < DAY_LABEL.from || frame >= DAY_LABEL.to) return null;
  const size = portrait ? TEXT.day.portrait : TEXT.day.landscape;
  const v = dayAt(frame);
  const vel = Math.abs(dayAt(frame + 1) - dayAt(frame - 1)) / 2;
  const appear = spring({ frame: frame - DAY_LABEL.from, fps, config: { damping: 12, stiffness: 240, mass: 0.6 } });
  const rolling = vel > 0.01;
  const bump = 1 + (rolling ? 0.08 : 0);
  return (
    <div
      style={{
        position: 'absolute',
        left: portrait ? 64 : 64,
        top: portrait ? 168 : 50,
        display: 'flex',
        alignItems: 'flex-start',
        gap: size * 0.28,
        transform: `scale(${appear * bump})`,
        transformOrigin: '0% 50%',
      }}
    >
      <StrokeText size={size} strokeRatio={0.16} shadow={false} color="#E8E4D8" spacing="0.06em">
        {COPY.dayPrefix}
      </StrokeText>
      <Odometer value={v} size={size} velocity={vel} />
    </div>
  );
};

/** Static half-screen label used inside the hook split ("DAY 1" / "DAY 365"). */
export const StaticDay: React.FC<{ day: number; x: number; y: number; size: number; opacity?: number }> = ({
  day,
  x,
  y,
  size,
  opacity = 1,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', gap: size * 0.28, opacity }}>
    <StrokeText size={size} strokeRatio={0.16} shadow={false} color="#E8E4D8" spacing="0.06em">
      {COPY.dayPrefix}
    </StrokeText>
    <StrokeText size={size} strokeRatio={0.16} shadow={false}>
      {String(day)}
    </StrokeText>
  </div>
);
