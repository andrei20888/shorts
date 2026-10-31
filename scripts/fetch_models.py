"""Download the Kokoro TTS model + voices (≈330 MB) into .cache/kokoro."""
import urllib.request
from pathlib import Path

BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
DEST = Path(__file__).resolve().parent.parent / ".cache" / "kokoro"
DEST.mkdir(parents=True, exist_ok=True)
for name in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    f = DEST / name
    if f.exists():
        print("exists", f)
        continue
    print("downloading", name)
    urllib.request.urlretrieve(BASE + name, f)
print("done")
