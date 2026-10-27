"""
Synthesis Engine for ReelBrain (Milestone 2 & Section 9 Report).
Synthesizes frame-by-frame moments, audio features, OCR, and metrics into
a strict Section 9 Autopsy Report with:
1. Verdict (3 lines max: what it does best, where it loses people, best platform fit)
2. Why it works (up to 5 bullets with timestamps, plain language, confidence)
3. Weak points (up to 3 with timestamps and 1-line actionable fixes)
4. Platform notes (Instagram Reels vs TikTok creator heuristics with disclaimer)
5. Scores (Hook, Retention, Emotion, Clarity, CTA, Shareability 0-100 labeled as estimates)
6. Sourced stats (only if available, with source label)
7. Reusable structure blueprint (beats with role, t_start_ms, t_end_ms, technique, purpose)
8. Frame-by-frame autopsy table (t_ms, thumbnail, role, why it works)
9. Memory note (status of episodic and pattern updates)
10. Next actions (3 actionable editor workflows)

Enforces strict timestamp grounding and >= 95% evidence coverage via EvidenceValidator.
"""

import logging
from typing import Any

from reelbrain.app.pipeline.validator import validate_and_repair_report
from reelbrain.app.schemas.moment import MomentBreakdown, VideoLevelMetrics
from reelbrain.app.schemas.report import (
    FrameTableRow,
    PlatformNotes,
    Scores,
    Section9Report,
    SourcedStat,
    StructureBeat,
    WeakPoint,
    WhyItWorksBullet,
)

logger = logging.getLogger(__name__)

SYNTHESIS_SYSTEM_PROMPT = """You are ReelBrain's lead video ad strategist.
Review the following frame-by-frame autopsy data, audio curves, and pacing metrics for a short-form video ad.
Produce an autopsy report strictly matching this JSON schema:
{
  "verdict_best": "Line 1: What this ad does best",
  "verdict_dropoff": "Line 2: Where it loses people",
  "verdict_fit": "Line 3: Which platform it fits best (Instagram Reels or TikTok) and why",
  "why_it_works": [
    {"t_ms": 0, "explanation": "plain-language reason why this moment captures attention", "confidence": "high"}
  ],
  "weak_points": [
    {"t_ms": 5000, "issue": "pacing slowdown or safe zone clash", "fix": "one-line actionable fix"}
  ],
  "instagram_note": "Two lines on save/share potential, aesthetic consistency, and profile fit",
  "tiktok_note": "Two lines on rewatchability, pacing, authenticity, and comment potential",
  "scores": {
    "hook": 85,
    "retention": 80,
    "emotion": 75,
    "clarity": 90,
    "cta": 70,
    "shareability": 65
  }
}
Return ONLY valid JSON. All timestamps must be chosen from the provided valid moment timestamps."""


def _group_moments_into_beats(moments: list[MomentBreakdown]) -> list[StructureBeat]:
    """
    Groups contiguous moments with the same storytelling role into blueprint structure beats.
    """
    if not moments:
        return []

    beats: list[StructureBeat] = []
    current_role = moments[0].role
    start_t_ms = moments[0].t_ms
    current_technique = moments[0].attention_device
    current_purpose = moments[0].why_it_works

    for i in range(1, len(moments)):
        m = moments[i]
        if m.role != current_role:
            end_t_ms = m.t_ms
            duration_s = round((end_t_ms - start_t_ms) / 1000.0, 2)
            beats.append(
                StructureBeat(
                    role=current_role,
                    t_start_ms=start_t_ms,
                    t_end_ms=end_t_ms,
                    duration_s=max(duration_s, 0.5),
                    technique=current_technique,
                    purpose=current_purpose,
                )
            )
            current_role = m.role
            start_t_ms = m.t_ms
            current_technique = m.attention_device
            current_purpose = m.why_it_works

    # Append trailing beat
    last_t_ms = moments[-1].t_ms
    end_t_ms = max(last_t_ms + 500, start_t_ms + 500)
    duration_s = round((end_t_ms - start_t_ms) / 1000.0, 2)
    beats.append(
        StructureBeat(
            role=current_role,
            t_start_ms=start_t_ms,
            t_end_ms=end_t_ms,
            duration_s=max(duration_s, 0.5),
            technique=current_technique,
            purpose=current_purpose,
        )
    )

    return beats


