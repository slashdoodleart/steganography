"""Network header field steganography simulation (offline only)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

from scapy.all import IP, Packet, rdpcap, wrpcap  # type: ignore

from ...core.interfaces import Detector, Embedder, Extractor
from ...core.logging import log_operation

_HEADER_BITS = 16


def _bytes_to_bits(payload: bytes) -> List[int]:
    return [int(bit) for byte in payload for bit in f"{byte:08b}"]


def _bits_to_bytes(bits: List[int]) -> bytes:
    bit_str = "".join(str(bit) for bit in bits)
    groups = [bit_str[i : i + 8] for i in range(0, len(bit_str), 8) if len(bit_str[i : i + 8]) == 8]
    return bytes(int(group, 2) for group in groups)


@dataclass
class NetworkHeaderEmbedder(Embedder):
    name: str = "header"
    carrier: str = "network"

    def supported_methods(self) -> Iterable[str]:
        return ["ip-id-lsb"]

    def embed(self, method: str, carrier_path: str, payload: bytes, output_path: str, **options: Any) -> Dict[str, Any]:
        if method != "ip-id-lsb":
            raise ValueError("Unsupported method")

        packets = rdpcap(str(carrier_path))
        payload_bits = _bytes_to_bits(len(payload).to_bytes(4, "big") + payload)
        idx = 0
        for packet in packets:
            if not packet.haslayer(IP):
                continue
            ip: IP = packet[IP]
            ip.id = (ip.id & ~1) | payload_bits[idx]
            idx += 1
            if idx >= len(payload_bits):
                break
        if idx < len(payload_bits):
            raise ValueError("Payload too large for pcap")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        wrpcap(str(output_path), packets)
        metrics = {
            "payload_length": len(payload),
            "capacity_bits": len(payload_bits),
            "packet_count": len(packets),
        }
        log_operation("network_header_embed", carrier_path=str(carrier_path), **metrics)
        return metrics


@dataclass
class NetworkHeaderExtractor(Extractor):
    name: str = "header"
    carrier: str = "network"

    def supported_methods(self) -> Iterable[str]:
        return ["ip-id-lsb"]

    def extract(self, method: str, stego_path: str, **options: Any) -> Dict[str, Any]:
        if method != "ip-id-lsb":
            raise ValueError("Unsupported method")
        packets = rdpcap(str(stego_path))
        bits: List[int] = []
        for packet in packets:
            if not packet.haslayer(IP):
                continue
            ip: IP = packet[IP]
            bits.append(ip.id & 1)
        payload_length = int("".join(map(str, bits[:32])), 2)
        payload_bits = bits[32 : 32 + payload_length * 8]
        payload = _bits_to_bytes(payload_bits)
        result = {
            "payload_length": payload_length,
            "payload": payload,
        }
        log_operation("network_header_extract", stego_path=str(stego_path), **result)
        return result


@dataclass
class NetworkHeaderDetector(Detector):
    name: str = "header"
    carrier: str = "network"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        packets = rdpcap(str(stego_path))
        bits = []
        for packet in packets:
            if not packet.haslayer(IP):
                continue
            bits.append(packet[IP].id & 1)
        ones = sum(bits)
        total = len(bits) or 1
        bias = abs(ones / total - 0.5)
        probability = float(min(1.0, bias * 8))
        result = {
            "bias": bias,
            "probability": probability,
            "threshold_flag": probability > 0.3,
        }
        log_operation("network_header_detect", stego_path=str(stego_path), **result)
        return result
