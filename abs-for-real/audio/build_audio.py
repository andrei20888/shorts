#!/usr/bin/env python3
"""
Abs For Real: voice + music + SFX builder.

Produces, for each variant (long / short):
  public/audio/<variant>.wav   48 kHz stereo mix (voice, procedural beat, SFX), -14 LUFS, -1 dBFS peaks
  src/timing/<variant>.json    frame-accurate cue sheet the Remotion compositions read

Voice: Kokoro-82M via kokoro-onnx (local, offline). Every on-screen beat is synthesised as its own
fragment, so each visual cue is placed exactly where the matching words start. Fragments are cached
in audio/lines/ (file name = hash of text+voice+speed). Drop your own recordings there with the same
names to replace the AI voice; timings are re-derived automatically.

Music: fully procedural (numpy), 130 BPM F-minor beat composed to the picture: intro riser, drop on
"LYING", groove, brighter arpeggio on "CAN do", breakdown + logo plucks, price drop, CTA hit.

Usage:
  python audio/build_audio.py --models /home/user/models [--voice af_bella] [--speed 1.08] [--variant all]
"""
from __future__ import annotations

import argparse
import functools
import hashlib
import json
import math
import os
from dataclasses import dataclass, field

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINES_DIR = os.path.join(ROOT, 'audio', 'lines')
OUT_AUDIO = os.path.join(ROOT, 'public', 'audio')
OUT_TIMING = os.path.join(ROOT, 'src', 'timing')

SR = 48000
FPS = 30
BPM = 130.0
BEAT = 60.0 / BPM  # 0.4615 s
STEP = BEAT / 4  # 16th note

# ----------------------------------------------------------------------------------------------
# Script: every visual beat is one voice fragment. (id, spoken text, pause before it in seconds)
# ----------------------------------------------------------------------------------------------
SCENES: dict[str, dict] = {
    'hook': dict(
        chunks=[('h1', 'Every “abs in thirty days” app...', 0.0), ('h2', 'is lying.', 0.22), ('h3', 'To you.', 0.14)],
        cues={'h2': ('chunk', 'h2', 0.0), 'h3': ('chunk', 'h3', 0.0), 'reset': ('after_voice', 0.08)},
        tail=0.62,
    ),
    's2a': dict(
        chunks=[('c1', 'Crunches...', 0.0), ('c2', "don't burn belly fat.", 0.12)],
        cues={'line2': ('chunk', 'c2', 0.0), 'strike': ('chunk', 'c2', 0.22)},
        tail=0.45,
    ),
    's2b': dict(
        chunks=[('c1', "You can't...", 0.0), ('c2', 'spot reduce.', 0.12)],
        cues={'line2': ('chunk', 'c2', 0.0), 'kick': ('after_voice', 0.12)},
        tail=0.5,
    ),
    's3': dict(
        chunks=[
            ('t', 'What thirty days CAN do:', 0.0),
            ('i0', 'a stronger core.', 0.16),
            ('i1', 'a smaller waist.', 0.14),
            ('i2', 'habits that stick.', 0.14),
        ],
        cues={
            'can': ('chunk', 't', 0.42),
            'item0': ('chunk', 'i0', 0.0),
            'item1': ('chunk', 'i1', 0.0),
            'item2': ('chunk', 'i2', 0.0),
            'pulse': ('after_voice', 0.12),
        },
        tail=0.6,
    ),
    's4': dict(
        chunks=[('w1', "So I'm building", 0.0), ('w2', 'the honest one.', 0.16)],
        # word reveals: proportional positions inside each fragment (by syllables)
        cues={
            'w0': ('chunk', 'w1', 0.0), 'w1': ('chunk', 'w1', 0.24), 'w2': ('chunk', 'w1', 0.48),
            'w3': ('chunk', 'w2', 0.0), 'w4': ('chunk', 'w2', 0.2), 'w5': ('chunk', 'w2', 0.68),
            'logo': ('after_voice', 0.22),
        },
        logo_gap=0.15,  # seconds between squares (short variant overrides)
        tail=0.55,
    ),
    's5a': dict(
        chunks=[('c1', 'Founder spots:', 0.0), ('c2', 'twenty-nine euros.', 0.14), ('c3', 'lifetime access.', 0.14)],
        cues={'price': ('chunk', 'c2', 0.0), 'access': ('chunk', 'c3', 0.0), 'underline': ('chunk', 'c3', 0.5)},
        tail=0.5,
    ),
    's5b': dict(
        chunks=[('c1', 'Program starts', 0.0), ('c2', 'November seventh.', 0.12)],
        cues={'date': ('chunk', 'c2', 0.0), 'pulse': ('after_voice', 0.1)},
        tail=0.55,
    ),
    's6': dict(
        chunks=[('c1', 'Link in bio.', 0.0)],
        cues={'url': ('after_voice', 0.05), 'pulse0': ('after_voice', 0.55), 'pulse1': ('after_voice', 1.15)},
        tail=1.55,
    ),
}

