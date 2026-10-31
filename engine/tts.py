"""Voice-over with Kokoro (offline ONNX) + estimated word timings (espeak-ng phoneme weights, snapped to real pauses)."""
import re, subprocess, numpy as np

SR = 24000
_kokoro = None
def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        import os
        here = os.path.dirname(os.path.abspath(__file__))
        _kokoro = Kokoro(os.path.join(here, "models/kokoro-v1.0.onnx"), os.path.join(here, "models/voices-v1.0.bin"))
    return _kokoro

def synth(text, voice="bm_george", speed=1.0, lang="en-gb"):
    s, sr = kokoro().create(text, voice=voice, speed=speed, lang=lang)
    return np.asarray(s, dtype=np.float32), sr

def _phoneme_weights(words, lang):
    """Return per-word weights from espeak phoneme counts; fallback to letter heuristics."""
    try:
        out = subprocess.run(["espeak-ng", "-q", "-x", "-v", lang, " ".join(words)], capture_output=True, text=True, timeout=10).stdout
        toks = [t for t in out.replace("\n", " ").split() if t.strip()]
        toks = [t for t in toks if any(ch.isalnum() or ch in "@" for ch in t)]
        if len(toks) == len(words):
            return [max(1.0, sum(1 for ch in t if ch.isalnum() or ch == "@") - t.count("'") * 0) for t in toks]
    except Exception:
        pass
    ws = []
    for w in words:
        core = re.sub(r"[^A-Za-z0-9]", "", w)
        vowels = len(re.findall(r"[aeiouyAEIOUY]+", core)) or 1
        ws.append(vowels * 2.2 + len(core) * 0.35)
    return ws

def _speech_bounds(a, sr, thr_db=-42):
    win = int(sr * 0.02)
    n = len(a) // win
    rms = np.sqrt(np.mean(a[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    on = np.where(db > thr_db)[0]
    if len(on) == 0:
        return 0.0, len(a) / sr, []
    start, end = on[0] * win / sr, (on[-1] + 1) * win / sr
    # internal gaps >= 110 ms
    gaps, g0 = [], None
    for i in range(on[0], on[-1] + 1):
        if db[i] <= thr_db:
            g0 = i if g0 is None else g0
        else:
            if g0 is not None and (i - g0) * win / sr >= 0.11:
                gaps.append((g0 * win / sr, i * win / sr))
            g0 = None
    return start, end, gaps

def word_timings(text, audio, sr, lang="en-gb"):
    """Estimate [{w,s,e}] for each whitespace-separated word of text."""
    words = text.split()
    if not words:
        return []
    w8 = _phoneme_weights([re.sub(r"[^A-Za-z0-9'\-]", "", w) or w for w in words], lang)
    start, end, gaps = _speech_bounds(audio, sr)
    # punctuation boundaries after word i
    punct_idx = [i for i, w in enumerate(words[:-1]) if re.search(r"[,.;:!?…\-—]$", w) or w.endswith("...")]
    # assign gaps to punctuation boundaries in order (greedy)
    bounds = {}
    if gaps and punct_idx:
        gi = 0
        for pi in punct_idx:
            if gi < len(gaps):
                bounds[pi] = gaps[gi]; gi += 1
    segs, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if i in bounds or i == len(words) - 1:
            segs.append(cur); cur = []
    out = [None] * len(words)
    t0 = start
    for si, seg in enumerate(segs):
        last = seg[-1]
        t1 = bounds[last][0] if last in bounds else end
        tot = sum(w8[i] for i in seg)
        t = t0
        for i in seg:
            d = (t1 - t0) * w8[i] / tot
            out[i] = {"w": words[i], "s": round(t, 3), "e": round(t + d, 3)}
            t += d
        t0 = bounds[last][1] if last in bounds else t1
    return out
