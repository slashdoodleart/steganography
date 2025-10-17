"""Watermark embedding and detection example."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from stegresearch.watermark import WatermarkEmbedder, WatermarkExtractor, WatermarkDetector


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.png"
    payload = b"ProvenanceID-2025"
    rng = np.random.default_rng(77)
    Image.fromarray(rng.integers(0, 255, size=(256, 256), dtype=np.uint8)).save(cover_path)

    embedder = WatermarkEmbedder()
    stego = tmp / "stego_watermark.png"
    metrics = embedder.embed("idct", str(cover_path), payload, str(stego))
    print("Watermark metrics", metrics)
    extractor = WatermarkExtractor()
    result = extractor.extract("idct", str(stego))
    detector = WatermarkDetector()
    print("Watermark detection", detector.detect(str(stego)))
    assert result["payload"]


if __name__ == "__main__":
    run(Path("artifacts/examples/watermark"))
