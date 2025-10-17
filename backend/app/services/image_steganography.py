"""Image-based steganography helpers."""

from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

_HEADER_BYTES = 4


def _load_rgba(image_bytes: bytes) -> tuple[np.ndarray, Image.Image]:
    image = Image.open(BytesIO(image_bytes)).convert("RGBA")
    pixels = np.array(image, dtype=np.uint8)
    return pixels, image


def embed_message(image_bytes: bytes, payload: bytes) -> bytes:
    """Embed the payload into the least-significant bits of the RGB channels."""

    pixels, image = _load_rgba(image_bytes)
    rgb = pixels[..., :3]
    flat = rgb.reshape(-1)

    total_bits = (_HEADER_BYTES + len(payload)) * 8
    if total_bits > flat.size:
        raise ValueError("Message is too large for this image")

    header = len(payload).to_bytes(_HEADER_BYTES, "big")
    data = header + payload
    bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))

    flat[: total_bits] = (flat[: total_bits] & 0xFE) | bits
    rgb = flat.reshape(rgb.shape)
    pixels[..., :3] = rgb

    buffer = BytesIO()
    Image.fromarray(pixels, mode="RGBA").save(buffer, format="PNG")
    return buffer.getvalue()


def extract_message(image_bytes: bytes) -> bytes:
    """Recover an embedded payload from the image."""

    pixels, _ = _load_rgba(image_bytes)
    flat = pixels[..., :3].reshape(-1)

    if flat.size < _HEADER_BYTES * 8:
        raise ValueError("Image is too small to contain data")

    header_bits = flat[: _HEADER_BYTES * 8] & 1
    header_bytes = np.packbits(header_bits).tobytes()
    payload_length = int.from_bytes(header_bytes, "big")

    expected_bits = payload_length * 8
    start = _HEADER_BYTES * 8
    end = start + expected_bits
    if end > flat.size:
        raise ValueError("Embedded payload truncated or corrupted")

    if payload_length == 0:
        return b""

    payload_bits = flat[start:end] & 1
    payload = np.packbits(payload_bits).tobytes()
    return payload[:payload_length]


def estimate_steganography_probability(image_bytes: bytes, *, sample_size: int) -> dict[str, float]:
    """Return a lightweight confidence score based on LSB distribution heuristics."""

    pixels, _ = _load_rgba(image_bytes)
    flat = pixels[..., :3].reshape(-1)
    if flat.size == 0:
        raise ValueError("Unable to analyze empty image")

    lsb = (flat & 1).astype(np.uint8)
    if sample_size and sample_size < lsb.size:
        indices = np.linspace(0, lsb.size - 1, sample_size, dtype=np.int64)
        lsb = lsb[indices]

    ratio = float(lsb.mean())
    variance = float(lsb.var())
    uniformity = max(0.0, 1.0 - abs(ratio - 0.5) * 4)
    probability = max(0.0, min(1.0, uniformity * 0.7 + min(variance * 8, 0.3)))

    return {
        "probability": probability,
        "lsb_ratio": ratio,
        "variance": variance,
        "samples_analyzed": float(lsb.size),
    }
