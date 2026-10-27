"""
Smart Frame Sampling Stage for ReelBrain (Section 4).
Algorithm:
- First 3 seconds: 4 frames per second (every 250ms) - the hook decides everything.
- After 3 seconds: 1 frame per second (every 1000ms).
- Plus one keyframe at every detected scene cut.
- Saves thumbnails (180px width) and exact timestamps in milliseconds.
"""

from pathlib import Path
from typing import Any

from reelbrain.app.config import settings
from workers.media.processor import MediaProcessingError, probe_video, run_command_safe
from workers.media.scenes import detect_scene_cuts


def extract_single_frame(
    video_path: Path,
    t_ms: int,
    output_frame: Path,
    output_thumb: Path,
) -> bool:
    """Extracts a single frame at exact millisecond timestamp and generates a 180px thumbnail."""
    output_frame.parent.mkdir(parents=True, exist_ok=True)
    output_thumb.parent.mkdir(parents=True, exist_ok=True)
    t_sec = t_ms / 1000.0

    # 1. High quality full frame
    frame_cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{t_sec:.3f}",
        "-i",
        str(video_path),
        "-vframes",
        "1",
        "-q:v",
        "2",
        str(output_frame),
    ]
    try:
        run_command_safe(frame_cmd, timeout_s=15.0)
    except (MediaProcessingError, OSError):
        return False

    if not output_frame.exists():
        return False

    # 2. Thumbnail (180px width)
    thumb_cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(output_frame),
        "-vf",
        "scale=180:-1",
        "-q:v",
        "5",
        str(output_thumb),
    ]
    try:
        run_command_safe(thumb_cmd, timeout_s=10.0)
    except (MediaProcessingError, OSError):
        pass

    return True


def smart_sample_frames(
    proxy_path: Path,
    video_id: str,
    scenes_threshold: float = 27.0,
) -> dict[str, Any]:
    """
    Executes smart frame sampling:
    - 4 fps for first 3.0s (0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000 ms)
    - 1 fps for remainder (4000, 5000, 6000 ... ms)
    - Keyframe at each scene cut
    """
    if not proxy_path.exists():
        raise FileNotFoundError(f"Proxy video not found: {proxy_path}")

    frames_dir = settings.data_dir / "frames" / video_id
    thumbs_dir = frames_dir / "thumbs"
    frames_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    meta = probe_video(proxy_path)
    dur_ms = meta.get("duration_ms", 0)

    # 1. Detect Scene Cuts via PySceneDetect
    try:
        scenes = detect_scene_cuts(proxy_path, threshold=scenes_threshold)
    except Exception:  # noqa: BLE001
        scenes = []

    scene_cut_timestamps = {s["start_ms"] for s in scenes if s["start_ms"] > 0}

    # 2. Compute target sampling timestamps
    hook_interval_ms = int(1000 / settings.hook_fps)  # 250ms
    body_interval_ms = int(1000 / settings.body_fps)  # 1000ms
    hook_cutoff_ms = int(settings.hook_duration_s * 1000)  # 3000ms

    target_timestamps: list[tuple[int, bool]] = []  # (t_ms, is_keyframe)

    # A. Hook window (4 fps)
    current_t = 0
    while current_t <= min(hook_cutoff_ms, dur_ms):
        is_kf = current_t in scene_cut_timestamps or current_t == 0
        target_timestamps.append((current_t, is_kf))
        current_t += hook_interval_ms

    # B. Body window (1 fps)
    current_t = max(current_t, hook_cutoff_ms + 1000)
    while current_t <= dur_ms:
        is_kf = current_t in scene_cut_timestamps
        target_timestamps.append((current_t, is_kf))
        current_t += body_interval_ms

    # C. Add any scene cuts not close to existing timestamps
    existing_ts = {t for t, _ in target_timestamps}
    for cut_ms in scene_cut_timestamps:
        if cut_ms <= dur_ms and not any(abs(cut_ms - ex) <= 150 for ex in existing_ts):
            target_timestamps.append((cut_ms, True))

    target_timestamps.sort(key=lambda x: x[0])

    # 3. Extract frames & thumbs
    frames_info: list[dict[str, Any]] = []

    for t_ms, is_kf in target_timestamps:
        frame_file = frames_dir / f"{t_ms}.jpg"
        thumb_file = thumbs_dir / f"{t_ms}.jpg"

        # Check if already cached (for resumability)
        if not frame_file.exists() or not thumb_file.exists():
            success = extract_single_frame(proxy_path, t_ms, frame_file, thumb_file)
            if not success:
                continue

        frames_info.append(
            {
                "t_ms": t_ms,
                "frame_path": str(frame_file),
                "thumb_path": str(thumb_file),
                "is_keyframe": is_kf,
            }
        )

    return {
        "video_id": video_id,
        "frames_count": len(frames_info),
        "frames": frames_info,
        "scenes_count": len(scenes),
        "scenes": scenes,
    }
