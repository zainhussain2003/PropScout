"""
Shared constants for the scraper workers.
No magic numbers in scraper code — every meaningful value lives here.
"""

# ── Rent normalisation ────────────────────────────────────────────────────────
WEEKS_PER_MONTH = 4.33          # weekly rent → monthly conversion
DAILY_RENT_THRESHOLD = 200      # a "rent" at or below this is per-day/garbage — discard

# Sanity bounds — listings outside this range are discarded, never stored
RENT_MONTHLY_MIN = 400          # below this is a parking spot or a scam
RENT_MONTHLY_MAX = 15_000       # above this is a luxury outlier or mislabelled sale

# ── Bed parsing ───────────────────────────────────────────────────────────────
BEDS_MAX = 10                   # parsed bed counts above this are parse errors

# ── Deduplication ─────────────────────────────────────────────────────────────
DEDUPE_WINDOW_DAYS = 7          # same address + rent + beds within 7 days = one record

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
REQUEST_DELAY_SECONDS = 4       # min delay between page loads per source
PAGE_LOAD_TIMEOUT_MS = 30_000   # Playwright navigation timeout
MAX_PAGES_PER_CITY = 5          # search result pages crawled per city per source
