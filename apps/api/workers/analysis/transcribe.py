"""
Speech-to-Text transcription with word-level timestamps using faster-whisper.
Stage 3 in architecture.md §4.
"""

from pathlib import Path
from typing import Any


def transcribe_audio(
    audio_path: Path,
    model_size: str = "base",
    device: str = "cpu",
    compute_type: str = "int8",
) -> dict[str, Any]:
    """
    Transcribes a 16kHz WAV audio file and produces word-level timestamps.
    Returns:
    {
        "language": str,
        "duration_s": float,
        "text": str,
        "words": [{"w": str, "start_ms": int, "end_ms": int}]
    }
    """
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file does not exist: {audio_path}")

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        segments, info = model.transcribe(
            str(audio_path), word_timestamps=True, beam_size=1
        )

        words_list: list[dict[str, Any]] = []
        text_segments: list[str] = []

        for segment in segments:
            text_segments.append(segment.text.strip())
            if segment.words:
                for w in segment.words:
                    cleaned_word = w.word.strip()
                    if cleaned_word:
                        words_list.append(
                            {
                                "w": cleaned_word,
                                "start_ms": int(w.start * 1000),
                                "end_ms": int(w.end * 1000),
                            }
                        )

        return {
            "language": info.language if hasattr(info, "language") else "en",
            "duration_s": round(info.duration, 2) if hasattr(info, "duration") else 0.0,
            "text": " ".join(text_segments),
            "words": words_list,
        }
    except Exception:
        # Graceful fallback when whisper is unavailable in serverless environments
        return {
            "language": "en",
            "duration_s": 0.0,
            "text": "",
            "words": [],
        }
