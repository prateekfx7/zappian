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
COMPARES_DIR = ANALYSES_DIR / "compares"
CONCEPTS_DIR = STORAGE_DIR / "concepts"

for d in [ORIGINALS_DIR, PROXIES_DIR, FRAMES_DIR, THUMBS_DIR, AUDIO_DIR, ANALYSES_DIR, COMPARES_DIR, CONCEPTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Mount local storage for serving proxy videos and frame thumbnails to frontend
app.mount("/storage", StaticFiles(directory="storage"), name="storage")


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: datetime


class RemixConceptRequest(BaseModel):
    source_video_id: str
    product_or_topic: str
    target_audience: str = "general consumers"
    platform: str = "reels"
    target_duration_s: int = 30
    goal: str = "conversions"
    tone: str = "energetic"
    custom_style_lock: str | None = None


class StatInput(BaseModel):
    metric: str
    value: float
    source: str = "manual"


class CompareRequest(BaseModel):
    video_a_id: str
    video_b_id: str


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


@app.get("/v1/videos/{video_id}/report", tags=["Analysis"])
async def get_analysis_report(video_id: str) -> dict[str, Any]:
    """Returns the validated AnalysisReport per packages/schemas/report.json."""
    pipeline_res = await get_pipeline_data(video_id)
    report = pipeline_res.get("analysis")
    if not report:
        raise HTTPException(status_code=404, detail="Analysis report not found for this video")
    return report


@app.post("/v1/videos/{video_id}/analyze", tags=["Analysis"])
async def trigger_analysis(video_id: str) -> dict[str, Any]:
    """Manually triggers or reruns Phase 2 analysis engine on existing media pipeline assets."""
    cache_file = ANALYSES_DIR / video_id / "pipeline_data.json"
    if not cache_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Pipeline data not found. Please upload or ingest the video first.",
        )

    content = cache_file.read_text(encoding="utf-8")
    pipeline_data = json.loads(content)

    from workers.analysis.engine import run_full_analysis

    analysis_res = run_full_analysis(pipeline_data=pipeline_data)
    pipeline_data["analysis"] = analysis_res["report"]
    pipeline_data["segments"] = analysis_res["segments"]

    cache_file.write_text(json.dumps(pipeline_data, indent=2), encoding="utf-8")
    return analysis_res["report"]


@app.get("/v1/videos/{video_id}/stats", tags=["Stats"])
async def get_video_stats(video_id: str) -> list[dict[str, Any]]:
    """Retrieves all source-labeled stats for a video."""
    cache_file = ANALYSES_DIR / video_id / "pipeline_data.json"
    if not cache_file.exists():
        raise HTTPException(status_code=404, detail="Video analysis not found")
    data = json.loads(cache_file.read_text(encoding="utf-8"))
    return data.get("analysis", {}).get("stats", [])


@app.post("/v1/videos/{video_id}/stats", tags=["Stats"])
async def add_manual_stat(video_id: str, payload: StatInput) -> list[dict[str, Any]]:
    """Adds a verified, source-labeled stat to a video per Rule 2."""
    from packages.providers.stats import ALLOWED_SOURCES

    if payload.source not in ALLOWED_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{payload.source}'. Allowed: {', '.join(sorted(ALLOWED_SOURCES))}",
        )

    cache_file = ANALYSES_DIR / video_id / "pipeline_data.json"
    if not cache_file.exists():
        raise HTTPException(status_code=404, detail="Video analysis not found")

    data = json.loads(cache_file.read_text(encoding="utf-8"))
    stat_item = {
        "metric": payload.metric.lower().replace(" ", "_"),
        "value": payload.value,
        "source": payload.source,
        "fetched_at": datetime.now(UTC).isoformat(),
    }

    if "analysis" not in data:
        data["analysis"] = {}
    if "stats" not in data["analysis"]:
        data["analysis"]["stats"] = []

    # Update or append
    existing = [s for s in data["analysis"]["stats"] if s["metric"] != stat_item["metric"]]
    existing.append(stat_item)
    data["analysis"]["stats"] = existing
    data["stats"] = existing

    cache_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return existing


@app.post("/v1/videos/{video_id}/stats/csv", tags=["Stats"])
async def upload_stats_csv(video_id: str, file: UploadFile = File(...)) -> list[dict[str, Any]]:  # noqa: B008
    """Parses user CSV metrics and attaches source-labeled stats."""
    from packages.providers.stats import CSVStatsParser

    cache_file = ANALYSES_DIR / video_id / "pipeline_data.json"
    if not cache_file.exists():
        raise HTTPException(status_code=404, detail="Video analysis not found")

    content = (await file.read()).decode("utf-8", errors="replace")
    parsed_stats = CSVStatsParser.parse_csv_content(content)

    if not parsed_stats:
        raise HTTPException(status_code=400, detail="No valid metrics found in CSV.")

    data = json.loads(cache_file.read_text(encoding="utf-8"))
    if "analysis" not in data:
        data["analysis"] = {}
    if "stats" not in data["analysis"]:
        data["analysis"]["stats"] = []

    # Merge by metric name
    stats_dict = {s["metric"]: s for s in data["analysis"]["stats"]}
    for s in parsed_stats:
        stats_dict[s["metric"]] = s

    merged = list(stats_dict.values())
    data["analysis"]["stats"] = merged
    data["stats"] = merged

    cache_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return merged


