"""
Deduplication of normalised rental listings.

Ingestion identity is **source_url** (see `dedupe_by_source_url`): one row per
listing URL, so a re-scraped listing UPDATES its row (refreshing last-seen)
instead of being dropped. This is what keeps scraped_at trustworthy on rotating
sources.

The content-key functions below (`dedupe_batch`, `filter_existing`: same
address + rent + beds) are NO LONGER in the ingestion path — content-axis dedup
at write time wrongly merges distinct-URL listings and breaks freshness. They are
retained as the building block for collapsing same-physical-unit cross-posts at
comp-QUERY time (spec Section 11.2), where read-side comp quality is the concern
rather than write-side identity.

Pure functions only — the caller supplies existing records; no database here.
"""

from normalization import CleanRentalListing


def _dedupe_key(
    address: str, rent_monthly: int, beds: int | None
) -> tuple[str, int, int | None]:
    """
    Build the identity key used for duplicate detection.

    Address comparison is case-insensitive and whitespace-collapsed so
    "5 Buttermill Ave" and "5  buttermill ave " collide.

    Args:
        address: Listing street address.
        rent_monthly: Monthly rent in dollars.
        beds: Bedroom count, or None when unknown.

    Returns:
        Tuple key of (normalised address, rent, beds).
    """
    normalised_address = " ".join(address.lower().split())
    return (normalised_address, rent_monthly, beds)


def dedupe_by_source_url(
    listings: list[CleanRentalListing],
) -> list[CleanRentalListing]:
    """
    Remove in-batch duplicates by source_url — the sole ingestion identity.

    First occurrence wins. Collapses an over-broad card selector's repeated
    same-URL cards within one scrape (before geocoding, to save Mapbox calls)
    WITHOUT collapsing distinct-URL listings that happen to share content — two
    real identical units, or the same unit cross-posted under different URLs, are
    kept as separate rows and de-duplicated at comp-QUERY time instead. Keeping
    them here preserves per-listing last-seen fidelity (each URL refreshes its own
    scraped_at on re-scrape), which content-axis dedup would destroy.

    Args:
        listings: Normalised listings from all sources in this run.

    Returns:
        Listings with duplicate source_urls removed, original order preserved.
    """
    seen: set[str] = set()
    unique: list[CleanRentalListing] = []
    for listing in listings:
        if listing.source_url in seen:
            continue
        seen.add(listing.source_url)
        unique.append(listing)
    return unique


def dedupe_batch(listings: list[CleanRentalListing]) -> list[CleanRentalListing]:
    """
    Remove duplicates within a single scrape batch.

    The first occurrence wins; later duplicates (often the same unit on a
    second source) are dropped.

    Args:
        listings: Normalised listings from all sources in this run.

    Returns:
        Listings with in-batch duplicates removed, original order preserved.
    """
    seen: set[tuple[str, int, int | None]] = set()
    unique: list[CleanRentalListing] = []
    for listing in listings:
        key = _dedupe_key(listing.address, listing.rent_monthly, listing.beds)
        if key in seen:
            continue
        seen.add(key)
        unique.append(listing)
    return unique


def filter_existing(
    listings: list[CleanRentalListing],
    existing_keys: list[tuple[str, int, int | None]],
) -> list[CleanRentalListing]:
    """
    Drop listings already stored within the dedupe window.

    Args:
        listings: In-batch-deduped listings from this run.
        existing_keys: (address, rent_monthly, beds) tuples for rows scraped in
            the last DEDUPE_WINDOW_DAYS, as returned by the storage service.

    Returns:
        Only the listings that are new — not present in existing_keys.
    """
    existing = {_dedupe_key(addr, rent, beds) for addr, rent, beds in existing_keys}
    return [
        listing
        for listing in listings
        if _dedupe_key(listing.address, listing.rent_monthly, listing.beds)
        not in existing
    ]
