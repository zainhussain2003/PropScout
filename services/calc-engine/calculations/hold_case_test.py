"""Unit tests for break-even appreciation (hold_case.py)."""

import pytest

from .closing_costs import estimate_closing_costs
from .hold_case import calculate_break_even_appreciation
from .mortgage import calculate_amortization_schedule

# 5702 Buttermill Ave — the calibration property from TESTING.md, at the
# deep-negative cash flow the regression suite pins (~-$1,833/mo).
BUTTERMILL = {
    "purchase_price": 729_900.0,
    "down_payment_pct": 0.20,
    "annual_rate": 0.0479,
    "amortization_years": 25,
    "monthly_cash_flow": -1_833.0,
}


def _rows(**overrides) -> list[dict[str, float]]:
    return calculate_break_even_appreciation(**{**BUTTERMILL, **overrides})


def test_returns_one_row_per_snapshot_year() -> None:
    """Defaults mirror the equity chart's 5 / 10 / 20 snapshots."""
    rows = _rows()
    assert [row["year"] for row in rows] == [5, 10, 20]


def test_break_even_rate_derived_independently() -> None:
    """
    Recompute the 10-year figure from first principles rather than trusting the
    module's own arithmetic: cash in must come back out of the sale.
    """
    year = 10
    row = next(r for r in _rows() if r["year"] == year)

    down_payment = 729_900.0 * 0.20
    closing = estimate_closing_costs(purchase_price=729_900.0, is_toronto=False)
    cash_in = down_payment + closing["total"] + 1_833.0 * 12 * year

    principal = 729_900.0 * 0.80
    schedule = calculate_amortization_schedule(principal, 0.0479, 25)
    balance = next(e["balance"] for e in schedule if int(e["year"]) == year)

    # Selling costs are excluded on purpose — commission is not a published
    # rate, so the figure is a floor (see the module docstring).
    expected_price = cash_in + balance
    expected_rate = (expected_price / 729_900.0) ** (1 / year) - 1

    assert row["total_cash_in"] == pytest.approx(cash_in, abs=0.01)
    assert row["mortgage_balance"] == pytest.approx(balance, abs=0.01)
    assert row["break_even_sale_price"] == pytest.approx(expected_price, abs=0.01)
    assert row["break_even_annual_rate"] == pytest.approx(expected_rate, abs=0.0001)


def test_break_even_price_actually_returns_the_cash() -> None:
    """
    The definition, checked as a round trip: selling at the break-even price
    must leave exactly the cash that went in — no profit, no loss, and before
    any cost of selling.
    """
    for row in _rows():
        proceeds = row["break_even_sale_price"] - row["mortgage_balance"]
        assert proceeds == pytest.approx(row["total_cash_in"], abs=0.02)


def test_deeper_monthly_loss_requires_more_growth() -> None:
    """A larger shortfall is more cash to recover, so the bar rises."""
    mild = _rows(monthly_cash_flow=-200.0)
    severe = _rows(monthly_cash_flow=-2_500.0)
    for m, s in zip(mild, severe):
        assert s["break_even_annual_rate"] > m["break_even_annual_rate"]


def test_positive_cash_flow_contributes_nothing() -> None:
    """
    A surplus is deliberately not credited against the cost basis, so break-even
    is identical to the zero-cash-flow case rather than flattered by it.
    """
    breakeven = _rows(monthly_cash_flow=0.0)
    surplus = _rows(monthly_cash_flow=850.0)
    assert [r["cumulative_contribution"] for r in surplus] == [0.0, 0.0, 0.0]
    assert [r["break_even_annual_rate"] for r in surplus] == [
        r["break_even_annual_rate"] for r in breakeven
    ]


def test_break_even_can_be_negative_when_paydown_carries_the_hold() -> None:
    """
    Strong cash flow plus 20 years of paydown means the property may fall in
    value and still return the cash. A model that clamped at zero would hide
    this, and it is the honest upside of the same arithmetic.
    """
    rows = _rows(monthly_cash_flow=1_500.0, down_payment_pct=0.50)
    assert rows[-1]["year"] == 20
    assert rows[-1]["break_even_annual_rate"] < 0


def test_longer_hold_lowers_the_required_annual_rate() -> None:
    """
    Compounding and paydown both work in the buyer's favour over time, even
    though the cumulative shortfall grows. This is the load-bearing claim behind
    "a long enough hold can absorb a monthly loss".
    """
    rows = _rows()
    rates = [row["break_even_annual_rate"] for row in rows]
    assert rates[0] > rates[1] > rates[2]


def test_principal_repaid_and_balance_reconcile() -> None:
    """Paydown plus what is still owed must equal the original loan."""
    principal = 729_900.0 * 0.80
    for row in _rows():
        assert row["principal_repaid"] + row["mortgage_balance"] == pytest.approx(
            principal, abs=0.01
        )


def test_hold_past_amortization_owes_nothing() -> None:
    """A 20-year hold on a 15-year amortization has no mortgage left to discharge."""
    rows = _rows(amortization_years=15)
    assert rows[-1]["mortgage_balance"] == 0.0


def test_toronto_closing_costs_raise_the_bar() -> None:
    """Municipal LTT is cash that also has to come back out of the sale."""
    outside = _rows(is_toronto=False)
    toronto = _rows(is_toronto=True)
    for o, t in zip(outside, toronto):
        assert t["cash_invested"] > o["cash_invested"]
        assert t["break_even_annual_rate"] > o["break_even_annual_rate"]


def test_result_is_a_floor_excluding_selling_costs() -> None:
    """
    The reported break-even price is exactly cash in plus the balance — nothing
    is deducted for commission or sale legal fees, because neither is a
    published figure. Any real sale costs money, so the true break-even is
    strictly higher and this must be presented as a minimum.
    """
    for row in _rows():
        assert row["break_even_sale_price"] == pytest.approx(
            row["total_cash_in"] + row["mortgage_balance"], abs=0.02
        )


def test_rejects_non_positive_price() -> None:
    with pytest.raises(ValueError, match="Purchase price"):
        _rows(purchase_price=0.0)


def test_takes_no_selling_cost_parameters() -> None:
    """
    There is no commission or sale-fee knob, by design: an unsourced default
    would move the answer materially, and an optional parameter invites one to
    be supplied without the report saying so. Selling costs stay out until a
    confirmed figure exists.
    """
    import inspect

    params = set(inspect.signature(calculate_break_even_appreciation).parameters)
    assert not params & {"commission_rate", "sale_legal_fees", "selling_costs"}
