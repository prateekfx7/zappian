"""
Evidence Validator for ReelBrain (Section 4 step 8 & Section 11).
Hard Rule 1: Evidence for every claim.
- Validates that every timestamp cited in 'why it works', weak points, and structure beats exists in the sampled frames.
- Allows one repair attempt (snapping to nearest frame within 1000ms).
- If cannot be repaired, drops the claim.
- Enforces >= 95% evidence coverage threshold.
"""

import logging

from reelbrain.app.config import settings
from reelbrain.app.schemas.report import (
    Section9Report,
    StructureBeat,
    WeakPoint,
    WhyItWorksBullet,
)

logger = logging.getLogger(__name__)


class EvidenceValidationError(Exception):
    """Raised when evidence coverage falls below the mandatory 95% threshold."""


def validate_and_repair_report(
    report: Section9Report,
    valid_timestamps: set[int],
) -> Section9Report:
    """
    Validates all timestamped claims against ground truth frame timestamps.
    Applies one repair attempt (snapping within 1000ms); drops unrepairable claims.
    Enforces >= 95% valid evidence coverage.
    """
    if not valid_timestamps:
        return report

    sorted_valid_ts = sorted(valid_timestamps)

    def snap_timestamp(t_ms: int) -> int | None:
        if t_ms in valid_timestamps:
            return t_ms
        # One repair attempt: find closest within 1000ms
        closest = min(sorted_valid_ts, key=lambda x: abs(x - t_ms))
        if abs(closest - t_ms) <= 1000:
            logger.info("Repaired timestamp: %dms -> snapped to nearest frame at %dms", t_ms, closest)
            return closest
        return None

    total_claims = 0
    valid_claims = 0

    # 1. Validate 'Why it works' bullets
    repaired_bullets: list[WhyItWorksBullet] = []
    for bullet in report.why_it_works:
        total_claims += 1
        snapped = snap_timestamp(bullet.t_ms)
        if snapped is not None:
            valid_claims += 1
            repaired_bullets.append(
                WhyItWorksBullet(
                    t_ms=snapped,
                    explanation=bullet.explanation,
                    confidence=bullet.confidence,
                )
            )
        else:
            logger.warning("Dropped unsubstantiated claim at %dms: %s", bullet.t_ms, bullet.explanation)

    report.why_it_works = repaired_bullets

    # 2. Validate 'Weak points'
    repaired_weak_points: list[WeakPoint] = []
    for wp in report.weak_points:
        total_claims += 1
        snapped = snap_timestamp(wp.t_ms)
        if snapped is not None:
            valid_claims += 1
            repaired_weak_points.append(
                WeakPoint(
                    t_ms=snapped,
                    issue=wp.issue,
                    fix=wp.fix,
                )
            )
        else:
            logger.warning("Dropped unsubstantiated weak point at %dms: %s", wp.t_ms, wp.issue)

    report.weak_points = repaired_weak_points

    # 3. Validate Structure Beats
    repaired_beats: list[StructureBeat] = []
    for beat in report.structure_blueprint:
        total_claims += 1
        start_snapped = snap_timestamp(beat.t_start_ms)
        end_snapped = snap_timestamp(beat.t_end_ms) or beat.t_end_ms
        if start_snapped is not None:
            valid_claims += 1
            repaired_beats.append(
                StructureBeat(
                    role=beat.role,
                    t_start_ms=start_snapped,
                    t_end_ms=max(end_snapped, start_snapped + 500),
                    duration_s=round((max(end_snapped, start_snapped + 500) - start_snapped) / 1000.0, 2),
                    technique=beat.technique,
                    purpose=beat.purpose,
                )
            )
        else:
            logger.warning("Dropped ungrounded structure beat at %dms", beat.t_start_ms)

    report.structure_blueprint = repaired_beats

    # Compute Evidence Coverage Percentage
    coverage_pct = round((valid_claims / max(total_claims, 1)) * 100.0, 1)
    report.evidence_coverage_pct = coverage_pct

    if coverage_pct < settings.min_evidence_coverage_pct:
        raise EvidenceValidationError(
            f"Evidence rule violation: {coverage_pct}% of claims backed by frames, "
            f"which is below the mandatory {settings.min_evidence_coverage_pct}% threshold."
        )

    return report
