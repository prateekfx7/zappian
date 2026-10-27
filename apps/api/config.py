from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    log_level: str = "INFO"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str = "dummy-dev-secret-key-32-chars-minimum"

    # Database & Cache
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "framedna"
    postgres_password: str = "framedna_secure_password"
    postgres_db: str = "framedna"
    database_url: str = (
        "postgresql+asyncpg://framedna:framedna_secure_password@localhost:5432/framedna"
    )

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_url: str = "redis://localhost:6379/0"

    # Storage
    storage_endpoint: str = "localhost:9000"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"
    storage_bucket_name: str = "framedna"
    storage_use_ssl: bool = False

    # Pipeline limits & thresholds
    max_upload_size_mb: int = 500
    max_video_duration_seconds: int = 180
    chunk_duration_seconds: int = 45
    chunk_overlap_seconds: int = 5
    originality_visual_similarity_max: float = 0.80
    originality_text_ngram_overlap_max: float = 0.10
    originality_max_consecutive_words: int = 8


settings = Settings()
