"""
Shared constants for the scraper workers.
No magic numbers in scraper code — every meaningful value lives here.
"""

import os


def _env_int(name: str, default: int) -> int:
    """Read an int from the environment, falling back to ``default`` if unset/invalid.

    Lets the two load-shaping knobs (depth, politeness delay) be overridden from
    Railway's Variables tab WITHOUT a redeploy — the incident-response lever for
    the first unattended runs: if the datacenter IP starts getting throttled, drop
    SCRAPER_MAX_PAGES_PER_CITY to 1 or raise SCRAPER_REQUEST_DELAY_SECONDS from the
    dashboard and re-run, no deploy cycle. The constant default keeps local
    behaviour unchanged.
    """
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


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

# City slugs crawled each night — the full GTA (Toronto + Peel + York + Halton +
# Durham) plus the major non-GTA Ontario markets we already covered. rentals_ca
# and padmapper fan out across ALL of these. NOTE (verified 2026-06-25): these are
# DISCOVERY SEEDS, not strict municipal filters — rentals_ca runs a
# proximity/radius search, so a "vaughan" seed also surfaces nearby North York /
# Richmond Hill listings. That's fine: rows are located by their GEOCODED
# postal_code (the search city is never stored), and comps key on postal_code — so
# every discovered listing serves the comps for wherever it actually is. The seeds
# just need to collectively cover the province; precise per-seed accuracy doesn't
# matter.
#
# GTA EXPANSION (2026-07-08): added the 11 missing 905/suburban municipalities so
# Vaughan/Mississauga/Durham/Halton listings get real comps instead of the
# "no comps for this area" pause. All 23 seeds verified to resolve on BOTH sources
# at depth 1 (rentals_ca 200/100 rows each; padmapper 200/~20 rows each; zero
# blocking — see NIGHT_NOTES 2026-07-08). The 5 non-GTA markets (hamilton, ottawa,
# london, kitchener, waterloo) are KEPT, not pruned: the 2026-06-26 depth study
# measured each adding ~90 unique-to-city listings at depth — pruning them would
# regress real coverage. Grouped by region for readability; order is irrelevant
# (whole-run dedup collapses cross-seed overlap).
TARGET_CITIES = (
    # Toronto core
    "toronto",
    # Peel
    "mississauga",
    "brampton",
    "caledon",
    # York
    "vaughan",
    "markham",
    "richmond-hill",
    "newmarket",
    "aurora",
    # Halton
    "oakville",
    "burlington",
    "milton",
    "halton-hills",
    # Durham
    "ajax",
    "pickering",
    "whitby",
    "oshawa",
    "clarington",
    # Non-GTA Ontario markets (kept — each pulls ~90 unique listings at depth)
    "hamilton",
    "ottawa",
    "london",
    "kitchener",
    "waterloo",
)

# Kijiji is the EXCEPTION — it is gated to Toronto only, by design, for now.
# Kijiji filters by a location ID baked into the URL (.../c37l1700273), NOT by the
# city slug, so every slug currently resolves to the same Toronto/GTA results
# (verified 2026-06-25: 87–93% URL overlap across all 12 cities, 0 addresses
# matching the requested city). The cost of running it per-city is NOT corrupted
# comps — rows are located by their geocoded postal_code (search city is never
# stored), so the 12 identical result sets just collapse by source_url and locate
# correctly. The cost is PURELY WASTE: 11× redundant requests for the exact same
# listings, on a source that is aggressive about bot detection — load + block risk
# for zero new coverage. So gate it to one city. Until a verified
# city→Kijiji-location-ID map exists (deferred sub-project — see NIGHT_NOTES
# "Kijiji multi-city blocker"), Kijiji runs Toronto only. Known coverage
# limitation, not a silent skip — change it only when the map is built and verified.
KIJIJI_CITIES = ("toronto",)

