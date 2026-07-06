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
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
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
        (row["address"], row["rent_monthly"], row.get("beds"))
        for row in response.data
    ]


def insert_rental_listings(listings: list[CleanRentalListing]) -> int:
    """
    Insert normalised rental listings into rental_listings.

    Historical records are never deleted or updated — insert only
    (spec Section 11.2: accumulation is the moat).

    Args:
        listings: Deduped, normalised listings to store.

    Returns:
        Number of rows successfully inserted.
    """
    if not listings:
        return 0

    rows = [
        {
            "source": l.source,
            "source_url": l.source_url,
            "address": l.address,
            "postal_code": l.postal_code,
            "lat": l.lat,
            "lng": l.lng,
            "beds": l.beds,
            "baths": l.baths,
            "rent_monthly": l.rent_monthly,
            "sqft": l.sqft,
            "listed_at": l.listed_at.isoformat() if l.listed_at else None,
            "is_active": True,
            "raw_json": l.raw_json,
        }
        for l in listings
    ]

    try:
        response = get_client().table("rental_listings").insert(rows).execute()
    except Exception:
        logger.exception("Failed to insert %d rental listings", len(rows))
        return 0

    return len(response.data)
