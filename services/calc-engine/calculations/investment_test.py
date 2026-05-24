"""Unit tests for investment metric calculations."""

import pytest
from .investment import (
    calculate_cap_rate,
    calculate_dscr,
    calculate_grm,
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
