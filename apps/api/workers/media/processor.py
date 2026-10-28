"""
FFmpeg shell-out wrapper for video probing, normalization, and frame extraction.
Strictly respects Rule 30:
- Uses subprocess.run without shell=True.
- Sets timeouts.
- Captures stderr and raises typed exceptions with clear messages.
"""

import json
import subprocess
from pathlib import Path
from typing import Any


class MediaProcessingError(Exception):
    """Raised when an external media processing tool (FFmpeg/ffprobe) fails."""


def run_command_safe(
    cmd: list[str], timeout_s: float = 120.0
) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
        if result.returncode != 0:
            raise MediaProcessingError(
                f"Command failed (exit {result.returncode}): {' '.join(cmd)}\nStderr: {result.stderr.strip()}"
            )
        return result
    except subprocess.TimeoutExpired as e:
        raise MediaProcessingError(
            f"Command timed out after {timeout_s}s: {' '.join(cmd)}"
        ) from e
    except FileNotFoundError as e:
        raise MediaProcessingError(
            f"Executable not found in PATH for command: {cmd[0]}"
        ) from e


def probe_video(video_path: Path) -> dict[str, Any]:
    """Inspect video dimensions, duration, and frame rate via ffprobe."""
    if not video_path.exists():
        raise FileNotFoundError(f"Video file does not exist: {video_path}")

    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,duration",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(video_path),
    ]

    result = run_command_safe(cmd, timeout_s=15.0)
    data = json.loads(result.stdout)

    streams = data.get("streams", [])
    format_info = data.get("format", {})

    width = 0
    height = 0
    fps = 30.0
    duration_s = 0.0

    if streams:
        v_stream = streams[0]
        width = int(v_stream.get("width", 0))
        height = int(v_stream.get("height", 0))

        rate_str = v_stream.get("r_frame_rate", "30/1")
        if "/" in rate_str:
            num, den = rate_str.split("/")
            fps = float(num) / float(den) if float(den) != 0 else 30.0
        else:
            fps = float(rate_str)

        duration_s = float(v_stream.get("duration", 0.0))

    if duration_s <= 0 and "duration" in format_info:
        duration_s = float(format_info["duration"])

    return {
        "width": width,
        "height": height,
        "fps": round(fps, 2),
        "duration_s": round(duration_s, 3),
        "duration_ms": int(duration_s * 1000),
    }


def normalize_video(
    input_path: Path,
    output_proxy_path: Path,
    output_audio_path: Path,
) -> dict[str, Any]:
    """
    Converts input video into a 720p H.264 proxy and extracts 16kHz mono WAV audio.
    Stage 1 in architecture.md §4.
    """
    output_proxy_path.parent.mkdir(parents=True, exist_ok=True)
    output_audio_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Normalize video proxy to 720p max dimension, H.264, 30fps max
    proxy_cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        "scale=720:1280:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        str(output_proxy_path),
    ]
    run_command_safe(proxy_cmd, timeout_s=180.0)

    # 2. Extract 16kHz mono 16-bit PCM WAV for Whisper and audio features
    audio_cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(output_proxy_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output_audio_path),
    ]
    run_command_safe(audio_cmd, timeout_s=60.0)

    proxy_meta = probe_video(output_proxy_path)
    return {
        "proxy_path": str(output_proxy_path),
        "audio_path": str(output_audio_path),
        "metadata": proxy_meta,
    }


def extract_frames_1fps(
    proxy_path: Path,
    frames_dir: Path,
    thumbs_dir: Path,
) -> list[dict[str, Any]]:
    """
    Extracts 1 frame per second as JPEG, named by its timestamp in milliseconds (0.jpg, 1000.jpg...).
    Also extracts a small thumbnail (width 180px) for fast timeline rendering in UI.
    Stage 2 in architecture.md §4.
    """
    frames_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    # Use ffmpeg with fps=1 and timestamp format
    # Frame format: %d starting at 1
    pattern = frames_dir / "temp_%05d.jpg"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(proxy_path),
        "-vf",
        "fps=1",
        "-q:v",
        "3",
        str(pattern),
    ]
    run_command_safe(cmd, timeout_s=120.0)

    extracted_files = sorted(frames_dir.glob("temp_*.jpg"))
    frames_info: list[dict[str, Any]] = []

    for idx, f in enumerate(extracted_files):
        t_ms = idx * 1000
        final_frame = frames_dir / f"{t_ms}.jpg"
        f.rename(final_frame)

        thumb_file = thumbs_dir / f"{t_ms}.jpg"
        # Generate thumbnail
        thumb_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(final_frame),
            "-vf",
            "scale=180:-1",
            "-q:v",
            "5",
            str(thumb_file),
        ]
        run_command_safe(thumb_cmd, timeout_s=15.0)

        frames_info.append(
            {
                "t_ms": t_ms,
                "frame_path": str(final_frame),
                "thumb_path": str(thumb_file),
                "is_keyframe": False,
            }
        )

    return frames_info
