"""
Integration Tests for Milestone 2: Chunked Analysis, Synthesis, Evidence Validation, and Section 9 Report.
Validates:
1. Chunking engine (<=45s, 5s overlap) and timestamp overlap deduplication.
2. Moment analysis with OCR and transcript context.
3. Section 9 report layout and constraints (Verdict, Why it works <=5, Weak points <=3, Scores, Blueprint).
4. Evidence validation with 1-attempt repair (<1000ms snap) and >=95% coverage enforcement.
5. Markdown, HTML, and PDF exporters.
"""

from pathlib import Path
from typing import Any

import pytest

from reelbrain.app.pipeline.chunker import analyze_video_moments, create_chunks
from reelbrain.app.pipeline.export import (
    export_report_html,
    export_report_markdown,
    export_report_pdf,
)
from reelbrain.app.pipeline.synthesis import synthesize_section9_report
from reelbrain.app.pipeline.validator import (
    EvidenceValidationError,
    validate_and_repair_report,
)
from reelbrain.app.schemas.moment import (
    AudioFeature,
    MomentBreakdown,
    OnScreenText,
    VideoLevelMetrics,
)
from reelbrain.app.schemas.report import (
    PlatformNotes,
    Scores,
    Section9Report,
    StructureBeat,
    WeakPoint,
    WhyItWorksBullet,
)


def _make_dummy_moment(t_ms: int, role: Any = "hook", attention: Any = "pattern_interrupt") -> MomentBreakdown:
    return MomentBreakdown(
        t_ms=t_ms,
        what_is_on_screen=f"Sample visual frame at {t_ms}ms",
        subject="Product in focus",
        shot_type="close",
        camera_motion="push_in",
        on_screen_text=OnScreenText(text="TEST HEADLINE", position="middle", purpose="hook"),
        spoken_text="Watch this before buying.",
        audio=AudioFeature(music_energy="high", sfx="whoosh", voice_pace="rapid"),
        role=role,
        viewer_emotion="curiosity",
        attention_device=attention,
        why_it_works="Immediate visual contrast stops scrolling in opening seconds.",
        risk="None",
        confidence="high",
    )


def test_chunking_and_boundary_overlap():
    # Simulate 60s video with 1fps body sampling -> 60 frames
    frames = [{"t_ms": i * 1000, "frame_path": f"/tmp/f_{i}.jpg"} for i in range(60)]

    chunks = create_chunks(frames, chunk_duration_ms=45000, overlap_duration_ms=5000)
    assert len(chunks) == 2

    # Chunk 0 covers 0ms to 45000ms
    assert chunks[0][0]["t_ms"] == 0
    assert chunks[0][-1]["t_ms"] == 45000

    # Chunk 1 starts at 40000ms (5s overlap)
    assert chunks[1][0]["t_ms"] == 40000
    assert chunks[1][-1]["t_ms"] == 59000


def test_moment_analysis_deterministic_contract(tmp_path: Path):
    # Create mock frame files
    frames: list[dict[str, Any]] = []
    for t in [0, 250, 500, 1000, 3000, 5000]:
        fpath = tmp_path / f"frame_{t}.jpg"
        fpath.write_bytes(b"\xFF\xD8\xFF\xE0" + b"\x00" * 20)  # dummy JPEG header
        frames.append({"t_ms": t, "frame_path": str(fpath)})

    transcript_words = [
        {"w": "Stop", "start_ms": 0, "end_ms": 300},
        {"w": "wasting", "start_ms": 310, "end_ms": 600},
        {"w": "time", "start_ms": 610, "end_ms": 900},
    ]
    ocr_results = [
        {"t_ms": 0, "combined_text": "STOP WASTING TIME"},
        {"t_ms": 5000, "combined_text": "TRY IT TODAY"},
    ]

    moments = analyze_video_moments(
        frames=frames,
        transcript_words=transcript_words,
        ocr_results=ocr_results,
    )

    assert len(moments) == len(frames)
    assert moments[0].t_ms == 0
    assert moments[0].role == "hook"
    assert moments[-1].t_ms == 5000
    assert moments[-1].role == "problem" or moments[-1].role == "demo" or moments[-1].role == "cta"


def test_section9_synthesis_and_constraints():
    # Build a 15-second ad moment sequence
    moments = [
        _make_dummy_moment(0, role="hook", attention="pattern_interrupt"),
        _make_dummy_moment(1000, role="hook", attention="fast_cut"),
        _make_dummy_moment(3000, role="problem", attention="curiosity_gap"),
        _make_dummy_moment(6000, role="demo", attention="movement"),
        _make_dummy_moment(10000, role="proof", attention="before_after"),
        _make_dummy_moment(14000, role="cta", attention="text_pop"),
    ]

    metrics = VideoLevelMetrics(
        total_duration_s=15.0,
        duration_ms=15000,
        number_of_cuts=6,
        average_seconds_per_cut=2.5,
        longest_static_stretch_s=1.8,
        time_to_first_visual_change_ms=500,
        time_to_first_spoken_word_ms=250,
        time_of_main_payoff_ms=10000,
        aspect_ratio="9:16",
        loop_connected=True,
    )

    audio_summary = {
        "silence_gaps": [{"start_ms": 6100, "dur_ms": 600}],
        "pacing_wps": 3.1,
    }

    report = synthesize_section9_report(
        video_id="test_vid_m2_001",
        title="D2C Product Ad Breakdown",
        moments=moments,
        metrics=metrics,
        audio_summary=audio_summary,
    )

    # 1. Verdict checks
    assert len(report.verdict_best) > 0
    assert len(report.verdict_dropoff) > 0
    assert "Best fit:" in report.verdict_fit

    # 2. Why it works: max 5 bullets with timestamps
    assert 1 <= len(report.why_it_works) <= 5
    for bullet in report.why_it_works:
        assert bullet.t_ms in {m.t_ms for m in moments}
        assert bullet.confidence in ["high", "medium", "low"]
        assert len(bullet.explanation) > 0

    # 3. Weak points: up to 3 with actionable fixes
    assert len(report.weak_points) <= 3
    for wp in report.weak_points:
        assert wp.t_ms in {m.t_ms for m in moments}
        assert len(wp.fix) > 0

    # 4. Platform notes
    assert "Heuristics" in report.platform_notes.heuristic_disclaimer
    assert len(report.platform_notes.instagram_note) > 0
    assert len(report.platform_notes.tiktok_note) > 0

    # 5. Scores: 0-100 estimates
    assert 0 <= report.scores.hook <= 100
    assert 0 <= report.scores.retention <= 100
    assert 0 <= report.scores.emotion <= 100
    assert 0 <= report.scores.clarity <= 100
    assert 0 <= report.scores.cta <= 100
    assert 0 <= report.scores.shareability <= 100
    assert "estimates" in report.scores.label.lower()

    # 6. Blueprint structure
    assert len(report.structure_blueprint) >= 3
    for beat in report.structure_blueprint:
        assert beat.role in ["hook", "problem", "demo", "proof", "cta", "other"]
        assert beat.t_start_ms < beat.t_end_ms

    # 7. Evidence coverage
    assert report.evidence_coverage_pct >= 95.0


