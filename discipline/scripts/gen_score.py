#!/usr/bin/env python3
"""
DISCIPLINE — procedural motivational score (stereo, 44.1 kHz), written to the film's timeline.

  python3 scripts/gen_score.py            → public/audio/music.mp3   (file t=0 ↔ film 0:03.00)

Sections (film seconds, from src/timing.ts):
   3–25   Act 1     lonely piano, A minor (Am F C G), pad creeps in
  25–42   Turning   cello + heartbeat taiko + strings/choir swell → hard cut
  42–43   SILENCE   (the 1 s beat)
  43–47   build     riser + snare roll → DROP
  47–77   Act 2     epic grind @ 80 BPM: taiko, staccato strings, brass, piano octaves
  77–99   Doubt     sparse piano in the rain
  99–125  Act 3     hope → drums enter at 104 → full climb → build
 125–131  room      suspended shimmer → swell
 131–141  summit    triumphant (C major), title hits
 141–150  outro     piano + strings, resolve, fade
Needs: numpy, scipy, ffmpeg.
"""
import os
import subprocess

import numpy as np
from scipy.signal import butter, oaconvolve, sosfilt

SR = 44100
T0 = 3.0
END = 150.0
N = int((END - T0) * SR)
BEAT = 0.75  # 80 BPM
BAR = 3.0
rng = np.random.default_rng(7)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUSES = {k: np.zeros((2, N)) for k in ["piano", "strings", "stacc", "choir", "brass", "bass", "drums", "hits"]}


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def idx(t):
    return int(round((t - T0) * SR))


def put(bus, t, sig, pan=0.0, gain=1.0):
    """Add a mono or stereo signal at film time t (constant-power pan)."""
    i = idx(t)
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)])
    if i >= N:
        return
    j0 = max(0, i)
    s0 = j0 - i
    n = min(sig.shape[1] - s0, N - j0)
    if n <= 0:
        return
    BUSES[bus][:, j0 : j0 + n] += gain * sig[:, s0 : s0 + n]


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1, f2], "band", fs=SR, output="sos"), x)


def saw(freq, n, vib=0.0, vib_rate=5.0, phase0=0.0):
    """PolyBLEP band-limited sawtooth with optional vibrato (freq may be scalar)."""
    t = np.arange(n) / SR
    f = freq * (1 + vib * np.sin(2 * np.pi * vib_rate * t + phase0 * 7))
    dt = f / SR
    p = (np.cumsum(dt) + phase0) % 1.0
    y = 2 * p - 1
    m1 = p < dt
    x = p[m1] / dt[m1]
    y[m1] -= x + x - x * x - 1
    m2 = p > 1 - dt
    x = (p[m2] - 1) / dt[m2]
    y[m2] -= x * x + x + x + 1
    return y


def adsr(n, a, d, s, r, hold):
    t = np.arange(n) / SR
    env = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = t > hold
    env[rel] *= np.exp(-(t[rel] - hold) / max(r, 1e-4))
    return env


# ───────────────────────── instruments ─────────────────────────

def piano_note(n, dur, vel):
    f0 = midi(n)
    tail = 2.2
    L = int((dur + tail) * SR)
    t = np.arange(L) / SR
    out = np.zeros(L)
    Bc = 0.00035
    T = 3.2 * (261.0 / f0) ** 0.45
    for k in range(1, 14):
        fk = k * f0 * np.sqrt(1 + Bc * k * k)
        if fk > 11000:
            break
        ak = k ** -1.25 * np.exp(-(k - 1) * (1.1 - vel) * 0.45)
        dk = T / (1 + 0.5 * (k - 1))
        env = 0.55 * np.exp(-t / (dk * 0.22)) + 0.45 * np.exp(-t / dk)
        det = 1 + 0.0004 * (1 if k % 2 else -1)
        out += ak * env * 0.5 * (np.sin(2 * np.pi * fk * t) + np.sin(2 * np.pi * fk * det * t + 0.3))
    out *= np.clip(t / 0.003, 0, 1)
    off = t > dur
    out[off] *= np.exp(-(t[off] - dur) / 0.35)
    ham = lp(rng.standard_normal(int(0.02 * SR)), 3000) * np.exp(-np.arange(int(0.02 * SR)) / (0.004 * SR))
    out[: len(ham)] += 0.08 * vel * ham
    return out * vel


