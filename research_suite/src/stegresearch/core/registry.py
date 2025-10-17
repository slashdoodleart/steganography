"""Registry for embedder, extractor, and detector components."""

from __future__ import annotations

from typing import Dict, Iterable, Optional, TypeVar

from .interfaces import Capability, Detector, Embedder, Extractor

T = TypeVar("T", Embedder, Extractor, Detector)


class ComponentRegistry:
    """Central component registry with capability negotiation."""

    def __init__(self) -> None:
        self._embedders: Dict[str, Embedder] = {}
        self._extractors: Dict[str, Extractor] = {}
        self._detectors: Dict[str, Detector] = {}

    def register_embedder(self, embedder: Embedder) -> None:
        self._embedders[f"{embedder.carrier}:{embedder.name}"] = embedder

    def register_extractor(self, extractor: Extractor) -> None:
        self._extractors[f"{extractor.carrier}:{extractor.name}"] = extractor

    def register_detector(self, detector: Detector) -> None:
        self._detectors[f"{detector.carrier}:{detector.name}"] = detector

    def embedders(self, carrier: Optional[str] = None) -> Iterable[Embedder]:
        yield from (
            embedder
            for key, embedder in self._embedders.items()
            if carrier is None or key.startswith(f"{carrier}:")
        )

    def extractors(self, carrier: Optional[str] = None) -> Iterable[Extractor]:
        yield from (
            extractor
            for key, extractor in self._extractors.items()
            if carrier is None or key.startswith(f"{carrier}:")
        )

    def detectors(self, carrier: Optional[str] = None) -> Iterable[Detector]:
        yield from (
            detector
            for key, detector in self._detectors.items()
            if carrier is None or key.startswith(f"{carrier}:")
        )

    def require_capability(
        self,
        carrier: str,
        capability: Capability,
    ) -> None:
        """Raise descriptive error when capability is missing."""

        available = {
            Capability.EMBED: any(self.embedders(carrier)),
            Capability.EXTRACT: any(self.extractors(carrier)),
            Capability.DETECT: any(self.detectors(carrier)),
        }.get(capability, False)

        if not available:
            raise ValueError(
                f"No component with capability {capability.value!r} for carrier {carrier!r}"
            )


registry = ComponentRegistry()
