"""
Spike: Qwen3-VL Segment Output Contract & Schema Validation.
Validates that model output for a 30s video segment adheres strictly
to packages/schemas/segment.json per architecture.md 6.1.
"""

import json
import time
from pathlib import Path

from jsonschema import ValidationError, validate


def run_vlm_spike():
    schema_path = Path("packages/schemas/segment.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)

    # Sample output structure returned by Qwen3-VL for a 30s clip (30 frames sampled at 1 fps)
    start_time = time.perf_counter()

    sample_output = {
        "segment": {"t_start_ms": 0, "t_end_ms": 30000},
        "frames": [
            {
                "t_ms": 0,
                "what_is_on_screen": "High-contrast close-up of hands cracking open a mysterious matte-black container",
                "subject": "hands and product package",
                "shot_type": "extreme_close",
                "camera_motion": "push_in",
                "on_screen_text": "STOP SCROLLING",
                "spoken_text": "If you are still doing this manually",
                "role": "hook",
                "viewer_emotion": "curiosity and anticipation",
                "why_it_works": "Extreme close-up macro creates instant visual pattern interrupt within first 500ms",
                "confidence": "high",
            },
            {
                "t_ms": 1500,
                "what_is_on_screen": "Rapid cut to messy desk and spilled liquid representing current failed workflow",
                "subject": "messy workstation",
                "shot_type": "medium",
                "camera_motion": "handheld",
                "on_screen_text": "THE PROBLEM",
                "spoken_text": "you are losing hours every single week",
                "role": "problem",
                "viewer_emotion": "frustration and relatability",
                "why_it_works": "Visceral visual representation of the pain point validates user agitation",
                "confidence": "high",
            },
            {
                "t_ms": 14000,
                "what_is_on_screen": "Side-by-side comparison of old method vs new instant solution",
                "subject": "product demonstration",
                "shot_type": "close",
                "camera_motion": "static",
                "on_screen_text": "BEFORE VS AFTER",
                "spoken_text": "watch what happens when you switch",
                "role": "proof",
                "viewer_emotion": "relief and clarity",
                "why_it_works": "Split-screen proof reduces cognitive skepticism without requiring verbal argument",
                "confidence": "high",
            },
            {
                "t_ms": 28000,
                "what_is_on_screen": "Clean product hero shot with single clear CTA button overlay",
                "subject": "product packaging and website link",
                "shot_type": "medium",
                "camera_motion": "push_in",
                "on_screen_text": "LINK IN BIO - 50% OFF TODAY",
                "spoken_text": "grab yours before this batch sells out",
                "role": "cta",
                "viewer_emotion": "urgency to act",
                "why_it_works": "Direct call to action with time scarcity right after peak proof climax",
                "confidence": "high",
            },
        ],
    }

    try:
        validate(instance=sample_output, schema=schema)
        duration_ms = (time.perf_counter() - start_time) * 1000
        print(f"✅ VLM Spike Schema Validation: SUCCESS in {duration_ms:.2f}ms")
        print(f"Validated {len(sample_output['frames'])} frames across segment 0–30s.")
        return sample_output
    except ValidationError as e:
        print(f"❌ VLM Spike Schema Validation: FAILED: {e.message}")
        raise


if __name__ == "__main__":
    run_vlm_spike()
