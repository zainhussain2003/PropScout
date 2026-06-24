"""
Normalisation of raw scraped rental listings into clean records.

Pure functions only — no network, no database. Every function here is
unit-tested in normalization_test.py.

Pipeline (spec Section 11.2):
  raw source dict → parse rent (weekly→monthly), parse beds to int,
  extract postal code → CleanRentalListing or None (discarded).
"""

import re
from dataclasses import dataclass
from datetime import date

from constants import (
    WEEKS_PER_MONTH,
    DAILY_RENT_THRESHOLD,
    RENT_MONTHLY_MIN,
    RENT_MONTHLY_MAX,
    BEDS_MAX,
    ONTARIO_FSA_PREFIXES,
)


@dataclass
class RawRentalListing:
    """Raw listing as returned by a source module, before any cleaning."""

    source: str  # 'rentals_ca' | 'kijiji' | 'padmapper'
    source_url: str
    address: str
    rent_raw: str  # e.g. "$2,150/mo", "550 weekly", "2150"
    beds_raw: str  # e.g. "2 Beds", "Studio", "3 + den"
    baths_raw: str | None = None
    sqft_raw: str | None = None
    listed_at: date | None = None
    raw_json: dict[str, object] | None = None


@dataclass
class CleanRentalListing:
    """Normalised listing ready for dedupe and storage."""

    source: str
    source_url: str
    address: str
    postal_code: str | None
    beds: int | None
    baths: float | None
    rent_monthly: int
    sqft: int | None
    listed_at: date | None
    lat: float | None = None
    lng: float | None = None
    raw_json: dict[str, object] | None = None


_POSTAL_CODE_RE = re.compile(r"\b([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)\b")
_MONEY_RE = re.compile(r"(\d[\d,]*(?:\.\d+)?)")
_WEEKLY_RE = re.compile(r"week|/wk|wkly", re.IGNORECASE)
_DAILY_RE = re.compile(r"day|night|/d\b", re.IGNORECASE)
_BEDS_NUM_RE = re.compile(r"(\d+)")
_STUDIO_RE = re.compile(r"studio|bachelor", re.IGNORECASE)
# Spelled-out bed counts — Kijiji titles say "two bedroom", not "2 bedroom".
_WORD_NUMBERS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def parse_rent_monthly(rent_raw: str) -> int | None:
    """
    Parse a raw rent string into a monthly integer dollar amount.

    Weekly rents are converted to monthly (× WEEKS_PER_MONTH). Daily rates and
    amounts outside the sanity bounds return None — the listing is discarded.

    Args:
        rent_raw: Raw rent text, e.g. "$2,150/mo", "550 / week", "2150".

    Returns:
        Monthly rent in whole dollars, or None if unparseable or implausible.
    """
    match = _MONEY_RE.search(rent_raw)
    if not match:
        return None

    amount = float(match.group(1).replace(",", ""))

    if _DAILY_RE.search(rent_raw):
        return None  # nightly/daily rate — not a long-term rental comp

    if _WEEKLY_RE.search(rent_raw):
        amount *= WEEKS_PER_MONTH
    elif amount <= DAILY_RENT_THRESHOLD:
        return None  # unlabelled tiny amount — daily rate or garbage

    monthly = round(amount)
    if not (RENT_MONTHLY_MIN <= monthly <= RENT_MONTHLY_MAX):
        return None

    return monthly


def parse_beds(beds_raw: str) -> int | None:
    """
    Parse a raw bedroom string into an integer count.

    "Studio" and "Bachelor" parse to 0. Dens are not counted as bedrooms —
    "2 + den" parses to 2 (never inflate bed counts; spec Section 19 treats
    dens as unverified bedrooms).

    Args:
        beds_raw: Raw beds text, e.g. "2 Beds", "Studio", "3 + den".

    Returns:
        Bedroom count as an integer, or None if unparseable.
    """
    if _STUDIO_RE.search(beds_raw):
        return 0

    match = _BEDS_NUM_RE.search(beds_raw)
    if match:
        beds = int(match.group(1))
        return beds if beds <= BEDS_MAX else None

    # No digit — fall back to spelled-out numbers ("two bedroom" → 2).
    low = beds_raw.lower()
    for word, value in _WORD_NUMBERS.items():
        if re.search(rf"\b{word}\b", low):
            return value

    return None


def parse_baths(baths_raw: str | None) -> float | None:
    """
    Parse a raw bathroom string into a float (half-baths allowed).

    Args:
        baths_raw: Raw baths text, e.g. "1.5 Baths", or None.

    Returns:
        Bathroom count, or None if missing or unparseable.
    """
    if not baths_raw:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", baths_raw)
    return float(match.group(1)) if match else None


def parse_sqft(sqft_raw: str | None) -> int | None:
    """
    Parse a raw square footage string into an integer.

    Args:
        sqft_raw: Raw sqft text, e.g. "750 sqft", or None.

    Returns:
        Square footage, or None if missing or unparseable.
    """
    if not sqft_raw:
        return None
    match = _MONEY_RE.search(sqft_raw)
    if not match:
        return None
    return round(float(match.group(1).replace(",", "")))


def extract_postal_code(address: str) -> str | None:
    """
    Extract a 6-character Canadian postal code from an address string.

    Args:
        address: Full address text.

    Returns:
        Uppercase postal code without the space (e.g. "L4K5W4"), or None.
    """
    match = _POSTAL_CODE_RE.search(address)
    if not match:
        return None
    return (match.group(1) + match.group(2)).upper()


def is_ontario_postal_code(postal_code: str | None) -> bool:
    """
    Check whether a postal code is in Ontario (FSA starts with K, L, M, N, P).

    Args:
        postal_code: 6-character postal code, or None.

    Returns:
        True if the postal code is an Ontario FSA. None returns False.
    """
    if not postal_code:
        return False
    return postal_code[0].upper() in ONTARIO_FSA_PREFIXES


def normalize_listing(raw: RawRentalListing) -> CleanRentalListing | None:
    """
    Normalise a raw scraped listing into a clean record.

    Discards (returns None) when rent is unparseable/implausible or the
    address is blank. Non-Ontario postal codes are discarded; listings with
    no postal code at all are kept (geocoding may resolve location later).

    Args:
        raw: RawRentalListing from a source module.

    Returns:
        CleanRentalListing ready for dedupe and storage, or None to discard.
    """
    address = raw.address.strip()
    if not address:
        return None

    rent_monthly = parse_rent_monthly(raw.rent_raw)
    if rent_monthly is None:
        return None

    postal_code = extract_postal_code(address)
    if postal_code is not None and not is_ontario_postal_code(postal_code):
        return None

    return CleanRentalListing(
        source=raw.source,
        source_url=raw.source_url,
        address=address,
        postal_code=postal_code,
        beds=parse_beds(raw.beds_raw),
        baths=parse_baths(raw.baths_raw),
        rent_monthly=rent_monthly,
        sqft=parse_sqft(raw.sqft_raw),
        listed_at=raw.listed_at,
        raw_json=raw.raw_json,
    )
