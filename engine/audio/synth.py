"""Procedural sound design + music bed (no samples, no licensing issues). 48 kHz float32."""
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def sweep_lp(x, f0, f1, curve=1.0):
    """One-pole low-pass whose cutoff glides f0 -> f1 (block-wise, smooth enough for SFX)."""
    out = np.zeros_like(x)
    n, blk, y = len(x), 256, 0.0
    for i in range(0, n, blk):
        k = (i / max(n - 1, 1)) ** curve
        a = np.exp(-2 * np.pi * (f0 + (f1 - f0) * k) / SR)
        seg = x[i:i + blk]
        z, _ = signal.lfilter([1 - a], [1, -a], seg, zi=[y * a])
        out[i:i + blk] = z
        y = z[-1] if len(z) else y
    return out


def env_ad(n, a, d):
    a, d = int(a * SR), max(int(d * SR), 1)
    e = np.zeros(n)
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else 0
    rest = n - a
    e[a:] = np.exp(-np.arange(rest) / (d / 5))
    return e


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ---------------------------------------------------------------- SFX
def whoosh(dur=0.7):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    up = sweep_lp(x, 300, 5000, 0.6)[: n // 2]
    dn = sweep_lp(x[n // 2:], 5000, 400, 1.5)
    y = np.concatenate([up, dn]) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return norm(filt(y, 'highpass', 120))


def impact(dur=1.6):
    t = t_(dur)
    f = 35 + 85 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    crack = filt(rng.standard_normal(len(t)), 'lowpass', 2500) * np.exp(-t * 22)
    return norm(np.tanh(2.2 * (sub + 0.5 * crack)))


def riser(dur=1.5):
    t = t_(dur)
    k = t / dur
    noise = sweep_lp(rng.standard_normal(len(t)), 400, 9000, 2.0) * 0.6
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (k * 2.5)) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * (4 + 20 * k) * t))
    return norm((noise + 0.35 * tone) * k ** 2.2)


def blip(f=1800, dur=0.09):
    t = t_(dur)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 55) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 80), 0.6)


def pop(dur=0.12):
    t = t_(dur)
    f = 320 + 900 * np.exp(-t * 40)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30), 0.7)


def zap(dur=0.5):
    t = t_(dur)
    gate = (signal.square(2 * np.pi * 60 * t) > 0) * (rng.random(len(t)) > 0.4)
    x = filt(rng.standard_normal(len(t)) * gate, 'bandpass', [1500, 7000]) * np.exp(-t * 7)
    hum = signal.sawtooth(2 * np.pi * 120 * t) * 0.3 * np.exp(-t * 6)
    return norm(x + hum)


def ding(f=1320, dur=1.8):
    t = t_(dur)
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 2.5), (2.76, .5, 4), (5.4, .25, 7), (8.93, .12, 10)])
    return norm(y * (1 - np.exp(-t * 400)), 0.7)


def glitch(dur=0.35):
    n = int(dur * SR)
    y = np.zeros(n)
    for i in range(7):
        a = int(rng.random() * n * 0.8)
        L = int(SR * (0.015 + rng.random() * 0.04))
        seg = np.round(rng.standard_normal(L) * 3) / 3 if i % 2 else signal.square(2 * np.pi * (200 + rng.random() * 1200) * np.arange(L) / SR)
        y[a:a + L] += seg[: n - a] * 0.6
    return norm(filt(y, 'highpass', 300), 0.6)


def swell(dur=1.2):
    t = t_(dur)
    x = filt(rng.standard_normal(len(t)), 'highpass', 3000)
    return norm(x * (t / dur) ** 3, 0.7)


def tick(dur=0.03):
    t = t_(dur)
    return norm(filt(rng.standard_normal(len(t)), 'highpass', 4000) * np.exp(-t * 300), 0.5)


def hum(dur=2.0, f=55):
    t = t_(dur)
    y = sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 2, 3, 4))
    y *= 0.8 + 0.2 * np.sin(2 * np.pi * 9 * t)
    return norm(y * np.minimum(1, t * 8) * np.minimum(1, (dur - t) * 8), 0.6)


