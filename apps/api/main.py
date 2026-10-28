import asyncio
import json
import logging
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Configure logger
logger = logging.getLogger("reelbrain.api")

# Ensure both local directory and monorepo root are on sys.path
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent

for p in [str(CURRENT_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

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
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

try:
    from apps.api.config import settings
except ImportError:
    import config as api_config
    settings = api_config.settings
    sys.modules["apps"] = sys.modules.get("apps", type(sys)("apps"))
    sys.modules["apps.api"] = sys.modules.get("apps.api", type(sys)("apps.api"))
    sys.modules["apps.api.config"] = api_config

from workers.pipeline import get_or_create_pipeline_state, run_media_pipeline

app = FastAPI(
    title="FrameDNA API",
    description="Video Autopsy & Structure Remix Engine",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup for Next.js web client and Vercel deployment domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage directory resolution with /tmp fallback for serverless read-only environments
def get_storage_dir() -> Path:
    base = Path("storage")
    try:
        base.mkdir(parents=True, exist_ok=True)
        test_file = base / ".write_test"
        test_file.touch()
        test_file.unlink(missing_ok=True)
        return base
    except OSError:
        tmp_base = Path("/tmp/storage")
        tmp_base.mkdir(parents=True, exist_ok=True)
        return tmp_base

STORAGE_DIR = get_storage_dir()
ORIGINALS_DIR = STORAGE_DIR / "originals"
PROXIES_DIR = STORAGE_DIR / "proxies"
FRAMES_DIR = STORAGE_DIR / "frames"
THUMBS_DIR = STORAGE_DIR / "thumbs"
AUDIO_DIR = STORAGE_DIR / "audio"
ANALYSES_DIR = STORAGE_DIR / "analyses"
COMPARES_DIR = ANALYSES_DIR / "compares"
CONCEPTS_DIR = STORAGE_DIR / "concepts"
DRAFTS_DIR = STORAGE_DIR / "drafts"

for d in [ORIGINALS_DIR, PROXIES_DIR, FRAMES_DIR, THUMBS_DIR, AUDIO_DIR, ANALYSES_DIR, COMPARES_DIR, CONCEPTS_DIR, DRAFTS_DIR]:
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass

# Mount local storage for serving proxy videos and frame thumbnails to frontend
try:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")
except Exception as e:
    logger.warning(f"StaticFiles mount skipped or failed: {e}")

from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc!s}"},
    )


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
    use_brain_memory: bool = True


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
    known_views: float | None = Field(None, description="Optional manual views count")
    known_likes: float | None = Field(None, description="Optional manual likes count")
    known_shares: float | None = Field(None, description="Optional manual shares count")
    known_comments: float | None = Field(None, description="Optional manual comments count")


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


def execute_pipeline_background(
    video_id: str,
    file_path: Path,
    initial_stats: list[dict[str, Any]] | None = None,
    social_metadata: dict[str, Any] | None = None,
) -> None:
    """Runs media pipeline in the background and updates pipeline state."""
    try:
        run_media_pipeline(
            video_id=video_id,
            original_video_path=file_path,
            initial_stats=initial_stats,
            social_metadata=social_metadata,
        )
    except Exception as e:  # noqa: BLE001
        state = get_or_create_pipeline_state(video_id)
        state.update("failed", state.progress_pct, f"Pipeline execution failed: {e!s}")


def download_and_process_url_background(
    video_id: str,
    url: str,
    user_stats: list[dict[str, Any]] | None = None,
) -> None:
    """Downloads video from URL via dedicated resolver or yt-dlp, then executes the media pipeline with full virality telemetry."""
    state = get_or_create_pipeline_state(video_id)
    target_dir = ORIGINALS_DIR / video_id
    target_dir.mkdir(parents=True, exist_ok=True)

    try:
        state.update("ingest", 5, "Connecting to video link...")
        downloaded_file: Path | None = None
        extracted_stats: list[dict[str, Any]] = list(user_stats or [])
        social_meta: dict[str, Any] = {}

        # 1. Dedicated TikTok Resolver (Bypasses regional ISP blocks on tiktok.com via clean CDN stream)
        is_tiktok = any(d in url.lower() for d in ["tiktok.com", "vt.tiktok", "vm.tiktok"])
        if is_tiktok:
            state.update("ingest", 10, "Resolving TikTok stream and engagement metrics via proxy...")
            try:
                import json
                import shutil
                import urllib.request

                api_url = f"https://www.tikwm.com/api/?url={url.strip()}"
                req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    api_data = json.loads(resp.read().decode())

                if api_data.get("code") == 0 and api_data.get("data", {}).get("play"):
                    tdata = api_data["data"]
                    now_iso = datetime.now(UTC).isoformat()

                    play_count = float(tdata.get("play_count") or 0)
                    digg_count = float(tdata.get("digg_count") or 0)
                    share_count = float(tdata.get("share_count") or 0)
                    comment_count = float(tdata.get("comment_count") or 0)

                    # Append verified connector stats if not already supplied manually
                    existing_metrics = {s.get("metric") for s in extracted_stats}
                    if "views" not in existing_metrics and play_count > 0:
                        extracted_stats.append({"metric": "views", "value": play_count, "source": "connector", "fetched_at": now_iso})
                    if "likes" not in existing_metrics and digg_count > 0:
                        extracted_stats.append({"metric": "likes", "value": digg_count, "source": "connector", "fetched_at": now_iso})
                    if "shares" not in existing_metrics and share_count > 0:
                        extracted_stats.append({"metric": "shares", "value": share_count, "source": "connector", "fetched_at": now_iso})
                    if "comments" not in existing_metrics and comment_count > 0:
                        extracted_stats.append({"metric": "comments", "value": comment_count, "source": "connector", "fetched_at": now_iso})

                    author_info = tdata.get("author") or {}
                    social_meta = {
                        "platform": "tiktok",
                        "title": tdata.get("title", ""),
                        "author": author_info.get("nickname") or author_info.get("unique_id", ""),
                        "music": (tdata.get("music_info") or {}).get("title", ""),
                        "duration": tdata.get("duration", 0),
                    }

                    cdn_url = tdata["play"]
                    target_file = target_dir / "downloaded_tiktok.mp4"
                    state.update("ingest", 15, "Downloading high-resolution stream...")
                    vid_req = urllib.request.Request(
                        cdn_url,
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                    )
                    with urllib.request.urlopen(vid_req, timeout=40) as vresp, open(target_file, "wb") as out_f:
                        shutil.copyfileobj(vresp, out_f)

                    if target_file.exists() and target_file.stat().st_size > 1000:
                        downloaded_file = target_file
            except Exception as e:
                logger.warning(f"TikTok proxy resolver attempt failed: {e}")

        # 2. General Engine: yt-dlp (YouTube, Shorts, Direct MP4, Vimeo, etc.)
        if not downloaded_file:
            import yt_dlp

            def progress_hook(d: dict[str, Any]) -> None:
                if d.get("status") == "downloading":
                    total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                    downloaded = d.get("downloaded_bytes") or 0
                    if total > 0:
                        pct = min(20, int((downloaded / total) * 15) + 5)
                        state.update("ingest", pct, f"Downloading video stream: {int((downloaded / total) * 100)}%")

            out_template = str(target_dir / "downloaded_%(id)s.%(ext)s")
            ydl_opts = {
                "outtmpl": out_template,
                "format": "bestvideo*+bestaudio/best",
                "merge_output_format": "mp4",
                "max_filesize": settings.max_upload_size_mb * 1024 * 1024,
                "no_playlist": True,
                "quiet": True,
                "no_warnings": True,
                "progress_hooks": [progress_hook],
                "socket_timeout": 30,
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if info:
                    now_iso = datetime.now(UTC).isoformat()
                    existing_metrics = {s.get("metric") for s in extracted_stats}
                    views = float(info.get("view_count") or 0)
                    likes = float(info.get("like_count") or 0)
                    comments = float(info.get("comment_count") or 0)
                    reposts = float(info.get("repost_count") or 0)

                    if "views" not in existing_metrics and views > 0:
                        extracted_stats.append({"metric": "views", "value": views, "source": "ytdlp", "fetched_at": now_iso})
                    if "likes" not in existing_metrics and likes > 0:
                        extracted_stats.append({"metric": "likes", "value": likes, "source": "ytdlp", "fetched_at": now_iso})
                    if "shares" not in existing_metrics and reposts > 0:
                        extracted_stats.append({"metric": "shares", "value": reposts, "source": "ytdlp", "fetched_at": now_iso})
                    if "comments" not in existing_metrics and comments > 0:
                        extracted_stats.append({"metric": "comments", "value": comments, "source": "ytdlp", "fetched_at": now_iso})

                    if not social_meta:
                        social_meta = {
                            "platform": "youtube" if any(k in url.lower() for k in ["youtube.com", "youtu.be"]) else "web",
                            "title": info.get("title", ""),
                            "author": info.get("uploader") or info.get("channel", ""),
                            "duration": info.get("duration", 0),
                        }

            candidates = list(target_dir.glob("downloaded_*.*"))
            if not candidates:
                raise RuntimeError("No media stream could be extracted from this link.")
            downloaded_file = candidates[0]

        state.update("ingest", 25, "Download complete. Starting media pipeline...")
        run_media_pipeline(
            video_id=video_id,
            original_video_path=downloaded_file,
            initial_stats=extracted_stats,
            social_metadata=social_meta,
        )

    except Exception as e:
        err_str = str(e)
        logger.error(f"Failed to ingest URL for video {video_id}: {err_str}")

        is_instagram = "instagram.com" in url.lower()
        if is_instagram or any(term in err_str.lower() for term in ["empty media response", "login", "not granting access", "cookie", "sign in"]):
            clean_msg = "Instagram / TikTok has account login barriers on this video. Please save or download the video file to your device and use the 'Upload Video' tab — it analyzes the exact same frame-by-frame data in seconds."
        elif "unsupported url" in err_str.lower():
            clean_msg = "Unsupported video link format. Please paste a valid YouTube, TikTok, or direct video URL, or use 'File Upload'."
        elif "max-filesize" in err_str.lower() or "too large" in err_str.lower():
            clean_msg = f"Video exceeds maximum allowed size of {settings.max_upload_size_mb}MB."
        elif "timed out" in err_str.lower():
            clean_msg = "The download connection timed out due to regional firewall blocks. Please use the 'Upload Video' tab."
        else:
            clean_msg = "This link could not be accessed directly. Please upload the video file instead."

        state.update("failed", 0, clean_msg, error=clean_msg)


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
async def create_video(
    payload: VideoCreateRequest,
    background_tasks: BackgroundTasks,
) -> VideoResponse:
    try:
        if not payload.rights_confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rights confirmation is required. You must certify rights to analyze this video.",
            )
        video_id = str(uuid.uuid4())
        state = get_or_create_pipeline_state(video_id)

        if payload.source_url and payload.source_url.strip():
            clean_url = payload.source_url.strip()
            state.update("ingest", 5, "Video link queued. Connecting to stream...")

            user_stats: list[dict[str, Any]] = []
            now_iso = datetime.now(UTC).isoformat()
            if payload.known_views is not None and payload.known_views > 0:
                user_stats.append({"metric": "views", "value": payload.known_views, "source": "manual", "fetched_at": now_iso})
            if payload.known_likes is not None and payload.known_likes > 0:
                user_stats.append({"metric": "likes", "value": payload.known_likes, "source": "manual", "fetched_at": now_iso})
            if payload.known_shares is not None and payload.known_shares > 0:
                user_stats.append({"metric": "shares", "value": payload.known_shares, "source": "manual", "fetched_at": now_iso})
            if payload.known_comments is not None and payload.known_comments > 0:
                user_stats.append({"metric": "comments", "value": payload.known_comments, "source": "manual", "fetched_at": now_iso})

            background_tasks.add_task(download_and_process_url_background, video_id, clean_url, user_stats=user_stats)

            return VideoResponse(
                id=video_id,
                source_type=payload.source_type,
                status="processing",
                stage="ingest",
                storage_key=f"urls/{video_id}",
                created_at=datetime.now(UTC),
            )

        # Reservation for direct upload
        return VideoResponse(
            id=video_id,
            source_type=payload.source_type,
            status="queued",
            stage="ingest",
            storage_key=None,
            created_at=datetime.now(UTC),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to queue video: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server queue error: {e!s}",
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
    known_views: float | None = Form(None),
    known_likes: float | None = Form(None),
    known_shares: float | None = Form(None),
    known_comments: float | None = Form(None),
) -> VideoResponse:
    try:
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
        safe_filename = Path(file.filename or "video.mp4").name
        target_file = target_dir / safe_filename

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

        initial_stats: list[dict[str, Any]] = []
        now_iso = datetime.now(UTC).isoformat()
        if known_views is not None and known_views > 0:
            initial_stats.append({"metric": "views", "value": known_views, "source": "manual", "fetched_at": now_iso})
        if known_likes is not None and known_likes > 0:
            initial_stats.append({"metric": "likes", "value": known_likes, "source": "manual", "fetched_at": now_iso})
        if known_shares is not None and known_shares > 0:
            initial_stats.append({"metric": "shares", "value": known_shares, "source": "manual", "fetched_at": now_iso})
        if known_comments is not None and known_comments > 0:
            initial_stats.append({"metric": "comments", "value": known_comments, "source": "manual", "fetched_at": now_iso})

        # Initialize state and schedule pipeline execution
        state = get_or_create_pipeline_state(video_id)
        state.update("ingest", 5, "Upload received. Scheduling media pipeline...")
        background_tasks.add_task(
            execute_pipeline_background,
            video_id,
            target_file,
            initial_stats=initial_stats if initial_stats else None,
        )

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process video upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server upload error: {e!s}",
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
                    "message": state.error or f"Stage: {state.stage}",
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
        use_brain_memory=payload.use_brain_memory,
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
    Validates originality status before permitting draft video generation per Rule 4,
    synthesizes flowing voiceover track (Rule 21), generates shot clips with Style Lock (Rule 22),
    and assembles 9:16 draft video with <= 200ms audio-video sync.
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

    from workers.draft_pipeline import run_draft_generation

    try:
        draft_meta = run_draft_generation(concept_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Draft video generation failed: {e!s}",
        ) from e

    return {
        "concept_id": concept_id,
        "status": "ready_for_generation",
        "shots_count": len(concept.get("shots", [])),
        "style_lock": concept.get("style_lock"),
        "message": "Originality check passed (0 plagiarized 5-grams). Draft video generated and synchronized.",
        **draft_meta,
    }


@app.get("/v1/concepts/{concept_id}/draft", tags=["Remix"])
async def get_concept_draft(concept_id: str) -> dict[str, Any]:
    """Retrieves metadata and asset URLs for a previously generated draft video."""
    draft_file = DRAFTS_DIR / concept_id / "draft_data.json"
    if not draft_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Draft video for concept '{concept_id}' has not been generated yet.",
        )
    return json.loads(draft_file.read_text(encoding="utf-8"))


