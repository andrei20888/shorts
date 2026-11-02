import React from 'react';
import { Audio, Sequence, getStaticFiles, staticFile } from 'remotion';
import type { HookVariant } from '../config/copy';
import { EASE, keys, prog, type Key } from '../lib/anim';
import { VO_DURATIONS } from '../config/voTiming';
import { VO_DUCK_DB } from '../config/voDuck';
import { FPS, MUSIC, SFX_CUES, MASTER_GAIN_DB, VO_DUCK_BRIDGE, VO_LINES, VO_MODE, type Cue } from '../timing';

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

/** Spoken spans [start, end, duckDb]; lines closer than VO_DUCK_BRIDGE share one dip. */
const DUCK_SPANS = (() => {
  const spans: Array<[number, number, number]> = [];
  VO_LINES.forEach((l, i) => {
    const end = l.at + (VO_DURATIONS[i] ?? 2) * FPS;
    const db = VO_DUCK_DB[i] ?? 6;
    const last = spans[spans.length - 1];
    if (last && l.at - last[1] < VO_DUCK_BRIDGE) {
      last[1] = Math.max(last[1], end);
      last[2] = Math.max(last[2], db);
    } else spans.push([l.at, end, db]);
  });
  return spans;
})();

/** dB the music is pulled down at a frame (smooth attack before each line, slow release). */
const duckDb = (f: number) => {
  let d = 0;
  for (const [a, b, db] of DUCK_SPANS) {
    const up = prog(f, a - 8, a + 2, EASE.soft);
    const down = 1 - prog(f, b + 2, b + 20, EASE.soft);
    d = Math.max(d, db * Math.min(up, down));
  }
  return d;
};

const musicVolume = (absFrame: number) =>
  keys(
    absFrame,
    MUSIC.envelope.map(([fr, v]) => [fr, v, EASE.soft] as Key),
  ) *
  10 ** ((MUSIC.gainDb + MASTER_GAIN_DB - duckDb(absFrame)) / 20);

const MASTER = 10 ** (MASTER_GAIN_DB / 20);

const cueVolume = (f: number, c: Cue) => {
  let v = c.volume * MASTER;
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
                <Audio src={staticFile(name)} volume={MASTER} />
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