def test_evidence_validator_repair_and_enforcement():
    valid_timestamps = {0, 1000, 3000, 6000, 10000}

    # Case A: Minor offset (snapped within 1000ms)
    report = Section9Report(
        video_id="v_snap_test",
        title="Snap Test",
        verdict_best="Strong opening",
        verdict_dropoff="Middle plateau",
        verdict_fit="Reels",
        why_it_works=[
            WhyItWorksBullet(t_ms=250, explanation="Near opening", confidence="high"),  # 250ms -> snaps to 0ms
            WhyItWorksBullet(t_ms=3100, explanation="Near problem", confidence="high"),  # 3100ms -> snaps to 3000ms
        ],
        weak_points=[
            WeakPoint(t_ms=5800, issue="Pacing", fix="Cut faster"),  # 5800ms -> snaps to 6000ms
        ],
        platform_notes=PlatformNotes(instagram_note="Saveable", tiktok_note="Rewatchable"),
        scores=Scores(hook=80, retention=80, emotion=80, clarity=80, cta=80, shareability=80),
        structure_blueprint=[
            StructureBeat(role="hook", t_start_ms=50, t_end_ms=950, duration_s=1.0, technique="zoom", purpose="stop"),
        ],
        frame_table=[],
    )

    repaired = validate_and_repair_report(report, valid_timestamps)
    assert repaired.why_it_works[0].t_ms == 0
    assert repaired.why_it_works[1].t_ms == 3000
    assert repaired.weak_points[0].t_ms == 6000
    assert repaired.structure_blueprint[0].t_start_ms == 0
    assert repaired.evidence_coverage_pct == 100.0

    # Case B: Hallucinated timestamps outside 1000ms window -> Coverage drops below 95% -> raises EvidenceValidationError
    invalid_report = Section9Report(
        video_id="v_hallucinated",
        title="Hallucination Test",
        verdict_best="Visuals",
        verdict_dropoff="None",
        verdict_fit="TikTok",
        why_it_works=[
            WhyItWorksBullet(t_ms=50000, explanation="Unbacked claim 1", confidence="high"),
            WhyItWorksBullet(t_ms=80000, explanation="Unbacked claim 2", confidence="high"),
        ],
        weak_points=[],
        platform_notes=PlatformNotes(instagram_note="Note", tiktok_note="Note"),
        scores=Scores(hook=50, retention=50, emotion=50, clarity=50, cta=50, shareability=50),
        structure_blueprint=[
            StructureBeat(role="hook", t_start_ms=90000, t_end_ms=95000, duration_s=5.0, technique="zoom", purpose="test"),
        ],
        frame_table=[],
    )

    with pytest.raises(EvidenceValidationError) as exc_info:
        validate_and_repair_report(invalid_report, valid_timestamps)
    assert "below the mandatory 95.0%" in str(exc_info.value)


def test_markdown_and_html_pdf_export(tmp_path: Path):
    moments = [
        _make_dummy_moment(0, role="hook"),
        _make_dummy_moment(2000, role="demo"),
        _make_dummy_moment(5000, role="cta"),
    ]
    report = synthesize_section9_report(
        video_id="export_test_001",
        title="Viral D2C Ad Breakdown",
        moments=moments,
    )

    # 1. Test Markdown export
    md_output = export_report_markdown(report)
    assert "# Viral D2C Ad Breakdown" in md_output
    assert "## 1. Verdict" in md_output
    assert "## 2. Why It Works" in md_output
    assert "## 5. Performance Estimates" in md_output
    assert "## 7. Reusable Structure Blueprint" in md_output
    assert "[00:00.0]" in md_output

    # 2. Test HTML export
    html_output = export_report_html(report)
    assert "<!DOCTYPE html>" in html_output
    assert "Viral D2C Ad Breakdown" in html_output
    assert "Evidence Coverage:" in html_output
    assert "Reusable Structure Blueprint" in html_output

    # 3. Test PDF export path
    pdf_path = tmp_path / "reports" / "ad_autopsy.pdf"
    exported_path = export_report_pdf(report, pdf_path)
    assert exported_path.exists()
    assert exported_path.stat().st_size > 0
    # Also check companion html
    assert (tmp_path / "reports" / "ad_autopsy.html").exists()