def piano(t, n, dur, vel, gain=1.0):
    pan = np.clip((n - 60) / 30, -0.7, 0.7)
    put("piano", t, piano_note(n, dur, vel), pan, gain)


def string_chord(t, notes, dur, gain=1.0, attack=0.8, release=1.2, cutoff=2600, bus="strings"):
    L = int((dur + release * 3) * SR)
    env = adsr(L, attack, 0.5, 0.85, release, dur)
    for j, n in enumerate(notes):
        for v, (cents, pan) in enumerate([(-7, -0.55), (0, 0.0), (6, 0.55)]):
            f = midi(n) * 2 ** (cents / 1200)
            s = saw(f, L, vib=0.0025, vib_rate=4.8 + v * 0.4, phase0=0.13 * v + 0.07 * j)
            put(bus, t, lp(s, cutoff) * env * 0.11, pan, gain)


def stacc(t, n, gain=1.0, length=0.16, pan=0.0):
    L = int((length + 0.2) * SR)
    env = adsr(L, 0.006, 0.07, 0.25, 0.05, length)
    s = saw(midi(n), L) + 0.6 * saw(midi(n) * 1.004, L, phase0=0.3)
    put("stacc", t, lp(s, 3800) * env * 0.12, pan, gain)


def choir_chord(t, notes, dur, gain=1.0, attack=1.2):
    L = int((dur + 2.5) * SR)
    env = adsr(L, attack, 0.6, 0.9, 1.0, dur)
    for j, n in enumerate(notes):
        for v in range(3):
            s = saw(midi(n) * 2 ** ((v - 1) * 5 / 1200), L, vib=0.004, vib_rate=5.2 + v * 0.3, phase0=0.2 * v + 0.1 * j)
            vox = 1.0 * bp(s, 600, 900) + 0.6 * bp(s, 1000, 1300) + 0.25 * bp(s, 2400, 2900)
            put("choir", t, vox * env * 0.16, (v - 1) * 0.6, gain)


def brass(t, notes, dur=0.55, gain=1.0):
    L = int((dur + 0.8) * SR)
    env = adsr(L, 0.02, 0.25, 0.55, 0.25, dur)
    tt = np.arange(L) / SR
    bright = np.exp(-tt / 0.22)
    for n in notes:
        s = sum(saw(midi(n) * 2 ** (c / 1200), L, phase0=0.17 * i) for i, c in enumerate((-9, 0, 8)))
        dark = lp(s, 600)
        light = lp(s, 3200)
        sig = np.tanh(1.4 * (dark * (1 - bright) + light * bright)) * env * 0.12
        put("brass", t, sig, 0.0, gain)


def bass_note(t, n, dur, gain=1.0):
    L = int((dur + 0.3) * SR)
    env = adsr(L, 0.005, 0.15, 0.7, 0.08, dur)
    tt = np.arange(L) / SR
    s = 0.7 * np.sin(2 * np.pi * midi(n) * tt) + 0.35 * lp(saw(midi(n), L), 500)
    put("bass", t, np.tanh(1.5 * s) * env * 0.45, 0.0, gain)


def taiko(t, gain=1.0, pitch=1.0):
    L = int(1.4 * SR)
    tt = np.arange(L) / SR
    f = (48 + 85 * np.exp(-tt / 0.045)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.42)
    skin = lp(rng.standard_normal(L), 1400) * np.exp(-tt / 0.05) * 0.55
    sig = np.tanh(1.8 * (body + skin)) * 0.9
    put("drums", t, sig, 0.0, gain)


