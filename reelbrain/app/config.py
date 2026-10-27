"""
Centralized Configuration for ReelBrain.
Rule 3 & Section 3: One config file holds model names, thresholds, limits, and frame rates.
No hardcoded model names in pipeline logic.
"""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ReelBrainSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment & Host
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")

    # Storage Paths
    data_dir: Path = Field(default=Path("data"), alias="DATA_DIR")
    storage_dir: Path = Field(default=Path("storage"), alias="STORAGE_DIR")
    db_path: Path = Field(default=Path("data/reelbrain.db"), alias="DB_PATH")
    vector_dir: Path = Field(default=Path("data/vectors"), alias="VECTOR_DIR")
    playbook_path: Path = Field(default=Path("data/PLAYBOOK.md"), alias="PLAYBOOK_PATH")
    memory_export_path: Path = Field(default=Path("data/MEMORY.md"), alias="MEMORY_EXPORT_PATH")

    # Video Understanding & Vision (Section 3: 100% Local default)
    vlm_provider: str = Field(default="local", alias="VLM_PROVIDER")  # "local" | "gemini"
    local_vlm_model: str = Field(default="qwen2.5-vl:7b", alias="LOCAL_VLM_MODEL")
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_vlm_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_VLM_MODEL")

    # Text LLM for Synthesis, Ideas, and Judging
    llm_provider: str = Field(default="local", alias="LLM_PROVIDER")
    local_llm_model: str = Field(default="qwen2.5:7b", alias="LOCAL_LLM_MODEL")

    # Speech to Text & OCR
    whisper_model: str = Field(default="base.en", alias="WHISPER_MODEL")
    ocr_lang: str = Field(default="en", alias="OCR_LANG")

    # Smart Sampling Parameters (Section 4)
    hook_duration_s: float = Field(default=3.0, description="Hook duration window in seconds")
    hook_fps: float = Field(default=4.0, description="Sampling rate during first 3 seconds (4 fps)")
    body_fps: float = Field(default=1.0, description="Sampling rate after hook window (1 fps)")
    max_video_duration_s: int = Field(default=180, description="Max allowed duration (3 minutes default)")

    # Evidence & Analysis Thresholds
    min_evidence_coverage_pct: float = Field(
        default=95.0, description="Minimum percentage of claims that must have valid timestamps"
    )

    # Originality Check Thresholds (Section 8 & Rule 4)
    max_ngram_overlap_pct: float = Field(default=10.0, description="5-gram text overlap threshold")
    max_consecutive_words: int = Field(default=8, description="Max consecutive identical words")
    max_visual_similarity: float = Field(
        default=0.80, description="Max cosine similarity between source and planned shots"
    )


settings = ReelBrainSettings()

# Ensure primary data directories exist
for path in [
    settings.data_dir,
    settings.storage_dir,
    settings.vector_dir,
    settings.data_dir / "videos",
    settings.data_dir / "frames",
    settings.data_dir / "audio",
]:
    path.mkdir(parents=True, exist_ok=True)
