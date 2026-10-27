import io

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data
    assert "version" in data
    assert "timestamp" in data


def test_create_video_without_rights_fails():
    response = client.post(
        "/v1/videos",
        json={
            "source_type": "upload",
            "rights_confirmed": False,
        },
    )
    assert response.status_code == 400
    assert "Rights confirmation is required" in response.json()["detail"]


def test_create_video_with_rights_succeeds():
    response = client.post(
        "/v1/videos",
        json={
            "source_type": "upload",
            "rights_confirmed": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["source_type"] == "upload"
    assert data["status"] == "queued"
    assert data["stage"] == "ingest"


def test_upload_video_without_rights_fails():
    fake_video = io.BytesIO(b"\x00\x00\x00 ftypisom" + b"A" * 1024)
    response = client.post(
        "/v1/videos/upload",
        files={"file": ("test_video.mp4", fake_video, "video/mp4")},
        data={"rights_confirmed": "false"},
    )
    assert response.status_code == 400
    assert "Rights confirmation is required" in response.json()["detail"]


def test_upload_video_invalid_extension_fails():
    fake_text = io.BytesIO(b"not a video file")
    response = client.post(
        "/v1/videos/upload",
        files={"file": ("test.txt", fake_text, "text/plain")},
        data={"rights_confirmed": "true"},
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_video_valid_file_succeeds():
    fake_video = io.BytesIO(b"\x00\x00\x00 ftypisom" + b"X" * 2048)
    response = client.post(
        "/v1/videos/upload",
        files={"file": ("sample_clip.mp4", fake_video, "video/mp4")},
        data={"rights_confirmed": "true"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["source_type"] == "upload"
    assert data["status"] == "queued"
    assert data["filename"] == "sample_clip.mp4"
    assert data["size_bytes"] == 2060
    assert data["storage_key"].startswith("originals/")
