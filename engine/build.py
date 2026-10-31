#!/usr/bin/env python3
"""Ancient Tech Shorts builder.
  python3 build.py episodes/01-polyspastos.json            # full build -> output/<id>.mp4 + cover + metadata
  python3 build.py episodes/01-polyspastos.json --preview 0.5,3,10   # only preview frames (fast QA)
  python3 build.py episodes/01-polyspastos.json --audio-only
"""
import json, os, re, sys, hashlib, subprocess, shutil
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import sfx

PRE_ROLL = 0.45          # VO starts after the opening impact
DEFAULT_GAP = 0.30       # silence between beats
CTA_HOLD = 6.2           # end card duration
FPS = 30

def load_vo(beat_text, voice, speed, lang, cache_dir):
    import tts
    key = hashlib.md5(f"{beat_text}|{voice}|{speed}|{lang}".encode()).hexdigest()[:12]
    wav = os.path.join(cache_dir, f"vo_{key}.wav")
    if not os.path.exists(wav):
        audio, sr = tts.synth(beat_text, voice=voice, speed=speed, lang=lang)
        audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.9
        sf.write(wav, audio, sr)
    audio, sr = sf.read(wav, dtype="float32")
    return audio, sr, tts.word_timings(beat_text, audio, sr, lang)

def mark_keys(words, keys):
    norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    toks = [norm(w["w"]) for w in words]
    for k in keys or []:
        kt = [norm(x) for x in k.split()]
        for i in range(len(toks) - len(kt) + 1):
            if toks[i:i + len(kt)] == kt:
                for j in range(i, i + len(kt)): words[j]["key"] = True

def chunk_words(words, max_words=3):
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        end_p = re.search(r"[,.;:!?…]$", w["w"]) or w["w"].endswith("...")
        if end_p or len(cur) >= max_words or (len(cur) >= 2 and len(w["w"]) > 9):
            chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    # no lonely single-word chunks: merge into previous (if short) or next
    merged = []
    for c in chunks:
        if len(c) == 1 and merged and len(merged[-1]) <= max_words: merged[-1].extend(c)
        else: merged.append(c)
    chunks, merged = merged, []
    for c in chunks:
        if merged and len(merged[-1]) == 1 and len(c) <= max_words: merged[-1].extend(c)
        else: merged.append(c)
    chunks = merged
    return [{"s": words[c[0]]["s"], "e": words[c[-1]]["e"], "wi": c} for c in chunks]

def build_timeline(ep, work):
    voice, speed, lang = ep.get("voice", "bm_george"), ep.get("speed", 1.0), ep.get("lang", "en-gb")
    beats, cues, events, prompts, vo_clips = [], [], [], [], []
    cursor = PRE_ROLL
    cues.append({"name": "start", "t": 0.0}); events.append({"t": 0.02, "kind": "impact"})
    cta_t = None
    for i, b in enumerate(ep["beats"]):
        tb = {"start": round(cursor, 3)}
        if b.get("cue"): cues.append({"name": b["cue"], "t": round(cursor, 3)})
        if b.get("hud"): tb["hud"] = b["hud"]
        if b.get("vo"):
            audio, sr, words = load_vo(b["vo"], voice, b.get("speed", speed), lang, work)
            dur = len(audio) / sr
            for w in words: w["s"] = round(w["s"] + cursor, 3); w["e"] = round(w["e"] + cursor, 3)
            mark_keys(words, b.get("keys"))
            tb["text"] = b["vo"]; tb["words"] = words; tb["chunks"] = chunk_words(words, b.get("max_words", 3))
            vo_clips.append((cursor, audio, sr))
        else:
            dur = b.get("dur", 1.5)
        if b.get("number") is not None:
            tb.update({"style": "number", "text": b["number"], "sub": b.get("sub"), "size": b.get("size")})
            for k in ("count_from", "count_to", "unit"):
                if k in b: tb[k] = b[k]
        if b.get("size") and "size" not in tb: tb["size"] = b["size"]
        if b.get("y"): tb["y"] = b["y"]
        tb["end"] = round(cursor + dur, 3)
        for s in b.get("sfx", []):
            kind, _, off = s.partition("@"); events.append({"t": round(cursor + float(off or 0), 3), "kind": kind})
        if b.get("prompt"):
            p = b["prompt"]; prompts.append({"text": p["text"], "t": round(cursor + p.get("offset", 0.1), 3), "dur": p.get("dur", 2.4)})
        if b.get("cta_here"): cta_t = cursor
        if "chunks" in tb:
            for c in tb["chunks"]: events.append({"t": c["s"], "kind": "tick"})
        beats.append(tb)
        cursor = tb["end"] + b.get("gap", DEFAULT_GAP)
    if cta_t is None: cta_t = cursor
    duration = max(cursor, cta_t + CTA_HOLD) + 0.4
    cta = dict(ep.get("cta", {})); cta["t"] = round(cta_t, 3)
    events.append({"t": cta["t"], "kind": "chime"})
    hook = dict(ep.get("hook", {})); hook.setdefault("start", 0.0); hook.setdefault("end", 2.4)
    tl = {"id": ep["id"], "scene": ep["scene"], "fps": FPS, "duration": round(duration, 3), "hook": hook, "beats": beats,
          "cues": cues + [{"name": "cta", "t": cta["t"]}], "events": events, "prompts": prompts, "cta": cta, "params": ep.get("params", {})}
    return tl, vo_clips

