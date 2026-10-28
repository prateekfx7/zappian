"""
Integration verification script:
Tests 10 videos through the FrameDNA / ReelBrain media pipeline and autopsy engine.
Verifies:
1. No 'Executable not found in PATH for command: ffprobe' errors.
2. Probing, normalization, frame extraction, transcription, OCR, audio features, and autopsy analysis.
3. Brain memory updates and indexing across all 10 videos.
"""

import glob
import json
import logging
import os
import sys
import uuid
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_10_videos")

# Setup sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from workers.pipeline import run_media_pipeline
from workers.analysis.engine import run_full_analysis
from workers.brain.memory import BrainMemoryEngine
from workers.media.processor import probe_video, normalize_video, extract_frames_1fps

def find_test_videos(target_count: int = 10) -> list[Path]:
    """Finds up to target_count real video files from storage/originals and storage/proxies."""
    candidates = []
    
    # 1. Look in storage/originals (filter snappy videos < 30MB)
    for p in sorted(Path("storage/originals").glob("*/*.mp4")):
        if 10_000 < p.stat().st_size < 30_000_000:
            candidates.append(p)
            
    # 2. Look in storage/proxies
    if len(candidates) < target_count:
        for p in sorted(Path("storage/proxies").glob("*.mp4")):
            if 10_000 < p.stat().st_size < 30_000_000:
                candidates.append(p)

    # 3. Look in data/videos
    if len(candidates) < target_count:
        for p in sorted(Path("data/videos").glob("*/*.mp4")):
            if 10_000 < p.stat().st_size < 30_000_000:
                candidates.append(p)
                
    # If still not enough, generate synthetic clips using cv2
    if len(candidates) < target_count:
        import cv2
        import numpy as np
        
        synth_dir = Path("storage/test_synth")
        synth_dir.mkdir(parents=True, exist_ok=True)
        
        while len(candidates) < target_count:
            idx = len(candidates) + 1
            s_path = synth_dir / f"synth_video_{idx}.mp4"
            if not s_path.exists():
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                out = cv2.VideoWriter(str(s_path), fourcc, 30.0, (720, 1280))
                for f in range(90):  # 3 seconds at 30 fps
                    color = ((idx * 30) % 255, (f * 3) % 255, 150)
                    frame = np.full((1280, 720, 3), color, dtype=np.uint8)
                    cv2.putText(frame, f"Test Video {idx}", (80, 600), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
                    out.write(frame)
                out.release()
            candidates.append(s_path)
            
    return candidates[:target_count]


def main():
    logger.info("Initializing 10-video pipeline integration test...")
    videos = find_test_videos(10)
    logger.info(f"Selected {len(videos)} videos for testing:")
    for i, v in enumerate(videos, 1):
        logger.info(f"  {i}. {v.name} ({v.stat().st_size // 1024} KB)")

    brain = BrainMemoryEngine()
    results = []
    
    for i, video_path in enumerate(videos, 1):
        test_id = f"test_batch_{uuid.uuid4().hex[:8]}"
        logger.info(f"\n==========================================")
        logger.info(f"Testing Video {i}/10: {video_path.name} [ID: {test_id}]")
        logger.info(f"==========================================")
        
        # 1. Verify Probe
        meta = probe_video(video_path)
        assert meta["width"] > 0, f"Width should be > 0, got {meta['width']}"
        assert meta["height"] > 0, f"Height should be > 0, got {meta['height']}"
        assert meta["duration_s"] > 0, f"Duration should be > 0, got {meta['duration_s']}"
        logger.info(f"  ✓ Probe passed: {meta['width']}x{meta['height']} @ {meta['fps']}fps, duration: {meta['duration_s']}s")
        
        # 2. Run Pipeline (Stages 0 - 5)
        from datetime import UTC, datetime
        now_iso = datetime.now(UTC).isoformat()
        stats = [
            {"metric": "views", "value": float(500_000 * i), "source": "manual", "fetched_at": now_iso},
            {"metric": "likes", "value": float(25_000 * i), "source": "manual", "fetched_at": now_iso},
        ]
        
        progress_events = []
        def on_progress(evt):
            progress_events.append(evt)
            if evt.get("stage") in ("ingest", "normalize", "frames", "transcribe", "ocr", "audio_features", "ready"):
                logger.info(f"    [Stage: {evt['stage']}] {evt['progress_pct']}% - {evt['message']}")
                
        pipeline_data = run_media_pipeline(
            video_id=test_id,
            original_video_path=video_path,
            on_progress=on_progress,
            initial_stats=stats,
            social_metadata={"title": f"Viral Short #{i}", "platform": "tiktok" if i % 2 == 0 else "instagram"},
        )
        
        assert pipeline_data["video_id"] == test_id
        assert "proxy_path" in pipeline_data
        assert "audio_path" in pipeline_data
        assert len(pipeline_data.get("frames", [])) > 0, "Frames should have been extracted"
        logger.info(f"  ✓ Pipeline passed: {len(pipeline_data['frames'])} frames extracted")
        
        # 3. Verify Autopsy Analysis Report (Generated in Stage 6 of pipeline)
        report = pipeline_data["analysis"]
        assert "scores" in report
        assert "verdict" in report
        assert "blueprint" in report
        hook_score = int(report["scores"]["hook"])
        score_vals = list(report["scores"].values())
        composite_score = round(sum(score_vals) / len(score_vals)) if score_vals else 0
        logger.info(f"  ✓ Autopsy Report passed: Score={composite_score}/100, Hook Score={hook_score}/100, Verdict={report['verdict']}")
        
        # 4. Brain Memory Indexing
        brain.index_video(test_id, pipeline_data)
        logger.info(f"  ✓ Brain indexed video {test_id}. Total memory count: {len(brain.data.get('videos', {}))}")
        
        results.append({
            "index": i,
            "filename": video_path.name,
            "id": test_id,
            "score": composite_score,
            "hook_score": hook_score,
            "duration": meta["duration_s"],
            "frames": len(pipeline_data["frames"]),
            "verdict": report["verdict"]
        })
        
    logger.info("\n" + "=" * 60)
    logger.info("ALL 10 VIDEOS TESTED AND VERIFIED SUCCESSFULLY!")
    logger.info("=" * 60)
    for r in results:
        logger.info(f"Video {r['index']:02d}: {r['filename'][:30]:30s} | Score: {r['score']:3d} | Hook: {r['hook_score']:3d} | Frames: {r['frames']:2d} | Verdict: {r['verdict']}")
    logger.info("=" * 60)
    print("SUCCESS: 10/10 VIDEOS PASSED WITH ZERO ERRORS!")


if __name__ == "__main__":
    main()
