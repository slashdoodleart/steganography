"""Shared pydantic schemas."""

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Overall service status")


class StegoResponse(BaseModel):
    filename: str
    media_type: str
    data: str = Field(description="Base64 encoded payload")


class MessageResponse(BaseModel):
    message: str
    bytes_length: int


class DetectionResponse(BaseModel):
    suspected: bool = Field(description="True when hidden data is likely present")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    details: dict[str, Any] | None = None


class WaveformPoint(BaseModel):
    position: float = Field(description="Normalized position in the audio clip")
    amplitude: float = Field(description="Normalized sample magnitude")


class AudioSuiteResponse(BaseModel):
    stego: StegoResponse
    waveform: list[WaveformPoint]


class AudioFeature(BaseModel):
    title: str
    description: str


class AudioAction(BaseModel):
    title: str
    description: str
    cta: str


class AudioOverview(BaseModel):
    hero_title: str
    hero_subtitle: str
    features: list[AudioFeature]
    actions: list[AudioAction]
    narrative: str
