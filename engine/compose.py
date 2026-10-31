"""
compose.py — turn an episode JSON into a finished 1080x1920 Short.

Pipeline: voice-over (Kokoro) -> timeline layout -> curves (year / night /
camera) -> frames (satellite world + camera + FX + HUD + captions, rendered
in parallel) -> procedural score + SFX mix -> ffmpeg mux (H.264, AAC, -14 LUFS).
"""
from __future__ import annotations

import json
import math
import multiprocessing as mp
import os
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from . import audio as A
from . import overlay as O
from .satview import CitySeed, Scene, SceneSpec, add_grain, camera, to_u8

ROOT = Path(__file__).resolve().parent.parent
W, H = 1080, 1920

# globals shared with forked workers
_SCENE: Scene | None = None
_PLAN: list[dict] = []
_EP: dict = {}


# --------------------------------------------------------------------------
# timeline
# --------------------------------------------------------------------------

def build_scene_spec(d: dict) -> SceneSpec:
    d = dict(d)
    cities = [CitySeed(*c) if isinstance(c, list) else CitySeed(**c) for c in d.pop("cities", [])]
    if "river" in d and d["river"]:
        d["river"] = [tuple(p) for p in d["river"]]
    return SceneSpec(cities=cities, **d)


def layout(ep: dict, vo_dur: dict[int, float]) -> list[dict]:
    """Assign start/end to every beat using the measured voice-over lengths."""
    beats = []
    t = ep.get("lead_in", 0.0)
    for i, b in enumerate(ep["beats"]):
        b = dict(b)
        t += b.get("gap", 0.0)
        d = vo_dur.get(i, 0.0)
        length = max(b.get("min", 1.4), d + b.get("pad", 0.45))
        b["start"], b["end"], b["vo_dur"] = t, t + length, d
        beats.append(b)
        t = b["end"]
    return beats


