from pathlib import Path

import numpy as np
import soundfile as sf

from stegresearch.carriers.audio import AudioLSBEmbedder, AudioLSBExtractor


def test_audio_lsb_roundtrip(tmp_path: Path) -> None:
    samplerate = 8000
    duration = 0.5
    t = np.linspace(0, duration, int(samplerate * duration), endpoint=False)
    wave = 0.2 * np.sin(2 * np.pi * 440 * t)
    cover = tmp_path / "cover.wav"
    sf.write(cover, wave, samplerate)

    payload = b"audio"
    embedder = AudioLSBEmbedder()
    stego = tmp_path / "stego.wav"
    embedder.embed("pcm-lsb", str(cover), payload, str(stego))

    extractor = AudioLSBExtractor()
    result = extractor.extract("pcm-lsb", str(stego))
    assert result["payload"].startswith(payload)
