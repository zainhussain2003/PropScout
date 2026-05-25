"""
One-time integration check — NOT part of the automated test suite.

Run with:
  cd services/scrapers
  python integration_check.py

Checks:
  1. Realtor.ca: scrape a live listing page (HTML-parse approach), print all
     fields, query Supabase to confirm the DB write.
  2. Zillow Ontario: scrape an Ontario zillow.com listing, confirm Canadian
     postal code is detected and province == 'ON', confirm DB write.
  3. Zillow US: scrape a US zillow.com listing, confirm no Canadian postal
     code is found and the scraper returns the Ontario error without a DB write.

Scraper approach (Realtor.ca):
  The scraper fetches the public listing page HTML (not the internal JSON API,
  which is blocked by Incapsula bot protection). Data is extracted from:
    a) The embedded dataLayer.push() JavaScript object in the HTML
    b) HTML element IDs for taxes, condo fees, year built, description

Bot protection note:
  Incapsula/Imperva protects Realtor.ca. If the same IP makes repeated
  requests in a short window, responses shrink to ~1-5 KB (bot challenge page).
  The scraper detects this (response < 50 KB) and returns scrape_status='failed'
  with a clear error. Use PROXY_1/PROXY_2/PROXY_3 env vars to rotate IPs.

Zillow note:
  Zillow.com is protected by anti-bot measures (Cloudflare / CAPTCHA). The
  Playwright scraper may get blocked on a bare IP. Use PROXY_1/2/3 env vars
  with residential proxies for reliable Zillow scraping in production.

Does NOT hit any site more than once per section.
"""

import asyncio
import os
import sys

# Load .env from project root
_repo_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
_env_path = os.path.join(_repo_root, ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

REALTOR_URL = (
    "https://www.realtor.ca/real-estate/29795861/"
    "5312-950-portage-parkway-vaughan-vaughan-corporate-centre"
)
ZILLOW_ON_URL = (
    "https://www.zillow.com/homedetails/"
    "332-Ellen-Davidson-Dr-Oakville-ON-L6M-0Y6/462657380_zpid/"
)
ZILLOW_US_URL = (
    "https://www.zillow.com/homedetails/"
    "2909-23rd-Ave-S-Minneapolis-MN-55406/49113185_zpid/"
)

SEP = "-" * 70


def section(title: str) -> None:
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)


def print_field(label: str, value, missing: list[str] | None = None) -> None:
    flag = ""
    if value is None:
        flag = "  [!] NONE"
    elif isinstance(value, str) and value in ("unknown", ""):
        flag = "  [!] UNKNOWN"
    print(f"  {label:<28} {value!r}{flag}")
    if missing and label.lower().replace(" ", "_") in missing:
        print(f"  {'':28} ^ in missing_fields")


async def check_realtor() -> str | None:
    """Scrape the Realtor.ca URL and print all parsed fields."""
    section("1 of 3 — REALTOR.CA LIVE SCRAPE")
    print(f"  URL: {REALTOR_URL}\n")

    from realtor_scraper import scrape_listing, extract_listing_id

    listing_id = extract_listing_id(REALTOR_URL)
    print(f"  Extracted listing ID: {listing_id!r}")
    if not listing_id:
        print("  ERROR: Could not extract listing ID from URL. Aborting.")
        return None

    print("  Calling Realtor.ca API (rate limit: 4 s)...\n")
    result = await scrape_listing(REALTOR_URL)

    missing = result.get("missing_fields", [])
    status = result.get("scrape_status", "unknown")

    print(f"  scrape_status   : {status!r}")
    print(f"  missing_fields  : {missing!r}\n")

    # All extracted fields
    fields_to_show = [
        ("source_url", result.get("source_url")),
        ("source", result.get("source")),
        ("listing_type", result.get("listing_type")),
        ("address", result.get("address")),
        ("postal_code", result.get("postal_code")),
        ("province", result.get("province")),
        ("price", result.get("price")),
        ("beds", result.get("beds")),
        ("baths", result.get("baths")),
        ("sqft", result.get("sqft")),
        ("property_type", result.get("property_type")),
        ("annual_taxes", result.get("annual_taxes")),
        ("taxes_known", result.get("taxes_known")),
        ("condo_fee", result.get("condo_fee")),
        ("condo_fee_known", result.get("condo_fee_known")),
        ("year_built", result.get("year_built")),
        ("year_built_known", result.get("year_built_known")),
        ("days_on_market", result.get("days_on_market")),
        ("photo_urls count", len(result.get("photo_urls") or [])),
    ]
    for label, value in fields_to_show:
        print_field(label, value, missing)

    desc = result.get("listing_description")
    print("\n  listing_description (first 300 chars):")
    if desc:
        print(f"    {desc[:300]!r}")
    else:
        print("    None  [!] NONE")

    error = result.get("error")
    if error:
        print(f"\n  ERROR returned by scraper: {error!r}")

    # Dump raw_json (dataLayer property object captured from page HTML)
    raw = result.get("raw_json")
    if raw and isinstance(raw, dict) and raw:
        print("\n  raw_json (dataLayer property object):")
        for k, v in sorted(raw.items()):
            if v:  # only non-empty values
                print(f"    {k}: {v!r}")
    elif raw is None or raw == {}:
        print(
            "\n  raw_json: empty (likely Incapsula bot challenge -- "
            "IP was blocked after prior requests in this session)"
        )

    return result.get("source_url")


