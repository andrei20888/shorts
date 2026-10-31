import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, H, W} from './theme';
import {FRAMES_15, FRAMES_28, Thumbnail, Video15, Video28} from './Videos';

export const Root: React.FC = () => (
  <>
    <Composition
      id="AbsForReal28"
      component={Video28}
      durationInFrames={FRAMES_28}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="AbsForReal15"
      component={Video15}
      durationInFrames={FRAMES_15}
      fps={FPS}
      width={W}
      height={H}
    />
    <Still id="Thumbnail" component={Thumbnail} width={W} height={H} />
  </>
);