def render_audio(tl, vo_clips, out_wav):
    SR = sfx.SR; dur = tl["duration"]; n = int(SR * dur)
    vo = np.zeros(n, np.float32); bed = np.zeros(n, np.float32); fx = np.zeros(n, np.float32)
    for t0, a, sr in vo_clips:
        if sr != SR: a = np.interp(np.arange(int(len(a) * SR / sr)) / SR, np.arange(len(a)) / sr, a).astype(np.float32)
        sfx.place(vo, a, t0)
    # --- music bed: drone + evolving pad + heartbeat pulse + clock ticks
    bed += sfx.drone(dur) * 0.9
    prog = [[110, 130.81, 164.81, 220], [87.31, 110, 130.81, 174.61], [98, 116.54, 146.83, 196], [82.41, 110, 123.47, 164.81]]
    seg = 7.0; k = 0; t = 0.0
    while t < dur:
        d = min(seg + 1.5, dur - t); c = sfx.pad_chord(d, prog[k % len(prog)], 0.07); c = sfx.fade(c, 1.2, 1.4); sfx.place(bed, c, t); t += seg; k += 1
    cta_t = tl["cta"]["t"]; climax = next((c["t"] for c in tl["cues"] if c["name"] in ("lift", "climax", "reveal")), cta_t * 0.72)
    bpm = tl["params"].get("bpm", 88); beat_len = 60 / bpm; hb = sfx.heartbeat(); t = 1.0
    while t < cta_t - 0.5:
        inten = 0.25 + 0.75 * min(1, t / max(1, climax))
        sfx.place(bed, hb, t, 0.55 * inten); sfx.place(bed, hb, t + beat_len * 0.28, 0.33 * inten); t += beat_len
    tk = sfx.tick(0.05, 2400); t = 3.0
    while t < cta_t - 0.3:
        sfx.place(bed, tk, t, 0.10); t += 0.5
    # --- events
    lib = {"impact": lambda: sfx.impact(), "hit": lambda: sfx.hit(), "whoosh": lambda: sfx.whoosh(), "riser": lambda: sfx.riser(), "chime": lambda: sfx.chime(),
           "tick": lambda: sfx.tick(), "blip": lambda: sfx.blip(), "creak": lambda: sfx.creak(), "grind": lambda: sfx.grind(), "boom": lambda: sfx.impact(2.0, 1.4)}
    gains = {"impact": 0.9, "hit": 0.55, "whoosh": 0.5, "riser": 0.6, "chime": 0.6, "tick": 0.16, "blip": 0.25, "creak": 0.5, "grind": 0.5, "boom": 1.0}
    for ev in tl["events"]:
        k = ev["kind"]
        if k in lib:
            t0 = ev["t"] - (1.4 if k == "riser" else 0)
            sfx.place(fx, lib[k](), t0, gains.get(k, 0.5))
    # --- ducking bed under VO
    def smooth(x, w):
        c = np.cumsum(np.concatenate([[0], x])); y = (c[w:] - c[:-w]) / w
        return np.concatenate([y, np.full(w - 1, y[-1])])[:len(x)]
    env = smooth(np.abs(vo), int(SR * 0.08)); env = env / (env.max() + 1e-6); duck = 1 - 0.55 * np.minimum(1, env * 4)
    duck = smooth(duck, int(SR * 0.25))
    mix = vo * 1.0 + bed * 0.22 * duck + fx * 0.85
    # fade out tail
    tail = int(SR * 0.6); mix[-tail:] *= np.linspace(1, 0, tail)
    mix = np.tanh(mix * 1.1) / 1.1
    sf.write(out_wav, np.stack([mix, mix], 1), SR)