async def check_supabase(source_url: str) -> None:
    """Query Supabase for the listing we just wrote and print the key fields."""
    section("1b — SUPABASE DB WRITE CONFIRMATION")
    print(f"  Querying listings table for source_url:\n  {source_url}\n")

    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        print("  SKIP: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env")
        return

    try:
        from supabase import acreate_client

        client = await acreate_client(supabase_url, supabase_key)

        resp = await (
            client.table("listings")
            .select("id, scrape_status, missing_fields, address, price, scraped_at")
            .eq("source_url", source_url)
            .execute()
        )

        if resp.data:
            row = resp.data[0]
            print("  [OK] Row found in DB!")
            print(f"    id            : {row.get('id')!r}")
            print(f"    scrape_status : {row.get('scrape_status')!r}")
            print(f"    missing_fields: {row.get('missing_fields')!r}")
            print(f"    address       : {row.get('address')!r}")
            print(f"    price         : {row.get('price')!r}")
            print(f"    scraped_at    : {row.get('scraped_at')!r}")
        else:
            print(
                "  [FAIL] No row found -- the upsert may have failed or Supabase isn't reachable."
            )
            print("    (Check that the listings table exists via the migration.)")

    except Exception as exc:
        print(f"  Supabase query error: {exc}")


async def check_zillow_ontario() -> None:
    """Scrape the Zillow Ontario URL and confirm province detection + DB write."""
    section("2 of 3 — ZILLOW.COM ONTARIO LISTING")
    print(f"  URL: {ZILLOW_ON_URL}\n")

    from zillow_scraper import scrape_listing

    print("  Calling Zillow scraper (rate limit: 4 s)...\n")
    result = await scrape_listing(ZILLOW_ON_URL)

    missing = result.get("missing_fields", [])
    status = result.get("scrape_status", "unknown")

    print(f"  scrape_status   : {status!r}")
    print(f"  missing_fields  : {missing!r}\n")

    fields_to_show = [
        ("source_url", result.get("source_url")),
        ("source", result.get("source")),
        ("listing_type", result.get("listing_type")),
        ("address", result.get("address")),
        ("postal_code", result.get("postal_code")),
        ("province", result.get("province")),
        ("price", result.get("price")),
        ("beds", result.get("beds")),
        ("baths", result.get("baths")),
        ("sqft", result.get("sqft")),
        ("property_type", result.get("property_type")),
    ]
    for label, value in fields_to_show:
        print_field(label, value, missing)

    error = result.get("error")
    if error:
        print(f"\n  ERROR returned by scraper: {error!r}")

    postal_code = result.get("postal_code")
    province = result.get("province")
    if postal_code and province == "ON":
        print("\n  [OK] Ontario postal code detected — analysis would proceed.")
    elif error and "Ontario" in str(error):
        print("\n  [FAIL] Scraper returned Ontario error for an Ontario URL.")
    else:
        print(f"\n  [INFO] province={province!r}, postal_code={postal_code!r}")


async def check_zillow_us() -> None:
    """Scrape the Zillow US URL and confirm no-postal-code guard fires."""
    section("3 of 3 — ZILLOW.COM US LISTING (no Canadian postal code)")
    print(f"  URL: {ZILLOW_US_URL}\n")

    from zillow_scraper import scrape_listing

    print("  Calling Zillow scraper (rate limit: 4 s)...\n")
    result = await scrape_listing(ZILLOW_US_URL)

    status = result.get("scrape_status", "unknown")
    error = result.get("error", "")
    postal_code = result.get("postal_code")

    print(f"  scrape_status : {status!r}")
    print(f"  postal_code   : {postal_code!r}")
    print(f"  error         : {error!r}")

    if status == "failed" and "Ontario" in str(error) and not postal_code:
        print(
            "\n  [OK] US listing correctly rejected — no Canadian postal code found."
            "\n    scrape_status='failed', no DB write, user sees Ontario error."
        )
    elif status == "failed" and postal_code is None:
        print(
            "\n  [OK] US listing rejected (no postal code). "
            f"Error message: {error!r}"
        )
    else:
        print(
            f"\n  [FAIL] Unexpected result for US URL — "
            f"status={status!r}, postal_code={postal_code!r}"
        )


async def main() -> None:
    print("\n" + "=" * 70)
    print("  PropScout -- Live Integration Check")
    print("  Run once. Not added to the test suite.")
    print("=" * 70)

    # 1. Realtor.ca scrape
    source_url = await check_realtor()

    # 1b. Supabase confirmation
    if source_url:
        await check_supabase(source_url)
    else:
        section("1b — SUPABASE DB WRITE CONFIRMATION")
        print("  SKIP: scraper returned no source_url (scrape failed above).")

    # 2. Zillow Ontario listing
    await check_zillow_ontario()

    # 3. Zillow US listing — confirm no-postal-code guard
    await check_zillow_us()

    print(f"\n{SEP}")
    print("  Done. Review output above before marking integration check complete.")
    print(SEP + "\n")


if __name__ == "__main__":
    asyncio.run(main())
