"""
Evidence validation and claim repair engine.
Strictly enforces Rule 1, Rule 2, and Rule 19:
- Every 'why it works' claim must cite at least one valid timestamp.
- No hallucinated timestamps: each timestamp must match an actual extracted frame within tolerance (±1000ms).
- Evidence coverage must meet or exceed 95% threshold.
"""

import json
from pathlib import Path
from typing import Any

from jsonschema import ValidationError, validate


class EvidenceValidationError(Exception):
    """Raised when evidence coverage fails the 95% threshold or schema is violated."""


def load_report_schema() -> dict[str, Any]:
    schema_path = Path("packages/schemas/report.json")
    with open(schema_path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_nearest_valid_timestamp(
    target_ms: int,
    available_timestamps: list[int],
    tolerance_ms: int = 1000,
) -> int | None:
    """Finds the nearest extracted frame timestamp within tolerance_ms."""
    if not available_timestamps:
        return None

    closest = min(available_timestamps, key=lambda t: abs(t - target_ms))
    if abs(closest - target_ms) <= tolerance_ms:
        return closest
    return None


def validate_and_repair_report(
    report: dict[str, Any],
    available_frames: list[dict[str, Any]],
    tolerance_ms: int = 1000,
    min_coverage_threshold: float = 95.0,
) -> dict[str, Any]:
    """
    Validates report schema and timestamp accuracy:
    1. Validates against packages/schemas/report.json
    2. Validates every evidence item in why_it_works against real frame timestamps
    3. Attempts one repair on slightly drifted timestamps
    4. Drops claims that cannot be grounded in frame evidence
    5. Checks overall evidence coverage (must be >= 95%)
    """
    schema = load_report_schema()

    # 1. Structural schema validation
    try:
        validate(instance=report, schema=schema)
    except ValidationError as e:
        raise EvidenceValidationError(f"Report failed JSON schema validation: {e.message}") from e

    frame_timestamps = sorted([f["t_ms"] for f in available_frames])
    raw_claims = report.get("why_it_works", [])
    valid_claims: list[dict[str, Any]] = []

    total_claims = len(raw_claims)
    claims_with_valid_evidence = 0

    for item in raw_claims:
        evidence_list = item.get("evidence", [])
        repaired_evidence: list[dict[str, Any]] = []

        for ev in evidence_list:
            t_ms = ev.get("t_ms", 0)
            nearest = find_nearest_valid_timestamp(t_ms, frame_timestamps, tolerance_ms)
            if nearest is not None:
                repaired_evidence.append(
                    {
                        "t_ms": nearest,
                        "frame_id": ev.get("frame_id") or f"frame_{nearest}",
                    }
                )

        if repaired_evidence:
            claims_with_valid_evidence += 1
            item["evidence"] = repaired_evidence
            valid_claims.append(item)
        else:
            # Drop ungrounded claim per Rule 1 & Rule 19
            pass

    coverage_pct = (claims_with_valid_evidence / total_claims * 100.0) if total_claims > 0 else 100.0

    if coverage_pct < min_coverage_threshold:
        raise EvidenceValidationError(
            f"Evidence coverage {coverage_pct:.1f}% is below required {min_coverage_threshold}% threshold! "
            f"({claims_with_valid_evidence}/{total_claims} claims verified)"
        )

    report["why_it_works"] = valid_claims
    report["evidence_coverage_pct"] = round(coverage_pct, 1)

    return report
