"""RGB image LSB embedding, extraction, and detection."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

import numpy as np
from PIL import Image

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation
from ...core.metrics import image_arrays, psnr, ssim

_HEADER_LENGTH = 32  # bits storing payload size


def _bytes_to_bits(payload: bytes) -> List[int]:
    return [int(bit) for byte in payload for bit in f"{byte:08b}"]


def _bits_to_bytes(bits: Iterable[int]) -> bytes:
    bit_str = "".join(str(bit) for bit in bits)
    return int(bit_str, 2).to_bytes(len(bit_str) // 8, byteorder="big")


@dataclass
class ImageLSBEmbedder(Embedder):
    name: str = "lsb"
    carrier: str = "image"

    def supported_methods(self) -> Iterable[str]:
        return ["rgb-lsb"]

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "rgb-lsb":
            raise ValueError("Unsupported LSB method")

        cover = Image.open(carrier_path).convert("RGB")
        cover_array = np.array(cover)
        flat = cover_array.flatten()

        payload_length = len(payload)
        length_bits = _bytes_to_bits(payload_length.to_bytes(4, "big"))
        payload_bits = _bytes_to_bits(payload)
        data_bits = length_bits + payload_bits

        if len(data_bits) > len(flat):
            raise ValueError("Payload too large for cover image")

        for idx, bit in enumerate(data_bits):
            flat[idx] = (flat[idx] & ~1) | bit

        stego_array = flat.reshape(cover_array.shape)
        stego_image = Image.fromarray(stego_array.astype(np.uint8))
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        stego_image.save(output_path)

        original, stego = image_arrays(Path(carrier_path), Path(output_path))
        metrics = {
            "capacity_bits": len(data_bits),
            "payload_length": payload_length,
            "psnr": psnr(original, stego),
            "ssim": ssim(original, stego),
        }
        log_operation(
            "image_lsb_embed",
            method=method,
            carrier_path=carrier_path,
            output_path=output_path,
            **metrics,
        )
        return metrics


@dataclass
class ImageLSBExtractor(Extractor):
    name: str = "lsb"
    carrier: str = "image"

    def extract(
        self,
        method: str,
        stego_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "rgb-lsb":
            raise ValueError("Unsupported LSB method")

        stego = Image.open(stego_path).convert("RGB")
        flat = np.array(stego).flatten()

        length_bits = flat[:_HEADER_LENGTH] & 1
        payload_length = int("".join(str(bit) for bit in length_bits), 2)
        payload_bits = flat[_HEADER_LENGTH : _HEADER_LENGTH + payload_length * 8] & 1

        recovered = _bits_to_bytes(payload_bits)

        metrics = {
            "payload_length": payload_length,
            "bytes_recovered": len(recovered),
            "payload": recovered,
        }
        log_operation("image_lsb_extract", method=method, stego_path=stego_path, **metrics)
        return metrics


@dataclass
class ImageLSBDetector(Detector):
    name: str = "lsb"
    carrier: str = "image"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        stego = Image.open(stego_path).convert("RGB")
        data = np.array(stego)
        channel = data[:, :, 0].flatten()

        even_counts = np.bincount(channel[channel % 2 == 0], minlength=256)
        odd_counts = np.bincount(channel[channel % 2 == 1], minlength=256)
        chi_square = 0.0
        for even, odd in zip(even_counts, odd_counts):
            if even + odd == 0:
                continue
            expected = (even + odd) / 2
            chi_square += ((even - expected) ** 2 + (odd - expected) ** 2) / expected

        score = 1 / (1 + math.exp(-(chi_square - 128) / 32))

        result = {
            "chi_square": chi_square,
            "probability": float(score),
            "threshold_flag": score > 0.5,
        }
        log_operation("image_lsb_detect", stego_path=stego_path, **result)
        return result
