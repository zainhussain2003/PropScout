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


def test_euphemisms_are_missed_by_regex_documented_gap() -> None:
    # These SHOULD miss — they're ambiguous and overlap benign/other situations.
    # Asserted so the recall gap is explicit; if behaviour changes, this fails
    # loudly and we re-evaluate rather than silently shifting recall.
    for text in EUPHEMISTIC_GROW_OP:
        assert "grow_op_history" not in _fired(
            text
        ), f"unexpected grow-op hit: {text!r}"
    for text in EUPHEMISTIC_FLOOD:
        assert "flooding_history" not in _fired(text), f"unexpected flood hit: {text!r}"


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
