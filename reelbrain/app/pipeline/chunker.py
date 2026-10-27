"""
Chunking and Moment Analysis Engine for ReelBrain (Section 4 step 6).
- Chunks frames into max 45s intervals with 5s overlap.
- Executes per-moment visual analysis via VLMProvider.
- Merges results across chunks by timestamp, deduplicating boundary overlaps.
"""

import logging
from pathlib import Path
from typing import Any

from reelbrain.app.providers.vlm import LocalQwenVLProvider
from reelbrain.app.schemas.moment import MomentBreakdown

logger = logging.getLogger(__name__)


def create_chunks(
    frames: list[dict[str, Any]],
    chunk_duration_ms: int = 45000,
    overlap_duration_ms: int = 5000,
) -> list[list[dict[str, Any]]]:
    """
    Groups frames into overlapping chunks (max 45s, 5s overlap).
    """
    if not frames:
        return []

    max_t_ms = max(f["t_ms"] for f in frames)
    if max_t_ms <= chunk_duration_ms:
        return [frames]

    step_ms = chunk_duration_ms - overlap_duration_ms
    chunks: list[list[dict[str, Any]]] = []

    window_start = 0
    while window_start <= max_t_ms:
        window_end = window_start + chunk_duration_ms
        chunk_frames = [f for f in frames if window_start <= f["t_ms"] <= window_end]
        if chunk_frames:
            chunks.append(chunk_frames)
        window_start += step_ms

    return chunks


def analyze_video_moments(
    frames: list[dict[str, Any]],
    transcript_words: list[dict[str, Any]],
    ocr_results: list[dict[str, Any]],
    vlm_provider: LocalQwenVLProvider | None = None,
) -> list[MomentBreakdown]:
    """
    Runs chunked VLM moment analysis and merges results by timestamp.
    """
    if not frames:
        return []

    provider = vlm_provider or LocalQwenVLProvider()
    chunks = create_chunks(frames)

    # Build fast context lookups
    ocr_by_timestamp: dict[int, str] = {
        ocr["t_ms"]: ocr.get("combined_text", "") for ocr in ocr_results
    }

    analyzed_moments_by_time: dict[int, MomentBreakdown] = {}

    for c_idx, chunk in enumerate(chunks):
        logger.info("Analyzing chunk %d with %d frames", c_idx + 1, len(chunk))
        for frame in chunk:
            t_ms = frame["t_ms"]
            frame_path = Path(frame["frame_path"])

            # Find spoken words within 500ms of this moment
            spoken_words = [
                w["w"]
                for w in transcript_words
                if abs(w["start_ms"] - t_ms) <= 750 or (w["start_ms"] <= t_ms <= w["end_ms"])
            ]
            spoken_text = " ".join(spoken_words)
            ocr_text = ocr_by_timestamp.get(t_ms, "")

            context = {
                "spoken_text": spoken_text,
                "ocr_text": ocr_text,
                "is_keyframe": frame.get("is_keyframe", False),
            }

            moment = provider.analyze_moment(
                frame_path=frame_path,
                t_ms=t_ms,
                context=context,
            )

            # Deduplicate overlap by keeping higher confidence or first
            if t_ms not in analyzed_moments_by_time:
                analyzed_moments_by_time[t_ms] = moment
            else:
                existing = analyzed_moments_by_time[t_ms]
                if existing.confidence == "low" and moment.confidence in ["medium", "high"]:
                    analyzed_moments_by_time[t_ms] = moment

    sorted_moments = sorted(analyzed_moments_by_time.values(), key=lambda m: m.t_ms)
    return sorted_moments
