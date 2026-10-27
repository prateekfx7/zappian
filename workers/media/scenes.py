"""
Scene cut detection and keyframe extraction using PySceneDetect.
Captures abrupt visual cuts and shot transitions per architecture.md stage 2.
"""

import subprocess
from pathlib import Path
from typing import Any

from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector


def detect_scene_cuts(
    video_path: Path, threshold: float = 27.0
) -> list[dict[str, Any]]:
    """
    Detects scene transitions using PySceneDetect ContentDetector.
    Returns list of scenes with start_time, end_time, and duration in ms.
    """
    video = open_video(str(video_path))
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))

    scene_manager.detect_scenes(video)
    scene_list = scene_manager.get_scene_list()

    scenes: list[dict[str, Any]] = []
    for idx, scene in enumerate(scene_list):
        start_ms = int(scene[0].get_seconds() * 1000)
        end_ms = int(scene[1].get_seconds() * 1000)
        scenes.append(
            {
                "scene_index": idx,
                "start_ms": start_ms,
                "end_ms": end_ms,
                "duration_ms": end_ms - start_ms,
            }
        )

    return scenes


def extract_keyframe_at_timestamp(
    video_path: Path,
    t_ms: int,
    output_path: Path,
) -> bool:
    """Extracts a high-quality keyframe at a specific millisecond timestamp."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    t_sec = t_ms / 1000.0

    cmd = [
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
        str(output_path),
    ]

    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=10.0)
        return output_path.exists()
    except (subprocess.SubprocessError, OSError):
        return False
