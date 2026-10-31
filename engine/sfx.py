"""Procedural cinematic sound design (no samples, royalty-free by construction). 48 kHz float32 mono buffers."""
import numpy as np
SR = 48000
rng = np.random.default_rng(7)

def t_(dur): return np.arange(int(SR * dur)) / SR
def env_exp(dur, tau): return np.exp(-t_(dur) / tau)
def lowpass(x, cutoff, order=2):
    # simple one-pole IIR applied `order` times (cheap, stable)
    a = np.exp(-2 * np.pi * cutoff / SR); y = x.astype(np.float64)
    for _ in range(order):
        out = np.empty_like(y); acc = 0.0
        for i in range(len(y)):
            acc = a * acc + (1 - a) * y[i]; out[i] = acc
        y = out
    return y.astype(np.float32)
def lowpass_fast(x, cutoff, order=2):
    from numpy import cumsum
    # moving-average approximation for noise beds (fast)
    n = max(1, int(SR / (2 * cutoff)))
    y = x.astype(np.float64); L = len(y)
    for _ in range(order):
        c = cumsum(np.concatenate([[0], y])); y = (c[n:] - c[:-n]) / n; y = np.concatenate([y, np.full(n - 1, y[-1] if len(y) else 0.0)])[:L]
    return y.astype(np.float32)
def highpass_fast(x, cutoff): return (x - lowpass_fast(x, cutoff, 1)).astype(np.float32)
def noise(dur): return rng.standard_normal(int(SR * dur)).astype(np.float32)

def impact(dur=1.6, sub=1.0):
    t = t_(dur)
    f = 30 + 110 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(dur, 0.42) * sub
    crack = highpass_fast(noise(dur), 1200) * env_exp(dur, 0.045) * 0.6
    body = lowpass_fast(noise(dur), 400) * env_exp(dur, 0.16) * 0.9
    ring = sum(np.sin(2 * np.pi * fr * t) * env_exp(dur, 0.5 / k) for k, fr in enumerate([311, 523, 847], 1)) * 0.06
    return (boom + crack + body + ring).astype(np.float32)

def hit(dur=0.7):
    t = t_(dur); f = 50 + 160 * np.exp(-t * 14)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(dur, 0.14) + highpass_fast(noise(dur), 2000) * env_exp(dur, 0.03) * 0.5).astype(np.float32)

def whoosh(dur=0.9):
    n = noise(dur); t = t_(dur); env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return (highpass_fast(lowpass_fast(n, 3500), 300) * env * 0.5).astype(np.float32)

def riser(dur=1.4):
    t = t_(dur); p = t / dur
    n = highpass_fast(lowpass_fast(noise(dur), 6000), 200) * (p ** 2.2) * 0.55
    f = 80 * 2 ** (p * 2.5); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (p ** 2) * 0.25
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * (4 + 20 * p ** 2) * t)
    return ((n + tone) * trem).astype(np.float32)

def chime(dur=2.2, base=660):
    t = t_(dur); out = np.zeros_like(t)
    for k, (ratio, amp) in enumerate([(1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)]):
        out += np.sin(2 * np.pi * base * ratio * t) * amp * np.exp(-t * (1.2 + k * 1.5))
    return (out * 0.35).astype(np.float32)

def tick(dur=0.06, f=1800):
    t = t_(dur); return (np.sin(2 * np.pi * f * t) * env_exp(dur, 0.012) * 0.6 + highpass_fast(noise(dur), 3000) * env_exp(dur, 0.004) * 0.5).astype(np.float32)

def blip(dur=0.12, f=1320):
    t = t_(dur); return (np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / dur) * 0.35).astype(np.float32)

def creak(dur=1.2):
    t = t_(dur); f = 90 + 40 * np.sin(2 * np.pi * 0.7 * t) + rng.standard_normal(len(t)).cumsum() * 0.02
    saw = (2 * ((np.cumsum(f) / SR) % 1) - 1)
    return (lowpass_fast(saw.astype(np.float32), 900) * np.sin(np.pi * t / dur) * 0.22).astype(np.float32)

def grind(dur=1.5):
    n = lowpass_fast(noise(dur), 500); t = t_(dur)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 1.3 * t))
    return (n * mod * np.sin(np.pi * t / dur) * 0.6).astype(np.float32)

def heartbeat(dur=0.5):
    t = t_(dur); f = 42 + 50 * np.exp(-t * 18)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(dur, 0.09)).astype(np.float32)

def pad_chord(dur, freqs, amp=1.0):
    t = t_(dur); out = np.zeros_like(t)
    for i, f in enumerate(freqs):
        for h in (1, 2, 3):
            det = 1 + 0.002 * np.sin(2 * np.pi * (0.11 + 0.07 * i) * t)
            out += np.sin(2 * np.pi * f * h * det * t + i) / (h * h) * (0.9 ** i)
    out *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t + 1)
    return (out * amp).astype(np.float32)

def drone(dur):
    t = t_(dur)
    sub = (np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.6 * t) * 0.7 + np.sin(2 * np.pi * 110 * t) * 0.25) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t))
    air = lowpass_fast(noise(dur), 300, 3) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t + 2)) * 2.0
    return (sub * 0.35 + air).astype(np.float32)

def place(mix, clip, t, gain=1.0):
    i = int(t * SR); n = len(clip)
    if i >= len(mix) or i + n <= 0: return
    if i < 0: clip = clip[-i:]; n = len(clip); i = 0
    n = min(n, len(mix) - i)
    mix[i:i + n] += clip[:n] * gain

def fade(x, fi=0.01, fo=0.05):
    n = len(x); a = int(fi * SR); b = int(fo * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x
