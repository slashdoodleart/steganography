"""Inter-packet timing steganography simulation."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

from scapy.all import Packet, rdpcap, wrpcap  # type: ignore

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation


@dataclass
class NetworkTimingEmbedder(Embedder):
    name: str = "timing"
    carrier: str = "network"

    def supported_methods(self) -> Iterable[str]:
        return ["inter-packet-gap"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "inter-packet-gap":
            raise ValueError("Unsupported method")

        packets = rdpcap(str(carrier_path))
        base_gap = float(options.get("base_gap", 0.01))
        delta = float(options.get("delta", 0.002))
        bits = [int(bit) for byte in payload for bit in f"{byte:08b}"]

        if len(bits) > len(packets) - 1:
            raise ValueError("Payload too large for timing embedding")

        current_time = packets[0].time if packets else 0.0
        for idx, packet in enumerate(packets):
            packet.time = current_time
            if idx < len(bits):
                adjustment = delta if bits[idx] else -delta
                current_time += base_gap + adjustment
            else:
                current_time += base_gap

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        wrpcap(str(output_path), packets)
        metrics = {
            "payload_length": len(payload),
            "capacity_bits": len(bits),
            "packet_count": len(packets),
        }
        log_operation("network_timing_embed", carrier_path=str(carrier_path), **metrics)
        return metrics


@dataclass
class NetworkTimingExtractor(Extractor):
    name: str = "timing"
    carrier: str = "network"

    def supported_methods(self) -> Iterable[str]:
        return ["inter-packet-gap"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "inter-packet-gap":
            raise ValueError("Unsupported method")

        packets = rdpcap(str(stego_path))
        deltas: List[float] = []
        for prev, curr in zip(packets, packets[1:]):
            deltas.append(curr.time - prev.time)
        base_gap = float(options.get("base_gap", 0.01))
        delta = float(options.get("delta", 0.002))
        bits = [1 if gap > base_gap else 0 for gap in deltas]
        bitstring = "".join(str(bit) for bit in bits)
        payload = int(bitstring, 2).to_bytes(len(bitstring) // 8, "big") if len(bitstring) >= 8 else b""
        result = {
            "payload": payload,
            "payload_length": len(payload),
        }
        log_operation("network_timing_extract", stego_path=str(stego_path), **result)
        return result


@dataclass
class NetworkTimingDetector(Detector):
    name: str = "timing"
    carrier: str = "network"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        packets = rdpcap(str(stego_path))
        deltas = [curr.time - prev.time for prev, curr in zip(packets, packets[1:])]
        if not deltas:
            return {"probability": 0.0, "threshold_flag": False, "variance": 0.0}
        variance = float(sum((gap - sum(deltas) / len(deltas)) ** 2 for gap in deltas) / len(deltas))
        probability = min(1.0, variance * 50)
        result = {
            "variance": variance,
            "probability": probability,
            "threshold_flag": probability > 0.3,
        }
        log_operation("network_timing_detect", stego_path=str(stego_path), **result)
        return result
