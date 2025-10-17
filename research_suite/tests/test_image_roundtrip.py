from pathlib import Path

import numpy as np
from PIL import Image

from stegresearch.carriers.image import ImageLSBEmbedder, ImageLSBExtractor


def test_image_lsb_roundtrip(tmp_path: Path) -> None:
    cover = tmp_path / "cover.png"
    rng = np.random.default_rng(0)
    Image.fromarray(rng.integers(0, 255, size=(64, 64, 3), dtype=np.uint8)).save(cover)
    payload = b"secret"

    embedder = ImageLSBEmbedder()
    stego = tmp_path / "stego.png"
    embedder.embed("rgb-lsb", str(cover), payload, str(stego))

    extractor = ImageLSBExtractor()
    result = extractor.extract("rgb-lsb", str(stego))
    assert result["payload"] == payload
