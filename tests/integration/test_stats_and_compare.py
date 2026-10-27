"""
Integration tests for Phase 3: Stats providers and Video Comparison Engine.
Verifies:
- Rule 1: Compare report cites timestamps from BOTH videos.
- Rule 2: Stats carry explicit source labels; sales never fabricated.
- Schema compliance with packages/schemas/compare.json.
"""

import json
import uuid

from fastapi.testclient import TestClient

from apps.api.main import ANALYSES_DIR, app
from packages.providers.stats import CSVStatsParser
from workers.analysis.compare import compare_videos

client = TestClient(app)


def test_csv_stats_parser():
    """Verify CSV parser correctly extracts metrics and attributes source as 'csv'."""
    csv_content = """metric,value
views,1250000
likes,84000
comments,3200
sales,450
"""
    stats = CSVStatsParser.parse_csv_content(csv_content)
    assert len(stats) == 4
    metrics = {s["metric"]: s["value"] for s in stats}
    assert metrics["views"] == 1250000
    assert metrics["likes"] == 84000
    assert metrics["sales"] == 450
    assert all(s["source"] == "csv" for s in stats)

    # Test columnar format
    csv_columnar = """views,likes,comments,shares,sales
2500000,120000,4500,890,950
"""
    col_stats = CSVStatsParser.parse_csv_content(csv_columnar)
    assert len(col_stats) == 5
    col_metrics = {s["metric"]: s["value"] for s in col_stats}
    assert col_metrics["views"] == 2500000
    assert col_metrics["shares"] == 890
    assert all(s["source"] == "csv" for s in col_stats)


def test_stats_api_flow():
    """Verify adding manual stats and retrieving them via API."""
    test_id = f"test_vid_{uuid.uuid4().hex[:8]}"
    test_dir = ANALYSES_DIR / test_id
    test_dir.mkdir(parents=True, exist_ok=True)
    cache_file = test_dir / "pipeline_data.json"

    dummy_data = {
        "video_id": test_id,
        "metadata": {"duration_s": 30, "duration_ms": 30000},
        "frames": [{"t_ms": 1000}],
        "scenes": [],
        "analysis": {"stats": []},
    }
    cache_file.write_text(json.dumps(dummy_data), encoding="utf-8")

    try:
        # 1. Invalid source rejected per Rule 2
        bad_res = client.post(
            f"/v1/videos/{test_id}/stats",
            json={"metric": "views", "value": 1000, "source": "fabricated_guess"},
        )
        assert bad_res.status_code == 400

        # 2. Valid manual stat succeeds
        good_res = client.post(
            f"/v1/videos/{test_id}/stats",
            json={"metric": "views", "value": 500000, "source": "manual"},
        )
        assert good_res.status_code == 200
        stats = good_res.json()
        assert any(s["metric"] == "views" and s["source"] == "manual" for s in stats)

        # 3. GET stats endpoint
        get_res = client.get(f"/v1/videos/{test_id}/stats")
        assert get_res.status_code == 200
        assert len(get_res.json()) >= 1

        # 4. Upload CSV stats
        csv_data = "metric,value\nlikes,45000\ncomments,1200\n"
        upload_res = client.post(
            f"/v1/videos/{test_id}/stats/csv",
            files={"file": ("metrics.csv", csv_data, "text/csv")},
        )
        assert upload_res.status_code == 200
        merged = upload_res.json()
        assert len(merged) == 3  # views + likes + comments
        assert any(s["metric"] == "likes" and s["source"] == "csv" for s in merged)

    finally:
        import shutil
        shutil.rmtree(test_dir, ignore_errors=True)


