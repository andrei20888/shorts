import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {Bg, Flash, Move, Plate, Safe, Strike, Txt} from '../components';
import {drift, impact, lin, prog, pulse, punch, shake, slam} from '../anim';
import {LIME, ON_LIME} from '../theme';

/** H1 (0.0–0.9s): full lime screen, black text slams in, "30 days" gets struck through. */
export const HookH1: React.FC = () => {
  const f = useCurrentFrame();
  const s = slam(f);
  const sh = shake(f, 0, 3, 16, 'h1');
  return (
    <Bg color={LIME}>
      <Safe>
        <Move scale={s.scale} x={sh.x} y={sh.y}>
          <Txt size={150} color={ON_LIME}>
            <div>Every ‘abs</div>
            <div>
              in{' '}
              <Strike progress={prog(f, 15, 8)} color={ON_LIME} thickness={0.12}>
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

/** H2 (0.9–1.9s): hard cut, white impact frame, "is LYING" fills the width, letters jitter then lock. */
export const HookH2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, 30, 1.06)}>
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

/** H3 (1.9–3.0s): "to you." — "you" pops on a lime plate, whole line pulses once. */
export const HookH3: React.FC = () => {
  const f = useCurrentFrame();
  const s = slam(f);
  const p = punch(f, 6, 8, 1.2);
  return (
    <Bg>
      <Safe>
        <Move scale={s.scale * pulse(f, 21, 8, 0.08)}>
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

/** Reset (3.0–3.6s): the whole hook sentence, small, so it can be read in one piece. */
export const HookReset: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <Safe>
        <Move opacity={lin(f, 0, 3)} scale={drift(f, 18, 1.02)}>
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

/** Triple hook, 3.6s = 108 frames. */
export const HOOK_FRAMES = 108;
export const Hook: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={27}>
      <HookH1 />
    </Sequence>
    <Sequence from={27} durationInFrames={30}>
      <HookH2 />
    </Sequence>
    <Sequence from={57} durationInFrames={33}>
      <HookH3 />
    </Sequence>
    <Sequence from={90} durationInFrames={18}>
      <HookReset />
    </Sequence>
  </>
);
