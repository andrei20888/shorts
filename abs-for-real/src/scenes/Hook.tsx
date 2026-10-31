import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {Bg, Flash, Move, Plate, Safe, Strike, Txt} from '../components';
import {drift, impact, lin, prog, pulse, punch, shake, slam} from '../anim';
import {LIME, ON_LIME} from '../theme';
import type {SceneProps} from '../timing/types';

/** H1: full lime screen, black text slams in while the voice reads the line; "30 days" gets struck. */
export const HookH1: React.FC<{strikeAt?: number}> = ({strikeAt = 20}) => {
  const f = useCurrentFrame();
  const s = slam(f);
  const sh = shake(f, 0, 3, 16, 'h1');
  return (
    <Bg color={LIME}>
      <Safe>
        <Move scale={s.scale * drift(f, 60, 1.05)} x={sh.x} y={sh.y}>
          <Txt size={150} color={ON_LIME}>
            <div>Every ‘abs</div>
            <div>
              in{' '}
              <Strike progress={prog(f, strikeAt, 8)} color={ON_LIME} thickness={0.12}>
                30 days
              </Strike>
              ’
            </div>
            <div>app</div>
          </Txt>
        </Move>
      </Safe>
    </Bg>
  );
};

/** H2: hard cut on the music drop, white impact frame, "is LYING" fills the width, letters jitter then lock. */
export const HookH2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, 24, 1.07)}>
          <Txt size={140}>is</Txt>
          <Txt size={330} style={{letterSpacing: '-0.04em', marginTop: -10}}>
            {'LYING'.split('').map((ch, i) => {
              const j = shake(f, 0, 3, 12, `ly${i}`);
              return (
                <span
                  key={i}
                  style={{display: 'inline-block', transform: `translate(${j.x}px, ${j.y}px)`}}
                >
                  {ch}
                </span>
              );
            })}
          </Txt>
        </Move>
      </Safe>
      <Flash opacity={impact(f, 0)} />
    </Bg>
  );
};

/** H3: "to you." — "you" pops on a lime plate as it is spoken, line pulses once. */
export const HookH3: React.FC = () => {
  const f = useCurrentFrame();
  const s = slam(f);
  const p = punch(f, 3, 7, 1.2);
  return (
    <Bg>
      <Safe>
        <Move scale={s.scale * pulse(f, 10, 8, 0.08)}>
          <Txt size={240}>
            to{' '}
            <Plate scale={p.scale} opacity={p.opacity}>
              you
            </Plate>
            <span style={{opacity: p.opacity}}>.</span>
          </Txt>
        </Move>
      </Safe>
    </Bg>
  );
};

/** Reset: the whole hook sentence, small, readable in one piece. */
export const HookReset: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <Safe>
        <Move opacity={lin(f, 0, 3)} scale={drift(f, 30, 1.03)}>
          <Txt size={72}>
            <div>Every ‘abs in 30 days’</div>
            <div>
              app is <span style={{color: LIME}}>lying</span>
            </div>
            <div>to you.</div>
          </Txt>
        </Move>
      </Safe>
    </Bg>
  );
};

/** Triple hook: voice reads the line, the visual cuts follow the words, the music drops on "LYING". */
export const Hook: React.FC<SceneProps> = ({c, dur}) => (
  <>
    <Sequence from={0} durationInFrames={c.h2}>
      <HookH1 />
    </Sequence>
    <Sequence from={c.h2} durationInFrames={c.h3 - c.h2}>
      <HookH2 />
    </Sequence>
    <Sequence from={c.h3} durationInFrames={c.reset - c.h3}>
      <HookH3 />
    </Sequence>
    <Sequence from={c.reset} durationInFrames={dur - c.reset}>
      <HookReset />
    </Sequence>
  </>
);
