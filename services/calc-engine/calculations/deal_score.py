"""
Deal score calculation — spec Section 10.

Score is always deterministic: same inputs → same score.
Never assign manually or estimate. Formula ported directly from investor-calc.jsx.

Component breakdown (max points):
  cap rate        → 25 pts
  cash flow       → 25 pts
  cash-on-cash    → 20 pts
  dscr            → 15 pts
  market demand   → 10 pts  (vacancy + DOM + rent trend)
  ─────────────────────────
  subtotal max    → 95 pts
  risk deductions → up to −15 pts (capped)
  ─────────────────────────
  total range     →  0–95 pts
"""

from constants.thresholds import (
    DEAL_SCORE_STRONG,
    DEAL_SCORE_GOOD,
    DEAL_SCORE_CAUTION,
    DEAL_SCORE_MARGINAL,
    DEAL_SCORE_DO_NOT_BUY,
)

# Maximum points each component can contribute
_CAP_MAX = 25
_CF_MAX = 25
_COC_MAX = 20
_DSCR_MAX = 15
_DEMAND_MAX = 10
_DEDUCTION_MAX = 15
_COMPONENT_MAX = 95  # cap + cf + coc + dscr + demand

# Severe-flag gate (spec §10a). A severe dealbreaker (grow-op, flood,
# illegal-unit, special-assessment) CAPS the max achievable score rather than
# deducting points — additive deductions can't express "this one fact sinks it
# no matter how good the rest is". The ceiling drops with each extra severe flag
# so two catastrophes can't read the same as one. All values are unsourced
# placeholders (see NIGHT_NOTES).
_SEVERE_GATE_BASE = 40  # 1 severe flag → "marginal" ceiling
_SEVERE_GATE_STEP = 10  # each additional severe flag lowers the ceiling
_SEVERE_GATE_FLOOR = 10  # never gate below this ("hard pass" band)
_NO_GATE = _COMPONENT_MAX  # no severe flags → no ceiling

_DISPLAY_FLOOR = 5  # a property is always worth something (applied at display only)


def severe_ceiling(severe_flag_count: int) -> int:
    """Max achievable score given N severe gating flags (spec §10a step 4)."""
    if severe_flag_count <= 0:
        return _NO_GATE
    return max(
        _SEVERE_GATE_FLOOR,
        _SEVERE_GATE_BASE - (severe_flag_count - 1) * _SEVERE_GATE_STEP,
    )


def to_display_score(raw: int) -> int:
    """
    Floor then display-normalise a raw 0–95 score to 0–100 (spec §10a steps 7–8).

    Floor: max(5, raw) — a property is always worth something. Normalise: × 100/95.
    The verdict LABEL is taken from the RAW score (get_verdict), never this value,
    so the floor can't lift a property into a better verdict band.
    """
    floored = max(_DISPLAY_FLOOR, raw)
    return round(floored * 100 / _COMPONENT_MAX)


def _score_cap_rate(cap_rate: float) -> int:
    """
    Map cap rate to a score between 0 and 25.

    Args:
        cap_rate: Cap rate as a decimal (e.g. 0.06 = 6%).

    Returns:
        Integer score 0–25.
    """
    if cap_rate >= 0.060:
        return 25
    if cap_rate >= 0.050:
        return 20
    if cap_rate >= 0.040:
        return 15
    if cap_rate >= 0.030:
        return 10
    if cap_rate >= 0.020:
        return 5
    return 0


def _score_cash_flow(cash_flow_monthly: float) -> int:
    """
    Map monthly cash flow to a score between 0 and 25.

    Args:
        cash_flow_monthly: Monthly cash flow in dollars (negative = loss).

    Returns:
        Integer score 0–25.
    """
    if cash_flow_monthly >= 500:
        return 25
    if cash_flow_monthly >= 200:
        return 20
    if cash_flow_monthly >= 0:
        return 13
    if cash_flow_monthly >= -300:
        return 6
    if cash_flow_monthly >= -700:
        return 2
    return 0


def _score_cash_on_cash(cash_on_cash: float) -> int:
    """
    Map cash-on-cash return to a score between 0 and 20.

    Args:
        cash_on_cash: CoC return as a decimal (e.g. 0.08 = 8%).

    Returns:
        Integer score 0–20.
    """
    if cash_on_cash >= 0.08:
        return 20
    if cash_on_cash >= 0.06:
        return 16
    if cash_on_cash >= 0.04:
        return 12
    if cash_on_cash >= 0.02:
        return 8
    if cash_on_cash >= 0.00:
        return 4
    return 0


def _score_dscr(dscr: float) -> int:
    """
    Map DSCR to a score between 0 and 15.

    Args:
        dscr: Debt service coverage ratio.

    Returns:
        Integer score 0–15.
    """
    if dscr >= 1.25:
        return 15
    if dscr >= 1.10:
        return 12
    if dscr >= 1.00:
        return 7
    if dscr >= 0.85:
        return 3
    return 0


