"""Unit tests for closing cost and LTT calculations."""

import pytest

from .closing_costs import (
    calculate_ontario_ltt,
    calculate_toronto_mltt,
    estimate_closing_costs,
)


def test_ontario_ltt_729900() -> None:
    """Known value: $729,900 property → ~$11,348 Ontario LTT."""
    ltt = calculate_ontario_ltt(729_900)
    assert 11_000 <= ltt <= 12_000, f"LTT out of expected range: {ltt}"


def test_toronto_mltt_729900() -> None:
    """Toronto MLTT should be roughly similar to provincial."""
    mltt = calculate_toronto_mltt(729_900)
    assert mltt == 11_073.0


def test_closing_costs_non_toronto() -> None:
    """Non-Toronto closing costs should not include MLTT."""
    costs = estimate_closing_costs(729_900, is_toronto=False)
    assert costs["ltt_municipal"] == 0.0
    assert costs["total"] > 0


def test_closing_costs_toronto() -> None:
    """Toronto closing costs should include both provincial and municipal LTT."""
    costs = estimate_closing_costs(729_900, is_toronto=True)
    assert costs["ltt_municipal"] > 0
    assert costs["total"] > costs["ltt_provincial"] + costs["ltt_municipal"]


@pytest.mark.parametrize(
    "price,expected",
    [
        (250_000, 2225),
        (300_000, 2975),
        (400_000, 4475),
        (500_000, 6475),
        (750_000, 11475),
        (1_000_000, 16475),
        (2_000_000, 36475),
        (3_000_000, 61475),
        (3_500_000, 83475),
        (4_000_000, 105475),
        (5_000_000, 159975),
        (10_000_000, 484975),
        (20_000_000, 1239975),
        (21_000_000, 1325975),
    ],
)
def test_toronto_2026_residential_schedule(price: float, expected: float) -> None:
    """City of Toronto rates effective April 1, before rebates and fees."""
    assert calculate_toronto_mltt(price) == pytest.approx(expected, abs=0.005)
