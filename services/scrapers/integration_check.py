"""
One-time integration check — NOT part of the automated test suite.

Run with:
  cd services/scrapers
  python integration_check.py

Checks:
  1. Realtor.ca: scrape a live listing page (HTML-parse approach), print all
     fields, query Supabase to confirm the DB write.
  2. Zillow.com US guard: confirm the scraper blocks zillow.com URLs before
     making any network request.
  3. Zillow.ca domain discovery: note that zillow.ca does not appear to be
     a real domain — Canadian listings are on zillow.com, not zillow.ca.

Scraper approach:
  The scraper fetches the public listing page HTML (not the internal JSON API,
  which is blocked by Incapsula bot protection). Data is extracted from:
    a) The embedded dataLayer.push() JavaScript object in the HTML
    b) HTML element IDs for taxes, condo fees, year built, description

Bot protection note:
  Incapsula/Imperva protects Realtor.ca. If the same IP makes repeated
  requests in a short window, responses shrink to ~1-5 KB (bot challenge page).
  The scraper detects this (response < 50 KB) and returns scrape_status='failed'
  with a clear error. Use PROXY_1/PROXY_2/PROXY_3 env vars to rotate IPs.

Does NOT hit any site more than once.
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
ZILLOW_COM_URL = (
    "https://www.zillow.com/homedetails/"
    "332-Ellen-Davidson-Dr-Oakville-ON-L6M-0Y6/462657380_zpid/"
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


def check_zillow_us_block() -> None:
    """Confirm is_us_zillow_url() blocks the .com URL before any network call."""
    section("2 of 3 — ZILLOW.COM US GUARD")
    print(f"  URL: {ZILLOW_COM_URL}\n")

    from listing_type import is_us_zillow_url, is_zillow_ca_url

    is_us = is_us_zillow_url(ZILLOW_COM_URL)
    is_ca = is_zillow_ca_url(ZILLOW_COM_URL)

    print(f"  is_us_zillow_url() -> {is_us}")
    print(f"  is_zillow_ca_url() -> {is_ca}")

    if is_us and not is_ca:
        print(
            "\n  [OK] BLOCK FIRES CORRECTLY -- zillow.com URL is rejected before any"
            "\n    network request is made. The scraper_routes.py route would return:"
            "\n    scrape_status='failed', error='This looks like a US Zillow listing...'"
        )
    else:
        print("\n  [FAIL] UNEXPECTED: guard did not fire as expected.")


def report_zillow_ca_finding() -> None:
    """Report the discovery that zillow.ca does not exist as a real domain."""
    section("3 of 3 — ZILLOW.CA DOMAIN DISCOVERY")
    print(
        "  FINDING: zillow.ca does not appear to be a real domain.\n"
        "  All Canadian property listings (including Oakville, Toronto, Vaughan)\n"
        "  are served from zillow.com — there is no separate Canadian TLD.\n"
        "\n"
        "  Implication for the scraper:\n"
        "    • is_zillow_ca_url() will never match any real listing URL\n"
        "    • The zillow_scraper.py Playwright implementation is unreachable\n"
        "      via the current route dispatch logic in scraper_routes.py\n"
        "\n"
        "  Recommended fix (next dev session):\n"
        "    Option A — Update is_zillow_ca_url() to also match zillow.com URLs\n"
        "               that contain a Canadian postal code in the address slug\n"
        "               (e.g. '-ON-L6M-' in the path).\n"
        "    Option B — Remove Zillow support entirely and add realtor.ca as the\n"
        "               primary source + kijiji.ca for rentals.\n"
        "    Option C — Keep the zillow_scraper.py file as-is and update the route\n"
        "               to detect Canadian zillow.com URLs via province/postal detection\n"
        "               on the slugified address in the URL.\n"
        "\n"
        "  No network request was made to Zillow during this check."
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

    # 2. Zillow.com guard
    check_zillow_us_block()

    # 3. Zillow.ca finding
    report_zillow_ca_finding()

    print(f"\n{SEP}")
    print("  Done. Review output above before marking integration check complete.")
    print(SEP + "\n")


if __name__ == "__main__":
    asyncio.run(main())
