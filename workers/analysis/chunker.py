"""
Video chunking and merge logic for long-form video understanding.
Splits video into overlapping chunks of <= 45s with 5s overlap per architecture.md §4.
Merges segment outputs, dropping duplicate timestamps in overlap regions.
"""

from typing import Any


def create_video_chunks(
    total_duration_ms: int,
    chunk_len_ms: int = 45000,
    overlap_ms: int = 5000,
) -> list[dict[str, int]]:
    """
    Creates list of overlapping chunk windows.
    If video duration is <= chunk_len_ms, returns a single chunk covering the entire duration.
    """
    if total_duration_ms <= 0:
        return [{"t_start_ms": 0, "t_end_ms": 0}]

    if total_duration_ms <= chunk_len_ms:
        return [{"t_start_ms": 0, "t_end_ms": total_duration_ms}]

    step_ms = chunk_len_ms - overlap_ms
    chunks: list[dict[str, int]] = []
    current_start = 0

    while current_start < total_duration_ms:
        current_end = min(current_start + chunk_len_ms, total_duration_ms)
        chunks.append({"t_start_ms": current_start, "t_end_ms": current_end})
        if current_end >= total_duration_ms:
            break
        current_start += step_ms

    return chunks


def slice_assets_for_chunk(
    chunk: dict[str, int],
    frames: list[dict[str, Any]],
    words: list[dict[str, Any]],
    ocr_items: list[dict[str, Any]],
) -> dict[str, Any]:
    """Filters frames, transcript words, and OCR detections belonging to this chunk's time window."""
    t_start = chunk["t_start_ms"]
    t_end = chunk["t_end_ms"]

    chunk_frames = [f for f in frames if t_start <= f["t_ms"] <= t_end]
    chunk_words = [w for w in words if t_start <= w["start_ms"] <= t_end]
    chunk_ocr = [o for o in ocr_items if t_start <= o["t_ms"] <= t_end]

    return {
        "chunk": chunk,
        "frames": chunk_frames,
        "words": chunk_words,
        "ocr": chunk_ocr,
    }


def merge_segment_frames(segment_outputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Merges frames from multiple segment outputs, deduplicating frames by `t_ms`.
    Preserves chronological order.
    """
    merged_by_timestamp: dict[int, dict[str, Any]] = {}

    for seg in segment_outputs:
        frames = seg.get("frames", [])
        for f in frames:
            t_ms = f["t_ms"]
            # If not yet seen, or if current confidence is higher, retain
            if t_ms not in merged_by_timestamp or f.get("confidence") == "high" and merged_by_timestamp[t_ms].get("confidence") != "high":
                merged_by_timestamp[t_ms] = f

    return [merged_by_timestamp[t] for t in sorted(merged_by_timestamp.keys())]
