import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TEXT } from '../config/theme';
import { VO_DURATIONS } from '../config/voTiming';
import { hash } from '../lib/anim';
import { useFormat } from '../lib/format';
import { CAPTION_SKIP, FPS, VO_LINES } from '../timing';
import { StrokeText } from './Text';

/** Words that land in gold — the motivational punch of each line. */
const PUNCH = new Set([
  'TOMORROW', 'HABIT', 'COMFORT', 'DREAM', 'STRANGER', 'BROKE', 'HEART', 'EXCUSES', 'THIRTY',
  'WAITING', 'UP', 'WATCHING', 'CLAPPED', 'SCROLL', 'COLD', 'EVERY', 'SINGLE', 'DAY', 'ANYWAY',
  'QUIET', 'QUIT', 'MOTIVATION', 'LEAVES', 'DISCIPLINE', 'STAYS', 'NEXT', 'BURNED', 'GOING',
  'SHOWING', 'EMPTY', 'HIMSELF', 'SAVE', 'SIXTY-FIVE', 'SIXTY-FOUR',
]);
const clean = (w: string) => w.replace(/[^A-Z-]/g, '');

type Word = { text: string; at: number; punch: boolean };
type Chunk = { words: Word[]; from: number; to: number };

/** Split every VO line into ≤3-word chunks with per-word timings spread over the spoken duration. */
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  VO_LINES.forEach((line, li) => {
    if (CAPTION_SKIP.includes(li)) return;
    const dur = (VO_DURATIONS[li] ?? 2) * FPS;
    const words = line.text.toUpperCase().replace(/…/g, '').split(/\s+/).filter(Boolean);
    const weights = words.map((w) => w.length + 2 + (/[.,:!?]$/.test(w) ? 4 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const timed: Word[] = words.map((w, i) => {
      const at = line.at + 2 + Math.round((acc / total) * dur * 0.92);
      acc += weights[i];
      return { text: w, at, punch: PUNCH.has(clean(w)) };
    });
    for (let i = 0; i < timed.length; ) {
      let j = i + 1;
      while (j < timed.length && j - i < 3 && !/[.,:!?]$/.test(timed[j - 1].text)) j++;
      const ws = timed.slice(i, j);
      out.push({ words: ws, from: ws[0].at, to: j < timed.length ? timed[j].at : line.at + Math.round(dur) + 10 });
      i = j;
    }
  });
  return out;
})();

/** Big kinetic captions for the narration (sound-off viewers + punch). */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useFormat();
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const size = portrait ? 76 : 80;
  const out = Math.max(0, Math.min(1, (chunk.to - frame) / 4));
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: `${(portrait ? 0.66 : 0.82) * 100}%`,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: `0 ${size * 0.5}px`,
        opacity: out,
        pointerEvents: 'none',
      }}
    >
      {chunk.words.map((w, i) => {
        const s = spring({ frame: frame - w.at + 1, fps, config: { damping: 11, stiffness: 320, mass: 0.5 } });
        const vis = frame >= w.at;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              visibility: vis ? 'visible' : 'hidden',
              transform: `translateY(${(1 - s) * 18}px) rotate(${(1 - s) * (hash(w.at + i) - 0.5) * 14}deg) scale(${0.55 + 0.45 * s})`,
            }}
          >
            <StrokeText size={w.punch ? size * 1.14 : size} color={w.punch ? '#FFD166' : TEXT.color} strokeRatio={0.2}>
              {w.text}
            </StrokeText>
          </span>
        );
      })}
    </div>
  );
};
