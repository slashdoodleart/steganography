"""Common interfaces and capability negotiation for steganography components."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Iterable, Mapping, Protocol, runtime_checkable


class Capability(str, Enum):
    """Enumeration of supported capabilities across carriers and methods."""

    EMBED = "embed"
    EXTRACT = "extract"
    DETECT = "detect"
    BENCHMARK = "benchmark"


@dataclass(frozen=True)
class CapabilityDescriptor:
    """Description of an algorithm's capabilities and constraints."""

    name: str
    carrier: str
    methods: Iterable[str]
    capabilities: Iterable[Capability]
    parameters: Mapping[str, Any]


@runtime_checkable
class Embedder(Protocol):
    """Protocol for embedding payloads into carriers."""

    name: str
    carrier: str

    def supported_methods(self) -> Iterable[str]:
        """Return the embedding methods supported by this embedder."""

    def embed(
        self,
        method: str,
        carrier_path: str,
        payload: bytes,
        output_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        """Embed payload into carrier and return metrics (capacity, PSNR, etc.)."""


@runtime_checkable
class Extractor(Protocol):
    """Protocol for extracting payloads from carriers."""

    name: str
    carrier: str

    def extract(
        self,
        method: str,
        stego_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        """Extract payload and return results including recovered bytes and metrics."""


@runtime_checkable
class Detector(Protocol):
    """Protocol for detecting steganography in carriers."""

    name: str
    carrier: str

    def detect(
        self,
        stego_path: str,
        **options: Any,
    ) -> Dict[str, Any]:
        """Return detection probabilities, confidence intervals, and diagnostic data."""
