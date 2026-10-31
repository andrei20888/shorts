"""Procedural score + sound design + final mix for a short.

usage: python3 mix.py <short_dir>
Reads  <short_dir>/_work/vo.wav, <short_dir>/_work/render/cues.json
Writes <short_dir>/_work/mix.wav (loudness-normalised later by ffmpeg)
"""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve

SR = 48000
RNG = np.random.default_rng(7)


# ---------- primitives ----------
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, r=None, curve=4.0):
    n = int(d * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.exp(-curve * t / d) if r is None else np.clip(1 - (t - (d - r)) / r, 0, 1)
    return e * rel


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), x)


def sweep(f0, f1, d, kind='exp'):
    t = t_axis(d)
    f = f0 * (f1 / f0) ** (t / d) if kind == 'exp' else f0 + (f1 - f0) * t / d
    return np.cumsum(f) / SR * 2 * np.pi


def saw(phase):
    return 2 * ((phase / (2 * np.pi)) % 1) - 1


def noise(d):
    return RNG.standard_normal(int(d * SR))


def ir(d=1.8, decay=3.2):
    t = t_axis(d)
    l = noise(d) * np.exp(-decay * t)
    r = noise(d) * np.exp(-decay * t)
    return lp(np.stack([l, r], 1).T, 7000).T * 0.08


def stereo(x, pan=0.0):
    return np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1)


def add(buf, x, t, gain=1.0):
    if x.ndim == 1:
        x = stereo(x)
    i = int(t * SR)
    if i >= len(buf):
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- sound effects ----------
def sfx_impact(big=1.0):
    d = 1.4
    t = t_axis(d)
    body = np.sin(sweep(130, 34, d)) * np.exp(-3.2 * t)
    sub = np.sin(2 * np.pi * 42 * t) * np.exp(-2.2 * t) * 0.6
    crack = lp(noise(d), 3500) * np.exp(-28 * t) * 0.9
    tail = lp(noise(d), 900) * np.exp(-4 * t) * 0.25
    return np.tanh((body + sub + crack + tail) * 1.6 * big) * 0.9


def sfx_whoosh(d=0.55, up=True):
    n = noise(d)
    t = t_axis(d)
    centre = np.where(t < d * 0.6, 300 + 3800 * (t / (d * 0.6)), 4100 - 3000 * ((t - d * 0.6) / (d * 0.4)))
    out = np.zeros_like(n)
    blocks = 24
    for b in range(blocks):
        a, z = len(n) * b // blocks, len(n) * (b + 1) // blocks
        c = centre[(a + z) // 2]
        out[a:z] = bp(n, max(80, c * 0.6), c * 1.5)[a:z]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    return out * e * 0.9


def sfx_riser(d=1.2):
    t = t_axis(d)
    tone = saw(sweep(110, 880, d)) * 0.25 + saw(sweep(111.5, 884, d)) * 0.25
    tone = lp(tone, 4000)
    hiss = hp(noise(d), 2500) * 0.4
    e = (t / d) ** 2.2
    return (tone + hiss) * e * 0.7


def sfx_pop():
    d = 0.12
    t = t_axis(d)
    return (np.sin(sweep(700, 1500, d)) * np.exp(-30 * t) * 0.7 + hp(noise(d), 4000) * np.exp(-90 * t) * 0.3)


def sfx_tick(f=2600, g=1.0):
    d = 0.05
    t = t_axis(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-90 * t) + bp(noise(d), 3000, 9000) * np.exp(-140 * t) * 0.6) * 0.5 * g


def sfx_count(d):
    out = np.zeros(int((d + 0.1) * SR))
    k, tt = 0, 0.0
    while tt < d:
        x = sfx_tick(1800 + 1600 * tt / d, 0.55)
        i = int(tt * SR)
        out[i:i + len(x)] += x[:len(out) - i]
        gap = 0.028 + 0.06 * (tt / d) ** 2  # ticks slow down as the counter settles
        tt += gap
        k += 1
    return out


def sfx_ticks(d):
    out = np.zeros(int((d + 0.2) * SR))
    for i in range(3):
        x = sfx_tick(1500, 1.3)
        a = int(i * d / 3 * SR)
        out[a:a + len(x)] += x
    return out


