import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Bg, Flash, Move, Plate, Safe, Txt, Underline} from '../components';
import {drift, impact, overshoot, prog, pulse, punch, shake, slam} from '../anim';
import {LIME} from '../theme';

export type Scene5aTiming = {dur: number; priceAt: number; accessAt: number; underlineAt: number};
export type Scene5bTiming = {dur: number; dateAt: number; pulseAt: number};

export const SCENE5A_28: Scene5aTiming = {dur: 120, priceAt: 30, accessAt: 78, underlineAt: 90};
export const SCENE5A_15: Scene5aTiming = {dur: 78, priceAt: 18, accessAt: 48, underlineAt: 58};
export const SCENE5B_28: Scene5bTiming = {dur: 78, dateAt: 30, pulseAt: 57};
export const SCENE5B_15: Scene5bTiming = {dur: 60, dateAt: 18, pulseAt: 42};

/** 5a: "Founder spots:" → "29 €" slams on a lime plate → "lifetime access". */
export const Scene5a: React.FC<{t: Scene5aTiming}> = ({t}) => {
  const f = useCurrentFrame();
  const head = slam(f, 0);
  const price = slam(f, t.priceAt);
  const sh = shake(f, t.priceAt, 3, 16, 's5a');
  const access = punch(f, t.accessAt, 9);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, t.dur, 1.03)} x={sh.x} y={sh.y}>
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
              <Underline progress={prog(f, t.underlineAt, 8)}>lifetime</Underline> access
            </Txt>
          </Move>
        </Move>
      </Safe>
      <Flash opacity={impact(f, t.priceAt)} />
    </Bg>
  );
};

/** 5b: "Program starts" → "Nov 23" in lime with overshoot and one pulse. */
export const Scene5b: React.FC<{t: Scene5bTiming}> = ({t}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const head = slam(f, 0);
  const sh = shake(f, 0, 2, 10, 's5b');
  const date = overshoot(f, t.dateAt, fps) * pulse(f, t.pulseAt, 8, 0.06);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, t.dur, 1.03)} x={sh.x} y={sh.y}>
          <Move scale={head.scale} opacity={head.opacity}>
            <Txt size={120}>Program starts</Txt>
          </Move>
          <Move scale={date} opacity={f >= t.dateAt ? 1 : 0} style={{marginTop: 24}}>
            <Txt size={260} color={LIME} style={{letterSpacing: '-0.03em'}}>
              Nov 23
            </Txt>
          </Move>
        </Move>
      </Safe>
    </Bg>
  );
};
