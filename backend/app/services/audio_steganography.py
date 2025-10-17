"""Audio-based steganography helpers."""

from __future__ import annotations

from io import BytesIO
import wave

import numpy as np

_HEADER_BYTES = 4


def _load_samples(audio_bytes: bytes) -> tuple[wave._wave_params, np.ndarray]:
    buffer = BytesIO(audio_bytes)
    try:
        with wave.open(buffer) as wav_file:
            params = wav_file.getparams()
            frames = wav_file.readframes(wav_file.getnframes())
    except wave.Error as exc:  # pragma: no cover - dependent on external files
        raise ValueError("Unsupported or corrupted WAV stream") from exc

    if params.sampwidth != 2:
        raise ValueError("Only 16-bit PCM WAV files are supported")

    samples = np.frombuffer(frames, dtype=np.int16).copy()
    return params, samples


def _write_wave(params: wave._wave_params, samples: np.ndarray) -> bytes:
    buffer = BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setparams(params)
        wav_file.writeframes(samples.astype(np.int16).tobytes())
    return buffer.getvalue()


def _embed_samples(samples: np.ndarray, payload: bytes) -> np.ndarray:
    total_bits = (_HEADER_BYTES + len(payload)) * 8
    if total_bits > samples.size:
        raise ValueError("Message is too large for this audio clip")

    header = len(payload).to_bytes(_HEADER_BYTES, "big")
    data_bits = np.unpackbits(np.frombuffer(header + payload, dtype=np.uint8))

    modified = samples.copy()
    modified[: total_bits] = (modified[: total_bits] & ~1) | data_bits
    return modified


def embed_message(audio_bytes: bytes, payload: bytes) -> bytes:
    """Embed the payload into the least-significant bits of the signal."""

    params, samples = _load_samples(audio_bytes)
    modified = _embed_samples(samples, payload)
    return _write_wave(params, modified)


def extract_message(audio_bytes: bytes) -> bytes:
    """Extract the payload from the signal."""

    _, samples = _load_samples(audio_bytes)
    if samples.size < _HEADER_BYTES * 8:
        raise ValueError("Audio clip too short to contain data")

    header_bits = samples[: _HEADER_BYTES * 8] & 1
    header_bytes = np.packbits(header_bits).tobytes()
    payload_length = int.from_bytes(header_bytes, "big")

    expected_bits = payload_length * 8
    start = _HEADER_BYTES * 8
    end = start + expected_bits
    if end > samples.size:
        raise ValueError("Embedded payload truncated or corrupted")

    if payload_length == 0:
        return b""

    payload_bits = samples[start:end] & 1
    payload = np.packbits(payload_bits).tobytes()
    return payload[:payload_length]


def _build_waveform(samples: np.ndarray, channels: int, points: int = 512) -> list[dict[str, float]]:
    if samples.size == 0:
        return []

    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)

    count = min(points, samples.size)
    indices = np.linspace(0, samples.size - 1, count, dtype=np.int64)
    subset = samples[indices]
    max_amplitude = float(np.max(np.abs(subset))) or 1.0
    normalized = subset / max_amplitude
    positions = np.linspace(0.0, 1.0, count)

    return [
        {"position": float(pos), "amplitude": float(val)}
        for pos, val in zip(positions, normalized)
    ]


def embed_with_waveform(audio_bytes: bytes, payload: bytes) -> dict[str, object]:
    """Embed data and provide waveform samples for UI rendering."""

    params, samples = _load_samples(audio_bytes)
    modified = _embed_samples(samples, payload)
    audio_payload = _write_wave(params, modified)
    waveform = _build_waveform(modified, params.nchannels)
    return {"audio": BytesIO(audio_payload), "waveform": waveform}


def estimate_steganography_probability(audio_bytes: bytes, *, sample_size: int) -> dict[str, float]:
    """Return a heuristic confidence score based on LSB noise."""

    params, samples = _load_samples(audio_bytes)
    if samples.size == 0:
        raise ValueError("Unable to analyze empty audio clip")

    subset = samples
    if sample_size and sample_size < samples.size:
        indices = np.linspace(0, samples.size - 1, sample_size, dtype=np.int64)
        subset = samples[indices]

    lsb = (subset & 1).astype(np.uint8)
    ratio = float(lsb.mean())
    transitions = float(np.count_nonzero(np.diff(lsb))) / (lsb.size - 1) if lsb.size > 1 else 0.0
    uniformity = max(0.0, 1.0 - abs(ratio - 0.5) * 4)
    probability = max(0.0, min(1.0, uniformity * 0.6 + transitions * 0.4))

    return {
        "probability": probability,
        "lsb_ratio": ratio,
        "transitions": transitions,
        "sample_rate": float(params.framerate),
        "samples_analyzed": float(subset.size),
    }
