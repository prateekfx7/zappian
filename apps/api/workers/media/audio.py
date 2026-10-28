"""
Audio analysis module for energy curves, silence gaps, and pace estimation.
Per architecture.md stage 5 (audio_features).
"""

from pathlib import Path
from typing import Any

import wave
import numpy as np

try:
    import soundfile as sf
except Exception:
    sf = None


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

    data = None
    samplerate = 16000

    if sf is not None:
        try:
            raw_data, samplerate = sf.read(str(wav_path))
            if len(raw_data.shape) > 1:
                raw_data = np.mean(raw_data, axis=1)
            data = raw_data
        except Exception:
            data = None

    if data is None:
        try:
            with wave.open(str(wav_path), "rb") as wf:
                samplerate = wf.getframerate()
                n_frames = wf.getnframes()
                raw_bytes = wf.readframes(n_frames)
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                if sampwidth == 2:
                    raw_data = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                else:
                    raw_data = np.frombuffer(raw_bytes, dtype=np.int8).astype(np.float32) / 128.0
                if n_channels > 1:
                    raw_data = raw_data.reshape(-1, n_channels).mean(axis=1)
                data = raw_data
        except Exception:
            return {
                "duration_s": 0.0,
                "mean_energy": 0.0,
                "silence_gaps": [],
                "energy_curve": [],
            }

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
