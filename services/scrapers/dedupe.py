"""
Deduplication of normalised rental listings.

Rule (spec Section 11.2): same address + rent + beds within DEDUPE_WINDOW_DAYS
= one record. Applies both within a scrape batch and against rows already
stored in rental_listings. Historical records are never deleted.

Pure functions only — the caller supplies existing records; no database here.
"""

from normalization import CleanRentalListing


def _dedupe_key(address: str, rent_monthly: int, beds: int | None) -> tuple[str, int, int | None]:
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
        if _dedupe_key(listing.address, listing.rent_monthly, listing.beds) not in existing
    ]
