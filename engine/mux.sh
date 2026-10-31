#!/usr/bin/env bash
# Mux rendered video + mix, loudness-normalised for YouTube (-14 LUFS, -1 dBTP).
set -euo pipefail
dir="$1"
ffmpeg -y -loglevel error -i "$dir/_work/render/video.mp4" -i "$dir/_work/mix.wav" \
  -af "loudnorm=I=-14:TP=-1.0:LRA=9" -ar 48000 \
  -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$dir/final.mp4"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$dir/final.mp4"
