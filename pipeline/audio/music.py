#!/usr/bin/env python3
"""Procedural cinematic score + SFX aligned to timeline.json (no external samples, fully deterministic).

Usage: python3 pipeline/audio/music.py out/<id>/   → out/<id>/music.wav, out/<id>/sfx.wav (48 kHz stereo)
"""
import json, math, os, sys
import numpy as np, soundfile as sf

SR = 48000
rng = np.random.default_rng(618)

def t_axis(n): return np.arange(n) / SR
def env_adsr(n, a, d, s, r, total):
    t = t_axis(n); e = np.ones(n) * s
    e = np.where(t < a, t / max(a, 1e-4), e)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    rel = np.clip((t - (total - r)) / max(r, 1e-4), 0, 1); e *= (1 - rel)
    return e
def lowpass(x, cutoff):  # one-pole, cutoff may be array (time-varying)
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    # chunked IIR (vectorised per chunk, coefficient held per chunk)
    CH = 256
    for i in range(0, len(x), CH):
        xa = x[i:i + CH]; aa = float(a[min(i + CH // 2, len(a) - 1)])
        # y[n] = y[n-1] + aa*(x[n]-y[n-1])  → closed form via cumulative filter
        k = (1 - aa) ** np.arange(len(xa) + 1)
        out = np.empty(len(xa)); prev = acc
        for j in range(len(xa)):  # small chunk, plain loop (fast enough: 2.6M samples ≈ few s)
            prev = prev + aa * (xa[j] - prev); out[j] = prev
        acc = prev; y[i:i + CH] = out
    return y
def fast_lowpass(x, cutoff_hz):  # FFT brick-ish lowpass with soft knee for static cutoffs
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / np.sqrt(1 + (f / cutoff_hz) ** 4); return np.fft.irfft(X * H, n=len(x))
def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4) / np.sqrt(1 + (f / hi) ** 4); return np.fft.irfft(X * H, n=len(x))
def reverb(x, seconds=2.8, wet=0.35, pre=0.02):
    n = int(seconds * SR); ir = rng.standard_normal(n) * np.exp(-t_axis(n) * (6.0 / seconds))
    ir = fast_lowpass(ir, 5000); ir[: int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum()) * 3.0
    y = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n))[: len(x)]
    return x * (1 - wet) + y * wet
def add(buf, x, t0, gain=1.0):
    i = int(t0 * SR); 
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * gain

# ---------------- instruments ----------------
def pad_note(freq, dur, cutoff_curve, detune=0.006, amp=1.0):
    n = int(dur * SR); t = t_axis(n); out = np.zeros(n)
    for k, dt in enumerate((-detune, 0.0, detune)):
        f = freq * (1 + dt); ph = 2 * np.pi * f * t + rng.uniform(0, 6.28)
        sig = np.zeros(n)
        for h in range(1, 9): sig += np.sin(ph * h + 0.3 * h) / h  # saw-ish
        out += sig * (1.0 if k == 1 else 0.7)
    out = out / 3.0
    out = lowpass(out, cutoff_curve)  # time-varying filter
    e = env_adsr(n, 1.2, 0.5, 0.85, 2.0, dur); return out * e * amp
def sub(freq, dur, amp=1.0):
    n = int(dur * SR); t = t_axis(n); return np.sin(2 * np.pi * freq * t) * env_adsr(n, 0.6, 0.3, 0.9, 1.5, dur) * amp
def impact(strength=1.0, f0=95, f1=32, dur=1.4):
    n = int(dur * SR); t = t_axis(n)
    f = f1 + (f0 - f1) * np.exp(-t * 7); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 3.2)
    noise = bandpass(rng.standard_normal(n), 60, 2500) * np.exp(-t * 14) * 0.9
    click = bandpass(rng.standard_normal(n), 1500, 8000) * np.exp(-t * 90) * 0.5
    x = body * 1.0 + noise + click
    return np.tanh(x * 1.6 * strength) * 0.9
