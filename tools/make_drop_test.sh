#!/usr/bin/env bash
# Full pipeline for "1 TON BALL vs 10 FLOORS": sim -> video (2 parallel chunks, 30fps) -> audio -> final mp4.
#   tools/make_drop_test.sh short02_ball_vs_10_floors
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=${1:-drop_test}
OUT=output/$NAME; mkdir -p "$OUT" build
node sim/drop_test.mjs --out build/dt
LAST=$(node -e "console.log(require('./build/dt.json').nFrames - 1)")
MID=$(( (LAST / 4) * 2 ))
Q="data=build/dt&step=2&rs=0.6667"
node tools/render.js --page scenes/drop_test.html --video build/dt_part_a.mp4 --w 1080 --h 1920 --fps 30 --q "$Q&from=0&to=$((MID - 1))" &
node tools/render.js --page scenes/drop_test.html --video build/dt_part_b.mp4 --w 1080 --h 1920 --fps 30 --q "$Q&from=$MID&to=$LAST" &
wait
printf "file 'dt_part_a.mp4'\nfile 'dt_part_b.mp4'\n" > build/dt_concat.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/dt_concat.txt -c copy build/dt_video30.mp4
python3 tools/audio_drop_test.py build/dt.json build/dt_audio.wav
ffmpeg -y -loglevel error -i build/dt_video30.mp4 -i build/dt_audio.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -y -loglevel error -ss 15.2 -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 2 "$OUT/thumbnail.jpg"
echo "done -> $OUT/$NAME.mp4"
