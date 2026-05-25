# PropScout — Future Work

Items recorded here are **not in scope for MVP**. Do not build these until explicitly
prioritised. They are captured so nothing falls through the cracks.

---

## ScraperAPI integration

**What:** Replace the raw `httpx` fetch in `realtor_scraper.py` with a ScraperAPI-proxied
request. ScraperAPI handles Incapsula / Imperva bot protection automatically — no change
to parsing logic, only to the HTTP call.

**Why:** The current scraper works reliably on a fresh IP but gets blocked by Incapsula
after repeated requests in a session. Residential proxy rotation (PROXY_1/2/3) mitigates
this but ScraperAPI provides a cleaner managed solution.

**Cost:** $49/month (Growth plan, 100k API credits).

**When to pursue:** When bot-blocking becomes a consistent production problem that
proxy rotation cannot absorb — not before.

**Implementation note:** The parsing pipeline is unchanged. Only `scrape_listing()` in
`realtor_scraper.py` changes: swap the `httpx.get(url, headers=_HEADERS)` call for
`httpx.get(f"http://api.scraperapi.com/?api_key={SCRAPERAPI_KEY}&url={url}")`.
Add `SCRAPERAPI_KEY` to `.env` and `.env.example`.

---

## CREA DDF partnership

**What:** Official data feed from the Canadian Real Estate Association (CREA). Provides
structured, reliable listing data for all MLS-listed properties in Canada without any
scraping or bot-protection challenges.

**Why:** Would replace the Realtor.ca HTML scraper entirely, eliminate Incapsula issues,
and give access to the complete national listing inventory.

**When to pursue:** When PropScout has **50+ paying users** — CREA requires a minimum
participant threshold before granting DDF access.

**Contact:** https://www.crea.ca/real-estate-professionals/mls-listings/data-distribution-facility/

---

_Last updated: 2026-05-25_
