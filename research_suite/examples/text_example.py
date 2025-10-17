"""End-to-end text steganography example."""

from __future__ import annotations

from pathlib import Path

from stegresearch.carriers.text import (
    ZeroWidthEmbedder,
    ZeroWidthExtractor,
    ZeroWidthDetector,
    WhitespaceEmbedder,
    WhitespaceExtractor,
    WhitespaceDetector,
)


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.txt"
    cover_path.write_text("This is a benign paragraph repeated. " * 40)
    payload = b"text payload"

    zw_embedder = ZeroWidthEmbedder()
    zw_stego = tmp / "stego_zw.txt"
    zw_embedder.embed("zero-width", str(cover_path), payload, str(zw_stego))
    zw_extractor = ZeroWidthExtractor()
    result = zw_extractor.extract("zero-width", str(zw_stego))
    assert result["payload"] == payload
    detector = ZeroWidthDetector()
    print("Zero-width detection", detector.detect(str(zw_stego)))

    ws_embedder = WhitespaceEmbedder()
    ws_stego = tmp / "stego_ws.txt"
    ws_embedder.embed("trailing-whitespace", str(cover_path), payload, str(ws_stego))
    ws_extractor = WhitespaceExtractor()
    result = ws_extractor.extract("trailing-whitespace", str(ws_stego))
    detector_ws = WhitespaceDetector()
    print("Whitespace detection", detector_ws.detect(str(ws_stego)))


if __name__ == "__main__":
    run(Path("artifacts/examples/text"))
