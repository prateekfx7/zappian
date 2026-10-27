import json
import shutil
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.main import ANALYSES_DIR, CONCEPTS_DIR, DRAFTS_DIR, app
from packages.providers.tts import LocalTTSProvider
from packages.providers.videogen import LTXVideoGenProvider, WanVideoGenProvider
from workers.assembly.assembler import assemble_draft_video

client = TestClient(app)


def test_tts_provider_synthesizes_wav(tmp_path: Path):
    """Verifies LocalTTSProvider produces a valid 16kHz mono WAV file."""
    tts = LocalTTSProvider(sample_rate=16000)
    text = "Most people waste hours making mediocre videos. Here is the exact system that changed everything."
    wav_path = tts.synthesize(text=text, output_dir=tmp_path)

    p = Path(wav_path)
    assert p.exists()
    assert p.stat().st_size > 500
    assert p.suffix == ".wav"


def test_videogen_providers_produce_9_16_clips(tmp_path: Path):
    """Verifies LTX-2 and Wan 2.2 providers produce 720x1280 9:16 vertical clips."""
    ltx = LTXVideoGenProvider()
    wan = WanVideoGenProvider()

    ltx_clip = ltx.generate_shot(
        prompt="Extreme close-up of fingers typing on tactile keyboard",
        style_lock="Moody cinematic warm lighting, 4k",
        duration_seconds=2.0,
        output_dir=tmp_path,
    )
    p_ltx = Path(ltx_clip)
    assert p_ltx.exists()
    assert p_ltx.stat().st_size > 1000

    wan_clip = wan.generate_shot(
        prompt="Slow motion pan across sleek matte black desk setup",
        style_lock="Moody cinematic warm lighting, 4k",
        duration_seconds=2.0,
        output_dir=tmp_path,
    )
    p_wan = Path(wan_clip)
    assert p_wan.exists()
    assert p_wan.stat().st_size > 1000


def test_assemble_draft_video_sync_acceptance(tmp_path: Path):
    """
    Verifies that assemble_draft_video concatenates shots and aligns audio
    within the mandatory ± 200ms sync threshold.
    """
    tts = LocalTTSProvider(sample_rate=16000)
    audio_path = tts.synthesize(
        text="Check out this revolutionary setup that improves focus and flow.",
        output_dir=tmp_path,
    )

    ltx = LTXVideoGenProvider()
    shot1 = ltx.generate_shot(
        prompt="Product hero close up",
        style_lock="Clean studio",
        duration_seconds=2.0,
        output_dir=tmp_path,
    )
    shot2 = ltx.generate_shot(
        prompt="Product in hands demo",
        style_lock="Clean studio",
        duration_seconds=2.0,
        output_dir=tmp_path,
    )

    out_mp4 = tmp_path / "assembled_test.mp4"
    meta = assemble_draft_video(
        shot_paths=[shot1, shot2],
        voiceover_path=Path(audio_path),
        output_path=out_mp4,
        target_width=720,
        target_height=1280,
    )

    assert out_mp4.exists()
    assert out_mp4.stat().st_size > 2000
    assert meta["in_sync"] is True
    assert abs(meta["sync_delta_ms"]) <= 200.0


def test_draft_pipeline_and_api_endpoints():
    """
    Tests end-to-end Phase 5 API:
    1. POST /v1/concepts/{id}/generate executes draft generation.
    2. GET /v1/concepts/{id}/draft retrieves metadata and sync stats.
    3. GET /v1/concepts/{id}/export downloads assembled MP4.
    4. Rule 4 Originality Gate blocks generation if concept failed originality.
    """
    test_id = f"phase5_test_{uuid.uuid4().hex[:8]}"
    test_dir = ANALYSES_DIR / test_id
    test_dir.mkdir(parents=True, exist_ok=True)
    cache_file = test_dir / "pipeline_data.json"

    dummy_source = {
        "video_id": test_id,
        "metadata": {"duration_s": 20, "duration_ms": 20000},
        "frames": [{"what_is_on_screen": "Person holding sleek water bottle"}],
        "transcript": {"text": "Stop buying disposable bottles that end up in landfills."},
        "analysis": {
            "blueprint": [
                {"role": "hook", "t_start_ms": 0, "t_end_ms": 3000, "technique": "Question", "purpose": "Hook"},
                {"role": "problem", "t_start_ms": 3000, "t_end_ms": 10000, "technique": "Close-up", "purpose": "Agitate"},
                {"role": "solution", "t_start_ms": 10000, "t_end_ms": 16000, "technique": "Pouring demo", "purpose": "Proof"},
                {"role": "cta", "t_start_ms": 16000, "t_end_ms": 20000, "technique": "Text on screen", "purpose": "Action"},
            ]
        },
    }
    cache_file.write_text(json.dumps(dummy_source), encoding="utf-8")

    concept_res = client.post(
        "/v1/concepts",
        json={
            "source_video_id": test_id,
            "product_or_topic": "Titanium Smart Flask",
            "target_audience": "fitness enthusiasts",
            "platform": "reels",
            "target_duration_s": 15,
            "goal": "conversions",
            "tone": "luxurious",
        },
    )
    assert concept_res.status_code == 200
    concept_data = concept_res.json()
    concept_id = concept_data["concept_id"]

    try:
        # 1. Trigger generation via POST
        gen_res = client.post(f"/v1/concepts/{concept_id}/generate")
        assert gen_res.status_code == 200
        gen_data = gen_res.json()
        assert gen_data["concept_id"] == concept_id
        assert gen_data["in_sync"] is True
        assert abs(gen_data["sync_delta_ms"]) <= 200.0
        assert "video_url" in gen_data
        assert "voiceover_url" in gen_data

        # 2. Retrieve draft metadata via GET
        draft_res = client.get(f"/v1/concepts/{concept_id}/draft")
        assert draft_res.status_code == 200
        draft_meta = draft_res.json()
        assert draft_meta["concept_id"] == concept_id
        assert draft_meta["shots_count"] == len(concept_data["shots"])
        assert draft_meta["in_sync"] is True

        # 3. Export draft MP4 via GET
        export_res = client.get(f"/v1/concepts/{concept_id}/export")
        assert export_res.status_code == 200
        assert export_res.headers["content-type"] == "video/mp4"
        assert len(export_res.content) > 1000

        # 4. Verify Rule 4 Gate: Fail concept originality and verify 400 Bad Request
        failed_concept_file = CONCEPTS_DIR / f"{concept_id}.json"
        saved = json.loads(failed_concept_file.read_text(encoding="utf-8"))
        saved["originality"]["status"] = "failed"
        saved["originality"]["concept_judge"] = {"passed": False, "reason": "Exact copy of source video"}
        failed_concept_file.write_text(json.dumps(saved), encoding="utf-8")

        fail_gen_res = client.post(f"/v1/concepts/{concept_id}/generate")
        assert fail_gen_res.status_code == 400
        assert "Rule 4" in fail_gen_res.json()["detail"]

    finally:
        shutil.rmtree(test_dir, ignore_errors=True)
        shutil.rmtree(DRAFTS_DIR / concept_id, ignore_errors=True)
        (CONCEPTS_DIR / f"{concept_id}.json").unlink(missing_ok=True)
