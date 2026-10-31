#!/usr/bin/env bash
# Full pipeline for a "Last Ball Standing" short: sim -> video (2 parallel chunks, 30fps) -> audio -> final mp4.
#   tools/make_last_ball.sh 39 short01_last_ball_standing
set -euo pipefail
cd "$(dirname "$0")/.."
SEED=${1:-39}; NAME=${2:-last_ball_$SEED}
OUT=output/$NAME; mkdir -p "$OUT" build
node sim/last_ball.mjs --seed "$SEED"
LAST=$(node -e "console.log(require('./build/lb_$SEED.json').nFrames - 1)")
MID=$(( (LAST / 4) * 2 ))  # even split point keeps the 30fps cadence seamless
Q="data=build/lb_$SEED&step=2&rs=0.6667"
node tools/render.js --page scenes/last_ball.html --video "build/lb_${SEED}_part_a.mp4" --w 1080 --h 1920 --fps 30 --q "$Q&from=0&to=$((MID - 1))" &
node tools/render.js --page scenes/last_ball.html --video "build/lb_${SEED}_part_b.mp4" --w 1080 --h 1920 --fps 30 --q "$Q&from=$MID&to=$LAST" &
wait
printf "file 'lb_%s_part_a.mp4'\nfile 'lb_%s_part_b.mp4'\n" "$SEED" "$SEED" > "build/lb_${SEED}_concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "build/lb_${SEED}_concat.txt" -c copy "build/lb_${SEED}_video30.mp4"
python3 tools/audio_last_ball.py "build/lb_$SEED.json" "build/lb_${SEED}_audio.wav"
ffmpeg -y -loglevel error -i "build/lb_${SEED}_video30.mp4" -i "build/lb_${SEED}_audio.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -y -loglevel error -ss 20.6 -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 2 "$OUT/thumbnail.jpg"
echo "done -> $OUT/$NAME.mp4"
