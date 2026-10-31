#!/usr/bin/env bash
# Render every episode in episodes/ into output/ (MP4 + thumbnail + metadata).
set -e
cd "$(dirname "$0")"
for ep in episodes/*.json; do
  python3 -m engine.compose "$ep" --out output --workers "${WORKERS:-4}"
done
