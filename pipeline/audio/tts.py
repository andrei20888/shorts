#!/usr/bin/env python3
"""Synthesize every voice line of a script with Kokoro (offline, ONNX) and build timeline.json.

Usage: python3 pipeline/audio/tts.py content/scripts/<id>.json out/<id>/
Outputs: out/<id>/voice.wav (48 kHz mono, lines placed at their start times),
         out/<id>/timeline.json (beats/lines/words with absolute times, countdown info).
"""
import json, math, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "..", "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "..", "models", "voices-v1.0.bin")
SR = 48000
LEAD_IN = 0.0          # first line starts at t=0 (hook must hit immediately)
OUTRO_PAD = 0.6        # silence after last line (end card / loop)

def syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    if w.isdigit():
        return max(1, len(w))
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and not w.endswith(("le", "ee")) and n > 1:
        n -= 1
    return max(1, n)

def trim_silence(x: np.ndarray, sr: int, thresh_db=-45.0, keep=0.04):
    env = np.abs(x)
    th = 10 ** (thresh_db / 20)
    idx = np.where(env > th)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(keep * sr)); b = min(len(x), idx[-1] + int(keep * sr))
    return x[a:b]

def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    if sr_in == sr_out:
        return x
    n_out = int(round(len(x) * sr_out / sr_in))
    t_in = np.arange(len(x)) / sr_in
    t_out = np.arange(n_out) / sr_out
    return np.interp(t_out, t_in, x).astype(np.float32)

def main(script_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    script = json.load(open(script_path))
    voice = script.get("voice", {})
    vname, speed, lang = voice.get("name", "am_michael"), float(voice.get("speed", 1.0)), voice.get("lang", "en-us")
    k = Kokoro(MODEL, VOICES)
    cd = script.get("countdown") or {}
    N = int(cd.get("placeholder_seconds", 40))

    def synth(text):
        s, sr = k.create(text, voice=vname, speed=speed, lang=lang)
        s = trim_silence(np.asarray(s, dtype=np.float32), sr)
        return resample(s, sr, SR)

    audio_cache = {}
    def layout(N):
        """Compute per-line timings for a given countdown number N. Returns (lines, beats, total)."""
        t = LEAD_IN
        lines, beats = [], []
        for b in script["beats"]:
            bstart = t
            blines = []
            for ln in b["lines"]:
                text = ln["text"].replace("{N}", num_words(N))
                if text not in audio_cache:
                    audio_cache[text] = synth(text)
                a = audio_cache[text]
                dur = len(a) / SR
                words = ln["text"].replace("{N}", str(N)).split()
                syl = np.array([syllables(w) for w in words], dtype=float)
                # 60% of word duration weight by syllables, 40% flat → stable timing
                wt = 0.6 * syl / syl.sum() + 0.4 / len(words)
                starts = t + np.concatenate([[0], np.cumsum(wt)[:-1]]) * dur
                ends = t + np.cumsum(wt) * dur
                blines.append({
                    "id": ln["id"], "text": text,
                    "caption": ln["caption"].replace("{N}", str(N)),
                    "t0": round(t, 3), "t1": round(t + dur, 3),
                    "pause_after": ln.get("pause_after", 0.3),
                    "words": [{"w": w, "t0": round(float(s), 3), "t1": round(float(e), 3)} for w, s, e in zip(words, starts, ends)],
                    "_audio": text,
                })
                t += dur + ln.get("pause_after", 0.3)
            beats.append({"id": b["id"], "scene": b["scene"], "t0": round(bstart, 3), "lines": blines})
            lines.extend(blines)
        total = t + OUTRO_PAD
        for i, b in enumerate(beats):
            b["t1"] = beats[i + 1]["t0"] if i + 1 < len(beats) else round(total, 3)
        return lines, beats, total

    lines, beats, total = layout(N)
    # second pass: make the spoken countdown number match the real time to the payoff
    if cd:
        t_from = next(l["t0"] for l in lines if l["id"] == cd["from_line"])
        t_to = next(b["t1"] for b in beats if b["id"] == cd["to_beat_end"])
        real = t_to - t_from
        N2 = int(5 * round(real / 5))
        if N2 != N:
            print(f"[tts] countdown placeholder {N}s → real {real:.1f}s → using {N2}s")
            N = N2
            lines, beats, total = layout(N)
        t_from = next(l["t0"] for l in lines if l["id"] == cd["from_line"])
        t_to = next(b["t1"] for b in beats if b["id"] == cd["to_beat_end"])
    else:
        t_from = t_to = None

    # assemble voice track
    mix = np.zeros(int(math.ceil(total * SR)) + SR, dtype=np.float32)
    for l in lines:
        a = audio_cache[l.pop("_audio")]
        i0 = int(round(l["t0"] * SR))
        mix[i0:i0 + len(a)] += a
    mix = mix[: int(math.ceil(total * SR))]
    peak = float(np.abs(mix).max() or 1.0)
    mix = mix / peak * 0.891  # -1 dBFS peak; loudness is normalized at mux time
    sf.write(os.path.join(out_dir, "voice.wav"), mix, SR, subtype="PCM_16")

    timeline = {
        "id": script["id"], "fps": script.get("fps", 30), "size": script.get("size", [1080, 1920]),
        "duration": round(total, 3), "voice": voice, "facts": script.get("facts", {}),
        "countdown": {"t_from": t_from, "t_to": t_to, "seconds_spoken": N} if cd else None,
        "beats": beats,
    }
    json.dump(timeline, open(os.path.join(out_dir, "timeline.json"), "w"), indent=1)
    print(f"[tts] {len(lines)} lines, duration {total:.2f}s, voice={vname}, countdown={timeline['countdown']}")
    for b in beats:
        print(f"  beat {b['id']:<11} {b['t0']:6.2f} → {b['t1']:6.2f}  ({b['scene']})")

def num_words(n: int) -> str:
    ones = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"]
    tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]
    if n < 20: return ones[n]
    if n < 100: return tens[n // 10] + ("" if n % 10 == 0 else "-" + ones[n % 10])
    return str(n)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
