"""Video transform-domain embedding via DWT."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

import cv2
import numpy as np
import pywt

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_HEADER_BITS = 32


def _bytes_to_bits(payload: bytes) -> List[int]:
    return [int(bit) for byte in payload for bit in f"{byte:08b}"]


def _bits_to_bytes(bits: List[int]) -> bytes:
    bit_str = "".join(str(bit) for bit in bits)
    if len(bit_str) % 8:
        bit_str = bit_str[: len(bit_str) - (len(bit_str) % 8)]
    return int(bit_str, 2).to_bytes(len(bit_str) // 8, "big") if bit_str else b""


@dataclass
class VideoDWTEmbedder(Embedder):
    name: str = "dwt"
    carrier: str = "video"

    def supported_methods(self) -> Iterable[str]:
        return ["haar-ll"]

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "haar-ll":
            raise ValueError("Unsupported method")

        cap = cv2.VideoCapture(carrier_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        codec = cv2.VideoWriter_fourcc(*"mp4v")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        writer = cv2.VideoWriter(output_path, codec, fps, (width, height))

        payload_bits = _bytes_to_bits(len(payload).to_bytes(4, "big") + payload)
        bit_idx = 0
        frames = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frames += 1
            yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
            y_channel = yuv[:, :, 0].astype(np.float32)
            coeffs = pywt.wavedec2(y_channel, "haar", level=2)
            ll, *rest = coeffs
            flat = ll.flatten()
            for i in range(len(flat)):
                if bit_idx >= len(payload_bits):
                    break
                flat[i] = np.floor(flat[i] / 2) * 2 + payload_bits[bit_idx]
                bit_idx += 1
            ll = flat.reshape(ll.shape)
            coeffs = [ll] + rest
            y_reconstructed = pywt.waverec2(coeffs, "haar")
            yuv[:, :, 0] = np.clip(y_reconstructed, 0, 255)
            frame = cv2.cvtColor(yuv.astype(np.uint8), cv2.COLOR_YUV2BGR)
            writer.write(frame)
        cap.release()
        writer.release()

        if bit_idx < len(payload_bits):
            raise ValueError("Payload too large for DWT embedding")

        metrics = {
            "frames": frames,
            "capacity_bits": len(payload_bits),
            "payload_length": len(payload),
        }
        log_operation("video_dwt_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class VideoDWTExtractor(Extractor):
    name: str = "dwt"
    carrier: str = "video"

    def supported_methods(self) -> Iterable[str]:
        return ["haar-ll"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "haar-ll":
            raise ValueError("Unsupported method")

        cap = cv2.VideoCapture(stego_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        bits: List[int] = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
            y_channel = yuv[:, :, 0].astype(np.float32)
            coeffs = pywt.wavedec2(y_channel, "haar", level=2)
            ll = coeffs[0]
            bits.extend((ll.flatten() % 2).astype(int))
            if len(bits) >= _HEADER_BITS:
                payload_length = int("".join(map(str, bits[:_HEADER_BITS])), 2)
                total = _HEADER_BITS + payload_length * 8
                if len(bits) >= total:
                    break
        cap.release()

        payload_length = int("".join(map(str, bits[:_HEADER_BITS])), 2)
        payload_bits = bits[_HEADER_BITS : _HEADER_BITS + payload_length * 8]
        payload = _bits_to_bytes(payload_bits)
        result = {
            "payload_length": payload_length,
            "payload": payload,
        }
        log_operation("video_dwt_extract", stego_path=stego_path, **result)
        return result


@dataclass
class VideoDWTDetector(Detector):
    name: str = "dwt"
    carrier: str = "video"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        cap = cv2.VideoCapture(stego_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")
        residuals = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
            y_channel = yuv[:, :, 0].astype(np.float32)
            coeffs = pywt.wavedec2(y_channel, "haar", level=2)
            ll = coeffs[0]
            residuals.append(np.var(ll % 1))
        cap.release()
        statistic = float(np.mean(residuals)) if residuals else 0.0
        probability = float(min(1.0, statistic * 20))
        result = {
            "statistic": statistic,
            "probability": probability,
            "threshold_flag": probability > 0.7,
        }
        log_operation("video_dwt_detect", stego_path=stego_path, **result)
        return result
