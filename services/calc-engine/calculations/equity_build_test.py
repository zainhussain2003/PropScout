"""Unit tests for equity build projection."""

from .equity_build import calculate_equity_build

# ── Shared Vaughan inputs ──────────────────────────────────────────────────────

_VAUGHAN = dict(
    purchase_price=729_900,
    down_payment_pct=0.20,
    annual_rate=0.0479,
    amortization_years=25,
    appreciation_rate=0.03,
)

_HAMILTON = dict(
    purchase_price=449_000,
    down_payment_pct=0.20,
    annual_rate=0.0479,
    amortization_years=25,
    appreciation_rate=0.03,
)


# ── Structure ──────────────────────────────────────────────────────────────────


def test_returns_three_snapshots_by_default() -> None:
    """Default snapshot years are 5, 10, 20 → three dicts."""
    result = calculate_equity_build(**_VAUGHAN)
    assert len(result) == 3


def test_snapshot_years_match() -> None:
    """Returned dicts carry the correct year values."""
    result = calculate_equity_build(**_VAUGHAN)
    assert result[0]["year"] == 5
    assert result[1]["year"] == 10
    assert result[2]["year"] == 20


def test_required_keys_present() -> None:
    """Every snapshot dict contains all required keys."""
    required = {
        "year",
        "property_value",
        "mortgage_balance",
        "equity",
        "equity_pct",
        "paydown_gain",
        "appreciation_gain",
    }
    for snap in calculate_equity_build(**_VAUGHAN):
        assert required.issubset(
            snap.keys()
        ), f"Year {snap['year']} missing keys: {required - snap.keys()}"


def test_custom_snapshot_years() -> None:
    """Caller can request arbitrary snapshot years."""
    result = calculate_equity_build(**_VAUGHAN, snapshot_years=(1, 3, 7, 15))
    assert [s["year"] for s in result] == [1, 3, 7, 15]


# ── Math correctness ───────────────────────────────────────────────────────────


def test_equity_equals_property_value_minus_balance() -> None:
    """equity = property_value - mortgage_balance for every snapshot."""
    for snap in calculate_equity_build(**_VAUGHAN):
        expected = snap["property_value"] - snap["mortgage_balance"]
        assert (
            abs(snap["equity"] - expected) < 0.02
        ), f"Year {snap['year']}: equity mismatch"


def test_equity_pct_consistent() -> None:
    """equity_pct = equity / property_value for every snapshot."""
    for snap in calculate_equity_build(**_VAUGHAN):
        expected = snap["equity"] / snap["property_value"]
        assert (
            abs(snap["equity_pct"] - expected) < 0.0001
        ), f"Year {snap['year']}: equity_pct mismatch"


def test_paydown_plus_appreciation_plus_down_equals_equity() -> None:
    """
    Initial equity = down payment.
    Total equity = down_payment + paydown_gain + appreciation_gain.
    """
    down = _VAUGHAN["purchase_price"] * _VAUGHAN["down_payment_pct"]
    for snap in calculate_equity_build(**_VAUGHAN):
        total = down + snap["paydown_gain"] + snap["appreciation_gain"]
        assert (
            abs(snap["equity"] - total) < 0.05
        ), f"Year {snap['year']}: equity decomposition mismatch"


def test_equity_grows_over_time() -> None:
    """Each later snapshot has more equity than the previous one."""
    snaps = calculate_equity_build(**_VAUGHAN)
    for i in range(1, len(snaps)):
        assert (
            snaps[i]["equity"] > snaps[i - 1]["equity"]
        ), f"Equity did not grow: year {snaps[i-1]['year']} → {snaps[i]['year']}"


def test_mortgage_balance_shrinks_over_time() -> None:
    """Remaining mortgage balance falls monotonically."""
    snaps = calculate_equity_build(**_VAUGHAN)
    for i in range(1, len(snaps)):
        assert (
            snaps[i]["mortgage_balance"] < snaps[i - 1]["mortgage_balance"]
        ), f"Balance did not shrink: year {snaps[i-1]['year']} → {snaps[i]['year']}"


