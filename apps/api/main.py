import uuid
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, status
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
    created_at: datetime


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
    video_id = str(uuid.uuid4())
    return VideoResponse(
        id=video_id,
        source_type=payload.source_type,
        status="queued",
        stage="ingest",
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