def _score_market_demand(
    cmhc_vacancy_rate: float,
    rental_days_on_market: int,
    rent_trend: str,
) -> int:
    """
    Score market demand based on vacancy rate, rental DOM, and rent trend.

    Args:
        cmhc_vacancy_rate: CMHC vacancy rate as a decimal (e.g. 0.018 = 1.8%).
        rental_days_on_market: Median days a rental sits on market in the area.
        rent_trend: Direction of rent movement — 'rising', 'flat', or 'declining'.

    Returns:
        Integer score 0–10.
    """
    demand = 0

    # Vacancy contribution (max 4 pts)
    if cmhc_vacancy_rate < 0.02:
        demand += 4
    elif cmhc_vacancy_rate < 0.03:
        demand += 3
    elif cmhc_vacancy_rate < 0.05:
        demand += 1

    # Days on market contribution (max 3 pts)
    if rental_days_on_market < 14:
        demand += 3
    elif rental_days_on_market <= 30:
        demand += 2

    # Rent trend contribution (max 3 pts)
    if rent_trend == "rising":
        demand += 3
    elif rent_trend == "flat":
        demand += 2

    return demand


def calculate_deal_score(
    cap_rate: float,
    cash_flow_monthly: float,
    cash_on_cash: float,
    dscr: float,
    cmhc_vacancy_rate: float,
    rental_days_on_market: int,
    rent_trend: str,
    risk_flag_deductions: float = 0.0,
    severe_flag_count: int = 0,
) -> dict[str, object]:
    """
    Calculate the PropScout Deal Score (0–95).

    Scores five components (cap rate, cash flow, CoC, DSCR, market demand),
    sums them, then subtracts risk flag deductions (capped at 15).
    Same inputs always produce the same score — fully deterministic.

    Args:
        cap_rate: Cap rate as a decimal (e.g. 0.045 = 4.5%).
        cash_flow_monthly: Monthly cash flow in dollars.
        cash_on_cash: Cash-on-cash return as a decimal (e.g. 0.06 = 6%).
        dscr: Debt service coverage ratio.
        cmhc_vacancy_rate: CMHC vacancy rate as a decimal.
        rental_days_on_market: Median rental days on market in the area.
        rent_trend: 'rising', 'flat', or 'declining'.
        risk_flag_deductions: Total deduction points from confirmed red-flag risk items.
            Each individual flag specifies its own deduct value. Capped at 15.

    Returns:
        Dict with:
            'total' (int): Final score 0–95.
            'verdict' (str): One of 'strong_buy', 'good_deal', 'caution',
                             'marginal', 'do_not_buy', 'hard_pass'.
            'breakdown' (dict): Per-component scores and the deduction applied.
    """
    cap = _score_cap_rate(cap_rate)
    cf = _score_cash_flow(cash_flow_monthly)
    coc = _score_cash_on_cash(cash_on_cash)
    dscr_score = _score_dscr(dscr)
    demand = _score_market_demand(cmhc_vacancy_rate, rental_days_on_market, rent_trend)

    subtotal = cap + cf + coc + dscr_score + demand
    # Standard tier: additive deduction, capped (spec §10a step 3).
    deduction_applied = min(_DEDUCTION_MAX, int(risk_flag_deductions))
    additive = subtotal - deduction_applied
    # Severe tier: gate the CEILING (step 4), then take the lower of the two.
    # Order matters: cap the standard deductions first, subtract, THEN apply the
    # gate ceiling — so a strong base can't float a severe-flagged property up.
    ceiling = severe_ceiling(severe_flag_count)
    total = max(0, min(additive, ceiling))

    return {
        "total": total,
        "verdict": get_verdict(total),
        "breakdown": {
            "cap_rate": cap,
            "cash_flow": cf,
            "cash_on_cash": coc,
            "dscr": dscr_score,
            "demand": demand,
            "subtotal": subtotal,
            "deduction": deduction_applied,
            "component_maxes": {
                "cap_rate": _CAP_MAX,
                "cash_flow": _CF_MAX,
                "cash_on_cash": _COC_MAX,
                "dscr": _DSCR_MAX,
                "demand": _DEMAND_MAX,
            },
        },
    }


def get_verdict(score: float) -> str:
    """
    Map a numeric deal score to a verdict string.

    Args:
        score: Deal score 0–95.

    Returns:
        Verdict string: 'strong_buy', 'good_deal', 'caution',
                        'marginal', 'do_not_buy', or 'hard_pass'.
    """
    if score >= DEAL_SCORE_STRONG:
        return "strong_buy"
    if score >= DEAL_SCORE_GOOD:
        return "good_deal"
    if score >= DEAL_SCORE_CAUTION:
        return "caution"
    if score >= DEAL_SCORE_MARGINAL:
        return "marginal"
    if score >= DEAL_SCORE_DO_NOT_BUY:
        return "do_not_buy"
    return "hard_pass"
