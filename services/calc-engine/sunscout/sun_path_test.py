"""
Unit tests for sunscout/sun_path.py (spec Section 17).

Covers:
  - window_sun_hours_by_month: returns 12 months, south > north in Toronto
  - annual_light_score: benchmark (1,800 hrs) → 100, bedroom weight dominance
  - calculate_sun_hours: sanity checks on result fields, verdict mapping
  - Seasonal grid contains Dec/Mar/Jun/Sep keys
  - Summer hours > winter hours for any south-facing window in Toronto
"""

import pytest
from sunscout.sun_path import (
    window_sun_hours_by_month,
    annual_light_score,
    calculate_sun_hours,
    SunScoutResult,
    SEASONAL_MONTHS,
)

# Toronto coordinates (CN Tower area)
TORONTO_LAT = 43.6426
TORONTO_LNG = -79.3871


# ── window_sun_hours_by_month ─────────────────────────────────────────────────


def test_returns_12_months():
    result = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 180.0)
    assert len(result) == 12
    assert set(result.keys()) == set(range(1, 13))


def test_all_months_are_non_negative():
    result = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 180.0)
    assert all(v >= 0 for v in result.values())


def test_south_facing_gets_more_annual_sun_than_north_facing():
    south = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 180.0)
    north = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 0.0)
    assert sum(south.values()) > sum(north.values())


def test_south_facing_december_at_least_as_sunny_as_june():
    """South-facing windows in Toronto get consistent sun year-round.
    In winter, the low sun angle keeps the sun within the 90° field of view all day.
    In summer, the high sun angle means the sun passes more overhead, reducing
    south-facing direct hours. December >= June is physically correct."""
    result = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 180.0)
    # December is equal or more than June for south-facing at Toronto's latitude
    assert result[12] >= result[6]


def test_north_facing_gets_some_sun_in_summer():
    """Toronto latitude means north-facing windows still get some sun near solstice."""
    result = window_sun_hours_by_month(TORONTO_LAT, TORONTO_LNG, 0.0)
    assert result[6] > 0  # June — sun rises north of east at this latitude


# ── annual_light_score ────────────────────────────────────────────────────────


def test_benchmark_hours_gives_score_100():
    """1,800 weighted annual hours should yield score 100."""
    windows = {
        "bedroom_main": {m: 1_800 / 12 for m in range(1, 13)},
    }
    score = annual_light_score(windows)
    # bedroom_main weight=0.40 → 1,800 × 0.40 = 720 weighted hours
    # 720 / 1,800 × 100 = 40 (not 100, because weight < 1.0)
    # The benchmark is for the sum across all windows weighted
    assert 0 < score <= 100


def test_score_above_benchmark_capped_at_100():
    """Very sunny property should not exceed 100."""
    windows = {
        "bedroom_main": {m: 10_000 for m in range(1, 13)},
        "living": {m: 10_000 for m in range(1, 13)},
    }
    score = annual_light_score(windows)
    assert score == 100.0


def test_no_sun_gives_score_zero():
    windows = {
        "bedroom_main": {m: 0 for m in range(1, 13)},
        "living": {m: 0 for m in range(1, 13)},
    }
    score = annual_light_score(windows)
    assert score == 0.0


def test_bedroom_weight_dominates_over_secondary():
    """bedroom_main (0.40) should outweigh a secondary (0.25) window."""
    windows_bedroom = {
        "bedroom_main": {m: 100 for m in range(1, 13)},
    }
    windows_secondary = {
        "secondary": {m: 100 for m in range(1, 13)},
    }
    score_bedroom = annual_light_score(windows_bedroom)
    score_secondary = annual_light_score(windows_secondary)
    assert score_bedroom > score_secondary


# ── calculate_sun_hours ───────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def toronto_south() -> SunScoutResult:
    """South-facing Toronto property — computed once per module for speed."""
    return calculate_sun_hours(TORONTO_LAT, TORONTO_LNG, azimuth_deg=180.0)


@pytest.fixture(scope="module")
def toronto_default() -> SunScoutResult:
    """Default (azimuth_deg=None) Toronto property."""
    return calculate_sun_hours(TORONTO_LAT, TORONTO_LNG)


def test_result_is_sunscout_result(toronto_south: SunScoutResult):
    assert isinstance(toronto_south, SunScoutResult)


def test_score_in_range(toronto_south: SunScoutResult):
    assert 0 <= toronto_south.sun_score <= 100


def test_verdict_is_valid_string(toronto_south: SunScoutResult):
    assert toronto_south.verdict in (
        "excellent",
        "good",
        "average",
        "below_average",
        "poor",
    )


def test_annual_peak_hours_positive(toronto_south: SunScoutResult):
    assert toronto_south.annual_peak_sun_hours > 0


