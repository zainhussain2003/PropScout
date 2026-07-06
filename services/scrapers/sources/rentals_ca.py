"""
Rentals.ca source scraper — spec Section 11.2 (TEMPLATE CODE).

Rentals.ca redesigned its search page (mid-2026) from a server-rendered
listing-card list into a Google-Maps SPA. The listings no longer exist in the
HTML as cards — they are fetched from an authenticated GraphQL API
(``POST /graphql``, operation ``RentalListingSearch``). The previous CSS-card
scraper returned 0 rows against that redesign; that — NOT a datacenter-IP block —
was the root cause of the 2026-07 Railway zero-yield (kijiji and padmapper, on
the same Playwright path from the same IP, kept working).

How this source now works:
  1. Load the city search page in Playwright (passes Cloudflare, sets clearance).
  2. The SPA mints a short-lived bearer token and calls its own /graphql on
     hydration — ``open_page_capturing_token`` lifts that bearer off the request.
  3. Replay an ENRICHED RentalListingSearch query IN the page context
     (``page.evaluate`` fetch) — same origin, same token, same CF clearance — so
     each node carries address / rent / beds / baths / size / coords / path.
  4. Parse each node → RawRentalListing (ranges collapse to their low end, the
     long-standing rentals.ca discipline for building listings).

Anchored on the GraphQL schema (stable field names), not CSS selectors, so it is
far more resistant to markup rot than the old card scraper. If this source
returns zero, check (a) the GraphQL field names below against a live
introspection, and (b) whether the bearer token is still on the SPA's request.
"""

import asyncio
import json
import logging

from playwright.async_api import Browser

from constants import (
    RENTALS_CA_PAGE_SIZE,
    RENTALS_CA_RADIUS_M,
    REQUEST_DELAY_SECONDS,
    TARGET_CITIES,
)
from normalization import RawRentalListing
from sources.browser import (
    NAV_FAILED_STATUS,
    PageFetch,
    SourceFetchResult,
    open_page_capturing_token,
)

logger = logging.getLogger(__name__)

SOURCE = "rentals_ca"
_BASE_URL = "https://rentals.ca"

# Enriched RentalListingSearch. The SPA's own query only selects map-pin fields
# (id/location/rentRange); we add the fields a comp needs. Address subfields are
# the live schema (Address.street/cityName/regionCode/postalCode — verified via
# introspection 2026-07-05); update this string when the schema shifts.
_GRAPHQL_QUERY = (
    "query RentalListingSearch($first: PositiveInt, $place: PlaceInput!, "
    "$filters: RentalListingsConnectionFilterSet, $sortType: SortType) {"
    "  rentalListings(first: $first, place: $place, filters: $filters, sortType: $sortType) {"
    "    meta { totalCount __typename }"
    "    edges { node {"
    "      id path name rentRange bedsRange bathsRange sizeRange location listingType"
    "      address { street streetSuffix cityName regionCode postalCode __typename }"
    "      __typename"
    "    } __typename }"
    "    __typename"
    "  }"
    "}"
)

# In-page fetch: runs in the loaded page's JS context so it rides the SPA's
# Cloudflare clearance and same-origin trust. Returns {status, text}; never throws
# out to Python (a network error comes back as status 0).
_JS_FETCH = """
async (args) => {
  const [token, payload] = args;
  try {
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': token },
      body: JSON.stringify(payload),
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: String(e) };
  }
}
"""


def _slug_to_area(city_slug: str) -> str:
    """City slug → GraphQL namedArea, e.g. 'richmond-hill' → 'richmond hill, on, ca'."""
    return city_slug.replace("-", " ") + ", on, ca"


def _low(rng: object) -> str:
    """Low end of a [min, max] range as a string (''  when absent/empty).

    Building listings carry ranges (rentRange [1895, 4595], bedsRange [0, 3]); the
    normaliser keys on a single value, and the low end is the long-standing
    rentals.ca choice — the entry price / smallest unit, the conservative comp.
    """
    if not isinstance(rng, (list, tuple)):
        return ""
    vals = [v for v in rng if isinstance(v, (int, float))]
    return str(min(vals)) if vals else ""


def _build_payload(city_slug: str) -> dict:
    """The GraphQL request body for one city's search."""
    return {
        "operationName": "RentalListingSearch",
        "query": _GRAPHQL_QUERY,
        "variables": {
            "filters": {},
            "first": RENTALS_CA_PAGE_SIZE,
            "place": {
                "namedAreaDistance": {
                    "distance": RENTALS_CA_RADIUS_M,
                    "namedArea": _slug_to_area(city_slug),
                }
            },
        },
    }


