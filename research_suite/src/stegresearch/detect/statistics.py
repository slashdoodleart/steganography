"""Statistical steganalysis detectors."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict

import numpy as np
from PIL import Image

from ..core.interfaces import Detector
from ..core.logging import log_operation


@dataclass
class ChiSquareDetector(Detector):
    """Classical chi-square detector for spatial images."""

    name: str = "chi-square"
    carrier: str = "image"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        bins = int(options.get("bins", 256))
        with Image.open(stego_path) as stego:
            channel = np.array(stego.convert("L"))
        histogram, _ = np.histogram(channel, bins=bins, range=(0, 256))
        odds = histogram[1::2]
        evens = histogram[::2]
        chi_square = 0.0
        length = min(len(odds), len(evens))
        for idx in range(length):
            o = odds[idx]
            e = evens[idx]
            total = o + e
            if total == 0:
                continue
            chi_square += ((o - total / 2) ** 2 + (e - total / 2) ** 2) / (total / 2)
        probability = float(1 / (1 + math.exp(-(chi_square - 256) / 64)))
        result = {
            "chi_square": chi_square,
            "probability": probability,
            "threshold_flag": probability > 0.5,
        }
        log_operation("chi_square_detect", stego_path=stego_path, **result)
        return result


@dataclass
class RSAnalysisDetector(Detector):
    """RS analysis for spatial domain LSB embedding."""

    name: str = "rs-analysis"
    carrier: str = "image"

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        with Image.open(stego_path) as stego:
            channel = np.array(stego.convert("L"))
        mask = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
        residual = np.abs(np.convolve(channel.flatten(), mask.flatten(), mode="same"))
        r = np.mean(residual[::2])
        s = np.mean(residual[1::2])
        imbalance = abs(r - s)
        probability = float(min(1.0, imbalance / 10))
        result = {
            "residual_r": float(r),
            "residual_s": float(s),
            "probability": probability,
            "threshold_flag": probability > 0.4,
        }
        log_operation("rs_analysis_detect", stego_path=stego_path, **result)
        return result
