"""Unit tests for investment metric calculations."""

import pytest
from .investment import (
    calculate_cap_rate,
    calculate_dscr,
    calculate_grm,
    calculate_financing_scenarios,
)
from constants.rates import get_maintenance_rate


def test_calculate_cap_rate() -> None:
    """5702 Buttermill Ave calibration: NOI ~$18k, price $729,900 → ~2.5% cap."""
    noi = 18_082.0
    result = calculate_cap_rate(noi=noi, purchase_price=729_900)
    assert abs(result - 0.02477) < 0.0005, f"Cap rate out of range: {result:.4f}"


def test_cap_rate_raises_on_zero_price() -> None:
    with pytest.raises(ValueError):
        calculate_cap_rate(noi=10_000, purchase_price=0)


def test_calculate_dscr() -> None:
    """DSCR below 1.0 for deeply negative cash flow condo."""
    dscr = calculate_dscr(noi=18_082, annual_debt_service=40_000)
    assert 0.40 < dscr < 0.50, f"DSCR out of range: {dscr:.4f}"


def test_calculate_grm() -> None:
    """GRM = purchase price / annual gross rent."""
    grm = calculate_grm(purchase_price=729_900, annual_gross_rent=34_800)
    assert 20 < grm < 22, f"GRM out of range: {grm:.2f}"


def test_maintenance_rate_new_build() -> None:
    assert get_maintenance_rate(2015) == 0.005


def test_maintenance_rate_mid_age() -> None:
    assert get_maintenance_rate(1995) == 0.010


def test_maintenance_rate_old_build() -> None:
    assert get_maintenance_rate(1965) == 0.015


def test_maintenance_rate_unknown() -> None:
    assert get_maintenance_rate(None) == 0.005


# ── calculate_financing_scenarios ─────────────────────────────────


# Shared Vaughan inputs for scenario tests
_VAUGHAN = dict(
    purchase_price=729_900,
    monthly_rent=2_900,
    annual_taxes=3_326,
    condo_fee_monthly=761,
    maintenance_rate=get_maintenance_rate(2020),  # 0.5% post-2010
    base_down_pct=0.20,
    base_rate=0.0479,
    amortization_years=25,
    is_toronto=False,
    include_management=False,
)


def test_scenarios_returns_four_items() -> None:
    """Always returns exactly 4 scenarios."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    assert len(scenarios) == 4


def test_scenario_names() -> None:
    """Each scenario has a distinct name in the expected order."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    names = [s["name"] for s in scenarios]
    assert names[0] == "Base"
    assert names[1] == "OSFI stress"
    assert names[2] == "Higher down (35%)"
    assert names[3] == "Conservative (+2%)"


def test_scenario_required_keys() -> None:
    """Every scenario dict contains all required output keys."""
    required = {
        "name",
        "down_pct",
        "rate",
        "amortization_years",
        "down_payment",
        "principal",
        "total_cash_invested",
        "monthly_mortgage",
        "annual_debt_service",
        "noi",
        "cap_rate",
        "monthly_cash_flow",
        "annual_cash_flow",
        "dscr",
        "cash_on_cash",
        "break_even_rent",
    }
    for scenario in calculate_financing_scenarios(**_VAUGHAN):
        assert required.issubset(scenario.keys()), (
            f"Scenario '{scenario['name']}' missing keys: "
            f"{required - scenario.keys()}"
        )


def test_noi_and_cap_rate_identical_across_scenarios() -> None:
    """NOI and cap rate do not depend on financing — must be the same for all four."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    nois = [s["noi"] for s in scenarios]
    caps = [s["cap_rate"] for s in scenarios]
    assert all(abs(n - nois[0]) < 0.01 for n in nois), "NOI differs across scenarios"
    assert all(
        abs(c - caps[0]) < 0.0001 for c in caps
    ), "Cap rate differs across scenarios"


def test_osfi_stress_has_highest_mortgage_payment() -> None:
    """
    OSFI stress rate = max(4.79% + 2%, 5.25%) = 6.79%.
    At 4.79% base, conservative also = 6.79% so OSFI equals conservative.
    OSFI strictly exceeds base and high-down (which use lower rates).
    """
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    base_pmt = scenarios[0]["monthly_mortgage"]
    osfi_pmt = scenarios[1]["monthly_mortgage"]
    high_down_pmt = scenarios[2]["monthly_mortgage"]
    conservative_pmt = scenarios[3]["monthly_mortgage"]

    assert osfi_pmt > base_pmt, "OSFI payment must exceed base"
    assert osfi_pmt > high_down_pmt, "OSFI payment must exceed high-down"
    # At 4.79%, OSFI rate = conservative rate = 6.79% → payments are equal
    assert osfi_pmt >= conservative_pmt, "OSFI payment must be >= conservative"


def test_higher_down_has_lowest_mortgage_payment() -> None:
    """
    35% down → smaller principal → lowest monthly payment of all four scenarios.
    """
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    payments = [s["monthly_mortgage"] for s in scenarios]
    high_down_pmt = scenarios[2]["monthly_mortgage"]
    assert high_down_pmt == min(payments), (
        f"Higher-down scenario should have lowest payment. "
        f"Payments: {[round(p, 2) for p in payments]}"
    )


def test_base_scenario_down_and_rate_match_inputs() -> None:
    """Base scenario preserves the exact inputs passed in."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    base = scenarios[0]
    assert base["down_pct"] == 0.20
    assert abs(base["rate"] - 0.0479) < 0.0001
    assert base["amortization_years"] == 25