@app.get("/v1/concepts/{concept_id}/export", tags=["Remix"])
async def export_concept_draft_video(concept_id: str) -> FileResponse:
    """Exports and downloads the assembled 9:16 draft MP4 file."""
    video_path = DRAFTS_DIR / concept_id / "final.mp4"
    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Final assembled video for concept '{concept_id}' not found.",
        )
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"framedna_{concept_id}_draft.mp4",
    )


# ---------------------------------------------------------
# Brain Persistent Knowledge Base Routes
# ---------------------------------------------------------

@app.get("/v1/brain", tags=["Brain"])
async def get_brain_memory() -> dict[str, Any]:
    """Returns the persistent frame-by-frame memory metrics, categorized patterns, and indexed video registry."""
    from workers.brain.memory import brain_memory
    return brain_memory.get_brain_summary()


@app.get("/v1/brain/recommendations", tags=["Brain"])
async def get_brain_recommendations(
    product: str,
    platform: str = "reels",
    duration_s: int = 30,
    goal: str = "conversions",
) -> dict[str, Any]:
    """Synthesizes cross-video patterns across all clips in the Brain to recommend optimal hooks, rhythm, and style."""
    from workers.brain.memory import brain_memory
    return brain_memory.get_creation_recommendations(
        product_or_topic=product, platform=platform, target_duration_s=duration_s, goal=goal
    )


@app.post("/v1/brain/sync", tags=["Brain"])
async def sync_brain_memory() -> dict[str, Any]:
    """Scans and indexes any unindexed historical video analyses into persistent brain memory."""
    from workers.brain.memory import brain_memory
    synced = brain_memory.sync_existing_analyses()
    return {"status": "ok", "synced": synced, "total_videos": len(brain_memory.data.get("videos", {}))}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=True
    )
