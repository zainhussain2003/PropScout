"""Unit tests for closing cost and LTT calculations."""

from .closing_costs import (
    calculate_ontario_ltt,
    calculate_toronto_mltt,
    estimate_closing_costs,
    get_nrst_risk_flag,
)
from constants.rates import NRST_RATE


def test_ontario_ltt_729900() -> None:
    """Known value: $729,900 property → ~$11,348 Ontario LTT."""
    ltt = calculate_ontario_ltt(729_900)
    assert 11_000 <= ltt <= 12_000, f"LTT out of expected range: {ltt}"


def test_toronto_mltt_729900() -> None:
    """Toronto MLTT should be roughly similar to provincial."""
    mltt = calculate_toronto_mltt(729_900)
    assert 9_000 <= mltt <= 11_000, f"MLTT out of expected range: {mltt}"


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


def test_closing_costs_nrst_key_always_present() -> None:
    """The 'nrst' key must always be present even when non_resident=False."""
    costs = estimate_closing_costs(729_900, non_resident=False)
    assert "nrst" in costs
    assert costs["nrst"] == 0.0


def test_closing_costs_nrst_adds_25_percent() -> None:
    """Non-resident buyer on $729,900 property → NRST = 25% = $182,475."""
    purchase_price = 729_900.0
    costs = estimate_closing_costs(purchase_price, non_resident=True)
    expected_nrst = round(purchase_price * NRST_RATE, 2)  # 182_475.0
    assert costs["nrst"] == expected_nrst
    # Total must include NRST
    costs_resident = estimate_closing_costs(purchase_price, non_resident=False)
    assert abs(costs["total"] - costs_resident["total"] - expected_nrst) < 0.01


def test_closing_costs_nrst_combined_with_toronto() -> None:
    """Toronto non-resident buyer pays provincial LTT + MLTT + NRST."""
    purchase_price = 900_000.0
    costs = estimate_closing_costs(purchase_price, is_toronto=True, non_resident=True)
    assert costs["ltt_municipal"] > 0
    assert costs["nrst"] == round(purchase_price * NRST_RATE, 2)
    # Total = all components summed correctly
    expected_total = (
        costs["ltt_provincial"]
        + costs["ltt_municipal"]
        + costs["nrst"]
        + costs["legal_fees"]
        + costs["title_insurance"]
        + costs["home_inspection"]
    )
    assert abs(costs["total"] - expected_total) < 0.01


def test_get_nrst_risk_flag_structure() -> None:
    """NRST flag has correct id, severity, and mentions the dollar amount."""
    flag = get_nrst_risk_flag(729_900.0)
    assert flag["id"] == "nrst_ontario"
    assert flag["severity"] == "red"
    assert flag["confidence"] == 100
    assert "25%" in flag["evidence"]
    assert "$182,475" in flag["evidence"]


def test_get_nrst_risk_flag_scales_with_price() -> None:
    """Flag evidence amount scales correctly with purchase price."""
    flag = get_nrst_risk_flag(1_000_000.0)
    assert "$250,000" in flag["evidence"]
