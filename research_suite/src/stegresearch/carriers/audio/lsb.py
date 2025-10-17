"""Audio LSB embedding and detection."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

import numpy as np
import soundfile as sf

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation
from ...core.metrics import snr

_HEADER_LENGTH = 32


def _bytes_to_bits(payload: bytes) -> List[int]:
    return [int(bit) for byte in payload for bit in f"{byte:08b}"]


def _bits_to_bytes(bits: Iterable[int]) -> bytes:
    bit_str = "".join(str(bit) for bit in bits)
    return int(bit_str, 2).to_bytes(len(bit_str) // 8, byteorder="big")


@dataclass
class AudioLSBEmbedder(Embedder):
    name: str = "lsb"
    carrier: str = "audio"

    def supported_methods(self) -> Iterable[str]:
        return ["pcm-lsb"]

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "pcm-lsb":
            raise ValueError("Unsupported method")

        samples, samplerate = sf.read(carrier_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        scaled = np.int16(samples * 32767)

        payload_bits = _bytes_to_bits(len(payload).to_bytes(4, "big") + payload)
        if len(payload_bits) > len(scaled):
            raise ValueError("Payload too large")

        for index, bit in enumerate(payload_bits):
            scaled[index] = (scaled[index] & ~1) | bit

        stego = scaled.astype(np.int16)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        sf.write(output_path, stego / 32767.0, samplerate)

        metrics = {
            "capacity_bits": len(payload_bits),
            "payload_length": len(payload),
            "snr": snr(scaled.astype(float), stego.astype(float)),
        }
        log_operation("audio_lsb_embed", carrier_path=carrier_path, output_path=output_path, **metrics)
        return metrics


@dataclass
class AudioLSBExtractor(Extractor):
    name: str = "lsb"
    carrier: str = "audio"

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "pcm-lsb":
            raise ValueError("Unsupported method")

        samples, _ = sf.read(stego_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        scaled = np.int16(samples * 32767)

        length_bits = scaled[:_HEADER_LENGTH * 8] & 1
        payload_length = int("".join(map(str, length_bits)), 2)
        payload_bits = scaled[_HEADER_LENGTH * 8 : (_HEADER_LENGTH + payload_length) * 8] & 1
        payload = _bits_to_bytes(payload_bits)

        result = {
            "payload_length": payload_length,
            "payload": payload,
        }
        log_operation("audio_lsb_extract", stego_path=stego_path, **result)
        return result


@dataclass
class AudioLSBDetector(Detector):
    name: str = "lsb"
    carrier: str = "audio"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        samples, _ = sf.read(stego_path)
        if samples.ndim > 1:
            samples = samples[:, 0]
        scaled = np.int16(samples * 32767)
        lsb = scaled & 1
        bias = abs(np.mean(lsb) - 0.5)
        probability = float(1 - min(1.0, bias * 4))

        result = {
            "bias": float(bias),
            "probability": probability,
            "threshold_flag": probability < 0.6,
        }
        log_operation("audio_lsb_detect", stego_path=stego_path, **result)
        return result
