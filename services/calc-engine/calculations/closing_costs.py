"""
Closing cost calculations including Land Transfer Tax by province.
Ontario LTT + Toronto MLTT supported at MVP.
"""

from constants.provinces import ONTARIO_LTT_BRACKETS, TORONTO_MLTT_BRACKETS
from constants.rates import LEGAL_FEES, NRST_RATE, TITLE_INSURANCE, HOME_INSPECTION


def calculate_ltt(purchase_price: float, brackets: list[tuple[float, float]]) -> float:
    """
    Calculate Land Transfer Tax using bracket-based progressive formula.

    Args:
        purchase_price: Property purchase price.
        brackets: List of (upper_limit, rate) tuples in ascending order.

    Returns:
        Total LTT in dollars.
    """
    tax = 0.0
    previous_limit = 0.0

    for limit, rate in brackets:
        taxable = min(purchase_price, limit) - previous_limit
        if taxable <= 0:
            break
        tax += taxable * rate
        previous_limit = limit
        if purchase_price <= limit:
            break

    return round(tax, 2)


def calculate_ontario_ltt(purchase_price: float) -> float:
    """
    Calculate Ontario provincial Land Transfer Tax.

    Args:
        purchase_price: Property purchase price.

    Returns:
        Provincial LTT in dollars.
    """
    return calculate_ltt(purchase_price, list(ONTARIO_LTT_BRACKETS))


def calculate_toronto_mltt(purchase_price: float) -> float:
    """
    Calculate Toronto Municipal Land Transfer Tax (applies on top of provincial).
    Only charge this for properties in the City of Toronto.

    Args:
        purchase_price: Property purchase price.

    Returns:
        Municipal LTT in dollars.
    """
    return calculate_ltt(purchase_price, list(TORONTO_MLTT_BRACKETS))


def estimate_closing_costs(
    purchase_price: float,
    is_toronto: bool = False,
    include_home_inspection: bool = True,
    non_resident: bool = False,
) -> dict[str, float]:
    """
    Estimate total closing costs for an Ontario purchase.

    Args:
        purchase_price: Property purchase price.
        is_toronto: Whether the property is within the City of Toronto.
        include_home_inspection: Whether to include home inspection estimate.
        non_resident: Whether the buyer is a non-Canadian resident subject to NRST.
                      When True, adds 25% of purchase price as NRST (Ontario only).

    Returns:
        Dict with individual line items and a total. Includes an 'nrst' key
        (0.0 when non_resident=False so callers can always read costs['nrst']).
    """
    ltt_provincial = calculate_ontario_ltt(purchase_price)
    ltt_municipal = calculate_toronto_mltt(purchase_price) if is_toronto else 0.0
    nrst = round(purchase_price * NRST_RATE, 2) if non_resident else 0.0
    legal_fees = LEGAL_FEES
    title_insurance = TITLE_INSURANCE
    home_inspection = HOME_INSPECTION if include_home_inspection else 0.0

    total = (
        ltt_provincial
        + ltt_municipal
        + nrst
        + legal_fees
        + title_insurance
        + home_inspection
    )

    return {
        "ltt_provincial": ltt_provincial,
        "ltt_municipal": ltt_municipal,
        "nrst": nrst,
        "legal_fees": legal_fees,
        "title_insurance": title_insurance,
        "home_inspection": home_inspection,
        "total": round(total, 2),
    }


def get_nrst_cost(purchase_price: float, is_non_resident: bool = True) -> float:
    """
    Return the Non-Resident Speculation Tax amount.

    Args:
        purchase_price: Property purchase price in dollars.
        is_non_resident: True if buyer is a non-resident of Canada (default True).

    Returns:
        NRST amount in dollars (purchase_price * NRST_RATE) for non-residents,
        0.0 for resident buyers.
    """
    if not is_non_resident:
        return 0.0
    return round(purchase_price * NRST_RATE, 2)


def get_nrst_risk_flag(purchase_price: float) -> dict:
    """
    Build a red risk flag for non-resident buyers subject to NRST.

    The flag is only constructed (and surfaced) when non_resident=True.
    The caller decides whether to include it in the risk flags list.

    Args:
        purchase_price: Property purchase price used to calculate the NRST amount.

    Returns:
        A risk flag dict compatible with the RiskFlag schema:
            id, severity, label, evidence, confidence.
    """
    nrst_amount = round(purchase_price * NRST_RATE, 2)
    formatted = f"${nrst_amount:,.0f}"
    return {
        "id": "nrst_ontario",
        "severity": "red",
        "label": "Non-Resident Speculation Tax (NRST)",
        "evidence": (
            f"Non-resident buyers pay an additional 25% Non-Resident Speculation Tax "
            f"in Ontario — this adds {formatted} to your closing costs."
        ),
        "confidence": 100,
    }
