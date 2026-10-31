#!/usr/bin/env python3
"""Mix voice + music + sfx (voice-ducked music, YouTube loudness) and mux with the rendered video.

Usage: python3 pipeline/compose/mux.py out/<id>/ [--audio-only]
Outputs: out/<id>/mix.m4a (always) and out/<id>/final.mp4 (if video_only.mp4 exists and not --audio-only)
"""
import os, subprocess, sys, json

def run(cmd): print('+', ' '.join(cmd[:12]), '...'); subprocess.run(cmd, check=True)

def main(out_dir, audio_only=False):
    voice, music, sfx = (os.path.join(out_dir, f) for f in ('voice.wav', 'music.wav', 'sfx.wav'))
    mix = os.path.join(out_dir, 'mix.m4a'); video = os.path.join(out_dir, 'video_only.mp4'); final = os.path.join(out_dir, 'final.mp4')
    fc = (
        # voice: gentle compression + de-ess-ish high shelf tame, normalised to -16 LUFS, duplicated to stereo
        "[0:a]highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=4,"
        "loudnorm=I=-16:TP=-2:LRA=9,aformat=channel_layouts=stereo,asplit=2[v][vsc];"
        # music ducked by the voice (sidechain), then level
        "[1:a][vsc]sidechaincompress=threshold=0.035:ratio=7:attack=35:release=550:makeup=1[md];"
        "[md]volume=0.55[m];[2:a]volume=0.95[s];"
        "[v][m][s]amix=inputs=3:weights=1 1 1:normalize=0:duration=longest,"
        "alimiter=limit=0.95:attack=4:release=60,loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', voice, '-i', music, '-i', sfx,
         '-filter_complex', fc, '-map', '[out]', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', mix])
    if not audio_only and os.path.exists(video):
        run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-i', mix, '-map', '0:v:0', '-map', '1:a:0',
             '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final])
        print('[mux] wrote', final)
    # loudness report
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', mix, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = [l for l in out.splitlines() if 'I:' in l or 'Peak:' in l or 'LRA:' in l][-3:]
    print('[mux] loudness:', ' | '.join(s.strip() for s in tail))

if __name__ == '__main__':
    main(sys.argv[1], '--audio-only' in sys.argv)
