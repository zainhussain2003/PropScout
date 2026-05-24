"""
Unit tests for deal score calculation — spec Section 10.

Calibration properties:
  Vaughan (5702-5 Buttermill Ave) → expected score: 0  (hard_pass)
  Hamilton (146 East 19th Street) → expected score: 84 (strong_buy)

All inputs derived from investor-calc.jsx reference dataset.
"""

from .deal_score import (
    calculate_deal_score,
    get_verdict,
    _score_cap_rate,
    _score_cash_flow,
    _score_cash_on_cash,
    _score_dscr,
    _score_market_demand,
)

# ── _score_cap_rate ────────────────────────────────────────────────


class TestScoreCapRate:
    def test_top_bracket(self) -> None:
        """6%+ → 25 pts."""
        assert _score_cap_rate(0.060) == 25
        assert _score_cap_rate(0.090) == 25

    def test_second_bracket(self) -> None:
        """5–6% → 20 pts."""
        assert _score_cap_rate(0.050) == 20
        assert _score_cap_rate(0.059) == 20

    def test_third_bracket(self) -> None:
        """4–5% → 15 pts."""
        assert _score_cap_rate(0.040) == 15
        assert _score_cap_rate(0.049) == 15

    def test_fourth_bracket(self) -> None:
        """3–4% → 10 pts."""
        assert _score_cap_rate(0.030) == 10
        assert _score_cap_rate(0.039) == 10

    def test_fifth_bracket(self) -> None:
        """2–3% → 5 pts."""
        assert _score_cap_rate(0.020) == 5
        assert _score_cap_rate(0.029) == 5

    def test_below_floor(self) -> None:
        """Below 2% → 0 pts."""
        assert _score_cap_rate(0.019) == 0
        assert _score_cap_rate(0.000) == 0
        assert _score_cap_rate(-0.01) == 0

    def test_vaughan_cap_rate(self) -> None:
        """Vaughan ~1.97% cap rate → 0 pts."""
        assert _score_cap_rate(0.01972) == 0

    def test_hamilton_cap_rate(self) -> None:
        """Hamilton ~6.94% cap rate → 25 pts."""
        assert _score_cap_rate(0.06943) == 25


# ── _score_cash_flow ───────────────────────────────────────────────


class TestScoreCashFlow:
    def test_top_bracket(self) -> None:
        """$500+/mo → 25 pts."""
        assert _score_cash_flow(500) == 25
        assert _score_cash_flow(2000) == 25

    def test_second_bracket(self) -> None:
        """$200–499/mo → 20 pts."""
        assert _score_cash_flow(200) == 20
        assert _score_cash_flow(499) == 20

    def test_breakeven_bracket(self) -> None:
        """$0–199/mo → 13 pts."""
        assert _score_cash_flow(0) == 13
        assert _score_cash_flow(199) == 13

    def test_slight_negative_bracket(self) -> None:
        """−$300 to −$1 → 6 pts."""
        assert _score_cash_flow(-1) == 6
        assert _score_cash_flow(-300) == 6

    def test_moderate_negative_bracket(self) -> None:
        """−$700 to −$301 → 2 pts."""
        assert _score_cash_flow(-301) == 2
        assert _score_cash_flow(-700) == 2

    def test_deeply_negative(self) -> None:
        """Below −$700 → 0 pts."""
        assert _score_cash_flow(-701) == 0
        assert _score_cash_flow(-5000) == 0

    def test_vaughan_cash_flow(self) -> None:
        """Vaughan ~−$2,143/mo → 0 pts."""
        assert _score_cash_flow(-2143) == 0

    def test_hamilton_cash_flow(self) -> None:
        """Hamilton ~$542/mo → 25 pts."""
        assert _score_cash_flow(542) == 25


# ── _score_cash_on_cash ────────────────────────────────────────────


class TestScoreCashOnCash:
    def test_top_bracket(self) -> None:
        """8%+ → 20 pts."""
        assert _score_cash_on_cash(0.080) == 20
        assert _score_cash_on_cash(0.150) == 20

    def test_second_bracket(self) -> None:
        """6–8% → 16 pts."""
        assert _score_cash_on_cash(0.060) == 16
        assert _score_cash_on_cash(0.079) == 16

    def test_third_bracket(self) -> None:
        """4–6% → 12 pts."""
        assert _score_cash_on_cash(0.040) == 12
        assert _score_cash_on_cash(0.059) == 12

    def test_fourth_bracket(self) -> None:
        """2–4% → 8 pts."""
        assert _score_cash_on_cash(0.020) == 8
        assert _score_cash_on_cash(0.039) == 8

    def test_fifth_bracket(self) -> None:
        """0–2% → 4 pts."""
        assert _score_cash_on_cash(0.000) == 4
        assert _score_cash_on_cash(0.019) == 4

    def test_negative(self) -> None:
        """Negative CoC → 0 pts."""
        assert _score_cash_on_cash(-0.001) == 0
        assert _score_cash_on_cash(-0.20) == 0

    def test_vaughan_coc(self) -> None:
        """Vaughan ~−16% CoC → 0 pts."""
        assert _score_cash_on_cash(-0.161) == 0

    def test_hamilton_coc(self) -> None:
        """Hamilton ~6.64% CoC → 16 pts."""
        assert _score_cash_on_cash(0.0664) == 16