def run(cmd, **kw):
    print("$", " ".join(cmd)); subprocess.run(cmd, check=True, **kw)

def main():
    ep_path = sys.argv[1]; ep = json.load(open(ep_path)); eid = ep["id"]
    work = os.path.join(ROOT, "work", eid); os.makedirs(work, exist_ok=True); outdir = os.path.join(ROOT, "output"); os.makedirs(outdir, exist_ok=True)
    tl, vo_clips = build_timeline(ep, work)
    tl_path = os.path.join(work, "timeline.json"); json.dump(tl, open(tl_path, "w"), indent=1)
    print(f"[{eid}] duration {tl['duration']}s, {len(tl['beats'])} beats, cta at {tl['cta']['t']}s")
    env = dict(os.environ, NODE_PATH=os.environ.get("NODE_PATH", "/opt/node22/lib/node_modules"))
    if "--preview" in sys.argv:
        ts = sys.argv[sys.argv.index("--preview") + 1]
        run(["node", os.path.join(HERE, "render.js"), "--timeline", tl_path, "--preview", ts, "--previewDir", os.path.join(work, "preview")], env=env); return
    mix = os.path.join(work, "mix.wav"); render_audio(tl, vo_clips, mix)
    if "--audio-only" in sys.argv: return
    video = os.path.join(work, "video.mp4")
    if "--skip-render" not in sys.argv or not os.path.exists(video):
        run(["node", os.path.join(HERE, "render.js"), "--timeline", tl_path, "--out", video, "--fps", str(FPS)], env=env)
    final = os.path.join(outdir, f"{eid}.mp4")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-shortest", final])
    cover_t = ep.get("cover_t", 1.2)
    run(["node", os.path.join(HERE, "render.js"), "--timeline", tl_path, "--preview", str(cover_t), "--previewDir", work], env=env)
    shutil.copy(os.path.join(work, f"preview_{cover_t:.2f}.jpg"), os.path.join(outdir, f"{eid}.cover.jpg"))
    md = ep.get("metadata", {})
    with open(os.path.join(outdir, f"{eid}.md"), "w") as f:
        f.write(f"# {md.get('title', eid)}\n\n**Durata:** {tl['duration']:.1f}s\n\n## Descriere YouTube\n\n{md.get('description','')}\n\n")
        f.write("## Hashtags\n\n" + " ".join(md.get("hashtags", [])) + "\n\n## Comentariu fixat (pinned)\n\n" + md.get("pinned_comment", "") + "\n\n")
        f.write("## Script (VO)\n\n" + "\n".join(f"- [{b['start']:.1f}s] {b.get('text','(number card: '+str(b.get('text'))+')')}" for b in tl["beats"]) + "\n")
    print("DONE ->", final)

if __name__ == "__main__":
    main()
