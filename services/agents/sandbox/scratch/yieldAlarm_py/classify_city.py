"""
Per-city state classifier for the scraper yield alarm.

Consumes a list of per-page results for a single city and returns exactly one
of four mutually-exclusive states:

  OK           — at least one page has rows > 0 AND no page is blocked.
  BLOCKED      — every page is blocked (status 403/429 OR blocked == True).
  TRANSIENT    — at least one page is blocked AND at least one other page
                 has rows > 0 (on a non-blocked page).
  NEEDS_REVIEW — every page has status 200 with rows == 0 and none blocked.

"Producing" is intentionally restricted to non-blocked pages: a page that
returns 403/429 or sets the blocked flag cannot reliably produce parsed rows,
so any rows value on a blocked page is ignored for classification purposes.

Out-of-scope: retry logic, alarm/exit-code logic, multi-city aggregation.

Port of: scratch/yieldAlarm/classifyCity.ts
"""

from __future__ import annotations

from typing import Literal, TypedDict

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

CityState = Literal["OK", "BLOCKED", "TRANSIENT", "NEEDS_REVIEW"]


class PageResult(TypedDict):
    """Per-page result for a single city scrape pass."""

    status: int    # HTTP status returned for this page (e.g. 200, 403, 429).
    rows: int      # Number of listing rows successfully parsed from this page.
    blocked: bool  # Explicit blocked flag (set by the scraper on a soft-block).


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_page_blocked(page: PageResult) -> bool:
    """
    Returns True when a single page should be considered blocked.

    A page is blocked when the scraper flagged it OR the HTTP status is 403/429.
    """
    return page["blocked"] or page["status"] == 403 or page["status"] == 429


def _is_page_producing(page: PageResult) -> bool:
    """
    Returns True when a page is non-blocked AND has rows > 0.

    Rows on a blocked page are not counted: a 403/429 response body cannot
    contain valid listing data, so any rows field there is noise.
    """
    return not _is_page_blocked(page) and page["rows"] > 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_city(pages: list[PageResult]) -> CityState:
    """
    Classify all pages scraped for one city into a single CityState.

    Args:
        pages: List of per-page results for a single city (may be empty).

    Returns:
        One of: "OK" | "BLOCKED" | "TRANSIENT" | "NEEDS_REVIEW"
    """
    if len(pages) == 0:
        # Empty input cannot satisfy any positive condition; treat conservatively.
        return "NEEDS_REVIEW"

    any_blocked = any(_is_page_blocked(p) for p in pages)
    any_producing = any(_is_page_producing(p) for p in pages)
    all_blocked = all(_is_page_blocked(p) for p in pages)

    # TRANSIENT: mixed signal — some pages blocked, at least one (unblocked)
    # page is producing rows.
    if any_blocked and any_producing:
        return "TRANSIENT"

    # BLOCKED: every page is blocked (implies not any_producing at this point).
    if all_blocked:
        return "BLOCKED"

    # OK: at least one unblocked page has rows > 0 AND no page is blocked.
    if any_producing and not any_blocked:
        return "OK"

    # NEEDS_REVIEW: everything responded 200 / rows == 0 / not blocked.
    return "NEEDS_REVIEW"
