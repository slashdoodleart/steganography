"""Benchmark runner for steganography metrics."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

import numpy as np
from PIL import Image

from ..carriers.image import ImageLSBEmbedder, ImageLSBExtractor


def run(tmp: Path) -> Dict[str, float]:
    tmp.mkdir(parents=True, exist_ok=True)
    cover = tmp / "cover.png"
    rng = np.random.default_rng(42)
    Image.fromarray(rng.integers(0, 255, size=(128, 128, 3), dtype=np.uint8)).save(cover)
    stego = tmp / "stego.png"
    embedder = ImageLSBEmbedder()
    embedder.embed("rgb-lsb", str(cover), b"benchmark", str(stego))
    extract = ImageLSBExtractor().extract("rgb-lsb", str(stego))
    return {"payload_length": float(extract["payload_length"])}


def main() -> None:
    result = run(Path("artifacts/bench"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
