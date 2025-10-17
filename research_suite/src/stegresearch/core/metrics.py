"""Common metrics for evaluating steganography performance."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity


def psnr(original: np.ndarray, stego: np.ndarray) -> float:
    """Compute PSNR between two arrays."""

    mse = np.mean((original.astype(np.float64) - stego.astype(np.float64)) ** 2)
    if mse == 0:
        return float("inf")
    max_pixel = 255.0
    return 20 * math.log10(max_pixel / math.sqrt(mse))


def ssim(original: np.ndarray, stego: np.ndarray) -> float:
    """Compute SSIM between two arrays, converting to grayscale if required."""

    if original.ndim == 3:
        original_gray = np.mean(original, axis=2)
    else:
        original_gray = original
    if stego.ndim == 3:
        stego_gray = np.mean(stego, axis=2)
    else:
        stego_gray = stego
    return float(structural_similarity(original_gray, stego_gray, data_range=255))


def image_arrays(path_a: Path, path_b: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Load two images as numpy arrays."""

    with Image.open(path_a) as img_a:
        original = np.array(img_a.convert("RGB"))
    with Image.open(path_b) as img_b:
        stego = np.array(img_b.convert("RGB"))
    return original, stego


def snr(original: np.ndarray, stego: np.ndarray) -> float:
    """Signal-to-noise ratio for audio-like waveforms."""

    noise = stego - original
    signal_power = np.mean(original**2)
    noise_power = np.mean(noise**2)
    if noise_power == 0:
        return float("inf")
    return 10 * math.log10(signal_power / noise_power)
