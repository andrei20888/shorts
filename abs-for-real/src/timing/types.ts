/** Cue sheet written by audio/build_audio.py: every number is a frame at `fps`. */
export type SceneTiming = {
  id: string;
  from: number;
  dur: number;
  /** cues relative to the scene start, in frames */
  cues: Record<string, number>;
  /** whether the whole frame pumps with the beat in this scene */
  pump: boolean;
};

export type Timing = {
  fps: number;
  frames: number;
  bpm: number;
  /** frame of the "LYING" drop: beat 0 of the music grid */
  anchorFrame: number;
  /** path under public/ */
  audio: string;
  scenes: SceneTiming[];
};

export type SceneProps = {
  /** cue frames, local to the scene */
  c: Record<string, number>;
  /** scene length in frames */
  dur: number;
};
