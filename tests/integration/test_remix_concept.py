"""
Integration tests for Phase 4: Remix Concept Generator & Originality Audit.
Verifies:
- Rule 4: Not a copy. Reuses structure and pacing only.
- Rule 21: Spoken script is ONE continuous flowing paragraph without section labels.
- Rule 22: Style Lock is appended to every shot prompt.
- Phase 4 Acceptance: 0 matches > 5-gram overlap, visual similarity < 0.80, concept judge passes.
"""

import json
import uuid

from fastapi.testclient import TestClient

from apps.api.main import ANALYSES_DIR, CONCEPTS_DIR, app
from workers.remix.generator import generate_remix_concept
from workers.remix.originality import calculate_ngram_overlap, run_originality_check

client = TestClient(app)


def test_ngram_overlap_and_plagiarism_detection():
    """Verify 5-gram and consecutive word math correctly catches copied scripts."""
    source_transcript = (
        "This is the best portable vacuum cleaner for your car with incredible suction power and battery life."
    )

    # Identical text should fail with 100% overlap
    overlap_pct, max_run = calculate_ngram_overlap(source_transcript, source_transcript, n=5)
    assert overlap_pct == 100.0
    assert max_run >= 10

    # Completely different text should have 0% overlap
    new_script = (
        "Hydrate faster during high intensity workouts with our ceramic lined titanium thermal bottle."
    )
    diff_overlap, diff_run = calculate_ngram_overlap(new_script, source_transcript, n=5)
    assert diff_overlap == 0.0
    assert diff_run <= 2

    # Check originality verdict
    check_pass = run_originality_check(
        new_script=new_script,
        source_transcript=source_transcript,
        shots=[{"description": "Hero bottle in mountain setting", "shot_type": "Close-up"}],
        source_frames=[{"what_is_on_screen": "Vacuum in car seat", "subject": "Vacuum"}],
        product_or_topic="Titanium Thermal Bottle",
        source_topic="Portable Car Vacuum",
    )
    assert check_pass["status"] == "passed"
    assert check_pass["concept_judge"]["passed"] is True
    assert check_pass["text_overlap_pct"] == 0.0

    # Copy text must fail
    check_fail = run_originality_check(
        new_script=source_transcript,
        source_transcript=source_transcript,
        shots=[{"description": "Vacuum in car", "shot_type": "Close-up"}],
        source_frames=[{"what_is_on_screen": "Vacuum in car seat", "subject": "Vacuum"}],
        product_or_topic="Portable Car Vacuum",
        source_topic="Portable Car Vacuum",
    )
    assert check_fail["status"] == "failed"
    assert check_fail["concept_judge"]["passed"] is False


