"""Video frame-domain LSB embedding."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

import cv2
import numpy as np

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_HEADER_BITS = 32


def _bytes_to_bits(payload: bytes) -> List[int]:
    return [int(bit) for byte in payload for bit in f"{byte:08b}"]


def _bits_to_bytes(bits: Iterable[int]) -> bytes:
    bit_str = "".join(str(bit) for bit in bits)
    if len(bit_str) % 8:
        bit_str = bit_str[: len(bit_str) - (len(bit_str) % 8)]
    return int(bit_str, 2).to_bytes(len(bit_str) // 8, "big") if bit_str else b""


@dataclass
class VideoFrameLSBEmbedder(Embedder):
    name: str = "frame-lsb"
    carrier: str = "video"

    def supported_methods(self) -> Iterable[str]:
        return ["frame-rgb-lsb"]

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        if method != "frame-rgb-lsb":
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
        idx = 0
        frame_count = 0
        original_bits = len(payload_bits)

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            if idx < len(payload_bits):
                flat = frame.flatten()
                for i in range(len(flat)):
                    if idx >= len(payload_bits):
                        break
                    flat[i] = (flat[i] & ~1) | payload_bits[idx]
                    idx += 1
                frame = flat.reshape(frame.shape)
            writer.write(frame)
        cap.release()
        writer.release()

        if idx < len(payload_bits):
            raise ValueError("Payload too large for video")

        metrics = {
            "frames": frame_count,
            "capacity_bits": original_bits,
            "payload_length": len(payload),
        }
        log_operation("video_frame_lsb_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class VideoFrameLSBExtractor(Extractor):
    name: str = "frame-lsb"
    carrier: str = "video"

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "frame-rgb-lsb":
            raise ValueError("Unsupported method")

        cap = cv2.VideoCapture(stego_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        bits: List[int] = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            flat = frame.flatten()
            bits.extend(flat & 1)
            if len(bits) >= _HEADER_BITS:
                payload_length = int("".join(map(str, bits[:_HEADER_BITS])), 2)
                total_bits = _HEADER_BITS + payload_length * 8
                if len(bits) >= total_bits:
                    break
        cap.release()

        payload_length = int("".join(map(str, bits[:_HEADER_BITS])), 2)
        payload_bits = bits[_HEADER_BITS : _HEADER_BITS + payload_length * 8]
        payload = _bits_to_bytes(payload_bits)

        result = {
            "payload_length": payload_length,
            "payload": payload,
        }
        log_operation("video_frame_lsb_extract", stego_path=stego_path, **result)
        return result


@dataclass
class VideoFrameLSBDetector(Detector):
    name: str = "frame-lsb"
    carrier: str = "video"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        cap = cv2.VideoCapture(stego_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")
        variances = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            channel = frame[:, :, 0]
            diff = channel & 1
            variances.append(np.var(diff))
        cap.release()
        chi_metric = float(np.mean(variances)) if variances else 0.0
        probability = float(1 / (1 + math.exp(-(chi_metric - 0.25) * 10)))
        result = {
            "variance": chi_metric,
            "probability": probability,
            "threshold_flag": probability > 0.6,
        }
        log_operation("video_frame_lsb_detect", stego_path=stego_path, **result)
        return result
