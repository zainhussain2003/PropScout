"""
Unit tests for sunscout/obstruction.py.

Geometry is checked against hand-computed angles rather than golden values, so a
regression shows up as "the trigonometry is wrong" rather than "the number moved".
The network is never touched: every test passes `buildings` in directly.
"""

import math

import pytest

from sunscout.obstruction import (
    AZIMUTH_BINS,
    METRES_PER_LEVEL,
    ObstructionProfile,
    _arc_bins,
    _bearing_deg,
    _haversine_m,
    build_profile,
    building_height_m,
    observer_height_for_floor,
)

# Property under test — an arbitrary Toronto coordinate.
LAT, LNG = 43.6544, -79.3807

# Metres per degree at this latitude, used to place test buildings precisely.
M_PER_DEG_LAT = 111_132.0
M_PER_DEG_LNG = 111_320.0 * math.cos(math.radians(LAT))


def building_at(
    bearing_deg: float,
    distance_m: float,
    *,
    height_m: float | None = None,
    levels: int | None = None,
    width_m: float = 20.0,
) -> dict:
    """
    A square-ish footprint centred `distance_m` away on the given bearing.

    Args:
        bearing_deg: compass direction from the property (0=N, 90=E).
        distance_m: distance to the near face.
        height_m: explicit height tag, in metres.
        levels: building:levels tag, used when height_m is None.
        width_m: how wide the footprint is, across the line of sight.

    Returns:
        An Overpass-shaped `way` element.
    """
    rad = math.radians(bearing_deg)
    cx = LNG + (distance_m * math.sin(rad)) / M_PER_DEG_LNG
    cy = LAT + (distance_m * math.cos(rad)) / M_PER_DEG_LAT
    # Offset perpendicular to the line of sight to give the footprint width.
    perp = math.radians(bearing_deg + 90.0)
    dx = (width_m / 2 * math.sin(perp)) / M_PER_DEG_LNG
    dy = (width_m / 2 * math.cos(perp)) / M_PER_DEG_LAT

    tags: dict[str, str] = {"building": "yes"}
    if height_m is not None:
        tags["height"] = str(height_m)
    if levels is not None:
        tags["building:levels"] = str(levels)

    return {
        "type": "way",
        "tags": tags,
        "geometry": [
            {"lat": cy - dy, "lon": cx - dx},
            {"lat": cy + dy, "lon": cx + dx},
        ],
    }


# ── building_height_m ─────────────────────────────────────────────────────────


def test_height_tag_is_preferred_over_levels() -> None:
    assert building_height_m({"height": "86", "building:levels": "10"}) == 86.0


def test_height_tag_tolerates_units() -> None:
    assert building_height_m({"height": "86 m"}) == 86.0


def test_levels_are_converted_with_the_documented_storey_height() -> None:
    assert building_height_m({"building:levels": "10"}) == 10 * METRES_PER_LEVEL


def test_untagged_building_returns_none_rather_than_a_guess() -> None:
    # Guessing a height for every untagged footprint would manufacture
    # obstruction that may not exist.
    assert building_height_m({"building": "yes"}) is None
    assert building_height_m({}) is None


def test_absurd_values_are_rejected() -> None:
    assert building_height_m({"height": "0"}) is None
    assert building_height_m({"height": "5000"}) is None
    assert building_height_m({"building:levels": "not-a-number"}) is None


# ── observer height ───────────────────────────────────────────────────────────


def test_ground_floor_observer_is_at_window_height_not_the_kerb() -> None:
    assert observer_height_for_floor(1) == 1.5
    assert observer_height_for_floor(None) == 1.5


def test_upper_floors_rise_by_storey() -> None:
    assert observer_height_for_floor(11) == pytest.approx(1.5 + 10 * 3.0)


# ── geometry helpers ──────────────────────────────────────────────────────────


def test_bearing_cardinal_directions() -> None:
    assert _bearing_deg(LAT, LNG, LAT + 0.01, LNG) == pytest.approx(0.0, abs=0.5)
    assert _bearing_deg(LAT, LNG, LAT, LNG + 0.01) == pytest.approx(90.0, abs=0.5)
    assert _bearing_deg(LAT, LNG, LAT - 0.01, LNG) == pytest.approx(180.0, abs=0.5)


