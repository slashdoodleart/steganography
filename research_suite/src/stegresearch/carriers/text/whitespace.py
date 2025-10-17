"""Whitespace-based steganography for text."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

BIT_TO_GAP = {"0": "  ", "1": " \t"}


@dataclass
class WhitespaceEmbedder(Embedder):
    name: str = "whitespace"
    carrier: str = "text"

    def supported_methods(self) -> Iterable[str]:
        return ["trailing-whitespace"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "trailing-whitespace":
            raise ValueError("Unsupported method")

        with open(carrier_path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
        bitstring = "".join(f"{byte:08b}" for byte in payload)
        if len(bitstring) > len(lines):
            raise ValueError("Payload too large for whitespace embedding")
        stego_lines = []
        for index, line in enumerate(lines):
            line = line.rstrip("\n")
            if index < len(bitstring):
                line = f"{line}{BIT_TO_GAP[bitstring[index]]}"
            stego_lines.append(line + "\n")
        with open(output_path, "w", encoding="utf-8") as handle:
            handle.writelines(stego_lines)
        metrics = {
            "payload_length": len(payload),
            "capacity_bits": len(bitstring),
        }
        log_operation("text_whitespace_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class WhitespaceExtractor(Extractor):
    name: str = "whitespace"
    carrier: str = "text"

    def supported_methods(self) -> Iterable[str]:
        return ["trailing-whitespace"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "trailing-whitespace":
            raise ValueError("Unsupported method")

        with open(stego_path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
        bits = []
        for line in lines:
            if line.endswith(" \t\n"):
                bits.append("1")
            elif line.endswith("  \n"):
                bits.append("0")
        bitstring = "".join(bits)
        payload = int(bitstring, 2).to_bytes(len(bitstring) // 8, "big") if len(bitstring) >= 8 else b""
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("text_whitespace_extract", stego_path=stego_path, **result)
        return result


@dataclass
class WhitespaceDetector(Detector):
    name: str = "whitespace"
    carrier: str = "text"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        with open(stego_path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
        suspicious = sum(1 for line in lines if line.endswith("  \n") or line.endswith(" \t\n"))
        ratio = suspicious / max(len(lines), 1)
        probability = min(1.0, ratio * 5)
        result = {
            "ratio": ratio,
            "probability": probability,
            "threshold_flag": probability > 0.4,
        }
        log_operation("text_whitespace_detect", stego_path=stego_path, **result)
        return result
