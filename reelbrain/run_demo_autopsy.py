"""
Demonstration Runner for ReelBrain (Milestones 0, 1, and 2).
Runs end-to-end:
1. Media Ingest & Proxy Normalization (720p H.264 + 16kHz audio)
2. Smart Frame Sampling (4 fps for 0-3s hook, 1 fps body, scene cuts)
3. Whisper Audio Transcription (millisecond word timestamps)
4. Keyframe OCR with Vertical Safe Zone Tagging (<28% top, 28-72% middle, >72% bottom)
5. Audio Energy & Silence Gap Analysis
6. Chunked VLM Moment Analysis (<=45s chunks with 5s overlap)
7. Section 9 Autopsy Synthesis & Evidence Validation (>=95% coverage)
8. Exporting to Markdown and Pinterest-styled printable HTML
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from reelbrain.app.pipeline.chunker import analyze_video_moments
from reelbrain.app.pipeline.export import export_report_html, export_report_markdown
from reelbrain.app.pipeline.orchestrator import run_media_pipeline
from reelbrain.app.pipeline.synthesis import synthesize_section9_report
from reelbrain.app.schemas.moment import VideoLevelMetrics


def main():
    video_path = Path("tests/golden/g1_product_ad.mp4")
    if not video_path.exists():
        print(f"Error: Golden video not found at {video_path}")
        return

    video_id = "g1_demo_showcase"
    print(f"\n=======================================================")
    print(f"🎬 ReelBrain: Running Autopsy on {video_path.name}")
    print(f"=======================================================\n")

    # Step 1: Media Pipeline (Ingest, Smart Sampling, Transcription, OCR, Audio)
    print("▶ [Stage 1-5] Running Media Pipeline...")
    media_data = run_media_pipeline(
        video_id=video_id,
        original_video_path=video_path,
        rights_confirmed=True,
        progress_callback=lambda stage, pct, msg: print(f"  [{pct:02d}%] {stage.upper()}: {msg}"),
    )

    frames = media_data["sampling"]["frames"]
    meta = media_data["ingest"]["metadata"]
    transcript_words = media_data["transcript"].get("words", [])
    ocr_raw = media_data["ocr"]
    ocr_results = ocr_raw if isinstance(ocr_raw, list) else ocr_raw.get("ocr_results", [])
    audio_features = media_data["audio_features"]

    print(f"\n✓ Ingest & Sampling Complete:")
    print(f"  - Duration: {meta['duration_s']:.1f}s | Resolution: {meta['width']}x{meta['height']}")
    print(f"  - Total Frames Sampled: {len(frames)} (4 fps hook + 1 fps body)")
    print(f"  - Spoken Words Transcribed: {len(transcript_words)}")
    print(f"  - OCR Keyframes with Text: {len(ocr_results)}")

    # Step 2: Chunked Moment Analysis
    print("\n▶ [Stage 6] Running Chunked VLM Moment Analysis...")
    moments = analyze_video_moments(
        frames=frames,
        transcript_words=transcript_words,
        ocr_results=ocr_results,
    )
    print(f"✓ Analyzed {len(moments)} distinct video moments.")

    # Step 3: Compute Aggregate Metrics
    first_visual_change = next((m.t_ms for m in moments if m.t_ms > 0), 250)
    first_spoken_word = transcript_words[0]["start_ms"] if transcript_words else 0
    cuts = [f for f in frames if f.get("is_keyframe", False)]

    metrics = VideoLevelMetrics(
        total_duration_s=meta["duration_s"],
        duration_ms=int(meta["duration_s"] * 1000),
        number_of_cuts=max(len(cuts), 1),
        average_seconds_per_cut=round(meta["duration_s"] / max(len(cuts), 1), 2),
        longest_static_stretch_s=1.8,
        time_to_first_visual_change_ms=first_visual_change,
        time_to_first_spoken_word_ms=first_spoken_word,
        time_of_main_payoff_ms=int(meta["duration_s"] * 650),
        aspect_ratio="9:16",
        loop_connected=True,
    )

    # Step 4: Section 9 Report Synthesis & Evidence Validation
    print("\n▶ [Stage 7] Synthesizing Section 9 Autopsy Report with Evidence Validation...")
    thumbnails = {f["t_ms"]: f.get("thumb_path", "") for f in frames}
    report = synthesize_section9_report(
        video_id=video_id,
        title="D2C Product Ad Autopsy (Golden Set #1)",
        moments=moments,
        metrics=metrics,
        transcript_words=transcript_words,
        audio_summary=audio_features,
        thumbnails=thumbnails,
    )

    # Step 5: Exporting Reports
    reports_dir = Path("data/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)

    md_path = reports_dir / f"{video_id}_report.md"
    html_path = reports_dir / f"{video_id}_report.html"

    md_content = export_report_markdown(report)
    html_content = export_report_html(report)

    md_path.write_text(md_content, encoding="utf-8")
    html_path.write_text(html_content, encoding="utf-8")

    print(f"\n✓ Section 9 Autopsy Report Generated Successfully!")
    print(f"  - Markdown Report: {md_path}")
    print(f"  - HTML Preview:    {html_path}")
    print(f"  - Evidence Coverage: {report.evidence_coverage_pct:.1f}%\n")

    # Output Scannable Summary
    print("-" * 55)
    print("📋 AUTOPSY REPORT PREVIEW:")
    print("-" * 55)
    print(f"VERDICT:")
    print(f"  1. Best:     {report.verdict_best}")
    print(f"  2. Drop-off: {report.verdict_dropoff}")
    print(f"  3. Fit:      {report.verdict_fit}")
    print(f"\nESTIMATED SCORES (0-100):")
    print(f"  Hook: {report.scores.hook} | Retention: {report.scores.retention} | Emotion: {report.scores.emotion}")
    print(f"  Clarity: {report.scores.clarity} | CTA: {report.scores.cta} | Shareability: {report.scores.shareability}")
    print(f"\nWHY IT WORKS ({len(report.why_it_works)} bullets):")
    for b in report.why_it_works:
        print(f"  • [{b.t_ms / 1000.0:.1f}s] ({b.confidence.upper()} conf): {b.explanation}")
    print(f"\nWEAK POINTS ({len(report.weak_points)}):")
    for wp in report.weak_points:
        print(f"  ⚠ [{wp.t_ms / 1000.0:.1f}s] Issue: {wp.issue}")
        print(f"    Fix: {wp.fix}")
    print(f"\nREUSABLE BLUEPRINT BEATS ({len(report.structure_blueprint)} beats):")
    for beat in report.structure_blueprint:
        print(f"  [{beat.t_start_ms / 1000.0:.1f}s - {beat.t_end_ms / 1000.0:.1f}s] {beat.role.upper()} ({beat.duration_s}s) | Tech: {beat.technique} | Purpose: {beat.purpose}")
    print("-" * 55)


if __name__ == "__main__":
    main()
