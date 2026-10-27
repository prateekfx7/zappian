from pathlib import Path

from workers.media.audio import analyze_audio_features
from workers.media.processor import extract_frames_1fps, normalize_video, probe_video
from workers.pipeline import run_media_pipeline

GOLDEN_VIDEO = Path("tests/golden/g1_product_ad.mp4")


def test_probe_golden_video():
    assert GOLDEN_VIDEO.exists()
    meta = probe_video(GOLDEN_VIDEO)
    assert meta["width"] == 720
    assert meta["height"] == 1280
    assert meta["duration_s"] >= 5.5
    assert meta["fps"] == 30.0


def test_normalize_and_extract_frames(tmp_path):
    proxy_path = tmp_path / "proxy.mp4"
    audio_path = tmp_path / "audio.wav"
    frames_dir = tmp_path / "frames"
    thumbs_dir = tmp_path / "thumbs"

    norm_res = normalize_video(GOLDEN_VIDEO, proxy_path, audio_path)
    assert proxy_path.exists()
    assert audio_path.exists()
    assert norm_res["metadata"]["width"] == 720

    frames = extract_frames_1fps(proxy_path, frames_dir, thumbs_dir)
    assert len(frames) >= 5
    assert frames[0]["t_ms"] == 0
    assert Path(frames[0]["frame_path"]).exists()
    assert Path(frames[0]["thumb_path"]).exists()


def test_audio_feature_extraction(tmp_path):
    proxy_path = tmp_path / "proxy.mp4"
    audio_path = tmp_path / "audio.wav"
    normalize_video(GOLDEN_VIDEO, proxy_path, audio_path)

    features = analyze_audio_features(audio_path)
    assert features["duration_s"] >= 5.5
    assert "mean_energy" in features
    assert "energy_curve" in features
    assert len(features["energy_curve"]) > 0


import uuid


def test_full_media_pipeline_end_to_end(tmp_path):
    video_id = f"test_golden_{uuid.uuid4().hex[:8]}"
    events_received = []

    def progress_listener(evt):
        events_received.append(evt["stage"])

    result = run_media_pipeline(
        video_id=video_id,
        original_video_path=GOLDEN_VIDEO,
        whisper_model_size="base",
        on_progress=progress_listener,
    )

    assert result["video_id"] == video_id
    assert "metadata" in result
    assert "frames" in result
    assert len(result["frames"]) >= 5
    assert "audio_features" in result
    assert "transcript" in result

    # Verify stage progression
    assert "ingest" in events_received
    assert "normalize" in events_received
    assert "frames" in events_received
    assert "ready" in events_received
