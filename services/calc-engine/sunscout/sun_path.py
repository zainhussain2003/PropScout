"""
SunScout — solar exposure calculation using pvlib + NREL SPA.
Spec Section 17 (TEMPLATE CODE).

Runs locally — no external API call required.
pvlib uses NREL's Solar Position Algorithm (SPA) implementation.

Weights and benchmarks are starting assumptions — update spec when adjusted.
"""

import pvlib
import pandas as pd
from dataclasses import dataclass, field

# ── Constants ─────────────────────────────────────────────────────────────────

TIMEZONE = "America/Toronto"

# Weights for the annual light score (must sum to ≤ 1.0 for named windows)
WINDOW_WEIGHTS: dict[str, float] = {
    "bedroom_main": 0.40,
    "living": 0.35,
}
DEFAULT_WEIGHT = 0.25  # all other windows

# Benchmark: 2,500 weighted annual hours = score of 100.
# Calibrated so that a south-facing Toronto property scores ~87 (excellent)
# and a north-facing property scores ~43 (average). Spec §17 TEMPLATE — adjust
# based on user feedback and accuracy testing.
ANNUAL_HOURS_BENCHMARK = 2_500.0

# Months to show in the seasonal grid
SEASONAL_MONTHS: dict[str, int] = {"Dec": 12, "Mar": 3, "Jun": 6, "Sep": 9}

# Score interpretation brackets (spec Section 17)
SCORE_BRACKETS = [
    (80, "excellent"),
    (60, "good"),
    (40, "average"),
    (20, "below_average"),
    (0, "poor"),
]

# ── Data model ────────────────────────────────────────────────────────────────


@dataclass
class SunScoutResult:
    """Sun path analysis result for a property location."""

    annual_peak_sun_hours: float
    summer_daily_hours: float  # June solstice (June 15 average)
    winter_daily_hours: float  # December solstice (Dec 15 average)
    seasonal_grid: dict[str, float]  # Dec, Mar, Jun, Sep daily hours (weighted)
    sun_score: float  # 0–100
    verdict: str  # 'excellent' | 'good' | 'average' | 'below_average' | 'poor'
    window_hours: dict[str, dict[int, float]] = field(default_factory=dict)


# ── Core calculation ──────────────────────────────────────────────────────────


DAYS_PER_MONTH = {
    1: 31,
    2: 28,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
}


def window_sun_hours_by_month(
    lat: float, lng: float, window_bearing: float
) -> dict[int, float]:
    """
    Returns estimated total hours of direct sun per month for a window.

    Uses the 15th of each month as the representative day (spec Section 17).
    Multiplies the sample-day hours by days_in_month to estimate monthly totals,
    making the result compatible with the 1,800-hour annual benchmark.

    Args:
        lat: Property latitude (decimal degrees).
        lng: Property longitude (decimal degrees).
        window_bearing: Window facing direction in degrees (0=North, 90=East,
                        180=South, 270=West).

    Returns:
        Dict mapping month number (1–12) to estimated total hours that month.
    """
    location = pvlib.location.Location(lat, lng, tz=TIMEZONE)
    monthly_hours: dict[int, float] = {}

    for month in range(1, 13):
        sample_date = pd.Timestamp(f"2026-{month:02d}-15", tz=TIMEZONE)
        times = pd.date_range(
            start=sample_date.replace(hour=5),
            end=sample_date.replace(hour=21),
            freq="1h",
            tz=TIMEZONE,
        )
        solar = location.get_solarposition(times)
        day_hours = 0.0
        for _, row in solar.iterrows():
            if row["apparent_elevation"] <= 0:
                continue
            angle_diff = abs((row["azimuth"] - window_bearing + 180) % 360 - 180)
            if angle_diff <= 90:
                day_hours += 1.0
        # Multiply sample-day hours by days in month for estimated monthly total
        monthly_hours[month] = round(day_hours * DAYS_PER_MONTH[month], 1)

    return monthly_hours


def annual_light_score(windows: dict[str, dict[int, float]]) -> float:
    """
    Calculate the annual light score (0–100) from per-window monthly hours.

    Weights: bedroom_main 40%, living 35%, all others 25%.
    Benchmark: 1,800 weighted annual hours = 100 score.

    Args:
        windows: Dict of window_name -> {month_number: hours}.

    Returns:
        Score from 0 to 100.
    """
    weighted_annual = 0.0
    for name, monthly in windows.items():
        weight = WINDOW_WEIGHTS.get(name, DEFAULT_WEIGHT)
        weighted_annual += sum(monthly.values()) * weight
    return min(100.0, weighted_annual / ANNUAL_HOURS_BENCHMARK * 100.0)


def _verdict_from_score(score: float) -> str:
    """Map a numeric score to a text verdict."""
    for threshold, label in SCORE_BRACKETS:
        if score >= threshold:
            return label
    return "poor"


# ── Public entry point ────────────────────────────────────────────────────────


def calculate_sun_hours(
    lat: float,
    lng: float,
    azimuth_deg: float | None = None,
) -> SunScoutResult:
    """
    Calculate peak sun hours and seasonal solar exposure for a property.

    When azimuth_deg is None, calculates for a south-facing (180°) window as
    the baseline optimistic case. In Phase 2 the user will supply individual
    window azimuths via the UI.

    Args:
        lat: Property latitude.
        lng: Property longitude.
        azimuth_deg: Building facade azimuth in degrees (0=North, 180=South).
                     None defaults to south-facing.

    Returns:
        SunScoutResult with annual and seasonal sun hour data.
    """
    facade = azimuth_deg if azimuth_deg is not None else 180.0

    # Two standard windows derived from the facade bearing:
    #   bedroom_main faces the primary facade direction
    #   living faces 90° offset (perpendicular — typical floor-plan layout)
    # Secondary and other windows can be added via the Phase 2 UI. Including
    # the opposite-facing window inflates scores for north-facing properties.
    windows_to_calculate: dict[str, float] = {
        "bedroom_main": facade,
        "living": (facade + 90.0) % 360.0,
    }

    window_hours: dict[str, dict[int, float]] = {}
    for window_name, bearing in windows_to_calculate.items():
        window_hours[window_name] = window_sun_hours_by_month(lat, lng, bearing)

    score = annual_light_score(window_hours)
    verdict = _verdict_from_score(score)

    # Weighted daily hours for each seasonal month (divide monthly total by days)
    seasonal_grid: dict[str, float] = {}
    for season_label, month_num in SEASONAL_MONTHS.items():
        days = DAYS_PER_MONTH[month_num]
        weighted_day = sum(
            (window_hours[wn][month_num] / days)
            * WINDOW_WEIGHTS.get(wn, DEFAULT_WEIGHT)
            for wn in window_hours
        )
        seasonal_grid[season_label] = round(weighted_day, 1)

    # Annual peak hours = total annual hours for the bedroom_main window
    bedroom_main_hours = window_hours.get("bedroom_main", {})
    annual_peak = sum(bedroom_main_hours.values())

    # Representative summer (June) and winter (December) daily hours (not monthly totals)
    summer_daily = bedroom_main_hours.get(6, 0.0) / DAYS_PER_MONTH[6]
    winter_daily = bedroom_main_hours.get(12, 0.0) / DAYS_PER_MONTH[12]

    return SunScoutResult(
        annual_peak_sun_hours=round(annual_peak, 1),
        summer_daily_hours=round(summer_daily, 1),
        winter_daily_hours=round(winter_daily, 1),
        seasonal_grid=seasonal_grid,
        sun_score=round(score, 1),
        verdict=verdict,
        window_hours=window_hours,
    )