# ── _score_dscr ────────────────────────────────────────────────────


class TestScoreDscr:
    def test_top_bracket(self) -> None:
        """1.25x+ → 15 pts."""
        assert _score_dscr(1.25) == 15
        assert _score_dscr(2.00) == 15

    def test_second_bracket(self) -> None:
        """1.10–1.25x → 12 pts."""
        assert _score_dscr(1.10) == 12
        assert _score_dscr(1.249) == 12

    def test_third_bracket(self) -> None:
        """1.00–1.10x → 7 pts."""
        assert _score_dscr(1.00) == 7
        assert _score_dscr(1.099) == 7

    def test_fourth_bracket(self) -> None:
        """0.85–1.00x → 3 pts."""
        assert _score_dscr(0.85) == 3
        assert _score_dscr(0.999) == 3

    def test_below_floor(self) -> None:
        """Below 0.85x → 0 pts."""
        assert _score_dscr(0.849) == 0
        assert _score_dscr(0.00) == 0

    def test_vaughan_dscr(self) -> None:
        """Vaughan ~0.359 DSCR → 0 pts."""
        assert _score_dscr(0.359) == 0

    def test_hamilton_dscr(self) -> None:
        """Hamilton ~1.263 DSCR → 15 pts."""
        assert _score_dscr(1.263) == 15


# ── _score_market_demand ───────────────────────────────────────────


class TestScoreMarketDemand:
    def test_perfect_demand(self) -> None:
        """Sub-2% vacancy, DOM < 14, rising rents → 10 pts."""
        assert _score_market_demand(0.015, 10, "rising") == 10

    def test_tight_vacancy_only(self) -> None:
        """Sub-2% vacancy → 4 pts."""
        assert _score_market_demand(0.015, 31, "declining") == 4

    def test_moderate_vacancy(self) -> None:
        """2–3% vacancy → 3 pts."""
        assert _score_market_demand(0.025, 31, "declining") == 3

    def test_loose_vacancy(self) -> None:
        """3–5% vacancy → 1 pt."""
        assert _score_market_demand(0.040, 31, "declining") == 1

    def test_high_vacancy_no_points(self) -> None:
        """5%+ vacancy → 0 vacancy pts."""
        assert _score_market_demand(0.055, 31, "declining") == 0

    def test_dom_below_14(self) -> None:
        """DOM < 14 → 3 pts."""
        assert _score_market_demand(0.10, 13, "declining") == 3

    def test_dom_14_to_30(self) -> None:
        """DOM 14–30 → 2 pts."""
        assert _score_market_demand(0.10, 14, "declining") == 2
        assert _score_market_demand(0.10, 30, "declining") == 2

    def test_dom_above_30(self) -> None:
        """DOM > 30 → 0 DOM pts."""
        assert _score_market_demand(0.10, 31, "declining") == 0

    def test_rising_trend(self) -> None:
        """Rising rents → 3 pts."""
        assert _score_market_demand(0.10, 31, "rising") == 3

    def test_flat_trend(self) -> None:
        """Flat rents → 2 pts."""
        assert _score_market_demand(0.10, 31, "flat") == 2

    def test_declining_trend(self) -> None:
        """Declining rents → 0 pts."""
        assert _score_market_demand(0.10, 31, "declining") == 0

    def test_vaughan_demand(self) -> None:
        """Vaughan: 1.8% vacancy, 18 DOM, declining → 4+2+0 = 6 pts."""
        result = _score_market_demand(0.018, 18, "declining")
        assert result == 6

    def test_hamilton_demand(self) -> None:
        """Hamilton: 2.5% vacancy, 22 DOM, rising → 3+2+3 = 8 pts."""
        result = _score_market_demand(0.025, 22, "rising")
        assert result == 8


# ── calculate_deal_score (integration) ────────────────────────────