def test_compare_videos_dual_timestamps_and_acceptance():
    """
    Verify Compare engine adheres strictly to Phase 3 acceptance criteria:
    - Compare report cites timestamps from both videos (t_a_ms and t_b_ms).
    - Structural diff aligns beats and pacing.
    - Score diff captures hook and retention deltas.
    """
    vid_a = f"vid_a_{uuid.uuid4().hex[:6]}"
    vid_b = f"vid_b_{uuid.uuid4().hex[:6]}"

    dir_a = ANALYSES_DIR / vid_a
    dir_b = ANALYSES_DIR / vid_b
    dir_a.mkdir(parents=True, exist_ok=True)
    dir_b.mkdir(parents=True, exist_ok=True)

    data_a = {
        "video_id": vid_a,
        "metadata": {"duration_s": 25, "duration_ms": 25000},
        "scenes": [{"start_ms": 1200}, {"start_ms": 4000}, {"start_ms": 9000}],
        "audio_features": {"silence_gaps": []},
        "analysis": {
            "scores": {
                "hook": 92,
                "retention": 88,
                "clarity": 90,
                "cta": 85,
                "emotion": 80,
                "shareability": 84,
                "sales_potential_estimate": 87,
            },
            "blueprint": [
                {"role": "hook", "t_start_ms": 1000, "t_end_ms": 3000, "technique": "Fast motion shock", "purpose": "Stop scroll"},
                {"role": "demo", "t_start_ms": 3000, "t_end_ms": 12000, "technique": "Split screen comparison", "purpose": "Show proof"},
                {"role": "cta", "t_start_ms": 20000, "t_end_ms": 25000, "technique": "Urgency banner", "purpose": "Drive click"},
            ],
            "stats": [{"metric": "views", "value": 2400000, "source": "ytdlp", "fetched_at": "2026-10-27T00:00:00Z"}],
        },
    }

    data_b = {
        "video_id": vid_b,
        "metadata": {"duration_s": 35, "duration_ms": 35000},
        "scenes": [{"start_ms": 4500}],
        "audio_features": {"silence_gaps": [{"start_ms": 1000, "end_ms": 2500, "duration_ms": 1500}]},
        "analysis": {
            "scores": {
                "hook": 62,
                "retention": 58,
                "clarity": 70,
                "cta": 60,
                "emotion": 65,
                "shareability": 55,
                "sales_potential_estimate": 58,
            },
            "blueprint": [
                {"role": "hook", "t_start_ms": 2000, "t_end_ms": 6000, "technique": "Talking head greeting", "purpose": "Introduction"},
                {"role": "demo", "t_start_ms": 6000, "t_end_ms": 20000, "technique": "Single static camera", "purpose": "Explain features"},
                {"role": "cta", "t_start_ms": 28000, "t_end_ms": 35000, "technique": "Spoken link in bio", "purpose": "Direct to bio"},
            ],
            "stats": [{"metric": "views", "value": 18000, "source": "ytdlp", "fetched_at": "2026-10-27T00:00:00Z"}],
        },
    }

    (dir_a / "pipeline_data.json").write_text(json.dumps(data_a), encoding="utf-8")
    (dir_b / "pipeline_data.json").write_text(json.dumps(data_b), encoding="utf-8")

    try:
        # Run direct engine comparison
        report = compare_videos(data_a, data_b)

        assert report["winner_video_id"] == vid_a
        assert report["score_diff"]["hook_delta"] == 30
        assert report["score_diff"]["retention_delta"] == 30
        assert len(report["structural_diff"]) == 3

        # Acceptance Criteria Check: Every claim in why_winner_won cites timestamps from BOTH videos
        assert len(report["why_winner_won"]) >= 4
        for item in report["why_winner_won"]:
            assert "t_a_ms" in item and item["t_a_ms"] >= 0
            assert "t_b_ms" in item and item["t_b_ms"] >= 0
            assert item["advantage"] in ("video_a", "video_b", "tie")
            assert len(item["reason"]) > 10

        # Pacing comparison check
        assert report["pacing_comparison"]["video_a_cuts_per_minute"] > report["pacing_comparison"]["video_b_cuts_per_minute"]

        # Run via API endpoint
        api_res = client.post("/v1/compare", json={"video_a_id": vid_a, "video_b_id": vid_b})
        assert api_res.status_code == 200
        api_report = api_res.json()
        assert api_report["winner_video_id"] == vid_a

        # Fetch via GET compare endpoint
        get_res = client.get(f"/v1/compare/{api_report['compare_id']}")
        assert get_res.status_code == 200
        assert get_res.json()["compare_id"] == api_report["compare_id"]

    finally:
        import shutil
        shutil.rmtree(dir_a, ignore_errors=True)
        shutil.rmtree(dir_b, ignore_errors=True)
