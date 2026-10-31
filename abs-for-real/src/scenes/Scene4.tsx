import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Move, Safe, Txt} from '../components';
import {drift, easeOut, lin, overshoot, prog, pulse, punch, shake} from '../anim';
import {Logo} from '../Logo';
import {LIME} from '../theme';

export type Scene4Timing = {
  dur: number;
  /** frames the text stays alone before the logo layout kicks in */
  textDur: number;
  logoStart: number;
  gap: number;
  limeAt: number;
  checkAt: number;
  pulseAt: number;
};

export const SCENE4_28: Scene4Timing = {
  dur: 156, textDur: 66, logoStart: 72, gap: 6, limeAt: 108, checkAt: 120, pulseAt: 132,
};
export const SCENE4_15: Scene4Timing = {
  dur: 132, textDur: 54, logoStart: 56, gap: 4, limeAt: 90, checkAt: 111, pulseAt: 123,
};

const WORDS = ['So', 'I’m', 'building', 'the', 'honest', 'one.'];
const WORD_STEP = 5;
const LOGO_H = 480;
const LOGO_GAP = 60;

/** Scene 4: "So I’m building the honest one." word by word, then the logo builds itself. */
export const Scene4: React.FC<{t: Scene4Timing}> = ({t}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const textZoom = drift(f, t.textDur, 1.04);
  const shrink = interpolate(f, [t.textDur, t.textDur + 12], [1, 0.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const titleY = interpolate(f, [t.textDur, t.textDur + 12], [(LOGO_H + LOGO_GAP) / 2, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const squares = [0, 1, 2, 3, 4].map((i) => overshoot(f, t.logoStart + i * t.gap, fps));
  let kick = 1;
  for (let i = 0; i < 5; i++) kick *= pulse(f, t.logoStart + i * t.gap, 6, 0.03);
  kick *= pulse(f, t.pulseAt, 8, 0.06);
  const lime = overshoot(f, t.limeAt, fps);
  const check = prog(f, t.checkAt, 9);
  const sh = shake(f, t.limeAt, 2, 10, 's4');

  return (
    <Bg>
      <Safe>
        <Move x={sh.x} y={sh.y}>
          <Move scale={textZoom * shrink} y={titleY}>
            <Txt size={110}>
              {WORDS.map((w, i) => {
                const at = i * WORD_STEP;
                const p = punch(f, at, 8, 1.1);
                return (
                  <React.Fragment key={i}>
                    <span
                      style={{
                        display: 'inline-block',
                        transform: `scale(${p.scale})`,
                        opacity: lin(f, at, 3),
                        color: w === 'honest' ? LIME : undefined,
                      }}
                    >
                      {w}
                    </span>
                    {i === 2 ? <br /> : i < WORDS.length - 1 ? ' ' : null}
                  </React.Fragment>
                );
              })}
            </Txt>
          </Move>
          <div style={{marginTop: LOGO_GAP, opacity: f >= t.logoStart ? 1 : 0}}>
            <Logo height={LOGO_H} squares={squares} lime={lime} check={check} scale={kick} />
          </div>
        </Move>
      </Safe>
    </Bg>
  );
};
