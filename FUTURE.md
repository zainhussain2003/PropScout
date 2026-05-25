# PropScout — Future Work

Items recorded here are **not in scope for MVP**. Do not build these until explicitly
prioritised. They are captured so nothing falls through the cracks.

---

## ~~ScraperAPI integration~~ — COMPLETED

**Status:** Integrated 2026-05-25 after three confirmed IP-level Incapsula blocks.
Persistent 216KB challenge page across all three runs confirmed the IP was flagged at
network level — header tricks and jitter could not help. ScraperAPI is now the request
layer for Realtor.ca. `render=true` required for Incapsula bypass.

**What was changed:**

- `realtor_scraper.py` — `scrape_listing()` now routes through `api.scraperapi.com`
  when `SCRAPER_API_KEY` is set. Falls back to direct `httpx` request when key is absent
  (local development on clean IPs still works without a key).
- `SCRAPER_API_KEY` added to `.env` (live key) and `.env.example` (placeholder).
- Two unit tests added in `realtor_scraper_test.py` confirming ScraperAPI routing when
  key is set and direct fallback when key is absent.
- `render=true` is required — Incapsula serves the challenge page to headless requests
  without a real browser session.

**Cost:** $49/month (Hobby plan). Key stored in `.env` only — never committed.

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

_Last updated: 2026-05-25 — ScraperAPI marked complete_