def test_remix_concept_generation_on_golden_blueprint():
    """
    Verify complete concept synthesis adhering to Rule 4, Rule 21, and Rule 22:
    - 3 ranked hooks.
    - One flowing spoken paragraph (no section markers inside).
    - Style lock on every shot prompt.
    - Originality check passes.
    """
    dummy_source = {
        "video_id": f"vid_{uuid.uuid4().hex[:6]}",
        "metadata": {"duration_s": 30, "duration_ms": 30000},
        "frames": [
            {"what_is_on_screen": "Chef chopping vegetables quickly", "subject": "Kitchen knife"}
        ],
        "transcript": {
            "text": "Never use a dull blade again because this Japanese chef knife cuts through frozen meat effortlessly."
        },
        "analysis": {
            "blueprint": [
                {"role": "hook", "t_start_ms": 0, "t_end_ms": 3000, "technique": "Extreme close-up slice", "purpose": "Hook attention"},
                {"role": "problem", "t_start_ms": 3000, "t_end_ms": 9000, "technique": "Splitting tomatoes smoothly", "purpose": "Demonstrate sharpness"},
                {"role": "demo", "t_start_ms": 9000, "t_end_ms": 22000, "technique": "Paper test slicing", "purpose": "Undeniable proof"},
                {"role": "cta", "t_start_ms": 22000, "t_end_ms": 30000, "technique": "Offer overlay", "purpose": "Drive sales"},
            ]
        },
    }

    concept = generate_remix_concept(
        source_video_data=dummy_source,
        product_or_topic="Noise-Canceling Wireless Earbuds",
        target_audience="daily subway commuters",
        platform="tiktok",
        target_duration_s=30,
        goal="conversions",
        tone="energetic",
    )

    # 1. Check 3 Ranked Hooks
    assert len(concept["hooks"]) == 3
    assert concept["hooks"][0]["rank"] == 1
    assert "Noise-Canceling Wireless Earbuds" in concept["hooks"][0]["text"]

    # 2. Check Rule 21: One continuous spoken paragraph, NO Hook/Step/CTA labels inside
    script = concept["spoken_script"]
    assert len(script) > 50
    assert "[Hook]" not in script
    assert "[Problem]" not in script
    assert "[Demo]" not in script
    assert "[CTA]" not in script
    assert "\n\n" not in script  # Single continuous paragraph

    # 3. Check Rule 22: Style Lock on every shot prompt
    style_lock = concept["style_lock"]
    assert "STYLE LOCK:" in style_lock
    assert len(concept["shots"]) == 4

    for shot in concept["shots"]:
        assert shot["prompt_ltx"].endswith(style_lock)
        assert shot["prompt_wan"].endswith(style_lock)
        assert shot["duration_s"] > 0

    # 4. Phase 4 Acceptance: Originality check passes
    orig = concept["originality"]
    assert orig["status"] == "passed"
    assert orig["text_overlap_pct"] == 0.0
    assert orig["max_consecutive_words"] <= 3
    assert orig["visual_similarity_score"] < 0.80
    assert orig["concept_judge"]["passed"] is True


def test_remix_concept_api_endpoints():
    """Verify POST /v1/concepts and POST /v1/concepts/{id}/generate endpoints."""
    test_id = f"test_vid_{uuid.uuid4().hex[:8]}"
    test_dir = ANALYSES_DIR / test_id
    test_dir.mkdir(parents=True, exist_ok=True)
    cache_file = test_dir / "pipeline_data.json"

    dummy_data = {
        "video_id": test_id,
        "metadata": {"duration_s": 25, "duration_ms": 25000},
        "frames": [{"what_is_on_screen": "Sneakers walking on concrete", "subject": "Shoes"}],
        "transcript": {"text": "These are the most comfortable running shoes on the market."},
        "analysis": {
            "blueprint": [
                {"role": "hook", "t_start_ms": 0, "t_end_ms": 3000, "technique": "Jump cut", "purpose": "Hook"},
                {"role": "cta", "t_start_ms": 20000, "t_end_ms": 25000, "technique": "Text banner", "purpose": "Click"},
            ]
        },
    }
    cache_file.write_text(json.dumps(dummy_data), encoding="utf-8")

    try:
        # Create remix concept
        res = client.post(
            "/v1/concepts",
            json={
                "source_video_id": test_id,
                "product_or_topic": "Ergonomic Mechanical Keyboard",
                "target_audience": "software engineers",
                "platform": "youtube_shorts",
                "target_duration_s": 25,
                "goal": "conversions",
                "tone": "minimalist",
            },
        )
        assert res.status_code == 200
        concept = res.json()
        assert concept["originality"]["status"] == "passed"
        concept_id = concept["concept_id"]

        # Retrieve concept via GET
        get_res = client.get(f"/v1/concepts/{concept_id}")
        assert get_res.status_code == 200
        assert get_res.json()["concept_id"] == concept_id

        # Trigger generation endpoint (checks originality gate)
        gen_res = client.post(f"/v1/concepts/{concept_id}/generate")
        assert gen_res.status_code == 200
        assert gen_res.json()["status"] == "ready_for_generation"

    finally:
        import shutil
        shutil.rmtree(test_dir, ignore_errors=True)
        (CONCEPTS_DIR / f"{concept_id}.json").unlink(missing_ok=True)
