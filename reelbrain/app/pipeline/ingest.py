"""
Ingest Stage for ReelBrain (Section 4).
Handles:
- Validation of video type, size limits, duration caps (default <= 3 min / 180s).
- Mandatory rights confirmation.
- Safe link ingest (yt-dlp) with plain-language fallback ("This link couldn't be downloaded. Please upload the file instead.").
- Proxy normalization to 720p H.264 MP4 and 16kHz mono WAV extraction.
"""

import shutil
from pathlib import Path
from typing import Any

from reelbrain.app.config import settings
from workers.media.processor import (
    MediaProcessingError,
    normalize_video,
    probe_video,
    run_command_safe,
)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB


def validate_video_file(file_path: Path, rights_confirmed: bool) -> dict[str, Any]:
    """
    Validates input video file constraints:
    - Rights confirmation must be True
    - Extension must be in ALLOWED_EXTENSIONS
    - File size must be <= 500MB
    - Duration must be <= max_video_duration_s (default 180s / 3 minutes)
    """
    if not rights_confirmed:
        raise ValueError("Rights confirmation required. You must certify you own or have permission to analyze this video.")

    if not file_path.exists():
        raise FileNotFoundError(f"Video file does not exist: {file_path}")

    ext = file_path.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    size_bytes = file_path.stat().st_size
    if size_bytes == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds maximum limit of 500MB ({size_bytes / (1024*1024):.1f}MB).")

    meta = probe_video(file_path)
    dur_s = meta.get("duration_s", 0.0)

    if dur_s > settings.max_video_duration_s:
        raise ValueError(
            f"Video duration ({dur_s:.1f}s) exceeds maximum allowed length of {settings.max_video_duration_s}s (3 minutes)."
        )

    return meta


def download_video_link(url: str, output_dir: Path) -> Path:
    """
    Downloads video from URL (YouTube, TikTok, Reels) via yt-dlp.
    Respects Rule 30 & Section 1: sandboxed, timeouts, size caps, and clear fallback.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    out_template = output_dir / "downloaded_%(id)s.%(ext)s"

    if not shutil.which("yt-dlp"):
        raise MediaProcessingError("This link couldn't be downloaded because yt-dlp is not installed. Please upload the file instead.")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--max-filesize",
        "300M",
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        "mp4",
        "-o",
        str(out_template),
        url,
    ]

    try:
        run_command_safe(cmd, timeout_s=90.0)
    except Exception as e:
        raise MediaProcessingError(
            "This link couldn't be downloaded. Please upload the video file directly instead."
        ) from e

    downloaded_files = list(output_dir.glob("downloaded_*.*"))
    if not downloaded_files:
        raise MediaProcessingError(
            "This link couldn't be downloaded. Please upload the video file directly instead."
        )

    return downloaded_files[0]


def process_ingest(
    video_id: str,
    raw_video_path: Path,
    rights_confirmed: bool = True,
) -> dict[str, Any]:
    """
    Executes Ingest Stage:
    1. Validates raw input video constraints
    2. Generates 720p H.264 proxy in data/videos/{video_id}/proxy.mp4
    3. Extracts 16kHz mono WAV in data/audio/{video_id}/audio.wav
    """
    meta = validate_video_file(raw_video_path, rights_confirmed=rights_confirmed)

    video_dir = settings.data_dir / "videos" / video_id
    audio_dir = settings.data_dir / "audio" / video_id
    video_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)

    proxy_path = video_dir / "proxy.mp4"
    audio_path = audio_dir / "audio.wav"

    norm_res = normalize_video(
        input_path=raw_video_path,
        output_proxy_path=proxy_path,
        output_audio_path=audio_path,
    )

    return {
        "video_id": video_id,
        "proxy_path": str(proxy_path),
        "audio_path": str(audio_path),
        "metadata": norm_res["metadata"],
        "raw_metadata": meta,
    }
