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

## Zillow Cloudflare bypass

**What:** Make the Zillow scraper reliably retrieve real page content past Cloudflare
bot protection.

**Why:** Zillow.com is protected by Cloudflare. Bare Playwright on a data-centre IP gets
a challenge page — no DOM content is returned, so no fields parse. The postal code gate
then fires and the scraper returns the Ontario error even for valid Ontario URLs.

**Two things required when this is implemented:**

1. **Residential proxies** — PROXY_1 / PROXY_2 / PROXY_3 env vars are already stubbed
   in `zillow_scraper.py`. Point them at a residential proxy provider (Bright Data,
   Oxylabs, or SmartProxy). Data-centre IPs are fingerprinted; residential IPs are not.

2. **playwright-stealth** — masks Playwright's bot fingerprint (navigator.webdriver,
   Chrome automation flags, etc.):
   ```
   pip install playwright-stealth
   ```
   ```python
   from playwright_stealth import stealth_async
   # in scrape_listing(), after context.new_page():
   await stealth_async(page)
   ```

**When to pursue:** Only when real users are actively pasting Zillow URLs. Check usage
logs first — if Zillow URLs are rare, skip the proxy spend entirely and keep the message
below. If demand is clear, implement both items together (proxies alone are not enough;
stealth alone is not enough).

**Current user-facing message (already in place via the postal code gate):**
`"Property does not appear to be in Ontario."`

**Replace with this more honest message when Zillow blocking is confirmed as the cause:**
`"Zillow listings are not fully supported yet. Please paste the equivalent Realtor.ca listing URL for the best results."`

This sets correct expectations and routes users to the more reliable source without
requiring any scraper changes in the short term.

---

_Last updated: 2026-05-25_
