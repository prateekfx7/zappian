"""
Stats provider implementations for FrameDNA.
Strictly adheres to:
Rule 2: Never fabricate data. Sources are always labeled (youtube_api, ytdlp, manual, csv, connector).
Sales, revenue, and conversions are never inferred from video.
"""

import csv
import io
import json
import subprocess
from datetime import UTC, datetime
from typing import Any

from packages.providers.base import Stat

ALLOWED_SOURCES = {"youtube_api", "ytdlp", "manual", "csv", "connector"}


class YtDlpStatsProvider:
    """Extracts public video metrics via yt-dlp metadata."""

    def __init__(self, timeout_seconds: int = 15):
        self.timeout_seconds = timeout_seconds

    def fetch(self, url: str) -> list[Stat]:
        """Runs yt-dlp metadata dump and returns verified source-labeled Stat items."""
        now = datetime.now(UTC)
        cmd = [
            "yt-dlp",
            "--dump-json",
            "--no-playlist",
            "--no-download",
            "--skip-download",
            url,
        ]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            stats: list[Stat] = []

            if "view_count" in data and data["view_count"] is not None:
                stats.append(
                    Stat(
                        metric="views",
                        value=float(data["view_count"]),
                        source="ytdlp",
                        fetched_at=now,
                    )
                )

            if "like_count" in data and data["like_count"] is not None:
                stats.append(
                    Stat(
                        metric="likes",
                        value=float(data["like_count"]),
                        source="ytdlp",
                        fetched_at=now,
                    )
                )

            if "comment_count" in data and data["comment_count"] is not None:
                stats.append(
                    Stat(
                        metric="comments",
                        value=float(data["comment_count"]),
                        source="ytdlp",
                        fetched_at=now,
                    )
                )

            return stats
        except (subprocess.SubprocessError, json.JSONDecodeError, OSError, ValueError):
            return []


class CSVStatsParser:
    """Parses user-uploaded CSV performance metrics. Source is strictly labeled 'csv'."""

    @staticmethod
    def parse_csv_content(content: str) -> list[dict[str, Any]]:
        """
        Parses CSV in either:
        1. Key-value format: `metric,value`
        2. Columnar format: `views,likes,comments,shares,saves,spend,sales`
        """
        now_iso = datetime.now(UTC).isoformat()
        reader = csv.reader(io.StringIO(content.strip()))
        rows = [row for row in reader if row and any(cell.strip() for cell in row)]

        if not rows:
            return []

        stats: list[dict[str, Any]] = []

        header = [col.strip().lower() for col in rows[0]]

        # Format 1: Key-value rows (metric, value)
        if len(header) >= 2 and header[0] in ("metric", "name", "key"):
            for row in rows[1:]:
                if len(row) >= 2:
                    m = row[0].strip().lower().replace(" ", "_")
                    try:
                        val = float(row[1].strip().replace(",", ""))
                        stats.append({
                            "metric": m,
                            "value": val,
                            "source": "csv",
                            "fetched_at": now_iso,
                        })
                    except ValueError:
                        continue
            return stats

        # Format 2: Standard column headers
        recognized = {"views", "likes", "comments", "shares", "saves", "spend", "sales"}
        matching_cols = {idx: col for idx, col in enumerate(header) if col in recognized}

        if matching_cols and len(rows) > 1:
            data_row = rows[1]
            for idx, metric_name in matching_cols.items():
                if idx < len(data_row) and data_row[idx].strip():
                    try:
                        val = float(data_row[idx].strip().replace(",", "").replace("$", ""))
                        stats.append({
                            "metric": metric_name,
                            "value": val,
                            "source": "csv",
                            "fetched_at": now_iso,
                        })
                    except ValueError:
                        continue
            return stats

        # Fallback format: simple 2-column without explicit 'metric' header
        for row in rows:
            if len(row) >= 2:
                m = row[0].strip().lower().replace(" ", "_")
                if m in recognized:
                    try:
                        val = float(row[1].strip().replace(",", "").replace("$", ""))
                        stats.append({
                            "metric": m,
                            "value": val,
                            "source": "csv",
                            "fetched_at": now_iso,
                        })
                    except ValueError:
                        continue

        return stats
