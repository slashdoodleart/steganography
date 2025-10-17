"""FastAPI application exposing steganography services."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from ..core.config import Settings, get_settings
from ..core.logging import configure_logging, log_operation
from ..core.registry import registry
from ..carriers.image import ImageLSBEmbedder, ImageLSBExtractor, ImageLSBDetector, ImageDCTEmbedder, ImageDCTExtractor, ImageDCTDetector
from ..carriers.audio import AudioLSBEmbedder, AudioLSBExtractor, AudioLSBDetector, AudioEchoEmbedder, AudioEchoExtractor, AudioEchoDetector
from ..carriers.video import VideoFrameLSBEmbedder, VideoFrameLSBExtractor, VideoFrameLSBDetector, VideoDWTEmbedder, VideoDWTExtractor, VideoDWTDetector
from ..carriers.text import ZeroWidthEmbedder, ZeroWidthExtractor, ZeroWidthDetector, WhitespaceEmbedder, WhitespaceExtractor, WhitespaceDetector
from ..carriers.network import NetworkHeaderEmbedder, NetworkHeaderExtractor, NetworkHeaderDetector, NetworkTimingEmbedder, NetworkTimingExtractor, NetworkTimingDetector
from ..carriers.fs import AlternateStreamEmbedder, AlternateStreamExtractor, AlternateStreamDetector, SlackSpaceEmbedder, SlackSpaceExtractor, SlackSpaceDetector
from ..watermark import WatermarkEmbedder, WatermarkExtractor, WatermarkDetector


configure_logging()

app = FastAPI(title="StegResearch API", version="0.1.0")


def _configure_cors(application: FastAPI) -> None:
    settings = get_settings()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost",
            "http://localhost:5173",
            "http://127.0.0.1",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


_configure_cors(app)


@app.on_event("startup")
async def startup() -> None:
    _bootstrap()


def _bootstrap() -> None:
    registry.register_embedder(ImageLSBEmbedder())
    registry.register_extractor(ImageLSBExtractor())
    registry.register_detector(ImageLSBDetector())
    registry.register_embedder(ImageDCTEmbedder())
    registry.register_extractor(ImageDCTExtractor())
    registry.register_detector(ImageDCTDetector())

    registry.register_embedder(AudioLSBEmbedder())
    registry.register_extractor(AudioLSBExtractor())
    registry.register_detector(AudioLSBDetector())
    registry.register_embedder(AudioEchoEmbedder())
    registry.register_extractor(AudioEchoExtractor())
    registry.register_detector(AudioEchoDetector())

    registry.register_embedder(VideoFrameLSBEmbedder())
    registry.register_extractor(VideoFrameLSBExtractor())
    registry.register_detector(VideoFrameLSBDetector())
    registry.register_embedder(VideoDWTEmbedder())
    registry.register_extractor(VideoDWTExtractor())
    registry.register_detector(VideoDWTDetector())

    registry.register_embedder(ZeroWidthEmbedder())
    registry.register_extractor(ZeroWidthExtractor())
    registry.register_detector(ZeroWidthDetector())
    registry.register_embedder(WhitespaceEmbedder())
    registry.register_extractor(WhitespaceExtractor())
    registry.register_detector(WhitespaceDetector())

    registry.register_embedder(NetworkHeaderEmbedder())
    registry.register_extractor(NetworkHeaderExtractor())
    registry.register_detector(NetworkHeaderDetector())
    registry.register_embedder(NetworkTimingEmbedder())
    registry.register_extractor(NetworkTimingExtractor())
    registry.register_detector(NetworkTimingDetector())

    registry.register_embedder(AlternateStreamEmbedder())
    registry.register_extractor(AlternateStreamExtractor())
    registry.register_detector(AlternateStreamDetector())
    registry.register_embedder(SlackSpaceEmbedder())
    registry.register_extractor(SlackSpaceExtractor())
    registry.register_detector(SlackSpaceDetector())

    registry.register_embedder(WatermarkEmbedder())
    registry.register_extractor(WatermarkExtractor())
    registry.register_detector(WatermarkDetector())
@app.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> Dict[str, Any]:
    return {
        "status": "ok",
        "version": app.version,
        "structured_logging": settings.structured_logging,
    }


def _write_temp_file(upload: UploadFile, settings: Settings) -> Path:
    temp_dir = (settings.artifact_dir / "uploads").resolve()
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = (temp_dir / f"{uuid.uuid4()}_{upload.filename}").resolve()
    temp_path.write_bytes(upload.file.read())
    return temp_path


@app.post("/embed")
async def embed(
    carrier: str = Form(...),
    method: str = Form(...),
    payload: UploadFile = File(...),
    cover: UploadFile = File(...),
    options: str = Form("{}"),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    if not settings.allow_external_networks and carrier == "network":
        raise HTTPException(status_code=403, detail="Network operations require explicit opt-in")
    opts = json.loads(options)
    cover_path = _write_temp_file(cover, settings)
    payload_bytes = payload.file.read()
    output_path = (settings.artifact_dir / "stego").resolve()
    output_path.mkdir(parents=True, exist_ok=True)
    stego_path = (output_path / f"{uuid.uuid4()}_{cover.filename}").resolve()

    for embedder in registry.embedders(carrier):
        if method in embedder.supported_methods():
            try:
                metrics = embedder.embed(method, str(cover_path), payload_bytes, str(stego_path), **opts)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}") from exc
            log_operation("api_embed", carrier=carrier, method=method, output=str(stego_path))
            return JSONResponse({"metrics": metrics, "stego_path": str(stego_path)})
    raise HTTPException(status_code=404, detail="No embedder found")


@app.post("/extract")
async def extract(
    carrier: str = Form(...),
    method: str = Form(...),
    stego: UploadFile = File(...),
    options: str = Form("{}"),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    if not settings.allow_external_networks and carrier == "network":
        raise HTTPException(status_code=403, detail="Network operations require explicit opt-in")
    opts = json.loads(options)
    stego_path = _write_temp_file(stego, settings)
    for extractor in registry.extractors(carrier):
        supported_methods = []
        supported_fn = getattr(extractor, "supported_methods", None)
        if callable(supported_fn):
            try:
                supported_methods = list(supported_fn())
            except TypeError:
                supported_methods = []
        name_matches = method == extractor.name or method.startswith(f"{extractor.name}-")
        if name_matches or method in supported_methods:
            try:
                result = extractor.extract(method, str(stego_path), **opts)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}") from exc
            payload = result.pop("payload", b"")
            payload_path = (settings.artifact_dir / "payloads").resolve()
            payload_path.mkdir(parents=True, exist_ok=True)
            output_path = (payload_path / f"{uuid.uuid4()}_{stego.filename}.bin").resolve()
            output_path.write_bytes(payload)
            log_operation("api_extract", carrier=carrier, method=method, output=str(output_path))
            return JSONResponse({"result": result, "payload_path": str(output_path)})
    raise HTTPException(status_code=404, detail="No extractor found")


@app.post("/detect")
async def detect(
    carrier: str = Form(...),
    stego: UploadFile = File(...),
    options: str = Form("{}"),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    if not settings.allow_external_networks and carrier == "network":
        raise HTTPException(status_code=403, detail="Network operations require explicit opt-in")
    opts = json.loads(options)
    stego_path = _write_temp_file(stego, settings)
    detections = []
    for detector in registry.detectors(carrier):
        try:
            detections.append({"detector": detector.name, **detector.detect(str(stego_path), **opts)})
        except Exception as exc:  # noqa: BLE001
            detections.append({"detector": detector.name, "error": str(exc)})
    log_operation("api_detect", carrier=carrier, detections=len(detections))
    return JSONResponse({"detections": detections})


@app.get("/metrics")
async def metrics() -> Dict[str, Any]:
    return {
        "message": "Benchmark metrics available after running bench task",
    }


@app.get("/artifact")
async def artifact(path: str, settings: Settings = Depends(get_settings)) -> FileResponse:
    artifact_dir = settings.artifact_dir.resolve()
    requested = Path(path)
    if not requested.is_absolute():
        requested = (artifact_dir / requested).resolve()
    else:
        requested = requested.resolve()
    try:
        requested.relative_to(artifact_dir)
    except ValueError as exc:  # noqa: B904
        raise HTTPException(status_code=400, detail="Artifact path outside artifact directory") from exc
    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    log_operation("api_artifact_download", path=str(requested))
    return FileResponse(requested, filename=requested.name)