def riser(dur=0.9, f_lo=150, f_hi=4500, amp=1.0):
    n = int(dur * SR); t = t_axis(n); k = (t / dur) ** 1.6
    noise = rng.standard_normal(n)
    cutoff = f_lo * (f_hi / f_lo) ** k
    x = lowpass(noise, cutoff) * k ** 1.2
    tone = np.sin(2 * np.pi * np.cumsum(180 * (6 ** k)) / SR) * k ** 2 * 0.35
    return (x * 0.9 + tone) * amp
def whoosh(dur=0.8, amp=1.0):
    n = int(dur * SR); t = t_axis(n); e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return bandpass(rng.standard_normal(n), 300, 3000) * e * amp
def ping(amp=1.0):
    n = int(1.6 * SR); t = t_axis(n)
    x = (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 4.5)
    echo = np.zeros(n); d = int(0.28 * SR); echo[d:] = x[:-d] * 0.45; echo2 = np.zeros(n); echo2[2 * d:] = x[:-2 * d] * 0.2
    return (x + echo + echo2) * amp * 0.5
def heartbeat(amp=1.0):
    n = int(0.5 * SR); t = t_axis(n)
    lub = np.sin(2 * np.pi * 58 * t) * np.exp(-t * 22)
    dub = np.zeros(n); d = int(0.17 * SR); dub[d:] = (np.sin(2 * np.pi * 52 * t) * np.exp(-t * 26))[:-d] * 0.8
    return np.tanh((lub + dub) * 2.2) * amp
def tick(amp=1.0):
    n = int(0.08 * SR); t = t_axis(n); return bandpass(rng.standard_normal(n), 2500, 6000) * np.exp(-t * 120) * amp

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'Bb': 10, 'B': 11}
def hz(name, octv): return 440.0 * 2 ** ((NOTE[name] + (octv - 4) * 12 - 9) / 12)
CHORDS = {'Dm': [('D', 2), ('A', 2), ('D', 3), ('F', 3), ('A', 3)], 'Bb': [('Bb', 1), ('F', 2), ('Bb', 2), ('D', 3), ('F', 3)],
          'F': [('F', 2), ('C', 3), ('F', 3), ('A', 3), ('C', 4)], 'C': [('C', 2), ('G', 2), ('C', 3), ('E', 3), ('G', 3)],
          'Gm': [('G', 1), ('D', 2), ('G', 2), ('Bb', 2), ('D', 3)]}

