"""Audio steganography endpoints."""

from base64 import b64encode
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.models.schemas import (
    AudioAction,
    AudioFeature,
    AudioOverview,
    AudioSuiteResponse,
    DetectionResponse,
    MessageResponse,
    StegoResponse,
)
from app.services import audio_steganography, security

router = APIRouter()


@router.get("/overview", response_model=AudioOverview)
async def audio_overview() -> AudioOverview:
    """Provide static marketing content for the audio suite."""

    return AudioOverview(
        hero_title="Audio Steganography",
        hero_subtitle=(
            "Professional-grade audio steganography tools with minimalistic design. "
            "Hide and reveal messages in audio files with precision and elegance."
        ),
        features=[
            AudioFeature(
                title="WAV Support",
                description="Optimized for 16-bit PCM WAV files to preserve fidelity while embedding data.",
            ),
            AudioFeature(
                title="Visual Feedback",
                description="Waveform snapshots reveal how the embedded payload affects the signal envelope.",
            ),
            AudioFeature(
                title="Advanced Detection",
                description="LSB heuristics estimate tampering risk while maintaining performance for instant analysis.",
            ),
        ],
        actions=[
            AudioAction(
                title="Hide in Audio",
                description="Embed secret messages into audio files with precision.",
                cta="Get Started",
            ),
            AudioAction(
                title="Retrieve from Audio",
                description="Extract hidden messages from audio steganography.",
                cta="Get Started",
            ),
            AudioAction(
                title="Detect in Audio",
                description="Analyze audio files for potential steganography.",
                cta="Get Started",
            ),
        ],
        narrative=(
            "Audio steganography uses sophisticated algorithms to embed data in the least significant bits of "
            "audio samples, making changes imperceptible to human hearing while maintaining file integrity."
        ),
    )


@router.post("/hide", response_model=StegoResponse)
async def hide_message_in_audio(
    file: UploadFile = File(...),
    message: str = Form(...),
    passphrase: str | None = Form(None),
    settings: Settings = Depends(get_settings),
) -> StegoResponse:
    """Embed a secret message inside a WAV file."""

    payload = message.encode("utf-8")
    if len(payload) > settings.max_message_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Message exceeds configured limit")

    content = await file.read()
    if passphrase:
        payload = security.encrypt_message(payload, passphrase)

    try:
        output_bytes = audio_steganography.embed_message(content, payload)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    filename = f"{Path(file.filename or 'audio').stem}_stego.wav"
    encoded = b64encode(output_bytes).decode("ascii")
    return StegoResponse(filename=filename, media_type="audio/wav", data=encoded)


@router.post("/retrieve", response_model=MessageResponse)
async def retrieve_message_from_audio(
    file: UploadFile = File(...),
    passphrase: str | None = Form(None),
) -> MessageResponse:
    """Extract a hidden message from a WAV file."""

    content = await file.read()

    try:
        payload = audio_steganography.extract_message(content)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if passphrase:
        try:
            payload = security.decrypt_message(payload, passphrase)
        except ValueError as exc:  # pragma: no cover - fast path for user feedback
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    message = payload.decode("utf-8")
    return MessageResponse(message=message, bytes_length=len(payload))


@router.post("/detect", response_model=DetectionResponse)
async def detect_audio_steganography(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> DetectionResponse:
    """Check whether a WAV signal likely contains embedded data."""

    content = await file.read()
    try:
        analysis = audio_steganography.estimate_steganography_probability(content, sample_size=settings.detection_sample_size)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    suspected = analysis["probability"] >= 0.65
    return DetectionResponse(suspected=suspected, confidence=analysis["probability"], details=analysis)


@router.post("/suite/embed", response_model=AudioSuiteResponse)
async def audio_suite_embed(
    file: UploadFile = File(...),
    message: str = Form(...),
    passphrase: str | None = Form(None),
    settings: Settings = Depends(get_settings),
) -> AudioSuiteResponse:
    """Embed data and return waveform insights for advanced tooling."""

    payload = message.encode("utf-8")
    if len(payload) > settings.max_message_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Message exceeds configured limit")

    content = await file.read()
    if passphrase:
        payload = security.encrypt_message(payload, passphrase)

    try:
        result = audio_steganography.embed_with_waveform(content, payload)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    encoded = b64encode(result["audio"].getvalue()).decode("ascii")
    filename = f"{Path(file.filename or 'audio').stem}_stego.wav"
    stego = StegoResponse(filename=filename, media_type="audio/wav", data=encoded)
    return AudioSuiteResponse(stego=stego, waveform=result["waveform"])
