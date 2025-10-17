"""API route registration."""

from fastapi import APIRouter

from app.api.routes import audio, health, image

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(image.router, prefix="/steganography/image", tags=["image"])
api_router.include_router(audio.router, prefix="/steganography/audio", tags=["audio"])
