"""
Supabase client and database write functions for the scraper service.

All database writes go through this module — never call Supabase directly
from a scraper file. The service role key is backend-only and never exposed
to the frontend.

Environment variables required:
  SUPABASE_URL              — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY — Service role key (full DB access, backend-only)
"""

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from supabase import AClient as AsyncClient, acreate_client

logger = logging.getLogger(__name__)

# Module-level client (created on first use via _get_client())
_client: AsyncClient | None = None


async def _get_client() -> AsyncClient:
    """
    Return a cached async Supabase client, creating it on first call.

    Returns:
        Initialised async Supabase client.

    Raises:
        RuntimeError: If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set.
    """
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
            )
        _client = await acreate_client(url, key)
    return _client


# ── Listing writes ─────────────────────────────────────────────────────────────


async def get_listing_by_url(source_url: str) -> dict[str, Any] | None:
    """
    Return the listings row for a given source_url, or None if not found.

    Uses maybe_single() so the call succeeds even when no row exists.
    Used by the cache layer in scraper_routes to avoid redundant re-scrapes.

    Args:
        source_url: Full listing URL (the unique conflict key).

    Returns:
        The row dict, or None if not found or on error.
    """
    try:
        client = await _get_client()
        response = await (
            client.table("listings")
            .select("*")
            .eq("source_url", source_url)
            .maybe_single()
            .execute()
        )
        return response.data  # None when no row exists
    except Exception as exc:
        logger.error("get_listing_by_url failed: %s", exc)
        return None


async def upsert_listing(listing: dict[str, Any]) -> dict[str, Any] | None:
    """
    Insert or update a listing record in the listings table.

    Uses source_url as the conflict target — re-scraping the same URL
    updates the existing row rather than creating a duplicate.

    Args:
        listing: Dict conforming to the listings table schema.
                 Must include 'source_url', 'source', and 'listing_type'.

    Returns:
        The upserted record as returned by Supabase, or None on error.
    """
    try:
        client = await _get_client()
        response = await (
            client.table("listings").upsert(listing, on_conflict="source_url").execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as exc:
        logger.error("upsert_listing failed: %s", exc)
        return None


async def upsert_rental_listing(listing: dict[str, Any]) -> dict[str, Any] | None:
    """
    Insert or update a rental listing record in the rental_listings table.

    Uses dedup_hash as the conflict target — the same listing appearing on
    multiple sources within 7 days produces a single record.

    Args:
        listing: Dict conforming to the rental_listings table schema.
                 Must include 'dedup_hash', 'source', and 'rent_monthly'.

    Returns:
        The upserted record, or None on error.
    """
    try:
        client = await _get_client()
        response = await (
            client.table("rental_listings")
            .upsert(listing, on_conflict="dedup_hash")
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as exc:
        logger.error("upsert_rental_listing failed: %s", exc)
        return None


# ── Scrape log writes ──────────────────────────────────────────────────────────


async def log_scrape(
    source: str,
    url: str,
    status: str,
    http_status: int | None = None,
    error_msg: str | None = None,
    duration_ms: int | None = None,
) -> None:
    """
    Write a scrape audit record to scrape_logs.

    This is a best-effort write — failures are logged but never raise.

    Args:
        source:      Source identifier, e.g. "realtor_ca".
        url:         Full URL that was scraped.
        status:      'success', 'partial', or 'failed'.
        http_status: HTTP response code, or None if the request never completed.
        error_msg:   Internal error string — not shown to users.
        duration_ms: Total request duration in milliseconds.
    """
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "url": url,
        "status": status,
        "http_status": http_status,
        "error_msg": error_msg,
        "duration_ms": duration_ms,
    }
    try:
        client = await _get_client()
        await client.table("scrape_logs").insert(record).execute()
    except Exception as exc:
        logger.warning("log_scrape write failed (non-fatal): %s", exc)


# ── Rental comps query ─────────────────────────────────────────────────────────


async def query_rental_comps(
    lat: float,
    lng: float,
    beds: int,
    radius_km: float = 1.0,
    days_back: int = 90,
) -> list[dict[str, Any]]:
    """
    Return rental listings within a radius matching the given bed count.

    Uses a lat/lng bounding box to pre-filter in Postgres, then applies
    exact Haversine distance filtering in Python. This avoids a PostGIS
    dependency while keeping the query efficient.

    Args:
        lat:       Centre latitude.
        lng:       Centre longitude.
        beds:      Number of bedrooms to match exactly.
        radius_km: Search radius in kilometres. Defaults to 1.0 km.
        days_back: How many days of listings to include. Defaults to 90 days.

    Returns:
        List of rental listing dicts within the radius, sorted by rent_monthly.
    """
    import math

    # 1 degree of latitude ≈ 111.0 km
    lat_delta = radius_km / 111.0
    # 1 degree of longitude varies with latitude
    lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))

    lat_min = lat - lat_delta
    lat_max = lat + lat_delta
    lng_min = lng - lng_delta
    lng_max = lng + lng_delta

    cutoff_iso = datetime.fromtimestamp(
        time.time() - days_back * 86_400, tz=timezone.utc
    ).isoformat()

    try:
        client = await _get_client()
        response = await (
            client.table("rental_listings")
            .select("*")
            .eq("beds", beds)
            .gte("lat", lat_min)
            .lte("lat", lat_max)
            .gte("lng", lng_min)
            .lte("lng", lng_max)
            .gte("scraped_at", cutoff_iso)
            .execute()
        )
        rows: list[dict[str, Any]] = response.data or []
    except Exception as exc:
        logger.error("query_rental_comps failed: %s", exc)
        return []

    # Exact Haversine distance filter
    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Return great-circle distance in kilometres."""
        r = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)
        a = math.sin(d_lat / 2) ** 2 + (
            math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lng / 2) ** 2
        )
        return 2 * r * math.asin(math.sqrt(a))

    within_radius = [
        row
        for row in rows
        if row.get("lat") is not None
        and row.get("lng") is not None
        and haversine(lat, lng, float(row["lat"]), float(row["lng"])) <= radius_km
    ]

    return sorted(within_radius, key=lambda r: r.get("rent_monthly", 0))
