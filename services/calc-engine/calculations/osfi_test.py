"""
Unit tests for OSFI B-20 stress test calculations.

Reference:
  OSFI qualifying rate = max(contract_rate + 2%, 5.25%)
  GDS limit: 39% | TDS limit: 44%
"""

from .osfi import calculate_stress_test_payment, passes_stress_test
from .mortgage import calculate_osfi_stress_rate

# ── Stress test payment ────────────────────────────────────────────


class TestCalculateStressTestPayment:
    def test_payment_exceeds_contract_payment(self) -> None:
        """Payment at stress rate must be higher than at contract rate."""
        from calculations.mortgage import calculate_monthly_payment

        contract_payment = calculate_monthly_payment(583_920, 0.0479, 25)
        stress_payment = calculate_stress_test_payment(583_920, 0.0479, 25)
        assert stress_payment > contract_payment

    def test_vaughan_stress_payment(self) -> None:
        """
        Vaughan calibration: $583,920 loan at 4.79% contract.
        Stress rate = 4.79% + 2% = 6.79% (above the 5.25% floor).
        With Canadian semi-annual compounding: ~$4,014/month.
        """
        payment = calculate_stress_test_payment(583_920, 0.0479, 25)
        assert 4_000 <= payment <= 4_600, f"Stress payment out of range: {payment:.2f}"
        # Tighter check — Canadian compounding gives ~$4,014.44
        assert abs(payment - 4_014.44) < 2.0, f"Stress payment drifted: {payment}"

    def test_low_rate_hits_floor(self) -> None:
        """
        Contract rate of 2% → qualifying rate = 5.25% (floor applies).
        Must produce a higher payment than the 2% rate would.
        """
        from calculations.mortgage import calculate_monthly_payment

        low_rate_payment = calculate_monthly_payment(300_000, 0.02, 25)
        stress_payment = calculate_stress_test_payment(300_000, 0.02, 25)
        # Stress rate is 5.25%, not 4% (2%+2%)
        assert stress_payment > low_rate_payment
        qualifying_rate = calculate_osfi_stress_rate(0.02)
        assert qualifying_rate == 0.0525

    def test_stress_rate_above_floor(self) -> None:
        """Contract 4.79% + 2% = 6.79% — above the 5.25% floor."""
        qualifying_rate = calculate_osfi_stress_rate(0.0479)
        assert abs(qualifying_rate - 0.0679) < 0.0001


# ── Passes stress test ─────────────────────────────────────────────


class TestPassesStressTest:
    def test_result_keys_present(self) -> None:
        """Result dict always contains expected keys."""
        result = passes_stress_test(
            annual_income=120_000,
            mortgage_amount=400_000,
            contract_rate=0.0479,
            amortization_years=25,
        )
        assert "passes" in result
        assert "gds" in result
        assert "tds" in result
        assert "qualifying_rate" in result
        assert "stress_payment_monthly" in result

    def test_high_income_passes(self) -> None:
        """High income borrower on a modest mortgage should pass."""
        result = passes_stress_test(
            annual_income=250_000,
            mortgage_amount=400_000,
            contract_rate=0.0479,
            amortization_years=25,
            annual_property_tax=5_000,
        )
        assert result["passes"] is True
        assert result["gds"] < 0.39

    def test_low_income_fails(self) -> None:
        """Borrower with income too low relative to mortgage should fail."""
        result = passes_stress_test(
            annual_income=60_000,
            mortgage_amount=700_000,
            contract_rate=0.0479,
            amortization_years=25,
            annual_property_tax=6_000,
        )
        assert result["passes"] is False
        assert result["gds"] > 0.39

    def test_vaughan_stress_test(self) -> None:
        """
        Vaughan calibration: $583,920 loan, 4.79% rate, $125k income.
        Expected to fail — condo + mortgage costs are very high relative to income.
        """
        result = passes_stress_test(
            annual_income=125_000,
            mortgage_amount=583_920,
            contract_rate=0.0479,
            amortization_years=25,
            annual_property_tax=3_326,
            condo_fee_monthly=761,
        )
        # GDS will be high due to large mortgage + condo fee
        assert result["gds"] > 0.39  # fails GDS limit
        assert result["passes"] is False

    def test_condo_fee_included_at_50_percent(self) -> None:
        """CMHC rule: only 50% of condo fee counts in GDS calculation."""
        base = passes_stress_test(
            annual_income=100_000,
            mortgage_amount=400_000,
            contract_rate=0.0479,
            amortization_years=25,
        )
        with_condo = passes_stress_test(
            annual_income=100_000,
            mortgage_amount=400_000,
            contract_rate=0.0479,
            amortization_years=25,
            condo_fee_monthly=800,
        )
        # GDS should be higher with condo fee included (50% of 800 = 400/mo)
        assert with_condo["gds"] > base["gds"]

    def test_other_debts_affect_tds_only(self) -> None:
        """Other monthly debts increase TDS but not GDS."""
        no_debts = passes_stress_test(
            annual_income=120_000,
            mortgage_amount=450_000,
            contract_rate=0.0479,
            amortization_years=25,
        )
        with_debts = passes_stress_test(
            annual_income=120_000,
            mortgage_amount=450_000,
            contract_rate=0.0479,
            amortization_years=25,
            other_monthly_debts=500,
        )
        # GDS unchanged; TDS increases
        assert abs(with_debts["gds"] - no_debts["gds"]) < 0.001
        assert with_debts["tds"] > no_debts["tds"]

    def test_gds_and_tds_are_ratios(self) -> None:
        """GDS and TDS must be ratios between 0 and 1."""
        result = passes_stress_test(
            annual_income=120_000,
            mortgage_amount=500_000,
            contract_rate=0.0479,
            amortization_years=25,
        )
        assert 0 < result["gds"] < 1
        assert 0 < result["tds"] < 1

    def test_qualifying_rate_matches_osfi_formula(self) -> None:
        """Returned qualifying rate must equal max(contract+2%, 5.25%)."""
        result = passes_stress_test(
            annual_income=120_000,
            mortgage_amount=400_000,
            contract_rate=0.0479,
            amortization_years=25,
        )
        expected_rate = max(0.0479 + 0.02, 0.0525)
        assert abs(result["qualifying_rate"] - expected_rate) < 0.0001
