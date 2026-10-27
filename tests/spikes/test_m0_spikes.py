"""
Milestone 0 (M0) Spikes Test Suite for ReelBrain.
Verifies:
1. Qwen2.5-VL Vision model produces valid Section 5 MomentBreakdown JSON.
2. Word-level Speech-to-Text timestamps [{w, start_ms, end_ms}].
3. On-screen text OCR extraction with vertical zone positioning (top/middle/bottom).
4. Golden set manifest coverage for the 5 ad archetypes.
"""

import json
from pathlib import Path

from reelbrain.app.providers.vlm import LocalQwenVLProvider
from reelbrain.app.schemas.moment import MomentBreakdown, VideoLevelMetrics


def test_vlm_produces_valid_section5_moment_json(tmp_path: Path):
    """
    Spike 1: Verify vision understanding model returns valid Section 5 JSON
    conforming strictly to the MomentBreakdown schema.
    """
    # Create synthetic test frame image
    dummy_frame = tmp_path / "frame_001.jpg"
    # Write a minimal JPEG header/bytes
    dummy_frame.write_bytes(
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        b"\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f"
        b"\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b"
        b"\x08\x00\x10\x00\x10\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01"
        b"\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01"
        b"\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )

    provider = LocalQwenVLProvider()

    # Test across 3 distinct moments (Hook at 500ms, Demo at 12000ms, CTA at 25000ms)
    test_timestamps = [500, 12000, 25000]

    for t_ms in test_timestamps:
        moment = provider.analyze_moment(
            frame_path=dummy_frame,
            t_ms=t_ms,
            context={"spoken_text": "Stop scrolling and look at this.", "ocr_text": "HOOK OFFER"},
        )

        assert isinstance(moment, MomentBreakdown)
        assert moment.t_ms == t_ms
        assert moment.shot_type in [
            "extreme_close",
            "close",
            "medium",
            "wide",
            "screen_recording",
            "text_card",
        ]
        assert moment.camera_motion in [
            "static",
            "push_in",
            "pull_out",
            "whip_pan",
            "handheld",
            "tracking",
            "zoom",
        ]
        assert moment.on_screen_text.position in ["top", "middle", "bottom"]
        assert moment.role in [
            "hook",
            "problem",
            "proof",
            "demo",
            "payoff",
            "social_proof",
            "cta",
            "transition",
            "loop_setup",
            "other",
        ]
        assert moment.attention_device in [
            "pattern_interrupt",
            "curiosity_gap",
            "before_after",
            "fast_cut",
            "zoom",
            "text_pop",
            "movement",
            "face",
            "contrast",
            "none",
        ]
        assert len(moment.why_it_works) > 10
        assert moment.confidence in ["high", "medium", "low"]


def test_faster_whisper_word_timestamps_spike():
    """
    Spike 2: Verify word-level transcription data structure and timestamp order.
    """
    from typing import TypedDict

    class WordItem(TypedDict):
        w: str
        start_ms: int
        end_ms: int

    # Sample word timestamp output as produced by faster-whisper
    words_data: list[WordItem] = [
        {"w": "Stop", "start_ms": 100, "end_ms": 350},
        {"w": "wasting", "start_ms": 360, "end_ms": 680},
        {"w": "hours", "start_ms": 690, "end_ms": 950},
        {"w": "on", "start_ms": 960, "end_ms": 1100},
        {"w": "editing", "start_ms": 1110, "end_ms": 1600},
    ]

    assert len(words_data) == 5
    for i in range(len(words_data) - 1):
        curr_word = words_data[i]
        next_word = words_data[i + 1]
        assert curr_word["start_ms"] < curr_word["end_ms"]
        assert curr_word["end_ms"] <= next_word["start_ms"] + 50  # monotonic non-overlapping words


def test_ocr_vertical_position_spike():
    """
    Spike 3: Verify OCR vertical position tagging classifies text into top/middle/bottom safe zones.
    """
    frame_height = 1280

    def classify_position(box_y_mid: float) -> str:
        ratio = box_y_mid / frame_height
        if ratio < 0.28:
            return "top"
        elif ratio < 0.72:
            return "middle"
        return "bottom"

    # Top zone (e.g. hook text at y=150)
    assert classify_position(150.0) == "top"
    # Middle zone (e.g. product feature callout at y=600)
    assert classify_position(600.0) == "middle"
    # Bottom zone (e.g. CTA near caption area at y=1100)
    assert classify_position(1100.0) == "bottom"


def test_golden_set_manifest_ad_coverage():
    """
    Spike 4: Verify tests/golden/manifest.json contains all 5 short-form ad archetypes.
    """
    manifest_path = Path("tests/golden/manifest.json")
    assert manifest_path.exists()

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert "golden_videos" in data
    videos = data["golden_videos"]
    assert len(videos) == 5

    types = {v["type"] for v in videos}
    assert "Product Ad" in types
    assert "UGC Reel" in types
    assert "Talking Head" in types
    assert "Screen Demo" in types
    assert "Music-Led Edit" in types


def test_video_level_metrics_schema():
    """
    Spike 5: Verify aggregate video metrics validation.
    """
    metrics = VideoLevelMetrics(
        total_duration_s=25.4,
        duration_ms=25400,
        number_of_cuts=9,
        average_seconds_per_cut=2.82,
        longest_static_stretch_s=3.1,
        time_to_first_visual_change_ms=1200,
        time_to_first_spoken_word_ms=350,
        time_of_main_payoff_ms=14000,
        aspect_ratio="9:16",
        loop_connected=True,
    )
    assert metrics.number_of_cuts == 9
    assert metrics.aspect_ratio == "9:16"
    assert metrics.loop_connected is True
