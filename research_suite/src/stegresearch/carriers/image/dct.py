"""Image frequency-domain embedding using block DCT."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import cv2
import numpy as np

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation
from ...core.metrics import image_arrays, psnr, ssim

_BLOCK = 8


def _iter_blocks(img: np.ndarray) -> Iterable[Tuple[slice, slice]]:
    h, w = img.shape[:2]
    for y in range(0, h, _BLOCK):
        for x in range(0, w, _BLOCK):
            yield slice(y, y + _BLOCK), slice(x, x + _BLOCK)


@dataclass
class ImageDCTEmbedder(Embedder):
    name: str = "dct"
    carrier: str = "image"

    def supported_methods(self) -> Iterable[str]:
        return ["dct-midband"]

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "dct-midband":
            raise ValueError("Unsupported DCT method")

        image = cv2.imread(carrier_path, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Unable to read image")
        image_ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        y_channel = image_ycrcb[:, :, 0].astype(np.float32)

        payload_bits: List[int] = [int(bit) for byte in payload for bit in f"{byte:08b}"]
        length_bits = [int(bit) for bit in f"{len(payload):032b}"]
        bits = length_bits + payload_bits

        idx = 0
        for y_slice, x_slice in _iter_blocks(y_channel):
            block = y_channel[y_slice, x_slice]
            dct_block = cv2.dct(block)
            coords = [(2, 1), (1, 2), (2, 2), (3, 1), (1, 3)]
            for (i, j) in coords:
                if idx >= len(bits):
                    break
                coeff = dct_block[i, j]
                coeff = np.round(coeff / 2) * 2
                if bits[idx] == 1:
                    coeff += 1
                dct_block[i, j] = coeff
                idx += 1
            y_channel[y_slice, x_slice] = cv2.idct(dct_block)
            if idx >= len(bits):
                break

        if idx < len(bits):
            raise ValueError("Payload too large for cover")

        image_ycrcb[:, :, 0] = np.clip(y_channel, 0, 255)
        stego_bgr = cv2.cvtColor(image_ycrcb.astype(np.uint8), cv2.COLOR_YCrCb2BGR)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, stego_bgr)

        original, stego = image_arrays(Path(carrier_path), Path(output_path))
        metrics = {
            "capacity_bits": len(bits),
            "payload_length": len(payload),
            "psnr": psnr(original, stego),
            "ssim": ssim(original, stego),
        }
        log_operation("image_dct_embed", method=method, carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class ImageDCTExtractor(Extractor):
    name: str = "dct"
    carrier: str = "image"

    def supported_methods(self) -> Iterable[str]:
        return ["dct-midband"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "dct-midband":
            raise ValueError("Unsupported DCT method")

        stego = cv2.imread(stego_path, cv2.IMREAD_COLOR)
        if stego is None:
            raise ValueError("Unable to read image")
        y_channel = cv2.cvtColor(stego, cv2.COLOR_BGR2YCrCb)[:, :, 0].astype(np.float32)

        bits: List[int] = []
        for y_slice, x_slice in _iter_blocks(y_channel):
            block = y_channel[y_slice, x_slice]
            dct_block = cv2.dct(block)
            coords = [(2, 1), (1, 2), (2, 2), (3, 1), (1, 3)]
            for (i, j) in coords:
                coeff = dct_block[i, j]
                bits.append(int(abs(coeff) % 2))
                if len(bits) >= 32:
                    break
            if len(bits) >= 32:
                break

        payload_length = int("".join(map(str, bits[:32])), 2)
        data_bits: List[int] = []
        count_required = payload_length * 8
        for y_slice, x_slice in _iter_blocks(y_channel):
            block = y_channel[y_slice, x_slice]
            dct_block = cv2.dct(block)
            coords = [(2, 1), (1, 2), (2, 2), (3, 1), (1, 3)]
            for (i, j) in coords:
                data_bits.append(int(abs(dct_block[i, j]) % 2))
                if len(data_bits) >= 32 + count_required:
                    break
            if len(data_bits) >= 32 + count_required:
                break

        data_bits = data_bits[32 : 32 + count_required]
        recovered = int("".join(map(str, data_bits)), 2).to_bytes(payload_length, "big")

        result = {
            "payload_length": payload_length,
            "payload": recovered,
        }
        log_operation("image_dct_extract", method=method, stego_path=stego_path, **result)
        return result


@dataclass
class ImageDCTDetector(Detector):
    name: str = "dct"
    carrier: str = "image"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        stego = cv2.imread(stego_path, cv2.IMREAD_COLOR)
        if stego is None:
            raise ValueError("Unable to read image")
        y_channel = cv2.cvtColor(stego, cv2.COLOR_BGR2YCrCb)[:, :, 0].astype(np.float32)

        residuals = []
        for y_slice, x_slice in _iter_blocks(y_channel):
            dct_block = cv2.dct(y_channel[y_slice, x_slice])
            residuals.append(np.var(dct_block[1:4, 1:4]))
        variance = float(np.mean(residuals))
        probability = float(1 / (1 + np.exp(-(variance - 12) / 4)))
        result = {
            "variance": variance,
            "probability": probability,
            "threshold_flag": probability > 0.55,
        }
        log_operation("image_dct_detect", stego_path=stego_path, **result)
        return result
