"""
Re-place the stored Kijiji rows by the D-119 rules — one-off backfill.

The nightly upsert refreshes lat/lng/postal_code on every ad it sees again,
so live ads correct themselves on the next run. Ads that have since gone
still count as comps for 180 days, and their placement was made by geocoding
the ad's title; this puts them where their neighbourhood is.

    python regeocode_kijiji.py            # dry run: counts by outcome, no writes
    python regeocode_kijiji.py --apply    # write the new placements

Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and MAPBOX_TOKEN. A row's
previous lat/lng/postal_code is kept in raw_json["geocode_prev"] and the
method in raw_json["geocode"], so a placement can be traced or reverted.
Rows that nothing on the ad can place lose their coordinates and postal
code — out of the comps, rather than in the wrong market.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from collections import Counter

from geocoding import Placement, place_kijiji
from normalization import CleanRentalListing, extract_postal_code
from services import supabase_service

logger = logging.getLogger(__name__)


def _to_listing(row: dict[str, object]) -> CleanRentalListing:
    address = str(row.get("address") or "")
    raw = row.get("raw_json")
    return CleanRentalListing(
        source="kijiji",
        source_url="",
        address=address,
        # Only a postal code written in the ad text counts as known; the
        # stored one may be the very guess this run replaces.
        postal_code=extract_postal_code(address),
        beds=None,
        baths=None,
        rent_monthly=0,
        sqft=None,
        listed_at=None,
        raw_json=raw if isinstance(raw, dict) else None,
    )


def _changed(row: dict[str, object], placed: Placement | None) -> bool:
    if placed is None:
        return row.get("lat") is not None or row.get("postal_code") is not None
    return (
        row.get("postal_code") != placed.postal_code
        or row.get("lat") is None
        or abs(float(row["lat"]) - placed.lat) > 1e-4  # type: ignore[arg-type]
        or abs(float(row["lng"]) - placed.lng) > 1e-4  # type: ignore[arg-type]
    )


async def run(apply: bool) -> int:
    """Re-place every Kijiji row; write only with ``apply``. Returns an exit code."""
    rows = supabase_service.fetch_kijiji_rows_for_regeocode()
    if not rows:
        logger.error("No Kijiji rows read — nothing to do")
        return 1
    logger.info("Read %d Kijiji rows", len(rows))

    cache: dict[str, Placement | None] = {}
    outcomes: Counter[str] = Counter()
    fsa_moves: Counter[str] = Counter()
    changes = 0
    written = 0
    for row in rows:
        listing = _to_listing(row)
        placed = await place_kijiji(listing, cache)
        method = placed.method if placed else "unplaced"
        outcomes[method] += 1
        if not _changed(row, placed):
            continue
        changes += 1
        old_fsa = str(row.get("postal_code") or "")[:3] or "—"
        new_fsa = (placed.postal_code or "")[:3] if placed else "—"
        if old_fsa != new_fsa:
            fsa_moves[f"{old_fsa}→{new_fsa or '—'}"] += 1
        if not apply:
            continue
        raw = dict(listing.raw_json) if isinstance(listing.raw_json, dict) else {}
        raw["geocode"] = method
        raw["geocode_prev"] = {
            "lat": row.get("lat"),
            "lng": row.get("lng"),
            "postal_code": row.get("postal_code"),
        }
        ok = supabase_service.update_listing_placement(
            str(row["id"]),
            lat=placed.lat if placed else None,
            lng=placed.lng if placed else None,
            postal_code=placed.postal_code if placed else None,
            raw_json=raw,
        )
        written += int(ok)

    logger.info("Placement by method: %s", dict(outcomes))
    logger.info("Rows whose placement changes: %d of %d", changes, len(rows))
    logger.info("Top FSA moves: %s", fsa_moves.most_common(15))
    if apply:
        logger.info("Wrote %d rows", written)
    return 0


def main(argv: list[str] | None = None) -> int:
    """CLI entry: ``--apply`` writes, otherwise dry run."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the new placements")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    return asyncio.run(run(apply=args.apply))


if __name__ == "__main__":
    sys.exit(main())
