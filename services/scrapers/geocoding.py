"""
Where a scraped rental is — the rules for turning what a source gave us into
lat/lng and a postal code (D-119).

rentals.ca and PadMapper give a street address, and Mapbox places those well.
Kijiji gives a title and a location — "Bendale-Glen Andrew, City of Toronto"
— and the pipeline used to geocode the whole string. Mapbox does not know
most Toronto neighbourhood names; it answered with the nearest thing it could
match, often a midtown point, and that point's postal code filed a Scarborough
house in M4S, where it became a "comp" for Forest Hill.

Kijiji rows are now placed in this order:

  1. a postal code in the text                → the address, geocoded as one
  2. a street address in the title            → that address, accepted when
                                                Mapbox returns an address with
                                                the same house number, biased
                                                toward the neighbourhood when
                                                one is known
  3. a City of Toronto neighbourhood name     → its centroid, no Mapbox call
  4. any other neighbourhood name             → Mapbox, neighbourhood types only,
                                                inside the Toronto box, above the
                                                relevance floor
  5. nothing locatable                        → no coordinates, no postal code

A row that reaches 5 is left out of the comps rather than filed somewhere
wrong. Every Mapbox result, for every source, is discarded below the
relevance floor.

Pure helpers on top; the two async functions at the bottom do the calls.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from constants import (
    GEOCODE_NEIGHBOURHOOD_MIN_RELEVANCE,
    GEOCODE_STREET_MIN_RELEVANCE,
    GTA_BBOX,
    KIJIJI_CITY_LABELS,
    TORONTO_BBOX,
    TORONTO_NEIGHBOURHOODS_FILE,
)
from normalization import CleanRentalListing, is_ontario_postal_code
from services import mapbox_service
from services.mapbox_service import GeocodeResult

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NeighbourhoodPoint:
    """A City of Toronto neighbourhood's centroid and the postal code there."""

    name: str
    lat: float
    lng: float
    postal_code: str | None


@dataclass(frozen=True)
class Placement:
    """Where a listing was put and how."""

    lat: float
    lng: float
    postal_code: str | None
    # address | street_in_title | neighbourhood_table | neighbourhood_geocode
    method: str


# ── The neighbourhood table ───────────────────────────────────────────────────


def _normalise(name: str) -> str:
    """Lower-case, drop a leading 'the', treat & - / and spaces alike."""
    s = name.strip().lower()
    if s.startswith("the "):
        s = s[4:]
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9']+", " ", s)
    s = re.sub(r"\band\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _load_table() -> (
    tuple[
        dict[str, NeighbourhoodPoint], list[tuple[frozenset[str], NeighbourhoodPoint]]
    ]
):
    path = Path(__file__).parent / TORONTO_NEIGHBOURHOODS_FILE
    data = json.loads(path.read_text(encoding="utf-8"))
    exact: dict[str, NeighbourhoodPoint] = {}
    tokens: list[tuple[frozenset[str], NeighbourhoodPoint]] = []
    for row in data["neighbourhoods"]:
        point = NeighbourhoodPoint(
            name=row["name"],
            lat=float(row["lat"]),
            lng=float(row["lng"]),
            postal_code=row.get("postal_code"),
        )
        key = _normalise(row["name"])
        exact.setdefault(key, point)
        tokens.append((frozenset(key.split()), point))
    return exact, tokens


_EXACT, _TOKENS = _load_table()


def match_toronto_neighbourhood(name: str) -> NeighbourhoodPoint | None:
    """
    The City of Toronto neighbourhood a Kijiji location name refers to.

    Exact after normalisation ("The Annex" → Annex, "Church & Wellesley" →
    Church-Wellesley); otherwise the one table name that contains every word
    of the query ("Clairlea" → Clairlea-Birchmount). Two candidates is no
    match — "Willowdale" alone could be either half of Willowdale East / West.

    Args:
        name: The neighbourhood text from the ad's location.

    Returns:
        The neighbourhood's point, or None.
    """
    key = _normalise(name)
    if not key:
        return None
    if key in _EXACT:
        return _EXACT[key]
    words = frozenset(key.split())
    if not words:
        return None
    candidates = [point for toks, point in _TOKENS if words <= toks]
    if len(candidates) == 1:
        return candidates[0]
    return None


# ── Reading a Kijiji row ──────────────────────────────────────────────────────

_STREET_RE = re.compile(
    r"\b\d{1,5}[a-z]?\s+(?:[A-Za-z'.-]+\s+){0,4}"
    r"(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|court|ct|crescent|cres|"
    r"lane|ln|way|place|pl|trail|terrace|circle|cir|parkway|pkwy|gardens|gdns|square|sq)"
    r"\b\.?(?:\s+(?:east|west|north|south|e|w|n|s))?\b",
    re.IGNORECASE,
)


_TITLE_NEIGHBOURHOOD_RE = re.compile(r"Toronto\s*\(([^)]+)\)", re.IGNORECASE)


def neighbourhood_in_title(title: str) -> str | None:
    """
    The neighbourhood a syndicated title names — "… 15 WINDERMERE AVENUE
    Toronto (High Park-Swansea), Ontario" — or None. Ads fed from listing
    services carry this even when the card's location says only the city.
    """
    m = _TITLE_NEIGHBOURHOOD_RE.search(title)
    return m.group(1).strip() if m else None


