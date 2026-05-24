"""
Deal score calculation — spec Section 10.
Score is always deterministic: same inputs → same score.
Never assign manually or estimate.
"""

# TODO: Implement full deal score formula from spec Section 10.
# This is a placeholder. Do not use in production until fully implemented.


def calculate_deal_score(
    cap_rate: float,
    cash_flow_monthly: float,
    dscr: float,
    closing_costs_pct: float,
    risk_flag_deductions: float,
) -> dict[str, object]:
    """
    Calculate the PropScout Deal Score (0–100).

    Args:
        cap_rate: Cap rate as a decimal.
        cash_flow_monthly: Monthly cash flow in dollars.
        dscr: Debt service coverage ratio.
        closing_costs_pct: Closing costs as a percentage of purchase price.
        risk_flag_deductions: Total deductions from red-flag risk items (0–100).

    Returns:
        Dict with 'total' (float), 'verdict' (str), and 'breakdown' (dict).
    """
    raise NotImplementedError(
        "Deal score formula: see spec Section 10 — implement before use"
    )


def get_verdict(score: float) -> str:
    """
    Map a numeric deal score to a verdict string.

    Args:
        score: Deal score 0–100.

    Returns:
        Verdict string matching DealVerdict type.
    """
    from constants.thresholds import (
        DEAL_SCORE_STRONG,
        DEAL_SCORE_GOOD,
        DEAL_SCORE_CAUTION,
        DEAL_SCORE_MARGINAL,
        DEAL_SCORE_DO_NOT_BUY,
    )

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
