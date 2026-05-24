"""
Calculation regression suite — must pass 100% before merging to main.

These are known correct values derived from the investor-calc.jsx reference
implementation. Never change the expected outputs. If a test fails, the code
is wrong — not the expected value.

Calibration properties:
  Vaughan  — 5702-5 Buttermill Ave, Vaughan, ON L4K 5W4
             Condo, 3bd/2ba, 950sqft, built 2020, no rent control
             Price $729,900 | Taxes $3,326 | Condo $761/mo | Rent $2,900/mo

  Hamilton — 146 East 19th Street, Hamilton, ON L8V 2P5
             Detached duplex, 4bd/2ba, 1,820sqft, built 1985, rent-controlled
             Price $449,000 | Taxes $3,800 | Condo $0 | Rent $3,600/mo combined

Financing assumption for both: 20% down, 4.79% rate, 25-year amortisation.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from calculations.mortgage import calculate_monthly_payment  # noqa: E402
from calculations.closing_costs import (  # noqa: E402
    calculate_ontario_ltt,
    estimate_closing_costs,
)
from calculations.investment import (  # noqa: E402
    calculate_noi,
    calculate_cap_rate,
    calculate_dscr,
    calculate_cash_on_cash,
    calculate_cash_flow_monthly,
)
from calculations.deal_score import calculate_deal_score  # noqa: E402
from constants.rates import get_maintenance_rate  # noqa: E402

# ── Shared financing ───────────────────────────────────────────────

DOWN_PCT = 0.20
RATE = 0.0479
AMORT = 25


# ── Vaughan calibration data ───────────────────────────────────────

VAUGHAN = {
    "price": 729_900,
    "annual_taxes": 3_326,
    "condo_fee_monthly": 761,
    "rent_mid": 2_900,
    "year_built": 2020,
    "toronto": False,
    "market": {
        "cmhc_vacancy": 0.018,
        "rental_dom": 18,
        "rent_trend": "declining",
    },
    "risk_flag_deductions": 6,  # condo_fee(4) + supply(2)
}

# ── Hamilton calibration data ──────────────────────────────────────

HAMILTON = {
    "price": 449_000,
    "annual_taxes": 3_800,
    "condo_fee_monthly": 0,
    "rent_mid": 3_600,
    "year_built": 1985,
    "toronto": False,
    "market": {
        "cmhc_vacancy": 0.025,
        "rental_dom": 22,
        "rent_trend": "rising",
    },
    "risk_flag_deductions": 5,  # rent_ctrl(5)
}


# ── Vaughan: mortgage ──────────────────────────────────────────────


def test_vaughan_mortgage_payment() -> None:
    """Mortgage on 80% of $729,900 at 4.79% over 25 years."""
    principal = VAUGHAN["price"] * (1 - DOWN_PCT)
    payment = calculate_monthly_payment(
        principal=principal,
        annual_rate=RATE,
        amortization_years=AMORT,
    )
    # ~$3,343/month based on standard annuity formula
    assert (
        3_200 <= payment <= 3_500
    ), f"Vaughan mortgage payment out of range: {payment:.2f}"


# ── Vaughan: LTT and closing costs ────────────────────────────────


def test_vaughan_ltt() -> None:
    """Ontario LTT on $729,900 — non-Toronto, no MLTT."""
    ltt = calculate_ontario_ltt(VAUGHAN["price"])
    # 4 Ontario brackets: 275 + 1,950 + 2,250 + 6,598 = 11,073
    assert 11_000 <= ltt <= 11_200, f"Vaughan LTT out of range: {ltt:.2f}"


def test_vaughan_closing_costs() -> None:
    """Total closing costs (non-Toronto) on $729,900."""
    costs = estimate_closing_costs(
        purchase_price=VAUGHAN["price"],
        is_toronto=False,
    )
    assert (
        13_000 <= costs["total"] <= 16_000
    ), f"Vaughan closing costs out of range: {costs['total']:.2f}"


# ── Vaughan: NOI and cap rate ──────────────────────────────────────


def test_vaughan_noi() -> None:
    """
    Vaughan NOI with full expenses: taxes, insurance, maintenance, vacancy, condo.
    Expected ~$14,400/yr based on investor-calc.jsx reference.
    """
    maintenance_rate = get_maintenance_rate(VAUGHAN["year_built"])  # post-2010 → 0.5%
    noi = calculate_noi(
        gross_annual_rent=VAUGHAN["rent_mid"] * 12,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_annual=VAUGHAN["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )
    assert 13_000 <= noi <= 16_000, f"Vaughan NOI out of range: {noi:.2f}"


def test_vaughan_cap_rate() -> None:
    """
    Vaughan cap rate ~1.97% — well below viable investment threshold.
    """
    maintenance_rate = get_maintenance_rate(VAUGHAN["year_built"])
    noi = calculate_noi(
        gross_annual_rent=VAUGHAN["rent_mid"] * 12,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_annual=VAUGHAN["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=VAUGHAN["price"])
    assert 0.015 <= cap <= 0.022, f"Vaughan cap rate out of range: {cap:.4f}"


# ── Vaughan: DSCR ─────────────────────────────────────────────────


def test_vaughan_dscr() -> None:
    """
    Vaughan DSCR ~0.36 — NOI covers only ~36% of annual debt service.
    """
    maintenance_rate = get_maintenance_rate(VAUGHAN["year_built"])
    noi = calculate_noi(
        gross_annual_rent=VAUGHAN["rent_mid"] * 12,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_annual=VAUGHAN["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )
    principal = VAUGHAN["price"] * (1 - DOWN_PCT)
    annual_ds = calculate_monthly_payment(principal, RATE, AMORT) * 12
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    assert 0.30 <= dscr <= 0.42, f"Vaughan DSCR out of range: {dscr:.4f}"


# ── Vaughan: monthly cash flow ─────────────────────────────────────


def test_vaughan_cash_flow_monthly() -> None:
    """
    Vaughan monthly cash flow ~ −$2,143 — deeply negative.
    """
    maintenance_rate = get_maintenance_rate(VAUGHAN["year_built"])
    principal = VAUGHAN["price"] * (1 - DOWN_PCT)
    monthly_mortgage = calculate_monthly_payment(principal, RATE, AMORT)
    cf = calculate_cash_flow_monthly(
        monthly_rent=VAUGHAN["rent_mid"],
        mortgage_payment=monthly_mortgage,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_monthly=VAUGHAN["condo_fee_monthly"],
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )
    assert -2_500 <= cf <= -1_700, f"Vaughan cash flow out of range: {cf:.2f}"


# ── Vaughan: deal score ────────────────────────────────────────────


def test_vaughan_deal_score() -> None:
    """
    Vaughan deal score — must be 0 (hard pass).

    Component breakdown:
      cap_rate=0 (1.97% < 2%), cash_flow=0 (<−700), coc=0 (negative),
      dscr=0 (<0.85), demand=6 (vacancy 4 + dom 2 + declining 0)
      subtotal=6, deductions=6 → total=0
    """
    maintenance_rate = get_maintenance_rate(VAUGHAN["year_built"])
    principal = VAUGHAN["price"] * (1 - DOWN_PCT)
    monthly_mortgage = calculate_monthly_payment(principal, RATE, AMORT)
    annual_ds = monthly_mortgage * 12

    noi = calculate_noi(
        gross_annual_rent=VAUGHAN["rent_mid"] * 12,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_annual=VAUGHAN["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=VAUGHAN["price"])
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    cf = calculate_cash_flow_monthly(
        monthly_rent=VAUGHAN["rent_mid"],
        mortgage_payment=monthly_mortgage,
        annual_taxes=VAUGHAN["annual_taxes"],
        insurance_value=VAUGHAN["price"],
        condo_fee_monthly=VAUGHAN["condo_fee_monthly"],
        maintenance_rate=maintenance_rate,
        property_value=VAUGHAN["price"],
        include_management=False,
    )

    # Total cash invested for CoC
    ltt = calculate_ontario_ltt(VAUGHAN["price"])
    closing = estimate_closing_costs(VAUGHAN["price"], is_toronto=False)
    down = VAUGHAN["price"] * DOWN_PCT
    total_cash_invested = down + ltt + closing["total"]
    annual_cf = cf * 12
    coc = calculate_cash_on_cash(
        annual_cash_flow=annual_cf,
        total_cash_invested=total_cash_invested,
    )

    result = calculate_deal_score(
        cap_rate=cap,
        cash_flow_monthly=cf,
        cash_on_cash=coc,
        dscr=dscr,
        cmhc_vacancy_rate=VAUGHAN["market"]["cmhc_vacancy"],
        rental_days_on_market=VAUGHAN["market"]["rental_dom"],
        rent_trend=VAUGHAN["market"]["rent_trend"],
        risk_flag_deductions=VAUGHAN["risk_flag_deductions"],
    )

    assert result["total"] <= 5, (
        f"Vaughan deal score should be 0 (hard pass), got {result['total']}. "
        f"Breakdown: {result['breakdown']}"
    )
    assert result["verdict"] == "hard_pass", f"Unexpected verdict: {result['verdict']}"


# ── Hamilton: mortgage ─────────────────────────────────────────────


def test_hamilton_mortgage_payment() -> None:
    """Mortgage on 80% of $449,000 at 4.79% over 25 years."""
    principal = HAMILTON["price"] * (1 - DOWN_PCT)
    payment = calculate_monthly_payment(
        principal=principal,
        annual_rate=RATE,
        amortization_years=AMORT,
    )
    # ~$2,056/month
    assert (
        1_900 <= payment <= 2_200
    ), f"Hamilton mortgage payment out of range: {payment:.2f}"


# ── Hamilton: LTT and closing costs ───────────────────────────────


def test_hamilton_ltt() -> None:
    """Ontario LTT on $449,000 — non-Toronto."""
    ltt = calculate_ontario_ltt(HAMILTON["price"])
    # 4 Ontario brackets: 275 + 1,950 + 2,250 + 980 = 5,455
    assert 5_300 <= ltt <= 5_600, f"Hamilton LTT out of range: {ltt:.2f}"


# ── Hamilton: NOI and cap rate ─────────────────────────────────────


def test_hamilton_noi() -> None:
    """
    Hamilton NOI ~$31,178/yr — no condo fee, 1.0% maintenance (built 1985).
    """
    maintenance_rate = get_maintenance_rate(HAMILTON["year_built"])  # 1980-2010 → 1.0%
    noi = calculate_noi(
        gross_annual_rent=HAMILTON["rent_mid"] * 12,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_annual=HAMILTON["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )
    assert 29_000 <= noi <= 33_000, f"Hamilton NOI out of range: {noi:.2f}"


def test_hamilton_cap_rate() -> None:
    """
    Hamilton cap rate ~6.94% — strong investment fundamentals.
    """
    maintenance_rate = get_maintenance_rate(HAMILTON["year_built"])
    noi = calculate_noi(
        gross_annual_rent=HAMILTON["rent_mid"] * 12,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_annual=HAMILTON["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=HAMILTON["price"])
    assert 0.065 <= cap <= 0.075, f"Hamilton cap rate out of range: {cap:.4f}"


# ── Hamilton: DSCR ────────────────────────────────────────────────


def test_hamilton_dscr() -> None:
    """
    Hamilton DSCR ~1.26 — NOI comfortably covers debt service.
    """
    maintenance_rate = get_maintenance_rate(HAMILTON["year_built"])
    noi = calculate_noi(
        gross_annual_rent=HAMILTON["rent_mid"] * 12,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_annual=HAMILTON["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )
    principal = HAMILTON["price"] * (1 - DOWN_PCT)
    annual_ds = calculate_monthly_payment(principal, RATE, AMORT) * 12
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    assert 1.20 <= dscr <= 1.35, f"Hamilton DSCR out of range: {dscr:.4f}"


# ── Hamilton: monthly cash flow ────────────────────────────────────


def test_hamilton_cash_flow_monthly() -> None:
    """
    Hamilton monthly cash flow ~$542 — positive, above the $500 threshold.
    """
    maintenance_rate = get_maintenance_rate(HAMILTON["year_built"])
    principal = HAMILTON["price"] * (1 - DOWN_PCT)
    monthly_mortgage = calculate_monthly_payment(principal, RATE, AMORT)
    cf = calculate_cash_flow_monthly(
        monthly_rent=HAMILTON["rent_mid"],
        mortgage_payment=monthly_mortgage,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_monthly=HAMILTON["condo_fee_monthly"],
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )
    assert 350 <= cf <= 700, f"Hamilton cash flow out of range: {cf:.2f}"


# ── Hamilton: deal score ───────────────────────────────────────────


def test_hamilton_deal_score() -> None:
    """
    Hamilton deal score — must be 84 (strong buy).

    Component breakdown:
      cap_rate=25 (6.94% ≥ 6%), cash_flow=25 ($542 ≥ $500), coc=16 (6.64% ≥ 6%),
      dscr=15 (1.263 ≥ 1.25), demand=8 (vacancy 3 + dom 2 + rising 3)
      subtotal=89, deductions=5 (rent_ctrl) → total=84
    """
    maintenance_rate = get_maintenance_rate(HAMILTON["year_built"])
    principal = HAMILTON["price"] * (1 - DOWN_PCT)
    monthly_mortgage = calculate_monthly_payment(principal, RATE, AMORT)
    annual_ds = monthly_mortgage * 12

    noi = calculate_noi(
        gross_annual_rent=HAMILTON["rent_mid"] * 12,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_annual=HAMILTON["condo_fee_monthly"] * 12,
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=HAMILTON["price"])
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    cf = calculate_cash_flow_monthly(
        monthly_rent=HAMILTON["rent_mid"],
        mortgage_payment=monthly_mortgage,
        annual_taxes=HAMILTON["annual_taxes"],
        insurance_value=HAMILTON["price"],
        condo_fee_monthly=HAMILTON["condo_fee_monthly"],
        maintenance_rate=maintenance_rate,
        property_value=HAMILTON["price"],
        include_management=False,
    )

    # Total cash invested for CoC
    ltt = calculate_ontario_ltt(HAMILTON["price"])
    closing = estimate_closing_costs(HAMILTON["price"], is_toronto=False)
    down = HAMILTON["price"] * DOWN_PCT
    total_cash_invested = down + ltt + closing["total"]
    annual_cf = cf * 12
    coc = calculate_cash_on_cash(
        annual_cash_flow=annual_cf,
        total_cash_invested=total_cash_invested,
    )

    result = calculate_deal_score(
        cap_rate=cap,
        cash_flow_monthly=cf,
        cash_on_cash=coc,
        dscr=dscr,
        cmhc_vacancy_rate=HAMILTON["market"]["cmhc_vacancy"],
        rental_days_on_market=HAMILTON["market"]["rental_dom"],
        rent_trend=HAMILTON["market"]["rent_trend"],
        risk_flag_deductions=HAMILTON["risk_flag_deductions"],
    )

    assert result["total"] >= 80, (
        f"Hamilton deal score should be ≥80 (strong buy), got {result['total']}. "
        f"Breakdown: {result['breakdown']}"
    )
    assert result["verdict"] == "strong_buy", f"Unexpected verdict: {result['verdict']}"
