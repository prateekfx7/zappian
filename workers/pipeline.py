"""
Media pipeline orchestrator executing stages 0 to 5 per architecture.md §4.
Idempotent and resumable per Rules 9 and 10.
Emits real-time progress events for SSE.
"""

import json
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from workers.analysis.ocr import run_ocr_on_keyframes
from workers.analysis.transcribe import transcribe_audio
from workers.media.audio import analyze_audio_features
from workers.media.processor import (
    extract_frames_1fps,
    normalize_video,
    probe_video,
)
from workers.media.scenes import detect_scene_cuts, extract_keyframe_at_timestamp

def get_storage_base() -> Path:
    base = Path("storage")
    try:
        base.mkdir(parents=True, exist_ok=True)
        test_f = base / ".write_test"
        test_f.touch()
        test_f.unlink(missing_ok=True)
        return base
    except OSError:
        tmp_base = Path("/tmp/storage")
        tmp_base.mkdir(parents=True, exist_ok=True)
        return tmp_base

STORAGE_BASE = get_storage_base()


class PipelineState:
    """Tracks running progress and stage state."""

    def __init__(self, video_id: str):
        self.video_id = video_id
        self.stage = "queued"
        self.progress_pct = 0
        self.error: str | None = None
        self.data: dict[str, Any] = {}
        self.listeners: list[Callable[[dict[str, Any]], None]] = []

    def update(
        self,
        stage: str,
        progress_pct: int,
        message: str,
        payload: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        self.stage = stage
        self.progress_pct = progress_pct
        if stage == "failed":
            self.error = error or message
        elif error:
            self.error = error

        event = {
            "video_id": self.video_id,
            "stage": stage,
            "progress_pct": progress_pct,
            "message": message,
            "error": self.error,
            "timestamp": datetime.now(UTC).isoformat(),
            "payload": payload or {},
        }
        for listener in self.listeners:
            try:
                listener(event)
            except Exception:  # noqa: BLE001, S110
                pass


# Global in-memory pipeline state cache for SSE events
PIPELINE_STATES: dict[str, PipelineState] = {}


def get_or_create_pipeline_state(video_id: str) -> PipelineState:
    if video_id not in PIPELINE_STATES:
        PIPELINE_STATES[video_id] = PipelineState(video_id)
    return PIPELINE_STATES[video_id]


def run_media_pipeline(
    video_id: str,
    original_video_path: Path,
    whisper_model_size: str = "base",
    on_progress: Callable[[dict[str, Any]], None] | None = None,
    initial_stats: list[dict[str, Any]] | None = None,
    social_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Executes stages 0 through 5:
    0: Ingest probe
    1: Normalize (720p proxy + 16kHz WAV)
    2: Frames & scenes (1 fps + scene cut keyframes)
    3: Transcribe (Whisper word timestamps)
    4: OCR (Keyframes)
    5: Audio features (Energy & silence gaps)
    """
    state = get_or_create_pipeline_state(video_id)
    if on_progress:
        state.listeners.append(on_progress)

    data_dir = STORAGE_BASE / "analyses" / video_id
    data_dir.mkdir(parents=True, exist_ok=True)
    cache_file = data_dir / "pipeline_data.json"

    # Idempotency check: if pipeline_data.json already exists and is complete, return it
    if cache_file.exists() and not initial_stats:
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)
                state.update("ready", 100, "Loaded from completed pipeline cache.")
                return cached_data
        except (json.JSONDecodeError, OSError):
            pass

    results: dict[str, Any] = {
        "video_id": video_id,
        "stats": initial_stats or [],
        "social_metadata": social_metadata or {},
    }

    try:
        # Stage 0: Ingest & Probe
        state.update(
            "ingest", 10, "Probing video dimensions, duration, and frame rate..."
        )
        meta = probe_video(original_video_path)
        results["metadata"] = meta

        # Stage 1: Normalize
        state.update(
            "normalize", 25, "Transcoding 720p proxy and extracting 16kHz WAV audio..."
        )
        proxy_path = STORAGE_BASE / "proxies" / f"{video_id}.mp4"
        audio_path = STORAGE_BASE / "audio" / f"{video_id}.wav"
        norm_result = normalize_video(original_video_path, proxy_path, audio_path)
        results["proxy_path"] = str(proxy_path)
        results["audio_path"] = str(audio_path)
        results["proxy_metadata"] = norm_result["metadata"]

        # Stage 2: Extract Frames & Detect Scenes
        state.update(
            "frames", 45, "Extracting 1 fps frames and detecting scene cut keyframes..."
        )
        frames_dir = STORAGE_BASE / "frames" / video_id
        thumbs_dir = STORAGE_BASE / "thumbs" / video_id
        frames_info = extract_frames_1fps(proxy_path, frames_dir, thumbs_dir)

        # Scene detection
        scene_cuts = detect_scene_cuts(proxy_path)
        keyframe_set: set[int] = set()

        for cut in scene_cuts:
            cut_ms = cut["start_ms"]
            if cut_ms > 0:
                kf_path = frames_dir / f"kf_{cut_ms}.jpg"
                if extract_keyframe_at_timestamp(proxy_path, cut_ms, kf_path):
                    keyframe_set.add(cut_ms)
                    frames_info.append(
                        {
                            "t_ms": cut_ms,
                            "frame_path": str(kf_path),
                            "thumb_path": str(kf_path),
                            "is_keyframe": True,
                        }
                    )

        frames_info.sort(key=lambda x: x["t_ms"])
        results["frames"] = frames_info
        results["scenes"] = scene_cuts

        # Stage 3: Transcribe with Whisper
        state.update(
            "transcribe", 65, "Transcribing spoken audio with word-level timestamps..."
        )
        transcript = transcribe_audio(audio_path, model_size=whisper_model_size)
        results["transcript"] = transcript

        # Stage 4: OCR on Keyframes
        state.update("ocr", 80, "Detecting on-screen text and titles from keyframes...")
        ocr_results = run_ocr_on_keyframes(frames_info)
        results["ocr"] = ocr_results

        # Stage 5: Audio Features
        state.update(
            "audio_features", 85, "Analyzing audio energy curves and silence gaps..."
        )
        audio_features = analyze_audio_features(audio_path)
        results["audio_features"] = audio_features

        # Stage 6: VLM Segment Analysis & Synthesis (Phase 2)
        state.update(
            "synthesize", 92, "Synthesizing frame-by-frame blueprint and calculating evidence scores..."
        )
        from workers.analysis.engine import run_full_analysis
        analysis_result = run_full_analysis(pipeline_data=results)
        results["analysis"] = analysis_result["report"]
        results["segments"] = analysis_result["segments"]

        # Stage 7: Ready
        state.update(
            "ready", 100, "Autopsy analysis and evidence validation complete.", results
        )
        with open(cache_file, "w") as f:
            json.dump(results, f, indent=2)

        # Index in Brain Memory Engine for cross-video intelligence
        try:
            from workers.brain.memory import brain_memory
            brain_memory.index_video(video_id=video_id, pipeline_data=results)
        except Exception:
            pass

        return results

    except Exception as e:
        state.error = str(e)
        state.update("failed", state.progress_pct, f"Pipeline error: {e!s}")
        raise
