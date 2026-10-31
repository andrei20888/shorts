import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, H, W} from './theme';
import {Thumbnail, TIMING_LONG, TIMING_SHORT, VideoLong, VideoShort} from './Videos';

export const Root: React.FC = () => (
  <>
    <Composition
      id="AbsForRealLong"
      component={VideoLong}
      durationInFrames={TIMING_LONG.frames}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="AbsForRealShort"
      component={VideoShort}
      durationInFrames={TIMING_SHORT.frames}
      fps={FPS}
      width={W}
      height={H}
    />
    <Still id="Thumbnail" component={Thumbnail} width={W} height={H} />
  </>
);
