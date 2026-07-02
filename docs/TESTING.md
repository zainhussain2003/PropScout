# PropScout — MVP Testing Guide

Last updated: May 2026
Reference spec: `propscout_platform_spec.md`
Build tasks: `MVP_TODO.md`

This file tells you exactly what to test after each week of development, how to test it manually yourself, and which tests require other pieces to be built first before they can be verified end-to-end.

**Legend:**

- ✋ Manual test — you do this yourself in a browser or terminal
- 🔗 Combined test — cannot be tested alone, depends on another component being built first
- 🤖 Automated test — run via pytest or a script

---

## Week 1–2 — Data pipeline

### Realtor.ca scraper

**✋ Test 1 — Basic scrape returns clean data**

1. Find 3 real Realtor.ca listing URLs — one condo, one detached house, one rental
2. Run the scraper against each URL directly (call the function in a Python terminal or via a test script)
3. Print the raw JSON output
4. Verify every field is populated: address, price, beds, baths, property type, taxes, condo fee (for the condo), year built, listing description, photo URLs
5. Pass: all fields present or correctly marked as unknown (not silently null)
6. Fail: any field silently missing without a `_known: false` flag

**✋ Test 2 — Condo fee extraction**

1. Find a Realtor.ca condo listing that shows a maintenance fee in the listing details
2. Run the scraper
3. Verify `condo_fee_monthly` is populated and `condo_fee_known` is `true`
4. Find a condo listing where the fee is buried in the description text (not in the structured sidebar)
5. Verify the scraper either finds it via description parsing or correctly sets `condo_fee_known: false`

**✋ Test 3 — Scraper failure fallback**

1. Pass a deliberately broken URL to the scraper (e.g. an expired listing or a non-listing page)
2. Verify the scraper returns a partial data object — not a crash, not an empty object
3. Verify `condo_fee_known: false` and `year_built_known: false` are set on missing fields
4. Pass: graceful partial return. Fail: exception thrown or silent empty response

**✋ Test 4 — For-sale vs for-rent detection**

1. Paste a Realtor.ca for-sale URL — verify `listing_type: for_sale` returned
2. Paste a Realtor.ca for-rent URL — verify `listing_type: for_rent` returned
3. Pass: correct classification every time

---

### Zillow.ca scraper

**✋ Test 5 — Zillow Canadian listing scrape**

1. Find a Zillow.ca listing for an Ontario property
2. Run the scraper, verify same fields as Realtor.ca test
3. Pass: clean JSON with all available fields populated

**✋ Test 6 — US property rejection**

1. Paste a Zillow.com US listing URL (e.g. a New York property)
2. Verify the scraper returns an error flag, not property data
3. The response should indicate this is a non-Canadian property
4. Pass: error returned. Fail: US property data returned silently

---

### Rental comps scraper

**🤖 Test 6a — Automated pipeline suite**
Run from `services/scrapers/`: `python -m pytest normalization_test.py dedupe_test.py rental_comps_scraper_test.py -v`
Covers rent parsing (weekly ×4.33, daily discarded, sanity bounds), bed parsing (Studio→0, dens not counted), Ontario postal gate, in-batch + 7-day-window dedupe, geocode failure tolerance, and source-failure isolation. 50 tests — must pass before any scraper change merges. No network required (sources, Supabase, and Mapbox are mocked).

**⚠️ Note:** Full rental comps testing requires the nightly scraper to have run at least once and populated the `rental_listings` table. On day one of building, the database will be empty. Start the scraper running immediately and let it accumulate for several days before testing comp results.

**✋ Test 7 — Nightly scraper runs and stores data**

