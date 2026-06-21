# Overnight work log — 2026-06-21

Worked through Phase 1 autonomously while you slept. Everything I could do without your input is done. Tests are green, end-to-end smoke passed against your real Supabase + a local calc engine + the Fastify API.

## Done

1. **`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` added to `.env`** — copied from existing backend `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Frontend can now talk to Supabase.

2. **Wired `fetchRentalComps` into the orchestrator** (`apps/api/src/routes/analysis.ts`). Was hardcoded `null` after the merge — now:
   - Called after `getListingByToken` (uses `postalCode` + `beds`)
   - Result feeds both the calc engine `rental` payload AND the final `Analysis.rentalComps`
   - Falls back to a low-confidence estimate derived from the listing's own rent (or 0.5%/mo of price) when the FSA has no comps yet, so the calc engine still produces metrics
   - Narrative input also gets the real `rentMid` / `compCount` / `rentConfidence`

3. **`getWalkScore` was already wired** (line 268 of `analysis.ts`). No change needed.

4. **Wired `SunScoutPanel` to real `analysis.sunScout`** in TenantReport and LandlordPage (were hardcoded `null`). InvestorReport was already wired via `useInvestorReport.sunScout`. PersonalBuyerPage uses HEAD's inline placeholder by design.

5. **Fixed the 4 `authService.degraded.test.ts` failures** properly — the tests now use `vi.stubEnv` + `vi.resetModules` to force the auth client into degraded mode regardless of whether `VITE_SUPABASE_URL` is set on the machine. Was previously env-dependent.

6. **End-to-end smoke test added** at `scripts/smoke-test.mjs`. Inserts a fixture listing + pending analyses row into real Supabase → POSTs `/analysis` → verifies the response shape AND that the analyses row got persisted with `calculated_metrics`, `deal_score`, `ai_narrative` → GETs `/analysis/:token` → cleans up. **Smoke passed on first run** against your live Supabase project.

## Verification results

- **API typecheck:** clean
- **Web typecheck:** clean
- **API tests:** 96/96 pass
- **Web tests:** 792/792 pass (was 788/792 — the 4 degraded auth tests now pass)
- **Calc-engine pytest:** 286/286 pass (not re-run, unchanged from prior commit)
- **Scrapers pytest:** 105/105 pass (not re-run, unchanged from prior commit)
- **End-to-end smoke against live Supabase + local calc engine + local API:**

  ```
  ✓ token matches
  ✓ analysis present
  ✓ mode is investor
  ✓ metrics.capRate is a number
  ✓ dealScore present
  ✓ narrative is string
  ✓ deal_score persisted: 17
  ✓ calculated_metrics has 17 fields
  ✓ GET returned status=complete
  ```

## Blocked on you (do these when you wake up)

### 1. ScraperAPI key

The per-listing flow works end-to-end once a listing exists in `listings`. Right now nothing populates that table from a Realtor.ca URL — `POST /scrape` calls the Python scraper service which calls ScraperAPI.

- Sign up at https://www.scraperapi.com/ (free tier = 1000 requests/month)
- Add to `.env`: `SCRAPER_API_KEY=<your key>`

### 2. Try a real URL (after ScraperAPI key + scraper service running)

Once #1 is done:

- Terminal A: `cd services/calc-engine && python -m uvicorn main:app --port 8000`
- Terminal B: `cd services/scrapers && python -m uvicorn main:app --port 8001`
  - First time only: `pip install -r services/scrapers/requirements.txt` and `python -m playwright install --with-deps chromium`
- Terminal C: `npm --prefix apps/api run dev` (port 3001)
- Terminal D: `npm --prefix apps/web run dev` (port 5173)
- Browser → http://localhost:5173 → paste an Ontario Realtor.ca URL → click Analyze → pick a mode

Expected: scrape → token → `/analyzing` polls → real report at `/r/<token>`.

If something breaks, the most likely culprits in order:

- `SCRAPER_API_KEY` typo or unrecognised by ScraperAPI
- ScraperAPI didn't render the page properly — `realtor_scraper.py` returns `None` → 422 SCRAPER_FAILED. Try a different URL.
- Frontend hangs on `/analyzing` forever — orchestrator threw before persisting. Check the API terminal logs.

### 3. Stale `requirements.txt` files (not blocking, but worth knowing)

Trying `pip install -r services/calc-engine/requirements.txt` on your Python 3.14 fails because `pydantic-core==2.8.2` has no Python 3.14 wheel. Your installed versions are newer (fastapi 0.136, pvlib 0.15, pydantic 2.13) and they work fine — the pin file is just stale. If you ever wipe site-packages, the file needs updating. I didn't change it because changing pins risks breaking the tests.

I did `pip install "uvicorn[standard]"` separately (was missing from your env, not in requirements.txt as installed). Now present.

## What I didn't touch

- Schools / EQAO / Fraser / Google Places data — Phase 4 work, big data effort
- CMHC vacancy / StatCan demographics — Phase 4
- `flag_overrides` table + override UI — Phase 5
- Stripe products + webhook setup — Phase 6
- Golden dataset collection (50 labelled Ontario listings) — Phase 7
- PR9 integration test — Phase 7
- Nightly scraper Railway deploy — Phase 2 (needs you to authorize Railway)
- PDF generation — Phase 8 (deferred)

## What to do when you wake up

1. Read this file's "Blocked on you" section
2. Grab a ScraperAPI key (~2 min)
3. Run the 4-terminal local stack and paste a real Ontario URL
4. If it works → next stop is Phase 4 (schools data) or Phase 6 (Stripe), your call
5. If it breaks → paste the error from the API terminal and we'll fix it
