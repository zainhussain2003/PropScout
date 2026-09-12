"""
Hold-case economics — what a hold has to deliver to return the cash it consumes.

`equity_build.py` answers "what will I own at year N?". This answers the
different question a buyer facing negative cash flow actually asks: "how much
price growth do I need for this to not have lost me money?"

Deliberately NOT part of the deal score. Appreciation is a scenario input, not
an earned point (spec §10 and docs/DECISIONS.md D-037: the backend is the sole
authority for the score, and the score must be reproducible from property and
financing inputs alone). This module only reports what the arithmetic requires.

SELLING COSTS ARE EXCLUDED, AND THAT MAKES THE RESULT A FLOOR. Realtor
commission is not a regulated or published rate in Ontario — the commonly
quoted 5% is a negotiable convention — and sale-side legal fees are not
published either. Rather than invent a figure that materially moves the answer,
the model stops at the mortgage discharge and reports the growth needed to
return the cash BEFORE the costs of selling. The real break-even is higher by
whatever the owner's own selling costs turn out to be. Every caller must label
it that way; an unlabelled figure would understate the bar, which is the
direction that flatters a deal.

Same treatment as the SunScout obstruction model (D-019), which reports "a floor
on how much shade there is, not a ceiling" rather than assuming heights for
buildings whose heights are unknown.
"""

from .closing_costs import estimate_closing_costs
from .mortgage import calculate_amortization_schedule


def calculate_break_even_appreciation(
    purchase_price: float,
    down_payment_pct: float,
    annual_rate: float,
    amortization_years: int,
    monthly_cash_flow: float,
    is_toronto: bool = False,
    snapshot_years: tuple[int, ...] = (5, 10, 20),
) -> list[dict[str, float]]:
    """
    Minimum annual price growth needed to return the cash a hold consumes.

    Break-even is defined as recovering all cash put in, not as a profit, and
    excludes the costs of selling (see the module docstring — those are not
    published figures, so the result is a floor):

        cash in  = down payment + purchase closing costs
                   + cumulative monthly shortfall over the hold
        cash out = sale price - remaining mortgage balance

    Setting them equal gives the sale price directly:

        sale price = cash in + mortgage balance

    The required rate then follows from compounding:

        rate = (sale price / purchase price) ** (1 / year) - 1

    A negative result is meaningful: the property can lose value by that much a
    year and still return the cash invested, which is what a positive-cash-flow
    property with meaningful paydown looks like.

    Two further limits, both of which mean this is arithmetic and not a forecast:

    - `monthly_cash_flow` is held constant for the whole hold. Rent growth,
      expense growth, vacancy events, capital work and renewal-rate shocks are
      not modelled. Modelling them is the hold-case engine proposed in
      docs/product-audit/INVESTOR_METHOD_RESEARCH.md; this is its first
      deterministic slice.
    - No return is credited on the cash while it is committed, and the equity is
      illiquid until sale. Breaking even is not a return.

    Args:
        purchase_price: Total purchase price in dollars.
        down_payment_pct: Down payment as a decimal (e.g. 0.20 = 20%).
        annual_rate: Nominal annual mortgage rate as a decimal (e.g. 0.0479).
        amortization_years: Amortization period in years.
        monthly_cash_flow: Monthly cash flow in dollars. Negative values are
            contributions the buyer must fund and are accumulated; zero or
            positive values contribute nothing to cash in (a surplus is not
            treated as reducing the cost basis, so the figure stays the
            conservative one).
        is_toronto: Whether the property is in Toronto (adds municipal LTT to
            the purchase closing costs that must be recovered).
        snapshot_years: Hold periods to evaluate. Defaults to the same 5/10/20
            the equity chart uses, so the two read against each other.

    Returns:
        List of dicts, one per snapshot year, each containing:
            year (int): The hold period in years.
            cash_invested (float): Down payment plus purchase closing costs.
            cumulative_contribution (float): Total negative cash flow funded
                over the hold (0.0 when cash flow is not negative).
            total_cash_in (float): cash_invested + cumulative_contribution.
            mortgage_balance (float): Principal still owed at the end of the hold.
            principal_repaid (float): Principal retired over the hold.
            break_even_sale_price (float): Sale price returning total_cash_in,
                before the costs of selling.
            break_even_annual_rate (float): Minimum required annual growth as a
                decimal (e.g. 0.042 = 4.2%); may be negative.

    Raises:
        ValueError: If purchase_price is not positive.

    Example:
        >>> rows = calculate_break_even_appreciation(
        ...     purchase_price=729_900,
        ...     down_payment_pct=0.20,
        ...     annual_rate=0.0479,
        ...     amortization_years=25,
        ...     monthly_cash_flow=-1_833.0,
        ... )
        >>> rows[1]["year"]
        10
    """
    if purchase_price <= 0:
        raise ValueError("Purchase price must be greater than zero")

    principal = purchase_price * (1 - down_payment_pct)
    down_payment = purchase_price * down_payment_pct
    closing = estimate_closing_costs(
        purchase_price=purchase_price,
        is_toronto=is_toronto,
    )
    cash_invested = down_payment + closing["total"]

    schedule = calculate_amortization_schedule(
        principal, annual_rate, amortization_years
    )
    balance_by_year: dict[int, float] = {
        int(entry["year"]): entry["balance"] for entry in schedule
    }
    final_year = max(balance_by_year.keys()) if balance_by_year else 0

    # Only a shortfall is money the buyer has to find. A surplus is deliberately
    # not credited back: crediting it would let a strong rental subsidise the
    # required growth rate and make the figure read better than the cash
    # position warrants.
    monthly_contribution = -monthly_cash_flow if monthly_cash_flow < 0 else 0.0

    results = []
    for year in snapshot_years:
        clamped_year = min(year, final_year) if final_year else 0
        remaining_balance = balance_by_year.get(clamped_year, 0.0)
        # Past full amortization the loan is gone; standard annuity math leaves a
        # small rounding residual (see equity_build.py for the same treatment).
        if year >= amortization_years:
            remaining_balance = 0.0

        cumulative_contribution = monthly_contribution * 12 * year
        total_cash_in = cash_invested + cumulative_contribution

        break_even_sale_price = total_cash_in + remaining_balance
        break_even_annual_rate = (break_even_sale_price / purchase_price) ** (
            1 / year
        ) - 1

        results.append(
            {
                "year": year,
                "cash_invested": round(cash_invested, 2),
                "cumulative_contribution": round(cumulative_contribution, 2),
                "total_cash_in": round(total_cash_in, 2),
                "mortgage_balance": round(remaining_balance, 2),
                "principal_repaid": round(principal - remaining_balance, 2),
                "break_even_sale_price": round(break_even_sale_price, 2),
                "break_even_annual_rate": round(break_even_annual_rate, 4),
            }
        )

    return results