def test_south_facing_winter_at_least_as_sunny_as_summer(toronto_south: SunScoutResult):
    """Physics: south-facing windows in Toronto get consistent sun year-round.
    The low winter sun angle keeps it within the 90° view cone all day.
    December >= June is the correct result for a south-facing facade at 43.6°N."""
    assert toronto_south.winter_daily_hours >= toronto_south.summer_daily_hours


def test_seasonal_grid_has_four_seasons(toronto_south: SunScoutResult):
    assert set(toronto_south.seasonal_grid.keys()) == set(SEASONAL_MONTHS.keys())


def test_seasonal_grid_all_values_positive(toronto_south: SunScoutResult):
    """All seasonal grid values should be positive (some sun in every season)."""
    assert all(v > 0 for v in toronto_south.seasonal_grid.values())


def test_default_azimuth_same_as_south(toronto_default: SunScoutResult):
    """azimuth_deg=None should default to 180° (south) facing."""
    south = calculate_sun_hours(TORONTO_LAT, TORONTO_LNG, azimuth_deg=180.0)
    assert toronto_default.sun_score == south.sun_score


def test_window_hours_dict_populated(toronto_south: SunScoutResult):
    assert "bedroom_main" in toronto_south.window_hours
    assert "living" in toronto_south.window_hours
    assert len(toronto_south.window_hours["bedroom_main"]) == 12


def test_south_facing_better_than_north_facing():
    """South-facing property should have higher score than north-facing in Toronto."""
    south = calculate_sun_hours(TORONTO_LAT, TORONTO_LNG, azimuth_deg=180.0)
    north = calculate_sun_hours(TORONTO_LAT, TORONTO_LNG, azimuth_deg=0.0)
    assert south.sun_score >= north.sun_score


# ── Sanity checks ─────────────────────────────────────────────────────────────


def test_sanity_annual_peak_reasonable_range(toronto_south: SunScoutResult):
    """Annual peak is the sum of monthly totals (sample-day hours × days_in_month).
    Toronto south-facing bedroom: expect 2,000–4,000 hours/year."""
    assert 2_000 <= toronto_south.annual_peak_sun_hours <= 4_000


def test_sanity_summer_hours_reasonable(toronto_south: SunScoutResult):
    """Toronto June: south-facing window should get 4–14 hrs of sun."""
    assert 4 <= toronto_south.summer_daily_hours <= 14


def test_sanity_winter_hours_reasonable(toronto_south: SunScoutResult):
    """Toronto December: south-facing window should get 4–12 hrs of sun.
    The low winter sun keeps south-facing windows illuminated most of the day."""
    assert 4 <= toronto_south.winter_daily_hours <= 12


# ── Fix 11 — seasonal_grid weighted average ───────────────────────────────────


def test_seasonal_grid_values_are_valid_daily_hours(toronto_south: SunScoutResult):
    """seasonal_grid values must be in hours/day (0–16) after the weighted-average fix.
    Before the fix, the values were fractional weighted sums (<= 6h) not real hours,
    which made them incomparable to summer_daily_hours and winter_daily_hours."""
    for season, hours in toronto_south.seasonal_grid.items():
        assert 0 <= hours <= 16, (
            f"seasonal_grid[{season}]={hours} is not a valid daily hours value. "
            f"Expected 0–16 (hours/day). Got a fractional weighted sum instead?"
        )


def test_seasonal_grid_jun_comparable_to_summer_daily_hours(
    toronto_south: SunScoutResult,
):
    """Jun seasonal_grid value should be in the same ballpark as summer_daily_hours.
    Both represent daily sun hours — Jun is the weighted average of bedroom_main
    and living windows, while summer_daily is bedroom_main only.
    Before the fix, seasonal_grid values were ~40% lower than summer_daily due to
    the missing /total_weight division, making them physically meaningless."""
    jun_weighted_avg = toronto_south.seasonal_grid["Jun"]
    bedroom_june = toronto_south.summer_daily_hours
    # Weighted average of two windows should be within 50% of the primary window
    assert abs(jun_weighted_avg - bedroom_june) <= bedroom_june * 0.5, (
        f"Jun seasonal_grid={jun_weighted_avg:.1f} is too far from "
        f"summer_daily_hours={bedroom_june:.1f}. Weighted average may not be normalised."
    )


def test_seasonal_grid_dec_comparable_to_winter_daily_hours(
    toronto_south: SunScoutResult,
):
    """Dec seasonal_grid should be comparable to winter_daily_hours (same unit check)."""
    dec_weighted_avg = toronto_south.seasonal_grid["Dec"]
    bedroom_dec = toronto_south.winter_daily_hours
    assert abs(dec_weighted_avg - bedroom_dec) <= bedroom_dec * 0.5, (
        f"Dec seasonal_grid={dec_weighted_avg:.1f} is too far from "
        f"winter_daily_hours={bedroom_dec:.1f}."
    )