VARIANTS = {
    'long': ['hook', 's2a', 's2b', 's3', 's4', 's5a', 's5b', 's6'],
    'short': ['hook', 's4', 's5a', 's5b', 's6'],
}
VOICE_LEAD = 0.10  # voice starts this long after the scene's first visual slam


# ----------------------------------------------------------------------------------------------
# Voice
# ----------------------------------------------------------------------------------------------
def trim_silence(a: np.ndarray, sr: int, thr: float = 0.012) -> np.ndarray:
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.012 * sr))
    e = min(len(a), idx[-1] + int(0.03 * sr))
    out = a[s:e].astype(np.float64).copy()
    f = int(0.004 * sr)
    out[:f] *= np.linspace(0, 1, f)
    out[-f:] *= np.linspace(1, 0, f)
    return out


class Voice:
    def __init__(self, models: str, voice: str, speed: float):
        self.voice, self.speed = voice, speed
        self.models = models
        self._k = None
        os.makedirs(LINES_DIR, exist_ok=True)

    def _kokoro(self):
        if self._k is None:
            from kokoro_onnx import Kokoro  # imported lazily: cached lines need no model

            self._k = Kokoro(os.path.join(self.models, 'kokoro-v1.0.onnx'), os.path.join(self.models, 'voices-v1.0.bin'))
        return self._k

    def line(self, text: str) -> np.ndarray:
        """Returns a trimmed mono 48 kHz fragment for `text` (cached on disk)."""
        key = hashlib.sha1(f'{text}|{self.voice}|{self.speed}'.encode()).hexdigest()[:12]
        safe = ''.join(ch if ch.isalnum() else '_' for ch in text.lower())[:28].strip('_')
        path = os.path.join(LINES_DIR, f'{safe}_{key}.wav')
        if not os.path.exists(path):
            a, sr = self._kokoro().create(text, voice=self.voice, speed=self.speed, lang='en-us')
            a = trim_silence(np.asarray(a, dtype=np.float64), sr)
            a = signal.resample_poly(a, SR, sr)
            a = a / (np.abs(a).max() + 1e-9) * 0.7
            sf.write(path, a, SR)
            print(f'  tts  {len(a)/SR:5.2f}s  {text}')
        a, sr = sf.read(path, dtype='float64')
        if a.ndim > 1:
            a = a.mean(axis=1)
        if sr != SR:
            a = signal.resample_poly(a, SR, sr)
        return trim_silence(a, SR)


# ----------------------------------------------------------------------------------------------
# Timeline
# ----------------------------------------------------------------------------------------------
@dataclass
class SceneTiming:
    id: str
    start: float  # seconds, global
    end: float
    voice: list[tuple[float, np.ndarray]] = field(default_factory=list)  # (global start, audio)
    cues: dict[str, float] = field(default_factory=dict)  # seconds, relative to scene start
    extra: dict = field(default_factory=dict)


