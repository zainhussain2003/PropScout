"""
Mapbox geocoding for scraper workers — address → lat/lng.

Geocoding failures are non-fatal: the listing is stored without coordinates
and the comp query falls back to FSA matching (spec Section 11.2).
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
_REQUEST_TIMEOUT_SECONDS = 10


async def geocode_address(address: str) -> tuple[float, float] | None:
    """
    Geocode an address to (lat, lng) using the Mapbox Geocoding API.

    Args:
        address: Full address string, ideally including city and postal code.

    Returns:
        (lat, lng) tuple, or None when the token is missing, the request
        fails, or no result is found. Never raises.
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

    lng, lat = features[0]["center"]
    return (float(lat), float(lng))
