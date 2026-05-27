"""
Calculation regression suite — must pass 100% before merging to main.

These are known correct values using 5% vacancy consistently and Canadian
semi-annual compounding. Never change the expected outputs. If a test fails,
the code is wrong — not the expected value.

Calibration properties:
  Vaughan  — 5702-5 Buttermill Ave, Vaughan, ON L4K 5W4
             Condo, 3bd/2ba, 950sqft, built 2020, no rent control
             Price $729,900 | Taxes $3,326 | Condo $761/mo | Rent $2,900/mo

  Hamilton — 146 East 19th Street, Hamilton, ON L8V 2P5
             Detached duplex, 4bd/2ba, 1,820sqft, built 1985, rent-controlled
             Price $449,000 | Taxes $5,200 | Condo $0 | Rent $3,600/mo combined

Financing assumption for both: 20% down, 4.79% rate, 25-year amortisation.
All metrics use 5% vacancy (VACANCY_ALLOWANCE constant) — applied consistently.
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
    "annual_taxes": 5_200,  # corrected — $3,800 was wrong; verified against MPAC data
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
    """Mortgage on 80% of $729,900 at 4.79% over 25 years.
    ~$3,327/month with Canadian semi-annual compounding.
    """
    principal = VAUGHAN["price"] * (1 - DOWN_PCT)
    payment = calculate_monthly_payment(
        principal=principal,
        annual_rate=RATE,
        amortization_years=AMORT,
    )
    assert (
        3_200 <= payment <= 3_500
    ), f"Vaughan mortgage payment out of range: {payment:.2f}"
    assert abs(payment - 3_326.64) < 1.0, f"Vaughan payment drifted: {payment}"


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
    Vaughan monthly cash flow ~ −$2,127 — deeply negative.
    (Canadian semi-annual compounding gives $3,326.64/mo mortgage, not $3,323.)
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

    # Total cash invested for CoC — closing["total"] already includes LTT
    closing = estimate_closing_costs(VAUGHAN["price"], is_toronto=False)
    down = VAUGHAN["price"] * DOWN_PCT
    total_cash_invested = down + closing["total"]
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
    """Mortgage on 80% of $449,000 at 4.79% over 25 years.
    ~$2,046/month with Canadian semi-annual compounding.
    """
    principal = HAMILTON["price"] * (1 - DOWN_PCT)
    payment = calculate_monthly_payment(
        principal=principal,
        annual_rate=RATE,
        amortization_years=AMORT,
    )
    assert (
        1_900 <= payment <= 2_200
    ), f"Hamilton mortgage payment out of range: {payment:.2f}"
    assert abs(payment - 2_046.39) < 1.0, f"Hamilton payment drifted: {payment}"


# ── Hamilton: LTT and closing costs ───────────────────────────────


def test_hamilton_ltt() -> None:
    """Ontario LTT on $449,000 — non-Toronto."""
    ltt = calculate_ontario_ltt(HAMILTON["price"])
    # 4 Ontario brackets: 275 + 1,950 + 2,250 + 980 = 5,455
    assert 5_300 <= ltt <= 5_600, f"Hamilton LTT out of range: {ltt:.2f}"


# ── Hamilton: NOI and cap rate ─────────────────────────────────────


def test_hamilton_noi() -> None:
    """
    Hamilton NOI ~$29,778/yr — no condo fee, 1.0% maintenance (built 1985), 5% vacancy.
    Previous target of $31,160 was calculated with 1.8% vacancy — corrected to 5%.
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
    assert 27_000 <= noi <= 32_000, f"Hamilton NOI out of range: {noi:.2f}"
    assert abs(noi - 29_778) < 50, f"Hamilton NOI drifted from anchor: {noi:.2f}"


def test_hamilton_cap_rate() -> None:
    """
    Hamilton cap rate ~6.63% — solid investment fundamentals.
    (Previous 6.94% was based on 1.8% vacancy and $3,800 taxes — both corrected.)
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
    assert 0.060 <= cap <= 0.072, f"Hamilton cap rate out of range: {cap:.4f}"
    assert (
        abs(cap - 0.0663) < 0.001
    ), f"Hamilton cap rate drifted from anchor: {cap:.4f}"


# ── Hamilton: DSCR ────────────────────────────────────────────────


def test_hamilton_dscr() -> None:
    """
    Hamilton DSCR ~1.21 — NOI covers debt service, but tighter than previously reported.
    (Previous ~1.27 used lower vacancy and lower taxes — both corrected to standard values.)
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
    assert 1.15 <= dscr <= 1.30, f"Hamilton DSCR out of range: {dscr:.4f}"
    assert abs(dscr - 1.21) < 0.02, f"Hamilton DSCR drifted from anchor: {dscr:.4f}"


# ── Hamilton: monthly cash flow ────────────────────────────────────