def kick(t, gain=1.0):
    L = int(0.5 * SR)
    tt = np.arange(L) / SR
    f = 45 + 110 * np.exp(-tt / 0.03)
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.2)
    sig[: int(0.003 * SR)] += rng.standard_normal(int(0.003 * SR)) * 0.4
    put("drums", t, np.tanh(2 * sig) * 0.8, 0.0, gain)


def snare(t, gain=1.0, pan=0.0):
    L = int(0.45 * SR)
    tt = np.arange(L) / SR
    nz = bp(rng.standard_normal(L), 1200, 7000) * np.exp(-tt / 0.13)
    tone = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.06) * 0.6
    put("drums", t, (nz + tone) * 0.55, pan, gain)


def tom(t, gain=1.0, f0=110, pan=0.0):
    L = int(0.9 * SR)
    tt = np.arange(L) / SR
    f = f0 * (1 + 0.6 * np.exp(-tt / 0.05))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.3) + lp(rng.standard_normal(L), 900) * np.exp(-tt / 0.04) * 0.3
    put("drums", t, np.tanh(1.5 * sig) * 0.6, pan, gain)


def hat(t, gain=1.0, open_=False):
    L = int((0.35 if open_ else 0.08) * SR)
    tt = np.arange(L) / SR
    sig = hp(rng.standard_normal(L), 7000) * np.exp(-tt / (0.12 if open_ else 0.025)) * 0.25
    put("drums", t, sig, 0.35, gain)


def crash(t, gain=1.0, length=2.4):
    L = int(length * SR)
    tt = np.arange(L) / SR
    sig = hp(rng.standard_normal((2, L)), 4500) * np.exp(-tt / (length * 0.38)) * 0.3
    put("hits", t, sig, 0.0, gain)


def riser(t, dur, gain=1.0, reverse_cymbal=True):
    L = int(dur * SR)
    u = np.arange(L) / L
    nz = rng.standard_normal(L)
    sig = hp(nz, 2500) * u ** 2.2 * 0.35 if reverse_cymbal else nz * 0
    tone = np.sin(2 * np.pi * np.cumsum(220 + 900 * u ** 2) / SR) * u ** 3 * 0.12
    put("hits", t, sig + tone, 0.0, gain)


def braam(t, notes=(33, 45), gain=1.0, length=2.6):
    L = int(length * SR)
    tt = np.arange(L) / SR
    env = np.minimum(1, tt / 0.03) * np.exp(-tt / (length * 0.35))
    s = sum(sum(saw(midi(n) * 2 ** (c / 1200), L, phase0=0.1 * i) for i, c in enumerate((-12, 0, 11))) for n in notes)
    sig = np.tanh(2.2 * lp(s, 700)) * env * 0.35
    sub = np.sin(2 * np.pi * np.cumsum(38 + 30 * np.exp(-tt / 0.1)) / SR) * np.exp(-tt / 0.9) * 0.8
    put("hits", t, sig + sub, 0.0, gain)


def boom(t, gain=1.0):
    L = int(2.2 * SR)
    tt = np.arange(L) / SR
    sub = np.sin(2 * np.pi * np.cumsum(36 + 50 * np.exp(-tt / 0.08)) / SR) * np.exp(-tt / 0.8)
    put("hits", t, np.tanh(1.6 * sub) * 0.9, 0.0, gain)


# ───────────────────────── harmony ─────────────────────────
CH = {
    "Am": (45, (57, 60, 64)),
    "F": (41, (57, 60, 65)),
    "C": (48, (55, 60, 64)),
    "G": (43, (55, 59, 62)),
    "Em": (40, (55, 59, 64)),
    "Dm": (38, (57, 62, 65)),
}
PROG = ["Am", "F", "C", "G"]
TRIUMPH = ["C", "G", "Am", "F"]
MOTIF = {  # melody per chord: (beat offset, midi, beats)
    "Am": [(0, 76, 2), (2, 74, 1), (3, 72, 1)],
    "F": [(0, 72, 2), (2, 69, 1), (3, 72, 1)],
    "C": [(0, 76, 3), (3, 79, 1)],
    "G": [(0, 74, 4)],
}


