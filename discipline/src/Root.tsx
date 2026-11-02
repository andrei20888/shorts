import React from 'react';
import { Composition, Folder } from 'remotion';
import { CharacterSheet } from './compositions/CharacterSheet';
import { Film } from './compositions/Film';
import { Thumbnail } from './compositions/Thumbnail';
import { loadFonts } from './lib/fonts';
import { DURATION, FPS, HEIGHT, HOOK_PREVIEW_DURATION, WIDTH } from './timing';

loadFonts();

const V = { width: HEIGHT, height: WIDTH }; // 1080×1920

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* The film — hook variant A */}
      <Composition
        id="Discipline"
        component={Film}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ variant: 'A', audio: true }}
      />
      <Composition
        id="Discipline-Vertical"
        component={Film}
        durationInFrames={DURATION}
        fps={FPS}
        width={V.width}
        height={V.height}
        defaultProps={{ variant: 'A', audio: true }}
      />

      {/* A/B test: first 6 seconds with each hook variant */}
      <Folder name="Hooks">
        {(['A', 'B', 'C'] as const).map((variant) => (
          <React.Fragment key={variant}>
            <Composition
              id={`Hook-${variant}`}
              component={Film}
              durationInFrames={HOOK_PREVIEW_DURATION}
              fps={FPS}
              width={WIDTH}
              height={HEIGHT}
              defaultProps={{ variant, audio: true }}
            />
            <Composition
              id={`Hook-${variant}-Vertical`}
              component={Film}
              durationInFrames={HOOK_PREVIEW_DURATION}
              fps={FPS}
              width={V.width}
              height={V.height}
              defaultProps={{ variant, audio: true }}
            />
          </React.Fragment>
        ))}
      </Folder>

      <Folder name="Thumbnails">
        <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
        <Composition id="Thumbnail-Vertical" component={Thumbnail} durationInFrames={1} fps={FPS} width={V.width} height={V.height} />
      </Folder>

      <Folder name="Dev">
        <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={120} fps={FPS} width={WIDTH} height={HEIGHT} />
      </Folder>
    </>
  );
};
