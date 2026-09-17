"""
Mapbox geocoding for scraper workers — address → lat/lng.

Geocoding failures are non-fatal: the listing is stored without coordinates
and the comp query falls back to FSA matching (spec Section 11.2).

A result Mapbox is not sure of is a failure too (D-119): asked for "South
Cedarbrae, Toronto" it used to answer with a midtown point at low relevance,
and that point became the comp's postal code. Callers pass the feature types
they will accept and a minimum relevance; anything else is None.
"""

import logging
import os
from dataclasses import dataclass

import httpx

from constants import GEOCODE_MIN_RELEVANCE

logger = logging.getLogger(__name__)

_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
_REQUEST_TIMEOUT_SECONDS = 10


@dataclass
class GeocodeResult:
    """A geocoded location. ``postal_code`` is the Mapbox-resolved FSA+LDU, no space."""

    lat: float
    lng: float
    postal_code: str | None
    # Mapbox's own confidence in the match, 0–1 (1 = every term matched).
    relevance: float = 1.0
    # The most specific feature type returned: address, neighborhood, place …
    place_type: str = ""
    # The house number of an address feature ("25" for 25 Cougar Court); "".
    address_number: str = ""


def _postal_from_feature(feature: dict) -> str | None:
    """Pull the postcode out of a Mapbox feature's context (FSA+LDU, no space)."""
    if str(feature.get("id", "")).startswith("postcode"):
        text = feature.get("text")
        return text.replace(" ", "").upper() if text else None
    for ctx in feature.get("context", []):
        if str(ctx.get("id", "")).startswith("postcode"):
            text = ctx.get("text")
            return text.replace(" ", "").upper() if text else None
    return None


def _to_result(feature: dict) -> GeocodeResult:
    lng, lat = feature["center"]
    place_types = feature.get("place_type") or []
    return GeocodeResult(
        lat=float(lat),
        lng=float(lng),
        postal_code=_postal_from_feature(feature),
        relevance=float(feature.get("relevance", 1.0)),
        place_type=str(place_types[0]) if place_types else "",
        address_number=str(feature.get("address") or ""),
    )


async def _request(query: str, params: dict[str, object]) -> list[dict]:
    """One geocoding call; the feature list, or [] on any failure. Never raises."""
    token = os.environ.get("MAPBOX_TOKEN")
    if not token:
        logger.warning("MAPBOX_TOKEN not set — storing listing without coordinates")
        return []
    url = _GEOCODE_URL.format(query=httpx.QueryParams({"q": query})["q"])
    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(
                url, params={"access_token": token, "country": "ca", **params}
            )
            response.raise_for_status()
            data = response.json()
    except Exception:
        logger.exception("Geocoding failed for query: %s", query)
        return []
    return data.get("features") or []


async def geocode_address(
    address: str,
    *,
    types: str | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    proximity: tuple[float, float] | None = None,
    min_relevance: float = GEOCODE_MIN_RELEVANCE,
) -> GeocodeResult | None:
    """
    Geocode an address using the Mapbox Geocoding API.

    Returns lat/lng AND the resolved postal code — many source listings omit the
    postal code in their card markup, so the geocode response is the cheapest
    place to recover it (no extra request beyond this one).

    Args:
        address: Full address string, ideally including city and province.
        types: Comma-separated Mapbox feature types to accept (e.g.
            ``"neighborhood,locality"``); None accepts any.
        bbox: (min_lng, min_lat, max_lng, max_lat) the result must fall in.
        proximity: (lng, lat) to prefer results near — the neighbourhood a
            street name is ambiguous across.
        min_relevance: Below this Mapbox confidence the match is discarded
            (D-119) — a low-relevance point is a guess, and a guessed postal
            code puts the comp in the wrong market.

    Returns:
        GeocodeResult, or None when the token is missing, the request fails,
        no result is found, or the best result is below ``min_relevance``.
        Never raises.
    """
    params: dict[str, object] = {"limit": 1}
    if types:
        params["types"] = types
    if bbox:
        params["bbox"] = ",".join(str(v) for v in bbox)
    if proximity:
        params["proximity"] = f"{proximity[0]},{proximity[1]}"
    features = await _request(address, params)
    if not features:
        return None
    result = _to_result(features[0])
    if result.relevance < min_relevance:
        logger.info(
            "Geocode below relevance %.2f for %r (%.2f, %s) — discarded",
            min_relevance,
            address,
            result.relevance,
            result.place_type,
        )
        return None
    return result


async def reverse_postal_code(lat: float, lng: float) -> str | None:
    """
    The postal code at a point (reverse geocode, ``types=postcode``).

    Used once per neighbourhood centroid when a listing is placed by its
    neighbourhood rather than a street address (D-119).

    Returns:
        FSA+LDU with no space, or None. Never raises.
    """
    features = await _request(f"{lng},{lat}", {"types": "postcode", "limit": 1})
    if not features:
        return None
    return _postal_from_feature(features[0])