def arp(t0, ch, vel, octave=0, pattern=(0, 1, 2, 3, 2, 1, 2, 3)):
    root, triad = CH[ch]
    notes = [root + 12 + octave] + [n + octave for n in triad]
    for k, p in enumerate(pattern):
        piano(t0 + k * BEAT / 2, notes[p], BEAT * 0.9, vel * (1.0 if k == 0 else 0.82))


def motif(t0, ch, vel, octave=0):
    for b, n, d in MOTIF[ch]:
        piano(t0 + b * BEAT, n + octave, d * BEAT, vel)


# ───────────────────────── arrangement ─────────────────────────
# ACT 1 — 3.0 → 24 (+ bar into the turning point)
for b in range(8):
    t = 3.0 + b * BAR
    ch = PROG[b % 4]
    arp(t, ch, 0.42 if b < 2 else 0.5)
    if b >= 2:
        motif(t, ch, 0.38 + 0.03 * b)
    if b >= 4:
        string_chord(t, CH[ch][1], BAR, gain=0.25 + 0.06 * (b - 4), attack=1.2)

# TURNING POINT — bars 27 → 42 (hard cut at 42)
for b in range(5):
    t = 27.0 + b * BAR
    ch = PROG[b % 4]
    arp(t, ch, 0.55 + 0.05 * b)
    motif(t, ch, 0.5 + 0.06 * b, octave=12 if b >= 3 else 0)
    bass_note(t, CH[ch][0] - 12, BAR * 0.95, gain=0.35 + 0.1 * b)  # cello-ish root
    string_chord(t, [n - 12 for n in CH[ch][1]] + list(CH[ch][1]), BAR, gain=0.35 + 0.12 * b, attack=1.0, cutoff=1800 + 400 * b)
    if b >= 1:  # heartbeat taiko: boom-boom on 1 and 1.5
        taiko(t, gain=0.25 + 0.12 * b, pitch=0.85)
        taiko(t + 0.28, gain=0.18 + 0.1 * b, pitch=0.8)
    if b >= 3:
        choir_chord(t, CH[ch][1], BAR, gain=0.3 + 0.2 * (b - 3))
boom(36.73, gain=0.7)  # DAY 30 lands
riser(39.0, 3.0, gain=0.8)

# BUILD — 43 → 47 (after the silence)
for k in range(16):  # accelerating snare roll
    tt = 43.6 + 3.3 * (1 - (1 - k / 16) ** 1.6)
    snare(tt, gain=0.15 + 0.6 * k / 16, pan=0.2 * (-1) ** k)
for k, tt in enumerate([44.5, 45.25, 45.62, 46.0]):
    tom(tt, gain=0.4 + 0.15 * k, f0=95 - 8 * k)
riser(43.2, 3.6, gain=1.0)
string_chord(43.0, (45, 52, 57), 3.6, gain=0.55, attack=3.0, cutoff=2200)

# ACT 2 — THE GRIND 47 → 77 (10 bars @ 80 BPM, cuts every 2 beats)
braam(47.0, gain=1.0)
crash(47.0, gain=1.0)
for b in range(10):
    t = 47.0 + b * BAR
    ch = PROG[b % 4]
    root, triad = CH[ch]
    string_chord(t, triad, BAR, gain=0.55, attack=0.25, cutoff=3000)
    choir_chord(t, triad, BAR, gain=0.25 + 0.03 * b, attack=0.4)
    brass(t, [root + 12, triad[1]], gain=0.9)
    for e in range(8):  # bass 8ths
        bass_note(t + e * BEAT / 2, root - 12 if e % 2 == 0 else root, BEAT * 0.45, gain=0.85)
    for s in range(16):  # staccato 16ths
        n = [triad[0] + 12, triad[1] + 12, triad[2] + 12, triad[1] + 12][s % 4]
        stacc(t + s * BEAT / 4, n, gain=0.75 if s % 4 == 0 else 0.55, pan=0.4 * (-1) ** s)
    for q in range(4):
        tq = t + q * BEAT
        if q in (0, 2):
            taiko(tq, gain=0.95)
            kick(tq, gain=0.7)
        else:
            snare(tq, gain=0.8)
        hat(tq + BEAT / 2, gain=0.6)
        hat(tq + BEAT / 4, gain=0.3)
        hat(tq + 3 * BEAT / 4, gain=0.3)
    taiko(t + 2.5 * BEAT, gain=0.6)
    if b >= 4:
        motif(t, ch, 0.75, octave=12)
        motif(t, ch, 0.55)
    if b % 4 == 3:
        for k in range(4):
            tom(t + 3 * BEAT + k * BEAT / 4, gain=0.6 + 0.1 * k, f0=130 - 15 * k, pan=0.5 - 0.33 * k)
    if b % 4 == 0 and b > 0:
        crash(t, gain=0.7)
