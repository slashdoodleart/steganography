"""Run every carrier example."""

from __future__ import annotations

from pathlib import Path

from . import audio_example, fs_example, image_example, network_example, text_example, video_example, watermark_example


def main() -> None:
    base = Path("artifacts/examples")
    audio_example.run(base / "audio")
    fs_example.run(base / "fs")
    image_example.run(base / "image")
    network_example.run(base / "network")
    text_example.run(base / "text")
    video_example.run(base / "video")
    watermark_example.run(base / "watermark")


if __name__ == "__main__":
    main()
