"""
Equity build projection — mortgage paydown + property appreciation.

Used to generate the 5 / 10 / 20-year equity chart in the Investor Report.
Appreciation is a user-adjustable parameter (default 3%), not a fixed assumption.
"""

from .mortgage import calculate_amortization_schedule


def calculate_equity_build(
    purchase_price: float,
    down_payment_pct: float,
    annual_rate: float,
    amortization_years: int,
    appreciation_rate: float = 0.03,
    snapshot_years: tuple[int, ...] = (5, 10, 20),
) -> list[dict[str, float]]:
    """
    Project property equity at specified future years.

    Equity at year Y = property value at Y - remaining mortgage balance at Y.

    Property value at Y = purchase_price × (1 + appreciation_rate)^Y
    Remaining balance at Y comes from the amortization schedule.

    The appreciation rate is used only for equity projections — it is never
    used in cash flow, cap rate, DSCR, or deal score calculations.

    Args:
        purchase_price: Total purchase price in dollars.
        down_payment_pct: Down payment as a decimal (e.g. 0.20 = 20%).
        annual_rate: Nominal annual mortgage rate as a decimal (e.g. 0.0479).
        amortization_years: Amortization period in years.
        appreciation_rate: Annual property appreciation as a decimal (default 3%).
            Expose as a slider in the UI so users can model their own assumptions.
        snapshot_years: Years at which to compute equity (default: 5, 10, 20).
            Years beyond the amortization period are clamped to the final balance (0).

    Returns:
        List of dicts, one per snapshot year, each containing:
            year (int): The projection year.
            property_value (float): Estimated property value after appreciation.
            mortgage_balance (float): Remaining principal owed.
            equity (float): property_value - mortgage_balance.
            equity_pct (float): equity / property_value — equity as a fraction.
            paydown_gain (float): Equity gained through mortgage paydown only
                (balance reduction from initial principal, no appreciation).
            appreciation_gain (float): Equity gained through price appreciation only
                (property_value - purchase_price).

    Example:
        >>> result = calculate_equity_build(
        ...     purchase_price=729_900,
        ...     down_payment_pct=0.20,
        ...     annual_rate=0.0479,
        ...     amortization_years=25,
        ...     appreciation_rate=0.03,
        ... )
        >>> result[0]["year"]
        5
    """
    principal = purchase_price * (1 - down_payment_pct)

    # Build full amortization schedule once (year-by-year balances)
    schedule = calculate_amortization_schedule(
        principal, annual_rate, amortization_years
    )

    # Index by year for O(1) lookup: {1: balance, 2: balance, ...}
    balance_by_year: dict[int, float] = {
        int(entry["year"]): entry["balance"] for entry in schedule
    }
    final_year = max(balance_by_year.keys())

    results = []
    for year in snapshot_years:
        # Clamp to final amortization year (balance = 0 after payoff)
        clamped_year = min(year, final_year)
        remaining_balance = balance_by_year.get(clamped_year, 0.0)

        # Treat floating-point residuals at or past full amortization as zero.
        # Standard annuity math leaves a small rounding residual (~$1–$5) on the
        # final period due to accumulated rounding in monthly payment calculations.
        if year >= amortization_years:
            remaining_balance = 0.0

        property_value = purchase_price * (1 + appreciation_rate) ** year
        equity = property_value - remaining_balance

        paydown_gain = principal - remaining_balance
        appreciation_gain = property_value - purchase_price

        results.append(
            {
                "year": year,
                "property_value": round(property_value, 2),
                "mortgage_balance": round(remaining_balance, 2),
                "equity": round(equity, 2),
                "equity_pct": (
                    round(equity / property_value, 4) if property_value > 0 else 0.0
                ),
                "paydown_gain": round(paydown_gain, 2),
                "appreciation_gain": round(appreciation_gain, 2),
            }
        )

    return results
