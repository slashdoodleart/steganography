"""Image steganography endpoints."""

from base64 import b64encode
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.models.schemas import DetectionResponse, MessageResponse, StegoResponse
from app.services import image_steganography, security

router = APIRouter()


@router.post("/hide", response_model=StegoResponse)
async def hide_message_in_image(
    file: UploadFile = File(...),
    message: str = Form(...),
    passphrase: str | None = Form(None),
    settings: Settings = Depends(get_settings),
) -> StegoResponse:
    """Embed a secret message inside an image."""

    payload = message.encode("utf-8")
    if len(payload) > settings.max_message_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Message exceeds configured limit")

    content = await file.read()
    if passphrase:
        payload = security.encrypt_message(payload, passphrase)

    try:
        output_bytes = image_steganography.embed_message(content, payload)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    filename = f"{Path(file.filename or 'image').stem}_stego.png"
    encoded = b64encode(output_bytes).decode("ascii")
    return StegoResponse(filename=filename, media_type="image/png", data=encoded)


@router.post("/retrieve", response_model=MessageResponse)
async def retrieve_message_from_image(
    file: UploadFile = File(...),
    passphrase: str | None = Form(None),
) -> MessageResponse:
    """Extract a hidden message from a stego image."""

    content = await file.read()

    try:
        payload = image_steganography.extract_message(content)
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
async def detect_image_steganography(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> DetectionResponse:
    """Provide a lightweight signal on hidden data risk."""

    content = await file.read()
    try:
        analysis = image_steganography.estimate_steganography_probability(content, sample_size=settings.detection_sample_size)
    except ValueError as exc:  # pragma: no cover - fast path for user feedback
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    suspected = analysis["probability"] >= 0.65
    return DetectionResponse(suspected=suspected, confidence=analysis["probability"], details=analysis)
