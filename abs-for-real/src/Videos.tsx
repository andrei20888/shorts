import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {useArchivo} from './fonts';
import {BG} from './theme';
import {Hook, HOOK_FRAMES, HookH1} from './scenes/Hook';
import {Scene2a, Scene2b} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4, SCENE4_15, SCENE4_28} from './scenes/Scene4';
import {Scene5a, Scene5b, SCENE5A_15, SCENE5A_28, SCENE5B_15, SCENE5B_28} from './scenes/Scene5';
import {Scene6, SCENE6_15, SCENE6_28} from './scenes/Scene6';

type Cut = {dur: number; node: React.ReactNode};

/** Lays out cuts back to back and returns the total length in frames. */
const timeline = (cuts: Cut[]) => {
  let at = 0;
  const nodes = cuts.map((c, i) => {
    const el = (
      <Sequence key={i} from={at} durationInFrames={c.dur}>
        {c.node}
      </Sequence>
    );
    at += c.dur;
    return el;
  });
  return {nodes, total: at};
};

const CUTS_28: Cut[] = [
  {dur: HOOK_FRAMES, node: <Hook />}, // 0.0–3.6
  {dur: 72, node: <Scene2a />}, // 3.6–6.0
  {dur: 78, node: <Scene2b />}, // 6.0–8.6
  {dur: 168, node: <Scene3 />}, // 8.6–14.2
  {dur: SCENE4_28.dur, node: <Scene4 t={SCENE4_28} />}, // 14.2–19.4
  {dur: SCENE5A_28.dur, node: <Scene5a t={SCENE5A_28} />}, // 19.4–23.4
  {dur: SCENE5B_28.dur, node: <Scene5b t={SCENE5B_28} />}, // 23.4–26.0
  {dur: SCENE6_28.dur, node: <Scene6 t={SCENE6_28} />}, // 26.0–29.0
];

const CUTS_15: Cut[] = [
  {dur: HOOK_FRAMES, node: <Hook />}, // 0.0–3.6
  {dur: SCENE4_15.dur, node: <Scene4 t={SCENE4_15} />}, // 3.6–8.0
  {dur: SCENE5A_15.dur, node: <Scene5a t={SCENE5A_15} />}, // 8.0–10.6
  {dur: SCENE5B_15.dur, node: <Scene5b t={SCENE5B_15} />}, // 10.6–12.6
  {dur: SCENE6_15.dur, node: <Scene6 t={SCENE6_15} />}, // 12.6–15.0
];

export const FRAMES_28 = CUTS_28.reduce((a, c) => a + c.dur, 0); // 870
export const FRAMES_15 = CUTS_15.reduce((a, c) => a + c.dur, 0); // 450

const Shell: React.FC<{children: React.ReactNode}> = ({children}) => {
  useArchivo();
  return <AbsoluteFill style={{backgroundColor: BG}}>{children}</AbsoluteFill>;
};

export const Video28: React.FC = () => <Shell>{timeline(CUTS_28).nodes}</Shell>;
export const Video15: React.FC = () => <Shell>{timeline(CUTS_15).nodes}</Shell>;

/** Thumbnail = hook frame H1 at 0.6s (strike already drawn). */
export const Thumbnail: React.FC = () => (
  <Shell>
    <Sequence from={-18} durationInFrames={27}>
      <HookH1 />
    </Sequence>
  </Shell>
);
