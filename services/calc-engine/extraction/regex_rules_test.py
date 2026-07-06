"""
Recall matrix for the severe-flag regex (grow_op_history, flooding_history).

The point of this file is honesty about recall. Regex catches EXPLICIT mentions.
Grow-ops and floods are described in euphemism in real listings — those are NOT
caught here (by design: the euphemisms overlap estate/power-of-sale/benign copy,
so matching them would create false positives). Haiku covers the euphemism gap.

Three buckets:
  - EXPLICIT  → must fire
  - EUPHEMISM → documented MISSES (asserted as misses so the gap is visible, not
                hidden — if one ever starts matching, this test flags the change)
  - FALSE-POS → must NOT fire (e.g. "sunlight floods the room")
"""

from .regex_rules import extract_regex_flags


def _fired(text: str) -> set[str]:
    return {f.flag_id for f in extract_regex_flags(text)}


# ── Grow-op: explicit → must fire ───────────────────────────────────────────────

EXPLICIT_GROW_OP = [
    "Property was a former grow-op, fully remediated.",
    "Previously used for cannabis cultivation.",
    "Buyer aware this was a registered marijuana grow.",
    "Illegal grow operation discovered and removed in 2019.",
    "Former grow house — see remediation records.",
]


def test_explicit_grow_op_fires() -> None:
    for text in EXPLICIT_GROW_OP:
        assert "grow_op_history" in _fired(text), f"missed explicit grow-op: {text!r}"


# ── Flooding: explicit → must fire ──────────────────────────────────────────────

EXPLICIT_FLOOD = [
    "Home is located in a designated flood zone.",
    "Property sits within the floodplain.",
    "Past water damage in the basement, since repaired.",
    "Flooded basement during the 2017 storm.",
    "Below-grade moisture professionally addressed.",
    "Water ingress noted on inspection.",
    "Regulated by the local conservation authority.",
]


def test_explicit_flood_fires() -> None:
    for text in EXPLICIT_FLOOD:
        assert "flooding_history" in _fired(text), f"missed explicit flood: {text!r}"


# ── Euphemisms: documented MISSES (regex can't, Haiku must) ─────────────────────

EUPHEMISTIC_GROW_OP = [
    "Sold as-is, seller makes no representations or warranties.",
    "Previous use; buyer to perform own due diligence.",
    "Remediation completed; certificate available on request.",
    "Stigmatized property — priced accordingly.",
]

EUPHEMISTIC_FLOOD = [
    "Recent restoration completed in the lower level.",
    "Sump pump and waterproofing recently installed.",
    "Lower level professionally refinished after past moisture.",
]


def test_euphemisms_do_not_fire_the_hard_severe_flags() -> None:
    # Euphemisms must NOT produce a CONFIRMED grow-op/flood claim — too ambiguous,
    # overlap estate/power-of-sale. Asserted so the recall gap stays explicit.
    for text in EUPHEMISTIC_GROW_OP:
        assert "grow_op_history" not in _fired(
            text
        ), f"unexpected grow-op hit: {text!r}"
    for text in EUPHEMISTIC_FLOOD:
        assert "flooding_history" not in _fired(text), f"unexpected flood hit: {text!r}"


# ── Soft-caution tier: euphemisms with verify-language fire verify_history ──────

SOFT_CAUTION = [
    "Sold as-is, seller makes no representations or warranties.",
    "Previous use; buyer to perform own due diligence.",
    "Remediation completed; certificate available on request.",
    "Stigmatized property — priced accordingly.",
    "Recent restoration completed in the lower level.",
]


def test_verify_language_fires_soft_caution_not_hard_flag() -> None:
    # The third tier: ambiguous phrasing becomes an amber "verify, don't assume"
    # prompt (verify_history) — never a hard grow_op/flood claim. For an
    # owner-occupier a wasted question beats a missed danger.
    for text in SOFT_CAUTION:
        fired = _fired(text)
        assert "verify_history" in fired, f"missed soft caution: {text!r}"
        assert (
            "grow_op_history" not in fired and "flooding_history" not in fired
        ), f"soft caution must not become a hard flag: {text!r}"


def test_benign_copy_fires_no_verify_history() -> None:
    # The soft tier must still not fire on genuinely benign listings.
    for text in (
        "Sunlight floods the open-concept living room.",
        "Grow your family here.",
    ):
        assert "verify_history" not in _fired(text), f"soft false positive: {text!r}"


# ── False positives: must NOT fire ──────────────────────────────────────────────

FALSE_POSITIVES = [
    ("Sunlight floods the open-concept living room.", "flooding_history"),
    ("Natural light floods every room all day.", "flooding_history"),
    ("Grow your family in this spacious 4-bedroom home.", "grow_op_history"),
    ("Room to grow — unfinished basement awaits your vision.", "grow_op_history"),
]


def test_no_false_positives_on_benign_copy() -> None:
    for text, flag in FALSE_POSITIVES:
        assert flag not in _fired(text), f"false positive {flag} on: {text!r}"


# ── Severe-gate inputs all have a deterministic regex floor ─────────────────────
# The §10a investor severe gate keys on these four. Each must fire via regex (not
# Haiku alone) so the gate never "fires on nothing" when Haiku is unavailable.

SEVERE_GATE_EXPLICIT = {
    "grow_op_history": "Former grow-op, remediated with documentation.",
    "flooding_history": "Located in a flood zone; past water damage repaired.",
    "illegal_unit_risk": "Non-conforming basement apartment, unpermitted second unit.",
    "special_assessment_risk": "Upcoming special assessment; reserve fund shortfall.",
}


def test_all_four_severe_gate_inputs_have_a_regex_floor() -> None:
    for flag_id, text in SEVERE_GATE_EXPLICIT.items():
        assert flag_id in _fired(
            text
        ), f"severe-gate input has no regex floor: {flag_id}"


def test_new_severe_floors_dont_false_positive() -> None:
    assert "special_assessment_risk" not in _fired(
        "Healthy reserve fund, well-managed condo."
    )
    assert "illegal_unit_risk" not in _fired(
        "Conforming to all by-laws; a legal duplex."
    )