def build_timeline(variant: str, voice: Voice, short: bool) -> tuple[list[SceneTiming], float]:
    scenes: list[SceneTiming] = []
    t = 0.0
    anchor = None  # time of the "LYING" cut: music grid origin
    for sid in VARIANTS[variant]:
        spec = SCENES[sid]
        st = SceneTiming(id=sid, start=t, end=t)
        cur = t + VOICE_LEAD
        chunk_pos: dict[str, tuple[float, float]] = {}
        for cid, text, gap in spec['chunks']:
            audio = voice.line(text)
            cur += gap
            dur = len(audio) / SR
            chunk_pos[cid] = (cur, dur)
            st.voice.append((cur, audio))
            cur += dur
        voice_end = cur
        cues: dict[str, float] = {}
        for name, (kind, *args) in spec['cues'].items():
            if kind == 'chunk':
                cid, frac = args
                s, d = chunk_pos[cid]
                cues[name] = s + frac * d
            elif kind == 'after_voice':
                cues[name] = voice_end + args[0]
        end_min = voice_end + spec['tail'] * (0.75 if short else 1.0)
        if sid == 's4':
            gap = 0.11 if short else spec['logo_gap']
            lg = cues['logo']
            for i in range(5):
                cues[f'sq{i}'] = lg + i * gap
            cues['lime'] = lg + 5 * gap + 0.12
            cues['check'] = cues['lime'] + 0.3
            cues['pulse'] = cues['check'] + 0.42
            end_min = max(end_min, cues['pulse'] + (0.4 if short else 0.55))
        if sid == 'hook':
            anchor = cues['h2']
        # quantize the next cut to the beat grid (anchored at the LYING drop)
        assert anchor is not None
        n = math.ceil((end_min - anchor) / BEAT - 1e-6)
        end = anchor + n * BEAT
        st.end = end
        st.cues = {k: v - st.start for k, v in cues.items()}
        scenes.append(st)
        t = end
    return scenes, anchor


# ----------------------------------------------------------------------------------------------
# Synth building blocks (all return float64 arrays at SR)
# ----------------------------------------------------------------------------------------------
def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def tline(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lowpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, btype='low', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def highpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, btype='high', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def noise(d: float, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(int(d * SR))


def kick(vel: float = 1.0) -> np.ndarray:
    t = tline(0.42)
    f = 46 + 130 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = noise(0.42, 1)[: len(t)] * np.exp(-t * 500) * 0.6
    x = np.tanh(1.8 * (body + click)) / np.tanh(1.8)
    return x * vel


def clap(vel: float = 1.0) -> np.ndarray:
    t = tline(0.36)
    n = noise(0.36, 2)
    env = np.zeros_like(t)
    for k, off in enumerate([0.0, 0.011, 0.022, 0.033]):
        m = t >= off
        env[m] += np.exp(-(t[m] - off) * (260 if k < 3 else 22)) * (0.8 if k < 3 else 1.0)
    x = bandpass(n * env, 700, 7000)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 45) * 0.35
    return (x * 0.9 + body) * vel


def hat(open_: bool, vel: float = 1.0) -> np.ndarray:
    d = 0.32 if open_ else 0.07
    t = tline(d)
    x = highpass(noise(d, 3 if open_ else 4), 7500, 4)
    x *= np.exp(-t * (11 if open_ else 75))
    return x * vel * 0.55


def bass(note: float, d: float, vel: float = 1.0) -> np.ndarray:
    t = tline(d + 0.08)
    f0 = midi(note)
    f = f0 * (1 + 0.5 * np.exp(-t * 60))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    env = np.minimum(1, t / 0.006) * np.where(t < d, 1.0, np.exp(-(t - d) * 60))
    x = np.tanh(1.6 * x * env) / np.tanh(1.6)
    return x * vel


@functools.lru_cache(maxsize=None)
def _pluck(note: float, d: float, bright: float) -> np.ndarray:
    f = midi(note)
    n = int(SR / f)
    buf = np.random.default_rng(int(note * 7)).uniform(-1, 1, n)
    out = np.empty(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % n]
        buf[i % n] = bright * 0.5 * (buf[i % n] + buf[(i + 1) % n])
    t = tline(d)
    out *= np.exp(-t * 2.2)
    return lowpass(out, 5500)


def pluck(note: float, d: float, vel: float = 1.0, bright: float = 0.996) -> np.ndarray:
    """Karplus-Strong string (cached per note/length)."""
    return _pluck(note, d, bright) * vel


def pad(notes: list[float], d: float, att: float = 0.5, rel: float = 0.8) -> np.ndarray:
    t = tline(d)
    x = np.zeros_like(t)
    for n in notes:
        for det in (-0.004, 0.0, 0.004):
            f = midi(n) * (1 + det)
            ph = (t * f) % 1.0
            x += (2 * ph - 1) * 0.08
    x = lowpass(x, 1100, 2)
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (d - t) / rel))
    return x * env


