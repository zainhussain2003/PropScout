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

## Rental comps CSS selector update required

**What:** The CSS selectors in `rental_comps_scraper.py` are TEMPLATE CODE and do not
match the live DOM of Rentals.ca, Kijiji, or PadMapper. Every sub-scraper returned
0 listings in the 2026-05-25 dry run with the warning "listing cards did not appear".

**Evidence from dry run (2026-05-25):**

- All 12 sub-scrapes completed without errors (exit 0, Supabase scrape_logs written ✅)
- Playwright launched successfully and navigated to each URL ✅
- `wait_for_selector()` timed out on all 12 attempts — cards rendered but under different class names
- 0 listings extracted across all 4 cities × 3 sources

**What is needed per site:**

1. **Rentals.ca** — open `https://rentals.ca/toronto` in a real browser, inspect the listing
   card element, update the selectors in `scrape_rentals_ca()`. Current guess:
   `[class*='listing-card'], [data-testid='listing-item'], article.listing`

2. **Kijiji** — open `https://www.kijiji.ca/b-apartments-condos/toronto/c37l1700273` and inspect.
   Also verify location IDs for Hamilton/Ottawa/Mississauga are still correct. Current guess:
   `[data-testid='listing-card-list-item'], li[class*='regular-ad']`

3. **PadMapper** — open `https://www.padmapper.com/apartments/toronto-on` and inspect.
   PadMapper is a JS-heavy SPA; a longer `wait_for_selector()` timeout may be needed.
   Current guess: `[class*='ListingCard'], [class*='property-card']`

**If sites block on data-centre IP (Railway):**
Apply the same ScraperAPI pattern used for Realtor.ca — route Playwright through
ScraperAPI residential proxies. See `realtor_scraper.py` for the pattern.

**When to pursue:** Before or during Week 4–5 when rental comps are needed for the
investor report. Correct selectors are required for real comp data to flow.

---

## Railway environment variables required

The following env vars must be set in the Railway project dashboard under
**Variables** for the scraper service before the nightly job will run.
They are already present in `.env` locally — Railway does not read `.env`.

| Variable                          | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `SUPABASE_URL`                    | Supabase project URL                                                      |
| `SUPABASE_SERVICE_ROLE_KEY`       | Full DB access — backend only, never expose to frontend                   |
| `SCRAPER_API_KEY`                 | Incapsula bypass for Realtor.ca ($49/mo Hobby plan)                       |
| `PROXY_1` / `PROXY_2` / `PROXY_3` | Optional residential proxies — leave blank until Zillow bypass is pursued |
| `RATE_LIMITER_STATE`              | Optional — defaults to `/tmp/propscout_rate_state.json`                   |

**How to set them:** Railway dashboard → project → service → Variables tab → add each key.

---

_Last updated: 2026-05-25 — ScraperAPI marked complete_
