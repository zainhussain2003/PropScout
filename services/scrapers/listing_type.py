"""
Listing type detection — determines whether a URL is for-sale or for-rent.

URL takes priority over price string heuristics. When both are ambiguous
the caller should surface a toggle to the user (report Mode Modal).
"""

import re

# Keywords in the URL path that signal a rental listing
_RENT_URL_KEYWORDS: tuple[str, ...] = (
    "for-rent",
    "rental",
    "/rent/",
    "to-rent",
    "locatif",  # French: "rental"
    "a-louer",  # French: "for rent"
    "/rentals/",
)

# Keywords in the URL path that signal a for-sale listing
_SALE_URL_KEYWORDS: tuple[str, ...] = (
    "for-sale",
    "real-estate",
    "maison-a-vendre",  # French: "house for sale"
    "/buy/",
    "/homes-for-sale/",
    "/property-for-sale/",
)

# Keywords in a price string that signal monthly rental pricing
_RENT_PRICE_KEYWORDS: tuple[str, ...] = (
    "/mo",
    "/month",
    "per month",
    "per mo",
    "/mois",  # French: "per month"
    "monthly",
)


def parse_listing_type(url: str, price_string: str | None = None) -> str:
    """
    Determine whether a listing URL is for-sale, for-rent, or unknown.

    URL keywords are checked first. If the URL is ambiguous the price string
    is used as a fallback. If both are ambiguous, 'unknown' is returned and
    the caller should show the user a toggle.

    Args:
        url: Full listing URL (e.g. "https://www.realtor.ca/real-estate/...").
        price_string: Raw price text from the page (e.g. "$2,500/mo"). Optional.

    Returns:
        One of: 'for_sale', 'for_rent', 'unknown'.
    """
    url_lower = url.lower()

    # ── URL-first detection ────────────────────────────────────────────────────

    if any(kw in url_lower for kw in _RENT_URL_KEYWORDS):
        return "for_rent"

    if any(kw in url_lower for kw in _SALE_URL_KEYWORDS):
        return "for_sale"

    # ── Price string fallback ──────────────────────────────────────────────────

    if price_string:
        ps = price_string.lower()
        if any(kw in ps for kw in _RENT_PRICE_KEYWORDS):
            return "for_rent"

    return "unknown"


def is_realtor_ca_url(url: str) -> bool:
    """
    Return True if the URL belongs to Realtor.ca.

    Args:
        url: Full listing URL.

    Returns:
        True if the URL host is realtor.ca or www.realtor.ca.
    """
    return bool(re.search(r"https?://(www\.)?realtor\.ca/", url, re.IGNORECASE))


def is_zillow_ca_url(url: str) -> bool:
    """
    Return True if the URL belongs to Zillow.ca.

    Also detects Zillow.com URLs with Canadian postal codes so the caller
    can warn the user that US listings are not supported.

    Args:
        url: Full listing URL.

    Returns:
        True if the URL host is zillow.ca or www.zillow.ca.
    """
    return bool(re.search(r"https?://(www\.)?zillow\.ca/", url, re.IGNORECASE))


def is_us_zillow_url(url: str) -> bool:
    """
    Return True if the URL points to a US Zillow listing (zillow.com, not .ca).

    Zillow.com is out of scope — only Zillow.ca is supported.

    Args:
        url: Full listing URL.

    Returns:
        True if the URL host is zillow.com.
    """
    return bool(re.search(r"https?://(www\.)?zillow\.com/", url, re.IGNORECASE))
