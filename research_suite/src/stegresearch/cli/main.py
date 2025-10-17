"""Command-line interface for the StegResearch suite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import click

from ..core.config import get_settings
from ..core.logging import configure_logging, log_operation
from ..core.registry import registry
from ..carriers.image import ImageLSBEmbedder, ImageLSBExtractor, ImageLSBDetector, ImageDCTEmbedder, ImageDCTExtractor, ImageDCTDetector
from ..carriers.audio import AudioLSBEmbedder, AudioLSBExtractor, AudioLSBDetector, AudioEchoEmbedder, AudioEchoExtractor, AudioEchoDetector
from ..carriers.video import VideoFrameLSBEmbedder, VideoFrameLSBExtractor, VideoFrameLSBDetector, VideoDWTEmbedder, VideoDWTExtractor, VideoDWTDetector
from ..carriers.text import ZeroWidthEmbedder, ZeroWidthExtractor, ZeroWidthDetector, WhitespaceEmbedder, WhitespaceExtractor, WhitespaceDetector
from ..carriers.network import NetworkHeaderEmbedder, NetworkHeaderExtractor, NetworkHeaderDetector, NetworkTimingEmbedder, NetworkTimingExtractor, NetworkTimingDetector
from ..carriers.fs import AlternateStreamEmbedder, AlternateStreamExtractor, AlternateStreamDetector, SlackSpaceEmbedder, SlackSpaceExtractor, SlackSpaceDetector
from ..watermark import WatermarkEmbedder, WatermarkExtractor, WatermarkDetector


def _bootstrap_registry() -> None:
    registry.register_embedder(ImageLSBEmbedder())
    registry.register_extractor(ImageLSBExtractor())
    registry.register_detector(ImageLSBDetector())
    registry.register_embedder(ImageDCTEmbedder())
    registry.register_extractor(ImageDCTExtractor())
    registry.register_detector(ImageDCTDetector())

    registry.register_embedder(AudioLSBEmbedder())
    registry.register_extractor(AudioLSBExtractor())
    registry.register_detector(AudioLSBDetector())
    registry.register_embedder(AudioEchoEmbedder())
    registry.register_extractor(AudioEchoExtractor())
    registry.register_detector(AudioEchoDetector())

    registry.register_embedder(VideoFrameLSBEmbedder())
    registry.register_extractor(VideoFrameLSBExtractor())
    registry.register_detector(VideoFrameLSBDetector())
    registry.register_embedder(VideoDWTEmbedder())
    registry.register_extractor(VideoDWTExtractor())
    registry.register_detector(VideoDWTDetector())

    registry.register_embedder(ZeroWidthEmbedder())
    registry.register_extractor(ZeroWidthExtractor())
    registry.register_detector(ZeroWidthDetector())
    registry.register_embedder(WhitespaceEmbedder())
    registry.register_extractor(WhitespaceExtractor())
    registry.register_detector(WhitespaceDetector())

    registry.register_embedder(NetworkHeaderEmbedder())
    registry.register_extractor(NetworkHeaderExtractor())
    registry.register_detector(NetworkHeaderDetector())
    registry.register_embedder(NetworkTimingEmbedder())
    registry.register_extractor(NetworkTimingExtractor())
    registry.register_detector(NetworkTimingDetector())

    registry.register_embedder(AlternateStreamEmbedder())
    registry.register_extractor(AlternateStreamExtractor())
    registry.register_detector(AlternateStreamDetector())
    registry.register_embedder(SlackSpaceEmbedder())
    registry.register_extractor(SlackSpaceExtractor())
    registry.register_detector(SlackSpaceDetector())

    registry.register_embedder(WatermarkEmbedder())
    registry.register_extractor(WatermarkExtractor())
    registry.register_detector(WatermarkDetector())


@click.group()
@click.option("--config", type=click.Path(path_type=Path), default=None, help="Optional settings override file")
@click.pass_context
def cli(ctx: click.Context, config: Path | None) -> None:
    """StegResearch command-line toolkit."""

    configure_logging()
    settings = get_settings()
    ctx.obj = {"settings": settings, "config": config}
    _bootstrap_registry()
    log_operation("cli_start", config=str(config) if config else None)


@cli.command()
@click.option("--carrier", type=click.Choice(["image", "audio", "video", "text", "network", "fs", "watermark"]), required=True)
@click.option("--method", required=True)
@click.option("--cover", type=click.Path(path_type=Path), required=True)
@click.option("--payload", type=click.Path(path_type=Path), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=True)
@click.option("--options", type=str, default="{}", help="JSON string of algorithm-specific options")
def embed(carrier: str, method: str, cover: Path, payload: Path, output: Path, options: str) -> None:
    """Embed a payload into a carrier."""

    opts: dict[str, Any] = json.loads(options)
    data = payload.read_bytes()
    for embedder in registry.embedders(carrier):
        if method in embedder.supported_methods():
            metrics = embedder.embed(method, str(cover), data, str(output), **opts)
            click.echo(json.dumps(metrics, indent=2))
            return
    raise click.ClickException(f"No embedder for carrier={carrier} method={method}")


@cli.command()
@click.option("--carrier", type=click.Choice(["image", "audio", "video", "text", "network", "fs", "watermark"]), required=True)
@click.option("--method", required=True)
@click.option("--stego", type=click.Path(path_type=Path), required=True)
@click.option("--output", type=click.Path(path_type=Path), default=None)
@click.option("--options", type=str, default="{}")
def extract(carrier: str, method: str, stego: Path, output: Path | None, options: str) -> None:
    """Extract payload from stego carrier."""

    opts: dict[str, Any] = json.loads(options)
    for extractor in registry.extractors(carrier):
        if extractor.name == method.split("-")[0] or method in getattr(extractor, "supported_methods", lambda: [])():
            result = extractor.extract(method, str(stego), **opts)
            payload = result.get("payload", b"")
            if output and payload:
                output.write_bytes(payload)
            click.echo(json.dumps({k: v for k, v in result.items() if k != "payload"}, indent=2))
            return
    raise click.ClickException(f"No extractor for carrier={carrier} method={method}")


@cli.command()
@click.option("--carrier", type=click.Choice(["image", "audio", "video", "text", "network", "fs", "watermark"]), required=True)
@click.option("--stego", type=click.Path(path_type=Path), required=True)
@click.option("--options", type=str, default="{}")
def detect(carrier: str, stego: Path, options: str) -> None:
    """Run steganalysis detectors."""

    opts: dict[str, Any] = json.loads(options)
    detections = []
    for detector in registry.detectors(carrier):
        try:
            detections.append({"detector": detector.name, **detector.detect(str(stego), **opts)})
        except Exception as exc:  # noqa: BLE001
            detections.append({"detector": detector.name, "error": str(exc)})
    click.echo(json.dumps(detections, indent=2))


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
