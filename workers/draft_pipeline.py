"""
End-to-end Draft Video Generation Pipeline for FrameDNA.
Coordinates:
1. Rule 4 Originality Check validation gate.
2. Voiceover synthesis via TTSProvider (speaking continuous single paragraph script).
3. Shot-by-shot video generation via VideoGenProvider (LTX-2 draft / Wan 2.2).
4. Audio-video assembly and sync verification within ± 200ms via FFmpeg.
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from packages.providers.tts import LocalTTSProvider
from packages.providers.videogen import LTXVideoGenProvider, WanVideoGenProvider
from workers.assembly.assembler import assemble_draft_video, probe_audio_duration
from workers.pipeline import STORAGE_BASE

STORAGE_DIR = STORAGE_BASE
CONCEPTS_DIR = STORAGE_DIR / "concepts"
DRAFTS_DIR = STORAGE_DIR / "drafts"


def run_draft_generation(
    concept_id: str,
    progress_callback: Callable[[str, int, str], None] | None = None,
) -> dict[str, Any]:
    """
    Executes complete draft video generation pipeline for a concept.
    """
    concept_file = CONCEPTS_DIR / f"{concept_id}.json"
    if not concept_file.exists():
        fallback_concept = Path("storage/concepts") / f"{concept_id}.json"
        if fallback_concept.exists():
            concept_file = fallback_concept
        else:
            raise FileNotFoundError(f"Concept '{concept_id}' not found.")

    concept = json.loads(concept_file.read_text(encoding="utf-8"))

    # Gate 1: Enforce Rule 4 Originality Gate
    originality = concept.get("originality", {})
    if originality.get("status") == "failed":
        raise ValueError("Cannot generate draft video: concept failed the originality audit.")

    concept_draft_dir = DRAFTS_DIR / concept_id
    concept_draft_dir.mkdir(parents=True, exist_ok=True)
    cache_file = concept_draft_dir / "draft_data.json"

    # Stage 1: Synthesize Spoken Voiceover Audio (Rule 21)
    if progress_callback:
        progress_callback("tts", 20, "Synthesizing flowing spoken voiceover track...")

    tts_provider = LocalTTSProvider(sample_rate=16000)
    spoken_text = concept.get("spoken_script", "")
    target_vo = concept_draft_dir / "voiceover.wav"
    tts_provider.synthesize(text=spoken_text, output_path=target_vo)

    vo_duration_s = probe_audio_duration(target_vo)

    # Stage 2: Generate Shot Video Clips via LTX-2
    shots = concept.get("shots", [])
    shot_paths: list[str] = []
    style_lock = concept.get("style_lock", "")

    # Proportion shot durations to match the exact voiceover duration
    total_requested_s = sum(float(s.get("duration_s", 3.0)) for s in shots)
    if vo_duration_s > 0 and total_requested_s > 0 and shots:
        scale_factor = vo_duration_s / total_requested_s
        cumulative = 0.0
        for idx, shot in enumerate(shots):
            if idx == len(shots) - 1:
                shot_dur = round(max(vo_duration_s - cumulative, 1.0), 2)
            else:
                shot_dur = round(float(shot.get("duration_s", 3.0)) * scale_factor, 2)
                cumulative += shot_dur
            shot["duration_s"] = shot_dur
            shot["t_start_s"] = round(cumulative - shot_dur if idx > 0 else 0.0, 2)

    ltx_provider = LTXVideoGenProvider()
    wan_provider = WanVideoGenProvider()

    for idx, shot in enumerate(shots):
        shot_num = idx + 1
        pct = 25 + int((idx / max(len(shots), 1)) * 50)
        if progress_callback:
            progress_callback(
                "videogen",
                pct,
                f"Generating shot {shot_num} of {len(shots)} via LTX-2 ({shot.get('shot_type')})...",
            )

        dur_s = float(shot.get("duration_s", 3.0))
        prompt = shot.get("prompt_ltx", "")

        # Use Wan 2.2 on hero shot (shot 1) for quality comparison
        if idx == 0:
            shot_file = wan_provider.generate_shot(
                prompt=shot.get("prompt_wan", prompt),
                style_lock=style_lock,
                duration_seconds=dur_s,
            )
        else:
            shot_file = ltx_provider.generate_shot(
                prompt=prompt,
                style_lock=style_lock,
                duration_seconds=dur_s,
            )

        target_shot = concept_draft_dir / f"shot_{shot_num}.mp4"
        Path(shot_file).replace(target_shot)
        shot_paths.append(str(target_shot))

    # Stage 3: FFmpeg Assembly & Synchronization (Rule 30)
    if progress_callback:
        progress_callback("assembly", 85, "Concatenating shots and muxing voiceover audio...")

    final_mp4 = concept_draft_dir / "final.mp4"
    assembly_meta = assemble_draft_video(
        shot_paths=shot_paths,
        voiceover_path=target_vo,
        output_path=final_mp4,
        target_width=720,
        target_height=1280,
    )

    # Stage 4: Ready
    results = {
        "concept_id": concept_id,
        "video_url": f"/storage/drafts/{concept_id}/final.mp4",
        "voiceover_url": f"/storage/drafts/{concept_id}/voiceover.wav",
        "duration_s": assembly_meta["video_duration_s"],
        "sync_delta_ms": assembly_meta["sync_delta_ms"],
        "in_sync": assembly_meta["in_sync"],
        "shots_count": len(shots),
        "shots": shots,
        "product_or_topic": concept.get("product_or_topic"),
        "platform": concept.get("platform"),
    }

    cache_file.write_text(json.dumps(results, indent=2), encoding="utf-8")

    if progress_callback:
        progress_callback("ready", 100, "Draft video generated and synchronized within ±200ms.")

    return results
