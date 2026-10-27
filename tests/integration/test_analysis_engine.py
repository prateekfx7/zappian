import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from workers.analysis.chunker import create_video_chunks, merge_segment_frames
from workers.analysis.validator import (
    EvidenceValidationError,
    validate_and_repair_report,
)
from workers.pipeline import run_media_pipeline

client = TestClient(app)
GOLDEN_VIDEO = Path("tests/golden/g1_product_ad.mp4")


def test_chunking_and_merge_logic():
    # 60s video -> [0, 45000], [40000, 60000]
    chunks = create_video_chunks(total_duration_ms=60000, chunk_len_ms=45000, overlap_ms=5000)
    assert len(chunks) == 2
    assert chunks[0]["t_start_ms"] == 0
    assert chunks[0]["t_end_ms"] == 45000
    assert chunks[1]["t_start_ms"] == 40000
    assert chunks[1]["t_end_ms"] == 60000

    # Test deduplication on overlap (e.g., t_ms = 42000 in both segments)
    seg1 = {"frames": [{"t_ms": 0}, {"t_ms": 42000, "confidence": "medium"}]}
    seg2 = {"frames": [{"t_ms": 42000, "confidence": "high"}, {"t_ms": 55000}]}

    merged = merge_segment_frames([seg1, seg2])
    assert len(merged) == 3
    t_timestamps = [f["t_ms"] for f in merged]
    assert t_timestamps == [0, 42000, 55000]
    assert merged[1]["confidence"] == "high"


def test_validator_detects_hallucinated_timestamps():
    available_frames = [{"t_ms": 0}, {"t_ms": 1000}, {"t_ms": 2000}]

    sample_report = {
        "schema_version": "1.0",
        "verdict": "Test verdict",
        "scores": {
            "hook": 85,
            "retention": 80,
            "emotion": 75,
            "clarity": 90,
            "cta": 80,
            "shareability": 70,
            "sales_potential_estimate": 80,
        },
        "blueprint": [
            {
                "role": "hook",
                "t_start_ms": 0,
                "t_end_ms": 2000,
                "technique": "Macro shot",
                "purpose": "Pattern interrupt",
            }
        ],
        "why_it_works": [
            {
                "category": "growth",
                "claim": "Visual shock in opening frames",
                "evidence": [{"t_ms": 50000, "frame_id": "hallucinated_frame"}],
                "confidence": "high",
            }
        ],
        "design_language": {
            "palette": ["#000000"],
            "lighting": "Studio",
            "typography": "Sans",
            "cut_rhythm_s": 2.0,
            "motion_style": "Push in",
            "music_energy": "Medium",
        },
        "fixes": [{"rank": 1, "change": "Trim start", "t_ms": 0, "expected_impact": "high"}],
        "stats": [],
    }

    # Timestamp 50000ms is not in available frames (max 2000ms), coverage drops to 0% -> raises error
    with pytest.raises(EvidenceValidationError) as exc:
        validate_and_repair_report(
            report=sample_report,
            available_frames=available_frames,
            min_coverage_threshold=95.0,
        )
    assert "below required 95.0%" in str(exc.value)


def test_end_to_end_analysis_on_golden_video():
    video_id = f"test_analysis_{uuid.uuid4().hex[:8]}"

    pipeline_result = run_media_pipeline(
        video_id=video_id,
        original_video_path=GOLDEN_VIDEO,
    )

    assert "analysis" in pipeline_result
    report = pipeline_result["analysis"]

    assert report["schema_version"] == "1.0"
    assert "verdict" in report
    assert len(report["blueprint"]) >= 3
    assert len(report["why_it_works"]) >= 4

    # Non-negotiable: Sales potential estimate must be labeled (Rule 2)
    assert "sales_potential_estimate" in report["scores"]
    assert report["scores"]["sales_potential_estimate"] > 0

    # Non-negotiable: >= 95% claims must carry valid timestamps (Rule 1 & Rule 19)
    assert report["evidence_coverage_pct"] >= 95.0

    # Test API endpoint returns the report
    res = client.get(f"/v1/videos/{video_id}/report")
    assert res.status_code == 200
    api_data = res.json()
    assert api_data["verdict"] == report["verdict"]
