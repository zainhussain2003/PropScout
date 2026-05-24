"""Unit tests for closing cost and LTT calculations."""

from .closing_costs import calculate_ontario_ltt, calculate_toronto_mltt, estimate_closing_costs


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
    assert costs['ltt_municipal'] == 0.0
    assert costs['total'] > 0


def test_closing_costs_toronto() -> None:
    """Toronto closing costs should include both provincial and municipal LTT."""
    costs = estimate_closing_costs(729_900, is_toronto=True)
    assert costs['ltt_municipal'] > 0
    assert costs['total'] > costs['ltt_provincial'] + costs['ltt_municipal']
