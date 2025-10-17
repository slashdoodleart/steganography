"""Slack-space style embedding simulated via appended metadata."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_SUFFIX = ".slack"


@dataclass
class SlackSpaceEmbedder(Embedder):
    name: str = "slack"
    carrier: str = "fs"

    def supported_methods(self) -> Iterable[str]:
        return ["pseudo-slack"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "pseudo-slack":
            raise ValueError("Unsupported method")
        carrier = Path(carrier_path)
        output = Path(output_path)
        output.write_bytes(carrier.read_bytes())
        slack_path = output.with_name(output.name + _SUFFIX)
        slack_path.write_bytes(payload)
        metrics = {
            "payload_length": len(payload),
            "slack_path": str(slack_path),
        }
        log_operation("fs_slack_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class SlackSpaceExtractor(Extractor):
    name: str = "slack"
    carrier: str = "fs"

    def supported_methods(self) -> Iterable[str]:
        return ["pseudo-slack"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "pseudo-slack":
            raise ValueError("Unsupported method")
        slack_path = Path(stego_path).with_name(Path(stego_path).name + _SUFFIX)
        payload = slack_path.read_bytes() if slack_path.exists() else b""
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("fs_slack_extract", stego_path=stego_path, **result)
        return result


@dataclass
class SlackSpaceDetector(Detector):
    name: str = "slack"
    carrier: str = "fs"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        slack_path = Path(stego_path).with_name(Path(stego_path).name + _SUFFIX)
        exists = slack_path.exists()
        size = slack_path.stat().st_size if exists else 0
        result = {
            "exists": exists,
            "size": size,
            "probability": 1.0 if exists else 0.0,
            "threshold_flag": exists,
        }
        log_operation("fs_slack_detect", stego_path=stego_path, **result)
        return result