class TestCalculateDealScore:
    def test_vaughan_calibration(self) -> None:
        """
        Vaughan condo (5702 Buttermill Ave) — should be hard pass score of 0.

        Inputs match investor-calc.jsx reference dataset:
          cap_rate=1.97%, cash_flow=−$2,143/mo, coc=−16.1%,
          dscr=0.359, vacancy=1.8%, dom=18, trend=declining
          risk deductions: condo_fee(4) + supply(2) = 6
        """
        result = calculate_deal_score(
            cap_rate=0.01972,
            cash_flow_monthly=-2143.0,
            cash_on_cash=-0.161,
            dscr=0.359,
            cmhc_vacancy_rate=0.018,
            rental_days_on_market=18,
            rent_trend="declining",
            risk_flag_deductions=6,
        )
        assert result["total"] == 0
        assert result["verdict"] == "hard_pass"
        assert result["breakdown"]["subtotal"] == 6
        assert result["breakdown"]["deduction"] == 6

    def test_hamilton_calibration(self) -> None:
        """
        Hamilton duplex (146 East 19th St) — should be strong buy, score 84.

        Inputs match investor-calc.jsx reference dataset:
          cap_rate=6.94%, cash_flow=+$542/mo, coc=6.64%,
          dscr=1.263, vacancy=2.5%, dom=22, trend=rising
          risk deductions: rent_ctrl(5) = 5
        """
        result = calculate_deal_score(
            cap_rate=0.06943,
            cash_flow_monthly=542.0,
            cash_on_cash=0.0664,
            dscr=1.263,
            cmhc_vacancy_rate=0.025,
            rental_days_on_market=22,
            rent_trend="rising",
            risk_flag_deductions=5,
        )
        assert result["total"] == 84
        assert result["verdict"] == "strong_buy"
        # Component breakdown: 25+25+16+15+8 = 89, minus 5 = 84
        assert result["breakdown"]["cap_rate"] == 25
        assert result["breakdown"]["cash_flow"] == 25
        assert result["breakdown"]["cash_on_cash"] == 16
        assert result["breakdown"]["dscr"] == 15
        assert result["breakdown"]["demand"] == 8
        assert result["breakdown"]["subtotal"] == 89
        assert result["breakdown"]["deduction"] == 5

    def test_deduction_capped_at_15(self) -> None:
        """Risk deductions can never exceed 15 regardless of input."""
        result_uncapped = calculate_deal_score(
            cap_rate=0.05,
            cash_flow_monthly=300,
            cash_on_cash=0.06,
            dscr=1.30,
            cmhc_vacancy_rate=0.015,
            rental_days_on_market=10,
            rent_trend="rising",
            risk_flag_deductions=30,  # 30 input → capped at 15
        )
        assert result_uncapped["breakdown"]["deduction"] == 15

    def test_total_never_negative(self) -> None:
        """Score floored at 0 — can never go negative."""
        result = calculate_deal_score(
            cap_rate=0.00,
            cash_flow_monthly=-5000,
            cash_on_cash=-0.50,
            dscr=0.10,
            cmhc_vacancy_rate=0.10,
            rental_days_on_market=90,
            rent_trend="declining",
            risk_flag_deductions=15,
        )
        assert result["total"] == 0

    def test_no_deductions(self) -> None:
        """Zero deductions — subtotal equals total."""
        result = calculate_deal_score(
            cap_rate=0.04,
            cash_flow_monthly=100,
            cash_on_cash=0.03,
            dscr=1.00,
            cmhc_vacancy_rate=0.025,
            rental_days_on_market=20,
            rent_trend="flat",
            risk_flag_deductions=0,
        )
        assert result["total"] == result["breakdown"]["subtotal"]

    def test_max_possible_score(self) -> None:
        """Perfect deal hits maximum of 95 (25+25+20+15+10)."""
        result = calculate_deal_score(
            cap_rate=0.10,
            cash_flow_monthly=2000,
            cash_on_cash=0.15,
            dscr=2.00,
            cmhc_vacancy_rate=0.010,
            rental_days_on_market=7,
            rent_trend="rising",
            risk_flag_deductions=0,
        )
        assert result["total"] == 95
        assert result["verdict"] == "strong_buy"

    def test_returns_breakdown_keys(self) -> None:
        """Result dict always has 'total', 'verdict', and 'breakdown' keys."""
        result = calculate_deal_score(
            cap_rate=0.05,
            cash_flow_monthly=300,
            cash_on_cash=0.06,
            dscr=1.15,
            cmhc_vacancy_rate=0.03,
            rental_days_on_market=25,
            rent_trend="flat",
        )
        assert "total" in result
        assert "verdict" in result
        assert "breakdown" in result
        bd = result["breakdown"]
        assert "cap_rate" in bd
        assert "cash_flow" in bd
        assert "cash_on_cash" in bd
        assert "dscr" in bd
        assert "demand" in bd
        assert "subtotal" in bd
        assert "deduction" in bd
        assert "component_maxes" in bd


# ── get_verdict ────────────────────────────────────────────────────


class TestGetVerdict:
    def test_strong_buy(self) -> None:
        """80+ → strong_buy."""
        assert get_verdict(80) == "strong_buy"
        assert get_verdict(95) == "strong_buy"

    def test_good_deal(self) -> None:
        """65–79 → good_deal."""
        assert get_verdict(65) == "good_deal"
        assert get_verdict(79) == "good_deal"

    def test_caution(self) -> None:
        """50–64 → caution."""
        assert get_verdict(50) == "caution"
        assert get_verdict(64) == "caution"

    def test_marginal(self) -> None:
        """35–49 → marginal."""
        assert get_verdict(35) == "marginal"
        assert get_verdict(49) == "marginal"

    def test_do_not_buy(self) -> None:
        """20–34 → do_not_buy."""
        assert get_verdict(20) == "do_not_buy"
        assert get_verdict(34) == "do_not_buy"

    def test_hard_pass(self) -> None:
        """Below 20 → hard_pass."""
        assert get_verdict(19) == "hard_pass"
        assert get_verdict(0) == "hard_pass"