# ── Politeness ────────────────────────────────────────────────────────────────
# Env-overridable (see _env_int) — raise from Railway without a redeploy if the
# datacenter IP gets throttled on the first unattended runs.
REQUEST_DELAY_SECONDS = _env_int(
    "SCRAPER_REQUEST_DELAY_SECONDS", 4
)  # min delay per page load
PAGE_LOAD_TIMEOUT_MS = 30_000  # Playwright navigation timeout
# Depth: search result pages crawled per city per source. Kept at 2 after the GTA
# expansion (2026-07-08). IMPORTANT — depth now only scales padmapper + kijiji:
# rentals_ca was rewritten to a single GraphQL query per city (no pagination), so
# it returns its RENTALS_CA_PAGE_SIZE cap (100/city) at ANY depth. The old
# 2026-06-26 "rentals_ca 352/630/909 by depth" table is OBSOLETE (that was the
# retired card scraper). Measured 2026-07-08 across all 23 cities (delay 2s):
#   depth 1 → 1796 distinct after dedupe (rentals 2300 + padmapper 463 + kijiji 46)
#   depth 2 → 2031 distinct after dedupe (rentals 2300 + padmapper 745 + kijiji 92)
# Depth 2 nightly ≈ 7.6 min scrape (delay 4s) + ~1 min geocode ≈ 8.5 min — inside
# the ~10–12 min budget. Depth 3 adds only padmapper page 3 (rentals is flat) for
# ~+280 raw but pushes runtime to ~12 min (at/over budget), so it is left OFF by
# default (tune-up lever below, only after a clean Railway run with the yield
# alarm watching). Zero blocking observed across depth-1/2 full passes + probes.
# Env-overridable (see _env_int): raise to 3 (SCRAPER_MAX_PAGES_PER_CITY=3, deeper
# 905/suburban padmapper yield) or drop to 1 (if the datacenter IP gets throttled)
# from Railway without a redeploy.
MAX_PAGES_PER_CITY = _env_int("SCRAPER_MAX_PAGES_PER_CITY", 2)

# ── rentals.ca GraphQL source ─────────────────────────────────────────────────
# Rentals.ca redesigned its search from a server-rendered listing-card list to a
# Google-Maps SPA whose listings load from an authenticated GraphQL API
# (POST /graphql, operation RentalListingSearch). The old CSS-card scraper broke
# on that redesign (returned 0 — root cause of the 2026-07 Railway zero-yield, NOT
# an IP block: kijiji/padmapper worked from the same datacenter IP). rentals_ca now
# queries that GraphQL API through the page's own browser context (it holds the
# short-lived bearer token + Cloudflare clearance). See sources/rentals_ca.py.
#
# One query per city returns up to RENTALS_CA_PAGE_SIZE listings within
# RENTALS_CA_RADIUS_M of the city centre — there is no pagination. Both are
# env-overridable (see _env_int) so production can ratchet the page size up after a
# clean Railway run WITHOUT a redeploy, the same lever as SCRAPER_MAX_PAGES_PER_CITY.
# Default 100/city keeps the first re-deploy bounded (~realistic per-city yield)
# while the query itself can reach the full inventory (Toronto alone is ~8,900).
RENTALS_CA_PAGE_SIZE = _env_int("SCRAPER_RENTALS_CA_PAGE_SIZE", 100)
RENTALS_CA_RADIUS_M = _env_int("SCRAPER_RENTALS_CA_RADIUS_M", 20_000)  # 20 km

# ── Per-source yield alarm ──────────────────────────────────────────────────────
# A source crawling 23 cities × up to 2 pages should return far more than a
# handful of rows. A near-zero yield means the CSS selectors broke (the site
# changed its markup), NOT that it was a quiet listings night — those are
# different claims and only one is acceptable. The nightly run fails loudly
# (non-zero exit) when any source falls below this floor, so a silently broken
# selector can't masquerade as a successful deploy. Conservative starting floor;
# raise it once real per-night baselines exist (TEMPLATE — spec Section 11.2).
MIN_RAW_ROWS_PER_SOURCE = 5
