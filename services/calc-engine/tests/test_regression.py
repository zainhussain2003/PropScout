"""
Calculation regression suite — must pass 100% before merging to main.

These are known correct values. Never change the expected outputs.
If a test fails, the code is wrong — not the expected value.

Calibration property: 5702-5 Buttermill Ave, Vaughan, ON
- Price: $729,900
- Taxes: $3,326/yr
- Condo fee: $761/mo
- Rent mid: $2,900/mo
- Down: 20% | Rate: 4.79% | Amort: 25yr
"""

import pytest
import sys
import os

# Add calc-engine root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from calculations.mortgage import calculate_monthly_payment
from calculations.closing_costs import calculate_ontario_ltt, estimate_closing_costs


BUTTERMILL_INPUTS = {
    'price': 729_900,
    'annual_taxes': 3_326,
    'condo_fee_monthly': 761,
    'rent_mid': 2_900,
    'down_pct': 0.20,
    'rate': 0.0479,
    'amort': 25,
}


def test_buttermill_mortgage_payment() -> None:
    """Mortgage on 80% of $729,900 at 4.79% over 25 years."""
    principal = BUTTERMILL_INPUTS['price'] * (1 - BUTTERMILL_INPUTS['down_pct'])
    payment = calculate_monthly_payment(
        principal=principal,
        annual_rate=BUTTERMILL_INPUTS['rate'],
        amortization_years=BUTTERMILL_INPUTS['amort'],
    )
    # Expected ~$3,340/month
    assert 3_200 <= payment <= 3_500, f"Mortgage payment out of range: {payment}"


def test_buttermill_ltt() -> None:
    """Ontario LTT on $729,900."""
    ltt = calculate_ontario_ltt(BUTTERMILL_INPUTS['price'])
    assert 11_000 <= ltt <= 12_500, f"LTT out of range: {ltt}"


def test_buttermill_closing_costs() -> None:
    """Total closing costs (non-Toronto)."""
    costs = estimate_closing_costs(
        purchase_price=BUTTERMILL_INPUTS['price'],
        is_toronto=False,
    )
    assert 13_000 <= costs['total'] <= 16_000, f"Closing costs out of range: {costs['total']}"


# TODO: Add full analysis regression test once run_full_analysis() is implemented.
# Expected values:
#   cash_flow_monthly: -1,900 to -1,750
#   cap_rate: 0.023 to 0.027
#   dscr: 0.40 to 0.50
#   deal_score: <= 15 (hard pass)
