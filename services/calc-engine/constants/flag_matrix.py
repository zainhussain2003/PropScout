"""
Flag severity matrix — per-flag × per-report-mode severity TIER.

Source of truth: docs/FLAG_SEVERITY_MATRIX.md (approved ruleset v1, 2026-07-01).
Spec Section 10a (severe gate) + Section 19 (extraction pipeline).

Tiers:
    severe — gates the investment score's ceiling (spec §10a); renders red
    red    — deducts −5 (capped −15) from the investment score; renders red
    amber  — shown as a soft warning, no deduction
    info   — neutral fact, excluded from the risk section entirely
    hidden — not shown at all in this mode

Rules:
- Magnitudes are NOT defined here — they stay in deal_score.py / thresholds
  (−5 cap −15, gate ceilings 40/30/20/10, HomeScore 34/20/10).
- Tenant mode has no deal score, so its tiers are display tone only.
- A flag id not listed here defaults to AMBER in every mode (safe middle) —
  new ids get added to the matrix doc when first seen live.
- Confidence still caps the tier: a flag below the red-confidence threshold
  (85) can never render above amber, whatever its matrix cell says. That
  capping happens in extraction/logic_gate.py, not here.
- Any change to a SEVERE cell needs product sign-off (per the matrix doc).
"""

TIER_SEVERE = "severe"
TIER_RED = "red"
TIER_AMBER = "amber"
TIER_INFO = "info"
TIER_HIDDEN = "hidden"

MODES = ("investor", "personal", "tenant", "landlord")

DEFAULT_TIER = TIER_AMBER


# Shorthand builders keep the table readable
def _all(tier: str) -> dict[str, str]:
    """Same tier in all four modes."""
    return {mode: tier for mode in MODES}


def _tiers(investor: str, personal: str, tenant: str, landlord: str) -> dict[str, str]:
    """Explicit per-mode tiers, in matrix column order."""
    return {
        "investor": investor,
        "personal": personal,
        "tenant": tenant,
        "landlord": landlord,
    }


# The amenity / lease-fact ids — INFO in every mode ("amenities are not risks")
_AMENITY_IDS = (
    "pets_allowed",
    "parking_included",
    "utilities_included",
    "furnished",
    "den_present",
    "no_smoking",
    "short_term_ok",
    "new_construction",
    "recently_renovated",
)

FLAG_SEVERITY_MATRIX: dict[str, dict[str, str]] = {
    # ── Severe dealbreakers (each has a deterministic regex floor) ────────────
    "grow_op_history": _tiers(TIER_SEVERE, TIER_SEVERE, TIER_RED, TIER_SEVERE),
    "flooding_history": _tiers(TIER_SEVERE, TIER_SEVERE, TIER_RED, TIER_SEVERE),
    "illegal_unit_risk": _tiers(TIER_SEVERE, TIER_SEVERE, TIER_RED, TIER_SEVERE),
    "special_assessment_risk": _tiers(
        TIER_SEVERE, TIER_SEVERE, TIER_AMBER, TIER_SEVERE
    ),
    # ── Mode-dependent risks ──────────────────────────────────────────────────
    # LAW: N12 own-use process (60d + 1mo compensation, contestable at LTB) —
    # a personal buyer may not get possession.
    "tenanted": _tiers(TIER_AMBER, TIER_RED, TIER_HIDDEN, TIER_AMBER),
    # Investor prices it in; a family inherits a project + financing risk.
    "needs_work": _tiers(TIER_AMBER, TIER_RED, TIER_HIDDEN, TIER_AMBER),
    "str_history": _tiers(TIER_AMBER, TIER_AMBER, TIER_HIDDEN, TIER_AMBER),
    "basement_unit": _tiers(TIER_AMBER, TIER_INFO, TIER_AMBER, TIER_AMBER),
    # LAW-informed (fire egress) — the tenant pays for a "bedroom" that isn't.
    "unverified_bedroom": _tiers(TIER_AMBER, TIER_AMBER, TIER_RED, TIER_AMBER),
    "glass_door_bedroom": _tiers(TIER_AMBER, TIER_AMBER, TIER_RED, TIER_AMBER),
    "no_exterior_window": _tiers(TIER_AMBER, TIER_AMBER, TIER_RED, TIER_AMBER),
    # ── Verify-tier soft cautions (never deduct) ──────────────────────────────
    "stigmatized": _all(TIER_AMBER),
    "verify_history": _all(TIER_AMBER),
    # ── Structural / future ids ───────────────────────────────────────────────
    "pre_1980_build": _tiers(TIER_AMBER, TIER_AMBER, TIER_HIDDEN, TIER_AMBER),
    "condo_fee_unknown": _tiers(TIER_AMBER, TIER_AMBER, TIER_HIDDEN, TIER_AMBER),
    # Leverage, not risk — positive for the user in every mode.
    "high_dom": _all(TIER_INFO),
    # LAW: void in a signed ON lease (RTA s.14) but refusal pre-lease is legal;
    # condo bylaws may still ban — the tenant sees this nuance as amber.
    "no_pets": _tiers(TIER_HIDDEN, TIER_HIDDEN, TIER_AMBER, TIER_INFO),
    "utilities_extra": _all(TIER_INFO),
    # ── Amenities (INFO_FLAG_IDS complement) ──────────────────────────────────
    **{flag_id: _all(TIER_INFO) for flag_id in _AMENITY_IDS},
}


def get_flag_tier(flag_id: str, mode: str) -> str:
    """
    Look up a flag's severity tier for a report mode.

    Args:
        flag_id: Canonical flag id (post FLAG_ID_ALIASES normalisation).
        mode: One of MODES; unknown modes fall back to 'investor' columns.

    Returns:
        One of TIER_SEVERE / TIER_RED / TIER_AMBER / TIER_INFO / TIER_HIDDEN.
        Unlisted flag ids return DEFAULT_TIER (amber) in every mode.
    """
    cells = FLAG_SEVERITY_MATRIX.get(flag_id)
    if cells is None:
        return DEFAULT_TIER
    return cells.get(mode, cells["investor"])
