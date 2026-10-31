"""Procedural soundtrack + SFX for "Last Ball Standing", driven by the sim's event log.
   python3 tools/audio_last_ball.py build/lb_39.json build/lb_39_audio.wav
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(7)
D = json.load(open(sys.argv[1]))
FPS = D['fps']; N = D['nFrames']
DUR = N / FPS + 0.6
L = int(DUR * SR)
music = np.zeros((L, 2)); sfx = np.zeros((L, 2))
ts_curve = np.array([m[1] for m in D['meta']])  # time-scale per frame


def t_arr(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-t_arr(d) * k)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR))


def put(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414


def sweep(f0, f1, d, shape='sin'):
    f = np.geomspace(f0, f1, int(d * SR)); ph = 2 * np.pi * np.cumsum(f) / SR
    if shape == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    return np.sin(ph)


# ---------------- instruments ----------------
def kick(): t = t_arr(0.45); f = 48 + 110 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + 0.3 * hp(noise(0.45), 3000) * np.exp(-t * 90)
def hat(open_=False): d = 0.25 if open_ else 0.06; return hp(noise(d), 7000) * env_exp(d, 18 if open_ else 70) * 0.5
def clap(): return bp(noise(0.25), 900, 2600) * env_exp(0.25, 20) * 0.9
def saw_note(f, d, cutoff=900, det=0.004):
    t = t_arr(d); x = sum(2 * ((t * f * (1 + s)) % 1) - 1 for s in (-det, 0, det)) / 3
    return lp(x, cutoff) * np.minimum(1, t * 80) * np.exp(-t * 1.2)
def pluck(f, d=0.22): t = t_arr(d); x = 2 * ((t * f) % 1) - 1; return lp(x, 3200) * np.exp(-t * 16)
def sub_boom(d=1.4, f0=70, f1=32): t = t_arr(d); return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR) * np.exp(-t * 2.6)
def whoosh(d=0.5, f0=400, f1=4000, q=0.35):
    x = noise(d); out = np.zeros_like(x); n = 512
    fs = np.geomspace(f0, f1, len(x) // n + 1)
    for k in range(0, len(x), n):
        fc = fs[k // n]; out[k:k + n] = bp(x[max(0, k - 2048):k + n], fc * (1 - q), fc * (1 + q))[-len(x[k:k + n]):]
    e = np.sin(np.linspace(0, np.pi, len(x))) ** 2
    return out * e
def riser(d=1.0): return whoosh(d, 300, 6000, 0.25) * np.linspace(0.2, 1, int(d * SR)) ** 2 + sweep(200, 1200, d, 'saw') * 0.06 * np.linspace(0, 1, int(d * SR))
def braam(d=1.6, root=55.0):
    t = t_arr(d); x = sum(2 * ((t * root * m * (1 + s)) % 1) - 1 for m in (1, 1.5, 2) for s in (-0.006, 0.006))
    return np.tanh(lp(x, 700) * 0.9) * np.exp(-t * 1.6) * np.minimum(1, t * 60)
def crash(d=2.5): return hp(noise(d), 4500) * env_exp(d, 2.2) * 0.6
def beep(f=1760, d=0.07): t = t_arr(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 40)
def click(f=2400): t = t_arr(0.03); return np.sin(2 * np.pi * f * t) * np.exp(-t * 200)
def modal(freqs, d, decay): t = t_arr(d); return sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * decay * (1 + i * 0.6)) for i, f in enumerate(freqs))
def thud(f=90, d=0.3): t = t_arr(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 18) + lp(noise(d), 600) * np.exp(-t * 30) * 0.6
def crumble(d=0.6):
    x = bp(noise(d), 200, 3000) * env_exp(d, 6)
    grains = (rng.random(int(d * SR)) < 0.004).astype(float) * rng.standard_normal(int(d * SR)) * 3
    return x * 0.6 + lp(grains, 2500) * env_exp(d, 5)
def laser_down(): return sweep(1100, 110, 0.6) * env_exp(0.6, 3.5) * 0.7 + sweep(1650, 165, 0.6) * env_exp(0.6, 5) * 0.25
def chord(fs, d=2.4): t = t_arr(d); return sum(saw_note(f, d, 2400) for f in fs) / len(fs) * 1.6


def M(*parts):
    out = np.zeros(max(len(p) for p in parts))
    for p in parts: out[:len(p)] += p
    return out


def video_t(f): return f / FPS
def pitch(x, factor):
    if abs(factor - 1) < 0.02: return x
    idx = np.arange(0, len(x) - 1, factor); return np.interp(idx, np.arange(len(x)), x)


# ---------------- music arrangement ----------------
ev = D['events']
rounds = {e['id']: e['f'] / FPS for e in ev if e['type'] == 'round'}
win_t = next(e['f'] for e in ev if e['type'] == 'winner') / FPS
final_t = rounds.get('final', win_t - 4)
BPM = 128; beat = 60 / BPM
start = rounds.get('crumble', 2.6)
bass_prog = [55.0, 55.0, 43.65, 49.0]  # A1 A1 F1 G1
arp_notes = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196]

# intro drone under the hook
drone = lp(sum(2 * ((t_arr(start + 0.5) * f) % 1) - 1 for f in (55, 55.4, 82.4)), 380) * 0.25
drone *= np.minimum(1, t_arr(start + 0.5) * 3) * np.minimum(1, (start + 0.5 - t_arr(start + 0.5)) * 4)
put(music, drone, 0, 0.6)

t = start; n = 0
while t < win_t + 0.1:
    in_final = final_t <= t < win_t
    bar = n // 4; step = n % 4
    if not in_final or step % 2 == 0: put(music, kick(), t, 0.9)
    if t >= rounds.get('tilt', 99) or in_final:
        if step % 2 == 1: put(music, clap(), t, 0.35, 0.1)
    for h in range(4 if t >= rounds.get('tilt', 99) else 2):
        put(music, hat(open_=(h == 2)), t + h * beat / (4 if t >= rounds.get('tilt', 99) else 2), 0.22, 0.4 * (-1) ** h)
    root = bass_prog[bar % 4]
    for e8 in range(2):
        put(music, saw_note(root * (2 if e8 else 1), beat / 2 * 0.95, 500 + 400 * (t > rounds.get('meteor', 99))), t + e8 * beat / 2, 0.42)
    if t >= rounds.get('meteor', 99) or in_final:
        for s16 in range(4):
            k = (n * 4 + s16) % 8
            put(music, pluck(arp_notes[k] * (1.5 if bar % 4 == 2 else 1)), t + s16 * beat / 4, 0.12, -0.3 + 0.6 * (s16 % 2))
    t += beat; n += 1

# heartbeat tension during the final duel
hb = final_t
while hb < win_t:
    put(music, thud(55, 0.25), hb, 0.8); put(music, thud(50, 0.25), hb + 0.22, 0.6); hb += 0.75

# sidechain-ish pump on the music bus
pump = np.ones(L)
kt = start
while kt < win_t:
    i = int(kt * SR); seg = min(int(beat * SR), L - i)
    if seg > 0: pump[i:i + seg] = 1 - 0.45 * np.exp(-np.arange(seg) / SR * 14)
    kt += beat
music *= pump[:, None]

# winner: crash + major chord + sparkle arp
put(music, crash(3.0), win_t + 0.05, 0.8)
put(music, chord([220, 277.2, 329.6, 440, 554.4], 3.2), win_t + 0.05, 0.55)
for k, f in enumerate([880, 1108.7, 1318.5, 1760, 2217.5, 2637]): put(music, pluck(f, 0.3), win_t + 0.55 + k * 0.09, 0.18, -0.5 + k * 0.2)

# slow-mo: muffle + dip the music while time is slowed
cut = np.interp(np.arange(L) / SR, np.arange(len(ts_curve)) / FPS, ts_curve)
for ch in range(2):
    y = np.zeros(L); zi = np.zeros(1); n = 1024
    for k in range(0, L, n):
        c = cut[k]; fc = 600 + (16000 - 600) * max(0, (c - 0.3) / 0.7) ** 2
        a = np.exp(-2 * np.pi * fc / SR)
        y[k:k + n], zi = lfilter([1 - a], [1, -a], music[k:k + n, ch], zi=zi)
    music[:, ch] = y * (0.55 + 0.45 * cut)

# ---------------- SFX from events ----------------
def ts_at(f): return ts_curve[min(f, len(ts_curve) - 1)]

# hook: whoosh into the slam (balls hit around frame 14), boom + crack
put(sfx, whoosh(0.3, 600, 5000), 0.0, 0.6)
put(sfx, sub_boom(1.6, 80, 30), 14 / FPS, 1.1)
put(sfx, hp(noise(0.3), 1500) * env_exp(0.3, 14), 14 / FPS, 0.6)
for i in range(5): put(sfx, click(1800 + i * 300), 0.3 + i * 0.09 + 0.15, 0.35, -0.6 + i * 0.3)
put(sfx, braam(1.2, 55), 0.75 + 0.08, 0.55)  # "ONLY 1 SURVIVES" stamp

last_hit = {}
for e in ev:
    tt = video_t(e['f']); pf = ts_at(e['f'])
    pan = float(np.clip(e.get('x', 0) / 6, -0.8, 0.8))
    pf2 = 1 / max(0.45, pf) ** 0.5  # slowed time -> lower pitch (stretch factor)
    if e['type'] == 'hit':
        key = e['k']
        if tt - last_hit.get(key, -1) < 0.035: continue
        last_hit[key] = tt
        s = min(e['s'], 12)
        if key == 'ball-ball': x = M(modal([1450, 2380, 3900], 0.25, 22) * 0.5, thud(140, 0.15) * 0.8); g = 0.08 + s * 0.05
        elif key == 'ball-tile': x = M(thud(85 + s * 6, 0.25), modal([620, 1230], 0.15, 30) * 0.3); g = 0.05 + s * 0.03
        elif 'meteor' in key: x = M(sub_boom(0.9, 90, 35), crumble(0.5) * 0.8); g = min(0.9, 0.2 + s * 0.04)
        else: x = M(modal([480, 900, 1700], 0.2, 25) * 0.4, thud(120, 0.15) * 0.4); g = 0.03 + s * 0.015
        put(sfx, pitch(x, 1 / pf2), tt, min(g, 0.9), pan)
    elif e['type'] == 'warn': put(sfx, beep(1980, 0.05), tt, 0.07, pan)
    elif e['type'] == 'drop': put(sfx, pitch(M(crumble(0.5) * 0.7, thud(70, 0.3)), 1 / pf2), tt, 0.22, pan)
    elif e['type'] == 'dash': put(sfx, whoosh(0.28, 500, 3500), tt, 0.28, pan)
    elif e['type'] == 'meteor': put(sfx, whoosh(0.85, 3500, 250, 0.3), tt, 0.4, pan)
    elif e['type'] == 'shock': put(sfx, M(sub_boom(1.2, 110, 30) * 0.9, whoosh(0.6, 200, 2500) * 0.5), tt, 0.85, pan)
    elif e['type'] == 'elim':
        put(sfx, laser_down(), tt, 0.55); put(sfx, sub_boom(1.0, 90, 35), tt + 0.05, 0.7); put(sfx, braam(1.4, 41.2), tt + 0.08, 0.45)
    elif e['type'] == 'round':
        put(sfx, riser(0.9), tt - 0.9, 0.35); put(sfx, braam(1.6, 55 if e['id'] != 'final' else 46.25), tt, 0.6); put(sfx, sub_boom(1.2), tt, 0.6)
    elif e['type'] == 'winner':
        put(sfx, riser(0.6), tt - 0.1, 0.3); put(sfx, sub_boom(1.6, 90, 30), tt + 0.55, 0.9)

mix = music * 0.55 + sfx * 0.9
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fade = int(0.35 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= max(1e-9, np.abs(mix).max()) / 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print('audio', sys.argv[2], f'{DUR:.2f}s')
