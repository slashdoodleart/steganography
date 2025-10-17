"""File-system steganography example."""

from __future__ import annotations

from pathlib import Path

from stegresearch.carriers.fs import (
    AlternateStreamEmbedder,
    AlternateStreamExtractor,
    AlternateStreamDetector,
    SlackSpaceEmbedder,
    SlackSpaceExtractor,
    SlackSpaceDetector,
)


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.bin"
    cover_path.write_bytes(b"FOR_RESEARCH_USE_ONLY" * 4)
    payload = b"fs payload"

    ads_embedder = AlternateStreamEmbedder()
    stego = tmp / "stego.bin"
    ads_embedder.embed("sidecar", str(cover_path), payload, str(stego))
    extractor = AlternateStreamExtractor()
    result = extractor.extract("sidecar", str(stego))
    detector = AlternateStreamDetector()
    print("ADS detection", detector.detect(str(stego)))
    assert result["payload"] == payload

    slack_embedder = SlackSpaceEmbedder()
    slack_stego = tmp / "stego_slack.bin"
    slack_embedder.embed("pseudo-slack", str(cover_path), payload, str(slack_stego))
    slack_extractor = SlackSpaceExtractor()
    print("Slack extraction", slack_extractor.extract("pseudo-slack", str(slack_stego)))
    slack_detector = SlackSpaceDetector()
    print("Slack detection", slack_detector.detect(str(slack_stego)))


if __name__ == "__main__":
    run(Path("artifacts/examples/fs"))
