"""
Section 9 Report Schema for ReelBrain.
Defines the simple, scannable autopsy report format:
1. Verdict (3 lines max: what it does best, where it loses people, best platform fit)
2. Why it works (5 bullets max, with timestamp, plain language, confidence)
3. Weak points (up to 3, with timestamps and one-line fixes)
4. Platform notes (Instagram Reels and TikTok notes, 2 lines each)
5. Scores (0-100, labeled as estimates: Hook, Retention, Emotion, Clarity, CTA, Shareability)
6. Stats (only if available, each with source)
7. Reusable structure (blueprint beat list with timings)
8. Frame-by-frame table (timestamp, thumbnail, role, why it works)
9. Memory note (what was saved and pattern updated)
10. Next actions ("Make an original version", "Compare with video #N", "Save to playbook")
"""

from typing import Literal

from pydantic import BaseModel, Field


class WhyItWorksBullet(BaseModel):
    t_ms: int = Field(..., description="Timestamp in milliseconds where the pattern occurs")
    explanation: str = Field(..., description="Short, plain-language explanation of why this works")
    confidence: Literal["high", "medium", "low"] = Field(
        default="high", description="Model certainty level"
    )


class WeakPoint(BaseModel):
    t_ms: int = Field(..., description="Timestamp of drop-off risk or viewer friction")
    issue: str = Field(..., description="Brief explanation of the flaw or friction")
    fix: str = Field(..., description="One-line actionable fix to improve retention/engagement")


class PlatformNotes(BaseModel):
    heuristic_disclaimer: str = Field(
        default="Heuristics from common creator practice, not guaranteed algorithm facts."
    )
    instagram_note: str = Field(
        ..., description="Two lines on save/share potential, visual consistency, and profile fit"
    )
    tiktok_note: str = Field(
        ..., description="Two lines on rewatchability, pacing, authenticity, and comment potential"
    )


class Scores(BaseModel):
    hook: int = Field(..., ge=0, le=100, description="Hook stop-rate strength (0-100)")
    retention: int = Field(..., ge=0, le=100, description="Pacing and visual rhythm (0-100)")
    emotion: int = Field(..., ge=0, le=100, description="Viewer emotional resonance (0-100)")
    clarity: int = Field(..., ge=0, le=100, description="Value proposition clarity (0-100)")
    cta: int = Field(..., ge=0, le=100, description="Action and conversion trigger (0-100)")
    shareability: int = Field(..., ge=0, le=100, description="Send-to-friend or save potential (0-100)")
    label: str = Field(
        default="Scores are estimates derived from short-form ad heuristics, not platform analytics."
    )


class SourcedStat(BaseModel):
    metric: str = Field(..., description="Metric name (e.g., views, likes, shares, saves)")
    value: float | int = Field(..., description="Recorded metric value")
    source: str = Field(..., description="Source label (e.g., yt-dlp metadata, user input, csv)")


class StructureBeat(BaseModel):
    role: str = Field(..., description="Storytelling role (e.g. hook, problem, proof, demo, cta)")
    t_start_ms: int = Field(..., description="Start timestamp in milliseconds")
    t_end_ms: int = Field(..., description="End timestamp in milliseconds")
    duration_s: float = Field(..., description="Duration in seconds")
    technique: str = Field(..., description="Editing device used (e.g. pattern interrupt, whip pan, jump cut)")
    purpose: str = Field(..., description="Why this beat exists in the ad structure")


class FrameTableRow(BaseModel):
    t_ms: int
    thumb_path: str
    what_is_on_screen: str
    role: str
    why_it_works: str


class Section9Report(BaseModel):
    """Complete Section 9 Autopsy Report for ReelBrain."""

    video_id: str
    title: str = Field(default="Video Ad Autopsy")

    # 1. Verdict (3 lines max)
    verdict_best: str = Field(..., description="Line 1: What this video does best")
    verdict_dropoff: str = Field(..., description="Line 2: Where it loses people")
    verdict_fit: str = Field(..., description="Line 3: Which platform it fits best")

    # 2. Why it works (5 bullets max)
    why_it_works: list[WhyItWorksBullet] = Field(..., max_length=5)

    # 3. Weak points (up to 3)
    weak_points: list[WeakPoint] = Field(default_factory=list, max_length=3)

    # 4. Platform notes
    platform_notes: PlatformNotes

    # 5. Scores (0-100 labeled as estimates)
    scores: Scores

    # 6. Sourced Stats (only if available)
    stats: list[SourcedStat] = Field(default_factory=list)

    # 7. Reusable Structure Blueprint
    structure_blueprint: list[StructureBeat]

    # 8. Frame-by-frame table rows
    frame_table: list[FrameTableRow]

    # 9. Memory Note
    memory_note: str = Field(
        default="Autopsy saved to episodic memory. Pattern associations queued for update."
    )

    # 10. Next Actions
    next_actions: list[str] = Field(
        default=[
            "Make an original version (Rebuild structure without copying)",
            "Compare with video #N",
            "Save winning pattern to playbook",
        ]
    )

    # Metadata & Evidence Coverage
    evidence_coverage_pct: float = Field(
        default=100.0, description="Percentage of claims backed by verified video frames"
    )
