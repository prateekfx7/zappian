import pytest
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
