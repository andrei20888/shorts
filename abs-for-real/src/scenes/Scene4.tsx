import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Move, Safe, Txt} from '../components';
import {drift, easeOut, lin, overshoot, prog, pulse, punch, shake} from '../anim';
import {Logo} from '../Logo';
import {LIME} from '../theme';
import type {SceneProps} from '../timing/types';

const WORDS = ['So', 'I’m', 'building', 'the', 'honest', 'one.'];
const LOGO_H = 480;
const LOGO_GAP = 60;

/** Scene 4: words appear as they are spoken, then the logo builds itself, one square per pluck. */
export const Scene4: React.FC<SceneProps> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const shiftAt = c.logo - 12;
  const textZoom = drift(f, shiftAt, 1.04);
  const shrink = interpolate(f, [shiftAt, c.logo], [1, 0.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const titleY = interpolate(f, [shiftAt, c.logo], [(LOGO_H + LOGO_GAP) / 2, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const sqAt = [c.sq0, c.sq1, c.sq2, c.sq3, c.sq4];
  const squares = sqAt.map((at) => overshoot(f, at, fps));
  let kick = 1;
  for (const at of sqAt) kick *= pulse(f, at, 6, 0.03);
  kick *= pulse(f, c.pulse, 8, 0.06);
  const lime = overshoot(f, c.lime, fps);
  const check = prog(f, c.check, 9);
  const sh = shake(f, c.lime, 2, 10, 's4');
  const wordAt = [c.w0, c.w1, c.w2, c.w3, c.w4, c.w5];

  return (
    <Bg>
      <Safe>
        <Move x={sh.x} y={sh.y}>
          <Move scale={textZoom * shrink} y={titleY}>
            <Txt size={110}>
              {WORDS.map((w, i) => {
                const at = wordAt[i];
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
          <div style={{marginTop: LOGO_GAP, opacity: f >= c.logo ? 1 : 0}}>
            <Logo height={LOGO_H} squares={squares} lime={lime} check={check} scale={kick} />
          </div>
        </Move>
      </Safe>
    </Bg>
  );
};
