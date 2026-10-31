"""Procedural soundtrack + SFX for "1 TON BALL vs 10 FLOORS", driven by the sim's event log.
   python3 tools/audio_drop_test.py build/dt.json build/dt_audio.wav
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(3)
D = json.load(open(sys.argv[1]))
FPS = D['fps']; N = D['nFrames']; FL = D['layout']['floors']
START = int(sys.argv[3]) if len(sys.argv) > 3 else 0  # sim frames skipped by the renderer
DUR = (N - START) / FPS + 0.5
L = int(DUR * SR)
music = np.zeros((L, 2)); sfx = np.zeros((L, 2))
ts_curve = np.array([m[1] for m in D['meta']])[START:]; kmh = np.array([m[2] for m in D['meta']])[START:]


def t_arr(d): return np.arange(int(d * SR)) / SR
def env_exp(d, k): return np.exp(-t_arr(d) * k)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR / 2 - 100), 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR))
def M(*parts):
    out = np.zeros(max(len(p) for p in parts))
    for p in parts: out[:len(p)] += p
    return out


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
    return out * np.sin(np.linspace(0, np.pi, len(x))) ** 2
def riser(d=1.0): return whoosh(d, 300, 6000, 0.25) * np.linspace(0.2, 1, int(d * SR)) ** 2 + sweep(200, 1200, d, 'saw') * 0.06 * np.linspace(0, 1, int(d * SR))
def braam(d=1.6, root=55.0):
    t = t_arr(d); x = sum(2 * ((t * root * m * (1 + s)) % 1) - 1 for m in (1, 1.5, 2) for s in (-0.006, 0.006))
    return np.tanh(lp(x, 700) * 0.9) * np.exp(-t * 1.6) * np.minimum(1, t * 60)
def crash(d=2.5): return hp(noise(d), 4500) * env_exp(d, 2.2) * 0.6
def modal(freqs, d, decay): t = t_arr(d); return sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * decay * (1 + i * 0.6)) for i, f in enumerate(freqs))
def thud(f=90, d=0.3): t = t_arr(d); return M(np.sin(2 * np.pi * f * t) * np.exp(-t * 18), lp(noise(d), 600) * np.exp(-t * 30) * 0.6)
def rubble(d=0.9, lo=150, hi=2500):
    x = bp(noise(d), lo, hi) * env_exp(d, 4)
    grains = (rng.random(int(d * SR)) < 0.003).astype(float) * rng.standard_normal(int(d * SR)) * 3
    return M(x * 0.6, lp(grains, 2500) * env_exp(d, 3.5))
def glass_shatter(d=1.1, n=70, lo=1800, hi=7000):
    out = hp(noise(d), 3000) * env_exp(d, 7) * 0.5
    for _ in range(n):
        f = rng.uniform(lo, hi); st = int(rng.uniform(0, d * 0.45) * SR); ln = int(rng.uniform(0.04, 0.2) * SR)
        ln = min(ln, len(out) - st); t = np.arange(ln) / SR; out[st:st + ln] += np.sin(2 * np.pi * f * t) * np.exp(-t * rng.uniform(25, 60)) * 0.35
    return out
def ice_crack(d=0.8): return M(bp(noise(d), 600, 4000) * env_exp(d, 9) * 0.7, glass_shatter(0.6, 25, 900, 2600) * 0.6, thud(120, 0.3) * 0.8)
def wood_splinter(d=0.8): return M(bp(noise(d), 300, 2500) * env_exp(d, 8), rubble(0.6, 200, 1500) * 0.7, thud(110, 0.3))
def clang(d=1.6, base=620): return M(modal([base, base * 2.4, base * 3.9, base * 5.3], d, 3.0) * 0.5, thud(90, 0.3) * 0.8, hp(noise(0.2), 2000) * env_exp(0.2, 30) * 0.5)
def heartbeat(): return M(thud(52, 0.26) * 0.9, np.concatenate([np.zeros(int(0.19 * SR)), thud(46, 0.26) * 0.65]))
def crack_tick(): t = t_arr(0.05); return bp(noise(0.05), 1500, 6000) * np.exp(-t * 120) * 1.5
def chord(fs, d=2.4): t = t_arr(d); return sum(saw_note(f, d, 2400) for f in fs) / len(fs) * 1.6
def pitch(x, factor):
    if abs(factor - 1) < 0.02: return x
    idx = np.arange(0, len(x) - 1, factor); return np.interp(idx, np.arange(len(x)), x)


def vt(f): return (f - START) / FPS
def ts_at(f): return ts_curve[min(max(0, f - START), len(ts_curve) - 1)]

ev = D['events']
breaks = {e['floor']: vt(e['f']) for e in ev if e['type'] == 'break'}
trigs = {e['floor']: vt(e['f']) for e in ev if e['type'] == 'trigger'}
rests = {e['floor']: vt(e['f']) for e in ev if e['type'] == 'rest'}
splash_t = next((vt(e['f']) for e in ev if e['type'] == 'splash'), DUR - 2)

# ---------------- music: pulse that rises a semitone per floor ----------------
BPM = 132; beat = 60 / BPM
root0 = 55.0
t = 0.0; n = 0
while t < splash_t:
    floor_now = sum(1 for b in breaks.values() if b <= t)
    in_hold = any(trigs.get(i, 99) <= t < breaks.get(i, 99) for i in (8, 9))
    root = root0 * 2 ** (min(floor_now, 9) / 12)
    if not in_hold:
        put(music, kick(), t, 0.85)
        for h in range(4): put(music, hat(open_=(h == 2)), t + h * beat / 4, 0.2, 0.4 * (-1) ** h)
        for e8 in range(2): put(music, saw_note(root * (2 if e8 else 1), beat / 2 * 0.95, 500 + 60 * floor_now), t + e8 * beat / 2, 0.4)
        if floor_now >= 4:
            for s16 in range(4): put(music, pluck(root * 4 * (1.5 if (n // 2) % 2 else 1)), t + s16 * beat / 4, 0.09, -0.3 + 0.6 * (s16 % 2))
    else:
        put(music, heartbeat(), t, 0.9)
    t += beat; n += 1

# sidechain pump
pump = np.ones(L); kt = 0.0
while kt < splash_t:
    i = int(kt * SR); seg = min(int(beat * SR), L - i)
    if seg > 0: pump[i:i + seg] = 1 - 0.4 * np.exp(-np.arange(seg) / SR * 14)
    kt += beat
music *= pump[:, None]
# ending: crash + chord + sparkle
put(music, crash(3.0), splash_t + 0.05, 0.8)
put(music, chord([220, 277.2, 329.6, 440, 554.4], 3.4), splash_t + 0.3, 0.5)
for k, f in enumerate([880, 1108.7, 1318.5, 1760, 2217.5, 2637]): put(music, pluck(f, 0.3), splash_t + 1.8 + k * 0.09, 0.16, -0.5 + k * 0.2)

# slow-mo: muffle + dip the music while time is slowed
cut = np.interp(np.arange(L) / SR, np.arange(len(ts_curve)) / FPS, ts_curve)
for ch in range(2):
    y = np.zeros(L); zi = np.zeros(1); blk = 1024
    for k in range(0, L, blk):
        c = cut[k]; fc = 600 + (16000 - 600) * max(0, (c - 0.3) / 0.7) ** 2
        a = np.exp(-2 * np.pi * fc / SR)
        y[k:k + blk], zi = lfilter([1 - a], [1, -a], music[k:k + blk, ch], zi=zi)
    music[:, ch] = y * (0.55 + 0.45 * cut)

# ---------------- SFX ----------------
# falling wind: amplitude + pitch follow the ball's speed
wind = bp(noise(DUR), 250, 1800)
sp = np.interp(np.arange(L) / SR, np.arange(len(kmh)) / FPS, kmh) / 70.0
sp *= np.interp(np.arange(L) / SR, np.arange(len(ts_curve)) / FPS, ts_curve) ** 0.5
wind = wind * np.clip(sp, 0, 1.3) ** 1.6 * 0.5
wind[int(splash_t * SR):] *= np.exp(-np.arange(L - int(splash_t * SR)) / SR * 6)
sfx[:, 0] += wind; sfx[:, 1] += np.roll(wind, 120)

BREAK_SFX = {
    'glass': lambda s: M(glass_shatter(1.2, 90), sub_boom(0.6, 80, 40) * 0.6),
    'ice': lambda s: M(ice_crack(), sub_boom(0.7, 75, 38) * 0.7),
    'wood': lambda s: M(wood_splinter(), sub_boom(0.7, 70, 36) * 0.8),
    'brick': lambda s: M(rubble(1.0, 120, 1800), thud(80, 0.35) * 1.2, sub_boom(0.9, 70, 34) * 0.9),
    'concrete': lambda s: M(rubble(1.2, 90, 1400) * 1.2, sub_boom(1.2, 65, 30) * 1.2, thud(60, 0.4)),
    'steel': lambda s: M(clang(1.8, 540) * 1.1, sub_boom(1.0, 70, 32)),
    'granite': lambda s: M(rubble(1.3, 70, 1200) * 1.3, sub_boom(1.4, 60, 28) * 1.3, thud(55, 0.45)),
    'titanium': lambda s: M(clang(2.2, 420) * 1.2, glass_shatter(0.5, 20, 2500, 5000) * 0.4, sub_boom(1.3, 65, 30) * 1.2),
    'diamond': lambda s: M(glass_shatter(1.6, 140, 2500, 9000) * 1.2, clang(1.5, 900) * 0.5, sub_boom(1.6, 60, 26) * 1.4),
}
for e in ev:
    tt = vt(e['f']); pf = 1 / max(0.45, ts_at(e['f'])) ** 0.5
    if e['type'] == 'break':
        F = FL[e['floor']]; x = BREAK_SFX[F['kind']](e.get('speed', 8))
        put(sfx, pitch(x, 1 / pf), tt, (1.0 if e['floor'] == 0 else 0.75 + e['floor'] * 0.03))
        if e['floor'] >= 5: put(sfx, braam(1.2, 41.2 * 2 ** (e['floor'] / 12)), tt + 0.05, 0.3)
    elif e['type'] == 'trigger' and FL[e['floor']].get('hold'):
        F = FL[e['floor']]
        put(sfx, pitch(M(clang(2.0, 380 if F['kind'] == 'titanium' else 1100) * 1.3, sub_boom(1.4, 80, 32) * 1.3), 1 / pf), tt, 0.95)
        put(sfx, riser(0.6), tt - 0.6, 0.3)
        if F['kind'] == 'diamond': put(sfx, braam(2.0, 36.7), tt + 0.1, 0.5)
    elif e['type'] == 'rest':
        hold_end = breaks.get(e['floor'], tt + 2)
        k = tt + 0.25
        while k < hold_end - 0.05:
            put(sfx, crack_tick(), k, 0.5 * rng.uniform(0.4, 1), rng.uniform(-0.6, 0.6)); k += rng.uniform(0.09, 0.3)
        put(sfx, riser(max(0.5, hold_end - tt - 0.2)), tt + 0.2, 0.35)
    elif e['type'] == 'hit' and e['s'] > 3:
        kind = e['kind']; s = min(e['s'], 40)
        if kind in ('glass',): x = glass_shatter(0.25, 8, 2500, 7000) * 0.5
        elif kind in ('steel', 'titanium'): x = modal([700, 1700, 2900], 0.3, 20) * 0.4
        elif kind == 'diamond': x = modal([1800, 3400, 5200], 0.3, 18) * 0.35
        else: x = M(thud(90, 0.2), rubble(0.25, 200, 2000) * 0.5)
        put(sfx, pitch(x, 1 / pf), tt, min(0.5, 0.05 + s * 0.012), float(np.clip(e.get('x', 0) / 3, -0.7, 0.7)))
    elif e['type'] == 'splash':
        put(sfx, riser(0.7), tt - 0.7, 0.4)
        put(sfx, M(sub_boom(2.2, 90, 24) * 1.6, rubble(2.0, 60, 900) * 1.2, lp(noise(2.5), 1500) * env_exp(2.5, 1.5) * 0.7), tt, 1.0)
        put(sfx, braam(2.2, 32.7), tt + 0.1, 0.6)

# hook: whoosh + slam + "vs" stamp
put(sfx, braam(1.1, 55), 0.05, 0.5)

mix = music * 0.5 + sfx * 0.9
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fade = int(0.3 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= max(1e-9, np.abs(mix).max()) / 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print('audio', sys.argv[2], f'{DUR:.2f}s')
