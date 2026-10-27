"""
Master Media Pipeline Orchestrator for ReelBrain (Section 4 & Milestone 1).
Coordinates:
1. Ingest (format validation, rights verification, 720p proxy & WAV extraction)
2. Smart Frame Sampling (4 fps for 0-3s hook, 1 fps thereafter, scene cut keyframes, 180px thumbs)
3. Speech-to-Text Transcription (faster-whisper word timestamps)
4. On-Screen Text OCR (keyframes with vertical safe zone classification)
5. Audio Feature Analysis (energy curves, silence gaps, speech pace, loudness spikes)

Features:
- Resumability: Saves incremental stage checkpoints to stage_data.json.
  If any stage fails, restarting resumes from the last completed stage.
- Real-time Progress Reporting with clear stage names.
"""

import json
import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any

from reelbrain.app.config import settings
from reelbrain.app.pipeline.audio import extract_audio_features
from reelbrain.app.pipeline.ingest import process_ingest
from reelbrain.app.pipeline.ocr import run_ocr_pipeline
from reelbrain.app.pipeline.sampler import smart_sample_frames
from reelbrain.app.pipeline.transcript import transcribe_video_audio

logger = logging.getLogger(__name__)


def run_media_pipeline(
    video_id: str,
    original_video_path: Path,
    rights_confirmed: bool = True,
    progress_callback: Callable[[str, int, str], None] | None = None,
) -> dict[str, Any]:
    """
    Executes the end-to-end media pipeline with stage-level resumability.
    """
    analysis_dir = settings.data_dir / "analyses" / video_id
    analysis_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_file = analysis_dir / "stage_data.json"

    # Load existing checkpoint if available
    stage_data: dict[str, Any] = {"video_id": video_id}
    if checkpoint_file.exists():
        try:
            stage_data = json.loads(checkpoint_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            stage_data = {"video_id": video_id}

    def _save_checkpoint() -> None:
        checkpoint_file.write_text(json.dumps(stage_data, indent=2), encoding="utf-8")

    # STAGE 1: INGEST
    if "ingest" not in stage_data:
        if progress_callback:
            progress_callback("ingest", 15, "Normalizing 720p video proxy and extracting 16kHz audio track...")
        ingest_res = process_ingest(
            video_id=video_id,
            raw_video_path=original_video_path,
            rights_confirmed=rights_confirmed,
        )
        stage_data["ingest"] = ingest_res
        _save_checkpoint()
    else:
        logger.info("Resuming: Ingest stage already completed for video %s", video_id)

    proxy_path = Path(stage_data["ingest"]["proxy_path"])
    audio_path = Path(stage_data["ingest"]["audio_path"])

    # STAGE 2: SMART FRAME SAMPLING (4 fps hook, 1 fps body, scene cuts)
    if "sampling" not in stage_data:
        if progress_callback:
            progress_callback("sampling", 35, "Sampling hook frames at 4 fps and body frames at 1 fps...")
        sample_res = smart_sample_frames(proxy_path=proxy_path, video_id=video_id)
        stage_data["sampling"] = sample_res
        _save_checkpoint()
    else:
        logger.info("Resuming: Sampling stage already completed for video %s", video_id)

    frames = stage_data["sampling"]["frames"]

    # STAGE 3: TRANSCRIPTION (faster-whisper word timestamps)
    if "transcript" not in stage_data:
        if progress_callback:
            progress_callback("transcribe", 60, "Transcribing voiceover with word-level millisecond timestamps...")
        transcript_res = transcribe_video_audio(audio_path=audio_path)
        stage_data["transcript"] = transcript_res
        _save_checkpoint()
    else:
        logger.info("Resuming: Transcription stage already completed for video %s", video_id)

    # STAGE 4: ON-SCREEN TEXT OCR (keyframes with vertical safe zone classification)
    if "ocr" not in stage_data:
        if progress_callback:
            progress_callback("ocr", 78, "Extracting on-screen text and classifying vertical safe zones...")
        frame_h = stage_data["ingest"]["metadata"].get("height", 1280)
        ocr_res = run_ocr_pipeline(frames=frames, frame_height=frame_h)
        stage_data["ocr"] = ocr_res
        _save_checkpoint()
    else:
        logger.info("Resuming: OCR stage already completed for video %s", video_id)

    # STAGE 5: AUDIO FEATURE EXTRACTION (energy curves, silence gaps, pace)
    if "audio_features" not in stage_data:
        if progress_callback:
            progress_callback("audio_features", 90, "Analyzing audio energy curve, silence gaps, and speech pace...")
        audio_res = extract_audio_features(
            audio_path=audio_path,
            transcript_words=stage_data["transcript"].get("words", []),
        )
        stage_data["audio_features"] = audio_res
        _save_checkpoint()
    else:
        logger.info("Resuming: Audio features stage already completed for video %s", video_id)

    # Finalization
    stage_data["status"] = "ready_for_analysis"
    _save_checkpoint()

    if progress_callback:
        progress_callback("ready", 100, "Ingest and media pipeline completed successfully.")

    return stage_data
