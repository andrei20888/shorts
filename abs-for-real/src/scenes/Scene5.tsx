import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Flash, Move, Plate, Safe, Txt, Underline} from '../components';
import {drift, impact, overshoot, prog, pulse, punch, shake, slam} from '../anim';
import {LIME} from '../theme';
import type {SceneProps} from '../timing/types';

/** 5a: "Founder spots:" → "29 €" slams on a lime plate on the word → "lifetime access". */
export const Scene5a: React.FC<SceneProps> = ({c, dur}) => {
  const f = useCurrentFrame();
  const head = slam(f, 0);
  const price = slam(f, c.price);
  const sh = shake(f, c.price, 3, 16, 's5a');
  const access = punch(f, c.access, 9);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, dur, 1.03)} x={sh.x} y={sh.y}>
          <Move scale={head.scale} opacity={head.opacity}>
            <Txt size={110}>Founder spots:</Txt>
          </Move>
          <Move scale={price.scale} opacity={price.opacity} style={{marginTop: 36}}>
            <Txt size={300} style={{letterSpacing: '-0.03em'}}>
              <Plate>29 €</Plate>
            </Txt>
          </Move>
          <Move scale={access.scale} opacity={access.opacity} style={{marginTop: 36}}>
            <Txt size={100}>
              <Underline progress={prog(f, c.underline, 8)}>lifetime</Underline> access
            </Txt>
          </Move>
        </Move>
      </Safe>
      <Flash opacity={impact(f, c.price)} />
    </Bg>
  );
};

/** 5b: "Program starts" → "Nov 7" in lime with overshoot on the word and one pulse. */
export const Scene5b: React.FC<SceneProps> = ({c, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const head = slam(f, 0);
  const sh = shake(f, 0, 2, 10, 's5b');
  const date = overshoot(f, c.date, fps) * pulse(f, c.pulse, 8, 0.06);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, dur, 1.03)} x={sh.x} y={sh.y}>
          <Move scale={head.scale} opacity={head.opacity}>
            <Txt size={120}>Program starts</Txt>
          </Move>
          <Move scale={date} opacity={f >= c.date ? 1 : 0} style={{marginTop: 24}}>
            <Txt size={260} color={LIME} style={{letterSpacing: '-0.03em'}}>
              Nov 7
            </Txt>
          </Move>
        </Move>
      </Safe>
    </Bg>
  );
};
