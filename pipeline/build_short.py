#!/usr/bin/env python3
"""One-command build: script JSON → final Short.

  python3 pipeline/build_short.py content/scripts/001-earth-to-ton618.json [--skip tts,music,render,mux] [--preview "0,300,900"]

Steps: tts (Kokoro voice + timeline) → music (procedural score/SFX) → render (three.js frames → video_only.mp4) → mux (final.mp4).
"""
import argparse, json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sh(cmd): print('\n$', ' '.join(cmd)); subprocess.run(cmd, check=True, cwd=ROOT)

ap = argparse.ArgumentParser(); ap.add_argument('script'); ap.add_argument('--skip', default=''); ap.add_argument('--preview', default=None)
ap.add_argument('--crf', default='17'); ap.add_argument('--preset', default='slow')
a = ap.parse_args(); skip = set(filter(None, a.skip.split(',')))
sid = json.load(open(a.script))['id']; out = os.path.join('out', sid); os.makedirs(os.path.join(ROOT, out), exist_ok=True)
if 'tts' not in skip: sh(['python3', '-I', 'pipeline/audio/tts.py', a.script, out])
if 'music' not in skip: sh(['python3', '-I', 'pipeline/audio/music.py', out])
if a.preview: sh(['node', 'pipeline/render/render_frames.cjs', out, '--preview', a.preview]); sys.exit(0)
if 'render' not in skip: sh(['node', 'pipeline/render/render_frames.cjs', out, '--crf', a.crf, '--preset', a.preset])
if 'mux' not in skip: sh(['python3', 'pipeline/compose/mux.py', out])
print('\nDone →', os.path.join(out, 'final.mp4'))
