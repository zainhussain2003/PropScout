# `_unported/` — salvaged scraper work, not wired in

Code rescued from `fix/data-contract-mismatches` (PR #6, **closed, never merged**)
before that branch was deleted on 2026-09-05. It was the only copy — none of it
exists anywhere else in the repo's history on `master`.

**Nothing here is imported by the running system.** It is kept because it maps
directly to open `docs/MVP_TODO.md` items and would otherwise be rebuilt from
scratch by someone who did not know it existed.

## What is here

| File                     | Lines | Maps to                                               |
| ------------------------ | ----- | ----------------------------------------------------- |
| `zillow_scraper.py`      | 506   | MVP_TODO "Zillow.ca scraper" — 7 unchecked items      |
| `zillow_scraper_test.py` | 423   | tests for the above                                   |
| `listing_type.py`        | 139   | MVP_TODO "Listing type detection" — 3 unchecked items |
| `listing_type_test.py`   | 105   | tests for the above                                   |
| `rate_limiter.py`        | 100   | file-based per-source request throttle                |

## Why it does not run as-is

These were written against the **flat module layout** the scrapers package used in
May 2026. `zillow_scraper.py` imports:

```python
from db import log_scrape, upsert_listing      # superseded
from listing_type import parse_listing_type    # here in _unported/
from province import detect_province           # superseded
from rate_limiter import wait_for_rate_limit   # here in _unported/
```

Two of those dependencies were deliberately **not** salvaged, because current
equivalents exist and are better:

- `db.py` → superseded by `services/scrapers/services/supabase_service.py`
- `province.py` → superseded by `apps/api/src/constants/provinces.ts` and
  `services/calc-engine/constants/provinces.py`

The package has since moved to `sources/` + `services/`, with shared Playwright
launch and politeness delays in `sources/browser.py` and tunables in
`constants.py`. So adopting this is a **port, not a copy**.

## To port `zillow_scraper.py`

1. Move it to `sources/zillow.py`, matching the shape of `sources/rentals_ca.py`.
2. Replace the `db` import with `services/supabase_service.py`.
3. Replace `province.detect_province` with the existing province constants.
4. Drop `rate_limiter` in favour of `sources/browser.py`'s politeness delay,
   unless a per-source file-backed throttle is specifically wanted.
5. Re-point the tests, move them beside the module as `sources/zillow_test.py`,
   and delete this directory.

Note `FUTURE.md` records Cloudflare bypass on Zillow as **blocked/deferred** —
read that before investing in this.

## Excluded from the test run

`conftest.py` sets `collect_ignore_glob = ["_unported/*"]`. These tests import
modules that no longer exist, so collecting them would break the suite. Remove
that line as part of porting.
