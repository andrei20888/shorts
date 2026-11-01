import React from 'react';
import { COLORS, LINE } from '../config/theme';
import { mix } from '../lib/color';
import { RIG, capsule, ik2, dirOf, addV, mulV, v2, type V2 } from './rig';

/**
 * A free arm in the Bean style, from `from` (where it leaves a blanket / frame edge)
 * to the hand at `to`. Segment lengths auto-fit the reach so it always bends a little.
 */
export const ReachArm: React.FC<{
  from: V2;
  to: V2;
  bend?: 1 | -1;
  scale?: number;
  ambient?: { color: string; amount: number };
  slack?: number;
}> = ({ from, to, bend = 1, scale = 1, ambient, slack = 1.08 }) => {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const seg = Math.max(20, (d * slack) / 2);
  const s = ik2(from, to, seg, seg, bend > 0);
  const elbow = addV(from, mulV(dirOf(s.a1), seg));
  const hand = addV(elbow, mulV(dirOf(s.a2), seg));
  const r = RIG.armR * scale;
  const shapes = [capsule(from, elbow, r), capsule(elbow, hand, r * 0.95), `M${hand.x - RIG.handR * scale} ${hand.y}a${RIG.handR * scale} ${RIG.handR * scale} 0 1 0 ${2 * RIG.handR * scale} 0a${RIG.handR * scale} ${RIG.handR * scale} 0 1 0 ${-2 * RIG.handR * scale} 0Z`];
  const fill = ambient ? mix(COLORS.cream, ambient.color, ambient.amount) : COLORS.cream;
  return (
    <g>
      <g fill={COLORS.line} stroke={COLORS.line} strokeWidth={LINE.width * 2} strokeLinejoin="round">
        {shapes.map((d2, i) => (
          <path key={i} d={d2} />
        ))}
      </g>
      <g fill={fill}>
        {shapes.map((d2, i) => (
          <path key={i} d={d2} />
        ))}
      </g>
      {/* knuckle hint */}
      <path
        className="scale-stroke"
        d={`M${hand.x - 4 * scale} ${hand.y - 2 * scale} l${3 * scale} ${3 * scale}`}
        stroke={COLORS.ink}
        strokeOpacity={0.4}
        strokeWidth={2 * scale}
        strokeLinecap="round"
      />
    </g>
  );
};

export const pt = v2;
