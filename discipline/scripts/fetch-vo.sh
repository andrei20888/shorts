#!/usr/bin/env bash
# Download the generated voice-over lines (Higgsfield · ElevenLabs v4 · voice "Mark")
# into audio_src/vo_raw/line_NN.mp3 (NN = line number in VOICEOVER.md). Then: node scripts/vo-timing.mjs && python3 scripts/mix_vo.py
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio_src/vo_raw
while read -r i url; do
  n=$(printf "%02d" $((i + 1)))
  curl -sSfL --retry 3 -o "audio_src/vo_raw/line_$n.mp3" "$url"
  echo "✓ line_$n.mp3"
done < scripts/vo_urls.txt