def stab(notes: list[float], d: float = 0.6, vel: float = 1.0) -> np.ndarray:
    t = tline(d)
    x = np.zeros_like(t)
    for n in notes:
        for det in (-0.006, 0.006):
            f = midi(n) * (1 + det)
            x += (2 * ((t * f) % 1.0) - 1) * 0.12
    x = lowpass(x, 2600)
    return x * np.exp(-t * 6) * vel


def impact(vel: float = 1.0, seed: int = 5) -> np.ndarray:
    t = tline(1.1)
    f = 30 + 70 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    boom = np.sin(ph) * np.exp(-t * 3.6)
    burst = bandpass(noise(1.1, seed), 120, 3500) * np.exp(-t * 26) * 0.9
    tail = lowpass(noise(1.1, seed + 1), 1800) * np.exp(-t * 3.2) * 0.22
    return np.tanh(1.4 * (boom + burst + tail)) * vel


def subdrop(d: float = 0.9, vel: float = 1.0) -> np.ndarray:
    t = tline(d)
    f = 140 * np.exp(-t * 2.4) + 24
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 2.6) * vel


def riser(d: float, vel: float = 1.0, seed: int = 9) -> np.ndarray:
    """Noise sweep up + rising tone; ends exactly at the hit."""
    n = int(d * SR)
    out = np.zeros(n)
    src = noise(d, seed)
    chunk = int(0.02 * SR)
    for i in range(0, n, chunk):
        p = i / n
        fc = 300 + 7000 * p**2
        seg = src[i : i + chunk]
        out[i : i + chunk] = highpass(seg, fc, 2)
    t = tline(d)
    tone = np.sin(2 * np.pi * np.cumsum(110 + 900 * (t / d) ** 2) / SR) * 0.25
    env = (t / d) ** 1.8
    return (out * 0.5 + tone) * env * vel


def whoosh(d: float = 0.26, vel: float = 1.0, seed: int = 11) -> np.ndarray:
    t = tline(d)
    x = bandpass(noise(d, seed), 400, 5000)
    env = np.sin(np.pi * (t / d) ** 0.6) ** 2
    return x * env * vel


def thud(vel: float = 1.0) -> np.ndarray:
    t = tline(0.16)
    f = 40 + 90 * np.exp(-t * 60)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 22) + noise(0.16, 12)[: len(t)] * np.exp(-t * 300) * 0.3) * vel


def pop(vel: float = 1.0) -> np.ndarray:
    t = tline(0.07)
    f = 700 * np.exp(-t * 40) + 250
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 55) * vel


def scratch(d: float = 0.14, vel: float = 1.0) -> np.ndarray:
    t = tline(d)
    x = bandpass(noise(d, 13), 1500, 6000)
    return x * np.minimum(1, t / 0.01) * np.exp(-t * 14) * vel


def tick(vel: float = 1.0) -> np.ndarray:
    t = tline(0.012)
    return highpass(noise(0.012, 14), 3000) * np.exp(-t * 500) * vel


def glitch(vel: float = 1.0) -> np.ndarray:
    d = 0.12
    t = tline(d)
    x = noise(d, 15)
    gate = ((t * 90) % 1.0) < 0.35
    x = np.round(x * 3) / 3  # crushed
    return bandpass(x * gate, 900, 6000) * np.exp(-t * 9) * vel


def reverb(x: np.ndarray, seconds: float = 1.1, mix: float = 0.25, seed: int = 21) -> np.ndarray:
    t = tline(seconds)
    ir = noise(seconds, seed) * np.exp(-t / (seconds / 3.2))
    ir = lowpass(ir, 3800)
    ir /= np.sqrt(np.sum(ir**2)) * 3.2
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return x + wet * mix


