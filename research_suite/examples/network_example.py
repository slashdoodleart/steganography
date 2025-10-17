"""Offline network steganography example (pcap simulation)."""

from __future__ import annotations

from pathlib import Path

from scapy.all import Ether, IP, TCP, wrpcap  # type: ignore

from stegresearch.carriers.network import (
    NetworkHeaderEmbedder,
    NetworkHeaderExtractor,
    NetworkHeaderDetector,
    NetworkTimingEmbedder,
    NetworkTimingExtractor,
    NetworkTimingDetector,
)


def _generate_pcap(path: Path) -> None:
    packets = []
    for idx in range(100):
        pkt = Ether() / IP(dst="127.0.0.1", src="127.0.0.1", id=idx) / TCP(dport=80, sport=5000 + idx)
        pkt.time = idx * 0.01
        packets.append(pkt)
    wrpcap(str(path), packets)


def run(tmp: Path) -> None:
    tmp.mkdir(parents=True, exist_ok=True)
    cover_path = tmp / "cover.pcap"
    _generate_pcap(cover_path)
    payload = b"network"

    header_embedder = NetworkHeaderEmbedder()
    header_stego = tmp / "stego_header.pcap"
    metrics = header_embedder.embed("ip-id-lsb", str(cover_path), payload, str(header_stego))
    print("Header metrics", metrics)
    header_extractor = NetworkHeaderExtractor()
    result = header_extractor.extract("ip-id-lsb", str(header_stego))
    print("Header payload length", result["payload_length"])
    header_detector = NetworkHeaderDetector()
    print("Header detection", header_detector.detect(str(header_stego)))

    timing_embedder = NetworkTimingEmbedder()
    timing_stego = tmp / "stego_timing.pcap"
    timing_metrics = timing_embedder.embed("inter-packet-gap", str(cover_path), payload, str(timing_stego))
    print("Timing metrics", timing_metrics)
    timing_extractor = NetworkTimingExtractor()
    print("Timing extraction", timing_extractor.extract("inter-packet-gap", str(timing_stego)))
    timing_detector = NetworkTimingDetector()
    print("Timing detection", timing_detector.detect(str(timing_stego)))


if __name__ == "__main__":
    run(Path("artifacts/examples/network"))