def sfx_lock():
    a, b = sfx_tick(900, 1.6), sfx_tick(1300, 1.8)
    out = np.zeros(int(0.2 * SR))
    out[:len(a)] += a
    out[int(0.07 * SR):int(0.07 * SR) + len(b)] += b
    return out * 1.2


def sfx_stamp(soft=False):
    d = 0.5
    t = t_axis(d)
    thump = np.sin(sweep(160, 50, d)) * np.exp(-12 * t)
    slap = bp(noise(d), 600, 5000) * np.exp(-35 * t)
    return (thump * 0.9 + slap * 0.6) * (0.55 if soft else 1.0)


def sfx_reveal():
    d = 1.6
    t = t_axis(d)
    out = np.zeros_like(t)
    for i, m in enumerate([86, 90, 93, 98]):
        out += np.sin(2 * np.pi * mtof(m) * t + i) * np.exp(-2.4 * t) * np.minimum(1, t / 0.01) * 0.22
    st = sfx_stamp(True)
    out[:len(st)] += st * 0.5
    return out


def sfx_charge(down=False):
    d = 0.5
    t = t_axis(d)
    ph = sweep(240, 60, d) if down else sweep(60, 240, d)
    hum = saw(ph) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t))
    zap = hp(noise(d), 3000) * np.exp(-18 * (d - t if not down else t)) * 0.5
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return lp(hum, 2500) * e * 0.5 + zap * 0.4


def sfx_flow(d):
    t = t_axis(d)
    crackle = bp(noise(d), 2000, 8000) * (RNG.random(len(t)) < 0.02) * 3
    buzz = lp(saw(2 * np.pi * 120 * t), 900) * 0.25
    e = np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3)
    return (crackle * 0.3 + buzz) * e * 0.6


def sfx_digit():
    d = 1.2
    t = t_axis(d)
    ding = sum(np.sin(2 * np.pi * f * t) * np.exp(-k * t) * a for f, k, a in [(1318, 3, 0.4), (2637, 5, 0.18), (3951, 8, 0.08)])
    sub = np.sin(sweep(90, 40, d)) * np.exp(-6 * t) * 0.7
    return ding + sub


SFX = {
    'impact': lambda c: sfx_impact(1.0), 'whoosh': lambda c: sfx_whoosh(), 'whoosh_hit': lambda c: sfx_whoosh(0.45),
    'riser': lambda c: sfx_riser(c.get('d', 1.0)), 'riser_short': lambda c: sfx_riser(0.32) * 0.6, 'pop': lambda c: sfx_pop(),
    'count': lambda c: sfx_count(c['d']), 'ticks': lambda c: sfx_ticks(c['d']), 'lock': lambda c: sfx_lock(),
    'stamp': lambda c: sfx_stamp(), 'stamp_soft': lambda c: sfx_stamp(True), 'reveal': lambda c: sfx_reveal(),
    'charge': lambda c: sfx_charge(), 'discharge': lambda c: sfx_charge(True), 'flow': lambda c: sfx_flow(c['d']), 'digit': lambda c: sfx_digit(),
}
SFX_GAIN = {'whoosh': 0.5, 'whoosh_hit': 0.55, 'pop': 0.35, 'count': 0.35, 'ticks': 0.6, 'riser': 0.45, 'impact': 0.85, 'flow': 0.45, 'charge': 0.6, 'discharge': 0.6, 'digit': 0.6, 'stamp': 0.6, 'reveal': 0.6, 'lock': 0.5}
# where an effect lands relative to its cue (risers end on the cue they lead into)
SFX_OFFSET = {'whoosh': -0.2}


