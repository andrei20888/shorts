import React from 'react';
import { Audio, Sequence, getStaticFiles, staticFile } from 'remotion';
import type { HookVariant } from '../config/copy';
import { EASE, keys, prog, type Key } from '../lib/anim';
import { MUSIC, SFX_CUES, VO_LINES, VO_MODE, type Cue } from '../timing';

/**
 * All audio, wired to the frames in timing.ts. Drop files into public/audio/ with
 * the same names and they play — a missing file is skipped instead of failing.
 *   public/audio/music.mp3        music bed (starts at MUSIC.start, volume envelope below)
 *   public/audio/vo.mp3           VO stem aligned to film 0:00   (VO_MODE = 'stem')
 *   public/audio/vo/line_NN.mp3   one file per VO line           (VO_MODE = 'lines')
 *   public/audio/sfx/<name>.mp3   alarm_beep, slap, whoosh, bass_hit, impact, heartbeat, rain, wind
 */
const exists = (() => {
  let names: Set<string> | null = null;
  return (name: string) => {
    if (!names) {
      try {
        names = new Set(getStaticFiles().map((f) => f.name));
      } catch {
        return true;
      }
    }
    return names.has(name);
  };
})();

const musicVolume = (absFrame: number) =>
  keys(
    absFrame,
    MUSIC.envelope.map(([fr, v]) => [fr, v, EASE.soft] as Key),
  );

const cueVolume = (f: number, c: Cue) => {
  let v = c.volume;
  if (c.fadeIn) v *= prog(f, 0, c.fadeIn, EASE.soft);
  if (c.fadeOut && c.dur) v *= 1 - prog(f, c.dur - c.fadeOut, c.dur, EASE.soft);
  return v;
};

export const Soundtrack: React.FC<{ variant: HookVariant }> = ({ variant }) => {
  const music = 'audio/music.mp3';
  const vo = 'audio/vo.mp3';
  return (
    <>
      {exists(music) ? (
        <Sequence name="Music" from={MUSIC.start} layout="none">
          <Audio src={staticFile(music)} volume={(f) => musicVolume(f + MUSIC.start)} />
        </Sequence>
      ) : null}

      {VO_MODE === 'stem' && exists(vo) ? (
        <Sequence name="VO stem" layout="none">
          <Audio src={staticFile(vo)} />
        </Sequence>
      ) : null}
      {VO_MODE === 'lines'
        ? VO_LINES.map((l, i) => {
            const name = `audio/vo/line_${String(i + 1).padStart(2, '0')}.mp3`;
            return exists(name) ? (
              <Sequence key={name} name={`VO ${i + 1}`} from={l.at} layout="none">
                <Audio src={staticFile(name)} />
              </Sequence>
            ) : null;
          })
        : null}

      {SFX_CUES.filter((c) => !c.variants || c.variants.includes(variant)).map((c, i) => {
        const name = `audio/sfx/${c.sfx}.mp3`;
        if (!exists(name)) return null;
        return (
          <Sequence key={`${c.sfx}-${c.at}-${i}`} name={`SFX ${c.sfx} @${c.at}`} from={c.at} durationInFrames={c.dur} layout="none">
            <Audio src={staticFile(name)} loop={c.loop} volume={(f) => cueVolume(f, c)} />
          </Sequence>
        );
      })}
    </>
  );
};
