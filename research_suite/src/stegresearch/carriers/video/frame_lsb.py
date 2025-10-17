"""Video frame-domain LSB embedding."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

import cv2
import numpy as np

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_HEADER_BITS = 32


def _bytes_to_bits(payload: bytes) -> np.ndarray:
    if not payload:
        return np.empty(0, dtype=np.uint8)
    return np.unpackbits(np.frombuffer(payload, dtype=np.uint8))


def _bits_to_bytes(bits: Sequence[int] | np.ndarray) -> bytes:
    if isinstance(bits, np.ndarray):
        bit_array = bits.astype(np.uint8, copy=False)
    else:
        bit_array = np.fromiter(bits, dtype=np.uint8)

    if bit_array.size == 0:
        return b""

    usable = bit_array.size - (bit_array.size % 8)
    if usable != bit_array.size:
        bit_array = bit_array[:usable]
    return np.packbits(bit_array).tobytes()


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

        frame_step_opt = options.get("frame_step", 2)
        try:
            frame_step = max(int(frame_step_opt), 1)
        except (TypeError, ValueError):
            frame_step = 1

        max_frames_opt = options.get("max_frames")
        try:
            max_frames = int(max_frames_opt) if max_frames_opt is not None else None
            if max_frames is not None and max_frames <= 0:
                max_frames = None
        except (TypeError, ValueError):
            max_frames = None

        scale_width_opt = options.get("scale_width", 640)
        try:
            scale_width = int(scale_width_opt) if scale_width_opt is not None else 0
        except (TypeError, ValueError):
            scale_width = 0

        cap = cv2.VideoCapture(carrier_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        target_width = source_width
        target_height = source_height
        if scale_width and scale_width < source_width:
            target_width = max(2, scale_width)
            target_height = max(2, int(round(source_height * (target_width / source_width))))

        codec = cv2.VideoWriter_fourcc(*"mp4v")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        writer = cv2.VideoWriter(output_path, codec, fps, (target_width, target_height))

        payload_bits = _bytes_to_bits(len(payload).to_bytes(4, "big") + payload)
        total_bits = payload_bits.size
        idx = 0
        frame_count = 0
        embedded_frames = 0
        truncated = False

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            if target_width != source_width or target_height != source_height:
                frame = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)

            should_embed = idx < total_bits and ((frame_count - 1) % frame_step == 0)
            if should_embed:
                embedded_frames += 1
                flat = frame.reshape(-1)
                remaining = total_bits - idx
                if remaining > 0:
                    chunk = min(flat.size, remaining)
                    slice_view = flat[:chunk]
                    slice_view &= 0xFE
                    slice_view |= payload_bits[idx : idx + chunk]
                    idx += chunk

            writer.write(frame)

            if max_frames is not None and embedded_frames >= max_frames and idx >= total_bits:
                truncated = True
                break

        cap.release()
        writer.release()

        if idx < total_bits:
            raise ValueError("Payload too large for video")

        metrics = {
            "frames_processed": frame_count,
            "frames_embedded": embedded_frames,
            "frame_step": frame_step,
            "scale_width": target_width,
            "scale_height": target_height,
            "capacity_bits": total_bits,
            "payload_length": len(payload),
        }
        if max_frames is not None:
            metrics["max_frames"] = max_frames
            metrics["truncated"] = truncated

        log_operation("video_frame_lsb_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class VideoFrameLSBExtractor(Extractor):
    name: str = "frame-lsb"
    carrier: str = "video"

    def supported_methods(self) -> Iterable[str]:
        return ["frame-rgb-lsb"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "frame-rgb-lsb":
            raise ValueError("Unsupported method")

        cap = cv2.VideoCapture(stego_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        bit_chunks: List[np.ndarray] = []
        total_bits_seen = 0
        required_bits: int | None = None
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            chunk = (frame.reshape(-1) & 1).astype(np.uint8, copy=False)
            bit_chunks.append(chunk)
            total_bits_seen += chunk.size

            if required_bits is None and total_bits_seen >= _HEADER_BITS:
                header_bits = np.concatenate(bit_chunks)[:_HEADER_BITS]
                header_bytes = np.packbits(header_bits).tobytes()
                payload_length = int.from_bytes(header_bytes, "big")
                required_bits = _HEADER_BITS + payload_length * 8

            if required_bits is not None and total_bits_seen >= required_bits:
                break
        cap.release()

        if not bit_chunks:
            raise ValueError("Unable to read frames for extraction")

        bits = np.concatenate(bit_chunks)
        header_bytes = np.packbits(bits[:_HEADER_BITS]).tobytes()
        payload_length = int.from_bytes(header_bytes, "big")
        payload_bit_count = payload_length * 8
        payload_bits = bits[_HEADER_BITS : _HEADER_BITS + payload_bit_count]
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
