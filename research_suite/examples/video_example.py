"""End-to-end video steganography example."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from stegresearch.carriers.video import (
    VideoFrameLSBEmbedder,
    VideoFrameLSBExtractor,
    VideoFrameLSBDetector,
    VideoDWTEmbedder,
    VideoDWTExtractor,
    VideoDWTDetector,
)


def _generate_video(path: Path) -> None:
    rng = np.random.default_rng(2024)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(path), fourcc, 24, (128, 128))
    for frame_idx in range(60):
        frame = rng.integers(0, 255, size=(128, 128, 3), dtype=np.uint8)
        writer.write(frame)
    writer.release()


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.mp4"
    _generate_video(cover_path)
    payload = b"video steganography payload"

    frame_embedder = VideoFrameLSBEmbedder()
    frame_stego = tmp / "stego_frame.mp4"
    metrics = frame_embedder.embed("frame-rgb-lsb", str(cover_path), payload, str(frame_stego))
    print("Video frame metrics", metrics)
    extractor = VideoFrameLSBExtractor()
    result = extractor.extract("frame-rgb-lsb", str(frame_stego))
    print("Frame extraction length", result["payload_length"])
    detector = VideoFrameLSBDetector()
    print("Frame detection", detector.detect(str(frame_stego)))

    dwt_embedder = VideoDWTEmbedder()
    dwt_stego = tmp / "stego_dwt.mp4"
    dwt_metrics = dwt_embedder.embed("haar-ll", str(cover_path), payload, str(dwt_stego))
    print("Video DWT metrics", dwt_metrics)
    dwt_extractor = VideoDWTExtractor()
    dwt_result = dwt_extractor.extract("haar-ll", str(dwt_stego))
    print("DWT extraction length", dwt_result["payload_length"])
    dwt_detector = VideoDWTDetector()
    print("DWT detection", dwt_detector.detect(str(dwt_stego)))


if __name__ == "__main__":
    run(Path("artifacts/examples/video"))
