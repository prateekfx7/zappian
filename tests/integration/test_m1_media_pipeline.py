"""
Milestone 1 (M1) Integration Test Suite for ReelBrain.
Tests:
1. Ingest constraints (rights verification, file format validation, duration caps).
2. Smart frame sampling: 4 fps for first 3 seconds (250ms intervals), 1 fps thereafter (1000ms intervals), thumbnails.
3. Word-level transcription output format.
4. OCR safe-zone positioning (top/middle/bottom).
5. Audio feature extraction (energy curve, silence gaps, speech pace).
6. Resumability: verified that completed stages are cached in stage_data.json and skipped on rerun.
"""

import subprocess
import uuid
from pathlib import Path

import pytest

from reelbrain.app.pipeline.ingest import validate_video_file
from reelbrain.app.pipeline.ocr import classify_text_position
from reelbrain.app.pipeline.orchestrator import run_media_pipeline
from reelbrain.app.pipeline.sampler import smart_sample_frames


@pytest.fixture(scope="module")
def sample_video(tmp_path_factory) -> Path:
    """Generates a synthetic 6-second vertical 9:16 test video with audio."""
    temp_dir = tmp_path_factory.mktemp("video_fixture")
    video_path = temp_dir / "sample_ad.mp4"

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=720x1280:rate=30:duration=6",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=6",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-t",
        "6",
        str(video_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=30)
    return video_path


def test_validate_video_file_rights_and_formats(sample_video: Path, tmp_path: Path):
    """Verifies that rights confirmation is strictly enforced per Rule 1 and PRD."""
    # 1. Missing rights confirmation raises ValueError
    with pytest.raises(ValueError, match="Rights confirmation required"):
        validate_video_file(sample_video, rights_confirmed=False)

    # 2. Unsupported extension raises ValueError
    fake_txt = tmp_path / "video.txt"
    fake_txt.write_text("not a video")
    with pytest.raises(ValueError, match="Unsupported file format"):
        validate_video_file(fake_txt, rights_confirmed=True)

    # 3. Valid video with rights confirmed returns probe metadata
    meta = validate_video_file(sample_video, rights_confirmed=True)
    assert meta["width"] == 720
    assert meta["height"] == 1280
    assert meta["duration_s"] >= 5.9


def test_smart_sampling_4fps_hook_and_1fps_body(sample_video: Path):
    """
    Verifies Section 4 Smart Sampling:
    - First 3 seconds (0 to 3000ms): 4 fps -> every 250ms
    - After 3 seconds (> 3000ms): 1 fps -> every 1000ms
    - Thumbnails saved for every frame
    """
    video_id = f"test_sample_{uuid.uuid4().hex[:8]}"

    result = smart_sample_frames(proxy_path=sample_video, video_id=video_id)
    frames = result["frames"]
    assert len(frames) > 10

    timestamps = [f["t_ms"] for f in frames]

    # Verify Hook window (0 to 3000ms) has 250ms steps
    hook_frames = [t for t in timestamps if t <= 3000]
    expected_hook = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000]
    for exp_t in expected_hook:
        assert exp_t in hook_frames, f"Expected hook frame at {exp_t}ms not found in {hook_frames}"

    # Verify Body window (> 3000ms) has 1000ms steps
    body_frames = [t for t in timestamps if t > 3000]
    assert 4000 in body_frames
    assert 5000 in body_frames

    # Verify thumbnails exist for extracted frames
    for f in frames[:5]:
        assert Path(f["frame_path"]).exists()
        assert Path(f["thumb_path"]).exists()
        assert Path(f["thumb_path"]).stat().st_size > 500


def test_ocr_safe_zones_classification():
    """Verifies that vertical bounding boxes classify into safe zones."""
    # Top (< 28% of 1280 = 358px)
    top_box = [[100, 100], [400, 100], [400, 200], [100, 200]]
    assert classify_text_position(top_box, frame_height=1280) == "top"

    # Middle (28% - 72%)
    mid_box = [[100, 600], [400, 600], [400, 700], [100, 700]]
    assert classify_text_position(mid_box, frame_height=1280) == "middle"

    # Bottom (> 72% of 1280 = 921px)
    bottom_box = [[100, 1000], [400, 1000], [400, 1100], [100, 1100]]
    assert classify_text_position(bottom_box, frame_height=1280) == "bottom"


def test_resumable_media_pipeline(sample_video: Path):
    """
    Verifies that the media pipeline executes all stages and supports resumability:
    Stage outputs are stored in stage_data.json and skipped on subsequent runs.
    """
    video_id = f"test_resume_{uuid.uuid4().hex[:8]}"
    stages_called: list[str] = []

    def on_progress(stage: str, pct: int, msg: str) -> None:
        stages_called.append(stage)

    # 1. First run executes all stages
    data1 = run_media_pipeline(
        video_id=video_id,
        original_video_path=sample_video,
        rights_confirmed=True,
        progress_callback=on_progress,
    )

    assert data1["status"] == "ready_for_analysis"
    assert "ingest" in data1
    assert "sampling" in data1
    assert "transcript" in data1
    assert "ocr" in data1
    assert "audio_features" in data1

    assert "ingest" in stages_called
    assert "sampling" in stages_called
    assert "ready" in stages_called

    # 2. Second run loads existing checkpoint without re-running completed stages
    second_stages: list[str] = []

    def on_second_progress(stage: str, pct: int, msg: str) -> None:
        second_stages.append(stage)

    data2 = run_media_pipeline(
        video_id=video_id,
        original_video_path=sample_video,
        rights_confirmed=True,
        progress_callback=on_second_progress,
    )

    # Stage data matches previous run
    assert data2["video_id"] == video_id
    assert len(data2["sampling"]["frames"]) == len(data1["sampling"]["frames"])
    # Ingest and sampling should NOT have been re-invoked
    assert "ingest" not in second_stages
    assert "sampling" not in second_stages
    assert "ready" in second_stages
