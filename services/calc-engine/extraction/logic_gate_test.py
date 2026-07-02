"""
Unit tests for logic_gate.merge_flags — confidence thresholds, flag polarity,
and value handling.

Two composition bugs were found in live E2E testing (2026-07-01):
  1. Haiku results were merged on confidence alone, ignoring `value` — a
     confident FALSE ("this is NOT a basement", value=False, confidence=90)
     fired a red flag. A live second-floor unit got is_basement_unit:red.
  2. Every extracted field was treated as a RISK: amenity/info fields like
     utilities_included became red flags at >=85 confidence and deducted -5
     each. A live listing lost 15 points for including utilities and parking.
"""

from .logic_gate import merge_flags
from .regex_rules import RegexFlag


def _haiku(value: bool, confidence: int, evidence: str = "quote") -> dict[str, object]:
    return {"value": value, "confidence": confidence, "evidence": evidence}


# ── Value handling ─────────────────────────────────────────────────────────────


def test_confident_false_haiku_flag_never_fires() -> None:
    """value=False means the flag was NOT detected — high confidence in the
    absence must not become a red flag."""
    merged = merge_flags([], {"is_basement_unit": _haiku(False, 90)})
    assert merged == []


def test_confident_true_haiku_risk_flag_fires_red() -> None:
    merged = merge_flags([], {"renovation_needed": _haiku(True, 90, "needs TLC")})
    assert len(merged) == 1
    assert merged[0].flag_id == "renovation_needed"
    assert merged[0].severity == "red"


# ── Flag polarity — info/amenity fields are not risks ──────────────────────────


def test_amenity_flags_are_excluded_from_risk_output() -> None:
    """utilities_included / parking_included / den_present are amenities or
    lease info — they must never render as risks or deduct from the score."""
    regex = [RegexFlag("utilities_included", 90, "all utilities included")]
    haiku = {
        "parking_included": _haiku(True, 95, "1 parking included"),
        "den_present": _haiku(True, 88, "spacious den"),
    }
    merged = merge_flags(regex, haiku)
    assert merged == []


def test_risk_flags_survive_alongside_filtered_amenities() -> None:
    regex = [
        RegexFlag("utilities_included", 90, "all utilities included"),
        RegexFlag("needs_work", 92, "sold as-is"),
    ]
    merged = merge_flags(regex, {})
    assert [f.flag_id for f in merged] == ["needs_work"]
    assert merged[0].severity == "red"


# ── Duplicate basement ids collapse to one flag ────────────────────────────────


def test_basement_aliases_collapse_to_single_flag() -> None:
    """is_basement_unit (Haiku) and basement_unit (regex) describe the same
    thing — a listing must not show two basement rows (seen live)."""
    regex = [RegexFlag("basement_unit", 88, "basement suite")]
    haiku = {"is_basement_unit": _haiku(True, 90, "below grade")}
    merged = merge_flags(regex, haiku)
    assert len(merged) == 1
    assert merged[0].flag_id == "basement_unit"
    assert merged[0].confidence == 90  # highest of the pair


# ── Existing threshold behaviour (regression) ──────────────────────────────────


def test_confidence_thresholds_unchanged() -> None:
    merged = merge_flags(
        [],
        {
            "verify_history": _haiku(True, 65, "no representations"),
            "parking_unclear": _haiku(True, 59, "call for details"),
        },
    )
    assert len(merged) == 1
    assert merged[0].flag_id == "verify_history"
    assert merged[0].severity == "amber"


def test_regex_and_haiku_same_flag_takes_higher_confidence() -> None:
    regex = [RegexFlag("tenanted", 92, "tenant in place")]
    haiku = {"tenanted": _haiku(True, 80, "currently rented")}
    merged = merge_flags(regex, haiku)
    assert len(merged) == 1
    assert merged[0].confidence == 92
    assert merged[0].source == "both"