def curve(points: list[tuple[float, float]], s: float, ease: float = 0.6) -> float:
    """Piecewise interpolation with partial ease-in-out per segment."""
    if s <= points[0][0]:
        return points[0][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t0 <= s <= t1:
            if t1 == t0:
                return v1
            u = (s - t0) / (t1 - t0)
            u = (1 - ease) * u + ease * (u * u * (3 - 2 * u))
            return v0 + (v1 - v0) * u
    return points[-1][1]


def plan_frames(ep: dict, beats: list[dict], duration: float, fps: int) -> list[dict]:
    y0, y1 = ep["years"]
    # year keyframes: at each beat end the counter reaches beat["year"]
    yk = [(0.0, float(y0))]
    nk = [(0.0, float(ep.get("night_start", 0.0)))]
    ck = [(0.0, dict(ep.get("cam_start", {"scale": 1.0, "cx": 0.5, "cy": 0.5})))]
    cur_year, cur_night = float(y0), float(ep.get("night_start", 0.0))
    for b in beats:
        if "year" in b:
            # hold the previous value until the beat begins (unless 'ramp' asks for continuous motion)
            if not b.get("ramp", True):
                yk.append((b["start"], cur_year))
            yk.append((b["end"], float(b["year"])))
            cur_year = float(b["year"])
        if "night" in b:
            nk.append((b["start"], cur_night))
            nk.append((b["end"] if b.get("night_fast") is None else b["start"] + b["night_fast"], float(b["night"])))
            cur_night = float(b["night"])
        if "cam" in b:
            ck.append((b["end"], dict(b["cam"])))
    rewind = ep.get("rewind", 0.8)
    rewind_start = duration - rewind
    # effects list
    fx = []
    for b in beats:
        for e in b.get("fx", []):
            fx.append((b["start"], e))
    climax = next((b["start"] for b in beats if b.get("climax")), duration * 0.7)
    cta = next((b["start"] for b in beats if b.get("style") == "cta"), duration * 0.86)

    plan = []
    n = int(round(duration * fps))
    last_year_int = int(y0)
    year_ticks = []
    for i in range(n):
        s = i / fps
        year = curve(yk, s, ease=0.35)
        night = curve(nk, s, ease=0.8)
        # camera: interpolate between keyframes
        cam = {"scale": curve([(t, c["scale"]) for t, c in ck], s, 0.9),
               "cx": curve([(t, c["cx"]) for t, c in ck], s, 0.9),
               "cy": curve([(t, c["cy"]) for t, c in ck], s, 0.9)}
        # slow global drift + breathing
        cam["scale"] *= 1.0 + 0.045 * (s / duration)
        cam["cx"] += 0.0025 * math.sin(s * 0.7)
        cam["cy"] += 0.002 * math.cos(s * 0.5)
        punch, flash, shake, scan, glitch = 0.0, 0.0, 0.0, -1.0, 0.0
        for (t0, e) in fx:
            dt = s - t0
            if dt < 0:
                continue
            if e == "punch" and dt < 0.35:
                punch = max(punch, 0.07 * (1 - O.ease_out(dt / 0.35)))
            if e == "flash" and dt < 0.3:
                flash = max(flash, 0.75 * (1 - dt / 0.3))
            if e == "shake" and dt < 0.45:
                shake = max(shake, 10 * (1 - dt / 0.45))
            if e == "scan" and dt < 0.55:
                scan = dt / 0.55
            if e == "glitch" and dt < 0.25:
                glitch = max(glitch, 1.0 - dt / 0.25)
        rew = 0.0
        if s >= rewind_start:
            rew = (s - rewind_start) / rewind
            k = O.ease_in_out(rew)
            year = year + (float(y0) - year) * k
            night = night * (1 - k)
            glitch = max(glitch, 0.6 * math.sin(rew * math.pi))
            cam["scale"] = cam["scale"] + (1.0 - cam["scale"]) * k
            cam["cx"] = cam["cx"] + (0.5 - cam["cx"]) * k
        yi = int(round(year))
        if yi != last_year_int:
            year_ticks.append(s)
            last_year_int = yi
        # captions visible at s
        caps = []
        for b in beats:
            if b["start"] <= s < b["end"] and b.get("caption", b.get("vo")):
                vd = max(b["vo_dur"], 0.6)
                prog = min((s - b["start"]) / vd, 1.0)
                caps.append({"text": b.get("caption", b.get("vo")), "style": b.get("style", "beat"),
                             "progress": prog, "age": s - b["start"], "remaining": b["end"] - s})
        plan.append({"i": i, "s": s, "year": year, "night": night, "cam": cam, "punch": punch, "flash": flash,
                     "shake": shake, "scan": scan, "glitch": glitch, "caps": caps, "rew": rew,
                     "outro": s >= cta, "hud": s >= ep.get("hud_from", 0.0)})
    return plan, year_ticks, climax, cta


# --------------------------------------------------------------------------
# frame rendering (runs in forked workers)
# --------------------------------------------------------------------------

_cache: dict = {}


def _world(t: float, night: float) -> np.ndarray:
    key = (round(t, 4), round(night, 3))
    if key in _cache:
        return _cache[key]
    img = _SCENE.render(t, night)
    if len(_cache) > 3:
        _cache.clear()
    _cache[key] = img
    return img


def render_frame(i: int) -> bytes:
    p = _PLAN[i]
    ep = _EP
    y0, y1 = ep["years"]
    t = (p["year"] - y0) / max(y1 - y0, 1e-6)
    world = _world(t, p["night"])
    cam = p["cam"]
    rng = np.random.default_rng(1000 + i)
    cx, cy = cam["cx"], cam["cy"]
    if p["shake"] > 0:
        cx += rng.normal(0, p["shake"]) / world.shape[1]
        cy += rng.normal(0, p["shake"]) / world.shape[0]
    frame = camera(world, W, H, cx, cy, cam["scale"] * (1 + p["punch"]))
    fr = to_u8(frame)
    if p["glitch"] > 0.02:
        g = p["glitch"]
        shift = int(6 + 18 * g)
        fr = fr.copy()
        fr[..., 0] = np.roll(fr[..., 0], shift, axis=1)
        fr[..., 2] = np.roll(fr[..., 2], -shift, axis=1)
        # sliced row offsets
        for _ in range(int(3 + 6 * g)):
            y = int(rng.integers(0, H - 40))
            h = int(rng.integers(6, 40))
            fr[y:y + h] = np.roll(fr[y:y + h], int(rng.integers(-60, 60) * g), axis=1)
    if p["flash"] > 0:
        fr = np.clip(fr.astype(np.float32) * (1 - p["flash"]) + 255 * p["flash"], 0, 255).astype(np.uint8)
    fr = add_grain(fr, rng, 1.5)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if p["hud"]:
        O.draw_hud(layer, p["year"], int(y0), int(y1), ep.get("hud_label", "TIME LAPSE EARTH  ·  SAT-VIEW"),
                   ep.get("coords", ""), p["s"], alpha=1.0 - 0.9 * p["rew"])
    if p["scan"] >= 0:
        O.draw_scanline(layer, p["scan"])
    for c in p["caps"]:
        O.draw_caption(layer, c["text"], c["style"], c["progress"], c["age"], c["remaining"])
    if p["outro"] and p["rew"] < 0.3:
        O.draw_outro(layer, p["s"] - _EP["_cta"], _EP.get("handle", "@TimeLapseEarth"))
    out = O.composite(fr, layer)
    return out.tobytes()


# --------------------------------------------------------------------------
# main entry
# --------------------------------------------------------------------------

def render_episode(path: str, out_dir: str = "output", fps: int = 30, workers: int | None = None,
                   preview_seconds: float | None = None, crf: int = 21):
    global _SCENE, _PLAN, _EP
    ep = json.loads(Path(path).read_text())
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    eid = ep["id"]
    t_start = time.time()

    # 1) voice-over ------------------------------------------------------
    voice = ep.get("voice", "am_michael")
    speed = ep.get("voice_speed", 1.0)
    vo_clips, vo_dur = {}, {}
    for i, b in enumerate(ep["beats"]):
        if b.get("vo"):
            x = A.tts(b["vo"], voice=voice, speed=b.get("speed", speed))
            vo_clips[i] = x
            vo_dur[i] = len(x) / A.SR
    print(f"[{eid}] voice-over: {len(vo_clips)} lines, {sum(vo_dur.values()):.1f}s", flush=True)

    # 2) timeline --------------------------------------------------------
    beats = layout(ep, vo_dur)
    duration = beats[-1]["end"] + ep.get("tail", 1.2)
    if preview_seconds:
        duration = min(duration, preview_seconds)
    plan, ticks, climax, cta = plan_frames(ep, beats, duration, fps)
    ep["_cta"] = cta
    print(f"[{eid}] duration {duration:.1f}s, {len(plan)} frames, climax {climax:.1f}s, cta {cta:.1f}s", flush=True)
    for b in beats:
        print(f"   {b['start']:5.2f}-{b['end']:5.2f}  {b.get('style','beat'):8s} {b.get('caption', b.get('vo',''))[:60]}", flush=True)

    # 3) audio -----------------------------------------------------------
    music = A.score(duration, bpm=ep.get("bpm", 96), climax=climax, cta=cta, year_ticks=ticks, seed=ep.get("seed", 7))
    sfx = []
    for b in beats:
        if "punch" in b.get("fx", []):
            sfx.append((b["start"], A.sfx_whoosh(seed=int(b["start"] * 10)), A.db(-14)))
        if "scan" in b.get("fx", []):
            sfx.append((b["start"], A.sfx_shimmer(1.2, 1320), A.db(-20)))
    rewind = ep.get("rewind", 0.8)
    sfx.append((duration - rewind, A.sfx_rewind(rewind), A.db(-14)))
    wav = out_dir / f"{eid}.wav"
    A.mix(duration, [(beats[i]["start"] + 0.05, clip) for i, clip in vo_clips.items()], music, sfx, str(wav))

    # 4) frames -> ffmpeg ------------------------------------------------
    spec = build_scene_spec(ep["scene"])
    ww, wh = ep.get("world", [1296, 2304])
    _SCENE = Scene(spec, ww, wh)
    _PLAN, _EP = plan, ep
    mp4_tmp = out_dir / f"{eid}.video.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-level", "4.2", "-x264-params", "keyint=60:min-keyint=30", "-movflags", "+faststart", str(mp4_tmp)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    workers = workers or max(1, os.cpu_count() or 2)
    ctx = mp.get_context("fork")
    t0 = time.time()
    with ctx.Pool(workers) as pool:
        for k, frame in enumerate(pool.imap(render_frame, range(len(plan)), chunksize=6)):
            proc.stdin.write(frame)
            if k % 150 == 0:
                el = time.time() - t0
                print(f"[{eid}] frame {k}/{len(plan)}  {el:.0f}s elapsed, eta {el / max(k, 1) * (len(plan) - k):.0f}s", flush=True)
            if k == int(climax * fps) + 12:
                Image.frombytes("RGB", (W, H), frame).save(out_dir / f"{eid}.thumb.jpg", quality=92)
    proc.stdin.close()
    proc.wait()

    # 5) mux + loudness --------------------------------------------------
    final = out_dir / f"{eid}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4_tmp), "-i", str(wav),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-shortest", "-movflags", "+faststart", str(final)], check=True)
    mp4_tmp.unlink(missing_ok=True)
    wav.unlink(missing_ok=True)

    # 6) metadata --------------------------------------------------------
    meta = ep.get("meta", {})
    md = [f"# {meta.get('title', ep.get('title', eid))}", "",
          "## Title", meta.get("title", ep.get("title", eid)), "",
          "## Description", meta.get("description", ""), "",
          "## Hashtags", " ".join(meta.get("hashtags", [])), "",
          "## Pinned comment", meta.get("pinned_comment", ""), "",
          "## Script (voice-over, with timing)"]
    for b in beats:
        md.append(f"- `{b['start']:05.2f}` **{b.get('style','beat')}** — {b.get('vo','')}")
    (out_dir / f"{eid}.meta.md").write_text("\n".join(md) + "\n")
    print(f"[{eid}] done in {time.time() - t_start:.0f}s -> {final}", flush=True)
    return str(final)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--out", default="output")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--preview", type=float, default=None, help="render only the first N seconds")
    ap.add_argument("--crf", type=int, default=21)
    a = ap.parse_args()
    render_episode(a.episode, a.out, a.fps, a.workers, a.preview, a.crf)
