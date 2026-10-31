import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Bg, Move, Plate, Safe, Txt} from '../components';
import {lin, pulse, punch, slam} from '../anim';
import {Logo} from '../Logo';

export type Scene6Timing = {dur: number; linkAt: number; urlAt: number; pulses: number[]};
export const SCENE6_28: Scene6Timing = {dur: 90, linkAt: 3, urlAt: 18, pulses: [42, 66]};
export const SCENE6_15: Scene6Timing = {dur: 72, linkAt: 3, urlAt: 15, pulses: [36, 57]};

/** CTA: small logo on top, "Link in bio", absforreal.com on a lime plate that pulses twice, fade to black. */
export const Scene6: React.FC<{t: Scene6Timing}> = ({t}) => {
  const f = useCurrentFrame();
  const link = slam(f, t.linkAt);
  const url = punch(f, t.urlAt, 9);
  let p = 1;
  for (const at of t.pulses) p *= pulse(f, at, 10, 0.07);
  return (
    <Bg>
      <Safe>
        <Logo height={120} />
        <Move scale={link.scale} opacity={link.opacity} style={{marginTop: 70}}>
          <Txt size={130}>Link in bio</Txt>
        </Move>
        <Move scale={url.scale * p} opacity={url.opacity} style={{marginTop: 44}}>
          <Txt size={64}>
            <Plate>absforreal.com</Plate>
          </Txt>
        </Move>
      </Safe>
      <AbsoluteFill style={{backgroundColor: '#000', opacity: lin(f, t.dur - 9, 9)}} />
    </Bg>
  );
};
