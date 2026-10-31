"""Generate the voice-over and a word-level timeline for a short.

usage: python3 make_vo.py <short_dir>
Reads <short_dir>/script.json, writes <short_dir>/_work/vo.wav and <short_dir>/timeline.json.
"""
import json, os, re, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000


def trim(a, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx):
        return a
    return a[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.06 * SR)]


def word_weights(text):
    # Rough spoken length per word: syllable-ish vowel groups plus a pause bonus after punctuation.
    words = text.split()
    w = []
    for word in words:
        core = re.sub(r"[^A-Za-z0-9']", "", word)
        syl = max(1, len(re.findall(r"[aeiouy]+", core.lower())))
        pause = 1.2 if re.search(r"[.,?!]$", word) else 0
        w.append(syl + 0.35 * len(core) / 4 + pause)
    return words, np.array(w, float)


def main(short_dir):
    spec = json.load(open(os.path.join(short_dir, "script.json")))
    k = Kokoro(os.path.join(HERE, "kokoro-v1.0.onnx"), os.path.join(HERE, "voices-v1.0.bin"))
    out, lines, t = [np.zeros(int(spec["lead"] * SR), np.float32)], [], spec["lead"]
    for ln in spec["lines"]:
        audio, sr = k.create(ln["text"], voice=spec["voice"], speed=spec["speed"], lang="en-us")
        audio = trim(np.asarray(audio, np.float32))
        dur = len(audio) / SR
        words, w = word_weights(ln["text"])
        edges = np.concatenate([[0], np.cumsum(w) / w.sum()]) * dur
        lines.append({
            "id": ln["id"], "text": ln["text"], "start": round(t, 3), "end": round(t + dur, 3),
            "words": [{"w": wd, "start": round(t + edges[i], 3), "end": round(t + edges[i + 1], 3)} for i, wd in enumerate(words)],
        })
        out += [audio, np.zeros(int(ln.get("gap", 0.2) * SR), np.float32)]
        t += dur + ln.get("gap", 0.2)
    out.append(np.zeros(int(spec["tail"] * SR), np.float32))
    vo = np.concatenate(out)
    os.makedirs(os.path.join(short_dir, "_work"), exist_ok=True)
    sf.write(os.path.join(short_dir, "_work", "vo.wav"), vo, SR)
    timeline = {"title": spec["title"], "duration": round(len(vo) / SR, 3), "lines": lines}
    json.dump(timeline, open(os.path.join(short_dir, "timeline.json"), "w"), indent=1)
    for l in lines:
        print(f'{l["start"]:6.2f}-{l["end"]:6.2f}  {l["id"]:8s} {l["text"]}')
    print("duration", timeline["duration"])


if __name__ == "__main__":
    main(sys.argv[1])
