#!/usr/bin/env bash
# Downloads the offline Kokoro TTS model (~310 MB) + voices (~28 MB) from GitHub releases.
set -euo pipefail
cd "$(dirname "$0")"
BASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
[ -f kokoro-v1.0.onnx ] || curl -sS -L -o kokoro-v1.0.onnx "$BASE/kokoro-v1.0.onnx"
[ -f voices-v1.0.bin ]  || curl -sS -L -o voices-v1.0.bin  "$BASE/voices-v1.0.bin"
ls -la kokoro-v1.0.onnx voices-v1.0.bin