def test_higher_down_scenario_uses_35_pct() -> None:
    """Higher-down scenario always uses 35% regardless of base down payment."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    assert scenarios[2]["down_pct"] == 0.35


def test_higher_down_has_larger_cash_invested() -> None:
    """35% down → more cash out of pocket than 20% down base."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    assert scenarios[2]["total_cash_invested"] > scenarios[0]["total_cash_invested"]


def test_conservative_rate_is_base_plus_two_percent() -> None:
    """Conservative scenario rate = base rate + 0.02 exactly."""
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    base_rate = scenarios[0]["rate"]
    conservative_rate = scenarios[3]["rate"]
    assert abs(conservative_rate - (base_rate + 0.02)) < 0.0001


def test_osfi_stress_rate_at_current_rates() -> None:
    """
    At 4.79% base: OSFI rate = max(6.79%, 5.25%) = 6.79%.
    Same as conservative (+2%) at this base rate — OSFI floor is not binding.
    """
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    osfi_rate = scenarios[1]["rate"]
    conservative_rate = scenarios[3]["rate"]
    assert abs(osfi_rate - 0.0679) < 0.0001
    assert abs(osfi_rate - conservative_rate) < 0.0001


def test_osfi_floor_kicks_in_at_low_rate() -> None:
    """
    At 2% base: OSFI rate = max(4%, 5.25%) = 5.25% (floor binds).
    Conservative rate = 4% — lower than OSFI.
    """
    low_rate_inputs = {**_VAUGHAN, "base_rate": 0.02}
    scenarios = calculate_financing_scenarios(**low_rate_inputs)
    osfi_rate = scenarios[1]["rate"]
    conservative_rate = scenarios[3]["rate"]
    assert abs(osfi_rate - 0.0525) < 0.0001, f"OSFI floor not applied: {osfi_rate}"
    assert abs(conservative_rate - 0.04) < 0.0001
    assert osfi_rate > conservative_rate


def test_annual_debt_service_equals_twelve_monthly_payments() -> None:
    """annual_debt_service == monthly_mortgage * 12 for every scenario."""
    for s in calculate_financing_scenarios(**_VAUGHAN):
        expected = s["monthly_mortgage"] * 12
        assert (
            abs(s["annual_debt_service"] - expected) < 0.01
        ), f"Scenario '{s['name']}': annual DS mismatch"


def test_annual_cash_flow_equals_twelve_monthly() -> None:
    """annual_cash_flow == monthly_cash_flow * 12 for every scenario."""
    for s in calculate_financing_scenarios(**_VAUGHAN):
        expected = s["monthly_cash_flow"] * 12
        assert (
            abs(s["annual_cash_flow"] - expected) < 0.01
        ), f"Scenario '{s['name']}': annual CF mismatch"


def test_vaughan_base_scenario_values() -> None:
    """
    Vaughan base scenario: deeply negative cash flow condo.
    Spot-checks key outputs against regression-tested values.
    """
    scenarios = calculate_financing_scenarios(**_VAUGHAN)
    base = scenarios[0]

    assert 3_200 <= base["monthly_mortgage"] <= 3_500
    assert -2_500 <= base["monthly_cash_flow"] <= -1_700
    assert 0.30 <= base["dscr"] <= 0.42
    assert base["break_even_rent"] > 3_500  # requires far more than market rent


def test_hamilton_base_scenario_values() -> None:
    """
    Hamilton duplex: positively cash-flowing property.
    """
    hamilton_inputs = dict(
        purchase_price=449_000,
        monthly_rent=3_600,
        annual_taxes=3_800,
        condo_fee_monthly=0,
        maintenance_rate=get_maintenance_rate(1985),  # 1.0% mid-age
        base_down_pct=0.20,
        base_rate=0.0479,
        amortization_years=25,
        is_toronto=False,
        include_management=False,
    )
    scenarios = calculate_financing_scenarios(**hamilton_inputs)
    base = scenarios[0]

    assert 350 <= base["monthly_cash_flow"] <= 700
    assert 1.20 <= base["dscr"] <= 1.35
    assert base["cash_on_cash"] > 0  # positive CoC


def test_toronto_property_higher_cash_invested() -> None:
    """
    Toronto flag adds MLTT on top of Ontario LTT → higher total cash invested
    than the same property outside Toronto.
    """
    non_toronto = calculate_financing_scenarios(**_VAUGHAN)
    toronto_inputs = {**_VAUGHAN, "is_toronto": True}
    toronto = calculate_financing_scenarios(**toronto_inputs)

    # Compare base scenario only (LTT is financing-independent)
    assert toronto[0]["total_cash_invested"] > non_toronto[0]["total_cash_invested"]
