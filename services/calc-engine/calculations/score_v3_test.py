"""Version-3 shadow score (D-115) — unit tests."""

import pytest

from .score_v3 import calculate_score_v3
from constants.score_versions import SCORE_VERSION_SHADOW

BUTTERMILL = dict(
    cap_rate=0.0197,
    noi=14_397.0,
    gross_annual_rent=34_800.0,
    dscr=0.36,
    mortgage_payment_monthly=3_326.64,
    effective_rental_income_monthly=2_755.0,
    monthly_rent=2_900.0,
    break_even_asking_rent=5_138.76,
    cash_flow_monthly=-2_126.82,
    cash_on_cash=-0.15,
    cmhc_vacancy_rate=0.03,
    rental_days_on_market=None,
    rent_trend=None,
    severe_flag_count=0,
    red_flag_count=0,
    amber_flag_count=1,
)


def test_reports_outcomes_and_scores_the_two_pillars_separately() -> None:
    s = calculate_score_v3(**BUTTERMILL)
    assert s["version"] == SCORE_VERSION_SHADOW
    assert 0 <= s["property_economics"] <= 100
    assert 0 <= s["financing_resilience"] <= 100
    # Cash flow and CoC are reported, and appear nowhere in the breakdown.
    assert s["outcomes"] == {"cash_flow_monthly": -2126.82, "cash_on_cash": -0.15}
    assert "cash_flow" not in s["breakdown"]
    # A deeply negative condo: weak on both pillars.
    assert s["property_economics"] < 40
    assert s["financing_resilience"] < 30
    assert s["risk_status"] == "clear"


def test_severe_flag_is_a_status_not_a_cap() -> None:
    clean = calculate_score_v3(**BUTTERMILL)
    critical = calculate_score_v3(**{**BUTTERMILL, "severe_flag_count": 1})
    assert critical["risk_status"] == "critical"
    # Identical economics score identically; the flag changes the status only.
    assert critical["property_economics"] == clean["property_economics"]
    assert critical["financing_resilience"] == clean["financing_resilience"]
    assert critical["composite"] == clean["composite"]
    flagged = calculate_score_v3(**{**BUTTERMILL, "red_flag_count": 2})
    assert flagged["risk_status"] == "flagged"


def test_owned_outright_maxes_the_debt_components() -> None:
    s = calculate_score_v3(
        **{
            **BUTTERMILL,
            "dscr": None,
            "mortgage_payment_monthly": 0.0,
            "break_even_asking_rent": 1_600.0,
            "cash_flow_monthly": 800.0,
        }
    )
    b = s["breakdown"]
    assert b["dscr"] == b["maxes"]["dscr"]
    assert b["debt_burden"] == b["maxes"]["debt_burden"]
    assert b["rent_cushion"] > 0
    assert s["financing_resilience"] > 80


def test_better_property_scores_higher_on_property_economics_regardless_of_financing() -> (
    None
):
    weak = calculate_score_v3(**BUTTERMILL)
    strong = calculate_score_v3(
        **{
            **BUTTERMILL,
            "cap_rate": 0.065,
            "noi": 26_000.0,
            "gross_annual_rent": 34_800.0,
        }
    )
    assert strong["property_economics"] > weak["property_economics"]
    # Financing inputs untouched → financing pillar unchanged.
    assert strong["financing_resilience"] == weak["financing_resilience"]


def test_demand_reuses_the_version_2_brackets_scaled() -> None:
    none = calculate_score_v3(**{**BUTTERMILL, "cmhc_vacancy_rate": 0.06})
    tight = calculate_score_v3(
        **{
            **BUTTERMILL,
            "cmhc_vacancy_rate": 0.015,
            "rental_days_on_market": 10,
            "rent_trend": "rising",
        }
    )
    assert none["breakdown"]["demand"] == 0
    assert tight["breakdown"]["demand"] == 20


def test_deterministic() -> None:
    assert calculate_score_v3(**BUTTERMILL) == calculate_score_v3(**BUTTERMILL)


@pytest.mark.parametrize(
    "field", ["property_economics", "financing_resilience", "composite"]
)
def test_bounded_0_100(field: str) -> None:
    best = calculate_score_v3(
        **{
            **BUTTERMILL,
            "cap_rate": 0.1,
            "noi": 30_000.0,
            "dscr": 2.0,
            "mortgage_payment_monthly": 500.0,
            "break_even_asking_rent": 1_500.0,
            "cmhc_vacancy_rate": 0.01,
            "rental_days_on_market": 5,
            "rent_trend": "rising",
        }
    )
    worst = calculate_score_v3(
        **{
            **BUTTERMILL,
            "cap_rate": 0.0,
            "noi": 0.0,
            "dscr": 0.1,
            "mortgage_payment_monthly": 9_000.0,
            "break_even_asking_rent": 9_000.0,
            "cmhc_vacancy_rate": 0.09,
        }
    )
    assert best[field] == 100 or best[field] <= 100
    assert worst[field] >= 0
