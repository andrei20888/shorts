import React from 'react';
import {LIME, FG, ON_LIME} from './theme';

/**
 * Abs For Real mark: 2 columns x 3 rows of rounded rectangles.
 * The first five are white; the last one (bottom right) is lime with a black check.
 * All progress values are 0..1 (may exceed 1 for overshoot).
 */
export type LogoProps = {
  height: number;
  /** scale of the 5 white squares, reading order */
  squares?: number[];
  /** scale of the lime square */
  lime?: number;
  /** 0..1 stroke draw of the check mark */
  check?: number;
  /** scale applied to the whole mark */
  scale?: number;
  style?: React.CSSProperties;
};

const CELL = 80;
const GAP = 20;
const R = 20;
const VW = 2 * CELL + 3 * GAP; // 200
const VH = 3 * CELL + 4 * GAP; // 300

const cellPos = (i: number) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {x: GAP + col * (CELL + GAP), y: GAP + row * (CELL + GAP)};
};

export const Logo: React.FC<LogoProps> = ({
  height,
  squares = [1, 1, 1, 1, 1],
  lime = 1,
  check = 1,
  scale = 1,
  style,
}) => {
  const width = (height * VW) / VH;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{display: 'block', transform: `scale(${scale})`, ...style}}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const {x, y} = cellPos(i);
        const s = Math.max(0, squares[i] ?? 1);
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx={R}
            fill={FG}
            transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}
          />
        );
      })}
      {(() => {
        const {x, y} = cellPos(5);
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        const s = Math.max(0, lime);
        return (
          <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
            <rect x={x} y={y} width={CELL} height={CELL} rx={R} fill={LIME} />
            <path
              d={`M ${x + 20} ${y + 42} L ${x + 34} ${y + 56} L ${x + 61} ${y + 26}`}
              fill="none"
              stroke={ON_LIME}
              strokeWidth={11}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - Math.min(1, Math.max(0, check))}
            />
          </g>
        );
      })()}
    </svg>
  );
};
