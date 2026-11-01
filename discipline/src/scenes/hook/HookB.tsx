import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bean } from '../../characters/Bean';
import { MOODS } from '../../characters/moods';
import { POSES } from '../../characters/poses';
import { RIG, solve } from '../../characters/rig';
import { Stage, type Cam } from '../../components/Stage';
import { FlashCard, KineticText } from '../../components/Text';
import { COPY } from '../../config/copy';
import { COLORS, PALETTES, TEXT } from '../../config/theme';
import { EASE, keys, kick, prog, wobble } from '../../lib/anim';
import { useFormat } from '../../lib/format';
import { HOOK, HOOK_WORDS } from '../../timing';

const NIGHT = PALETTES.night;

/**
 * B — Extreme close-up: eyes SNAP open on the alarm, dart to the clock,
 * then the brows SLAM down into angry-determined on the bass hit.
 */
export const HookB: React.FC = () => {
  const f = useCurrentFrame();
  const { portrait, orientation } = useFormat();
  const I = HOOK.impact;
  // head center of a standing front-view bean at the origin
  const head = solve(POSES.stand, 'front').head;
  // eyes SNAP open on the alarm (f2→5), blink once, brows slam on the bass hit (lands at f45)
  const snap = prog(f, 2, 5, EASE.out);
  const blink = 1 - snap + (f > 31 && f < 34 ? 1 : 0);
  const slam = prog(f, I - 3, I, EASE.in);
  const mood =
    f < I - 3
      ? f < 10
        ? { from: 'tired' as const, to: { ...MOODS.surprised, y: -4 }, t: snap }
        : { from: { ...MOODS.surprised, y: -4 }, to: 'sad' as const, t: prog(f, 10, 26, EASE.soft) }
      : { from: 'sad' as const, to: 'determined' as const, t: slam };
  const tremble = f >= I ? wobble(f, I, 1.2, 2.4, 10) : 0;
  const lookX = keys(f, [
    [8, 0],
    [16, -0.85, EASE.out],
    [I - 2, -0.85],
    [I + 1, 0, EASE.out],
  ]);
  const punch = 1 + 0.16 * prog(f, I, I + 4, EASE.out) - 0.04 * prog(f, I + 4, I + 14, EASE.soft);
  const breathe = 1 + 0.05 * prog(f, 0, HOOK.end, EASE.soft);
  const z = (portrait ? 12 : 13) * punch * breathe * (1 + 0.06 * snap);
  const cam: Cam = {
    x: head.x,
    y: head.y + (portrait ? 16 : 12),
    zoom: z,
    rot: -2 + 2 * prog(f, I, I + 8, EASE.out),
  };
  const heartbeat = f >= HOOK.silence ? 0.8 * kick(f, HOOK.heartbeat, 5) + 0.5 * kick(f, HOOK.heartbeat + 6, 5) : 0;
  const redLight = {
    x: head.x - 95,
    y: head.y + 25,
    r: 150,
    color: COLORS.clockRed,
    opacity: 0.55 + 0.25 * (f < 20 ? Math.abs(Math.sin(f * 0.8)) : 0) + heartbeat,
  };
  return (
    <AbsoluteFill style={{ background: NIGHT.bg }}>
      <Stage cam={cam} bg={NIGHT.wall} seed="hookB" handheld={1.4}>
        <rect x={-600} y={-600} width={1200} height={900} fill={NIGHT.wall} />
        <Bean
          x={0}
          y={0}
          view="front"
          pose="stand"
          eyebrowMood={mood}
          blink={blink}
          look={{ x: lookX + tremble * 0.02, y: -0.05 }}
          sparkle
          ambient={{ color: NIGHT.ambient, amount: 0.22 }}
          light={redLight}
        />
        {/* pillow edge under the cheek */}
        <path d={`M${-300} ${head.y + RIG.headR - 6} C${-120} ${head.y + 30} ${120} ${head.y + 40} ${300} ${head.y + RIG.headR}`} fill="none" stroke={NIGHT.line} strokeWidth={3} opacity={0.5} />
      </Stage>
      {f >= HOOK.silence + HOOK.flashDur ? (
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 22%, rgba(0,0,0,0.7) 80%)' }} />
      ) : null}
      <KineticText
        text={COPY.hook.B[orientation]}
        at={HOOK_WORDS.B}
        size={TEXT.hook[orientation]}
        emphasis={COPY.hook.B.emphasis}
        y={portrait ? 0.74 : 0.83}
        hideFrom={HOOK.silence}
      />
      {f >= HOOK.flash && f < HOOK.flash + HOOK.flashDur ? <FlashCard text={COPY.flash[orientation]} size={TEXT.flash[orientation]} /> : null}
    </AbsoluteFill>
  );
};
