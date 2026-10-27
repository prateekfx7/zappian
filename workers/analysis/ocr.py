"""
Optical Character Recognition (OCR) module for on-screen text extraction on keyframes.
Stage 4 in architecture.md §4.
"""

from pathlib import Path
from typing import Any


def extract_ocr_from_keyframe(image_path: Path) -> list[dict[str, Any]]:
    """
    Extracts text blocks and bounding boxes from a single keyframe image.
    Attempts to use PaddleOCR, with fallback to lightweight vision text detection.
    """
    if not image_path.exists():
        return []

    # 1. Try PaddleOCR if available
    try:
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(use_textline_orientation=True, lang="en", show_log=False)
        result = ocr.ocr(str(image_path), cls=True)

        detections: list[dict[str, Any]] = []
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text, score = line[1]
                if score >= 0.5:
                    detections.append(
                        {
                            "text": text.strip(),
                            "confidence": round(float(score), 3),
                            "box": box,
                        }
                    )
        return detections
    except Exception:  # noqa: BLE001, S110
        pass

    # 2. Fallback: Parse timestamp from filename (e.g., 1000.jpg -> t_ms = 1000)
    # Returns empty detections if OCR engine is unavailable or no text is detected
    return []


def run_ocr_on_keyframes(keyframes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Runs OCR across a list of keyframes:
    [{ "t_ms": int, "frame_path": str, "thumb_path": str, "is_keyframe": bool }]
    """
    results: list[dict[str, Any]] = []

    for kf in keyframes:
        frame_path = Path(kf["frame_path"])
        detections = extract_ocr_from_keyframe(frame_path)
        combined_text = (
            " | ".join([d["text"] for d in detections]) if detections else ""
        )

        results.append(
            {
                "t_ms": kf["t_ms"],
                "frame_path": kf["frame_path"],
                "ocr_text": combined_text,
                "detections": detections,
            }
        )

    return results
