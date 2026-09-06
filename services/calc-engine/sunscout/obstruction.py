"""
Horizon obstruction from surrounding buildings — SunScout Phase 2 (spec §17).

The sun-path model in `sun_path.py` answers "where is the sun?". It cannot answer
"can this window actually see it?", so a ground-floor unit boxed in by towers
scores the same as a penthouse on the same coordinates. Downtown, that is the
difference between a bright unit and a dark one — the thing the score exists to
tell you.

## How it works

1. Ask OpenStreetMap (Overpass) for building footprints within `SEARCH_RADIUS_M`.
2. Turn each footprint into a set of (azimuth, obstruction altitude) samples:
   for every vertex, the compass bearing from the property and the vertical angle
   its roofline subtends, `atan2(building_height − observer_height, distance)`.
3. Reduce those to a **horizon profile** — one obstruction altitude per 1° of
   azimuth, taking the highest obstruction in each bin.
4. `is_blocked()` then answers, for any sun position, whether the sun is below the
   skyline in that direction.

## Why OpenStreetMap rather than Mapbox 3D

Spec §17 Phase 2 names Mapbox 3D tiles. OSM is the upstream source for those
tiles, and reading it directly avoids decoding vector tiles server-side for data
we would then have to re-derive. Measured coverage in Toronto (2026-09-06):

  downtown core   18 buildings, 13 with height/levels  (72%)
  Yonge–Dundas    37 buildings, 21 with height/levels  (56%)
  North York      49 buildings,  2 with height/levels  ( 4%)

The headline number understates it, because **coverage correlates with the
buildings that matter**. Towers are tagged (CN Tower 553m, Pantages 45 levels,
Rogers Centre 31); untagged ones are overwhelmingly detached houses that obstruct
almost nothing from any upper floor. A missing bungalow costs the model far less
than a missing tower would.

## What this deliberately does NOT do

- **No terrain.** Hills and valleys are ignored. Ontario's urban areas are flat
  enough that buildings dominate; this would matter in Vancouver or Calgary.
- **No trees.** Seasonal canopy is real and unmodelled — a summer-shaded window
  may score higher than it lives.
- **No reflected or diffuse light.** A "blocked" hour still has skylight; this
  measures *direct* sun only, which is what the score claims to measure.
- **Untagged buildings are skipped, not guessed.** Assuming a height for every
  untagged footprint would manufacture obstruction that may not exist. The result
  reports how many were skipped so the caller can qualify the number.
"""

from __future__ import annotations

import json
import math
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

# ── Tunables ──────────────────────────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Spec §17 Phase 2 says "within 100m". Widened to 150m: a 200m tower at 120m still
# subtends ~59°, which blocks most of a winter day and would otherwise be missed.
SEARCH_RADIUS_M = 150

# Metres per storey when only `building:levels` is tagged. 3.2m is a common
# residential floor-to-floor; commercial towers run taller, so this is
# conservative — it under-estimates obstruction rather than inventing it.
METRES_PER_LEVEL = 3.2

# Assumed floor-to-floor for converting a unit's floor number to eye height.
UNIT_FLOOR_HEIGHT_M = 3.0

# Horizon resolution. 1° is finer than the sun moves in 4 minutes, so it never
# limits accuracy.
AZIMUTH_BIN_DEG = 1
AZIMUTH_BINS = 360 // AZIMUTH_BIN_DEG

REQUEST_TIMEOUT_S = 25.0

EARTH_RADIUS_M = 6_371_000.0