# ----------------------------------------------------------------------------------------------
# Mixing helpers
# ----------------------------------------------------------------------------------------------
class Track:
    def __init__(self, length_s: float):
        self.n = int(length_s * SR)
        self.buf = np.zeros(self.n)

    def add(self, x: np.ndarray, at: float, gain: float = 1.0):
        i = int(round(at * SR))
        if i >= self.n or i + len(x) <= 0:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        m = min(len(x), self.n - i)
        self.buf[i : i + m] += x[:m] * gain


def sidechain(n: int, kick_times: list[float], depth: float = 0.55, rel: float = 0.16) -> np.ndarray:
    g = np.ones(n)
    t = np.arange(n) / SR
    for k in kick_times:
        i = int(k * SR)
        if i >= n:
            continue
        seg = t[i:] - k
        g[i:] = np.minimum(g[i:], 1 - depth * np.exp(-seg / rel))
    return g


def envelope(x: np.ndarray, att: float, rel: float) -> np.ndarray:
    """Peak envelope follower with attack/release (block-vectorized)."""
    a_att = math.exp(-1 / (att * SR))
    a_rel = math.exp(-1 / (rel * SR))
    ax = np.abs(x)
    out = np.empty_like(ax)
    prev = 0.0
    blk = 4096
    for s in range(0, len(ax), blk):
        seg = ax[s : s + blk]
        for i in range(len(seg)):  # small loop; fine for 30 s at 48 kHz (~1.5 M iterations)
            v = seg[i]
            prev = a_att * prev + (1 - a_att) * v if v > prev else a_rel * prev + (1 - a_rel) * v
            out[s + i] = prev
    return out


def limiter(x: np.ndarray, ceiling: float = 0.89, lookahead: float = 0.005, rel: float = 0.06) -> np.ndarray:
    """Stereo-linked peak limiter with lookahead and exponential release."""
    peak = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    la = int(lookahead * SR)
    peak = maximum_filter1d(peak, size=2 * la + 1, mode='nearest')
    need = np.clip(1 - ceiling / np.maximum(peak, 1e-9), 0, 1)
    # release smoothing: s[n] = max(need[n], s[n-1] * a), vectorised per block
    a = math.exp(-1 / (rel * SR))
    s = np.empty_like(need)
    prev = 0.0
    blk = 20000
    for st in range(0, len(need), blk):
        seg = need[st : st + blk]
        i = np.arange(len(seg), dtype=np.float64)
        w = a ** (-i)
        acc = np.maximum.accumulate(seg * w) / w
        cur = np.maximum(acc, prev * a ** (i + 1))
        s[st : st + len(seg)] = cur
        prev = cur[-1]
    g = 1 - s
    return x * g[:, None] if x.ndim == 2 else x * g


def lufs(x: np.ndarray) -> float:
    import pyloudnorm as pyln

    meter = pyln.Meter(SR)
    return meter.integrated_loudness(x)


# ----------------------------------------------------------------------------------------------
# Score: compose music + SFX to the timeline
# ----------------------------------------------------------------------------------------------
BASS_PATTERN = [(0, 29, 3), (4, 29, 1), (6, 32, 2), (8, 29, 3), (12, 39, 2), (14, 36, 2)]  # (step, midi, steps)
ARP = [65, 68, 72, 75, 72, 68, 65, 68]  # F4 Ab4 C5 Eb5 ...
ITEM_NOTES = [72, 75, 77]  # C5 Eb5 F5
LOGO_NOTES = [65, 68, 72, 75, 77]  # F4 Ab4 C5 Eb5 F5
LIME_NOTE = 84  # C6
PAD_FM9 = [41, 56, 60, 63, 67]
PAD_DB = [37, 53, 56, 61]  # Db2 F3 Ab3 Db4
STAB_CAN = [53, 56, 60, 65]  # F3 Ab3 C4 F4


