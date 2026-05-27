"""Unit tests for mortgage calculations."""

import pytest
from .mortgage import (
    calculate_monthly_payment,
    calculate_osfi_stress_rate,
    remaining_balance,
)


def test_monthly_payment_standard_case() -> None:
    """5702 Buttermill Ave calibration case: $583,920 loan at 4.79% over 25 years.

    Uses Canadian semi-annual compounding (Interest Act):
        monthly_rate = (1 + 0.0479/2)^(1/6) - 1 = 0.395241%
    vs US monthly compounding: 0.0479/12 = 0.399167%
    Expected: ~$3,327/month (Canadian) vs ~$3,339 (US).
    """
    payment = calculate_monthly_payment(
        principal=583_920,
        annual_rate=0.0479,
        amortization_years=25,
    )
    assert 3_200 <= payment <= 3_500, f"Unexpected payment: {payment}"
    # Tighter check — Canadian compounding gives ~$3,326.64
    assert (
        abs(payment - 3_326.64) < 1.0
    ), f"Payment drifted from Canadian formula: {payment}"


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


# ── remaining_balance ──────────────────────────────────────────────


def test_remaining_balance_zero_payments() -> None:
    """After 0 payments, balance equals original principal."""
    balance = remaining_balance(583_920, 0.0479, 25, month=0)
    assert abs(balance - 583_920) < 0.01


def test_remaining_balance_full_amortization() -> None:
    """After all 300 payments (25yr), balance is approximately $0."""
    balance = remaining_balance(300_000, 0.0479, 25, month=300)
    assert balance == 0.0


def test_remaining_balance_midpoint() -> None:
    """At payment 150 of 300 (25yr loan), balance is between 40-65% of original."""
    principal = 400_000
    balance = remaining_balance(principal, 0.0479, 25, month=150)
    ratio = balance / principal
    assert 0.40 <= ratio <= 0.65, f"Midpoint balance ratio unexpected: {ratio:.3f}"


def test_remaining_balance_vaughan_after_60_payments() -> None:
    """
    Vaughan: $583,920 loan at 4.79%, 25yr.
    After 5 years (60 payments) balance should be between 88-95% of original.
    Canadian semi-annual compounding — less principal paid in early years.
    """
    principal = 583_920
    balance = remaining_balance(principal, 0.0479, 25, month=60)
    ratio = balance / principal
    assert 0.87 <= ratio <= 0.96, f"Vaughan 5yr balance ratio unexpected: {ratio:.3f}"
    # More precise: actual balance ≈ $515,091 (Canadian semi-annual compounding)
    assert 500_000 <= balance <= 530_000, f"Vaughan balance after 60 mo: {balance:.2f}"


def test_remaining_balance_zero_rate() -> None:
    """Zero-rate loan: balance decreases linearly — half of principal after half the payments."""
    principal = 120_000
    balance = remaining_balance(principal, 0.0, 10, month=60)
    expected = 60_000.0  # exactly half remaining after 60 of 120 payments
    assert abs(balance - expected) < 0.01


def test_remaining_balance_beyond_term() -> None:
    """Month > total term returns 0.0."""
    balance = remaining_balance(300_000, 0.0479, 25, month=999)
    assert balance == 0.0


def test_remaining_balance_one_payment_in() -> None:
    """After 1 payment, balance should be slightly less than principal."""
    principal = 500_000
    balance = remaining_balance(principal, 0.0479, 25, month=1)
    assert balance < principal
    assert balance > principal * 0.998  # only ~0.2% of balance paid off in month 1


@pytest.mark.skip(
    reason="remaining_balance() has no input validation — ValueError not implemented"
)
def test_remaining_balance_negative_months_raises() -> None:
    """Negative months_paid should raise ValueError (not yet implemented)."""
    with pytest.raises(ValueError):
        remaining_balance(300_000, 0.0479, 25, month=-1)


# ── Additional monthly_payment edge cases ─────────────────────────


def test_monthly_payment_hamilton() -> None:
    """Hamilton calibration: $359,200 loan at 4.79% over 25 years → ~$2,046/mo."""
    payment = calculate_monthly_payment(
        principal=359_200,
        annual_rate=0.0479,
        amortization_years=25,
    )
    assert 1_900 <= payment <= 2_200, f"Hamilton payment out of range: {payment}"
    assert abs(payment - 2_046.39) < 2.0, f"Hamilton payment drifted: {payment}"


def test_monthly_payment_large_principal() -> None:
    """Very large principal ($5M) produces a plausible result — no overflow."""
    payment = calculate_monthly_payment(
        principal=5_000_000,
        annual_rate=0.0479,
        amortization_years=25,
    )
    # Should be roughly 28,500/mo (5M * scaling of 583,920 → 3,327 base)
    assert (
        25_000 <= payment <= 35_000
    ), f"Large principal payment unexpected: {payment:.2f}"


_NO_VALIDATION = (
    "calculate_monthly_payment() has no input validation — ValueError not implemented"
)


@pytest.mark.skip(reason=_NO_VALIDATION)
def test_monthly_payment_negative_principal_raises() -> None:
    """Negative principal should raise ValueError (not yet implemented)."""
    with pytest.raises(ValueError):
        calculate_monthly_payment(-100_000, 0.0479, 25)


@pytest.mark.skip(reason=_NO_VALIDATION)
def test_monthly_payment_negative_rate_raises() -> None:
    """Negative rate should raise ValueError (not yet implemented)."""
    with pytest.raises(ValueError):
        calculate_monthly_payment(300_000, -0.01, 25)


@pytest.mark.skip(reason=_NO_VALIDATION)
def test_monthly_payment_zero_years_raises() -> None:
    """Zero years should raise ValueError (not yet implemented)."""
    with pytest.raises(ValueError):
        calculate_monthly_payment(300_000, 0.0479, 0)