def test_property_value_grows_with_appreciation() -> None:
    """Property value at year Y = purchase_price × (1.03)^Y."""
    result = calculate_equity_build(**_VAUGHAN)
    for snap in result:
        expected = (
            _VAUGHAN["purchase_price"]
            * (1 + _VAUGHAN["appreciation_rate"]) ** snap["year"]
        )
        assert (
            abs(snap["property_value"] - expected) < 0.02
        ), f"Year {snap['year']}: property_value mismatch"


def test_zero_appreciation_makes_gains_paydown_only() -> None:
    """With 0% appreciation, appreciation_gain = 0 and equity = down + paydown."""
    result = calculate_equity_build(
        purchase_price=500_000,
        down_payment_pct=0.20,
        annual_rate=0.0479,
        amortization_years=25,
        appreciation_rate=0.0,
    )
    for snap in result:
        assert (
            abs(snap["appreciation_gain"]) < 0.01
        ), f"Year {snap['year']}: expected zero appreciation gain"
        assert snap["property_value"] == 500_000.0


# ── Calibration checks ─────────────────────────────────────────────────────────


def test_vaughan_year5_equity_range() -> None:
    """
    Vaughan at year 5: property ~$846K, mortgage ~$526K → equity ~$320K.
    Down payment ($145,980) + paydown (~$29K) + appreciation (~$116K).
    """
    result = calculate_equity_build(**_VAUGHAN)
    year5 = result[0]
    assert year5["year"] == 5
    assert (
        280_000 <= year5["equity"] <= 380_000
    ), f"Year-5 equity out of range: {year5['equity']:,.0f}"
    initial_principal = _VAUGHAN["purchase_price"] * (1 - _VAUGHAN["down_payment_pct"])
    assert (
        year5["mortgage_balance"] < initial_principal
    ), "Mortgage balance should be less than initial principal at year 5"


def test_vaughan_year20_equity_range() -> None:
    """
    Vaughan at year 20: most of the mortgage is paid down + 20 years of appreciation.
    Equity should be substantially above the initial down payment.
    """
    result = calculate_equity_build(**_VAUGHAN)
    year20 = result[2]
    assert year20["year"] == 20
    # Down payment alone is $145,980 — year 20 equity must be much more
    assert (
        year20["equity"] > 400_000
    ), f"Year-20 equity unexpectedly low: {year20['equity']:,.0f}"


def test_hamilton_positive_equity_trajectory() -> None:
    """Hamilton duplex equity grows from down payment through year 20."""
    result = calculate_equity_build(**_HAMILTON)
    initial_down = _HAMILTON["purchase_price"] * _HAMILTON["down_payment_pct"]
    for snap in result:
        assert (
            snap["equity"] > initial_down
        ), f"Year {snap['year']}: equity below initial down payment"


def test_year_beyond_amortization_is_clamped() -> None:
    """
    Requesting year 30 on a 25-year mortgage: balance should be 0 (fully paid off).
    The function zeroes out floating-point residuals at/past the amortization term.
    """
    result = calculate_equity_build(
        purchase_price=500_000,
        down_payment_pct=0.20,
        annual_rate=0.0479,
        amortization_years=25,
        appreciation_rate=0.03,
        snapshot_years=(30,),
    )
    assert (
        result[0]["mortgage_balance"] == 0.0
    ), f"Expected zero balance after payoff, got {result[0]['mortgage_balance']}"


def test_equity_pct_at_full_payoff() -> None:
    """After full payoff (year = amortization), equity_pct should equal 1.0."""
    result = calculate_equity_build(
        purchase_price=500_000,
        down_payment_pct=0.20,
        annual_rate=0.0479,
        amortization_years=25,
        appreciation_rate=0.0,  # no appreciation — property_value stays flat at purchase_price
        snapshot_years=(25,),
    )
    snap = result[0]
    # Balance is zeroed at the amortization boundary; equity_pct = 1.0
    assert (
        snap["mortgage_balance"] == 0.0
    ), f"Balance should be 0 at payoff: {snap['mortgage_balance']}"
    assert (
        abs(snap["equity_pct"] - 1.0) < 0.0001
    ), f"equity_pct should be 1.0 at payoff: {snap['equity_pct']}"
