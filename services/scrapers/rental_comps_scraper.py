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
from dataclasses import dataclass, field

from constants import MIN_RAW_ROWS_PER_SOURCE
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


@dataclass
class SourceYield:
    """How many RAW listings one source returned this run — the selector-health signal."""

    source: str
    raw_count: int


@dataclass
class ScrapeResult:
    """Combined raw listings plus the per-source yield breakdown."""

    listings: list[RawRentalListing] = field(default_factory=list)
    yields: list[SourceYield] = field(default_factory=list)


@dataclass
class NightlyOutcome:
    """Result of a nightly run: rows stored, per-source yields, and any dead sources."""

    inserted: int
    yields: list[SourceYield]
    underperforming: list[SourceYield]


def find_underperforming_sources(
    yields: list[SourceYield], min_rows: int = MIN_RAW_ROWS_PER_SOURCE
) -> list[SourceYield]:
    """
    Return the sources whose raw yield is below the floor (likely broken selectors).

    A pure function so the alarm is unit-testable in isolation. An empty list
    means every source returned a healthy number of rows.

    Args:
        yields: Per-source raw counts from this run.
        min_rows: Floor below which a yield is treated as a broken selector.

    Returns:
        The under-floor yields, in input order. Empty when all sources are healthy.
    """
    return [y for y in yields if y.raw_count < min_rows]


async def scrape_all_sources() -> ScrapeResult:
    """
    Run every source scraper in one shared browser session, tracking per-source yield.

    Returns:
        ScrapeResult with the combined raw listings and a SourceYield per source.
        A source that raises contributes zero rows (recorded as 0, so a crash
        surfaces as a dead source) but never aborts the others.
    """
    result = ScrapeResult()
    async with launch_browser() as browser:
        for source in _SOURCES:
            try:
                rows = await source.fetch_listings(browser)
            except Exception:
                logger.exception("Source %s failed — continuing", source.SOURCE)
                rows = []
            result.listings.extend(rows)
            result.yields.append(SourceYield(source.SOURCE, len(rows)))
    return result


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


async def run_nightly_scrape() -> NightlyOutcome:
    """
    Execute the full nightly pipeline: scrape → normalise → dedupe → geocode
    → store, then check per-source yields for broken selectors.

    Healthy sources' rows are always stored first — a dead source never costs us
    the data the working sources collected. The yield check runs AFTER the insert
    and only flags; the caller (``__main__``) turns a flag into a non-zero exit.

    Returns:
        NightlyOutcome with rows inserted, per-source yields, and any
        underperforming (likely broken-selector) sources.
    """
    result = await scrape_all_sources()
    logger.info("Scraped %d raw listings across all sources", len(result.listings))

    normalized = [
        clean
        for clean in (normalize_listing(r) for r in result.listings)
        if clean is not None
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

    # ── Per-source yield honesty check ────────────────────────────────────────
    # "The scraper ran" and "the scraper extracted rows" are different claims.
    # Log every source's raw yield, then scream if any is near-zero — a broken
    # selector must not hide inside a healthy-looking total.
    for y in result.yields:
        logger.info("Source yield: %-12s %5d raw listings", y.source, y.raw_count)

    underperforming = find_underperforming_sources(result.yields)
    if underperforming:
        names = ", ".join(f"{y.source}={y.raw_count}" for y in underperforming)
        logger.error(
            "ZERO/LOW-YIELD SOURCE(S): %s (floor %d) — almost certainly broken "
            "selectors, NOT a quiet night. Stored %d rows from healthy sources; "
            "marking this run FAILED for investigation.",
            names,
            MIN_RAW_ROWS_PER_SOURCE,
            inserted,
        )

    return NightlyOutcome(
        inserted=inserted, yields=result.yields, underperforming=underperforming
    )


if __name__ == "__main__":
    try:
        outcome = asyncio.run(run_nightly_scrape())
    except Exception:
        logger.exception("Nightly rental comps scrape failed")
        sys.exit(1)

    if outcome.underperforming:
        # Good data was still stored; exit non-zero so Railway flags the run as
        # failed and a broken selector gets eyes on it — never a silent green.
        logger.error(
            "Nightly scrape stored %d records but %d source(s) yielded near-zero — "
            "exiting non-zero for investigation.",
            outcome.inserted,
            len(outcome.underperforming),
        )
        sys.exit(2)

    logger.info("Nightly scrape complete: %d new records", outcome.inserted)
