"""
Generates a soothing 15-second devotional ambient background audio track
with resonant temple bells and harmonic Tibetan singing bowl tone (432 Hz).
Requires zero external packages (uses Python's standard wave and struct libraries).
"""

import wave
import struct
import math
import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def generate_devotional_audio(output_path="public/devotional_ambient.wav", duration=30.0, sample_rate=44100):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    num_samples = int(sample_rate * duration)

    bell_times = [2.0, 12.0, 22.0]

    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(2)      # Stereo
        wav_file.setsampwidth(2)      # 16-bit
        wav_file.setframerate(sample_rate)

        frames = bytearray()

        for i in range(num_samples):
            t = i / sample_rate

            # 432 Hz Sacred Om drone with warm sub-harmonic and slow meditative breath
            breath = 1.0 + 0.08 * math.sin(2 * math.pi * 0.1 * t)
            drone = (
                0.14 * math.sin(2 * math.pi * 216.0 * t) +
                0.10 * math.sin(2 * math.pi * 432.0 * t) +
                0.04 * math.sin(2 * math.pi * 648.0 * t)
            ) * breath

            # Temple Bell with crystal strike & exponential decay
            bell = 0.0
            for bt in bell_times:
                if t >= bt:
                    dt = t - bt
                    decay = math.exp(-2.2 * dt)
                    # Bell chime fundamental (1080 Hz) and upper harmonics
                    bell += 0.32 * math.sin(2 * math.pi * 1080.0 * dt) * decay
                    bell += 0.18 * math.sin(2 * math.pi * 2160.0 * dt) * decay
                    bell += 0.08 * math.sin(2 * math.pi * 3240.0 * dt) * decay

            # Fade in first 0.5s and fade out last 1.2s for clean loop
            envelope = 1.0
            if t < 1.0:
                envelope = t / 1.0
            elif t > 29.0:
                envelope = max(0.0, (30.0 - t) / 1.0)

            mixed = (drone + bell) * envelope
            val = int(mixed * 22000)
            val = max(-32767, min(32767, val))

            # Stereo channel bytes (L, R)
            frames.extend(struct.pack('<hh', val, val))

        wav_file.writeframes(frames)

    print(f"✅ Devotional ambient audio track generated: {output_path}")

if __name__ == "__main__":
    generate_devotional_audio()
