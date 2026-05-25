"""
Nightly rental comps scraper — runs at 2:00 AM ET on Railway cron.

Railway cron configuration (railway.toml):
  [cron.nightly_rental_scrape]
  schedule = "0 7 * * *"     # 02:00 ET = 07:00 UTC
  command  = "python -m jobs.nightly_rental_scrape"

Scrapes Rentals.ca, Kijiji, and PadMapper for four Ontario cities,
normalises all listings, deduplicates, and writes to rental_listings.

Summary log format (written to stdout for Railway log capture):
  [DONE] nightly_rental_scrape | 2026-05-25T07:02:14Z
  Toronto:    rentals_ca=42 kijiji=38 padmapper=31 | new=67 dupes=44
  Hamilton:   rentals_ca=18 kijiji=15 padmapper=12 | new=31 dupes=14
  Ottawa:     rentals_ca=21 kijiji=19 padmapper=14 | new=39 dupes=15
  Mississauga: rentals_ca=27 kijiji=22 padmapper=18 | new=47 dupes=20
  Errors: 0
"""

import asyncio
import logging
import sys
from datetime import datetime, timezone
from typing import Any

# Add parent directory to path so we can import scraper modules
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rental_comps_scraper import (  # noqa: E402
    normalise_rental_listing,
    scrape_kijiji,
    scrape_padmapper,
    scrape_rentals_ca,
)
from db import upsert_rental_listing  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("nightly_rental_scrape")

# Cities covered at MVP — Ontario only
TARGET_CITIES: list[str] = ["Toronto", "Hamilton", "Ottawa", "Mississauga"]


async def scrape_city(city: str) -> dict[str, Any]:
    """
    Run all three sub-scrapers for one city, normalise results, and write to DB.

    Failures in individual sub-scrapers are caught and logged — one failing
    source never prevents the others from running.

    Args:
        city: City name (must match one of TARGET_CITIES).

    Returns:
        Summary dict with counts for this city.
    """
    logger.info("Starting scrape for %s", city)

    summary: dict[str, Any] = {
        "city": city,
        "rentals_ca": 0,
        "kijiji": 0,
        "padmapper": 0,
        "new": 0,
        "dupes": 0,
        "errors": 0,
    }

    # Run all three sub-scrapers — failures in one don't block the others
    try:
        raw_rentals_ca = await scrape_rentals_ca(city)
        summary["rentals_ca"] = len(raw_rentals_ca)
    except Exception as exc:
        logger.error("rentals_ca failed for %s: %s", city, exc)
        raw_rentals_ca = []
        summary["errors"] += 1

    try:
        raw_kijiji = await scrape_kijiji(city)
        summary["kijiji"] = len(raw_kijiji)
    except Exception as exc:
        logger.error("kijiji failed for %s: %s", city, exc)
        raw_kijiji = []
        summary["errors"] += 1

    try:
        raw_padmapper = await scrape_padmapper(city)
        summary["padmapper"] = len(raw_padmapper)
    except Exception as exc:
        logger.error("padmapper failed for %s: %s", city, exc)
        raw_padmapper = []
        summary["errors"] += 1

    # Normalise and write all listings from all sources
    all_raw: list[tuple[dict[str, Any], str]] = [
        *[(r, "rentals_ca") for r in raw_rentals_ca],
        *[(r, "kijiji") for r in raw_kijiji],
        *[(r, "padmapper") for r in raw_padmapper],
    ]

    for raw, source in all_raw:
        try:
            normalised = await normalise_rental_listing(raw, source, city)
            if not normalised:
                continue  # Skip listings without rent

            result = await upsert_rental_listing(normalised)
            if result:
                summary["new"] += 1
            else:
                summary["dupes"] += 1

        except Exception as exc:
            logger.warning(
                "Failed to normalise/insert listing from %s: %s", source, exc
            )
            summary["errors"] += 1

    logger.info(
        "%s complete: rentals_ca=%d kijiji=%d padmapper=%d | new=%d dupes=%d errors=%d",
        city,
        summary["rentals_ca"],
        summary["kijiji"],
        summary["padmapper"],
        summary["new"],
        summary["dupes"],
        summary["errors"],
    )
    return summary


async def main() -> None:
    """
    Entry point for the nightly rental scrape job.

    Runs scrape_city() for all TARGET_CITIES sequentially (not concurrently)
    to respect rate limits and avoid overloading rental platforms.

    Prints a final summary to stdout for Railway log capture.
    """
    started_at = datetime.now(timezone.utc)
    logger.info("nightly_rental_scrape started at %s", started_at.isoformat())

    city_summaries: list[dict[str, Any]] = []
    total_errors = 0

    for city in TARGET_CITIES:
        summary = await scrape_city(city)
        city_summaries.append(summary)
        total_errors += summary["errors"]

    finished_at = datetime.now(timezone.utc)
    duration_s = int((finished_at - started_at).total_seconds())

    # ── Final summary (written to stdout for Railway log capture) ───────────────
    print(f"\n[DONE] nightly_rental_scrape | {finished_at.isoformat()} | {duration_s}s")
    for s in city_summaries:
        print(
            f"  {s['city']:<12}: "
            f"rentals_ca={s['rentals_ca']} kijiji={s['kijiji']} padmapper={s['padmapper']} "
            f"| new={s['new']} dupes={s['dupes']}"
        )
    print(f"  Total errors: {total_errors}")

    if total_errors > 0:
        sys.exit(1)  # Non-zero exit signals Railway that the job had issues


if __name__ == "__main__":
    asyncio.run(main())
