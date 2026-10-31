"""
audio.py — voice-over (Kokoro, offline), procedural cinematic score and SFX.

Everything is rendered with numpy at 48 kHz stereo. The score is original
(no copyright issues) and is driven by the episode timeline: a pulse that
tracks the year counter, a riser into the climax, an impact at the reveal
and a brighter (major) resolution for the CTA.
"""
from __future__ import annotations

import hashlib
import math
import os
from pathlib import Path

import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def db(x: float) -> float:
    return 10 ** (x / 20.0)


def env_adsr(n: int, a: float, d: float, s: float, r: float, sr: int = SR) -> np.ndarray:
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    s_n = max(0, n - a_n - d_n - r_n)
    e = np.concatenate([
        np.linspace(0, 1, max(a_n, 1)),
        np.linspace(1, s, max(d_n, 1)),
        np.full(s_n, s),
        np.linspace(s, 0, max(r_n, 1)),
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, min(cutoff, SR / 2 - 1) / (SR / 2), btype="low")
    return signal.lfilter(b, a, x, axis=0)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, max(cutoff, 10) / (SR / 2), btype="high")
    return signal.lfilter(b, a, x, axis=0)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    b, a = signal.butter(order, [max(lo, 10) / (SR / 2), min(hi, SR / 2 - 1) / (SR / 2)], btype="band")
    return signal.lfilter(b, a, x, axis=0)


def reverb(x: np.ndarray, decay: float = 1.4, mix: float = 0.25, seed: int = 3) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(decay * SR)
    ir = rng.normal(0, 1, n) * np.exp(-np.linspace(0, 7, n))
    ir = lowpass(ir, 5000)
    ir /= np.abs(ir).sum() / 8.0
    if x.ndim == 1:
        wet = signal.fftconvolve(x, ir)[: len(x)]
    else:
        wet = np.stack([signal.fftconvolve(x[:, c], ir * (1 + 0.05 * c))[: len(x)] for c in range(x.shape[1])], axis=1)
    return x * (1 - mix) + wet * mix


def stereo(mono: np.ndarray, width: float = 0.0, seed: int = 1) -> np.ndarray:
    if mono.ndim == 2:
        return mono
    if width <= 0:
        return np.stack([mono, mono], axis=1)
    # tiny decorrelation via short delay on one side
    d = int(0.0004 * SR * width * 10)
    r = np.pad(mono, (d, 0))[: len(mono)]
    return np.stack([mono, r * 0.97 + mono * 0.03], axis=1)


def place(buf: np.ndarray, clip: np.ndarray, at: float, gain: float = 1.0):
    """Add clip into buf at time `at` (seconds)."""
    i = int(at * SR)
    if i >= len(buf):
        return
    clip = stereo(clip) if clip.ndim == 1 else clip
    n = min(len(clip), len(buf) - i)
    if n <= 0:
        return
    buf[i:i + n] += clip[:n] * gain


def note(freq: float, dur: float, harmonics=(1.0, 0.5, 0.25, 0.12), detune: float = 0.0015,
         a=0.01, d=0.1, s=0.8, r=0.2) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, amp in enumerate(harmonics, start=1):
        f = freq * k
        out += amp * (np.sin(2 * np.pi * f * (1 + detune) * t) + np.sin(2 * np.pi * f * (1 - detune) * t + 0.3)) * 0.5
    return out * env_adsr(n, a, d, s, r)


# --------------------------------------------------------------------------
# voice-over (Kokoro ONNX)
# --------------------------------------------------------------------------

_KOKORO = None


def _kokoro():
    global _KOKORO
    if _KOKORO is None:
        from kokoro_onnx import Kokoro
        model = CACHE / "kokoro" / "kokoro-v1.0.onnx"
        voices = CACHE / "kokoro" / "voices-v1.0.bin"
        if not model.exists():
            raise FileNotFoundError("Kokoro model missing. Run: python scripts/fetch_models.py")
        _KOKORO = Kokoro(str(model), str(voices))
    return _KOKORO


def tts(text: str, voice: str = "am_michael", speed: float = 1.0) -> np.ndarray:
    """Return mono float32 at 48 kHz (cached on disk)."""
    key = hashlib.sha1(f"{voice}|{speed}|{text}".encode()).hexdigest()[:16]
    d = CACHE / "tts"
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{key}.wav"
    if f.exists():
        x, sr = sf.read(f, dtype="float32")
        return x
    samples, sr = _kokoro().create(text, voice=voice, speed=speed, lang="en-us")
    x = signal.resample_poly(samples.astype(np.float64), SR, sr).astype(np.float32)
    # trim silence, normalise peaks, light polish
    thr = 0.01
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx):
        x = x[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.08 * SR)]
    x = highpass(x, 70).astype(np.float32)
    x /= max(np.abs(x).max(), 1e-6)
    x *= 0.9
    sf.write(f, x, SR)
    return x


# --------------------------------------------------------------------------
# SFX
# --------------------------------------------------------------------------

