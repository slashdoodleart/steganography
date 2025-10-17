"""End-to-end audio steganography example."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

from stegresearch.carriers.audio import AudioLSBEmbedder, AudioLSBExtractor, AudioLSBDetector, AudioEchoEmbedder, AudioEchoExtractor, AudioEchoDetector


def _generate_tone(path: Path) -> None:
    samplerate = 44100
    duration = 1.0
    t = np.linspace(0, duration, int(samplerate * duration), endpoint=False)
    wave = 0.3 * np.sin(2 * np.pi * 440 * t)
    sf.write(path, wave, samplerate)


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.wav"
    _generate_tone(cover_path)
    payload = b"audio steganography payload"

    lsb_embedder = AudioLSBEmbedder()
    stego_path = tmp / "stego_lsb.wav"
    metrics = lsb_embedder.embed("pcm-lsb", str(cover_path), payload, str(stego_path))
    print("Audio LSB metrics", metrics)
    extractor = AudioLSBExtractor()
    result = extractor.extract("pcm-lsb", str(stego_path))
    assert result["payload"].startswith(payload)
    detector = AudioLSBDetector()
    print("Audio LSB detection", detector.detect(str(stego_path)))

    echo_embedder = AudioEchoEmbedder()
    echo_stego = tmp / "stego_echo.wav"
    echo_metrics = echo_embedder.embed("echo-binary", str(cover_path), payload, str(echo_stego))
    print("Audio echo metrics", echo_metrics)
    echo_extractor = AudioEchoExtractor()
    echo_result = echo_extractor.extract("echo-binary", str(echo_stego))
    assert echo_result["payload"].startswith(payload[: len(echo_result["payload"])])
    echo_detector = AudioEchoDetector()
    print("Audio echo detection", echo_detector.detect(str(echo_stego)))


if __name__ == "__main__":
    run(Path("artifacts/examples/audio"))
