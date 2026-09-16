"""
Version-3 shadow score (D-115) — the redesign that separates what the
property earns from whether this financing survives, reports investor
outcomes instead of scoring them, and treats a severe flag as a risk status
rather than an arithmetic cap.

Runs beside the version-2 headline on every analysis and is stored with it.
It becomes the headline only after calibration against a real property set;
until then nothing in a report is decided by it. Deterministic: same inputs,
same output.
"""

from constants.score_v3 import (
    CAP_RATE_BRACKETS,
    CAP_RATE_MAX,
    COMPOSITE_FINANCING_WEIGHT,
    COMPOSITE_PROPERTY_WEIGHT,
    DEBT_BURDEN_BRACKETS,
    DEBT_BURDEN_MAX,
    DEMAND_MAX,
    DEMAND_SCALE,
    DSCR_BRACKETS,
    DSCR_MAX,
    OPERATING_MARGIN_BRACKETS,
    OPERATING_MARGIN_MAX,
    RENT_CUSHION_BRACKETS,
    RENT_CUSHION_MAX,
)
from constants.score_versions import SCORE_VERSION_SHADOW
from calculations.deal_score import _score_market_demand


def _bracket_at_least(value: float, brackets: tuple[tuple[float, int], ...]) -> int:
    """First bracket whose threshold the value meets or exceeds; 0 below all."""
    for threshold, points in brackets:
        if value >= threshold:
            return points
    return 0


def _bracket_at_most(value: float, brackets: tuple[tuple[float, int], ...]) -> int:
    """First bracket whose threshold the value is at or under; 0 above all."""
    for threshold, points in brackets:
        if value <= threshold:
            return points
    return 0


def calculate_score_v3(
    *,
    cap_rate: float,
    noi: float,
    gross_annual_rent: float,
    dscr: float | None,
    mortgage_payment_monthly: float,
    effective_rental_income_monthly: float,
    monthly_rent: float,
    break_even_asking_rent: float,
    cash_flow_monthly: float,
    cash_on_cash: float,
    cmhc_vacancy_rate: float,
    rental_days_on_market: int | None,
    rent_trend: str | None,
    severe_flag_count: int,
    red_flag_count: int,
    amber_flag_count: int,
) -> dict[str, object]:
    """
    Compute the version-3 shadow score.

    Args:
        cap_rate: NOI / value, decimal.
        noi: Annual net operating income.
        gross_annual_rent: Annual rent at full occupancy.
        dscr: Debt service coverage ratio; None when there is no debt.
        mortgage_payment_monthly: Monthly principal and interest (0 when owned outright).
        effective_rental_income_monthly: Monthly rent after the vacancy allowance.
        monthly_rent: Monthly rent at full occupancy.
        break_even_asking_rent: The rent to ask to break even (D-112).
        cash_flow_monthly: Monthly cash flow at the current rent — reported, not scored.
        cash_on_cash: Annual cash-on-cash return — reported, not scored.
        cmhc_vacancy_rate: Market vacancy, decimal.
        rental_days_on_market: Measured DOM or None (D-105).
        rent_trend: Measured trend or None (D-105).
        severe_flag_count: Active severe (gating) flags — a status here, not a cap.
        red_flag_count: Active standard red flags.
        amber_flag_count: Active amber flags.

    Returns:
        Dict with 'version', 'property_economics', 'financing_resilience',
        'outcomes', 'risk_status', 'composite' and a per-component breakdown.
    """
    # ── Property economics ────────────────────────────────────────────────
    cap_pts = _bracket_at_least(cap_rate, CAP_RATE_BRACKETS)
    margin = noi / gross_annual_rent if gross_annual_rent > 0 else 0.0
    margin_pts = _bracket_at_least(margin, OPERATING_MARGIN_BRACKETS)
    demand_pts = min(
        DEMAND_MAX,
        _score_market_demand(cmhc_vacancy_rate, rental_days_on_market, rent_trend)
        * DEMAND_SCALE,
    )
    property_economics = cap_pts + margin_pts + demand_pts

    # ── Financing resilience ──────────────────────────────────────────────
    dscr_pts = DSCR_MAX if dscr is None else _bracket_at_least(dscr, DSCR_BRACKETS)
    if mortgage_payment_monthly <= 0:
        burden_pts = DEBT_BURDEN_MAX
        debt_burden = 0.0
    elif effective_rental_income_monthly > 0:
        debt_burden = mortgage_payment_monthly / effective_rental_income_monthly
        burden_pts = _bracket_at_most(debt_burden, DEBT_BURDEN_BRACKETS)
    else:
        debt_burden = float("inf")
        burden_pts = 0
    cushion = (
        (monthly_rent - break_even_asking_rent) / monthly_rent
        if monthly_rent > 0
        else -1.0
    )
    cushion_pts = _bracket_at_least(cushion, RENT_CUSHION_BRACKETS)
    financing_resilience = dscr_pts + burden_pts + cushion_pts

    # ── Risk status: a gate, not a cap ────────────────────────────────────
    if severe_flag_count > 0:
        risk_status = "critical"
    elif red_flag_count > 0:
        risk_status = "flagged"
    else:
        risk_status = "clear"

    composite = round(
        COMPOSITE_PROPERTY_WEIGHT * property_economics
        + COMPOSITE_FINANCING_WEIGHT * financing_resilience
    )

    return {
        "version": SCORE_VERSION_SHADOW,
        "property_economics": property_economics,
        "financing_resilience": financing_resilience,
        "composite": composite,
        "risk_status": risk_status,
        "outcomes": {
            "cash_flow_monthly": round(cash_flow_monthly, 2),
            "cash_on_cash": round(cash_on_cash, 4),
        },
        "breakdown": {
            "cap_rate": cap_pts,
            "operating_margin": margin_pts,
            "demand": demand_pts,
            "dscr": dscr_pts,
            "debt_burden": burden_pts,
            "rent_cushion": cushion_pts,
            "maxes": {
                "cap_rate": CAP_RATE_MAX,
                "operating_margin": OPERATING_MARGIN_MAX,
                "demand": DEMAND_MAX,
                "dscr": DSCR_MAX,
                "debt_burden": DEBT_BURDEN_MAX,
                "rent_cushion": RENT_CUSHION_MAX,
            },
            "inputs": {
                "operating_margin": round(margin, 4),
                "debt_burden": (
                    None if debt_burden == float("inf") else round(debt_burden, 4)
                ),
                "rent_cushion": round(cushion, 4),
            },
        },
        "flags": {
            "severe": severe_flag_count,
            "red": red_flag_count,
            "amber": amber_flag_count,
        },
    }
