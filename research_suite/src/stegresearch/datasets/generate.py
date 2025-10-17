"""Synthetic dataset generation utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import click
import numpy as np
from PIL import Image
from pydub.generators import Sine

from ..core.config import get_settings
from ..core.logging import log_operation


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _generate_images(path: Path, count: int, seed: int) -> Iterable[Path]:
    rng = np.random.default_rng(seed)
    _ensure_dir(path)
    for idx in range(count):
        array = rng.integers(0, 255, size=(256, 256, 3), dtype=np.uint8)
        output = path / f"image_{idx:04d}.png"
        Image.fromarray(array).save(output)
        yield output


def _generate_audio(path: Path, count: int, seed: int) -> Iterable[Path]:
    _ensure_dir(path)
    for idx in range(count):
        tone = Sine(440 + idx * 10).to_audio_segment(duration=1000)
        output = path / f"audio_{idx:04d}.wav"
        tone.export(output, format="wav")
        yield output


def _generate_text(path: Path, count: int, seed: int) -> Iterable[Path]:
    rng = np.random.default_rng(seed)
    vocab = ["research", "analysis", "steganography", "forensics", "lawful", "sandbox"]
    _ensure_dir(path)
    for idx in range(count):
        words = rng.choice(vocab, size=200)
        output = path / f"text_{idx:04d}.txt"
        output.write_text(" ".join(words))
        yield output


def _generate_video(path: Path, count: int, seed: int) -> Iterable[Path]:
    import cv2  # local import avoids dependency for non-video users

    rng = np.random.default_rng(seed)
    _ensure_dir(path)
    for idx in range(count):
        output = path / f"video_{idx:04d}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(output), fourcc, 24, (128, 128))
        for frame_idx in range(60):
            frame = rng.integers(0, 255, size=(128, 128, 3), dtype=np.uint8)
            writer.write(frame)
        writer.release()
        yield output


@click.command()
@click.option("--output", type=click.Path(path_type=Path), default=Path("data/synthetic"))
@click.option("--seed", type=int, default=None)
@click.option("--images", type=int, default=10)
@click.option("--audio", "audio_count", type=int, default=5)
@click.option("--video", "video_count", type=int, default=2)
@click.option("--text", "text_count", type=int, default=5)
@click.option("--all", "generate_all", is_flag=True, help="Generate all corpora")
def main(
    output: Path,
    seed: int | None,
    images: int,
    audio_count: int,
    video_count: int,
    text_count: int,
    generate_all: bool,
) -> None:
    """Generate synthetic corpora for benchmarking."""

    settings = get_settings()
    seed = seed or settings.default_seed
    if not generate_all:
        click.echo("Tip: use --all to generate every carrier dataset")

    manifest = {
        "seed": seed,
        "images": [],
        "audio": [],
        "video": [],
        "text": [],
    }

    if generate_all or images > 0:
        manifest["images"] = [str(path) for path in _generate_images(output / "images", images, seed)]
    if generate_all or audio_count > 0:
        manifest["audio"] = [str(path) for path in _generate_audio(output / "audio", audio_count, seed)]
    if generate_all or video_count > 0:
        manifest["video"] = [str(path) for path in _generate_video(output / "video", video_count, seed)]
    if generate_all or text_count > 0:
        manifest["text"] = [str(path) for path in _generate_text(output / "text", text_count, seed)]

    (output / "manifest.json").write_text(json.dumps(manifest, indent=2))
    log_operation("generate_datasets", output=str(output), counts={k: len(v) for k, v in manifest.items()})
    click.echo(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
