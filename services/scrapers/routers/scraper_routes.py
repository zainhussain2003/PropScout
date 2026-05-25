"""
FastAPI routes for the scraper service.

POST /scrape/listing   — trigger a listing scrape (Realtor.ca or Zillow.ca)
GET  /rentals/comps    — query rental comps within a radius for a given bed count

These routes are internal-use only at MVP — no auth required.
Authentication will be added before any public exposure.
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import query_rental_comps
from listing_type import is_realtor_ca_url, is_zillow_ca_url, is_us_zillow_url
from province import detect_province, is_ontario, province_gate_error
from rental_comps_scraper import calculate_percentiles

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / response models ──────────────────────────────────────────────────


class ScrapeListingRequest(BaseModel):
    """Body for POST /scrape/listing."""

    url: str  # Full listing URL — Realtor.ca or Zillow.ca


class ScrapeListingResponse(BaseModel):
    """Response for POST /scrape/listing."""

    scrape_status: str  # 'success' | 'partial' | 'failed'
    listing: dict[str, Any]  # All extracted listing fields
    province_supported: bool  # False when province != ON
    province_error: dict | None  # Set when province_supported is False


class RentalComp(BaseModel):
    """A single rental comp listing returned in the comps array."""

    address: str | None
    beds: int | None
    baths: float | None
    rent_monthly: float
    sqft: int | None
    scraped_at: str | None
    distance_km: float | None


class CompsResponse(BaseModel):
    """Response for GET /rentals/comps."""

    low: float  # P25 monthly rent
    mid: float  # P50 monthly rent
    high: float  # P75 monthly rent
    count: int  # Number of comps in the radius
    confidence: str  # 'high' | 'medium' | 'low'
    comps: list[RentalComp]  # Individual comp listings


# ── POST /scrape/listing ───────────────────────────────────────────────────────


@router.post("/scrape/listing", response_model=ScrapeListingResponse)
async def scrape_listing_route(body: ScrapeListingRequest) -> ScrapeListingResponse:
    """
    Trigger a listing scrape for the given URL.

    Automatically dispatches to the correct scraper based on the URL host.
    Applies the Ontario province gate — analysis does not run for non-ON listings.

    The route always returns a response (never 500s on scrape failures).
    When the scraper fails, scrape_status is 'failed' and the listing dict
    contains an 'error' field with a user-facing message.

    Args:
        body: Request body containing the listing URL.

    Returns:
        ScrapeListingResponse with the scraped listing data.
    """
    url = body.url.strip()

    if not url:
        raise HTTPException(status_code=422, detail="URL must not be empty.")

    # ── US Zillow guard ────────────────────────────────────────────────────────
    if is_us_zillow_url(url):
        return ScrapeListingResponse(
            scrape_status="failed",
            listing={
                "source_url": url,
                "error": (
                    "This looks like a US Zillow listing. "
                    "PropScout covers Canadian properties only."
                ),
            },
            province_supported=False,
            province_error=province_gate_error(None),
        )

    # ── Dispatch to the correct scraper ────────────────────────────────────────
    listing: dict[str, Any]

    if is_realtor_ca_url(url):
        from realtor_scraper import scrape_listing

        listing = await scrape_listing(url)

    elif is_zillow_ca_url(url):
        from zillow_scraper import scrape_listing

        listing = await scrape_listing(url)

    else:
        # Unrecognised source — cannot scrape
        return ScrapeListingResponse(
            scrape_status="failed",
            listing={
                "source_url": url,
                "error": (
                    "Unrecognised listing source. "
                    "PropScout currently supports Realtor.ca and Zillow.ca."
                ),
            },
            province_supported=False,
            province_error=None,
        )

    # ── Province gate ──────────────────────────────────────────────────────────
    postal_code = listing.get("postal_code")
    province = listing.get("province") or (
        detect_province(postal_code) if postal_code else None
    )

    province_ok = is_ontario(postal_code) if postal_code else False
    prov_error = None if province_ok else province_gate_error(province)

    return ScrapeListingResponse(
        scrape_status=listing.get("scrape_status", "failed"),
        listing=listing,
        province_supported=province_ok,
        province_error=prov_error,
    )


# ── GET /rentals/comps ─────────────────────────────────────────────────────────


@router.get("/rentals/comps", response_model=CompsResponse)
async def get_rental_comps(
    lat: float = Query(..., description="Centre latitude"),
    lng: float = Query(..., description="Centre longitude"),
    beds: int = Query(..., ge=0, description="Number of bedrooms to match"),
    radius_km: float = Query(1.0, gt=0, le=10, description="Search radius in km"),
    days_back: int = Query(90, gt=0, le=365, description="Days of history to include"),
) -> CompsResponse:
    """
    Return rental comp percentiles for a given location, bed count, and radius.

    Queries the rental_listings table for listings within the radius that match
    the bed count and were scraped within days_back days. Calculates P25/P50/P75.

    Confidence levels:
      - high:   10+ comps
      - medium: 4–9 comps
      - low:    1–3 comps
      - (0 comps → HTTP 404)

    Args:
        lat:       Centre latitude.
        lng:       Centre longitude.
        beds:      Bedroom count to match.
        radius_km: Radius in kilometres (default 1.0, max 10.0).
        days_back: Days of history (default 90, max 365).

    Returns:
        CompsResponse with P25/P50/P75 rents and individual comp listings.
    """
    import math

    rows = await query_rental_comps(lat, lng, beds, radius_km, days_back)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NO_COMPS",
                "message": (
                    f"No rental comps found within {radius_km} km "
                    f"for {beds} bedrooms in the last {days_back} days."
                ),
            },
        )

    rents = [float(r["rent_monthly"]) for r in rows if r.get("rent_monthly")]
    percentiles = calculate_percentiles(rents)

    # Determine confidence level
    count = percentiles["count"]
    if count >= 10:
        confidence = "high"
    elif count >= 4:
        confidence = "medium"
    else:
        confidence = "low"

    # Build comp list with distance
    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        r = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)
        a = math.sin(d_lat / 2) ** 2 + (
            math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lng / 2) ** 2
        )
        return round(2 * r * math.asin(math.sqrt(a)), 3)

    comps = [
        RentalComp(
            address=row.get("address"),
            beds=row.get("beds"),
            baths=row.get("baths"),
            rent_monthly=float(row["rent_monthly"]),
            sqft=row.get("sqft"),
            scraped_at=row.get("scraped_at"),
            distance_km=(
                haversine(lat, lng, float(row["lat"]), float(row["lng"]))
                if row.get("lat") and row.get("lng")
                else None
            ),
        )
        for row in rows
        if row.get("rent_monthly")
    ]

    return CompsResponse(
        low=percentiles["low"],
        mid=percentiles["mid"],
        high=percentiles["high"],
        count=count,
        confidence=confidence,
        comps=comps,
    )