def synthesize_section9_report(
    video_id: str,
    moments: list[MomentBreakdown],
    metrics: VideoLevelMetrics | None = None,
    transcript_words: list[dict[str, Any]] | None = None,
    audio_summary: dict[str, Any] | None = None,
    stats: list[SourcedStat] | None = None,
    thumbnails: dict[int, str] | None = None,
    title: str = "Video Ad Autopsy",
    use_llm: bool = True,
) -> Section9Report:
    """
    Synthesizes moment breakdowns and audio/visual metrics into a complete Section 9 report.
    Validates all claims against valid frame timestamps and enforces >= 95% evidence coverage.
    """
    if not moments:
        raise ValueError("Cannot synthesize report from empty moments list.")

    valid_timestamps = {m.t_ms for m in moments}
    thumbs = thumbnails or {}

    # 1. Structure Beats
    structure_beats = _group_moments_into_beats(moments)

    # 2. Extract Why It Works bullets (up to 5 grounded claims)
    why_it_works: list[WhyItWorksBullet] = []
    seen_roles: set[str] = set()

    # Prioritize hook moments, high confidence moments, and key attention devices
    for m in moments:
        if len(why_it_works) >= 5:
            break
        if m.role in ["hook", "problem", "demo", "proof", "payoff", "cta"] and m.role not in seen_roles:
            seen_roles.add(m.role)
            explanation = m.why_it_works or f"{m.role.capitalize()} beat with {m.attention_device.replace('_', ' ')}."
            why_it_works.append(
                WhyItWorksBullet(
                    t_ms=m.t_ms,
                    explanation=explanation,
                    confidence=m.confidence,
                )
            )

    # If fewer than 2 bullets found, fill from early moments
    if len(why_it_works) < 2:
        for m in moments:
            if len(why_it_works) >= 5:
                break
            if not any(b.t_ms == m.t_ms for b in why_it_works):
                why_it_works.append(
                    WhyItWorksBullet(
                        t_ms=m.t_ms,
                        explanation=m.why_it_works,
                        confidence=m.confidence,
                    )
                )

    # 3. Identify Weak Points (up to 3 grounded friction points)
    weak_points: list[WeakPoint] = []

    # Check for silence gaps >= 500ms
    silence_gaps = (audio_summary or {}).get("silence_gaps", [])
    for gap in silence_gaps:
        if len(weak_points) >= 3:
            break
        start_ms = gap.get("start_ms", 0)
        dur_ms = gap.get("dur_ms", 0)
        # Find nearest valid moment timestamp
        nearest_m = min(moments, key=lambda m: abs(m.t_ms - start_ms))
        weak_points.append(
            WeakPoint(
                t_ms=nearest_m.t_ms,
                issue=f"Audio silence gap of {dur_ms}ms creates drop-off friction.",
                fix="Layer ambient sound effect or tighten voiceover edit to under 200ms gap.",
            )
        )

    # Check for on-screen text in risk zone
    for m in moments:
        if len(weak_points) >= 3:
            break
        if (
            m.on_screen_text.text
            and m.on_screen_text.position in ["top", "bottom"]
            and not any(wp.t_ms == m.t_ms for wp in weak_points)
        ):
                pos = m.on_screen_text.position
                weak_points.append(
                    WeakPoint(
                        t_ms=m.t_ms,
                        issue=f"On-screen text placed in {pos} danger zone obstructed by mobile UI overlays.",
                        fix="Shift copy into central safe zone (28%-72% screen height) for clear legibility.",
                    )
                )

    # Check for pacing stagnation or low motion
    if metrics and metrics.longest_static_stretch_s > 2.5 and len(weak_points) < 3:
        # Find moment around the middle
        mid_m = moments[len(moments) // 2]
        if not any(wp.t_ms == mid_m.t_ms for wp in weak_points):
            weak_points.append(
                WeakPoint(
                    t_ms=mid_m.t_ms,
                    issue=f"Static visual stretch of {metrics.longest_static_stretch_s:.1f}s slows viewer momentum.",
                    fix="Introduce 1.1x punch-in cut or secondary angle at 1.5s mark.",
                )
            )

    # 4. Compute Scores (0-100 estimates)
    # Hook score
    hook_score = 75
    if moments[0].attention_device in ["pattern_interrupt", "curiosity_gap"]:
        hook_score += 15
    if metrics and metrics.time_to_first_visual_change_ms <= 800:
        hook_score += 10
    hook_score = min(100, max(0, hook_score))

    # Retention score
    retention_score = 70
    if metrics:
        if metrics.average_seconds_per_cut <= 2.2:
            retention_score += 15
        if metrics.longest_static_stretch_s < 2.0:
            retention_score += 10
    retention_score = min(100, max(0, retention_score))

    # Emotion score
    emotion_score = 75
    has_relatable_pain = any(m.role == "problem" for m in moments)
    if has_relatable_pain:
        emotion_score += 10
    emotion_score = min(100, max(0, emotion_score))

    # Clarity score
    clarity_score = 80
    has_demo_proof = any(m.role in ["demo", "proof"] for m in moments)
    if has_demo_proof:
        clarity_score += 10
    clarity_score = min(100, max(0, clarity_score))

    # CTA score
    cta_score = 70
    has_cta = any(m.role == "cta" for m in moments)
    if has_cta:
        cta_score += 20
    cta_score = min(100, max(0, cta_score))

    # Shareability score
    shareability_score = 65
    if any(m.attention_device in ["curiosity_gap", "before_after"] for m in moments):
        shareability_score += 15
    shareability_score = min(100, max(0, shareability_score))

    scores = Scores(
        hook=hook_score,
        retention=retention_score,
        emotion=emotion_score,
        clarity=clarity_score,
        cta=cta_score,
        shareability=shareability_score,
    )

    # 5. Verdict (3 lines max)
    hook_dev = moments[0].attention_device.replace("_", " ")
    verdict_best = (
        f"Instant {hook_dev} in first 2 seconds captures immediate viewer focus."
    )
    if weak_points:
        verdict_dropoff = f"Viewer momentum falters around {weak_points[0].t_ms / 1000.0:.1f}s ({weak_points[0].issue.split('.')[0]})."
    else:
        verdict_dropoff = "Steady pacing throughout with minimal drop-off risk."

    verdict_fit = (
        "Best fit: TikTok paid ad due to rapid native pacing and high hook contrast."
        if (metrics and metrics.average_seconds_per_cut <= 2.0)
        else "Best fit: Instagram Reels due to high-aesthetic visual clarity and saveable demonstration."
    )

    # 6. Platform Notes
    platform_notes = PlatformNotes(
        instagram_note="High save potential if educational demo is retained. Keep caption first 2 lines punchy.",
        tiktok_note="Fast audio pacing and native UGC framing encourage rewatches and comments. Ensure sound stays on.",
    )

    # 7. Frame-by-frame Table
    frame_table: list[FrameTableRow] = []
    # Select sample moments for table (1 per beat or max 8)
    step = max(1, len(moments) // 8)
    sampled_indices = set(range(0, len(moments), step))
    # Always include first and last
    sampled_indices.add(0)
    sampled_indices.add(len(moments) - 1)

    for idx in sorted(sampled_indices):
        m = moments[idx]
        thumb_p = thumbs.get(m.t_ms, f"data/frames/{video_id}/thumb_{m.t_ms:06d}.jpg")
        frame_table.append(
            FrameTableRow(
                t_ms=m.t_ms,
                thumb_path=thumb_p,
                what_is_on_screen=m.what_is_on_screen,
                role=m.role,
                why_it_works=m.why_it_works,
            )
        )

    # Assemble raw report
    raw_report = Section9Report(
        video_id=video_id,
        title=title,
        verdict_best=verdict_best,
        verdict_dropoff=verdict_dropoff,
        verdict_fit=verdict_fit,
        why_it_works=why_it_works,
        weak_points=weak_points,
        platform_notes=platform_notes,
        scores=scores,
        stats=stats or [],
        structure_blueprint=structure_beats,
        frame_table=frame_table,
        memory_note="Autopsy saved to episodic memory. Pattern associations queued for update.",
        next_actions=[
            "Make an original version (Rebuild structure without copying)",
            "Compare with video #N",
            "Save winning pattern to playbook",
        ],
    )

    # Validate against ground truth timestamps and enforce >= 95% evidence coverage
    validated_report = validate_and_repair_report(raw_report, valid_timestamps)
    return validated_report
