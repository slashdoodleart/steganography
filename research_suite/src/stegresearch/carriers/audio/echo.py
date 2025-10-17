"""Audio echo hiding methods."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

import numpy as np
import soundfile as sf

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation
from ...core.metrics import snr


@dataclass
class AudioEchoEmbedder(Embedder):
    name: str = "echo"
    carrier: str = "audio"

    def supported_methods(self) -> Iterable[str]:
        return ["echo-binary"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "echo-binary":
            raise ValueError("Unsupported method")

        samples, samplerate = sf.read(carrier_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        samples = samples.astype(np.float32)
        delay_short = int(options.get("delay_short", 0.002 * samplerate))
        delay_long = int(options.get("delay_long", 0.004 * samplerate))
        decay = float(options.get("decay", 0.5))

        bits = [int(bit) for byte in payload for bit in f"{byte:08b}"]
        frame_size = int(options.get("frame_size", samplerate // 10))
        frames = len(samples) // frame_size
        if len(bits) > frames:
            raise ValueError("Payload too large for echo coding")

        stego = samples.copy()
        for idx, bit in enumerate(bits):
            start = idx * frame_size
            end = start + frame_size
            frame = stego[start:end]
            delay = delay_long if bit else delay_short
            echo = np.zeros_like(frame)
            if delay < len(frame):
                echo[delay:] = frame[:-delay]
            stego[start:end] += decay * echo

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        sf.write(output_path, stego, samplerate)

        metrics = {
            "payload_length": len(payload),
            "capacity_bits": len(bits),
            "snr": snr(samples, stego),
        }
        log_operation("audio_echo_embed", carrier_path=carrier_path, output_path=output_path, **metrics)
        return metrics


@dataclass
class AudioEchoExtractor(Extractor):
    name: str = "echo"
    carrier: str = "audio"

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "echo-binary":
            raise ValueError("Unsupported method")

        samples, samplerate = sf.read(stego_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        samples = samples.astype(np.float32)
        delay_short = int(options.get("delay_short", 0.002 * samplerate))
        delay_long = int(options.get("delay_long", 0.004 * samplerate))
        frame_size = int(options.get("frame_size", samplerate // 10))

        frames = len(samples) // frame_size
        recovered_bits = []
        for idx in range(frames):
            frame = samples[idx * frame_size : (idx + 1) * frame_size]
            autocorr = np.correlate(frame, frame, mode="full")
            autocorr = autocorr[len(autocorr) // 2 :]
            short_val = autocorr[delay_short] if delay_short < len(autocorr) else 0
            long_val = autocorr[delay_long] if delay_long < len(autocorr) else 0
            recovered_bits.append(1 if long_val > short_val else 0)

        bytes_out = []
        for index in range(0, len(recovered_bits), 8):
            chunk = recovered_bits[index : index + 8]
            if len(chunk) < 8:
                break
            value = int("".join(map(str, chunk)), 2)
            bytes_out.append(value)
        payload = bytes(bytes_out)

        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("audio_echo_extract", stego_path=stego_path, **result)
        return result


@dataclass
class AudioEchoDetector(Detector):
    name: str = "echo"
    carrier: str = "audio"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        samples, samplerate = sf.read(stego_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        samples = samples.astype(np.float32)
        frame_size = int(options.get("frame_size", samplerate // 10))
        delay_long = int(options.get("delay_long", 0.004 * samplerate))

        frames = len(samples) // frame_size
        scores = []
        for idx in range(frames):
            frame = samples[idx * frame_size : (idx + 1) * frame_size]
            autocorr = np.correlate(frame, frame, mode="full")
            autocorr = autocorr[len(autocorr) // 2 :]
            val = autocorr[delay_long] if delay_long < len(autocorr) else 0.0
            energy = np.sum(frame**2) + 1e-9
            scores.append(val / energy)
        probability = float(min(1.0, np.mean(scores) * 10))
        result = {
            "mean_score": float(np.mean(scores)),
            "probability": probability,
            "threshold_flag": probability > 0.65,
        }
        log_operation("audio_echo_detect", stego_path=stego_path, **result)
        return result