1. Trigger the scraper manually (don't wait for the nightly schedule)
2. Check the Supabase `rental_listings` table directly
3. Verify new rows are appearing with: source, address, postal code, beds, rent_monthly, scraped_at
4. Verify weekly rents are being converted to monthly (any Kijiji listings showing weekly prices should be multiplied by 4.33)
5. Pass: rows appearing with correct data. Fail: table empty or rent values unrealistic

**✋ Test 8 — Deduplication**

1. Run the scraper twice in a row on the same day
2. Count rows in `rental_listings` before and after the second run
3. Pass: row count does not double for listings that were already scraped
4. Fail: duplicate entries appearing for the same address + rent + beds

**🔗 Test 9 — Comp query returns results (combined with calc engine)**
Cannot be fully tested until the comp query function is wired into the calc engine in Week 2–3. At this stage you can test the query function in isolation by calling it directly with a known Ontario postal code and verifying it returns a result set with the correct percentile breakdown.

---

### Province detection

**✋ Test 10 — Ontario postal codes pass**

1. Run the province detection function with: L4K 5W4 (Vaughan), M5V 1J1 (Toronto), K1A 0A9 (Ottawa)
2. All three should return `province: ON` and pass the Ontario gate
3. Pass: analysis allowed to proceed

**✋ Test 11 — Non-Ontario postal codes are blocked**

1. Run with: V6B 1A1 (Vancouver BC), T2P 1J9 (Calgary AB), H3B 1A1 (Montreal QC)
2. All three should return the province code and block the analysis
3. Pass: province gate triggered, waitlist prompt shown

---

## Week 2–3 — Calc engine

**⚠️ Note:** All calc engine tests should be verified against a manual spreadsheet calculation first. Build the spreadsheet before running the engine so you have a known correct answer to compare against.

**✋ Test 12 — Calibration test (most important calc test)**
Use Unit 5702, 5 Buttermill Ave, Vaughan as the calibration property. This property has known values from the spec.

Inputs:

- Purchase price: $729,900
- Annual taxes: $3,326
- Condo fee: $761/mo
- Estimated rent: $2,900/mo
- Down payment: 20%
- Mortgage rate: 4.79%
- Amortization: 25 years

Expected outputs (verify each):

- Monthly mortgage payment: ~$3,340
- Total monthly expenses: ~$4,733
- Monthly cash flow: approximately −$1,833
- Annual cash flow: approximately −$21,996
- NOI: approximately $18,082
- Cap rate: approximately 2.5%
- DSCR: approximately 0.45x
- Deal score: approximately 9/100

Pass: all outputs within 2% of expected values
Fail: any output off by more than 5% — find the formula error before proceeding

**✋ Test 13 — OSFI stress test**

1. Use any Ontario property with a 4.79% contract rate
2. Verify qualifying rate = max(4.79 + 2, 5.25) = 6.79%
3. Verify the qualifying monthly payment is calculated at 6.79%, not 4.79%
4. Pass: qualifying payment is higher than base case payment

**✋ Test 14 — Ontario LTT calculation**
Test three price points:

| Purchase price | Expected LTT (non-Toronto) |
| -------------- | -------------------------- |
| $400,000       | $4,475                     |
| $730,000       | $11,475                    |
| $1,000,000     | $16,475                    |

Calculate manually using the brackets in spec Section 6, then verify the engine matches.
Also test a Toronto address — LTT should be approximately double.

**✋ Test 15 — Deal score formula**

1. Run the scoring function with a "perfect deal" (cap rate 6.5%, cash flow +$600/mo, CoC 9%, DSCR 1.3x, low vacancy, no risk flags)
2. Verify score is 80+ (should be close to 90–95)
3. Run with the 5702 Buttermill inputs
4. Verify score is approximately 9
5. Run with a borderline deal (cap rate 4%, cash flow +$150/mo, DSCR 1.05x)
6. Verify score falls in the 50–64 caution range
7. Pass: scores are consistent, deterministic (same inputs = same score every time)

**✋ Test 16 — Maintenance reserve by age**

1. Input a post-2010 property — verify reserve = 0.5% of value / 12
2. Input a 1990 build — verify reserve = 1.0% of value / 12
3. Input a 1975 build — verify reserve = 1.5% of value / 12 and the pre-1980 risk flag is triggered

**✋ Test 17 — Four financing scenarios**
Run the calc engine and verify all four scenarios return different but plausible values:

1. Base case (20% down, current rate, 25yr)
2. OSFI stress (same down, qualifying rate)
3. Higher down (35% down, current rate, 25yr)
4. Conservative (20% down, rate +2%, 25yr)
   Pass: scenario 2 always has the highest payment, scenario 3 always has the lowest

---

## Week 3–4 — Frontend skeleton

**✋ Test 18 — URL input validation**

1. Paste a valid Realtor.ca URL — verify it passes validation
2. Paste a valid Zillow.ca URL — verify it passes validation
3. Paste a random URL (e.g. google.com) — verify inline error message appears
4. Paste a Zillow.com US listing URL — verify it passes URL validation but gets blocked after scrape
5. Paste a blank input and click analyse — verify error message appears

**✋ Test 19 — Mode selection modal**

1. Paste a for-sale URL — verify the investment vs personal use modal appears
2. Select Investment — verify Report A layout loads
3. Go back, select Personal Use — verify Report B layout loads
4. Paste a for-rent URL — verify the tenant vs landlord modal appears
5. Select Tenant — verify Report C loads without requiring login
6. Select Landlord — verify Report D layout loads

**✋ Test 20 — Progress display during scraping**

1. Paste a URL and watch the progress display
2. Verify fields appear progressively as they are confirmed — not all at once
3. If a field is missing (e.g. condo fee not found), verify it appears as an amber "enter manually" prompt
4. Verify the progress display does not just show a spinner with no information

**✋ Test 21 — Manual entry fallback**

1. Simulate a scraper failure (or use a URL that returns partial data)
2. Verify the manual entry form appears with whatever fields were captured pre-filled
3. Verify missing required fields (condo fee for condos) are highlighted in amber
4. Fill in the missing fields manually and submit
5. Verify the analysis runs on the combined scraper + manual data

**✋ Test 22 — Province gate**

1. Paste a Realtor.ca listing from BC or Alberta
2. Verify the analysis does not run
3. Verify the province gate screen appears with the correct province name
4. Verify the email capture form works and stores the email + province to Supabase `waitlist` table

**🔗 Test 23 — Tier gating (blurred sections)**
Cannot be fully tested until Supabase auth and Stripe are set up in Week 7–8. At this stage, manually set a test user's tier in Supabase to "free" and verify the blurred preview appears on the correct sections. Then set tier to "pro" and verify the sections unlock.

---

## Week 4–5 — School and neighbourhood data

**✋ Test 24 — School discovery**

1. Use a known address in Toronto (e.g. 5 Buttermill Ave, Vaughan)
2. Call the Google Places API school lookup
3. Verify at least 1 elementary, 1 middle, and 1 high school are returned
4. Verify distance and drive time are included in the response
5. Verify the school names are real schools (cross-check on Google Maps)

**✋ Test 25 — EQAO score matching**

1. Take a school name returned by Google Places
2. Look it up in the Supabase `schools` table
3. Verify the EQAO score is present and is a number between 0 and 10
4. Cross-check the score against the EQAO website directly for one school
5. Pass: scores match. Fail: scores missing or clearly wrong

**✋ Test 26 — Fraser Institute ranking**

1. Same process as Test 25 but for Fraser rank percentile
2. Verify the provincial percentile is a number between 0 and 100
3. Cross-check one school against fraserinstitute.org

**✋ Test 27 — Walk Score and Transit Score**

1. Call the Walk Score API with a known address
2. Verify two scores are returned: Walk Score and Transit Score
3. Use 5 Buttermill Ave, Vaughan — expected Walk Score approximately 72, Transit Score approximately 85
4. Use a rural address — verify scores are lower (below 30)
5. Pass: scores are plausible for the location

**✋ Test 28 — CMHC vacancy rate**

1. Query the CMHC API for Vaughan / York Region
2. Verify a vacancy rate percentage is returned
3. Verify the value is between 0% and 10% (anything outside this range is suspicious)
4. Cross-check against CMHC's published rental market report for the same city

---

## Week 5–6 — Extraction pipeline and SunScout

### Extraction pipeline

**🤖 Test 29 — Regex rules (run before building Haiku integration)**
Write a simple Python test that runs each regex pattern against a known string:

```
"The second room has a glass sliding door" → glass_door_bedroom: True
"Finished lower level with separate entrance" → is_basement_unit: True
"Parking available upon request" → parking_unclear: True
"Versatile den perfect as a home office" → unverified_bedroom: True
"Spacious primary bedroom with walk-in closet" → all flags: False
```

Pass: all 5 cases return the correct result
This can be run completely standalone before any other component exists

**🤖 Test 30 — Golden dataset regression suite**
This is the most important test in the entire pipeline. Do not proceed to Week 7 until this passes.

1. Collect 50+ real Ontario listing descriptions (copy from Realtor.ca and Zillow.ca)
2. For each one, manually label the correct flags (what a human would say is true/false)
3. Run the full pipeline (regex + Haiku + logic gate) against each
4. Count how many flags match the manual labels
5. Pass: 95% or above accuracy across all cases
6. Fail: below 95% — tune the Haiku extraction prompt and re-run until it passes

Note: aim for at least 10 examples of each flag type, including negative examples (descriptions that should NOT trigger the flag). Edge cases are the most valuable — look for listings with creative/misleading language.

**✋ Test 31 — Haiku JSON output format**

1. Send a single listing description to Claude Haiku with the extraction prompt
2. Verify the raw response is valid JSON with no markdown fencing, no preamble
3. Verify every expected key is present in the response
4. Verify confidence scores are integers between 0 and 100
5. Verify reason strings are short and meaningful
6. Test with a completely empty description — verify all flags return false with confidence 0

**✋ Test 32 — Confidence threshold behaviour**

1. Find a listing description where Haiku returns a flag with confidence between 60 and 84
2. Verify the flag appears as amber in the UI, not red
3. Verify the amber flag does NOT deduct from the deal score
4. Find a case where confidence is 85 or above
5. Verify it appears as red and DOES deduct from the deal score
6. Verify a confidence below 60 does not appear in the UI at all

**✋ Test 33 — User override toggle (dismiss / restore + live score recalc)**

1. Open a real report (`/r/:token`) for a property with at least one red risk flag
2. Click **Dismiss** on the flag
3. Verify the row greys out and is struck through (it does NOT vanish), and the button now reads **Restore** — no page reload
4. Verify the deal score gauge animates up instantly (the dismissed flag's deduction is removed) and the §06 "−X pts" line drops accordingly
5. If dismissing pushes the score across a bracket, verify the verdict pill + tagline change to match
6. Click **Restore** — verify the strike-through clears and the score returns to its original value
7. Check the Supabase `flag_overrides` table — verify Dismiss inserts a row (correct analysis_id + flag_id) and Restore removes it
8. Reload the report with a flag still dismissed — verify it loads already greyed out with the adjusted score (persisted overrides applied on first render)
9. Verify on the demo routes (`/investor-report`, `/tenant-report`, etc.) the Dismiss button is absent — overrides only apply to live, tokened analyses

   🤖 Automated coverage: `apps/web/src/pages/ReportPage.test.tsx` (dismiss/restore wiring + 65→70 live recalc), `apps/web/src/lib/investorCalc.test.ts` (`adjustDealScoreForOverrides`, `verdictFromScore`)

**✋ Test 33a — Sanity bounds on score outputs**

1. The calc engine flags implausible outputs without crashing. Confirm `sanity_check_metrics` covers: cap rate (0–20%), rent ($500–15k), price ($50k–10M), DSCR (≤5×), break-even ratio (≤3×), **deal score (0–95)**, **monthly cash flow (±$20k)**, **negative break-even**, and **non-finite break-even (inf/NaN)**
2. Any failure sets `has_sanity_warnings=true` (UI notice) but the analysis still returns
3. The API rejects implausible monthly rents at the boundary ($500–$10,000/mo): a for-rent scrape with a unit-error price routes to manual entry (`rent_monthly` in `missingFields`); an analysis whose fallback rent is out of bounds returns 422 `RENT_OUT_OF_BOUNDS` instead of scoring garbage — coverage in `apps/api/src/routes/scrape.test.ts` + `analysis.test.ts`

   🤖 Automated coverage: `services/calc-engine/calculations/sanity_test.py`

**✋ Test 33b — Per-city CMHC vacancy drives the demand score**

1. Run analyses for two cities with different CMHC vacancy rates (e.g. a tight <2% market vs a soft >5% market)
2. Verify the deal score's demand component differs (vacancy contributes up to 4 of the 10 demand points), not a flat default

   🤖 Automated coverage: `services/calc-engine/routers/analysis_test.py` (vacancy flows into demand), `apps/api/src/routes/analysis.test.ts` (payload forwards the per-city rate)

**✋ Test 33c — HomeScore risk flags + severe-gate ceilings (Report B)**

1. Run a personal-buyer analysis on a listing whose description fires a standard red flag (e.g. "sold as-is, needs TLC") — the Risk breakdown bar in the score card must read 5/10, not the 10/10 no-flags baseline
2. On a listing with a severe flag (grow-op / flood / illegal unit / special assessment) the HomeScore total is capped at 34 (2 severe → 20, 3+ → 10, floor 5) — invisible while the gauge is suppressed, but locked by tests for when it turns on
3. Amber flags never move the score

   🤖 Automated coverage: `apps/web/src/data/personalBuyerData.test.ts` (mechanism), `apps/web/src/pages/ReportPage.test.tsx` (real flags reach the breakdown via /r/:token)

**✋ Test 33e — Flag severity matrix: per-mode tiers (docs/FLAG_SEVERITY_MATRIX.md)**

1. Analyze one tenanted + needs-work listing in all four modes and confirm the flags follow the matrix, not a single global severity: investor/landlord show `tenanted`/`needs_work` amber; personal shows both red (N12 own-use / project risk); tenant hides both
2. `no_pets` appears (amber) only on the tenant report; `basement_unit` is info for personal but amber for tenant; `condo_fee_unknown` never appears on a tenant report
3. Amber tiers never move the investor score (same total as the no-description baseline); the §10a severe gate still caps a grow-op listing at 40
4. A flag id not in the matrix renders amber in every mode and never deducts — even at 95 confidence
5. A 60–84% confidence flag renders at most amber even in a severe/red matrix cell

   🤖 Automated coverage: `services/calc-engine/constants/flag_matrix_test.py` (cells), `extraction/logic_gate_test.py` (mode mapping + confidence cap), `routers/analysis_test.py` (4-mode functionality), `tests/test_regression.py::test_matrix_regression_approved_cells` (pinned cells)

**✋ Test 33d — Real MiniMap (Mapbox GL) with placeholder fallback**

1. With `VITE_MAPBOX_TOKEN` set and a geocoded analysis, the report hero shows a real Mapbox map centred on the property (ink subject pin) — no "Map placeholder" badge
2. Remove the token (or analyse an address that fails geocoding) — the SVG placeholder renders instead; the report never shows a blank hole
3. Reload a shared `/r/:token` link — coordinates persist (stored in `market_data`), so the real map still renders

   🤖 Automated coverage: `apps/web/src/components/analysis/MiniMap.test.tsx`, `apps/web/src/pages/ReportPage.test.tsx` (coordinates wiring), `apps/api/src/routes/analysis.test.ts` (coordinates in payload)

### SunScout

**✋ Test 33f — Pro-gated PDF export**

1. As a signed-in Pro user, `GET /analysis/:token/pdf` returns an `application/pdf` attachment whose pages match the live web report, with the PropScout footer (branding + "Not financial or legal advice" + timestamp + token + share-link QR code) on every page
2. Free tier gets 403 `UPGRADE_REQUIRED` (frontend shows the upgrade modal); no Chrome launch happens for gated/404 requests
3. A rendering failure returns 502 `PDF_FAILED`, never a hung request
4. Frontend wiring: the Download PDF button on the live report (share bar + mobile sticky bar + tenant hero PDF button) downloads for Pro; free tier sees a LockedButton that opens the 'pdf' UpgradeModal; demo routes (no token) are a safe no-op; a server `UPGRADE_REQUIRED` (stale local tier) also opens the modal
5. Print pass: in the PDF, nav/buttons/dev toolbar are hidden, sticky cards print in place, and no card is split across a page boundary

   🤖 Automated coverage: `apps/api/src/routes/pdf.test.ts` (gate + error states), `apps/api/src/services/pdfService.test.ts` (footer branding + QR), `apps/web/src/hooks/usePdfExport.test.tsx` (frontend gating + session + server-fallback)

**✋ Test 33h — Schools read path (nearest 3 per level)**

1. With the schools table EMPTY (pre-CSV): a live personal report shows the honest "School data pending" card (never fixture schools for a real address), the HomeScore gauge stays suppressed, and a live tenant report shows the schools placeholder
2. After `node scripts/load-schools.mjs <csv>` (requires migration `20260701_add_schools_name_postal_unique.sql` — **verified NOT applied as of 2026-07-02**): re-running an analysis attaches the nearest ≤3 elementary/middle/high schools by straight-line distance, the personal §04 section and tenant §08 section render them, and the personal gauge un-suppresses (schools = the documented re-enable trigger)
3. No report ever claims "in catchment" for real data — the disclaimer states boundaries are not verified
4. A schools lookup failure or missing coordinates never fails the analysis (data pending, not an error)

   🤖 Automated coverage: `apps/api/src/services/supabaseService.test.ts` (ranking/cap/null states), `apps/api/src/routes/analysis.test.ts` (attach + persist + isolation), `apps/web/src/lib/reportShims.schools.test.ts` (display shims), `apps/web/src/pages/ReportPage.test.tsx` (live tenant render)

**✋ Test 33g — Flag polarity + value handling (live-data regression)**

1. A listing whose description says "all utilities included · 1 parking included" shows NO red flags for those phrases and loses no points (live E2E 2026-07-01 found −15 from three amenity "risks")
2. A confident NOT-detected Haiku answer (value=false, high confidence) never fires a flag — a 2nd-floor unit must not show `is_basement_unit`
3. `is_basement_unit` and `basement_unit` never render as two rows for one unit

   🤖 Automated coverage: `services/calc-engine/extraction/logic_gate_test.py`

**✋ Test 33e — SunScout end-to-end + facade-direction input**

1. Analyse a geocodable Ontario address — the SunScout section shows a real light score, monthly sun-hour bars, and summer/winter daily hours (not the "Phase 2" placeholder)
2. Change "Primary facade faces" from South to North — the score drops and the bars update without a full re-analysis; reload the page and the chosen orientation persists
3. The personal report's HomeScore Light breakdown reflects `sunScout.sunScore` (e.g. score ≥80 → 15/15), and drops to the honest 4/15 floor when geocoding fails
4. Demo report pages show "Assumes south-facing primary facade" instead of the selector (no analysis to recalculate against)

   🤖 Automated coverage: `services/calc-engine/routers/analysis_test.py` (sunscout endpoint + bearing validation), `apps/api/src/routes/sunscout.test.ts` (proxy + persistence + error states), `apps/api/src/routes/analysis.test.ts` (lat/lng forwarded, sun_scout mapped), `apps/web/src/components/sunscout/SunScoutPanel.test.tsx` (selector + fallback), `apps/web/src/pages/ReportPage.test.tsx` (HomeScore light)

**✋ Test 34 — Sun hours calculation**

1. Use coordinates for Toronto (lat: 43.65, lng: -79.38) and a south-facing window (bearing: 180)
2. Run `window_sun_hours_by_month()`
3. Expected: December should return approximately 3–5 hours, June approximately 9–12 hours
4. Run the same with a north-facing window (bearing: 0)
5. Expected: December returns 0 hours, June returns 0–1 hours (north gets almost no direct sun in Ontario)
6. Pass: values are plausible and seasonal variation is obvious

**✋ Test 35 — Light score calculation**

1. Use a south-facing main bedroom and south-facing living area
2. Run `annual_light_score()`
3. Expected: score should be 75–90 (south-facing in Toronto is good light)
4. Use a north-facing unit with no windows shown
5. Expected: score should be under 20
6. Pass: scores reflect real-world expectations

**✋ Test 36 — SunScout UI rendering**

1. Complete an analysis on a real property
2. Verify the seasonal grid shows 4 columns (Dec, Mar, Jun, Sep) with hour values
3. Verify the sun arc SVG renders without errors
4. Verify the score interpretation label matches the score (e.g. 75 = "Good")
5. Change the window direction dropdown and verify the grid updates

---

## Week 6–7 — AI narratives and PDF

### AI narratives

**✋ Test 37 — Free tier narrative length**

1. Run an analysis as a free tier user
2. Verify the AI narrative section shows 1 paragraph only
3. Count the words — should be between 60 and 120
4. Verify there are no bullet points or numbered lists in the output
5. Verify at least one dollar figure appears in the text

**✋ Test 38 — Pro tier narrative length**

1. Run an analysis as a Pro tier user (set tier manually in Supabase for testing)
2. Verify the AI narrative shows the full narrative (2–3 paragraphs depending on report type)
3. Count the words — should be between 150 and 320
4. Same formatting checks: no bullets, no lists, at least one dollar figure

**✋ Test 39 — Narrative quality check (manual)**
This cannot be automated — you have to read it.

Run the analysis on Unit 5702, 5 Buttermill Ave. Read the Pro tier narrative.
Compare it against the gold-standard example in spec Section 12.

Ask yourself:

- Does it open with the single most important fact? (The condo fee)
- Does it use specific dollar amounts, not just percentages?
- Does it give a concrete next step in the final paragraph?
- Is it written in second person ("you")?
- Is it direct — does it say the deal is bad if the deal is bad?

Pass: all yes. Fail: any no — tune the prompt and re-run.

**✋ Test 40 — Narrative fallback**

1. Temporarily break the Claude API key (set it to an invalid value)
2. Run an analysis
3. Verify the report still loads — the narrative section shows the fallback message
4. Verify the rest of the report (scorecard, metrics, comps) is completely unaffected
5. Restore the API key and verify narratives return to normal

**✋ Test 41 — All four narrative types**
Run one analysis in each of the four report modes and verify a narrative generates successfully:

- Report A: investment purchase
- Report B: personal purchase (check school summary appears in the narrative input)
- Report C: tenant evaluation
- Report D: landlord rental

### PDF export

**✋ Test 42 — PDF generates without errors**

1. Complete an analysis as a Pro user
2. Click the PDF export button
3. Verify the PDF downloads within 10 seconds
4. Open the PDF and verify it has the correct number of pages (Report A = 8, Report B = 6, Report C = 4)

**✋ Test 43 — PDF content accuracy**

1. Open the generated PDF for the 5702 Buttermill Ave analysis
2. Verify the numbers in the PDF match the numbers shown in the web report exactly
3. Check: cap rate, monthly cash flow, deal score, rent estimate, break-even rent
4. Pass: PDF matches web report. Fail: any discrepancy — Puppeteer rendering issue

**✋ Test 44 — PDF branding**

1. Verify PropScout logo appears in the footer of every page
2. Verify propscout.ca URL appears in the footer
3. Verify "Not financial or legal advice" disclaimer is present
4. Verify date and time stamp is correct

**🔗 Test 45 — PDF gate for free users**
Cannot be tested until Stripe is set up in Week 7–8. At that stage: log in as a free user, click the PDF button, verify the upgrade prompt appears and the PDF does not download.

---

## Week 7–8 — Auth, payments, access control

**✋ Test 46 — Email signup**

1. Go to the signup page
2. Enter an email and password
3. Verify a confirmation email arrives (if Supabase email confirmation is enabled)
4. Verify the user row appears in Supabase `users` table with `tier: free`

**✋ Test 47 — Google OAuth**

1. Click "Sign in with Google"
2. Complete the Google auth flow
3. Verify you are redirected back to PropScout and logged in
4. Verify the user row appears in Supabase with the correct email and `tier: free`

**✋ Test 48 — Stripe checkout**

1. Log in as a free user
2. Click upgrade to Investor Pro
3. Complete Stripe checkout using the test card: 4242 4242 4242 4242, any future date, any CVC
4. Verify you are redirected back to PropScout
5. Verify `tier` in Supabase `users` table has updated to `pro`
6. Verify Pro features are now accessible (PDF button, full AI narrative)

**✋ Test 49 — Stripe webhook (subscription cancelled)**

1. Log in as a Pro user
2. Cancel the subscription via the Stripe billing portal
3. Verify that at the end of the billing period, `tier` in Supabase updates back to `free`
4. Verify Pro features are re-locked after tier changes

**✋ Test 50 — Free tier analysis limit**

1. Log in as a free user
2. Run analyses one by one, counting as you go
3. After the 10th analysis, verify the gate screen appears on the 11th attempt
4. Verify the gate shows the upgrade prompt, not an error message
5. Upgrade to Pro — verify the gate disappears and analyses continue

**✋ Test 51 — Shareable link**

1. Complete an analysis as any tier
2. Click the share button and copy the generated link
3. Open the link in a different browser (not logged in)
4. Verify the full report is visible without logging in
5. Verify the link expires after 30 days (you can test this by manually setting `share_expires_at` in Supabase to a past date)

**✋ Test 52 — Guest analysis**

1. Log out completely
2. Paste a listing URL and complete an analysis without logging in
3. Verify the analysis runs
4. Verify an email capture prompt appears at the end of the report
5. Verify a second attempt as a guest is blocked or prompts for signup

---

## Week 8–10 — End-to-end and launch

### Full end-to-end tests (do these on real properties)

**✋ Test 53 — Full Report A end-to-end**
Use Unit 5702, 5 Buttermill Ave, Vaughan ($729,900 condo)

1. Paste the Realtor.ca URL
2. Select Investment
3. Verify scraper pulls correct data (price, taxes, condo fee, beds)
4. Verify deal score is in the 5–15 range
5. Verify cash flow is approximately −$1,833/mo
6. Verify condo fee flag fires (red)
7. Verify AI narrative mentions the condo fee as the primary issue
8. Export PDF — verify all 8 pages render correctly
9. Generate shareable link — verify it opens without login
   Total time from URL paste to report: should be under 30 seconds

**✋ Test 54 — Full Report B end-to-end**
Use a real detached house listing in Ontario (find one on Realtor.ca)

1. Paste the URL and select Personal Use
2. Verify the monthly ownership cost section shows mortgage + taxes + insurance + maintenance
3. Verify at least 3 schools appear with EQAO scores and Fraser rankings
4. Verify SunScout section appears with a score
5. Verify the AI narrative reads as a personal buyer verdict (not investment language)
6. Export PDF — verify 6 pages

**✋ Test 55 — Full Report C end-to-end**
Use Unit 3705, 5 Buttermill Ave, Vaughan ($2,150/mo rental listing)

1. Paste the rental URL without logging in
2. Select Tenant
3. Verify the listing accuracy flags fire (glass door den, parking unclear)
4. Verify rent positioning shows $2,150 as above building range
5. Verify negotiation target appears (~$1,950–2,000)
6. Verify SunScout light score appears
7. Verify the AI narrative says do not sign at asking
8. Verify the conversion prompt appears at the very bottom
9. Verify the confirm-before-signing checklist is present with at least 2 items

**✋ Test 55a — Listed vs. reality section (conditional display)**
Use Unit 3705, 5 Buttermill Ave (has known misrepresentation flags)

1. Verify the "Listed vs. Reality" section appears — flags are present so it should show
2. Verify the left card shows the Zillow/Realtor.ca description wording ("2 bed + study")
3. Verify the right card shows the corrected version ("1 proper bedroom + 1 glass-door den")
4. Verify flagged items have a red warning, confirmed-accurate items have a green tick
5. Now find a rental listing with no misrepresentation flags (a straightforward unit)
6. Paste it and verify the "Listed vs. Reality" section does NOT appear — it is conditional

**✋ Test 55b — Full unit breakdown**
Use Unit 3705, 5 Buttermill Ave

1. Verify the unit breakdown card shows all available fields: floor, balcony sqft, bedroom descriptions, bathrooms, ceilings, windows, laundry, cooling, heating, internet, parking, available date
2. Verify fields not found in the listing are labelled "Not listed" — not blank, not zero
3. Verify sqft shows the estimate range ("est. 600–700 sqft") when the exact value is not in the listing

**✋ Test 55c — Building amenities grid**
Use Unit 3705, 5 Buttermill Ave (Transit City — known amenities)

1. Verify the amenities grid renders with icons and labels
2. Verify confirmed-included amenities (gym, pool, internet, YMCA) are shown in full colour
3. Verify parking appears in a warning state (unconfirmed for this unit)
4. Use a second rental listing with minimal amenities — verify the grid only shows what is confirmed, not placeholder tiles for unknown amenities

**✋ Test 55d — Location and lifestyle card**
Use Unit 3705, 5 Buttermill Ave

1. Verify VMC subway station appears with walking distance (~2 min)
2. Verify downtown Toronto commute time appears (~50 min)
3. Verify Walk Score and Transit Score are present and plausible (Walk ~72, Transit ~85)
4. Verify walkable daily living rating appears
5. Use a rural Ontario rental listing — verify the card still renders but with lower scores and fewer nearby amenities listed
6. Verify the card never crashes or shows empty fields — missing data shows "Not available" not blank

**✋ Test 56 — Full Report D end-to-end**
Use any active rental listing on Kijiji or Rentals.ca in Ontario

1. Paste the URL and select Landlord
2. Verify you are prompted for the property value / purchase price
3. Enter a realistic purchase price and verify the investment metrics calculate
4. Verify rental comps appear alongside the listed rent
5. Verify the AI narrative gives a landlord-focused verdict

### Property type coverage tests

**✋ Test 57 — Test across all property types**
Run a Report A analysis on one of each type and verify the report renders correctly without errors:

- [ ] Condo apartment
- [ ] Detached house
- [ ] Semi-detached house
- [ ] Townhouse / freehold townhouse
- [ ] Duplex
- [ ] Triplex

Note which property types produce the most scraper gaps (missing sqft, missing year built etc.) and document them.

### Edge case tests

**✋ Test 58 — Property with no rental comps**
Find a listing in a rural Ontario postal code with very few nearby rentals (try a small town in Northern Ontario)

1. Run a Report A analysis
2. Verify the comps section shows the low-confidence warning ("Only X comparables found — confidence: low")
3. Verify the analysis still completes — it does not fail or hang

**✋ Test 59 — Property with unknown condo fee**
Find a condo listing on Realtor.ca where the maintenance fee is not listed anywhere

1. Paste the URL
2. Verify the amber "enter manually" prompt appears during the progress display for the condo fee field
3. Verify the analysis does not proceed until a value is entered (or the user explicitly confirms it's unknown)
4. Verify the risk flag "Condo fee unknown — confirm before purchasing" appears in the report

**✋ Test 60 — Property with unknown year built**
Find a listing with no year built information

1. Verify `year_built_known: false` in the scraped data
2. Verify the risk flag "Year built unknown — rent control status unconfirmed" appears
3. Verify the deal score deducts 1 point for this flag (per the formula in spec Section 10)

**✋ Test 61 — Pre-1980 property**
Find a listing with a confirmed year built before 1980

1. Verify the pre-1980 maintenance reserve rate (1.5%) is used in calculations
2. Verify the "High maintenance risk" amber flag appears
3. Verify the deal score deducts 3 points for this flag

### Mobile testing

**✋ Test 62 — Mobile browser test**
Open propscout.ca on your phone browser (not a desktop browser with responsive mode — an actual phone)

1. Paste a URL using the mobile keyboard
2. Verify the URL input bar is usable on mobile (no keyboard overlap issues)
3. Verify the mode selection modal is tappable with a finger (buttons large enough)
4. Verify the deal scorecard is readable without horizontal scrolling
5. Verify the AI narrative section is readable
6. Minimum acceptable: scorecard and AI narrative are clean. Everything else can be imperfect at MVP.

### Performance tests

**✋ Test 63 — Analysis speed**

1. Time a full analysis from URL paste to report rendered for a Toronto condo
2. Target: under 30 seconds total
3. If over 30 seconds, identify the bottleneck (scraper? comps query? AI narrative?)
4. A rural property with few comps may take longer — verify it completes within 60 seconds

**✋ Test 64 — Concurrent users (basic)**
Open 3 browser tabs simultaneously and start 3 different analyses at the same time
Pass: all 3 complete without errors
Fail: any one hangs, crashes, or returns another user's data

---

## Pre-launch final checklist

Run these immediately before going live:

**✋ Disclaimer and legal**

- [ ] "Not financial or legal advice" text is visible on every report type
- [ ] Privacy policy page exists at propscout.ca/privacy
- [ ] Terms of service page exists at propscout.ca/terms

**✋ Payments**

- [ ] Stripe is in live mode (not test mode)
- [ ] A real card payment successfully creates a Pro subscription
- [ ] Subscription cancellation works end-to-end

**✋ Domain and SSL**

- [ ] propscout.ca loads over HTTPS (padlock in browser)
- [ ] www.propscout.ca redirects to propscout.ca (or vice versa — pick one)
- [ ] No SSL certificate warnings

**✋ Emails**

- [ ] Support email (support@propscout.ca) receives messages
- [ ] Supabase sends auth emails from a branded address (not a Supabase default)
- [ ] Stripe sends billing receipts correctly

**✋ Error logging**

- [ ] A failed scrape is logged somewhere you can see it (Railway logs minimum)
- [ ] A failed Claude API call is logged
- [ ] A failed Stripe webhook is logged

**✋ Golden dataset final run**

- [ ] Run the full extraction pipeline regression suite one final time
- [ ] Confirm 95%+ accuracy before going live
- [ ] Document the final accuracy score and date in this file

---

## After launch — ongoing testing

Every time you change the extraction prompt, update a model version, or add a new flag type:

1. Run the golden dataset regression suite immediately
2. Confirm accuracy is still 95%+ before the change goes live
3. If accuracy drops, revert the change and investigate

Every time a user reports a misrepresentation that PropScout missed:

1. Add that listing description to the golden dataset
2. Label it correctly
3. Re-run the suite
4. Fix the prompt or regex if needed

Every time Realtor.ca or Zillow.ca changes their page structure:

1. Run Tests 1–6 immediately to confirm the scrapers still work
2. If broken, fix the scraper before anything else — the whole pipeline depends on it

---

_PropScout · Testing Guide · May 2026 · Update this file as new features are added_
