"""
Unit tests for the flag severity matrix (docs/FLAG_SEVERITY_MATRIX.md).

The matrix is the approved per-flag × per-mode ruleset. These tests pin the
approved cells so an accidental edit (especially to a SEVERE cell, which needs
product sign-off) fails loudly.
"""

from .flag_matrix import (
    FLAG_SEVERITY_MATRIX,
    MODES,
    DEFAULT_TIER,
    get_flag_tier,
    TIER_SEVERE,
    TIER_RED,
    TIER_AMBER,
    TIER_INFO,
    TIER_HIDDEN,
)

_VALID_TIERS = {TIER_SEVERE, TIER_RED, TIER_AMBER, TIER_INFO, TIER_HIDDEN}

# The four severe dealbreakers — any change to these cells needs sign-off.
_SEVERE_IDS = {
    "grow_op_history",
    "flooding_history",
    "illegal_unit_risk",
    "special_assessment_risk",
}


def test_every_row_covers_all_four_modes_with_valid_tiers() -> None:
    for flag_id, cells in FLAG_SEVERITY_MATRIX.items():
        assert set(cells) == set(MODES), f"{flag_id} missing a mode column"
        for mode, tier in cells.items():
            assert tier in _VALID_TIERS, f"{flag_id}[{mode}] = {tier!r}"


def test_severe_cells_exist_only_on_the_four_approved_ids() -> None:
    for flag_id, cells in FLAG_SEVERITY_MATRIX.items():
        has_severe = any(t == TIER_SEVERE for t in cells.values())
        assert has_severe == (flag_id in _SEVERE_IDS), flag_id


def test_severe_ids_gate_investor_personal_landlord_never_tenant() -> None:
    """Tenant has no deal score — its column is display tone only, so severe
    ids render red/amber there but never 'severe'."""
    for flag_id in _SEVERE_IDS:
        cells = FLAG_SEVERITY_MATRIX[flag_id]
        assert cells["investor"] == TIER_SEVERE
        assert cells["personal"] == TIER_SEVERE
        assert cells["landlord"] == TIER_SEVERE
        assert cells["tenant"] in (TIER_RED, TIER_AMBER)


def test_law_informed_cells_match_the_approved_matrix() -> None:
    # N12 own-use: a personal buyer may not get possession of a tenanted unit
    assert get_flag_tier("tenanted", "personal") == TIER_RED
    assert get_flag_tier("tenanted", "investor") == TIER_AMBER
    assert get_flag_tier("tenanted", "tenant") == TIER_HIDDEN
    # Fire-egress trio: the tenant pays for a "bedroom" that isn't one
    for flag_id in ("unverified_bedroom", "glass_door_bedroom", "no_exterior_window"):
        assert get_flag_tier(flag_id, "tenant") == TIER_RED
        assert get_flag_tier(flag_id, "investor") == TIER_AMBER
    # RTA s.14: no-pets clause is void in a signed ON lease but refusal
    # pre-lease is legal — only the tenant sees the nuance
    assert get_flag_tier("no_pets", "tenant") == TIER_AMBER
    assert get_flag_tier("no_pets", "investor") == TIER_HIDDEN
    assert get_flag_tier("no_pets", "personal") == TIER_HIDDEN
    assert get_flag_tier("no_pets", "landlord") == TIER_INFO


def test_mode_flips_needs_work_and_basement_unit() -> None:
    assert get_flag_tier("needs_work", "investor") == TIER_AMBER  # priced in
    assert get_flag_tier("needs_work", "personal") == TIER_RED  # family project
    assert get_flag_tier("basement_unit", "personal") == TIER_INFO
    assert get_flag_tier("basement_unit", "tenant") == TIER_AMBER


def test_high_dom_is_leverage_not_risk_in_every_mode() -> None:
    for mode in MODES:
        assert get_flag_tier("high_dom", mode) == TIER_INFO


def test_verify_history_soft_caution_never_deducts_anywhere() -> None:
    for mode in MODES:
        assert get_flag_tier("verify_history", mode) == TIER_AMBER


def test_unlisted_ids_default_to_amber_in_all_modes() -> None:
    """New/legacy ids the matrix hasn't reviewed yet must land on the safe
    middle — shown, never deducting — until added to the matrix doc."""
    assert DEFAULT_TIER == TIER_AMBER
    for mode in MODES:
        assert get_flag_tier("parking_unclear", mode) == TIER_AMBER
        assert get_flag_tier("some_future_flag", mode) == TIER_AMBER


def test_unknown_mode_falls_back_to_investor_column() -> None:
    assert get_flag_tier("tenanted", "not_a_mode") == TIER_AMBER
    assert get_flag_tier("grow_op_history", "not_a_mode") == TIER_SEVERE
