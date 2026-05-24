"""
Walk Score API service for the calc engine.
Coordinates are obtained from Mapbox geocoding (via the Fastify API).
"""

import os
import httpx


async def get_walk_score(address: str, lat: float, lng: float) -> dict[str, object] | None:
    """
    Fetch Walk Score, Transit Score, and Bike Score for a property.

    Args:
        address: Full property address.
        lat: Property latitude.
        lng: Property longitude.

    Returns:
        Dict with walk_score, transit_score, bike_score, description.
        Returns None if the API call fails.
    """
    api_key = os.environ.get('WALKSCORE_API_KEY')
    if not api_key:
        return None

    url = (
        f"https://api.walkscore.com/score"
        f"?format=json"
        f"&address={httpx.URL(address)}"
        f"&lat={lat}"
        f"&lon={lng}"
        f"&transit=1"
        f"&bike=1"
        f"&wsapikey={api_key}"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return {
                'walk_score': data.get('walkscore', 0),
                'transit_score': data.get('transit', {}).get('score', 0),
                'bike_score': data.get('bike', {}).get('score', 0),
                'description': data.get('description', ''),
            }
    except Exception:
        return None
