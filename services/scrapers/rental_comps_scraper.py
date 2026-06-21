"""
Rental comparables scraper — runs nightly on Railway.

Schedule: 06:00 UTC (= 01:00 EST / 02:00 EDT). Railway crons run in UTC;
the actual local-time landing drifts an hour with North American DST.
See `railway.json` for the cron expression.

Pipeline (spec Section 11.2):
  1. Scrape all three sources (Rentals.ca, Kijiji, PadMapper) across Ontario
     target cities. A failed source never kills the run.
  2. Normalise: parse rent (weekly → monthly), beds to int, postal code.
  3. Deduplicate: in-batch, then against rows stored in the last 7 days.
  4. Geocode new listings to lat/lng (non-fatal on failure).
  5. Insert into rental_listings. Historical rows are never deleted —
     accumulation is the moat.

Entry point: python rental_comps_scraper.py
Railway cron schedule lives in railway.json.
"""

import asyncio
import logging
import sys

from dedupe import dedupe_batch, filter_existing
from normalization import CleanRentalListing, RawRentalListing, normalize_listing
from services import mapbox_service, supabase_service
from sources import kijiji, padmapper, rentals_ca
from sources.browser import launch_browser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

_SOURCES = (rentals_ca, kijiji, padmapper)


async def scrape_all_sources() -> list[RawRentalListing]:
    """
    Run every source scraper in one shared browser session.

    Returns:
        Combined raw listings. A source that raises contributes nothing but
        never aborts the others.
    """
    raw: list[RawRentalListing] = []
    async with launch_browser() as browser:
        for source in _SOURCES:
            try:
                raw.extend(await source.fetch_listings(browser))
            except Exception:
                logger.exception("Source %s failed — continuing", source.SOURCE)
    return raw


async def geocode_listings(listings: list[CleanRentalListing]) -> None:
    """
    Geocode listings in place, sequentially (Mapbox free-tier friendly).

    Args:
        listings: New listings to geocode. Failures leave lat/lng as None.
    """
    for listing in listings:
        coords = await mapbox_service.geocode_address(listing.address)
        if coords is not None:
            listing.lat, listing.lng = coords


async def run_nightly_scrape() -> int:
    """
    Execute the full nightly pipeline: scrape → normalise → dedupe → geocode
    → store.

    Returns:
        Number of new rows inserted into rental_listings.
    """
    raw = await scrape_all_sources()
    logger.info("Scraped %d raw listings across all sources", len(raw))

    normalized = [
        clean for clean in (normalize_listing(r) for r in raw) if clean is not None
    ]
    logger.info("Normalised to %d valid listings", len(normalized))

    unique = dedupe_batch(normalized)
    existing_keys = supabase_service.fetch_recent_dedupe_keys()
    new_listings = filter_existing(unique, existing_keys)
    logger.info(
        "Deduped: %d in-batch unique, %d new after window check",
        len(unique),
        len(new_listings),
    )

    await geocode_listings(new_listings)

    inserted = supabase_service.insert_rental_listings(new_listings)
    logger.info("Inserted %d new rental listings", inserted)
    return inserted


if __name__ == "__main__":
    try:
        count = asyncio.run(run_nightly_scrape())
    except Exception:
        logger.exception("Nightly rental comps scrape failed")
        sys.exit(1)
    logger.info("Nightly scrape complete: %d new records", count)
