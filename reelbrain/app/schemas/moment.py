"""
Moment Breakdown Schema (Section 5 of ReelBrain Specification).
Defines the per-moment and video-level schema for frame-by-frame video ad autopsy.
"""

from typing import Literal

from pydantic import BaseModel, Field


class OnScreenText(BaseModel):
    text: str = Field(..., description="Transcribed on-screen text")
    position: Literal["top", "middle", "bottom"] = Field(
        ..., description="Vertical placement on screen relative to safe zones"
    )
    purpose: str = Field(
        default="", description="Role of the text (e.g., hook headline, feature label, CTA)"
    )


class AudioFeature(BaseModel):
    music_energy: Literal["low", "medium", "high"] = Field(..., description="Perceived music energy level")
    sfx: str = Field(default="", description="Sound effect present (e.g. whoosh, ding, pop)")
    voice_pace: str = Field(default="", description="Pacing of voiceover (e.g. rapid, measured, pause)")


class MomentBreakdown(BaseModel):
    """Data recorded for each sampled moment in the video."""

    t_ms: int = Field(..., description="Timestamp in milliseconds from start")
    what_is_on_screen: str = Field(..., description="Concrete description of visual elements")
    subject: str = Field(..., description="Primary focal subject (person, product, screen, text)")
    shot_type: Literal[
        "extreme_close", "close", "medium", "wide", "screen_recording", "text_card"
    ] = Field(..., description="Framing distance")
    camera_motion: Literal[
        "static", "push_in", "pull_out", "whip_pan", "handheld", "tracking", "zoom"
    ] = Field(..., description="Camera movement")
    on_screen_text: OnScreenText = Field(..., description="On-screen typography and positioning")
    spoken_text: str = Field(default="", description="Transcribed spoken word(s) at this moment")
    audio: AudioFeature = Field(..., description="Audio characteristics at this moment")
    role: Literal[
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
    ] = Field(..., description="Structural storytelling role in the ad")
    viewer_emotion: str = Field(default="", description="Target viewer emotional reaction")
    attention_device: Literal[
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
    ] = Field(..., description="Attention retention mechanism")
    why_it_works: str = Field(..., description="Evidence-backed explanation of why this moment works")
    risk: str = Field(default="", description="Drop-off or platform compliance risk")
    confidence: Literal["high", "medium", "low"] = Field(
        ..., description="Model certainty level"
    )


class VideoLevelMetrics(BaseModel):
    """Aggregate metrics computed across the entire video."""

    total_duration_s: float = Field(..., description="Total length in seconds")
    duration_ms: int = Field(..., description="Total duration in milliseconds")
    number_of_cuts: int = Field(..., description="Total scene transitions/cuts")
    average_seconds_per_cut: float = Field(..., description="Mean cut duration")
    longest_static_stretch_s: float = Field(..., description="Maximum duration without visual change")
    time_to_first_visual_change_ms: int = Field(..., description="Timestamp of first visual cut/motion")
    time_to_first_spoken_word_ms: int = Field(..., description="Timestamp of first speech sound")
    time_of_main_payoff_ms: int = Field(..., description="Timestamp of core transformation or reveal")
    aspect_ratio: str = Field(default="9:16", description="Frame aspect ratio")
    loop_connected: bool = Field(
        default=False, description="True if ending scene seamlessly connects back to hook"
    )


class VideoAutopsyResult(BaseModel):
    """Complete video autopsy containing sampled moments and aggregate video metrics."""

    video_id: str
    moments: list[MomentBreakdown]
    metrics: VideoLevelMetrics