def test_hamilton_cash_flow_monthly() -> None:
    """
    Hamilton monthly cash flow ~$436 — positive, modest.
    (Previous ~$542 was based on 1.8% vacancy and $3,800 taxes — both corrected.)
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
    assert 300 <= cf <= 600, f"Hamilton cash flow out of range: {cf:.2f}"
    assert abs(cf - 436) < 15, f"Hamilton cash flow drifted from anchor: {cf:.2f}"


# ── Hamilton: deal score ───────────────────────────────────────────


def test_hamilton_deal_score() -> None:
    """
    Hamilton deal score — must be ≥65 (good_deal) with corrected 5% vacancy inputs.

    Component breakdown (corrected targets):
      cap_rate=25  (6.63% ≥ 6%)
      cash_flow=20 ($436 ≥ $200, < $500)
      coc=12       (≈5.35%, ≥ 4% < 6%)
      dscr=12      (1.21 ≥ 1.10, < 1.25)
      demand=8     (vacancy 3 + dom 2 + rising 3)
      subtotal=77, deductions=5 (rent_ctrl) → total=72

    Previous score of 84 (strong_buy) was based on 1.8% vacancy and $3,800 taxes —
    corrected to 5% vacancy and $5,200 taxes per calibration update.
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

    # Total cash invested for CoC — closing["total"] already includes LTT
    closing = estimate_closing_costs(HAMILTON["price"], is_toronto=False)
    down = HAMILTON["price"] * DOWN_PCT
    total_cash_invested = down + closing["total"]
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

    assert result["total"] >= 65, (
        f"Hamilton deal score should be ≥65 (good_deal), got {result['total']}. "
        f"Breakdown: {result['breakdown']}"
    )
    assert result["verdict"] == "good_deal", (
        f"Unexpected verdict: {result['verdict']} (expected good_deal). "
        f"Score: {result['total']}"
    )


# ── Borderline caution case (synthetic) ───────────────────────────


def test_borderline_caution_deal_score() -> None:
    """
    Borderline caution property: entry-level freehold at 4.79% with rent near breakeven.
    Expected deal score in caution/marginal band (35–64).

    inputs: price=380000, taxes=3500, condo_fee=0, rent=2600/mo,
            down=20%, rate=4.79%, amort=25, year_built=1990
    Actual score ≈ 50, verdict = caution.
    """
    price = 380_000
    taxes = 3_500
    condo_fee_monthly = 0
    rent = 2_600
    year_built = 1990
    down_pct = 0.20
    rate = 0.0479
    amort = 25

    maintenance_rate = get_maintenance_rate(year_built)  # 1980-2010 → 1.0%
    assert maintenance_rate == 0.010, f"Unexpected maintenance rate: {maintenance_rate}"

    principal = price * (1 - down_pct)
    monthly_mortgage = calculate_monthly_payment(principal, rate, amort)

    noi = calculate_noi(
        gross_annual_rent=rent * 12,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_annual=condo_fee_monthly * 12,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=price)
    annual_ds = monthly_mortgage * 12
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    cf = calculate_cash_flow_monthly(
        monthly_rent=rent,
        mortgage_payment=monthly_mortgage,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_monthly=condo_fee_monthly,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )
    closing = estimate_closing_costs(price, is_toronto=False)
    down = price * down_pct
    total_cash_invested = down + closing["total"]
    coc = calculate_cash_on_cash(
        annual_cash_flow=cf * 12,
        total_cash_invested=total_cash_invested,
    )

    result = calculate_deal_score(
        cap_rate=cap,
        cash_flow_monthly=cf,
        cash_on_cash=coc,
        dscr=dscr,
        cmhc_vacancy_rate=0.03,
        rental_days_on_market=25,
        rent_trend="rising",
        risk_flag_deductions=0,
    )

    assert 35 <= result["total"] <= 64, (
        f"Borderline case score {result['total']} outside caution/marginal range (35–64). "
        f"Breakdown: {result['breakdown']}"
    )
    assert result["verdict"] in (
        "caution",
        "marginal",
    ), f"Unexpected verdict: {result['verdict']}"


# ── Perfect deal (synthetic, no condo fee) ────────────────────────


def test_perfect_deal_case() -> None:
    """
    Perfect deal: affordable property with good yield and low rate.
    Expected: positive cash flow, cap rate 5.5%+, deal score >= 60.

    inputs: price=400000, taxes=4000, condo_fee=0, rent=3200/mo,
            down=20%, rate=3.79%, amort=25, year_built=2015
    """
    price = 400_000
    taxes = 4_000
    condo_fee_monthly = 0
    rent = 3_200
    year_built = 2015
    down_pct = 0.20
    rate = 0.0379
    amort = 25

    maintenance_rate = get_maintenance_rate(year_built)  # post-2010 → 0.5%
    assert maintenance_rate == 0.005

    principal = price * (1 - down_pct)
    monthly_mortgage = calculate_monthly_payment(principal, rate, amort)

    noi = calculate_noi(
        gross_annual_rent=rent * 12,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_annual=condo_fee_monthly * 12,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )
    cap = calculate_cap_rate(noi=noi, purchase_price=price)
    annual_ds = monthly_mortgage * 12
    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_ds)
    cf = calculate_cash_flow_monthly(
        monthly_rent=rent,
        mortgage_payment=monthly_mortgage,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_monthly=condo_fee_monthly,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )
    closing = estimate_closing_costs(price, is_toronto=False)
    total_cash_invested = price * down_pct + closing["total"]
    coc = calculate_cash_on_cash(
        annual_cash_flow=cf * 12,
        total_cash_invested=total_cash_invested,
    )

    result = calculate_deal_score(
        cap_rate=cap,
        cash_flow_monthly=cf,
        cash_on_cash=coc,
        dscr=dscr,
        cmhc_vacancy_rate=0.02,
        rental_days_on_market=14,
        rent_trend="rising",
        risk_flag_deductions=0,
    )

    assert cf > 0, f"Perfect deal should have positive cash flow, got {cf:.2f}"
    assert 0.055 <= cap <= 0.120, f"Perfect deal cap rate unexpected: {cap:.4f}"
    assert (
        result["total"] >= 60
    ), f"Perfect deal score {result['total']} is below 60. Breakdown: {result['breakdown']}"


