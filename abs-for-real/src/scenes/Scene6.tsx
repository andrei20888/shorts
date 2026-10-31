import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Bg, Move, Plate, Safe, Txt} from '../components';
import {lin, pulse, punch, slam} from '../anim';
import {Logo} from '../Logo';
import type {SceneProps} from '../timing/types';

/** CTA: small logo on top, "Link in bio" on the voice, absforreal.com pops and pulses twice, fade out. */
export const Scene6: React.FC<SceneProps> = ({c, dur}) => {
  const f = useCurrentFrame();
  const link = slam(f, 2);
  const url = punch(f, c.url, 9);
  const p = pulse(f, c.pulse0, 10, 0.07) * pulse(f, c.pulse1, 10, 0.07);
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
      <AbsoluteFill style={{backgroundColor: '#000', opacity: lin(f, dur - 9, 9)}} />
    </Bg>
  );
};