def rumble(dur=3.0):
    t = t_(dur)
    x = filt(np.cumsum(rng.standard_normal(len(t))) * 0.02, 'lowpass', 180)
    crackle = filt(rng.standard_normal(len(t)) * (rng.random(len(t)) > 0.995) * 8, 'bandpass', [800, 5000])
    return norm((x + 0.2 * crackle) * np.minimum(1, t * 6) * np.minimum(1, (dur - t) * 2), 0.9)


SFX = dict(whoosh=whoosh, impact=impact, riser=riser, blip=blip, pop=pop, zap=zap, ding=ding,
           glitch=glitch, swell=swell, tick=tick, hum=hum, rumble=rumble)


# ---------------------------------------------------------------- music
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)


def music(duration, bpm=118, breaks=(), drop_at=None):
    """Dark synthwave/tech pulse in D minor: i-VI-III-VII. `breaks` = [(t0,t1)] where drums
    and bass drop out (for questions / reveals). `drop_at` = time drums first kick in (default 0)."""
    n = int(duration * SR) + SR
    L, R = np.zeros(n), np.zeros(n)
    beat = 60 / bpm
    prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (53, [57, 60, 65]), (48, [55, 60, 64])]  # roots + triads
    in_break = lambda tt: any(a <= tt < b for a, b in breaks)
    drums_on = lambda tt: tt >= (drop_at or 0) and not in_break(tt)

    def add(buf, x, at, gain=1.0):
        i = int(at * SR)
        if i >= n:
            return
        x = x[: n - i]
        buf[i:i + len(x)] += x * gain

    kick = impact(0.35) * np.exp(-t_(0.35) * 6)
    kick = filt(kick, 'lowpass', 300)
    hat = filt(rng.standard_normal(int(0.05 * SR)), 'highpass', 8000) * np.exp(-t_(0.05) * 90)
    clap = filt(rng.standard_normal(int(0.2 * SR)), 'bandpass', [900, 3500]) * np.exp(-t_(0.2) * 25)

    steps = int(duration / (beat / 4)) + 1
    for s in range(steps):
        tt = s * beat / 4
        bar = int(tt / (beat * 4)) % 4
        root, triad = prog[bar]
        if drums_on(tt):
            if s % 4 == 0:
                add(L, kick, tt, 0.9); add(R, kick, tt, 0.9)
            if s % 8 == 4:
                add(L, clap, tt, 0.35); add(R, clap, tt, 0.35)
            if s % 2 == 1:
                add(L, hat, tt, 0.12); add(R, hat, tt, 0.18)
            if s % 2 == 0:  # 8th-note sub bass, off the kick
                d = beat / 2 * 0.9
                tb = t_(d)
                f = NOTE(root - 12)
                b = (np.sin(2 * np.pi * f * tb) + 0.25 * signal.sawtooth(2 * np.pi * f * tb)) * env_ad(len(tb), 0.005, d * 1.2)
                b *= 1 - 0.7 * np.exp(-tb * 30) * (s % 4 == 0)  # pseudo side-chain on the kick
                add(L, b, tt, 0.32); add(R, b, tt, 0.32)
        # 16th arp pluck — always on (keeps energy through breaks, filtered softer there)
        notes = triad + [triad[0] + 12]
        m = notes[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]]
        d = beat / 4
        tp = t_(d * 1.6)
        f = NOTE(m)
        pl = signal.sawtooth(2 * np.pi * f * tp) * np.exp(-tp * 18)
        pl = filt(pl, 'lowpass', 1800 if in_break(tt) else 3200)
        pan = 0.5 + 0.35 * np.sin(s * 0.7)
        add(L, pl, tt, 0.08 * (1 - pan) * 2); add(R, pl, tt, 0.08 * pan * 2)
        if s % 16 == 0:  # pad per bar
            d = beat * 4
            tp = t_(d * 1.1)
            pad = sum(signal.sawtooth(2 * np.pi * NOTE(x) * (1 + det) * tp) for x in triad for det in (-0.004, 0.004))
            pad = filt(pad, 'lowpass', 1100) * np.minimum(1, tp / 0.4) * np.minimum(1, (d * 1.1 - tp) / 0.4)
            add(L, pad, tt, 0.035); add(R, pad, tt, 0.035)
    y = np.stack([L, R], 1)[: int(duration * SR)]
    return y / (np.max(np.abs(y)) or 1) * 0.8
