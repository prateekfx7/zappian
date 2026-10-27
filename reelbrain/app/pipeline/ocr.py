"""
On-Screen Text OCR Stage for ReelBrain (Section 4).
Runs OCR on keyframes with timestamps, text bounding boxes, and vertical safe-zone positioning:
top (<28%), middle (28-72%), bottom (>72%).
"""

import logging
from pathlib import Path
from typing import Any

from reelbrain.app.config import settings

logger = logging.getLogger(__name__)


def classify_text_position(box: list[list[float]] | list[list[int]], frame_height: int = 1280) -> str:
    """
    Classifies vertical position relative to TikTok / Reels UI safe zones:
    - top: y < 28% (risk of conflict with top search bar, account header)
    - middle: 28% <= y <= 72% (safe, focal viewing zone)
    - bottom: y > 72% (risk of conflict with caption, audio ticker, action buttons)
    """
    if not box or len(box) < 4:
        return "middle"

    # Box format: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    y_coords = [point[1] for point in box]
    y_mid = sum(y_coords) / len(y_coords)

    ratio = y_mid / max(float(frame_height), 1.0)
    if ratio < 0.28:
        return "top"
    elif ratio > 0.72:
        return "bottom"
    return "middle"


def infer_text_purpose(text: str, position: str, t_ms: int) -> str:
    """Infers the structural marketing role of on-screen text."""
    lower = text.lower()
    if any(w in lower for w in ["tap", "link", "bio", "shop", "buy", "order", "get yours", "now", "code", "% off"]):
        return "call to action"
    if t_ms <= 3000 or position == "top":
        return "hook headline"
    if any(w in lower for w in ["how to", "step", "reason", "proof", "vs", "versus"]):
        return "framework guide"
    return "feature label"


def extract_ocr_keyframe(image_path: Path, frame_height: int = 1280) -> list[dict[str, Any]]:
    """
    Extracts text blocks, confidences, and vertical positions from a single image.
    """
    if not image_path.exists():
        return []

    try:
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(use_textline_orientation=True, lang=settings.ocr_lang, show_log=False)
        result = ocr.ocr(str(image_path), cls=True)

        detections: list[dict[str, Any]] = []
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text, score = line[1]
                if score >= 0.5:
                    clean_text = text.strip()
                    pos = classify_text_position(box, frame_height=frame_height)
                    detections.append(
                        {
                            "text": clean_text,
                            "confidence": round(float(score), 3),
                            "box": box,
                            "position": pos,
                        }
                    )
        return detections

    except Exception as e:  # noqa: BLE001
        logger.debug("PaddleOCR not active (%s), returning empty detections.", e)
        return []


def run_ocr_pipeline(
    frames: list[dict[str, Any]],
    frame_height: int = 1280,
) -> list[dict[str, Any]]:
    """
    Runs OCR across keyframes and returns list of OCR detections with timestamps.
    """
    ocr_results: list[dict[str, Any]] = []

    # Run OCR on keyframes and 1st second frames
    keyframes = [f for f in frames if f.get("is_keyframe") or f.get("t_ms", 0) <= 1000]

    for kf in keyframes:
        t_ms = kf["t_ms"]
        img_path = Path(kf["frame_path"])
        detections = extract_ocr_keyframe(img_path, frame_height=frame_height)

        if detections:
            for d in detections:
                d["purpose"] = infer_text_purpose(d["text"], d["position"], t_ms)

            combined_text = " • ".join([d["text"] for d in detections])
            ocr_results.append(
                {
                    "t_ms": t_ms,
                    "frame_path": str(img_path),
                    "combined_text": combined_text,
                    "detections": detections,
                }
            )

    return ocr_results