for k in range(8):  # final fill into the hard cut
    tom(76.25 + k * BEAT / 8, gain=0.5 + 0.06 * k, f0=140 - 10 * k, pan=0.6 - 0.15 * k)

# DOUBT — 77 → 99: lonely piano in the rain
for t, n, v in [(78.5, 69, 0.3), (81.0, 72, 0.28), (83.2, 76, 0.26), (86.0, 74, 0.3), (88.6, 72, 0.26), (91.5, 69, 0.28), (94.0, 67, 0.25), (96.4, 69, 0.3)]:
    piano(t, n, 2.0, v)
    piano(t, n - 24, 2.5, v * 0.55)
string_chord(79.0, (45, 52, 59), 9.0, gain=0.18, attack=3.0, cutoff=1400)
string_chord(89.0, (41, 48, 57), 9.0, gain=0.18, attack=3.0, cutoff=1400)

# ACT 3 — hope (99–104), drums enter at 104, full climb, build to 125
for t, ch in [(99.4, "F"), (101.0, "C")]:
    arp(t, ch, 0.45, pattern=(0, 1, 2, 3, 2, 3))
string_chord(101.0, CH["C"][1], 3.0, gain=0.35, attack=2.0)
for b in range(7):  # bars 104 … 122
    t = 104.0 + b * BAR
    ch = PROG[b % 4]
    root, triad = CH[ch]
    lvl = b / 6
    string_chord(t, triad, BAR, gain=0.4 + 0.25 * lvl, attack=0.3, cutoff=2400 + 1200 * lvl)
    for e in range(8):
        bass_note(t + e * BEAT / 2, root - 12, BEAT * 0.45, gain=0.5 + 0.4 * lvl)
    for q in range(4):
        tq = t + q * BEAT
        taiko(tq, gain=0.55 + 0.35 * lvl) if q in (0, 2) or b >= 2 else None
        if b >= 1 and q in (1, 3):
            snare(tq, gain=0.5 + 0.35 * lvl)
        if b >= 3:
            hat(tq + BEAT / 2, gain=0.5)
    if b >= 2:
        for s in range(16 if b >= 3 else 8):
            step = BEAT / 4 if b >= 3 else BEAT / 2
            n = [triad[0] + 12, triad[1] + 12, triad[2] + 12, triad[1] + 12][s % 4]
            stacc(t + s * step, n, gain=0.5 + 0.25 * lvl, pan=0.4 * (-1) ** s)
    if b >= 3:
        choir_chord(t, triad, BAR, gain=0.3 + 0.3 * lvl, attack=0.5)
        brass(t, [root + 12, triad[2]], gain=0.6 + 0.3 * lvl)
        motif(t, ch, 0.7, octave=12)
    if b in (2, 4):
        crash(t, gain=0.6)
for k in range(24):  # 122 → 125: the big build
    tt = 122.0 + 3.0 * (1 - (1 - k / 24) ** 1.4)
    snare(tt, gain=0.25 + 0.7 * k / 24, pan=0.25 * (-1) ** k)
