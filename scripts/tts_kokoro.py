"""Hindi narration with Kokoro-82M (first-priority TTS).

Usage: python scripts/tts_kokoro.py --text-file in.txt --out out.wav [--voice hf_alpha] [--speed 1.0]
Exits non-zero on any failure so the caller can fall back to the next provider.
"""
from __future__ import annotations

import argparse
import sys

HINDI_VOICES = {"hf_alpha", "hf_beta", "hm_omega", "hm_psi"}
SAMPLE_RATE = 24000


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--voice", default="hf_alpha")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    if args.voice not in HINDI_VOICES:
        print(f"[KOKORO] Unsupported Hindi voice: {args.voice}", file=sys.stderr)
        return 2
    if not 0.8 <= args.speed <= 1.3:
        print("[KOKORO] Speed must be between 0.8 and 1.3", file=sys.stderr)
        return 2

    with open(args.text_file, encoding="utf-8") as handle:
        text = handle.read().strip()
    if not text:
        print("[KOKORO] Empty narration text", file=sys.stderr)
        return 2

    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    pipeline = KPipeline(lang_code="h")  # 'h' = Hindi
    chunks = []
    for _, _, audio in pipeline(text, voice=args.voice, speed=args.speed, split_pattern=r"[।\n]+"):
        if audio is None:
            continue
        data = audio.numpy() if hasattr(audio, "numpy") else np.asarray(audio)
        chunks.append(data)
        chunks.append(np.zeros(int(SAMPLE_RATE * 0.18), dtype=data.dtype))  # short pause between sentences

    if not chunks:
        print("[KOKORO] No audio produced", file=sys.stderr)
        return 1
    sf.write(args.out, np.concatenate(chunks), SAMPLE_RATE)
    print(f"[KOKORO] Wrote {args.out} with voice {args.voice}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
