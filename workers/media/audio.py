"""
Audio analysis module for energy curves, silence gaps, and pace estimation.
Per architecture.md stage 5 (audio_features).
"""

from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf


def analyze_audio_features(wav_path: Path) -> dict[str, Any]:
    """
    Analyzes 16kHz mono WAV file to extract:
    - Overall duration & sample rate
    - RMS energy profile (normalized 0-1) across time buckets
    - Silence gaps (periods of low audio energy)
    - Pacing indicators
    """
    if not wav_path.exists():
        raise FileNotFoundError(f"Audio file does not exist: {wav_path}")

    data, samplerate = sf.read(str(wav_path))
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)

    duration_s = len(data) / float(samplerate)
    if duration_s <= 0:
        return {
            "duration_s": 0.0,
            "mean_energy": 0.0,
            "silence_gaps": [],
            "energy_curve": [],
        }

    # Frame-by-frame RMS energy (window size: 250ms, hop: 250ms)
    window_samples = int(samplerate * 0.25)
    if window_samples == 0:
        window_samples = 1

    num_windows = len(data) // window_samples
    energy_curve: list[dict[str, Any]] = []
    silence_gaps: list[dict[str, Any]] = []

    silence_threshold = 0.015
    current_silence_start: int | None = None

    for i in range(num_windows):
        start_sample = i * window_samples
        end_sample = start_sample + window_samples
        chunk = data[start_sample:end_sample]

        rms = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
        t_ms = int((start_sample / float(samplerate)) * 1000)

        energy_curve.append({"t_ms": t_ms, "rms": round(rms, 4)})

        if rms < silence_threshold:
            if current_silence_start is None:
                current_silence_start = t_ms
        else:
            if current_silence_start is not None:
                duration_gap = t_ms - current_silence_start
                if duration_gap >= 500:  # Gaps >= 500ms
                    silence_gaps.append(
                        {
                            "start_ms": current_silence_start,
                            "end_ms": t_ms,
                            "duration_ms": duration_gap,
                        }
                    )
                current_silence_start = None

    if current_silence_start is not None:
        duration_gap = int(duration_s * 1000) - current_silence_start
        if duration_gap >= 500:
            silence_gaps.append(
                {
                    "start_ms": current_silence_start,
                    "end_ms": int(duration_s * 1000),
                    "duration_ms": duration_gap,
                }
            )

    mean_energy = (
        float(np.mean([e["rms"] for e in energy_curve])) if energy_curve else 0.0
    )

    return {
        "duration_s": round(duration_s, 2),
        "duration_ms": int(duration_s * 1000),
        "mean_energy": round(mean_energy, 4),
        "silence_gaps": silence_gaps,
        "energy_curve": energy_curve,
    }
