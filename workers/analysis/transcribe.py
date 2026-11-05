"""
Speech-to-Text transcription with word-level timestamps using faster-whisper.
Stage 3 in architecture.md §4.
Graceful fallback for serverless environments when faster-whisper ML binaries are omitted.
"""

import logging
import os
import wave
from pathlib import Path
from typing import Any

logger = logging.getLogger("reelbrain.transcribe")


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
        return {"language": "en", "duration_s": 0.0, "text": "", "words": []}

    duration_s = 0.0
    try:
        with wave.open(str(audio_path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                duration_s = round(frames / float(rate), 2)
    except Exception:
        pass

    # 1. Try local faster-whisper if installed
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
            "duration_s": round(info.duration, 2) if hasattr(info, "duration") else duration_s,
            "text": " ".join(text_segments),
            "words": words_list,
        }
    except ImportError:
        logger.warning("faster-whisper is not installed; attempting remote API fallback...")
    except Exception as e:
        logger.warning(f"faster-whisper transcription failed ({e}); attempting remote API fallback...")

    # 2. Remote Whisper API fallback (Groq / OpenAI) if key configured
    openai_key = os.environ.get("OPENAI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_AUDIO_KEY")

    if groq_key or openai_key:
        try:
            import httpx

            url = (
                "https://api.groq.com/openai/v1/audio/transcriptions"
                if groq_key
                else "https://api.openai.com/v1/audio/transcriptions"
            )
            key = groq_key or openai_key
            model_name = "whisper-large-v3-turbo" if groq_key else "whisper-1"

            with open(audio_path, "rb") as f_audio:
                files = {"file": (audio_path.name, f_audio, "audio/wav")}
                data = {
                    "model": model_name,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                }
                headers = {"Authorization": f"Bearer {key}"}

                resp = httpx.post(url, files=files, data=data, headers=headers, timeout=60.0)
                if resp.status_code == 200:
                    api_data = resp.json()
                    words_list: list[dict[str, Any]] = []
                    raw_words = api_data.get("words") or []
                    for w in raw_words:
                        cleaned = (w.get("word") or "").strip()
                        if cleaned:
                            words_list.append(
                                {
                                    "w": cleaned,
                                    "start_ms": int(float(w.get("start", 0)) * 1000),
                                    "end_ms": int(float(w.get("end", 0)) * 1000),
                                }
                            )

                    return {
                        "language": api_data.get("language", "en"),
                        "duration_s": float(api_data.get("duration", duration_s)),
                        "text": api_data.get("text", "").strip(),
                        "words": words_list,
                    }
        except Exception as api_err:
            logger.warning(f"Cloud Whisper transcription failed: {api_err}")

    # 3. Resilient Fallback: Clean transcript structure so pipeline continues uninterrupted
    logger.info("Using fallback transcript (video analyzed via visual keyframes, scenes, and audio energy).")
    return {
        "language": "en",
        "duration_s": duration_s,
        "text": "",
        "words": [],
    }
