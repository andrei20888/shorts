"""Build one Short end-to-end:  python3 engine/build.py videos/01-microchip [--from S --to S] [--skip-render]

script.json -> per-sentence TTS (Kokoro) -> timeline.json (beats + word timings)
            -> 3D frames (engine/render.mjs) -> music + SFX + VO mix (ducked, -14 LUFS) -> output/<id>.mp4
"""
import json, os, re, sys, subprocess, argparse
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'engine', 'audio'))
import synth  # noqa: E402

SR = synth.SR
MODELS = os.environ.get('TB_MODELS', os.path.expanduser('~/.cache/tb-models'))


def syllables(w):
    w = w.lower()
    if re.search(r'\d', w):
        return max(2, len(re.sub(r'\D', '', w)))
    w = re.sub(r'[^a-z]', '', w)
    n = len(re.findall(r'[aeiouy]+', w)) - (1 if w.endswith('e') and len(w) > 3 else 0)
    return max(1, n)


def tts(beats, voice, speed):
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(MODELS, 'kokoro-v1.0.onnx'), os.path.join(MODELS, 'voices-v1.0.bin'))
    cache = {}
    out = []
    for b in beats:
        sents = [s for s in re.split(r'(?<=[.!?…])\s+', b['say'].strip()) if s]
        clips = []
        for s in sents:
            key = (s, b.get('voice', voice), b.get('speed', speed))
            if key not in cache:
                a, sr = k.create(s, voice=key[1], speed=key[2], lang='en-us')
                a = signal.resample_poly(a, SR, sr).astype(np.float32)
                cache[key] = a
            clips.append((s, cache[key]))
        out.append(clips)
    return out


def build_timeline(spec, clips):
    t = spec.get('lead', 0.05)
    beats, vo = [], []
    cap_words_all = []
    for b, sclips in zip(spec['beats'], clips):
        start = t + b.get('pre', 0)
        t = start
        words = []
        cap = b.get('caption')
        sent_ranges = []
        for i, (s, a) in enumerate(sclips):
            vo.append((t, a))
            sent_ranges.append((s, t, t + len(a) / SR))
            t += len(a) / SR + (0.16 if i < len(sclips) - 1 else 0)
        end = t
        # word timings: distribute by syllable weight inside each sentence (caption override spans the beat)
        groups = [(cap, start, end)] if cap else sent_ranges
        for text, a0, a1 in groups:
            toks = text.split()
            wts = [syllables(w) + 0.35 + (0.8 if re.search(r'[,.!?—]$', w) else 0) for w in toks]
            tot, acc = sum(wts), 0
            for w, wt in zip(toks, wts):
                ws = a0 + (a1 - a0) * acc / tot
                acc += wt
                words.append({'w': w, 'start': round(ws, 3), 'end': round(a0 + (a1 - a0) * acc / tot, 3)})
        beat = {k: v for k, v in b.items() if k not in ('say',)}
        beat.update(start=round(start, 3), end=round(end, 3), words=words)
        beats.append(beat)
        cap_words_all += words
        t = end + b.get('hold', 0) + b.get('pause', 0.22)
    duration = round(t + spec.get('tail', 0.3), 3)
    return {'id': spec['id'], 'duration': duration, 'beats': beats}, vo


def mix(duration, vo_parts, cues, breaks, out_wav, music_gain=0.22):
    n = int(duration * SR)
    vo = np.zeros(n)
    for at, a in vo_parts:
        i = int(at * SR)
        vo[i:i + len(a)] += a[: max(0, n - i)]
    vo = synth.filt(vo, 'highpass', 75)
    vo = vo / (np.max(np.abs(vo)) or 1) * 0.92
    # VO envelope for ducking
    env = np.abs(vo)
    env = signal.lfilter([1 - 0.9995], [1, -0.9995], env)
    env = env / (env.max() or 1)
    duck = 1 - 0.6 * np.clip(env * 3, 0, 1)
    mus = synth.music(duration, breaks=breaks) * music_gain * duck[:, None]
    sfx = np.zeros((n, 2))
    for c in cues:
        name = c['sfx']
        if name not in synth.SFX:
            continue
        x = synth.SFX[name](c['dur']) if 'dur' in c else synth.SFX[name]()
        i = int(c['t'] * SR)
        if i >= n:
            continue
        x = x[: n - i] * c.get('gain', 0.5)
        pan = c.get('pan', 0)
        sfx[i:i + len(x), 0] += x * (1 - max(0, pan))
        sfx[i:i + len(x), 1] += x * (1 + min(0, pan))
    y = mus + sfx + vo[:, None]
    y = np.tanh(y * 1.1) / 1.1  # soft clip safety
    sf.write(out_wav, y.astype(np.float32), SR)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir')
    ap.add_argument('--from', dest='t0')
    ap.add_argument('--to', dest='t1')
    ap.add_argument('--skip-render', action='store_true')
    ap.add_argument('--skip-tts', action='store_true')
    a = ap.parse_args()
    vdir = os.path.abspath(a.dir)
    spec = json.load(open(os.path.join(vdir, 'script.json')))
    bdir = os.path.join(ROOT, 'build', spec['id'])
    os.makedirs(bdir, exist_ok=True)
    tl_path, vo_npz = os.path.join(bdir, 'timeline.json'), os.path.join(bdir, 'vo.npz')

    if a.skip_tts and os.path.exists(vo_npz):
        tl = json.load(open(tl_path))
        z = np.load(vo_npz)
        vo = list(zip(z['at'], [z[f'a{i}'] for i in range(len(z['at']))]))
    else:
        print('· TTS')
        clips = tts(spec['beats'], spec.get('voice', 'af_heart'), spec.get('speed', 1.08))
        tl, vo = build_timeline(spec, clips)
        json.dump(tl, open(tl_path, 'w'), indent=1)
        np.savez(vo_npz, at=np.array([x for x, _ in vo]), **{f'a{i}': y for i, (_, y) in enumerate(vo)})
    print(f'· timeline {tl["duration"]:.1f}s, {len(tl["beats"])} beats')

    video = os.path.join(bdir, 'video.mp4')
    cues_path = os.path.join(bdir, 'cues.json')
    rng = []
    if a.t0: rng += ['--from', a.t0]
    if a.t1: rng += ['--to', a.t1]
    if not a.skip_render:
        print('· render frames')
        subprocess.run(['node', os.path.join(ROOT, 'engine', 'render.mjs'), 'video', os.path.join(vdir, 'scene.js'), tl_path, video, '--cues', cues_path] + rng, check=True)

    cues = json.load(open(cues_path)) if os.path.exists(cues_path) else []
    breaks = [(c['t'], c['t'] + c['dur']) for c in cues if c['sfx'] == 'break']
    wav = os.path.join(bdir, 'mix.wav')
    print('· mix audio')
    mix(tl['duration'], vo, cues, breaks, wav)

    os.makedirs(os.path.join(ROOT, 'output'), exist_ok=True)
    out = os.path.join(ROOT, 'output', spec['id'] + ('-preview' if rng else '') + '.mp4')
    ss = ['-ss', a.t0] if a.t0 else []
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video, *ss, '-i', wav,
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', out], check=True)
    print('✓', out)


if __name__ == '__main__':
    main()
