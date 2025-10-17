"""Alternate data stream simulation using sidecar files."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_SUFFIX = ".hidden"


@dataclass
class AlternateStreamEmbedder(Embedder):
    name: str = "ads"
    carrier: str = "fs"

    def supported_methods(self) -> Iterable[str]:
        return ["sidecar"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "sidecar":
            raise ValueError("Unsupported method")

        carrier = Path(carrier_path)
        output = Path(output_path)
        output.write_bytes(carrier.read_bytes())
        hidden_path = output.with_name(output.name + _SUFFIX)
        hidden_path.write_bytes(payload)
        metrics = {
            "payload_length": len(payload),
            "hidden_path": str(hidden_path),
        }
        log_operation("fs_ads_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class AlternateStreamExtractor(Extractor):
    name: str = "ads"
    carrier: str = "fs"

    def supported_methods(self) -> Iterable[str]:
        return ["sidecar"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "sidecar":
            raise ValueError("Unsupported method")
        hidden_path = Path(stego_path).with_name(Path(stego_path).name + _SUFFIX)
        payload = hidden_path.read_bytes() if hidden_path.exists() else b""
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("fs_ads_extract", stego_path=stego_path, **result)
        return result


@dataclass
class AlternateStreamDetector(Detector):
    name: str = "ads"
    carrier: str = "fs"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        hidden_path = Path(stego_path).with_name(Path(stego_path).name + _SUFFIX)
        exists = hidden_path.exists()
        size = hidden_path.stat().st_size if exists else 0
        result = {
            "exists": exists,
            "size": size,
            "probability": 1.0 if exists else 0.0,
            "threshold_flag": exists,
        }
        log_operation("fs_ads_detect", stego_path=stego_path, **result)
        return result