# ---------- music ----------
def music(dur, cues, bpm=120):
    beat = 60 / bpm
    out = np.zeros((int((dur + 2) * SR), 2))
    t_drop = next(c['t'] for c in cues if c['type'] == 'impact')
    quiet = [(c['t'], c['t'] + c['d']) for c in cues if c['type'] == 'ticks']
    # Dm - Bb - F - C, one chord per bar (4 beats)
    prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    bar = 4 * beat
    nb = int(dur / bar) + 2
    kick_d = 0.45
    kt = t_axis(kick_d)
    kick = np.tanh(np.sin(sweep(150, 45, kick_d)) * np.exp(-7 * kt) * 2.2) * 0.9
    hat_d = 0.06
    hat = hp(noise(hat_d), 7000) * np.exp(-60 * t_axis(hat_d)) * 0.25
    for b in range(nb):
        root, chord = prog[b % 4]
        t0 = t_drop + b * bar
        # pad
        pd = bar + 0.3
        pt = t_axis(pd)
        pad = sum(saw(2 * np.pi * mtof(m) * pt * (1 + dt)) for m in chord for dt in (-0.004, 0.004)) / 6
        pad = lp(pad, 1400) * env(pd, a=0.25, r=0.4) * 0.16
        add(out, pad, t0)
        for s in range(16):
            ts = t0 + s * beat / 4
            if ts > dur:
                break
            in_quiet = any(a - 0.05 <= ts < b2 for a, b2 in quiet)
            # bass: 8ths, pumping
            if s % 2 == 0 and not in_quiet:
                bd = beat / 2
                bt = t_axis(bd)
                bass = np.tanh(saw(2 * np.pi * mtof(root - 12) * bt) * 1.5) * env(bd, a=0.01, curve=2.5)
                add(out, lp(bass, 600) * 0.32, ts)
            # kick on beats
            if s % 4 == 0 and not in_quiet:
                add(out, kick * 0.75, ts)
            # hats on off-16ths once the story gets going
            if s % 2 == 1 and not in_quiet and ts > t_drop + 2.5:
                add(out, stereo(hat, 0.3 if s % 4 == 1 else -0.3) * (0.7 if s % 4 == 3 else 0.45), ts)
            # arp pluck
            if not in_quiet:
                note = chord[[0, 1, 2, 1][s % 4]] + (12 if s % 8 >= 4 else 0)
                ad = 0.22
                at = t_axis(ad)
                bright = 1200 + 3000 * min(1, (ts - t_drop) / dur)
                pl = saw(2 * np.pi * mtof(note) * at) * np.exp(-14 * at)
                add(out, stereo(lp(pl, bright) * 0.11, 0.25 * np.sin(s)), ts)
    # gentle fade in under the hook and out at the very end so the loop seam is soft
    n = len(out)
    fade = np.ones(n)
    fade[:int(0.15 * SR)] = np.linspace(0, 1, int(0.15 * SR))
    e = int(dur * SR)
    fade[e - int(0.6 * SR):e] = np.linspace(1, 0.5, int(0.6 * SR))
    fade[e:] = 0
    return out * fade[:, None]


def follow(x, attack=0.01, release=0.25):
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    y = np.zeros_like(x)
    lvl = 0.0
    ax = np.abs(x)
    # block-wise envelope (fast enough in numpy)
    blk = 240
    for i in range(0, len(x), blk):
        v = ax[i:i + blk].max()
        c = a if v > lvl else r
        lvl = c ** blk * lvl + (1 - c ** blk) * v
        y[i:i + blk] = lvl
    return y


def main(short_dir):
    work = os.path.join(short_dir, '_work')
    vo, sr = sf.read(os.path.join(work, 'vo.wav'))
    vo = resample_poly(vo, SR, sr)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.9
    cues = json.load(open(os.path.join(work, 'render', 'cues.json')))
    dur = len(vo) / SR
    n = len(vo)

    mus = music(dur, cues)[:n]
    fx = np.zeros((n + SR * 2, 2))
    for c in cues:
        f = SFX[c['type']](c)
        t = c['t'] + SFX_OFFSET.get(c['type'], 0)
        if c['type'] in ('riser', 'riser_short'):
            t = c['t'] + c.get('d', 0.32) - len(f) / SR if c['type'] == 'riser' else c['t']
        add(fx, f, t, SFX_GAIN.get(c['type'], 0.5))
    fx = fx[:n]
    # shared space
    room = ir()
    wet = np.stack([fftconvolve(fx[:, i] + mus[:, i] * 0.4, room[:, i])[:n] for i in range(2)], 1)

    # VO: presence + gentle compression
    v = hp(vo, 80)
    v = v + bp(v, 2500, 5000) * 0.25
    v = np.tanh(v * 1.4) / np.tanh(1.4)
    duck = follow(v)
    duck = 1 - 0.62 * np.clip(duck / 0.25, 0, 1)
    mix = stereo(v) * 1.0 + mus * duck[:, None] * 0.55 + fx * (0.6 + 0.4 * duck[:, None]) + wet * 0.35
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.95
    sf.write(os.path.join(work, 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
    print('mix ->', os.path.join(work, 'mix.wav'), f'{dur:.2f}s')


if __name__ == '__main__':
    main(sys.argv[1])
