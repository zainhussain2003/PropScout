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


def test_confident_true_haiku_risk_flag_fires() -> None:
    """A confident value=True Haiku risk fires (renovation_needed aliases to
    needs_work). Matrix: amber for an investor, red for a personal buyer."""
    haiku = {"renovation_needed": _haiku(True, 90, "needs TLC")}

    investor = merge_flags([], haiku, mode="investor")
    assert len(investor) == 1
    assert investor[0].flag_id == "needs_work"
    assert investor[0].severity == "amber"
    assert investor[0].tier == "amber"

    personal = merge_flags([], haiku, mode="personal")
    assert len(personal) == 1
    assert personal[0].severity == "red"
    assert personal[0].tier == "red"


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
    merged = merge_flags(regex, {}, mode="personal")
    assert [f.flag_id for f in merged] == ["needs_work"]
    assert merged[0].severity == "red"  # needs_work is red for a personal buyer


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


# ── Flag severity matrix — per-mode tiers (docs/FLAG_SEVERITY_MATRIX.md) ───────


def test_hidden_cells_drop_the_flag_for_that_mode_only() -> None:
    """tenanted is hidden for tenants (they ARE the tenant) but shown to
    every other mode."""
    regex = [RegexFlag("tenanted", 92, "tenant in place")]
    assert merge_flags(regex, {}, mode="tenant") == []
    assert len(merge_flags(regex, {}, mode="investor")) == 1
    assert len(merge_flags(regex, {}, mode="landlord")) == 1


def test_info_cells_drop_the_flag_for_that_mode_only() -> None:
    """basement_unit is neutral info for a personal buyer but an amber
    (light/egress questions) for a tenant."""
    regex = [RegexFlag("basement_unit", 88, "basement suite")]
    assert merge_flags(regex, {}, mode="personal") == []
    tenant = merge_flags(regex, {}, mode="tenant")
    assert len(tenant) == 1
    assert tenant[0].severity == "amber"


def test_no_pets_fires_amber_for_tenant_only() -> None:
    """no_pets left INFO_FLAG_IDS: the matrix shows it to tenants (RTA s.14
    nuance) and hides it from investors/personal buyers."""
    regex = [RegexFlag("no_pets", 90, "no pets allowed")]
    tenant = merge_flags(regex, {}, mode="tenant")
    assert [f.flag_id for f in tenant] == ["no_pets"]
    assert tenant[0].severity == "amber"
    assert merge_flags(regex, {}, mode="investor") == []
    assert merge_flags(regex, {}, mode="personal") == []
    assert merge_flags(regex, {}, mode="landlord") == []  # info for landlord


def test_severe_cell_yields_severe_tier_and_red_severity() -> None:
    regex = [RegexFlag("grow_op_history", 90, "former grow op")]
    merged = merge_flags(regex, {}, mode="investor")
    assert len(merged) == 1
    assert merged[0].tier == "severe"
    assert merged[0].severity == "red"
    # Tenant column: red display tone, but never 'severe' (no score to gate)
    tenant = merge_flags(regex, {}, mode="tenant")
    assert tenant[0].tier == "red"
    assert tenant[0].severity == "red"


def test_confidence_caps_the_matrix_tier_at_amber() -> None:
    """A 60–84% flag can never render above amber, whatever its matrix cell
    says — soft evidence stays a soft warning."""
    haiku = {"tenanted": _haiku(True, 70, "may be rented")}
    personal = merge_flags([], haiku, mode="personal")  # matrix cell: red
    assert personal[0].tier == "amber"
    assert personal[0].severity == "amber"

    haiku_severe = {"illegal_unit_risk": _haiku(True, 70, "in-law suite?")}
    investor = merge_flags([], haiku_severe, mode="investor")  # matrix: severe
    assert investor[0].tier == "amber"
    assert investor[0].severity == "amber"


def test_unlisted_id_defaults_to_amber_even_at_high_confidence() -> None:
    """Ids the matrix hasn't reviewed can be shown but never deduct — a brand
    new Haiku invention must not move the score until it's in the matrix."""
    haiku = {"brand_new_flag": _haiku(True, 95, "something scary")}
    for mode in ("investor", "personal", "tenant", "landlord"):
        merged = merge_flags([], haiku, mode=mode)
        assert len(merged) == 1
        assert merged[0].tier == "amber"
        assert merged[0].severity == "amber"
