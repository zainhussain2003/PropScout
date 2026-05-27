"""
Closing cost calculations including Land Transfer Tax by province.
Ontario LTT + Toronto MLTT supported at MVP.
"""

from constants.provinces import ONTARIO_LTT_BRACKETS, TORONTO_MLTT_BRACKETS
from constants.rates import LEGAL_FEES, TITLE_INSURANCE, HOME_INSPECTION


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


def calculate_ontario_ltt(
    purchase_price: float | None = None,
    *,
    price: float | None = None,
    is_toronto: bool = False,
) -> float:
    """
    Calculate Ontario provincial Land Transfer Tax.

    Accepts two naming conventions so that both internal callers
    (``purchase_price``) and the external verification script (``price``,
    ``is_toronto``) work without modification.

    Args:
        purchase_price: Property purchase price.  Alias: ``price``.
        is_toronto: When ``True``, adds the Toronto Municipal Land Transfer
            Tax (MLTT) on top of the provincial LTT.  Default ``False``.

    Returns:
        Provincial LTT in dollars (plus MLTT when ``is_toronto=True``).
    """
    effective_price: float = (
        purchase_price
        if purchase_price is not None
        else (price if price is not None else 0.0)
    )
    ltt = calculate_ltt(effective_price, list(ONTARIO_LTT_BRACKETS))
    if is_toronto:
        ltt += calculate_toronto_mltt(effective_price)
    return round(ltt, 2)


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
) -> dict[str, float]:
    """
    Estimate total closing costs for an Ontario purchase.

    Args:
        purchase_price: Property purchase price.
        is_toronto: Whether the property is within the City of Toronto.
        include_home_inspection: Whether to include home inspection estimate.

    Returns:
        Dict with individual line items and a total.
    """
    ltt_provincial = calculate_ontario_ltt(purchase_price)
    ltt_municipal = calculate_toronto_mltt(purchase_price) if is_toronto else 0.0
    legal_fees = LEGAL_FEES
    title_insurance = TITLE_INSURANCE
    home_inspection = HOME_INSPECTION if include_home_inspection else 0.0

    total = (
        ltt_provincial + ltt_municipal + legal_fees + title_insurance + home_inspection
    )

    return {
        "ltt_provincial": ltt_provincial,
        "ltt_municipal": ltt_municipal,
        "legal_fees": legal_fees,
        "title_insurance": title_insurance,
        "home_inspection": home_inspection,
        "total": round(total, 2),
    }
