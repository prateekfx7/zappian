"""
Provider Protocols for ReelBrain.
Rule 7 & Section 3: All AI models (VLM, STT, OCR, LLM) are decoupled behind protocols.
"""

from pathlib import Path
from typing import Any, Protocol, runtime_checkable

from reelbrain.app.schemas.moment import MomentBreakdown


@runtime_checkable
class VLMProvider(Protocol):
    """Protocol for Video-Language Models analyzing individual frames/moments."""

    def analyze_moment(
        self,
        frame_path: str | Path,
        t_ms: int,
        context: dict[str, Any] | None = None,
    ) -> MomentBreakdown:
        """
        Analyzes a single frame along with transcript/OCR context and returns
        a validated MomentBreakdown matching the Section 5 schema.
        """
        ...


@runtime_checkable
class STTProvider(Protocol):
    """Protocol for Speech-to-Text transcription with word timestamps."""

    def transcribe(self, audio_path: str | Path) -> dict[str, Any]:
        """
        Transcribes audio and returns full text along with word-level timestamps:
        {'text': str, 'language': str, 'words': [{'w': str, 'start_ms': int, 'end_ms': int}]}
        """
        ...


@runtime_checkable
class OCRProvider(Protocol):
    """Protocol for On-Screen Text extraction with vertical position tagging."""

    def extract_text_with_positions(self, image_path: str | Path) -> list[dict[str, Any]]:
        """
        Extracts on-screen text with vertical positioning:
        [{'text': str, 'position': 'top' | 'middle' | 'bottom', 'bbox': list}]
        """
        ...
