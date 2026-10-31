#!/usr/bin/env bash
# Full pipeline for a "Last Ball Standing" short: sim -> video -> audio -> final mp4.
#   tools/make_last_ball.sh 39 short01_last_ball_standing
set -euo pipefail
cd "$(dirname "$0")/.."
SEED=${1:-39}; NAME=${2:-last_ball_$SEED}
OUT=output/$NAME; mkdir -p "$OUT" build
node sim/last_ball.mjs --seed "$SEED"
[ -f "build/lb_${SEED}_video.mp4" ] || node tools/render.js --page scenes/last_ball.html --video "build/lb_${SEED}_video.mp4" --w 1080 --h 1920 --fps 60 --q "data=build/lb_$SEED"
python3 tools/audio_last_ball.py "build/lb_$SEED.json" "build/lb_${SEED}_audio.wav"
ffmpeg -y -loglevel error -i "build/lb_${SEED}_video.mp4" -i "build/lb_${SEED}_audio.wav" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -y -loglevel error -ss 20.6 -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 2 "$OUT/thumbnail.jpg"
echo "done -> $OUT/$NAME.mp4"
