"""
Provider interfaces for FrameDNA.
All model access, TTS, video generation, and stats are strictly decoupled behind Protocols.
Per Rule 7 & 8: No hardcoded model names, URLs, or SDK calls in business logic.
"""

from datetime import datetime
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel


class Stat(BaseModel):
    metric: str
    value: float
    source: str
    fetched_at: datetime


class SegmentFrame(BaseModel):
    t_ms: int
    what_is_on_screen: str
    subject: str
    shot_type: str
    camera_motion: str
    on_screen_text: str
    spoken_text: str
    role: str
    viewer_emotion: str
    why_it_works: str
    confidence: str


class VLMSegmentResult(BaseModel):
    segment: dict[str, int]
    frames: list[SegmentFrame]


@runtime_checkable
class VLMProvider(Protocol):
    """Interface for Video-Language Models (e.g., Qwen3-VL, InternVL)."""

    def analyze_segment(
        self,
        frames: list[dict[str, Any]],
        transcript: str,
        ocr_text: str,
        schema: dict[str, Any],
    ) -> dict[str, Any]:
        """Analyze a video segment chunk (<= 45s) and return structured segment analysis."""
        ...


@runtime_checkable
class LLMProvider(Protocol):
    """Interface for Text LLMs (synthesis, originality judge, script generation)."""

    def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: dict[str, Any],
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """Generate structured JSON adhering to the specified schema."""
        ...


@runtime_checkable
class VideoGenProvider(Protocol):
    """Interface for Video Generation (LTX-2, Wan 2.2, HunyuanVideo)."""

    def generate_shot(
        self,
        prompt: str,
        style_lock: str,
        ref_image_path: str | None = None,
        duration_seconds: float = 3.0,
    ) -> str:
        """Generate video clip for a single shot and return storage key."""
        ...


@runtime_checkable
class TTSProvider(Protocol):
    """Interface for Text-to-Speech synthesis (Kokoro, XTTS, Piper)."""

    def synthesize(
        self,
        text: str,
        voice: str,
        language: str = "en",
    ) -> str:
        """Synthesize voiceover audio and return storage key."""
        ...


@runtime_checkable
class StatsProvider(Protocol):
    """Interface for video statistics ingestion."""

    def fetch(self, url: str) -> list[Stat]:
        """Fetch views, likes, comments, and metadata with source attribution."""
        ...
