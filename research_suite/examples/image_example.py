"""End-to-end image steganography example."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from stegresearch.carriers.image import ImageLSBEmbedder, ImageLSBExtractor, ImageLSBDetector, ImageDCTEmbedder, ImageDCTExtractor, ImageDCTDetector


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.png"
    payload = b"Lawful research payload"
    rng = np.random.default_rng(1234)
    Image.fromarray(rng.integers(0, 255, size=(256, 256, 3), dtype=np.uint8)).save(cover_path)

    lsb_embedder = ImageLSBEmbedder()
    stego_path = tmp / "stego_lsb.png"
    metrics = lsb_embedder.embed("rgb-lsb", str(cover_path), payload, str(stego_path))
    print("LSB metrics", metrics)
    extractor = ImageLSBExtractor()
    result = extractor.extract("rgb-lsb", str(stego_path))
    assert result["payload"] == payload
    detector = ImageLSBDetector()
    detection = detector.detect(str(stego_path))
    print("LSB detection", detection)

    # Distort (simulate recompression)
    distorted = Image.open(stego_path).filter(ImageFilter.GaussianBlur(radius=0.5))
    distorted_path = tmp / "stego_lsb_distorted.png"
    distorted.save(distorted_path, quality=70)

    dct_embedder = ImageDCTEmbedder()
    dct_stego = tmp / "stego_dct.png"
    dct_metrics = dct_embedder.embed("dct-midband", str(cover_path), payload, str(dct_stego))
    print("DCT metrics", dct_metrics)
    dct_extractor = ImageDCTExtractor()
    dct_result = dct_extractor.extract("dct-midband", str(dct_stego))
    detector_dct = ImageDCTDetector()
    print("DCT detection", detector_dct.detect(str(dct_stego)))
    assert dct_result["payload"][: len(payload)] == payload


if __name__ == "__main__":
    run(Path("artifacts/examples/image"))