def street_address_in(text: str) -> str | None:
    """
    A street address inside free text — "… 155 Wellesley Street East …" —
    or None. Number, up to four name words, a street type, an optional
    direction. Ad titles carry these often enough to be worth placing exactly.
    """
    m = _STREET_RE.search(text)
    return m.group(0).strip() if m else None


def kijiji_location(listing: CleanRentalListing) -> tuple[str | None, str | None]:
    """
    (neighbourhood, city) for a Kijiji row.

    New rows carry the card's location in ``raw_json["location"]``. Older rows
    stored only ``address = "<title>, <location>"``, so the location is read
    back as the last two comma segments when the last is a Toronto city label
    — titles contain commas, so nothing further in is trusted.

    Returns:
        (neighbourhood, city), either None when the row does not say.
    """
    raw = listing.raw_json if isinstance(listing.raw_json, dict) else {}
    location = raw.get("location")
    if isinstance(location, str) and location.strip():
        parts = [p.strip() for p in location.split(",") if p.strip()]
    else:
        parts = [p.strip() for p in listing.address.split(",") if p.strip()]
    if not parts:
        return None, None
    city = parts[-1]
    if city.lower() not in KIJIJI_CITY_LABELS:
        return None, city
    if len(parts) < 2:
        return None, city
    neighbourhood = parts[-2]
    # A title that ended with a truncated "…, Ontario" leaves "Ontari" / "Ont"
    # as the segment before the city; that is not a neighbourhood.
    if "ontario".startswith(neighbourhood.lower()) or _looks_like_title(neighbourhood):
        return None, city
    return neighbourhood, city


def _looks_like_title(segment: str) -> bool:
    """Ad copy, not a place: digits, 'for rent', 'bedroom', 'apartment' …"""
    s = segment.lower()
    if any(ch.isdigit() for ch in s):
        return True
    return any(
        w in s for w in ("for rent", "bedroom", "bdrm", "apartment", "available", "!")
    )


# ── Placing a listing ─────────────────────────────────────────────────────────


async def place_kijiji(
    listing: CleanRentalListing,
    cache: dict[str, Placement | None],
) -> Placement | None:
    """
    Place a Kijiji listing by the rules in the module docstring.

    Args:
        listing: A normalised Kijiji row (its address is ``title, location``).
        cache: Neighbourhood name → placement, shared across one run so a name
            seen on many ads costs one Mapbox call at most.

    Returns:
        The placement, or None when nothing on the ad locates it.
    """
    raw = listing.raw_json if isinstance(listing.raw_json, dict) else {}
    title = str(raw.get("title") or listing.address)

    # 1. A postal code in the text: the address as a whole is locatable.
    if listing.postal_code is not None:
        geo = await mapbox_service.geocode_address(listing.address)
        if geo is not None:
            return Placement(
                geo.lat, geo.lng, geo.postal_code or listing.postal_code, "address"
            )

    neighbourhood, _city = kijiji_location(listing)
    if neighbourhood is None:
        neighbourhood = neighbourhood_in_title(title)
    point = match_toronto_neighbourhood(neighbourhood) if neighbourhood else None

    # 2. A street address in the title. Toronto has a Dale Avenue in Rosedale
    # and one in Guildwood; the neighbourhood, when known, says which. The
    # answer must be an address feature with the same house number.
    street = street_address_in(title)
    if street is not None:
        geo = await mapbox_service.geocode_address(
            f"{street}, Toronto, Ontario",
            types="address",
            bbox=GTA_BBOX,
            proximity=(point.lng, point.lat) if point else None,
            min_relevance=GEOCODE_STREET_MIN_RELEVANCE,
        )
        if (
            geo is not None
            and geo.address_number == street.split()[0]
            and is_ontario_postal_code(geo.postal_code)
        ):
            return Placement(geo.lat, geo.lng, geo.postal_code, "street_in_title")

    if neighbourhood is None:
        return None

    # 3. The City's own table — no call.
    if point is not None:
        return Placement(point.lat, point.lng, point.postal_code, "neighbourhood_table")

    # 4. Mapbox, as a neighbourhood only, inside Toronto.
    key = _normalise(neighbourhood)
    if key in cache:
        return cache[key]
    placement = await _geocode_neighbourhood(neighbourhood)
    cache[key] = placement
    return placement


async def _geocode_neighbourhood(neighbourhood: str) -> Placement | None:
    geo: GeocodeResult | None = await mapbox_service.geocode_address(
        f"{neighbourhood}, Toronto, Ontario",
        types="neighborhood,locality",
        bbox=TORONTO_BBOX,
        min_relevance=GEOCODE_NEIGHBOURHOOD_MIN_RELEVANCE,
    )
    if geo is None:
        return None
    postal = geo.postal_code
    if not is_ontario_postal_code(postal):
        postal = await mapbox_service.reverse_postal_code(geo.lat, geo.lng)
    if not is_ontario_postal_code(postal):
        postal = None
    return Placement(geo.lat, geo.lng, postal, "neighbourhood_geocode")


async def place_listing(
    listing: CleanRentalListing,
    cache: dict[str, Placement | None],
) -> Placement | None:
    """
    Place any source's listing: Kijiji by its rules, everything else by its
    street address through Mapbox (relevance-gated).
    """
    if listing.source == "kijiji":
        return await place_kijiji(listing, cache)
    geo = await mapbox_service.geocode_address(listing.address)
    if geo is None:
        return None
    return Placement(geo.lat, geo.lng, geo.postal_code, "address")
