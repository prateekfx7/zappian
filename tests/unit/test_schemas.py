import json
from pathlib import Path

import pytest
from jsonschema import ValidationError, validate


def test_segment_schema_valid():
    schema_path = Path("packages/schemas/segment.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)

    valid_payload = {
        "segment": {"t_start_ms": 0, "t_end_ms": 15000},
        "frames": [
            {
                "t_ms": 0,
                "what_is_on_screen": "Hero product unboxing",
                "subject": "product",
                "shot_type": "extreme_close",
                "camera_motion": "push_in",
                "on_screen_text": "HOOK TEXT",
                "spoken_text": "Never buy another blender",
                "role": "hook",
                "viewer_emotion": "curiosity",
                "why_it_works": "Extreme visual proximity catches attention",
                "confidence": "high",
            }
        ],
    }

    validate(instance=valid_payload, schema=schema)


def test_segment_schema_invalid_missing_evidence():
    schema_path = Path("packages/schemas/segment.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)

    invalid_payload = {
        "segment": {"t_start_ms": 0, "t_end_ms": 15000},
        "frames": [
            {
                "t_ms": 0,
                # missing 'what_is_on_screen', 'subject', etc.
                "shot_type": "invalid_type",
            }
        ],
    }

    with pytest.raises(ValidationError):
        validate(instance=invalid_payload, schema=schema)


def test_report_schema_valid():
    schema_path = Path("packages/schemas/report.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)

    valid_report = {
        "schema_version": "1.0",
        "verdict": "High-performing viral product ad driven by early visual shock",
        "scores": {
            "hook": 94,
            "retention": 88,
            "emotion": 82,
            "clarity": 90,
            "cta": 85,
            "shareability": 78,
            "sales_potential_estimate": 87,
        },
        "blueprint": [
            {
                "role": "hook",
                "t_start_ms": 0,
                "t_end_ms": 2000,
                "technique": "Extreme macro close-up",
                "purpose": "Pattern interrupt",
            }
        ],
        "why_it_works": [
            {
                "category": "growth",
                "claim": "Visual shock in first 1.2s prevents scroll-away",
                "evidence": [{"t_ms": 1200, "frame_id": "frame_1200"}],
                "confidence": "high",
            }
        ],
        "design_language": {
            "palette": ["#111111", "#e60023", "#ffffff"],
            "lighting": "High contrast studio rim lighting",
            "typography": "Bold geometric sans captions",
            "cut_rhythm_s": 1.4,
            "motion_style": "Fast push-in",
            "music_energy": "Heavy sub-bass beat drop",
        },
        "fixes": [
            {
                "rank": 1,
                "change": "Shorten silence gap before first spoken line",
                "t_ms": 800,
                "expected_impact": "high",
            }
        ],
        "stats": [
            {
                "metric": "views",
                "value": 1500000,
                "source": "youtube_api",
                "fetched_at": "2026-10-27T12:00:00Z",
            }
        ],
    }

    validate(instance=valid_report, schema=schema)
