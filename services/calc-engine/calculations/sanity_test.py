"""Unit tests for sanity_check_metrics()."""

from .sanity import sanity_check_metrics, SanityBounds

# ── Helper ─────────────────────────────────────────────────────────────────────

# Valid Vaughan inputs — should produce no warnings
_VAUGHAN_OK = dict(
    cap_rate=0.0197,
    monthly_rent=2_900,
    purchase_price=729_900,
    dscr=0.361,
    break_even_rent=4_585,
)

# Valid Hamilton inputs — should produce no warnings
_HAMILTON_OK = dict(
    cap_rate=0.0694,
    monthly_rent=3_600,
    purchase_price=449_000,
    dscr=1.27,
    break_even_rent=2_700,
)


# ── Clean inputs pass ──────────────────────────────────────────────────────────


def test_vaughan_no_warnings() -> None:
    """Vaughan calibration inputs — all values are realistic, no warnings."""
    assert sanity_check_metrics(**_VAUGHAN_OK) == []


def test_hamilton_no_warnings() -> None:
    """Hamilton calibration inputs — all values are realistic, no warnings."""
    assert sanity_check_metrics(**_HAMILTON_OK) == []


def test_returns_empty_list_for_clean_input() -> None:
    """Explicit clean input returns an empty list."""
    result = sanity_check_metrics(
        cap_rate=0.05,
        monthly_rent=2_500,
        purchase_price=600_000,
        dscr=1.1,
        break_even_rent=2_400,
    )
    assert result == []


# ── Cap rate ───────────────────────────────────────────────────────────────────


def test_cap_rate_negative_triggers_warning() -> None:
    """Negative cap rate (NOI below zero) is flagged."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "cap_rate": -0.01})
    assert any("Cap rate" in w for w in result)


def test_cap_rate_above_20pct_triggers_warning() -> None:
    """Cap rate above 20% is an implausible data error."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "cap_rate": 0.25})
    assert any("Cap rate" in w for w in result)


def test_cap_rate_at_boundary_passes() -> None:
    """Exactly 0% and 20% are within bounds."""
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "cap_rate": 0.0}) == []
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "cap_rate": 0.20}) == []


# ── Monthly rent ───────────────────────────────────────────────────────────────


def test_rent_below_500_triggers_warning() -> None:
    """Rent below $500/mo is implausible for a licensed rental unit."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "monthly_rent": 400})
    assert any("rent" in w.lower() for w in result)


def test_rent_above_15000_triggers_warning() -> None:
    """Rent above $15,000/mo is outside the expected residential range."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "monthly_rent": 20_000})
    assert any("rent" in w.lower() for w in result)


def test_rent_at_boundaries_passes() -> None:
    """$500 and $15,000 are within bounds (break_even_rent kept proportional)."""
    # break_even must also be updated so it doesn't cross 3× the new rent
    assert (
        sanity_check_metrics(
            **{**_VAUGHAN_OK, "monthly_rent": 500, "break_even_rent": 600}
        )
        == []
    )
    assert (
        sanity_check_metrics(
            **{**_VAUGHAN_OK, "monthly_rent": 15_000, "break_even_rent": 14_000}
        )
        == []
    )


# ── Purchase price ─────────────────────────────────────────────────────────────


def test_price_below_50k_triggers_warning() -> None:
    """Purchase price below $50K is implausible for an Ontario investment property."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "purchase_price": 40_000})
    assert any("Purchase price" in w for w in result)


def test_price_above_10m_triggers_warning() -> None:
    """Purchase price above $10M is outside the residential analysis scope."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "purchase_price": 11_000_000})
    assert any("Purchase price" in w for w in result)


def test_price_at_boundaries_passes() -> None:
    """$50K and $10M are within bounds."""
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "purchase_price": 50_000}) == []
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "purchase_price": 10_000_000}) == []


# ── DSCR ───────────────────────────────────────────────────────────────────────


def test_dscr_above_5_triggers_warning() -> None:
    """DSCR above 5x is almost certainly a data error."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "dscr": 6.0})
    assert any("DSCR" in w for w in result)


def test_dscr_exactly_5_passes() -> None:
    """DSCR of exactly 5.0x is within bounds (not above)."""
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "dscr": 5.0}) == []


def test_negative_dscr_does_not_trigger_dscr_warning() -> None:
    """Negative DSCR (NOI negative) is not flagged by the DSCR check — cap rate catches it."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "dscr": -0.1})
    assert not any("DSCR" in w for w in result)


# ── Break-even rent ratio ──────────────────────────────────────────────────────