@dataclass
class ObstructionProfile:
    """
    The skyline around a property, as seen from one observer height.

    Attributes:
        horizon_deg: 360 obstruction altitudes, one per degree of azimuth
            (index 0 = due north, 90 = east). 0.0 means clear sky.
        buildings_considered: footprints that had a usable height.
        buildings_skipped: footprints found but skipped for want of a height tag.
        observer_height_m: the height the profile was computed for.
        available: False when the data source could not be reached at all — the
            caller must then report "not assessed" rather than "no obstruction",
            which are very different claims.
    """

    horizon_deg: list[float] = field(default_factory=lambda: [0.0] * AZIMUTH_BINS)
    buildings_considered: int = 0
    buildings_skipped: int = 0
    observer_height_m: float = 0.0
    available: bool = True

    def obstruction_at(self, azimuth_deg: float) -> float:
        """
        Obstruction altitude in the given compass direction.

        Args:
            azimuth_deg: 0=N, 90=E, 180=S, 270=W. Wrapped into range.

        Returns:
            Altitude in degrees below which the sky is blocked; 0.0 when clear.
        """
        idx = int(azimuth_deg // AZIMUTH_BIN_DEG) % AZIMUTH_BINS
        return self.horizon_deg[idx]

    def is_blocked(self, azimuth_deg: float, altitude_deg: float) -> bool:
        """
        Whether a sun position is hidden behind the skyline.

        Args:
            azimuth_deg: sun azimuth (0=N, 90=E).
            altitude_deg: sun altitude above the horizon.

        Returns:
            True when a building stands higher than the sun in that direction.
        """
        if not self.available:
            return False
        return altitude_deg < self.obstruction_at(azimuth_deg)

    @property
    def openness(self) -> float:
        """
        Share of the sky dome left unobstructed, 0.0–1.0.

        A single summary number for the UI: 1.0 is open sky in every direction,
        0.5 means the average direction is blocked to 45°.
        """
        if not self.available:
            return 1.0
        blocked = sum(min(h, 90.0) for h in self.horizon_deg) / (90.0 * AZIMUTH_BINS)
        return max(0.0, 1.0 - blocked)


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres between two WGS84 points."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial compass bearing from point 1 to point 2, 0–360 (0 = north)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def building_height_m(tags: dict[str, str]) -> float | None:
    """
    Height of a building from its OSM tags, or None when untagged.

    Prefers an explicit `height` (metres); falls back to `building:levels`
    × METRES_PER_LEVEL. Returns None rather than guessing, so untagged
    footprints are skipped instead of inventing obstruction.

    Args:
        tags: the OSM tag dict for one building.

    Returns:
        Height in metres, or None.
    """
    raw = (tags.get("height") or "").strip()
    if raw:
        # Tags appear as "86", "86 m", "86.5"; strip anything non-numeric.
        cleaned = "".join(c for c in raw if c.isdigit() or c == ".")
        try:
            h = float(cleaned)
            if 0.0 < h < 1000.0:
                return h
        except ValueError:
            pass

    levels = (tags.get("building:levels") or "").strip()
    if levels:
        try:
            n = float(levels)
            if 0.0 < n < 250.0:
                return n * METRES_PER_LEVEL
        except ValueError:
            pass

    return None


def observer_height_for_floor(floor: int | None) -> float:
    """
    Eye height above ground for a unit on a given floor.

    Args:
        floor: storey number; 1 (or None) is ground level.

    Returns:
        Height in metres. Floor 1 sits at 1.5m — roughly window height, not the
        pavement — so a ground unit is not modelled as seeing from the kerb.
    """
    if floor is None or floor <= 1:
        return 1.5
    return (floor - 1) * UNIT_FLOOR_HEIGHT_M + 1.5


def _overpass_query(lat: float, lng: float, radius_m: int) -> str:
    """Overpass QL for building footprints with geometry near a point."""
    return (
        f"[out:json][timeout:{int(REQUEST_TIMEOUT_S)}];"
        f'way["building"](around:{radius_m},{lat},{lng});'
        f"out geom tags;"
    )


def fetch_nearby_buildings(
    lat: float, lng: float, radius_m: int = SEARCH_RADIUS_M
) -> list[dict] | None:
    """
    Building footprints near a point, from the Overpass API.

    Args:
        lat: property latitude.
        lng: property longitude.
        radius_m: search radius in metres.

    Returns:
        A list of Overpass `way` elements each carrying `geometry` and `tags`,
        or None when the service could not be reached. None and [] mean
        different things: "we don't know" versus "we looked and there is nothing".
    """
    body = urllib.parse.urlencode({"data": _overpass_query(lat, lng, radius_m)})
    request = urllib.request.Request(
        OVERPASS_URL,
        data=body.encode("utf-8"),
        headers={"User-Agent": "PropScout/1.0 (sunscout obstruction)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        # Overpass is a free community endpoint and rate-limits; a failure here is
        # expected occasionally and must not fail the whole analysis.
        return None

    return [e for e in payload.get("elements", []) if e.get("type") == "way"]


def build_profile(
    lat: float,
    lng: float,
    floor: int | None = None,
    buildings: list[dict] | None = None,
) -> ObstructionProfile:
    """
    Compute the horizon profile around a property.

    Args:
        lat: property latitude.
        lng: property longitude.
        floor: the unit's storey, if known — a 30th-floor unit clears most of
            what blocks the ground floor.
        buildings: pre-fetched Overpass elements. Fetched when omitted; pass them
            in from tests to keep the network out of it.

    Returns:
        An ObstructionProfile. `available` is False when the data source could
        not be reached.
    """
    observer_h = observer_height_for_floor(floor)

    if buildings is None:
        buildings = fetch_nearby_buildings(lat, lng)
        if buildings is None:
            return ObstructionProfile(
                observer_height_m=observer_h,
                available=False,
            )

    horizon = [0.0] * AZIMUTH_BINS
    considered = 0
    skipped = 0

    for element in buildings:
        height = building_height_m(element.get("tags") or {})
        if height is None:
            skipped += 1
            continue

        rise = height - observer_h
        if rise <= 0:
            # Entirely below the window — cannot block the sun for this unit.
            considered += 1
            continue

        considered += 1

        # A building is solid: it blocks the whole angular width it occupies, not
        # just the directions its corners happen to fall in. Sampling per-vertex
        # left gaps mid-wall — a downtown profile came back with due south "clear"
        # because no corner landed in those bins. So take the building's azimuth
        # span and fill all of it.
        samples: list[tuple[float, float]] = []
        for point in element.get("geometry") or []:
            plat, plon = point.get("lat"), point.get("lon")
            if plat is None or plon is None:
                continue
            distance = _haversine_m(lat, lng, plat, plon)
            if distance < 1.0:
                # Degenerate: the observer is inside this footprint. Its own
                # walls are not an obstruction to its own windows.
                continue
            samples.append(
                (
                    _bearing_deg(lat, lng, plat, plon),
                    math.degrees(math.atan2(rise, distance)),
                )
            )

        if not samples:
            continue

        # Fill edge by edge rather than across the footprint's overall min/max
        # bearing. Taking min/max breaks on any footprint that surrounds or abuts
        # the observer: the Eaton Centre, 28m away, spans bearings 0°–359°, and a
        # min/max span would black out the entire sky from one building. Walking
        # consecutive vertices keeps each arc small and handles concave and
        # enclosing shapes correctly.
        for i in range(len(samples) - 1):
            b1, a1 = samples[i]
            b2, a2 = samples[i + 1]
            angle = max(a1, a2)
            for idx in _arc_bins(b1, b2):
                if angle > horizon[idx]:
                    horizon[idx] = angle

    return ObstructionProfile(
        horizon_deg=horizon,
        buildings_considered=considered,
        buildings_skipped=skipped,
        observer_height_m=observer_h,
    )


def _arc_bins(bearing_a: float, bearing_b: float) -> list[int]:
    """
    Azimuth bins covered by one footprint edge.

    Always walks the **shorter** arc between the two bearings. A single edge of a
    building within the search radius cannot subtend more than 180°, so the short
    arc is the physical one; taking the long way round is what made an enclosing
    footprint appear to block the whole sky.

    Args:
        bearing_a: compass bearing to one end of the edge.
        bearing_b: compass bearing to the other end.

    Returns:
        Bin indices covered by the edge.
    """
    diff = (bearing_b - bearing_a + 540.0) % 360.0 - 180.0  # signed, −180..180

    # Always walk from the arc's start in the positive direction, so the result
    # depends on the edge's geometry rather than the order its vertices happen to
    # appear in the OSM way. Walking from whichever end was passed first put an
    # extra bin on one edge and dropped one from the other.
    start = bearing_a if diff >= 0 else bearing_b
    steps = int(abs(diff) // AZIMUTH_BIN_DEG) + 1

    bins: list[int] = []
    for k in range(steps + 1):
        bearing = start + k * AZIMUTH_BIN_DEG
        bins.append(int(bearing // AZIMUTH_BIN_DEG) % AZIMUTH_BINS)
    return bins


# ── Floor inference ───────────────────────────────────────────────────────────

# Unit numbers below this are treated as ground level rather than a floor prefix:
# "12" is suite 12, not floor 0.
_MIN_FLOOR_PREFIX_DIGITS = 3


def infer_floor_from_address(address: str) -> int | None:
    """
    Guess a unit's storey from a leading unit number, or None when unclear.

    Toronto condos overwhelmingly number units as `<floor><unit>`: 3705 is unit 05
    on floor 37, 229 is unit 29 on floor 2. Listings expose that number in the
    address ("229 - 701 SHEPPARD AVENUE W") but never the floor itself, and the
    floor is what decides whether a neighbouring tower matters.

    This is a **convention, not a rule** — some buildings number sequentially, and
    a few skip floors 4 and 13. It is therefore used only to refine an obstruction
    estimate, never to state a floor back to the user as fact.

    Args:
        address: full listing address, unit prefix included.

    Returns:
        Inferred storey, or None when there is no leading unit number or it is too
        short to carry a floor prefix.
    """
    head = address.strip().split("-")[0].strip() if "-" in address else ""
    if not head.isdigit():
        return None
    if len(head) < _MIN_FLOOR_PREFIX_DIGITS:
        # A one- or two-digit unit is a suite number on the ground floors, not a
        # floor prefix. Treating "12" as floor 0 would be worse than not guessing.
        return 1
    floor = int(head[:-2])
    if floor < 1 or floor > 100:
        return None
    return floor
