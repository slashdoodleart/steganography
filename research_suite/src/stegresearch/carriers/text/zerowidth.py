"""Zero-width steganography for text."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

ZERO_WIDTH_SPACE = "\u200b"
ZERO_WIDTH_NON_JOINER = "\u200c"
PAYLOAD_PREFIX = "[ZW-HIDDEN]"
PAYLOAD_SUFFIX = "[END]"


def _bytes_to_bits(payload: bytes) -> str:
    return "".join(f"{byte:08b}" for byte in payload)


def _bits_to_bytes(bits: str) -> bytes:
    return int(bits, 2).to_bytes(len(bits) // 8, "big") if bits else b""


@dataclass
class ZeroWidthEmbedder(Embedder):
    name: str = "zero-width"
    carrier: str = "text"

    def supported_methods(self) -> Iterable[str]:
        return ["zero-width"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "zero-width":
            raise ValueError("Unsupported method")

        with open(carrier_path, "r", encoding="utf-8") as handle:
            cover = handle.read()

        bitstring = _bytes_to_bits(payload)
        encoded = bitstring.replace("0", ZERO_WIDTH_SPACE).replace("1", ZERO_WIDTH_NON_JOINER)
        stego = f"{cover}{PAYLOAD_PREFIX}{encoded}{PAYLOAD_SUFFIX}"

        with open(output_path, "w", encoding="utf-8") as handle:
            handle.write(stego)

        metrics = {
            "payload_length": len(payload),
            "capacity_bits": len(bitstring),
        }
        log_operation("text_zero_width_embed", carrier_path=carrier_path, **metrics)
        return metrics


@dataclass
class ZeroWidthExtractor(Extractor):
    name: str = "zero-width"
    carrier: str = "text"

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "zero-width":
            raise ValueError("Unsupported method")

        with open(stego_path, "r", encoding="utf-8") as handle:
            stego = handle.read()
        start = stego.find(PAYLOAD_PREFIX)
        end = stego.find(PAYLOAD_SUFFIX, start + len(PAYLOAD_PREFIX))
        if start == -1 or end == -1:
            return {"payload": b"", "payload_length": 0}
        hidden = stego[start + len(PAYLOAD_PREFIX) : end]
        bitstring = hidden.replace(ZERO_WIDTH_SPACE, "0").replace(ZERO_WIDTH_NON_JOINER, "1")
        payload = _bits_to_bytes(bitstring)
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("text_zero_width_extract", stego_path=stego_path, **result)
        return result


@dataclass
class ZeroWidthDetector(Detector):
    name: str = "zero-width"
    carrier: str = "text"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        with open(stego_path, "r", encoding="utf-8") as handle:
            data = handle.read()
        total = len(data)
        zero_width_count = data.count(ZERO_WIDTH_SPACE) + data.count(ZERO_WIDTH_NON_JOINER)
        ratio = zero_width_count / max(total, 1)
        probability = min(1.0, ratio * 200)
        result = {
            "ratio": ratio,
            "probability": probability,
            "threshold_flag": probability > 0.2,
        }
        log_operation("text_zero_width_detect", stego_path=stego_path, **result)
        return result