# ── Pre-1980 build penalty ────────────────────────────────────────


def test_pre_1980_maintenance_rate() -> None:
    """
    Pre-1980 build uses 1.5% maintenance reserve (the highest tier).
    This materially reduces NOI and cash flow compared to newer builds.
    """
    price = 550_000
    taxes = 5_000
    rent = 3_000
    year_built = 1972

    maintenance_rate = get_maintenance_rate(year_built)
    assert (
        maintenance_rate == 0.015
    ), f"Pre-1980 build should use 1.5% maintenance, got {maintenance_rate:.3f}"

    # Compare NOI with pre-1980 rate vs mid-age rate
    noi_old = calculate_noi(
        gross_annual_rent=rent * 12,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_annual=0,
        maintenance_rate=0.015,  # pre-1980
        property_value=price,
        include_management=False,
    )
    noi_mid = calculate_noi(
        gross_annual_rent=rent * 12,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_annual=0,
        maintenance_rate=0.010,  # 1980-2010
        property_value=price,
        include_management=False,
    )

    # Pre-1980 NOI should be lower by approximately price * 0.5% = $2,750/yr
    noi_difference = noi_mid - noi_old
    expected_difference = price * (0.015 - 0.010)  # 0.5% of $550K = $2,750
    assert (
        abs(noi_difference - expected_difference) < 10
    ), f"NOI difference from maintenance rate tier unexpected: {noi_difference:.2f}"


def test_pre_1980_full_analysis() -> None:
    """
    Full analysis for pre-1980 build — verifies maintenance rate impacts are applied.
    price=550000, taxes=5000, condo_fee=0, rent=3000/mo, 20% down, 4.79%, 25yr, 1972 build.
    """
    price = 550_000
    taxes = 5_000
    rent = 3_000
    year_built = 1972
    down_pct = 0.20
    rate = 0.0479
    amort = 25

    maintenance_rate = get_maintenance_rate(year_built)  # should be 0.015
    principal = price * (1 - down_pct)
    monthly_mortgage = calculate_monthly_payment(principal, rate, amort)

    noi = calculate_noi(
        gross_annual_rent=rent * 12,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_annual=0,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )
    cf = calculate_cash_flow_monthly(
        monthly_rent=rent,
        mortgage_payment=monthly_mortgage,
        annual_taxes=taxes,
        insurance_value=price,
        condo_fee_monthly=0,
        maintenance_rate=maintenance_rate,
        property_value=price,
        include_management=False,
    )

    # Property with $3,000 rent and $550K price is borderline — verify reasonable range
    cap = calculate_cap_rate(noi=noi, purchase_price=price)
    assert 0.02 <= cap <= 0.06, f"Pre-1980 cap rate out of reasonable range: {cap:.4f}"
    assert (
        -3_000 <= cf <= 1_000
    ), f"Pre-1980 cash flow out of reasonable range: {cf:.2f}"


# ── OSFI stress consistency ────────────────────────────────────────


def test_osfi_stress_payment_exceeds_base_for_all_cases() -> None:
    """
    For each calibration property, the OSFI stress payment (at stress rate)
    must exceed the base contract payment.

    OSFI stress rate = max(contract + 2%, 5.25%) > contract rate always.
    Therefore stress payment > base payment for any positive principal.
    """
    from calculations.mortgage import calculate_osfi_stress_rate

    calibration_cases = [
        # (name, principal, rate, amort)
        ("Vaughan base", 583_920, 0.0479, 25),
        ("Hamilton base", 359_200, 0.0479, 25),
        ("Borderline", 520_000, 0.0579, 25),
        ("Perfect deal", 320_000, 0.0379, 25),
        ("Pre-1980 build", 440_000, 0.0479, 25),
    ]

    for name, principal, rate, amort in calibration_cases:
        base_payment = calculate_monthly_payment(principal, rate, amort)
        stress_rate = calculate_osfi_stress_rate(rate)
        stress_payment = calculate_monthly_payment(principal, stress_rate, amort)
        assert stress_payment > base_payment, (
            f"{name}: OSFI stress payment ({stress_payment:.2f}) should exceed "
            f"base payment ({base_payment:.2f}) at rate {rate:.2%}"
        )
