import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useArchivo} from './fonts';
import {BG} from './theme';
import {Hook, HookH1} from './scenes/Hook';
import {Scene2a, Scene2b} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5a, Scene5b} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import type {SceneProps, Timing} from './timing/types';
import longTiming from './timing/long.json';
import shortTiming from './timing/short.json';

export const TIMING_LONG = longTiming as unknown as Timing;
export const TIMING_SHORT = shortTiming as unknown as Timing;

const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook,
  s2a: Scene2a,
  s2b: Scene2b,
  s3: Scene3,
  s4: Scene4,
  s5a: Scene5a,
  s5b: Scene5b,
  s6: Scene6,
};

/** Whole-frame pump on every kick (130 BPM grid anchored at the "LYING" drop). */
const useBeatPump = (t: Timing): number => {
  const frame = useCurrentFrame();
  const scene = t.scenes.find((s) => frame >= s.from && frame < s.from + s.dur);
  if (!scene || !scene.pump || frame < t.anchorFrame) return 1;
  const beatFrames = (t.fps * 60) / t.bpm;
  const phase = ((frame - t.anchorFrame) % beatFrames) / t.fps;
  return 1 + 0.012 * Math.exp(-phase / 0.1);
};

const Video: React.FC<{t: Timing}> = ({t}) => {
  useArchivo();
  const pump = useBeatPump(t);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Audio src={staticFile(t.audio)} />
      <AbsoluteFill style={{transform: `scale(${pump})`}}>
        {t.scenes.map((s) => {
          const C = SCENES[s.id];
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
              <C c={s.cues} dur={s.dur} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const VideoLong: React.FC = () => <Video t={TIMING_LONG} />;
export const VideoShort: React.FC = () => <Video t={TIMING_SHORT} />;

/** Thumbnail = hook frame H1 with the strike already drawn. */
export const Thumbnail: React.FC = () => {
  useArchivo();
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Sequence from={-30} durationInFrames={60}>
        <HookH1 />
      </Sequence>
    </AbsoluteFill>
  );
};
