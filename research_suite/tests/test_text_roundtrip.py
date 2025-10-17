from pathlib import Path

from stegresearch.carriers.text import ZeroWidthEmbedder, ZeroWidthExtractor


def test_text_zero_width_roundtrip(tmp_path: Path) -> None:
    cover = tmp_path / "cover.txt"
    cover.write_text("lawful research text\n" * 10)

    payload = b"text"
    stego = tmp_path / "stego.txt"
    embedder = ZeroWidthEmbedder()
    embedder.embed("zero-width", str(cover), payload, str(stego))

    extractor = ZeroWidthExtractor()
    result = extractor.extract("zero-width", str(stego))
    assert result["payload"] == payload
