"""
Shared constants for the scraper workers.
No magic numbers in scraper code — every meaningful value lives here.
"""

# ── Rent normalisation ────────────────────────────────────────────────────────
WEEKS_PER_MONTH = 4.33  # weekly rent → monthly conversion
DAILY_RENT_THRESHOLD = 200  # a "rent" at or below this is per-day/garbage — discard

# Sanity bounds — listings outside this range are discarded, never stored
RENT_MONTHLY_MIN = 400  # below this is a parking spot or a scam
RENT_MONTHLY_MAX = 15_000  # above this is a luxury outlier or mislabelled sale

# ── Bed parsing ───────────────────────────────────────────────────────────────
BEDS_MAX = 10  # parsed bed counts above this are parse errors

# ── Deduplication ─────────────────────────────────────────────────────────────
DEDUPE_WINDOW_DAYS = 7  # same address + rent + beds within 7 days = one record

# ── Scrape targets ────────────────────────────────────────────────────────────
# Ontario FSA first letters (spec Section 11.4)
ONTARIO_FSA_PREFIXES = ("K", "L", "M", "N", "P")

# City slugs crawled each night. Start with the GTA + major Ontario markets;
# grow this list as coverage expands.
TARGET_CITIES = (
    "toronto",
    "mississauga",
    "brampton",
    "vaughan",
    "markham",
    "richmond-hill",
    "oakville",
    "hamilton",
    "ottawa",
    "london",
    "kitchener",
    "waterloo",
)

# ── Politeness ────────────────────────────────────────────────────────────────
REQUEST_DELAY_SECONDS = 4  # min delay between page loads per source
PAGE_LOAD_TIMEOUT_MS = 30_000  # Playwright navigation timeout
MAX_PAGES_PER_CITY = 5  # search result pages crawled per city per source

# ── Per-source yield alarm ──────────────────────────────────────────────────────
# A source crawling 12 cities × up to 5 pages should return far more than a
# handful of rows. A near-zero yield means the CSS selectors broke (the site
# changed its markup), NOT that it was a quiet listings night — those are
# different claims and only one is acceptable. The nightly run fails loudly
# (non-zero exit) when any source falls below this floor, so a silently broken
# selector can't masquerade as a successful deploy. Conservative starting floor;
# raise it once real per-night baselines exist (TEMPLATE — spec Section 11.2).
MIN_RAW_ROWS_PER_SOURCE = 5