for k in range(6):
    tom(123.5 + k * 0.25, gain=0.6 + 0.07 * k, f0=120 - 10 * k)
riser(122.0, 3.0, gain=1.1)

# EMPTY ROOM — 125 → 131: suspended shimmer, swell
string_chord(125.0, (60, 64, 67, 72), 5.6, gain=0.4, attack=2.2, cutoff=4200)
choir_chord(126.5, (60, 64, 67), 4.2, gain=0.35, attack=2.0)
for t, n in [(125.2, 72), (126.7, 76), (128.2, 79), (129.7, 84)]:
    piano(t, n, 1.4, 0.4)
riser(129.0, 2.0, gain=0.9)

# SUMMIT — 131 → 141: triumph (C major) + title hits
braam(131.0, notes=(36, 48), gain=1.0)
crash(131.0, gain=1.0, length=3.0)
for b in range(3):  # 131, 134, 137
    t = 131.0 + b * BAR
    ch = TRIUMPH[b % 4]
    root, triad = CH[ch]
    string_chord(t, list(triad) + [triad[0] + 12], BAR, gain=0.7, attack=0.2, cutoff=4200)
    choir_chord(t, triad, BAR, gain=0.75, attack=0.3)
    brass(t, [root + 12, triad[0], triad[2]], dur=1.2, gain=1.0)
    brass(t + 2 * BEAT, [root + 12, triad[1]], dur=0.5, gain=0.7)
    for e in range(8):
        bass_note(t + e * BEAT / 2, root - 12, BEAT * 0.45, gain=0.95)
    for q in range(4):
        tq = t + q * BEAT
        taiko(tq, gain=1.0)
        kick(tq, gain=0.6)
        if q in (1, 3):
            snare(tq, gain=0.85)
        hat(tq + BEAT / 2, gain=0.55)
    for s in range(16):
        stacc(t + s * BEAT / 4, [triad[0] + 12, triad[2] + 12, triad[1] + 24, triad[2] + 12][s % 4], gain=0.7, pan=0.45 * (-1) ** s)
    motif(t, "C" if ch == "C" else ch, 0.85, octave=12)
# title (139.47 → 140.97): letters on the toms, big chord on the last letter
for k in range(10):
    tom(139.47 + k * 5 / 30, gain=0.35 + 0.05 * k, f0=150 - 6 * k, pan=0.5 - 0.1 * k)
braam(140.97, notes=(41, 53), gain=1.0, length=4.0)
crash(140.97, gain=0.9, length=3.5)
string_chord(140.97, (53, 57, 60, 65, 69), 4.0, gain=0.65, attack=0.15, cutoff=3800)
choir_chord(140.97, (57, 60, 65), 4.0, gain=0.7, attack=0.2)

# OUTRO — 145 → 150 under the final line
for t, ch in [(145.0, "C")]:
    arp(t, ch, 0.45, pattern=(0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3))
string_chord(145.0, (48, 55, 60, 64), 4.5, gain=0.4, attack=1.0, cutoff=2400)
piano(148.5, 72, 1.5, 0.35)

# ───────────────────────── mix ─────────────────────────

def make_ir(rt60, length, seed, bright=6000):
    r = np.random.default_rng(seed)
    L = int(length * SR)
    tt = np.arange(L) / SR
    ir = np.vstack([lp(r.standard_normal(L), bright), lp(r.standard_normal(L), bright)])
    ir *= np.exp(-6.9 * tt / rt60)
    pre = int(0.022 * SR)
    ir = np.hstack([np.zeros((2, pre)), ir])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir, wet):
    y = np.vstack([oaconvolve(x[0], ir[0])[:N], oaconvolve(x[1], ir[1])[:N]])
    return y * wet


hall = make_ir(2.6, 3.6, 11)
room = make_ir(1.1, 1.6, 12, bright=8000)