def _parse_node(node: dict, city_slug: str) -> RawRentalListing | None:
    """
    Map one GraphQL RentalListing node to a RawRentalListing.

    The postal code is folded into the address string so the shared normaliser's
    postal-code regex finds it (the normaliser reads postal from ``address``).
    Exact coordinates from the API are passed through so the pipeline can skip
    geocoding this row.

    Args:
        node: One ``edges[].node`` object from the GraphQL response.
        city_slug: The requested city slug, used as a locality fallback.

    Returns:
        RawRentalListing, or None if the node has no usable location text.
    """
    if not node:
        return None

    path = node.get("path")
    source_url = f"{_BASE_URL}/{path}" if path else _BASE_URL

    addr = node.get("address") or {}
    street = " ".join(
        p for p in (addr.get("street"), addr.get("streetSuffix")) if p
    ).strip()
    locality = addr.get("cityName") or city_slug.replace("-", " ").title()
    region = addr.get("regionCode") or "ON"
    postal = addr.get("postalCode") or ""

    # Fall back to the building name when the street line is blank.
    street_or_name = street or (node.get("name") or "")
    # A bare province code is not a locatable address — need a street/name, a
    # postal, or at least a locality to place the row.
    if not street_or_name and not postal and not locality.strip():
        return None
    region_postal = f"{region} {postal}".strip()
    address = ", ".join(
        p for p in (street_or_name, locality, region_postal) if p
    ).strip()
    if not address:
        return None

    loc = node.get("location") or []
    lat = float(loc[1]) if len(loc) >= 2 and loc[1] is not None else None
    lng = float(loc[0]) if len(loc) >= 2 and loc[0] is not None else None

    return RawRentalListing(
        source=SOURCE,
        source_url=source_url,
        address=address,
        rent_raw=_low(node.get("rentRange")),
        beds_raw=_low(node.get("bedsRange")),
        baths_raw=_low(node.get("bathsRange")) or None,
        sqft_raw=_low(node.get("sizeRange")) or None,
        lat=lat,
        lng=lng,
        raw_json={"id": node.get("id"), "listingType": node.get("listingType")},
    )


async def _query_city(
    page: object, token: str, city_slug: str
) -> tuple[list[dict], int]:
    """
    Run the enriched GraphQL search for one city in the page context.

    Returns:
        (nodes, status). ``nodes`` is the list of ``node`` dicts (empty on any
        error); ``status`` is the GraphQL HTTP status (0 on a fetch failure).
    """
    res = await page.evaluate(_JS_FETCH, [token, _build_payload(city_slug)])
    status = int(res.get("status") or 0)
    if status != 200:
        logger.warning("rentals_ca: %s query returned status %s", city_slug, status)
        return [], status
    try:
        data = json.loads(res.get("text") or "")
    except (ValueError, TypeError):
        logger.exception("rentals_ca: could not parse %s GraphQL body", city_slug)
        return [], status
    if data.get("errors"):
        logger.warning("rentals_ca: %s GraphQL errors: %s", city_slug, data["errors"])
    conn = (data.get("data") or {}).get("rentalListings") or {}
    edges = conn.get("edges") or []
    return [e.get("node") or {} for e in edges], status


async def fetch_listings(browser: Browser) -> SourceFetchResult:
    """
    Scrape active rental listings from Rentals.ca across all target cities.

    Loads one city page to obtain the SPA's bearer token + Cloudflare clearance,
    then queries the GraphQL API once per city from that page context. A blocked
    load or a missing token fails the whole source loudly (a zero-row, blocked
    PageFetch per city) rather than silently — the yield alarm depends on it.

    Args:
        browser: Running Playwright browser from sources.browser.

    Returns:
        SourceFetchResult: the raw listings across all cities, plus a PageFetch per
        city carrying status / row count / blocked (the yield-alarm signal).
    """
    result = SourceFetchResult()
    if not TARGET_CITIES:
        return result

    landing = f"{_BASE_URL}/{TARGET_CITIES[0]}"
    page_res, token = await open_page_capturing_token(browser, landing)
    page = page_res.page

    try:
        # No page, a challenge, or no token → the whole source is down. Record the
        # signal for every city so the alarm sees a dead source, not a quiet night.
        if page is None or page_res.blocked or not token:
            if page is None or page_res.blocked:
                logger.error(
                    "rentals_ca: landing blocked/failed (status %s, blocked %s)",
                    page_res.status,
                    page_res.blocked,
                )
            else:
                logger.error("rentals_ca: no bearer token captured — API auth changed?")
            for city in TARGET_CITIES:
                result.pages.append(
                    PageFetch(SOURCE, city, 1, page_res.status, 0, page_res.blocked)
                )
            return result

        for city in TARGET_CITIES:
            try:
                nodes, status = await _query_city(page, token, city)
                for node in nodes:
                    listing = _parse_node(node, city)
                    if listing is not None:
                        result.listings.append(listing)
                result.pages.append(
                    PageFetch(SOURCE, city, 1, status, len(nodes), False)
                )
            except Exception:
                logger.exception("rentals_ca: city %s failed", city)
                result.pages.append(
                    PageFetch(SOURCE, city, 1, NAV_FAILED_STATUS, 0, False)
                )
            await asyncio.sleep(REQUEST_DELAY_SECONDS)  # politeness between queries
    finally:
        if page is not None:
            await page.close()

    logger.info("rentals_ca: scraped %d raw listings", len(result.listings))
    return result
