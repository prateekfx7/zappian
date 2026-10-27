import asyncio
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from apps.api.config import settings
from workers.pipeline import get_or_create_pipeline_state, run_media_pipeline

app = FastAPI(
    title="FrameDNA API",
    description="Video Autopsy & Structure Remix Engine",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup for Next.js web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local storage directories
STORAGE_DIR = Path("storage")
ORIGINALS_DIR = STORAGE_DIR / "originals"
PROXIES_DIR = STORAGE_DIR / "proxies"
FRAMES_DIR = STORAGE_DIR / "frames"
THUMBS_DIR = STORAGE_DIR / "thumbs"
AUDIO_DIR = STORAGE_DIR / "audio"
ANALYSES_DIR = STORAGE_DIR / "analyses"

for d in [ORIGINALS_DIR, PROXIES_DIR, FRAMES_DIR, THUMBS_DIR, AUDIO_DIR, ANALYSES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Mount local storage for serving proxy videos and frame thumbnails to frontend
app.mount("/storage", StaticFiles(directory="storage"), name="storage")


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: datetime


class VideoCreateRequest(BaseModel):
    source_type: str = Field(..., description="upload | youtube | instagram | tiktok")
    source_url: str | None = Field(None, description="URL if not direct upload")
    rights_confirmed: bool = Field(
        ...,
        description="Mandatory user confirmation: I own this video or have permission to analyse it.",
    )


class VideoResponse(BaseModel):
    id: str
    source_type: str
    status: str
    stage: str
    filename: str | None = None
    size_bytes: int | None = None
    storage_key: str | None = None
    created_at: datetime


ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}


def execute_pipeline_background(video_id: str, file_path: Path) -> None:
    """Runs media pipeline in the background and updates pipeline state."""
    try:
        run_media_pipeline(video_id=video_id, original_video_path=file_path)
    except Exception as e:  # noqa: BLE001
        state = get_or_create_pipeline_state(video_id)
        state.update("failed", state.progress_pct, f"Pipeline execution failed: {e!s}")


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        version="0.1.0",
        timestamp=datetime.now(UTC),
    )


@app.post(
    "/v1/videos",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Videos"],
)
async def create_video(payload: VideoCreateRequest) -> VideoResponse:
    if not payload.rights_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rights confirmation is required. You must certify rights to analyze this video.",
        )
    if payload.source_type == "youtube" and not payload.source_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source URL is required for YouTube video ingestion.",
        )

    video_id = str(uuid.uuid4())
    state = get_or_create_pipeline_state(video_id)
    state.update("queued", 0, "Video ingest queued.")

    return VideoResponse(
        id=video_id,
        source_type=payload.source_type,
        status="queued",
        stage="ingest",
        storage_key=f"urls/{video_id}" if payload.source_url else None,
        created_at=datetime.now(UTC),
    )


@app.post(
    "/v1/videos/upload",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Videos"],
)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),  # noqa: B008
    rights_confirmed: bool = Form(...),
) -> VideoResponse:
    if not rights_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rights confirmation is required. You must certify rights to analyze this video.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    video_id = str(uuid.uuid4())
    target_dir = ORIGINALS_DIR / video_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / (file.filename or f"video{ext}")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    size_bytes = 0

    with target_file.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size_bytes += len(chunk)
            if size_bytes > max_bytes:
                buffer.close()
                target_file.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum size limit of {settings.max_upload_size_mb} MB.",
                )
            buffer.write(chunk)

    # Initialize state and schedule pipeline execution
    state = get_or_create_pipeline_state(video_id)
    state.update("ingest", 5, "Upload received. Scheduling media pipeline...")
    background_tasks.add_task(execute_pipeline_background, video_id, target_file)

    return VideoResponse(
        id=video_id,
        source_type="upload",
        status="processing",
        stage="ingest",
        filename=file.filename,
        size_bytes=size_bytes,
        storage_key=f"originals/{video_id}/{target_file.name}",
        created_at=datetime.now(UTC),
    )


@app.get("/v1/videos/{video_id}", response_model=VideoResponse, tags=["Videos"])
async def get_video(video_id: str) -> VideoResponse:
    state = get_or_create_pipeline_state(video_id)
    return VideoResponse(
        id=video_id,
        source_type="upload",
        status="done"
        if state.stage == "ready"
        else ("failed" if state.stage == "failed" else "processing"),
        stage=state.stage,
        created_at=datetime.now(UTC),
    )


@app.get("/v1/videos/{video_id}/events", tags=["Pipeline"])
async def stream_video_events(video_id: str):
    """Server-Sent Events (SSE) stream for real-time stage progress."""
    state = get_or_create_pipeline_state(video_id)

    async def event_generator():
        # First send current state immediately
        yield {
            "event": "progress",
            "data": json.dumps(
                {
                    "video_id": video_id,
                    "stage": state.stage,
                    "progress_pct": state.progress_pct,
                    "error": state.error,
                }
            ),
        }

        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

        def listener(evt: dict[str, Any]) -> None:
            queue.put_nowait(evt)

        state.listeners.append(listener)
        try:
            while True:
                try:
                    evt = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield {"event": "progress", "data": json.dumps(evt)}
                    if evt.get("stage") in ("ready", "failed"):
                        break
                except TimeoutError:
                    # Send keep-alive comment
                    yield {"comment": "ping"}
                    if state.stage in ("ready", "failed"):
                        break
        finally:
            if listener in state.listeners:
                state.listeners.remove(listener)

    return EventSourceResponse(event_generator())


@app.get("/v1/videos/{video_id}/pipeline", tags=["Pipeline"])
async def get_pipeline_data(video_id: str) -> dict[str, Any]:
    """Returns the full media pipeline output (metadata, frames, scenes, transcript, audio features, OCR)."""
    cache_file = ANALYSES_DIR / video_id / "pipeline_data.json"
    if not cache_file.exists():
        state = get_or_create_pipeline_state(video_id)
        if state.stage == "failed":
            raise HTTPException(
                status_code=500, detail=state.error or "Pipeline failed"
            )
        raise HTTPException(
            status_code=404, detail="Pipeline data not yet ready or video not found"
        )

    content = cache_file.read_text(encoding="utf-8")
    return json.loads(content)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=True
    )
