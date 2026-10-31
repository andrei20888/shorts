import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Move, Safe, Txt} from '../components';
import {drift, easeOut, lin, overshoot, pulse, punch} from '../anim';
import {FONT, LIME, MUTED, SAFE} from '../theme';

const ITEMS = ['a stronger core', 'a smaller waist', 'habits that stick'];
const ITEM_AT = [54, 87, 120];
const SQUARE_PULSE_AT = 150;

/** Scene 3 (168 frames): the pivot from anger to hope. */
export const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = punch(f, 0, 9);
  const can = overshoot(f, 24, fps);
  const titleY = interpolate(f, [36, 48], [190, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, 168, 1.03)}>
          <Move scale={title.scale} opacity={title.opacity} y={titleY}>
            <Txt size={150}>What 30 days</Txt>
            <Txt size={240} style={{marginTop: 4}}>
              <span
                style={{
                  display: 'inline-block',
                  color: LIME,
                  transform: `scale(${can})`,
                  opacity: f >= 24 ? 1 : 0,
                }}
              >
                CAN
              </span>{' '}
              <span style={{opacity: f >= 24 ? 1 : 0}}>do:</span>
            </Txt>
          </Move>
          <div style={{height: 380, marginTop: 50, display: 'flex', flexDirection: 'column', gap: 26}}>
            {ITEMS.map((text, i) => {
              const at = ITEM_AT[i];
              const p = punch(f, at, 9, 1.1);
              const x = interpolate(f, [at, at + 9], [-30, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              });
              const sq = overshoot(f, at + 2, fps) * pulse(f, SQUARE_PULSE_AT, 8, 0.3);
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
        </Move>
      </Safe>
      <AbsoluteFill style={{top: 1240, paddingLeft: SAFE.left, paddingRight: SAFE.right}}>
        <div
          style={{
            ...FONT,
            fontWeight: 600,
            fontVariationSettings: '"wdth" 80, "wght" 600',
            fontSize: 34,
            color: MUTED,
            textAlign: 'center',
            opacity: lin(f, 87, 8),
            letterSpacing: '0.02em',
          }}
        >
          results vary
        </div>
      </AbsoluteFill>
    </Bg>
  );
};