def test_break_even_3x_rent_triggers_warning() -> None:
    """Break-even rent more than 3× market rent is flagged."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "break_even_rent": 9_001})
    assert any("Break-even" in w for w in result)


def test_break_even_exactly_3x_passes() -> None:
    """Break-even exactly 3× market rent is within bounds."""
    # monthly_rent = 2900, so break_even = 8700 should not warn
    assert sanity_check_metrics(**{**_VAUGHAN_OK, "break_even_rent": 8_700}) == []


def test_vaughan_break_even_does_not_warn() -> None:
    """Vaughan break-even ~$4,585 is 1.58× market rent — below the 3× threshold."""
    result = sanity_check_metrics(**_VAUGHAN_OK)
    assert not any("Break-even" in w for w in result)


# ── Negative break-even rent ────────────────────────────────────────────────────


def test_negative_break_even_triggers_warning() -> None:
    """A negative break-even rent signals an expense-input error."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "break_even_rent": -100})
    assert any("negative" in w.lower() for w in result)


def test_zero_break_even_does_not_trigger_negative_warning() -> None:
    """Break-even of exactly $0 is the boundary — not negative, no warning."""
    result = sanity_check_metrics(**{**_VAUGHAN_OK, "break_even_rent": 0})
    assert not any("negative" in w.lower() for w in result)


# ── Deal score ──────────────────────────────────────────────────────────────────


def test_deal_score_not_checked_when_omitted() -> None:
    """Deal score is optional — omitting it produces no deal-score warning."""
    result = sanity_check_metrics(**_VAUGHAN_OK)
    assert not any("Deal score" in w for w in result)


def test_deal_score_within_range_passes() -> None:
    """A normal deal score (0–95) produces no warning."""
    assert sanity_check_metrics(**_VAUGHAN_OK, deal_score=7) == []
    assert sanity_check_metrics(**_VAUGHAN_OK, deal_score=0) == []
    assert sanity_check_metrics(**_VAUGHAN_OK, deal_score=95) == []


def test_deal_score_negative_triggers_warning() -> None:
    """A negative deal score is a scoring bug."""
    result = sanity_check_metrics(**_VAUGHAN_OK, deal_score=-3)
    assert any("Deal score" in w for w in result)


def test_deal_score_above_95_triggers_warning() -> None:
    """A deal score above the 95-point maximum is a scoring bug."""
    result = sanity_check_metrics(**_VAUGHAN_OK, deal_score=120)
    assert any("Deal score" in w for w in result)


# ── Monthly cash flow ───────────────────────────────────────────────────────────


def test_cash_flow_not_checked_when_omitted() -> None:
    """Cash flow is optional — omitting it produces no cash-flow warning."""
    result = sanity_check_metrics(**_VAUGHAN_OK)
    assert not any("cash flow" in w.lower() for w in result)


def test_realistic_negative_cash_flow_passes() -> None:
    """A deeply negative but realistic cash flow (-$1,833/mo) is not flagged."""
    assert sanity_check_metrics(**_VAUGHAN_OK, cash_flow_monthly=-1_833) == []


def test_cash_flow_beyond_20k_triggers_warning() -> None:
    """Cash flow beyond ±$20K/mo is implausible for a residential property."""
    high = sanity_check_metrics(**_VAUGHAN_OK, cash_flow_monthly=25_000)
    low = sanity_check_metrics(**_VAUGHAN_OK, cash_flow_monthly=-25_000)
    assert any("cash flow" in w.lower() for w in high)
    assert any("cash flow" in w.lower() for w in low)


def test_cash_flow_at_boundary_passes() -> None:
    """Exactly ±$20,000/mo is within bounds (not beyond)."""
    assert sanity_check_metrics(**_VAUGHAN_OK, cash_flow_monthly=20_000) == []
    assert sanity_check_metrics(**_VAUGHAN_OK, cash_flow_monthly=-20_000) == []


# ── Multiple warnings ──────────────────────────────────────────────────────────


def test_multiple_bad_inputs_return_multiple_warnings() -> None:
    """All bad inputs produce one warning each."""
    result = sanity_check_metrics(
        cap_rate=5.0,  # 500% — clearly wrong
        monthly_rent=100,  # $100/mo — implausible
        purchase_price=1_000,  # $1K — implausible
        dscr=10.0,  # 10x — implausible
        break_even_rent=500,  # 5× the $100 rent
    )
    assert len(result) >= 4


# ── Custom bounds ──────────────────────────────────────────────────────────────


def test_custom_bounds_override_defaults() -> None:
    """Caller can tighten bounds — useful for testing edge logic."""
    tight = SanityBounds(
        cap_rate_min=0.03,
        cap_rate_max=0.08,
    )
    # Vaughan 1.97% cap rate is below the tight minimum
    result = sanity_check_metrics(**_VAUGHAN_OK, bounds=tight)
    assert any("Cap rate" in w for w in result)
