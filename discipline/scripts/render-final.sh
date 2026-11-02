#!/usr/bin/env bash
# Final masters: bundle once, render every deliverable from that snapshot.
#   bash scripts/render-final.sh            → out/final/*.mp4  (H.264, CRF 18, yuv420p)
#   CONCURRENCY=2 bash scripts/render-final.sh
# Then: bash scripts/finish.sh  (loudness to -14 LUFS, web copies, thumbnails)
set -euo pipefail
cd "$(dirname "$0")/.."
BUNDLE=out/bundle
OUT=out/final
LOG=out/final/logs
CONCURRENCY="${CONCURRENCY:-4}"
mkdir -p "$OUT" "$LOG"

echo "[$(date +%T)] bundling…"
npx remotion bundle --out-dir "$BUNDLE" --log=error

render() { # comp output
  local comp="$1" file="$2" t0=$SECONDS
  echo "[$(date +%T)] ▶ $comp → $file"
  npx remotion render "$BUNDLE" "$comp" "$OUT/$file" --codec=h264 --crf=18 --pixel-format=yuv420p \
    --concurrency="$CONCURRENCY" --log=error > "$LOG/$comp.log" 2>&1
  echo "[$(date +%T)] ✓ $comp ($((SECONDS - t0)) s, $(du -h "$OUT/$file" | cut -f1))"
}

render Discipline          discipline_16x9.mp4
render Discipline-Vertical discipline_9x16.mp4
for v in A B C; do
  render "Hook-$v"          "hook_${v}_16x9.mp4"
  render "Hook-$v-Vertical" "hook_${v}_9x16.mp4"
done
echo "[$(date +%T)] all done"
