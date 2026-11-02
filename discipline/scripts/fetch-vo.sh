#!/usr/bin/env bash
# Download the generated voice-over lines (Higgsfield · ElevenLabs v4 · voice "Mark")
# into public/audio/vo/line_NN.mp3 (NN = line number in VOICEOVER.md).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/audio/vo
while read -r i url; do
  n=$(printf "%02d" $((i + 1)))
  curl -sSfL --retry 3 -o "public/audio/vo/line_$n.mp3" "$url"
  echo "✓ line_$n.mp3"
done < scripts/vo_urls.txt
