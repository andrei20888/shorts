import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Move, Safe, Txt} from '../components';
import {drift, easeOut, lin, overshoot, pulse, punch} from '../anim';
import {FONT, LIME, MUTED} from '../theme';
import type {SceneProps} from '../timing/types';

const ITEMS = ['a stronger core', 'a smaller waist', 'habits that stick'];

/** Scene 3: the pivot from anger to hope. Items appear exactly as they are spoken. */
export const Scene3: React.FC<SceneProps> = ({c, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = punch(f, 0, 9);
  const can = overshoot(f, c.can, fps);
  const titleY = interpolate(f, [c.can + 6, c.can + 18], [230, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const itemAt = [c.item0, c.item1, c.item2];
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, dur, 1.03)}>
          <Move scale={title.scale} opacity={title.opacity} y={titleY}>
            <Txt size={150}>What 30 days</Txt>
            <Txt size={240} style={{marginTop: 4}}>
              <span
                style={{
                  display: 'inline-block',
                  color: LIME,
                  transform: `scale(${can})`,
                  opacity: f >= c.can ? 1 : 0,
                }}
              >
                CAN
              </span>{' '}
              <span style={{opacity: f >= c.can ? 1 : 0}}>do:</span>
            </Txt>
          </Move>
          <div style={{height: 380, marginTop: 50, display: 'flex', flexDirection: 'column', gap: 26}}>
            {ITEMS.map((text, i) => {
              const at = itemAt[i];
              const p = punch(f, at, 9, 1.1);
              const x = interpolate(f, [at, at + 9], [-30, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              });
              const sq = overshoot(f, at + 2, fps) * pulse(f, c.pulse, 8, 0.3);
              return (
                <Move key={i} scale={p.scale} opacity={p.opacity} x={x}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: LIME,
                        transform: `scale(${sq})`,
                        flexShrink: 0,
                      }}
                    />
                    <Txt size={96} style={{whiteSpace: 'nowrap'}}>
                      {text}
                    </Txt>
                  </div>
                </Move>
              );
            })}
          </div>
          {/* disclosure: sits in its own row under the list, never overlapped */}
          <div
            style={{
              ...FONT,
              fontWeight: 600,
              fontVariationSettings: '"wdth" 80, "wght" 600',
              fontSize: 34,
              color: MUTED,
              marginTop: 34,
              opacity: lin(f, c.item0, 8),
              letterSpacing: '0.02em',
            }}
          >
            results vary
          </div>
        </Move>
      </Safe>
    </Bg>
  );
};
