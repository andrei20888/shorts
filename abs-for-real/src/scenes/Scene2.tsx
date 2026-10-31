import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Bg, Move, Plate, Safe, Strike, Txt} from '../components';
import {drift, prog, pulse, punch, shake, slam} from '../anim';

/** 2a (72 frames): "Crunches" slams, then "don’t burn belly fat." with "burn" struck through. */
export const Scene2a: React.FC = () => {
  const f = useCurrentFrame();
  const s = slam(f);
  const sh = shake(f, 0, 2, 12, 's2a');
  const p = punch(f, 30, 9);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, 72, 1.03)} x={sh.x} y={sh.y}>
          <Move scale={s.scale}>
            <Txt size={200}>Crunches</Txt>
          </Move>
          <Move scale={p.scale} opacity={p.opacity} style={{marginTop: 30}}>
            <Txt size={110}>
              don’t <Strike progress={prog(f, 51, 8)}>burn</Strike>
              <br />
              belly fat.
            </Txt>
          </Move>
        </Move>
      </Safe>
    </Bg>
  );
};

/** 2b (78 frames): "You can’t" (plate) slams, "spot-reduce." reveals, block kicks once. */
export const Scene2b: React.FC = () => {
  const f = useCurrentFrame();
  const s = slam(f);
  const sh = shake(f, 0, 3, 14, 's2b');
  const p = punch(f, 36, 9);
  return (
    <Bg>
      <Safe>
        <Move scale={drift(f, 78, 1.03) * pulse(f, 60, 8, 0.05)} x={sh.x} y={sh.y}>
          <Move scale={s.scale}>
            <Txt size={180}>
              You <Plate>can’t</Plate>
            </Txt>
          </Move>
          <Move scale={p.scale} opacity={p.opacity} style={{marginTop: 40}}>
            <Txt size={150}>spot‑reduce.</Txt>
          </Move>
        </Move>
      </Safe>
    </Bg>
  );
};
