"""
Supabase storage for scraper workers — all database reads and writes for the
rental comps pipeline go through this file (service-layer rule, CLAUDE.md §3).

Uses the service role key — these workers run server-side on Railway only.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

from supabase import Client, create_client

from constants import DEDUPE_WINDOW_DAYS
from normalization import CleanRentalListing

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    """
    Lazily create the Supabase client from environment variables.

    Returns:
        Configured Supabase client (service role).

    Raises:
        RuntimeError: if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.
    """
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = create_client(url, key)
    return _client


def fetch_recent_dedupe_keys() -> list[tuple[str, int, int | None]]:
    """
    Fetch identity keys for rental listings scraped within the dedupe window.

    Returns:
        List of (address, rent_monthly, beds) tuples for rows with scraped_at
        in the last DEDUPE_WINDOW_DAYS. Empty list on query failure — the run
        continues and the unique index risk is accepted over losing a night.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=DEDUPE_WINDOW_DAYS)
    try:
        response = (
            get_client()
            .table("rental_listings")
            .select("address, rent_monthly, beds")
            .gte("scraped_at", cutoff.isoformat())
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch dedupe keys — continuing without them")
        return []

    return [
        (row["address"], row["rent_monthly"], row.get("beds")) for row in response.data
    ]


def insert_rental_listings(listings: list[CleanRentalListing]) -> int:
    """
    Upsert normalised rental listings into rental_listings, keyed on source_url.

    source_url is the row identity: a re-scraped listing UPDATES its existing row
    in place (backfilling beds / postal / rent and refreshing scraped_at as
    last-seen) rather than appending a duplicate. Genuinely-new listings insert.
    Requires the unique index on rental_listings(source_url); without it the call
    fails fast on the conflict target before any row is written (no half-write).

    The batch is de-duplicated by source_url first: a single ON CONFLICT statement
    cannot touch the same conflict key twice ("cannot affect row a second time"),
    so duplicate URLs in one scrape (e.g. an over-broad card selector) are
    collapsed, keeping the first occurrence.

    Args:
        listings: Deduped, normalised listings to store.

    Returns:
        Number of rows upserted (updated + inserted), or 0 on failure.
    """
    if not listings:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    rows: list[dict[str, object]] = []
    seen_urls: set[str] = set()
    for item in listings:
        if item.source_url in seen_urls:
            continue  # collapse in-batch duplicate conflict keys
        seen_urls.add(item.source_url)
        rows.append(
            {
                "source": item.source,
                "source_url": item.source_url,
                "address": item.address,
                "postal_code": item.postal_code,
                "lat": item.lat,
                "lng": item.lng,
                "beds": item.beds,
                "baths": item.baths,
                "rent_monthly": item.rent_monthly,
                "sqft": item.sqft,
                "listed_at": item.listed_at.isoformat() if item.listed_at else None,
                "is_active": True,
                "scraped_at": now,  # last-seen; only defaults on insert otherwise
                "raw_json": item.raw_json,
            }
        )

    try:
        response = (
            get_client()
            .table("rental_listings")
            .upsert(rows, on_conflict="source_url")
            .execute()
        )
    except Exception:
        logger.exception("Failed to upsert %d rental listings", len(rows))
        return 0

    return len(response.data)
