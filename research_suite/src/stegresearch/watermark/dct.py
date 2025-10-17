"""Robust DCT watermarking for provenance."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

import cv2
import numpy as np

from ..core.interfaces import Detector, Embedder, Extractor
from ..core.logging import log_operation
from ..core.metrics import image_arrays, psnr, ssim


@dataclass
class WatermarkEmbedder(Embedder):
    name: str = "watermark-dct"
    carrier: str = "watermark"

    def supported_methods(self):
        return ["idct"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "idct":
            raise ValueError("Unsupported method")
        if len(payload) < 16:
            raise ValueError("Payload must contain at least 16 bytes for watermark ID")
        image = cv2.imread(carrier_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError("Unable to read image")
        watermark_id = np.array(list(payload[:64]), dtype=np.uint8)
        watermark_id = np.resize(watermark_id, (8, 8))
        dct = cv2.dct(image.astype(np.float32))
        strength = float(options.get("strength", 10.0))
        dct[:8, :8] += watermark_id * strength
        reconstructed = cv2.idct(dct)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, np.clip(reconstructed, 0, 255).astype(np.uint8))

        original, stego = image_arrays(Path(carrier_path), Path(output_path))
        metrics = {
            "psnr": psnr(original, stego),
            "ssim": ssim(original, stego),
            "payload_length": len(payload),
        }
        log_operation("watermark_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class WatermarkExtractor(Extractor):
    name: str = "watermark-dct"
    carrier: str = "watermark"

    def supported_methods(self) -> Iterable[str]:
        return ["idct"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "idct":
            raise ValueError("Unsupported method")
        image = cv2.imread(stego_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError("Unable to read image")
        dct = cv2.dct(image.astype(np.float32))
        strength = float(options.get("strength", 10.0))
        block = np.round(dct[:8, :8] / strength).astype(np.uint8)
        payload = bytes(block.flatten().tolist())
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("watermark_extract", stego_path=stego_path, **result)
        return result


@dataclass
class WatermarkDetector(Detector):
    name: str = "watermark-dct"
    carrier: str = "watermark"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        image = cv2.imread(stego_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError("Unable to read image")
        dct = cv2.dct(image.astype(np.float32))
        strength = float(options.get("strength", 10.0))
        block = np.round(dct[:8, :8] / strength)
        energy = float(np.linalg.norm(block))
        probability = float(min(1.0, energy / 100))
        result = {
            "energy": energy,
            "probability": probability,
            "threshold_flag": probability > 0.5,
        }
        log_operation("watermark_detect", stego_path=stego_path, **result)
        return result
