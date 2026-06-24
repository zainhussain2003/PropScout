"""
Mapbox geocoding for scraper workers — address → lat/lng.

Geocoding failures are non-fatal: the listing is stored without coordinates
and the comp query falls back to FSA matching (spec Section 11.2).
"""

import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
_REQUEST_TIMEOUT_SECONDS = 10


@dataclass
class GeocodeResult:
    """A geocoded location. ``postal_code`` is the Mapbox-resolved FSA+LDU, no space."""

    lat: float
    lng: float
    postal_code: str | None


def _postal_from_feature(feature: dict) -> str | None:
    """Pull the postcode out of a Mapbox feature's context (FSA+LDU, no space)."""
    for ctx in feature.get("context", []):
        if str(ctx.get("id", "")).startswith("postcode"):
            text = ctx.get("text")
            return text.replace(" ", "").upper() if text else None
    return None


async def geocode_address(address: str) -> GeocodeResult | None:
    """
    Geocode an address using the Mapbox Geocoding API.

    Returns lat/lng AND the resolved postal code — many source listings omit the
    postal code in their card markup, so the geocode response is the cheapest
    place to recover it (no extra request beyond this one).

    Args:
        address: Full address string, ideally including city and province.

    Returns:
        GeocodeResult, or None when the token is missing, the request fails, or
        no result is found. Never raises.
    """
    token = os.environ.get("MAPBOX_TOKEN")
    if not token:
        logger.warning("MAPBOX_TOKEN not set — storing listing without coordinates")
        return None

    url = _GEOCODE_URL.format(query=httpx.QueryParams({"q": address})["q"])
    params = {"access_token": token, "country": "ca", "limit": 1}

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception:
        logger.exception("Geocoding failed for address: %s", address)
        return None

    features = data.get("features") or []
    if not features:
        return None

    feature = features[0]
    lng, lat = feature["center"]
    return GeocodeResult(
        lat=float(lat), lng=float(lng), postal_code=_postal_from_feature(feature)
    )
