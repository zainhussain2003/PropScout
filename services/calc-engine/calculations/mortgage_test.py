"""Unit tests for mortgage calculations."""

import pytest
from .mortgage import calculate_monthly_payment, calculate_osfi_stress_rate


def test_monthly_payment_standard_case() -> None:
    """5702 Buttermill Ave calibration case: $583,920 loan at 4.79% over 25 years."""
    payment = calculate_monthly_payment(
        principal=583_920,
        annual_rate=0.0479,
        amortization_years=25,
    )
    # Expected: ~$3,340/month
    assert 3_200 <= payment <= 3_500, f"Unexpected payment: {payment}"


def test_monthly_payment_zero_rate() -> None:
    """Zero-rate edge case — payment should equal principal / n."""
    payment = calculate_monthly_payment(
        principal=120_000,
        annual_rate=0.0,
        amortization_years=10,
    )
    assert abs(payment - 1_000.0) < 0.01


def test_osfi_stress_rate_above_floor() -> None:
    """Contract rate + 2% > 5.25% floor."""
    assert abs(calculate_osfi_stress_rate(0.0479) - 0.0679) < 0.0001


def test_osfi_stress_rate_at_floor() -> None:
    """Very low rate — floor of 5.25% applies."""
    assert calculate_osfi_stress_rate(0.02) == 0.0525