def compose(scenes: list[SceneTiming], anchor: float, total: float):
    drums = Track(total)
    bassT = Track(total)
    music = Track(total)  # plucks, pads, stabs (sidechained lightly)
    fx = Track(total)
    kicks: list[float] = []
    by_id = {s.id: s for s in scenes}

    def sec(sid: str) -> tuple[float, float]:
        s = by_id[sid]
        return s.start, s.end

    def groove(t0: float, t1: float, arp: bool = False, hats: bool = True):
        """4/4 pattern from t0 to t1 on the global grid (anchor = beat 0)."""
        first = math.ceil((t0 - anchor) / STEP - 1e-6)
        last = math.floor((t1 - anchor) / STEP - 1e-6)
        for si in range(first, last + 1):
            t = anchor + si * STEP
            step = si % 16
            bar = si // 16
            if step % 4 == 0:
                drums.add(kick(1.0), t)
                kicks.append(t)
            if bar % 2 == 1 and step == 14:
                drums.add(kick(0.55), t)
            if step in (4, 12):
                drums.add(clap(0.9), t)
            if hats:
                vel = [1.0, 0.45, 0.7, 0.5][step % 4]
                drums.add(hat(False, vel), t)
                if step == 10 or (bar % 2 == 0 and step == 14):
                    drums.add(hat(True, 0.7), t)
            for (bs, note, ln) in BASS_PATTERN:
                if step == bs:
                    bassT.add(bass(note, ln * STEP * 0.95, 0.9), t)
            if arp and step % 2 == 0:
                note = ARP[(si // 2) % len(ARP)]
                music.add(pluck(note, 0.5, 0.35), t)
                music.add(pluck(note, 0.5, 0.18), t + 3 * STEP)  # dotted-8th delay

    # ---- hook: intro, drop on LYING ----
    hs, he = sec('hook')
    h = by_id['hook']
    fx.add(impact(1.0, 5), 0.0)
    fx.add(subdrop(0.9, 0.8), 0.0)
    fx.add(whoosh(0.3, 0.7), 0.0)
    fx.add(riser(anchor - 0.02, 0.9), 0.0)
    fx.add(scratch(0.16, 0.6), hs + 0.5)  # "30 days" strike
    # drop
    fx.add(impact(1.0, 6), anchor)
    fx.add(glitch(0.7), anchor + 0.02)
    groove(anchor, he)
    fx.add(pop(0.8), hs + h.cues['h3'] + 0.2)  # "you" plate
    fx.add(tick(0.7), hs + h.cues['reset'])

    # ---- s2a / s2b: groove continues, SFX on punches ----
    if 's2a' in by_id:
        s, e = sec('s2a')
        c = by_id['s2a'].cues
        fx.add(whoosh(0.22, 0.6, 31), s - 0.12)
        fx.add(thud(0.9), s)
        fx.add(thud(0.6), s + c['line2'])
        fx.add(scratch(0.14, 0.7), s + c['strike'])
        groove(s, e)
    if 's2b' in by_id:
        s, e = sec('s2b')
        c = by_id['s2b'].cues
        fx.add(whoosh(0.22, 0.6, 32), s - 0.12)
        fx.add(thud(0.9), s)
        fx.add(pop(0.8), s + 0.05)
        fx.add(thud(0.6), s + c['line2'])
        fx.add(thud(0.8), s + c['kick'])
        groove(s, e)

    # ---- s3: brighter, arpeggio, item plucks ----
    if 's3' in by_id:
        s, e = sec('s3')
        c = by_id['s3'].cues
        fx.add(whoosh(0.22, 0.6, 33), s - 0.12)
        fx.add(thud(0.8), s)
        groove(s, s + c['can'], arp=False)
        music.add(stab(STAB_CAN, 0.7, 0.8), s + c['can'])
        fx.add(whoosh(0.35, 0.5, 34), s + c['can'] - 0.1)
        groove(s + c['can'], e, arp=True)
        for i in range(3):
            music.add(pluck(ITEM_NOTES[i], 0.9, 0.7), s + c[f'item{i}'])
            fx.add(tick(0.8), s + c[f'item{i}'])
        fx.add(pop(0.5), s + c['pulse'])

    # ---- s4: breakdown, pad, logo plucks, riser into the price ----
    s, e = sec('s4')
    c = by_id['s4'].cues
    fx.add(whoosh(0.3, 0.5, 35), s - 0.15)
    fx.add(impact(0.5, 7), s)
    music.add(pad(PAD_FM9, c['logo'] + 0.6, att=0.7, rel=0.5), s)
    bassT.add(bass(29, c['logo'] + 0.4, 0.55), s + 0.02)
    for i in range(6):
        fx.add(tick(0.55), s + c[f'w{i}'])
    for i in range(5):
        music.add(pluck(LOGO_NOTES[i], 0.8, 0.75), s + c[f'sq{i}'])
        fx.add(thud(0.35), s + c[f'sq{i}'])
    music.add(pluck(LIME_NOTE, 1.0, 0.9), s + c['lime'])
    fx.add(pop(0.9), s + c['lime'])
    fx.add(impact(0.45, 8), s + c['lime'])
    music.add(reverb(stab(PAD_DB, 1.2, 0.9), 1.4, 0.5), s + c['check'])
    music.add(pad(PAD_DB, e - (s + c['check']) + 0.3, att=0.15, rel=0.4), s + c['check'])
    fx.add(scratch(0.18, 0.5), s + c['check'])
    fx.add(riser(min(1.6, e - (s + c['check'])), 0.8, 36), e - min(1.6, e - (s + c['check'])))

    # ---- s5a: price drop ----
    s, e = sec('s5a')
    c = by_id['s5a'].cues
    fx.add(impact(1.0, 9), s)
    fx.add(subdrop(0.8, 0.6), s)
    groove(s, e)
    fx.add(thud(0.8), s)
    fx.add(impact(0.9, 10), s + c['price'])
    fx.add(subdrop(0.9, 0.9), s + c['price'])
    fx.add(pop(0.9), s + c['price'] + 0.03)
    fx.add(thud(0.6), s + c['access'])
    fx.add(scratch(0.16, 0.6), s + c['underline'])

    # ---- s5b: date ----
    s, e = sec('s5b')
    c = by_id['s5b'].cues
    fx.add(whoosh(0.22, 0.6, 37), s - 0.12)
    fx.add(thud(0.9), s)
    groove(s, e)
    fx.add(impact(0.7, 11), s + c['date'])
    music.add(stab(STAB_CAN, 0.6, 0.6), s + c['date'])
    fx.add(pop(0.6), s + c['pulse'])

    # ---- s6: CTA ----
    s, e = sec('s6')
    c = by_id['s6'].cues
    fx.add(whoosh(0.22, 0.6, 38), s - 0.12)
    fx.add(impact(0.9, 12), s)
    groove(s, s + c['url'] + BEAT)
    fx.add(pop(0.9), s + c['url'])
    music.add(reverb(stab([41, 53, 56, 60, 65], 1.6, 0.9), 1.6, 0.5), s + c['url'])
    bassT.add(bass(29, 1.2, 0.8), s + c['url'])
    for k in ('pulse0', 'pulse1'):
        fx.add(pop(0.6), s + c[k])
        fx.add(thud(0.4), s + c[k])

    # sidechain the tonal layers to the kicks
    sc = sidechain(bassT.n, kicks, depth=0.6, rel=0.15)
    bassT.buf *= sc
    music.buf *= 1 - (1 - sc) * 0.6
    return drums.buf, bassT.buf, music.buf, fx.buf


def stereo(x: np.ndarray, width: float = 0.0, seed: int = 0) -> np.ndarray:
    """Mono -> stereo with optional micro-delay widening."""
    if width <= 0:
        return np.stack([x, x], axis=1)
    d = int(width * SR)
    l = np.concatenate([x, np.zeros(d)])
    r = np.concatenate([np.zeros(d), x])
    return np.stack([l[: len(x)], r[: len(x)]], axis=1)


def render_variant(variant: str, voice: Voice, target_lufs: float):
    short = variant == 'short'
    if short:
        voice = Voice(voice.models, voice.voice, round(voice.speed * 1.06, 3))
    scenes, anchor = build_timeline(variant, voice, short)
    total = scenes[-1].end
    n = int(total * SR)
    print(f'[{variant}] {total:.2f}s  anchor(LYING)={anchor:.3f}s  bpm={BPM}')

    # voice bus
    vb = Track(total)
    for s in scenes:
        for at, a in s.voice:
            vb.add(a, at)
    vbuf = vb.buf
    vbuf = highpass(vbuf, 90, 2)
    # gentle compression on the voice bus
    venv = envelope(vbuf, 0.004, 0.08)
    vgain = np.where(venv > 0.25, (0.25 / np.maximum(venv, 1e-9)) ** 0.45, 1.0)
    vbuf = vbuf * vgain
    vbuf = vbuf / (np.abs(vbuf).max() + 1e-9) * 0.8

    drums, bassb, music, fx = compose(scenes, anchor, total)
    drums = np.tanh(1.3 * drums) / np.tanh(1.3)

    # ducking under the voice
    duck_env = envelope(vbuf, 0.03, 0.25)
    duck = 1 - 0.6 * np.clip(duck_env / 0.25, 0, 1)

    bed = (
        stereo(drums, 0.0) * 0.78
        + stereo(bassb, 0.0) * 0.62
        + stereo(music, 0.0006) * 0.55
        + stereo(fx, 0.0004) * 0.75
    )
    bed *= duck[:, None]
    vox = stereo(vbuf, 0.0)
    # level the buses: speech must lead, the bed sits under it
    bed *= 10 ** ((target_lufs - 5.0 - lufs(bed)) / 20)
    vox *= 10 ** ((target_lufs - 2.0 - lufs(vox)) / 20)
    mix = bed + vox

    # loudness + ceiling
    l0 = lufs(mix)
    g = 10 ** ((target_lufs - l0) / 20)
    mix *= g
    print(f'[{variant}] buses: voice {lufs(vox * g):.1f} LUFS, music+fx {lufs(bed * g):.1f} LUFS')
    mix = limiter(mix, ceiling=10 ** (-1.0 / 20))
    # final fade
    fade = int(0.3 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    l1 = lufs(mix)
    print(f'[{variant}] loudness {l0:.1f} -> {l1:.1f} LUFS, peak {20*math.log10(np.abs(mix).max()):.2f} dBFS')

    os.makedirs(OUT_AUDIO, exist_ok=True)
    os.makedirs(OUT_TIMING, exist_ok=True)
    sf.write(os.path.join(OUT_AUDIO, f'{variant}.wav'), np.clip(mix, -1, 1), SR, subtype='PCM_16')

    frames = int(round(total * FPS))
    fr = lambda x: int(round(x * FPS))  # noqa: E731
    timing = {
        'fps': FPS,
        'frames': frames,
        'bpm': BPM,
        'anchorFrame': fr(anchor),
        'audio': f'audio/{variant}.wav',
        'scenes': [
            {
                'id': s.id,
                'from': fr(s.start),
                'dur': fr(s.end) - fr(s.start),
                'cues': {k: fr(v) for k, v in s.cues.items()},
                'pump': s.id not in ('s4',),
            }
            for s in scenes
        ],
    }
    with open(os.path.join(OUT_TIMING, f'{variant}.json'), 'w') as f:
        json.dump(timing, f, indent=2)
    for s in scenes:
        print(f'   {s.id:4s} {s.start:6.2f}-{s.end:6.2f}s  ' + ' '.join(f'{k}={v:.2f}' for k, v in s.cues.items()))
    return timing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', default=os.environ.get('KOKORO_MODELS', os.path.expanduser('~/models')))
    ap.add_argument('--voice', default='af_bella')
    ap.add_argument('--speed', type=float, default=1.08)
    ap.add_argument('--variant', default='all', choices=['all', 'long', 'short'])
    ap.add_argument('--lufs', type=float, default=-14.0)
    args = ap.parse_args()
    voice = Voice(args.models, args.voice, args.speed)
    for v in (['long', 'short'] if args.variant == 'all' else [args.variant]):
        render_variant(v, voice, args.lufs)


if __name__ == '__main__':
    main()