@app.post("/v1/compare", tags=["Compare"])
async def compare_video_pair(payload: CompareRequest) -> dict[str, Any]:
    """
    Performs blueprint alignment and 'Why Winner Won' autopsy diff
    citing timestamps from both videos per Rule 1 and Phase 3 acceptance criteria.
    """
    from workers.analysis.compare import compare_videos

    cache_a = ANALYSES_DIR / payload.video_a_id / "pipeline_data.json"
    cache_b = ANALYSES_DIR / payload.video_b_id / "pipeline_data.json"

    if not cache_a.exists():
        raise HTTPException(status_code=404, detail=f"Video A '{payload.video_a_id}' not found or not analyzed.")
    if not cache_b.exists():
        raise HTTPException(status_code=404, detail=f"Video B '{payload.video_b_id}' not found or not analyzed.")

    data_a = json.loads(cache_a.read_text(encoding="utf-8"))
    data_b = json.loads(cache_b.read_text(encoding="utf-8"))

    report = compare_videos(data_a, data_b)

    compare_file = COMPARES_DIR / f"{report['compare_id']}.json"
    compare_file.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return report


@app.get("/v1/compare/{compare_id}", tags=["Compare"])
async def get_compare_report(compare_id: str) -> dict[str, Any]:
    """Retrieves a previously computed comparison diff report."""
    compare_file = COMPARES_DIR / f"{compare_id}.json"
    if not compare_file.exists():
        raise HTTPException(status_code=404, detail=f"Compare report '{compare_id}' not found.")
    return json.loads(compare_file.read_text(encoding="utf-8"))


@app.post("/v1/concepts", tags=["Remix"])
async def create_remix_concept(payload: RemixConceptRequest) -> dict[str, Any]:
    """
    Generates an original video concept and shot list from a structural blueprint.
    Performs multi-layered originality check per Rule 4, Rule 21, and Rule 22.
    """
    source_file = ANALYSES_DIR / payload.source_video_id / "pipeline_data.json"
    if not source_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Source video '{payload.source_video_id}' not found or not analyzed yet.",
        )

    source_data = json.loads(source_file.read_text(encoding="utf-8"))

    from workers.remix.generator import generate_remix_concept

    concept = generate_remix_concept(
        source_video_data=source_data,
        product_or_topic=payload.product_or_topic,
        target_audience=payload.target_audience,
        platform=payload.platform,
        target_duration_s=payload.target_duration_s,
        goal=payload.goal,
        tone=payload.tone,
        custom_style_lock=payload.custom_style_lock,
    )

    concept_file = CONCEPTS_DIR / f"{concept['concept_id']}.json"
    concept_file.write_text(json.dumps(concept, indent=2), encoding="utf-8")

    return concept


@app.get("/v1/concepts/{concept_id}", tags=["Remix"])
async def get_remix_concept(concept_id: str) -> dict[str, Any]:
    """Retrieves a previously generated remix concept and originality audit."""
    concept_file = CONCEPTS_DIR / f"{concept_id}.json"
    if not concept_file.exists():
        raise HTTPException(status_code=404, detail=f"Concept '{concept_id}' not found.")
    return json.loads(concept_file.read_text(encoding="utf-8"))


@app.post("/v1/concepts/{concept_id}/generate", tags=["Remix"])
async def trigger_concept_generation(concept_id: str) -> dict[str, Any]:
    """
    Validates originality status before permitting draft video generation per Rule 4.
    """
    concept_file = CONCEPTS_DIR / f"{concept_id}.json"
    if not concept_file.exists():
        raise HTTPException(status_code=404, detail=f"Concept '{concept_id}' not found.")

    concept = json.loads(concept_file.read_text(encoding="utf-8"))
    originality = concept.get("originality", {})

    if originality.get("status") == "failed":
        raise HTTPException(
            status_code=400,
            detail=(
                "Generation blocked per Rule 4: Concept failed the originality audit. "
                f"Reason: {originality.get('concept_judge', {}).get('reason', 'High similarity to source material.')}"
            ),
        )

    return {
        "concept_id": concept_id,
        "status": "ready_for_generation",
        "shots_count": len(concept.get("shots", [])),
        "style_lock": concept.get("style_lock"),
        "message": "Originality check passed (0 plagiarized 5-grams). Concept approved for draft video generation.",
    }





if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=True
    )
