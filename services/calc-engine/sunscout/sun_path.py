"""
SunScout — solar exposure calculation using pvlib + NREL SPA.
Spec Section 17 (TEMPLATE CODE).

Runs locally — no external API call required.
pvlib uses NREL's Solar Position Algorithm (SPA) implementation.

Weights and benchmarks are starting assumptions — update spec when adjusted.
"""

# TODO: Implement SunScout calculation.
# See spec Section 17 for: weights, benchmark hours, seasonal grid (Dec/Mar/Jun/Sep),
# and the SVG arc visualization data format expected by the frontend.

from dataclasses import dataclass


@dataclass
class SunScoutResult:
    """Sun path analysis result for a property location."""
    annual_peak_sun_hours: float
    summer_daily_hours: float           # June solstice
    winter_daily_hours: float           # December solstice
    seasonal_grid: dict[str, float]     # Dec, Mar, Jun, Sep daily hours
    sun_score: float                    # 0–100
    verdict: str                        # 'excellent' | 'good' | 'fair' | 'poor'


def calculate_sun_hours(
    lat: float,
    lng: float,
    azimuth_deg: float | None = None,
) -> SunScoutResult:
    """
    Calculate peak sun hours and seasonal solar exposure for a property.

    Args:
        lat: Property latitude.
        lng: Property longitude.
        azimuth_deg: Building facade azimuth in degrees (0 = north, 180 = south).
                     None means unobstructed / unknown orientation.

    Returns:
        SunScoutResult with annual and seasonal sun hour data.
    """
    raise NotImplementedError("SunScout: implement using pvlib — see spec Section 17")
