import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Soundtrack } from '../audio/Soundtrack';
import { DayLabel } from '../components/DayLabel';
import type { HookVariant } from '../config/copy';
import { COLORS } from '../config/theme';
import { GlobalDefs } from '../fx/GlobalDefs';
import { Grain } from '../fx/Grain';
import { ImpactLayer } from '../fx/ImpactLayer';
import { Vignette } from '../fx/Vignette';
import { Act1Struggle } from '../scenes/Act1Struggle';
import { Act2Grind } from '../scenes/Act2Grind';
import { Act3Climb } from '../scenes/Act3Climb';
import { Doubt } from '../scenes/Doubt';
import { Finale } from '../scenes/Finale';
import { Hook } from '../scenes/Hook';
import { TurningPoint } from '../scenes/TurningPoint';
import { SCENES } from '../timing';

export type FilmProps = { variant: HookVariant; audio?: boolean };

const S = SCENES;

/**
 * The whole film. Scene timing comes from timing.ts only.
 * Layers: scenes → DAY label → (impact shake + RGB split) → vignette → grain.
 */
export const Film: React.FC<FilmProps> = ({ variant, audio = true }) => (
  <AbsoluteFill style={{ background: COLORS.black }}>
    <GlobalDefs />
    <ImpactLayer variant={variant}>
      <Sequence name="Hook" from={S.hook.start} durationInFrames={S.hook.dur}>
        <Hook variant={variant} />
      </Sequence>
      <Sequence name="Act 1 – The Struggle" from={S.act1.start} durationInFrames={S.act1.dur}>
        <Act1Struggle />
      </Sequence>
      <Sequence name="Turning Point" from={S.turning.start} durationInFrames={S.turning.dur}>
        <TurningPoint />
      </Sequence>
      <Sequence name="Act 2 – The Grind" from={S.act2.start} durationInFrames={S.act2.dur}>
        <Act2Grind />
      </Sequence>
      <Sequence name="The Doubt" from={S.doubt.start} durationInFrames={S.doubt.dur}>
        <Doubt />
      </Sequence>
      <Sequence name="Act 3 – The Climb" from={S.act3.start} durationInFrames={S.act3.dur}>
        <Act3Climb />
      </Sequence>
      <Sequence name="Finale" from={S.finale.start} durationInFrames={S.finale.dur}>
        <Finale />
      </Sequence>
      <DayLabel />
    </ImpactLayer>
    <Vignette />
    <Grain />
    {audio ? <Soundtrack variant={variant} /> : null}
  </AbsoluteFill>
);
