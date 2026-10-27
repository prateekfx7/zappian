import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from apps.api.config import settings

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
AUDIO_DIR = STORAGE_DIR / "audio"

for d in [ORIGINALS_DIR, PROXIES_DIR, FRAMES_DIR, AUDIO_DIR]:
    d.mkdir(parents=True, exist_ok=True)


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
ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "application/octet-stream",
}


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
    file: UploadFile = File(...),  # noqa: B008
    rights_confirmed: bool = Form(...),
) -> VideoResponse:
    if not rights_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rights confirmation is required. You must certify rights to analyze this video.",
        )

    # Validate file extension
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
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            size_bytes += len(chunk)
            if size_bytes > max_bytes:
                buffer.close()
                target_file.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum size limit of {settings.max_upload_size_mb} MB.",
                )
            buffer.write(chunk)

    return VideoResponse(
        id=video_id,
        source_type="upload",
        status="queued",
        stage="ingest",
        filename=file.filename,
        size_bytes=size_bytes,
        storage_key=f"originals/{video_id}/{target_file.name}",
        created_at=datetime.now(UTC),
    )


@app.get("/v1/videos/{video_id}", response_model=VideoResponse, tags=["Videos"])
async def get_video(video_id: str) -> VideoResponse:
    return VideoResponse(
        id=video_id,
        source_type="upload",
        status="queued",
        stage="ingest",
        created_at=datetime.now(UTC),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=True
    )