def main(out_dir):
    tl = json.load(open(os.path.join(out_dir, 'timeline.json')))
    B = {b['id']: b for b in tl['beats']}; Lmap = {l['id']: l for b in tl['beats'] for l in b['lines']}
    dur = tl['duration']; N = int(math.ceil(dur * SR)); music = np.zeros(N); sfx = np.zeros(N)
    t_gone = tl['countdown']['t_to'] if tl.get('countdown') else B['cta']['t0']
    TR_HIT = 0.22 + 0.85 * 0.72 - 0.22  # impact lands ~0.39 s after beat start (matches the camera shake)

    # ---- harmonic plan (chord per beat) ----
    plan = [('earth', 'Dm'), ('jupiter', 'Dm'), ('sun', 'Bb'), ('betelgeuse', 'F'), ('find', 'F'), ('stephenson', 'C'),
            ('onemore', 'Gm'), ('ton618', 'Dm'), ('nested', 'Dm'), ('cta', 'F')]
    for bid, ch in plan:
        b = B[bid]; t0, t1 = b['t0'], b['t1']; d = t1 - t0 + 2.0
        n = int(d * SR); tt = t_axis(n)
        base_cut = {'earth': 420, 'jupiter': 520, 'sun': 700, 'betelgeuse': 600, 'find': 380, 'stephenson': 750, 'onemore': 300, 'ton618': 900, 'nested': 260, 'cta': 520}[bid]
        cut = base_cut * (1 + 0.35 * np.sin(2 * np.pi * 0.07 * tt + 1.0))
        if bid == 'onemore': cut = 250 * (14 ** np.clip(tt / (t1 - t0), 0, 1))  # filter sweep up = tension
        amp = {'earth': 0.55, 'jupiter': 0.6, 'sun': 0.7, 'betelgeuse': 0.65, 'find': 0.45, 'stephenson': 0.75, 'onemore': 0.6, 'ton618': 0.9, 'nested': 0.5, 'cta': 0.6}[bid]
        voices = CHORDS[ch]
        for i, (nm, octv) in enumerate(voices):
            g = 1.0 if i < 2 else 0.55
            add(music, pad_note(hz(nm, octv), d, cut, amp=g), t0 - 0.3, amp * 0.22)
        if bid == 'ton618': add(music, sub(hz(voices[0][0], 1), d, 1.0), t0 + 0.3, 0.42)  # deep sub under the black hole
    # countdown-zero: duck the pad, whump, then silence → resolve on cta
    gate = np.ones(N); i0 = int((t_gone - 0.05) * SR); i1 = int((t_gone + 0.9) * SR); gate[i0:i1] = 0.12
    ramp = int(0.08 * SR); gate[i0 - ramp:i0] = np.linspace(1, 0.12, ramp); gate[i1:i1 + ramp * 6] = np.linspace(0.12, 1, ramp * 6)
    music *= gate
    music = reverb(music, 3.2, 0.42)

    # ---- SFX ----
    for bid, strength in (('jupiter', 0.8), ('sun', 0.9), ('betelgeuse', 1.0), ('stephenson', 0.9), ('ton618', 1.25)):
        t0 = B[bid]['t0']
        add(sfx, riser(0.95, amp=0.55 if bid != 'ton618' else 0.0), t0 + TR_HIT - 0.95)
        add(sfx, whoosh(0.9, 0.45), t0 - 0.25)
        add(sfx, reverb(impact(strength), 2.2, 0.3), t0 + TR_HIT)
    # long riser through "still not the biggest" into TON 618
    add(sfx, riser(B['ton618']['t0'] + TR_HIT - B['onemore']['t0'], 90, 6000, amp=0.75), B['onemore']['t0'])
    # ping when the Sun is revealed
    add(sfx, reverb(ping(1.0), 1.8, 0.3), Lmap['f1']['t1'] + 1.05)
    # light lap: soft rising shimmer
    st4 = Lmap['st4']; add(sfx, riser(B['stephenson']['t1'] - st4['t0'] - 0.3, 600, 3000, amp=0.18), st4['t0'] + 0.3)
    # heartbeat accelerating to the vanish point
    t = B['nested']['t0'] + 0.2; k = 0
    while t < t_gone - 0.25:
        frac = (t - B['nested']['t0']) / (t_gone - B['nested']['t0']); add(sfx, heartbeat(0.55 + 0.45 * frac), t); t += 1.05 - 0.6 * frac; k += 1
    # ticks in the last 5 seconds
    for s in range(1, 6): add(sfx, tick(0.35), t_gone - s)
    # GONE: deep whump + reverse swell
    add(sfx, reverb(impact(1.3, 70, 28, 2.2), 3.0, 0.4), t_gone - 0.02)
    # tiny sparkle on the subscribe card
    add(sfx, ping(0.35), Lmap['c2']['t0'] + 0.1)

    def finish(x, peak):
        x = x - x.mean(); m = np.abs(x).max() or 1; return x / m * peak
    music = finish(music, 0.5); sfx = finish(sfx, 0.85)
    # pseudo-stereo: slight Haas widening on music
    wid = int(0.012 * SR); mL = music.copy(); mR = np.concatenate([np.zeros(wid), music[:-wid]])
    sf.write(os.path.join(out_dir, 'music.wav'), np.stack([mL * 0.9 + mR * 0.1, mR * 0.9 + mL * 0.1], 1), SR, subtype='PCM_16')
    sf.write(os.path.join(out_dir, 'sfx.wav'), np.stack([sfx, sfx], 1), SR, subtype='PCM_16')
    print(f'[music] wrote music.wav + sfx.wav ({dur:.1f}s), gone at {t_gone:.2f}s')

if __name__ == '__main__':
    main(sys.argv[1])
