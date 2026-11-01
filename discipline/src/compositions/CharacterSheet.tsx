import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../characters/Bean';
import { MOODS, type MoodName } from '../characters/moods';
import { POSES, climb, pushup, sitUpInBed, slump } from '../characters/poses';
import { HIP_H } from '../characters/rig';
import { Stage } from '../components/Stage';
import { COLORS, PALETTES, TEXT } from '../config/theme';
import { GlobalDefs } from '../fx/GlobalDefs';
import { Grain } from '../fx/Grain';
import { Vignette } from '../fx/Vignette';

const P = PALETTES.night;
const LINE = COLORS.line;

const moods: Array<{ mood: MoodName; label: string; mouth?: 'none' | 'smile' | 'frown' | 'flat' }> = [
  { mood: 'tired', label: 'TIRED' },
  { mood: 'sad', label: 'SAD' },
  { mood: 'determined', label: 'DETERMINED' },
  { mood: 'angry', label: 'ANGRY' },
  { mood: 'proud', label: 'PROUD' },
  { mood: 'neutral', label: 'NEUTRAL' },
];

const Label: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div
    style={{
      position: 'absolute',
      left: x - 150,
      width: 300,
      top: y,
      textAlign: 'center',
      fontFamily: TEXT.family,
      fontWeight: 900,
      fontSize: 22,
      letterSpacing: '0.12em',
      color: '#8E93A6',
    }}
  >
    {children}
  </div>
);

/** Model sheet: moods + every rig pose / cycle. */
export const CharacterSheet: React.FC = () => {
  const f = useCurrentFrame();
  const groundY = 900;
  const stairTread = (j: number) => ({ x0: 1150 + j * 52 - 60, x1: 1150 + (j + 1) * 52 - 60, y: groundY - j * 26 });
  const cl = climb(1.15 + f / 24, stairTread, { w: 0.8, lift: 26 });
  const pu = pushup((f / 40) % 1 || 0.5, groundY, 1660);
  const xs = [150, 330, 520, 760, 1010, 1260, 1520, 1760];
  return (
    <AbsoluteFill style={{ background: P.bg }}>
      <GlobalDefs />
      <Stage cam={{ x: 960, y: 540, zoom: 1 }} bg={P.bg} handheld={0}>
        {/* Moods */}
        {moods.map((m, i) => (
          <Bean
            key={m.mood}
            x={190 + i * 308}
            y={318}
            scale={1.12}
            view="front"
            pose="stand"
            eyebrowMood={m.mood}
            mouth={m.mouth}
          />
        ))}
        {/* ground line */}
        <line x1={40} y1={groundY} x2={1880} y2={groundY} stroke={LINE} strokeWidth={3} strokeLinecap="round" />
        {/* stand */}
        <Bean x={xs[0]} y={groundY - HIP_H} pose="stand" eyebrowMood="neutral" />
        {/* walk */}
        <Bean x={xs[1]} y={groundY - HIP_H} pose="walk" legPhase={0.1 + f / 30} eyebrowMood="neutral" />
        {/* run */}
        <Bean x={xs[2]} y={groundY - HIP_H} pose="run" legPhase={0.15 + f / 18} eyebrowMood="determined" mouth="o" />
        {/* sit-up in bed */}
        <g>
          <rect x={xs[3] - 110} y={groundY - 70} width={240} height={34} rx={14} fill={P.fill2} stroke={LINE} strokeWidth={3} />
          <Bean x={xs[3] - 10} y={groundY - 70 - 22} pose={sitUpInBed(0.55 + 0.45 * Math.sin(f / 14))} eyebrowMood="tired" />
        </g>
        {/* slump on a box */}
        <g>
          <rect x={xs[4] - 70} y={groundY - 62} width={90} height={62} rx={8} fill={P.fill2} stroke={LINE} strokeWidth={3} />
          <Bean x={xs[4] - 30} y={groundY - 62 - 6} pose={slump(1)} eyebrowMood="sad" />
        </g>
        {/* climb */}
        <g>
          {Array.from({ length: 9 }, (_, j) => {
            const t = stairTread(j);
            return (
              <rect key={j} x={t.x0} y={t.y} width={t.x1 - t.x0 + 1} height={groundY - t.y + 1} fill={P.fill2} stroke={LINE} strokeWidth={3} />
            );
          })}
          <Bean x={cl.root.x} y={cl.root.y} facing={cl.facing} pose={cl.pose} targets={cl.targets} eyebrowMood="determined" headband />
        </g>
        {/* push-up */}
        <Bean x={pu.root.x} y={pu.root.y} rot={pu.rot} pose={pu.pose} targets={pu.targets} eyebrowMood="angry" sweat={0.7} />
      </Stage>
      {moods.map((m, i) => (
        <Label key={m.mood} x={190 + i * 308} y={452}>
          {m.label}
        </Label>
      ))}
      {['STAND', 'WALK', 'RUN', 'SIT-UP IN BED', 'SLUMP', 'CLIMB', '', 'PUSH-UP'].map((l, i) =>
        l ? (
          <Label key={l} x={i === 5 ? 1290 : i === 7 ? 1700 : xs[i]} y={930}>
            {l}
          </Label>
        ) : null,
      )}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 34,
          fontFamily: TEXT.family,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: '0.2em',
          color: '#E8E4D8',
        }}
      >
        DISCIPLINE — CHARACTER RIG
      </div>
      <Vignette strength={0.45} />
      <Grain />
    </AbsoluteFill>
  );
};

export const MOOD_LIST = Object.keys(MOODS);
export const POSE_LIST = Object.keys(POSES);
