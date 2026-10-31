#!/usr/bin/env bash
# One-time setup: Python deps (TTS + audio), espeak-ng (phoneme timing), Kokoro model files.
set -euo pipefail
cd "$(dirname "$0")"
pip3 install -q kokoro-onnx soundfile numpy pillow
if ! command -v espeak-ng >/dev/null; then
  (sudo apt-get update -qq && sudo apt-get install -y -qq espeak-ng) || apt-get install -y -qq espeak-ng
fi
mkdir -p models
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -L -o models/kokoro-v1.0.onnx $BASE/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ]  || curl -L -o models/voices-v1.0.bin  $BASE/voices-v1.0.bin
# Playwright + Chromium (skip if a global playwright with a browser is already present)
if ! node -e "require('playwright')" 2>/dev/null; then
  npm install playwright@1.63.0 && npx playwright install chromium
fi
echo "setup complete"