def test_haversine_matches_a_known_offset() -> None:
    d = _haversine_m(LAT, LNG, LAT + 1 / M_PER_DEG_LAT * 100, LNG)
    assert d == pytest.approx(100.0, abs=1.0)


def test_arc_bins_takes_the_short_way_across_north() -> None:
    # 350° → 010° is 20° apart, not 340. Taking the long arc is what made a
    # footprint surrounding the observer black out the entire sky.
    bins = _arc_bins(350.0, 10.0)
    assert len(bins) <= 22
    assert 0 in bins and 355 in bins and 5 in bins
    assert 180 not in bins


def test_arc_bins_is_direction_agnostic() -> None:
    assert set(_arc_bins(10.0, 350.0)) == set(_arc_bins(350.0, 10.0))


# ── build_profile ─────────────────────────────────────────────────────────────


def test_a_tower_due_east_blocks_the_computed_angle() -> None:
    # 100m tall, 100m away, observer 1.5m → atan(98.5/100) ≈ 44.6°
    profile = build_profile(
        LAT, LNG, floor=1, buildings=[building_at(90, 100, height_m=100)]
    )
    expected = math.degrees(math.atan2(100 - 1.5, 100))
    assert profile.obstruction_at(90) == pytest.approx(expected, abs=1.5)


def test_the_same_tower_blocks_less_from_a_high_floor() -> None:
    # This is the whole point of the feature: a penthouse and a ground unit at
    # the same coordinates must not score the same.
    b = [building_at(90, 100, height_m=100)]
    ground = build_profile(LAT, LNG, floor=1, buildings=b).obstruction_at(90)
    high = build_profile(LAT, LNG, floor=30, buildings=b).obstruction_at(90)
    assert high < ground


def test_a_building_shorter_than_the_observer_blocks_nothing() -> None:
    profile = build_profile(
        LAT, LNG, floor=30, buildings=[building_at(90, 50, height_m=10)]
    )
    assert max(profile.horizon_deg) == 0.0


def test_directions_with_no_building_stay_clear() -> None:
    profile = build_profile(
        LAT, LNG, floor=1, buildings=[building_at(90, 100, height_m=100)]
    )
    assert profile.obstruction_at(270) == 0.0


def test_untagged_buildings_are_counted_as_skipped_not_used() -> None:
    profile = build_profile(
        LAT,
        LNG,
        floor=1,
        buildings=[building_at(90, 100, height_m=100), building_at(180, 60)],
    )
    assert profile.buildings_considered == 1
    assert profile.buildings_skipped == 1
    # The untagged one must not obstruct — that would be inventing a building.
    assert profile.obstruction_at(180) == 0.0


def test_is_blocked_compares_sun_altitude_against_the_skyline() -> None:
    profile = build_profile(
        LAT, LNG, floor=1, buildings=[building_at(90, 100, height_m=100)]
    )
    assert profile.is_blocked(90, 20.0) is True  # low winter sun, behind the tower
    assert profile.is_blocked(90, 80.0) is False  # high summer sun, above it
    assert profile.is_blocked(270, 5.0) is False  # nothing to the west


def test_openness_falls_as_obstruction_rises() -> None:
    clear = build_profile(LAT, LNG, floor=1, buildings=[])
    boxed = build_profile(
        LAT,
        LNG,
        floor=1,
        buildings=[
            building_at(b, 40, height_m=120, width_m=60) for b in range(0, 360, 30)
        ],
    )
    assert clear.openness == pytest.approx(1.0)
    assert boxed.openness < 0.6


def test_levels_only_tagging_still_produces_obstruction() -> None:
    profile = build_profile(
        LAT, LNG, floor=1, buildings=[building_at(90, 100, levels=30)]
    )
    assert profile.obstruction_at(90) > 30.0


# ── unavailable source ────────────────────────────────────────────────────────


def test_unavailable_profile_never_reports_blockage() -> None:
    # "We couldn't check" must not be reported as "nothing is in the way" in the
    # score. The caller decides how to present it; is_blocked stays False so an
    # outage cannot silently deduct hours.
    profile = ObstructionProfile(available=False)
    assert profile.is_blocked(90, 1.0) is False
    assert profile.openness == 1.0


def test_profile_has_one_bin_per_degree() -> None:
    assert len(ObstructionProfile().horizon_deg) == AZIMUTH_BINS == 360