# Act 2 / climb / summit sidechain pump on pads from the taiko/kick hits
pump = np.ones(N)
kicks = [47.0 + b * BAR + q * BEAT for b in range(10) for q in (0, 2)]
kicks += [104.0 + b * BAR + q * BEAT for b in range(7) for q in (0, 2)]
kicks += [131.0 + b * BAR + q * BEAT for b in range(3) for q in range(4)]
tt = np.arange(int(0.4 * SR)) / SR
shape = 1 - 0.4 * np.exp(-tt / 0.11)
for k in kicks:
    i = idx(k)
    n = min(len(shape), N - i)
    if 0 <= i < N:
        pump[i : i + n] = np.minimum(pump[i : i + n], shape[:n])

GAIN = {"piano": 0.9, "strings": 0.75, "stacc": 0.55, "choir": 0.5, "brass": 0.55, "bass": 0.6, "drums": 0.85, "hits": 0.8}
SEND = {"piano": 0.38, "strings": 0.3, "stacc": 0.18, "choir": 0.42, "brass": 0.22, "bass": 0.0, "drums": 0.12, "hits": 0.25}
mix = np.zeros((2, N))
verb_in = np.zeros((2, N))
for k, x in BUSES.items():
    x = x * GAIN[k]
    if k in ("strings", "stacc", "choir", "brass"):
        x = x * pump
    mix += x
    verb_in += x * SEND[k]
mix += reverb(verb_in, hall, 0.55) + reverb(BUSES["drums"] * 0.1, room, 0.4)

# the 1-second silence (42.0 → 43.0) and the hard cut into the doubt (77.0)
def hard_cut(t, fade=0.02):
    i = idx(t)
    f = int(fade * SR)
    mix[:, i - f : i] *= np.linspace(1, 0, f)


hard_cut(42.0)
mix[:, idx(42.0) : idx(43.0)] = 0
# keep only the reverb tail of the last hit after 77
cut = idx(77.0)
tail = np.exp(-np.arange(N - cut) / (0.6 * SR))
mix[:, cut:] = mix[:, cut:] * np.maximum(tail, 0)
# rebuild the doubt + later sections cleanly (they were scaled by the tail above)
later = np.zeros((2, N))
verb_later = np.zeros((2, N))
for k, x in BUSES.items():
    x = x * GAIN[k]
    if k in ("strings", "stacc", "choir", "brass"):
        x = x * pump
    seg = np.zeros_like(x)
    seg[:, cut:] = x[:, cut:]
    later += seg
    verb_later += seg * SEND[k]
d = np.zeros((2, N))
d[:, cut:] = BUSES["drums"][:, cut:]
later += reverb(verb_later, hall, 0.55) + reverb(d * 0.1, room, 0.4)
mix += later

# master: gentle glue compression + soft clip, fade out
env = np.sqrt(np.maximum(lp(np.mean(mix ** 2, axis=0), 8), 0))
thr = 0.18
g = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** 0.35, 1.0)
mix *= g
# dramatic arc: quiet → build → drop → near-silence → climb → triumph (dB keys, film seconds)
ARC = [(3, -9), (24, -8), (27, -7), (41.5, -2), (43, -4), (46.8, -1), (47, 0), (77, 0), (77.2, -4), (99, -4),
       (104, -4), (115, -1.5), (125, 0), (125.2, -3), (130.8, -1), (131, 1), (139.4, 1), (141, 0), (145, -3), (150, -4)]
tf = T0 + np.arange(N) / SR
mix *= 10 ** (np.interp(tf, [a for a, _ in ARC], [b for _, b in ARC]) / 20)
mix = np.tanh(mix * 1.6) / 1.6
fo = idx(148.0)
mix[:, fo:] *= np.linspace(1, 0, N - fo)
mix *= 0.89 / np.max(np.abs(mix))

wav = os.path.join(ROOT, "out", "score.wav")
os.makedirs(os.path.dirname(wav), exist_ok=True)
import wave

with wave.open(wav, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype("<i2").tobytes())
mp3 = os.path.join(ROOT, "public", "audio", "music.mp3")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "256k", mp3], check=True)
print("✓", mp3, f"{(END - T0):.1f}s")