def sfx_tick(pitch: float = 1800.0, dur: float = 0.045) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * pitch * t) * np.exp(-t * 90)) * 0.9


def sfx_whoosh(dur: float = 0.42, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    # rising sweep via chunked band-pass
    out = np.zeros(n)
    chunks = 16
    cs = n // chunks
    for i in range(chunks):
        lo = 150 * (1 + 8 * (i / chunks) ** 1.5)
        seg = bandpass(x[i * cs:(i + 1) * cs], lo, lo * 3.5)
        out[i * cs:(i + 1) * cs] = seg
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return out * e * 0.5


def sfx_impact(dur: float = 1.6, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (46 + 30 * np.exp(-t * 18)) * t) * np.exp(-t * 2.6)
    crack = lowpass(rng.normal(0, 1, n), 1800) * np.exp(-t * 24) * 0.9
    tail = lowpass(rng.normal(0, 1, n), 600) * np.exp(-t * 3.2) * 0.25
    return (boom * 1.0 + crack + tail) * 0.8


def sfx_shimmer(dur: float = 1.8, base: float = 880.0) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros(n)
    for i, ratio in enumerate([1, 1.5, 2, 3, 4]):
        s = int(i * 0.07 * SR)
        nn = note(base * ratio, dur - i * 0.07, harmonics=(1.0, 0.2), a=0.01, d=0.3, s=0.3, r=0.8)
        out[s:s + len(nn)] += nn * (0.5 / (i + 1))
    return out * 0.5


def sfx_rewind(dur: float = 0.7, seed: int = 5) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 900 * (1 + 3 * (t / dur) ** 2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.25 + rng.normal(0, 0.1, n)
    return bandpass(x, 300, 6000) * np.linspace(1, 0.3, n) * 0.5


def sfx_heartbeat() -> np.ndarray:
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    lub = np.sin(2 * np.pi * (60 + 25 * np.exp(-t * 30)) * t) * np.exp(-t * 14)
    dub_t = t - 0.19
    dub = np.where(dub_t > 0, np.sin(2 * np.pi * (52 + 20 * np.exp(-np.clip(dub_t, 0, 1) * 30)) * dub_t) * np.exp(-np.clip(dub_t, 0, 1) * 16), 0)
    return (lub + dub * 0.8) * 0.9


# --------------------------------------------------------------------------
# score
# --------------------------------------------------------------------------

NOTE = {"A": 110.0, "B": 123.47, "C": 130.81, "D": 146.83, "E": 164.81, "F": 174.61, "G": 196.0,
        "C#": 138.59, "F#": 185.0, "G#": 207.65}

MINOR_PROG = [["A", "C", "E"], ["F", "A", "C"], ["C", "E", "G"], ["G", "B", "D"]]
MAJOR_PROG = [["A", "C#", "E"], ["F#", "A", "C#"], ["D", "F#", "A"], ["E", "G#", "B"]]


def score(duration: float, bpm: float = 96.0, climax: float | None = None, cta: float | None = None,
          year_ticks: list[float] | None = None, intensity_curve=None, seed: int = 7) -> np.ndarray:
    """Original cinematic bed. Returns stereo float32 (n,2)."""
    n = int(duration * SR)
    buf = np.zeros((n, 2), dtype=np.float64)
    beat = 60.0 / bpm
    bar = beat * 4
    climax = duration * 0.72 if climax is None else climax
    cta = duration * 0.86 if cta is None else cta
    rng = np.random.default_rng(seed)

    # drone -----------------------------------------------------------
    t = np.arange(n) / SR
    drone = (np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 110.4 * t) * 0.25 + np.sin(2 * np.pi * 109.6 * t) * 0.25)
    drone *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.08 * t)
    drone *= np.minimum(1.0, t / 2.0) * np.minimum(1.0, (duration - t) / 1.5)
    buf += stereo(drone * db(-20))

    # pads: chord per bar --------------------------------------------
    pad = np.zeros(n)
    nbars = int(math.ceil(duration / bar)) + 1
    for b in range(nbars):
        start = b * bar
        prog = MAJOR_PROG if start >= cta - 0.01 else MINOR_PROG
        chord = prog[b % 4]
        dur = bar + 0.6
        for i, nm in enumerate(chord):
            f = NOTE[nm] * (2 if i > 0 else 1)
            nn = note(f, dur, harmonics=(1.0, 0.45, 0.2, 0.08, 0.04), a=0.9, d=0.4, s=0.75, r=0.7)
            s0 = int(start * SR)
            e0 = min(n, s0 + len(nn))
            if s0 < n:
                pad[s0:e0] += nn[: e0 - s0] * 0.33
    pad = lowpass(pad, 1400)
    pad = reverb(pad, 1.6, 0.35, seed=11)
    # pad swells toward the climax, opens up after the CTA
    swell = 0.55 + 0.45 * np.clip((t - climax * 0.3) / max(climax * 0.7, 1), 0, 1)
    swell = np.where(t > cta, 1.1, swell)
    buf += stereo(pad * swell * db(-15), width=1.0)

    # pulse: 8th-note plucks following the chord root ----------------
    pulse = np.zeros(n)
    k = 0
    tt = 0.0
    while tt < duration:
        b = int(tt // bar)
        prog = MAJOR_PROG if tt >= cta else MINOR_PROG
        root = NOTE[prog[b % 4][0]] * 4
        accent = 1.0 if k % 2 == 0 else 0.55
        if k % 8 == 6:
            root *= 1.5
        nn = note(root, 0.18, harmonics=(1.0, 0.3), a=0.004, d=0.08, s=0.2, r=0.08) * accent
        s0 = int(tt * SR)
        pulse[s0: s0 + len(nn)] += nn[: max(0, n - s0)]
        tt += beat / 2
        k += 1
    rise = 0.25 + 0.75 * np.clip(t / max(climax, 1), 0, 1)
    rise = np.where(t > climax + 1.0, 0.45, rise)
    buf += stereo(reverb(pulse, 0.6, 0.2, seed=4) * rise * db(-22), width=0.6)

    # heartbeat kick on every beat ------------------------------------
    hb = sfx_heartbeat()
    tt = 0.0
    while tt < duration:
        gain = db(-14) * (0.7 + 0.3 * np.clip(tt / max(climax, 1), 0, 1))
        if climax - 0.3 < tt < climax + 0.6:
            gain = 0
        place(buf, hb, tt, gain)
        tt += beat

    # year ticks ------------------------------------------------------
    if year_ticks:
        for i, at in enumerate(year_ticks):
            place(buf, sfx_tick(1500 + 14 * i), at, db(-27))

    # riser into climax + impact --------------------------------------
    riser_len = min(3.2, climax)
    rn = int(riser_len * SR)
    rt = np.arange(rn) / SR
    noise = rng.normal(0, 1, rn)
    riser = np.zeros(rn)
    chunks = 24
    cs = rn // chunks
    for i in range(chunks):
        c = 250 + 5500 * (i / chunks) ** 2
        riser[i * cs:(i + 1) * cs] = lowpass(noise[i * cs:(i + 1) * cs], c)
    riser *= (rt / riser_len) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(180 * (1 + 3 * (rt / riser_len) ** 2)) / SR) * (rt / riser_len) ** 3 * 0.4
    place(buf, riser * 0.5 + tone, climax - riser_len, db(-10))
    place(buf, sfx_impact(seed=2), climax, db(-5))
    place(buf, sfx_shimmer(2.0, 660), cta, db(-16))

    # intensity curve (optional): overall music gain over time
    if intensity_curve is not None:
        g = np.interp(t, [p[0] for p in intensity_curve], [p[1] for p in intensity_curve])
        buf *= g[:, None]

    # glue ------------------------------------------------------------
    buf = highpass(buf, 28)
    buf = np.tanh(buf * 1.3) / 1.3
    return buf.astype(np.float32)


# --------------------------------------------------------------------------
# mix
# --------------------------------------------------------------------------

def duck_envelope(vo: np.ndarray, n: int, attack: float = 0.06, release: float = 0.35, floor: float = 0.32) -> np.ndarray:
    env = np.abs(vo[:, 0] if vo.ndim == 2 else vo)
    env = np.pad(env, (0, max(0, n - len(env))))[:n]
    # smooth with asymmetric one-pole
    out = np.zeros(n)
    a_up = 1 - math.exp(-1 / (attack * SR))
    a_dn = 1 - math.exp(-1 / (release * SR))
    v = 0.0
    # vectorised approximation: max-filter then lowpass
    win = int(0.05 * SR)
    kernel = np.ones(win) / win
    sm = np.convolve(env, kernel, mode="same")
    sm = np.maximum.accumulate(sm) if False else sm
    # simple release smoothing
    b, a = signal.butter(1, 1.0 / (release * SR / 2) if release * SR > 4 else 0.5, btype="low")
    sm = signal.filtfilt(b, a, sm)
    speaking = np.clip(sm / 0.05, 0, 1)
    return 1.0 - (1.0 - floor) * speaking


def mix(duration: float, vo_clips: list[tuple[float, np.ndarray]], music: np.ndarray,
        sfx_clips: list[tuple[float, np.ndarray, float]], out_path: str):
    n = int(duration * SR)
    vo = np.zeros((n, 2), dtype=np.float32)
    for at, clip in vo_clips:
        place(vo, clip, at, 1.0)
    duck = duck_envelope(vo, n)
    music = music[:n] if len(music) >= n else np.pad(music, ((0, n - len(music)), (0, 0)))
    out = music * duck[:, None] + vo * db(-1.0)
    for at, clip, gain in sfx_clips:
        place(out, clip, at, gain)
    out = np.tanh(out * 1.1) / 1.1
    out /= max(np.abs(out).max(), 1e-6)
    out *= 0.95
    sf.write(out_path, out.astype(np.float32), SR)
    return out_path
