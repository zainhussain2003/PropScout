# PropScout — MVP Task List

Last updated: 2026-07-01 — Realtor.ca scraper section reconciled to shipped code (was stale; the per-listing pipeline works end-to-end against live Realtor.ca URLs via ScraperAPI)
Reference spec: `propscout_platform_spec.md`
Full backlog: `TODO.md`

Tick off tasks as they are completed. Build in this order — each week's work depends on the previous.

---

## Week 1–2 — Data pipeline (nothing else works without this)

### Database schema

- [x] Initial Supabase migration (`20260610_initial_schema.sql`) — users, subscriptions, listings, rental_listings, schools, analyses, portfolio_properties, waitlist, flag_overrides, sanity_failures + RLS policies + comp-query/dedupe indexes
- [ ] Migration run against production Supabase project (Week 8–10 deploy step)

### Realtor.ca scraper

> Implemented in `services/scrapers/realtor_scraper.py` — approach changed from the spec's
> internal JSON API (Incapsula blocks direct api2.realtor.ca calls) to fetching the listing
> page via **ScraperAPI `premium=true`** and parsing dataLayer + JSON-LD + details labels.

- [x] Validate/extract listing ID from Realtor.ca URL (`/real-estate/<id>/` pattern gate)
- [x] ~~Call Realtor.ca internal JSON API with correct headers~~ — superseded: ScraperAPI premium page fetch (render=true 500s on Realtor.ca; premium HTML already contains all parsed blocks)
- [x] Parse: address, price, beds, baths, sqft (m²→sqft), property type
- [x] Parse: annual taxes (taxes_known = true/false)
- [x] Parse: condo fee (condo_fee_known = true/false — sometimes JS-injected, stays unknown then)
- [x] Parse: year built (year_built_known = true/false)
- [x] Parse: listing type (for_sale vs for_rent — leasePrice vs price in dataLayer)
- [ ] Parse: days on market (still `None` — not present in premium HTML) — photo URLs ✅ + listing description ✅ are done
- [x] Store to `listings` table in Supabase (via API `POST /scrape` → `saveListing`)
- [x] Handle scraper failure → partial data + `missingFields` for manual entry fallback (incl. implausible for-rent rent → `rent_monthly`)
- [x] ~~Rate limiting: 1 req/4s, rotate 3 proxy IPs~~ — superseded: ScraperAPI manages proxies; scrapes are per-listing on demand, not bulk

### Zillow.ca scraper

- [ ] Playwright headless Chrome setup on Railway
- [ ] Navigate to listing URL, wait for full page load
- [ ] Extract same fields as Realtor.ca scraper
- [ ] Detect listing type from page structure and price format
- [ ] Detect if URL is a US property (block with error message)
- [ ] Handle scraper failure gracefully
- [ ] Cloudflare bypass — deferred to FUTURE.md (blocked; Zillow.ca URL validation done in frontend only)

### Listing type detection

- [ ] Parse URL to detect for-sale vs for-rent (spec Section 3) — scraper pipeline
- [ ] Fallback: detect from scraped price format (monthly = rental)
- [ ] Ambiguous case: default to for-sale, show toggle
- [x] `detectKindFromUrl()` in frontend Hero — URL pattern detection for ModeModal routing (sale/rent)

### Rental comps scraper (nightly job)

- [x] Playwright scraper for Rentals.ca (`sources/rentals_ca.py` — selectors are TEMPLATE, verify on first deploy)
- [x] Playwright scraper for Kijiji (rental category) (`sources/kijiji.py` — selectors are TEMPLATE, verify on first deploy)
- [x] Playwright scraper for PadMapper (`sources/padmapper.py` — selectors are TEMPLATE, verify on first deploy)
- [x] Normalise: geocode address to lat/lng (`services/mapbox_service.py` — non-fatal on failure)
- [x] Normalise: convert weekly rents to monthly (×4.33, daily rates discarded)
- [x] Normalise: parse beds to integer (Studio/Bachelor → 0, dens never counted)
- [x] Deduplicate: same address + rent + beds within 7 days = one record (in-batch + against stored rows)
- [x] Store to `rental_listings` table with timestamp (insert-only — historical rows never deleted)
- [ ] Schedule as nightly Railway job at 2am ET (`railway.json` cron config written — Railway deploy + first-run confirmation pending)
- [x] Unit + functionality tests — 50 passing (normalization, dedupe, full pipeline with mocked sources/storage/geocoding)

### Province detection

- [x] Parse postal code from scraped address (`isOntarioPostalCode()` in provinces.ts + frontend `isOntarioPostal()` in AnalyzingPage)
- [x] Ontario FSA check (starts with K, L, M, N, P) — backend `isOntarioPostalCode()` + frontend early check
- [x] Non-Ontario → return province code, block analysis, trigger waitlist flow — backend 400 PROVINCE_NOT_SUPPORTED + frontend `province_gate` view + POST /waitlist endpoint

---

## Week 2–3 — Calc engine

- [x] Python FastAPI service set up on Railway
- [x] Gross rental income calculation
- [x] Operating expenses: taxes + insurance (0.35% of value) + maintenance + vacancy (5%)
- [x] Management fee toggle (8%, off by default)
- [x] Maintenance reserve by age: post-2010 (0.5%), 1980–2010 (1.0%), pre-1980 (1.5%)
- [x] NOI calculation
- [x] Cap rate = NOI / purchase price
- [x] Monthly mortgage payment (Canadian semi-annual compounding — Interest Act)
- [x] Annual and monthly debt service
- [x] Annual and monthly cash flow = NOI − debt service
- [x] Total cash invested = down payment + LTT + closing costs estimate
- [x] Cash-on-cash return = annual cash flow / total cash invested
- [x] DSCR = NOI / annual debt service
- [x] GRM = purchase price / annual gross rent
- [x] Break-even rent = all monthly expenses combined
- [x] Ontario LTT calculation (non-Toronto and Toronto — spec Section 6)
- [x] OSFI stress test: qualifying_rate = max(contract_rate + 0.02, 0.0525)
- [x] Four financing scenarios (base, OSFI stress, 35% down, conservative) — PR 4
- [x] Deal score formula — all components (spec Section 10)
- [x] Risk flag deductions applied to deal score
- [x] Sanity checks module (`sanity.py`) — validates every metric output is within realistic bounds before returning to API
- [x] Equity build curve (`equity_build.py`) — 20-year principal paydown + appreciation model
- [x] Bank of Canada live rate feed (`bank_of_canada_service.py`) — 24h cached, fallback to last known rate on API failure
- [x] Regex-based listing flag extraction (`regex_rules.py`) — deterministic patterns, Phase 1 of spec Section 19
- [x] Extraction logic gate (`logic_gate.py`) — merges regex + AI results, applies 85%/60% confidence thresholds
- [x] Walk Score service (`walkscore_service.py`) — Walk/Transit/Bike Score API wrapper
- [x] Rates endpoint (`routers/rates.py`) — GET /rates returning live mortgage rates to frontend
- [x] Unit tests: 164 passing across mortgage, investment, closing_costs, deal_score, osfi, bank_of_canada, sanity
- [x] Calibration test: 5702 Buttermill Ave (Vaughan) scores ≤ 15 / hard_pass — correct
- [x] Calibration test: Hamilton duplex scores ≥ 80 / strong_buy — correct
- [x] Regression suite: 15 tests covering both calibration properties — must pass 100%

---

## Week 3–4 — Frontend (follow COMPONENT_MANIFEST.md build order exactly)

> Design files are in `docs/design_handoff_propscout_mvp/designs/`. Open them in a browser before building.
> Build order matches `COMPONENT_MANIFEST.md` §1–10. Do not jump ahead — every section depends on the previous.
> Use `OPENING_PROMPT.md` for the first Claude Code session.

### PR 1 — Foundation (shared components)

Reference: `COMPONENT_MANIFEST.md §1` + `DESIGN_README.md`

- [x] Copy `tokens.css` into `apps/web/src/styles/` and import in global stylesheet
- [x] Add Google Fonts preconnect + link in `apps/web/index.html` (Instrument Serif + Geist + Geist Mono)
- [x] React + TypeScript project setup (Vite)
- [x] `<Wordmark height>` — "Prop*Scout*" wordmark with ScoutMark glyph
- [x] `<ScoutMark size color>` — standalone glyph (used as watermark on dark cards)
- [x] `<Icon name size stroke>` — full line-icon library (arrow, link, check, sun, moon, house, chart, shield, doc, map, key, flag, sparkle, paste, plus, minus, dot)
- [x] `<Chip>` — inline pill tag (with and without accent dot variant)
- [x] `<Button variant="primary|ghost|accent">` — all three variants, hover → terracotta 0.15s
- [x] `<Card>` — surface + line + shadow + radius-lg
- [x] `<SectionHead n topic question verdict tone>` — every report section header (shared across all 4 reports)
- [x] `<VerdictPill tone label>` — pass / caution / fail pill, class-only colour (no inline styles)
- [x] `<Nav variant>` — landing, report, and account variants
- [x] `<Footer>` — shared footer
- [x] `<SignInModal open onClose>` — bottom-sheet sign-in / sign-up with complete keyboard focus trap
- [x] Unit test + accessibility test every shared component (43 tests in shared.test.tsx + 3 focus trap tests = 46 total)

### PR 2 — Calc engine Python port

Reference: `COMPONENT_MANIFEST.md §10` + `services/calc-engine/calculations/`

- [x] `monthly_payment()` → `mortgage.py`
- [x] `remaining_balance()` → `mortgage.py`
- [x] `ontario_ltt()` → `closing_costs.py`
- [x] `osfi_stress_test()` → `osfi.py`
- [x] `compute_metrics()` → `investment.py`
- [x] `compute_deal_score()` → `deal_score.py`
- [x] `closing_costs_estimate()` → `closing_costs.py`
- [x] `maintenance_rate()` → `rates.py` (constants) + `investment.py`
- [x] 100% unit test coverage on all 8 functions (101 tests passing in calc engine)
- [x] Calibration test: 5702 Buttermill scores ≤ 15 / hard_pass — correct
- [x] Hamilton duplex calibration test: scores ≥ 80 / strong_buy — correct

### PR 3 — Landing + Mode modal

Reference: `index.html` + `Mode Modal.html` + `mode-modal.jsx`

- [x] Landing page `/` — URL paste hero, embedded sample report, pricing section, FAQ, How it works, Reports, SunScout teaser, CTA
- [x] URL input bar with validation (`validateUrl.ts` — realtor.ca + zillow.ca patterns, 20 test cases)
- [x] `<ModeModal open listing onSelect>` — for-sale (Investment/Personal) and for-rent (Tenant/Landlord) routing
- [x] Listing type auto-detection — `detectKindFromUrl()` in Hero, sale/rent from URL pattern
- [x] Dark mode toggle — `data-theme` on `<html>`, full token-driven dark mode
- [x] FAQ expand/collapse — individual item toggle
- [x] Pricing toggle — monthly/yearly with correct price display
- [x] All VerdictPill tones present on landing (pass, caution, fail) — class-only colour
- [x] Price values in Pricing section use Geist Mono (not Instrument Serif)
- [x] How it works section — `auto-fit` responsive grid (no horizontal overflow at any width)
- [ ] All hover and click interactions match the design exactly (visual QA 18/19 — 1 criterion corrected)
- [ ] Modal open animation: backdrop 0.25s fade + card translates up 8px + scales 0.98→1

### API wiring — Fastify ↔ Calc engine ↔ Frontend (completed in PR 9)

- [x] Fastify `POST /analysis` route — accepts camelCase from React, converts to snake_case, proxies to calc engine, returns camelCase response
- [x] Bidirectional camelCase↔snake_case data layer — frontend never sees Python naming conventions
- [x] `analysisService.ts` — frontend service layer for `POST /analysis`, throws `ApiRequestError` on failure
- [x] `useAnalysis.ts` hook — manages analysis state, loading, and error in React
- [x] Error handling: 503 (engine unreachable), 422 (invalid input), 500 (engine error) all return consistent `ApiError` shape
- [x] `analysis.test.ts` — 16 Jest tests covering all conversion paths and error cases
- [x] `analysisService.test.ts` — 10 Vitest tests covering the frontend service layer
- [x] `useAnalysis.test.ts` — 7 Vitest tests covering hook state management

### PR 4 — Investor report end-to-end

<!-- PR 4 merged — feat/investor-report — all 111 Chrome UI tests passing — May 2026 -->

Reference: `Investor Report.html` + `investor-report.jsx` + `investor-sections.jsx` + `investor-sections-2.jsx`

- [x] `<AssumptionFields>` — financing assumption inputs (down payment %, rate, amortization, management fee toggle) — 26 tests
- [x] `<DealScore score size label showVerdict animate>` — radial gauge, stroke animation 1.4s cubic-bezier(.2,.7,.2,1)
- [x] `<Metric label value sub status>` — headline metric tile
- [x] `<RentalCompsBar low mid high ask>` — percentile bar + hover diamond marker
- [x] `<AIVerdictBlock>` — dark full-bleed card with ScoutMark watermark
- [x] `<RiskRow tone label detail>` — inline risk flag row
- [x] `<MiniMap height address pins>` — placeholder SVG map (replace with real Mapbox GL JS)
- [x] `<PropertyHero listing score>` — photo grid + chips + address + sticky score card
- [x] `<FinancingSliders financing onChange>` — live sliders, every metric recalculates instantly on drag
- [x] `<OSFICard osfi financing>` — OSFI stress test card
- [x] `<LTTTable ltt price toronto>` — Ontario LTT bracket table
- [x] `<EquityChart equityCurve totalCashInvested>` — 20-year line chart with hover tooltip
- [x] `<InvestmentMetricsSection>` — 8-tile metrics grid + annual expense breakdown
- [x] `<NeighbourhoodSection>` — 6 stat tiles + comparable sales + appreciation card
- [x] `<STRPlaceholderSection>` — Phase-2 placeholder + STR legality card
- [x] All 11 investor report sections rendered and functional
- [x] Use Vaughan dataset from `investor-calc.jsx` until scraper is live

### PR 5 — Tenant report

> PR5 complete — 2026-05-28. 372/372 tests passing.
> Mobile responsive pass deferred to PR8.
> Known: SignInModal renders as centred overlay, not bottom-sheet —
> animation to be aligned with spec in PR8 mobile pass.
> Known: duplicate "Save to account" button (nav + score card) —
> to be resolved when nav is finalised in PR7.

Reference: `Tenant Report.html` + `tenant-report.jsx` + `tenant-sections.jsx` + `tenant-sections-2.jsx` + `tenant-sections-3.jsx` + `tenant-schools.jsx`

- [x] `<FlagDeepRow flag>` — expandable risk flag with evidence quote + "Ask before signing"
- [x] `<ListedVsRealitySection>` — conditional side-by-side cards (only when flags fire)
- [x] `<WhatsIncludedSection>` — amenities grid with included/extra/unclear colouring
- [x] `<LocationCommuteSection>` — Walk/Transit/Bike scores + distances
- [x] `<NegotiationSection>` — leverage card + suggested-message card
- [x] `<TenantSchoolsSection>` — slim schools section (1 per board × 3 levels)
- [x] Full unit breakdown card — all scraped fields, "Not listed" for missing values
- [x] Confirm-before-signing checklist — dynamically generated from fired flags, copy-pasteable negotiation script
- [x] Conversion prompt at bottom — links to Report A flow + optional email capture
- [x] All 12 tenant report sections rendered (spec Section 8)

### PR 6 — Personal buyer + Landlord reports

Reference: `Personal Buyer Report.html` + `Landlord Report.html`

- [x] `<SchoolCard school>` + `<SchoolColumn>` — EQAO + Fraser + catchment badge
- [x] `<PBTrueCostSection>` — itemised monthly cost table
- [x] `<PBFMVSection>` — FMV positioning bar
- [x] `<PBSalesSection>` — comparable sales table
- [x] Personal buyer report — all 6 sections (spec Section 7)
- [x] Landlord report — all sections (reuses investor components heavily)

### PR 7 — Paywall, account, errors, auth

Reference: `Paywall States.html` + `Account.html` + `Error States.html` + `Auth & Billing Stubs.html`

- [x] `<ProBadge tier>` — inline Pro marker with lock icon
- [x] `<UpgradeCard headline sub ctaLabel dark>` — upgrade pitch card
- [x] `<LockedSection headline sub mockContent height>` — blurred content + upgrade overlay
- [x] `<TruncatedVerdict firstParagraph>` — AI verdict paragraph 2 blurred + inline upgrade strip
- [x] `<LockedButton label icon onClick>` — lock-icon button opening upgrade modal
- [x] `<UpgradeModal open onClose feature>` — 5 feature-specific variants
- [x] `<HardLimitGate onClose monthlyLimit used resetsIn>` — full-screen monthly limit blocker
- [x] `<BlockState>` — full-page error/gate state
- [x] `<ProvinceGate>` — non-Ontario waitlist
- [x] `<NoCompsInlineState>` — inline low-confidence callout
- [x] `<ScraperPartialInlineState>` — inline "X of Y fields" + missing-field inputs
- [x] Account dashboard `/account` — saved analyses, profile, plan, notifications tabs
- [x] Auth stubs: magic link confirm, password reset, email verified, Stripe welcome, Stripe cancelled
- [x] Wire all paywall components into every report

> **Additions made during PR7 implementation:**
> During build and Chrome UI testing, the following were added
> beyond the original spec. Each is noted with the reason it
> was needed.

> _Icon.tsx — 'search' icon added: NoCompsInlineState and
> AccountPage search input required a search icon that did not
> exist in the shared library. Added the standard magnifier
> SVG (circle + diagonal line) to Icon.tsx and switched
> NoCompsInlineState from 'flag' to 'search' for correct
> semantics._

- [x] `<Icon name="search">` — added to shared Icon library

> _DevToolbar — permanent DEV-only test scaffold: Chrome UI
> testing required manual triggers for UpgradeModal (generic +
> sunscout variants) and HardLimitGate, which have no natural
> entry point in the current MVP. Rather than deleting the
> trigger buttons after each PR, a reusable DevToolbar
> component was created so future PRs can add slots without
> touching App.tsx. Returns null in prod via two-function
> pattern (DevToolbarInner + DevToolbar shell)._

- [x] `<DevToolbar slots>` — collapsible DEV-only toolbar,
      null in prod, slots wired: all 5 UpgradeModal variants + HardLimitGate

> _AccountPage dark mode bug: Chrome UI testing (TC-PR7-067)
> found the dark mode toggle updated the icon state but never
> set data-theme on document.documentElement. Fixed with a
> dedicated handleToggleDark function and a mount sync
> useEffect — same pattern used in all prior report pages._

- [x] AccountPage dark mode fix — handleToggleDark +
      mount sync useEffect in AccountTopNav

> _UpgradeModal focus trap bug: Chrome UI testing (TC-PR7-097)
> found Tab key escaped the modal to elements behind the
> backdrop. Fixed with manual Tab/Shift+Tab interception via
> useEffect + focus restore on close via triggerRef. No
> external library used._

- [x] UpgradeModal focus trap — Tab/Shift+Tab interception +
      focus restore on close; modalRef + triggerRef added

> _ProvinceGate internal state: automated testing required
> the submit → confirmation transition to work without an
> external submitted prop. Added internal isSubmitted state
> alongside the existing prop (semi-controlled pattern)._

- [x] ProvinceGate — internal isSubmitted state added
      (semi-controlled alongside submitted prop)

> _PersonalBuyerPage + LandlordPage verdict gating: the
> paywallWiring integration tests caught that these two pages
> were missing TruncatedVerdict gating in free tier. Added
> to match InvestorPage and TenantPage._

- [x] PersonalBuyerPage + LandlordPage — TruncatedVerdict
      free-tier gating added (caught by paywallWiring tests)

> _PaywallContext default tier set to 'pro': PR1-PR6 tests
> render report pages without a PaywallContext.Provider. With
> default 'free', those tests would see TruncatedVerdict and
> LockedButton instead of the original components, causing
> snapshot failures. Default 'pro' means no paywall UI outside
> a Provider. App.tsx Provider passes MOCK_TIER='free' so all
> gates are active in the running app._

- [x] PaywallContext default tier — set to 'pro' to preserve
      PR1-PR6 test behaviour outside Provider

### PR 8 — Legal + 404 + mobile pass

Reference: `Legal Pages.html` + `Mobile Pass.html`

- [x] Privacy policy `/privacy` with TOC sidebar
- [x] Terms of service `/terms` with TOC sidebar
- [x] 404 catch-all
- [x] Mobile responsive pass — all routes at 380px
- [x] Modal → bottom-sheet on mobile (slides up with drag handle)
- [x] Two-column reports collapse to single-column
- [x] Sticky bottom action bar (Save/Share/PDF)
- [x] AI verdict headline-only on mobile with "Read full verdict" expand
- [x] Score card moves above content on mobile (gauge shrinks to ~84px)

> Accessibility: footer .chip contrast fixed (WCAG AA).
> btn-primary contrast (terracotta bg, 3.12:1) is a known
> sitewide issue — fix in a dedicated a11y PR before launch.

### PR 9 — Route wiring (end-to-end integration)

- [x] `.env.example` updated — WALKSCORE_API_KEY, MAPBOX_TOKEN, SCRAPER_URL confirmed present alongside existing vars
- [x] Supabase migration — `analyses` table with id, token, listing_id, user_id, mode, status, analysis, created_at, expires_at
- [x] `saveAnalysis`, `updateAnalysisStatus`, `getAnalysisByToken` implemented in supabaseService.ts
- [x] Realtor.ca scraper — `services/scrapers/realtor_scraper.py` with ScrapedListing dataclass, rate limiting, unit tests
- [x] `POST /scrape` Fastify route — calls scraper, province gate (Ontario FSA check), writes to Supabase, returns token
- [x] Mapbox geocoding service — `apps/api/src/services/mapboxService.ts`, returns lat/lng or null
- [x] Walk Score service — `apps/api/src/services/walkScoreService.ts`, returns WalkScoreResult or null
- [x] `extractListingFlags` — Claude Haiku step in anthropicService.ts, description in → structured flags out
- [x] Claude narrative — `generateNarrative` in anthropicService.ts, free (1 para) and pro (2–3 para) tiers
- [x] `POST /analysis` expanded to full orchestrator — 9-step pipeline, writes complete analysis on finish
- [x] `GET /analysis/:token` — returns pending/processing status or full analysis, 404/410 on miss/expiry
- [x] `analysisService.ts` — scrapeUrl, triggerAnalysis, fetchReport implemented with real API calls
- [x] `LandingPage.tsx` — real scrapeUrl call replaces runDemo(), province gate and scraper-fail paths wired
- [x] `ModeModal` → navigates to `/analyzing?token=[token]&mode=[mode]` on mode selection
- [x] `/analyzing` page — triggerAnalysis on mount, polls fetchReport every 2s, navigates to /r/[token] on complete
- [x] `/r/[token]` report page — fetches real analysis, routes to correct report component, replaces fixture data
- [ ] Integration test — mock scraper → real calc engine → mock Claude + Walk Score → assert token roundtrip
- [x] All existing analysis route tests and useAnalysis hook tests pass
- [ ] Golden dataset regression passes 95%+

---

## Week 4–5 — School, neighbourhood, and sun data

- [ ] Load EQAO dataset into Supabase `schools` table (download from eqao.on.ca)
- [ ] Scrape Fraser Institute school rankings (fraserinstitute.org/school-performance)
- [ ] Store Fraser data in `schools` table alongside EQAO
- [ ] Google Places API integration — find nearby schools by coordinates (type=school)
- [ ] Match Google Places results to `schools` table by name + address
- [ ] Return nearest 3 per type (elementary, middle, high) with distance and drive time
- [ ] Highlight schools within catchment area (TDSB polygon data — Toronto first)
- [ ] Walk Score API integration (Walk Score + Transit Score) — service layer exists (`walkscore_service.py`), wiring pending
- [ ] Statistics Canada — demographics by postal code (household income, population growth)
- [ ] CMHC vacancy rate by city (public API, refresh quarterly) — service stub exists (`cmhc_service.py`)
- [ ] Neighbourhood intelligence module assembled from above sources

### SunScout (moved from Week 5–6 — location intelligence block, fits here alongside Walk Score)

> This block was a stale duplicate — the maintained SunScout checklist lives in the
> Week 5–6 section below. As of 2026-07-01 SunScout is wired end-to-end.

---

## Week 5–6 — Extraction pipeline and risk flags

All tasks reference spec Section 19.

- [x] Deterministic regex rules (`regex_rules.py`) — patterns for 7 flag types, Phase 1
- [x] Logic gate (`logic_gate.py`) — merges regex + AI results, 85%/60% confidence thresholds
- [x] Claude Haiku extraction — `extractListingFlags()` in anthropicService.ts (Fastify layer) + `haiku_extraction.py` in Python layer
- [x] JSON parse validation with fallback (all-false on parse error, returns null non-fatally)
- [x] Red flag threshold: 85%+ → red, deducts score (CONFIDENCE.RED_FLAG_MIN in analysis route)
- [x] Amber flag threshold: 60–84% → amber, no score deduction
- [x] Below 60% → not shown (filtered out before merge in analysis route)
- [ ] `flag_overrides` table in Supabase
- [ ] User override toggle component in React
- [ ] Override triggers instant deal score recalculation (no page reload)
- [ ] Override state saved to analysis record
- [ ] All 7 risk flag types rendering correctly in report UI
- [ ] **Golden dataset — 50 real Ontario listing descriptions collected and labelled**
- [x] Pytest regression test suite written for golden dataset (framework in place, 1 test passing)
- [ ] Accuracy at or above 95% before proceeding to Week 6 (pending Haiku implementation)

### SunScout

- [x] pvlib installed in Python calc engine
- [x] `window_sun_hours_by_month()` — NREL SPA via pvlib, 1-hour resolution, sample 15th of each month × days_in_month
- [x] `annual_light_score()` — weighted benchmark scoring (bedroom_main 40%, living 35%, others 25%)
- [x] Score interpretation labels (excellent / good / average / below_average / poor)
- [x] `calculate_sun_hours()` — main entry point returning `SunScoutResult` dataclass
- [x] 22 unit tests in `sun_path_test.py` (physics assertions, sanity ranges, score calibration)
- [x] `SunScoutOutput` Pydantic model + `sun_scout` field on `AnalysisOutput` in calc engine
- [x] Calc engine router calls `calculate_sun_hours()` when lat/lng present (non-fatal)
- [x] `SunScoutResult` TypeScript interface in both API and web type trees
- [x] Fastify analysis route: geocodes address → passes lat/lng to calc engine → transforms `sun_scout` to camelCase _(actually true as of 2026-07-01 — previously ticked while `sunScout` was hardcoded null and no lat/lng was sent; the geocode now runs before the calc call)_
- [x] Window direction input UI — facade compass dropdown in `SunScoutPanel` (live analyses only) → `POST /analysis/:token/sunscout` → calc engine `/analysis/sunscout` (recalc without extraction/narrative re-run); result persisted so reloads keep the orientation
- [x] Monthly sun hours wired to real data — SunScoutPanel's 12-month bar chart renders `analysis.sunScout.monthlyHours` _(the design has no separate Dec/Mar/Jun/Sep grid; a "SeasonalGrid component" never existed — `seasonalGrid` data stays available on the payload)_
- [x] ~~Sun arc SVG visualization~~ — dropped: not in any design prototype and no SunArcViz component ever existed; summer/winter daily hours render as text in the panel
- [x] SunScoutPanel wired into all 4 report pages with live `analysis.sunScout` data (`ReportPage` investor/tenant contents + routed PersonalBuyerPage + LandlordPage)
- [x] `STATIC_LIGHT_SCORE` replaced — PersonalBuyerPage HomeScore light component now uses real `sunScout.sunScore` (0 honest floor when sun data unavailable)

---

## Week 6–7 — AI narratives and PDF

### Claude Sonnet narratives

- [x] Report A / D investment prompt — free tier (1 paragraph, 60–120 words)
- [x] Report A / D investment prompt — Pro tier (3 paragraphs, 150–280 words)
- [x] Report B personal prompt — free tier
- [x] Report B personal prompt — Pro tier
- [x] Report C tenant prompt — free tier
- [x] Report C tenant prompt — Pro tier
- [x] Output validation: word count, banned phrases, dollar figure requirement
- [x] Regenerate once on validation failure, log and show fallback on second failure
- [ ] Calibrate against gold-standard examples in spec Section 12 (manual QA step at launch)

### PDF export

- [ ] Puppeteer setup
- [ ] Report A PDF — 8 pages (spec Section 14)
- [ ] Report B PDF — 6 pages
- [ ] Report C PDF — 6 pages (expanded from 4 — new sections added in spec Section 8)
- [ ] PropScout branding in footer (logo, propscout.ca, disclaimer, timestamp)
- [ ] PDF download triggered on button click
- [ ] PDF gated to Investor Pro and above

---

## Week 7–8 — Auth, payments, access control

- [ ] Supabase auth — email + password signup
- [ ] Supabase auth — Google OAuth
- [ ] User session management (JWT, refresh tokens)
- [ ] Stripe — Free, Pro ($10), Professional ($59), Team ($299) products created
- [ ] Stripe — subscription checkout flow
- [ ] Stripe — webhook handling (subscription created, updated, cancelled)
- [ ] Tier stored on `users` table, updated via webhook
- [x] Free tier: 10 analyses/month counter enforced (backend 429 FREE_LIMIT_REACHED via JWT auth + getMonthlyAnalysisCount)
- [x] Free tier: analysis limit gate screen with upgrade prompt (HardLimitGate wired into AnalyzingPage via limit_gate view)
- [ ] Free tier: PDF button locked with upgrade prompt
- [ ] Free tier: SunScout building obstruction locked (Phase 2 — show placeholder)
- [ ] Free tier: portfolio tracker locked
- [ ] Free tier: AI narrative capped at 1 paragraph
- [ ] Pro tier: all above unlocked
- [ ] Shareable link generation (UUID token stored in `analyses.share_token`)
- [ ] Shareable link viewer (no login, shows full report, 30-day expiry)
- [x] Province waitlist — email capture stored to `waitlist` table with province tag (POST /waitlist + addToWaitlist() + ProvinceGate onSubmit wired)
- [ ] Guest analysis — 1 free analysis without login, email capture at end

---

## Week 8–10 — Testing, polish, deploy

### Testing

- [ ] End-to-end test: paste 20 real Ontario listings, 1 of each property type
- [ ] Verify calc engine output against manual spreadsheet for each
- [ ] Verify rental comps pulling correctly for urban vs rural properties
- [ ] Verify deal score matches formula for at least 5 test properties
- [ ] Test all error states (scraper fail, no comps, expired listing, non-Ontario)
- [ ] Test all tier gates (free limits, PDF gate, portfolio gate)
- [ ] Test shareable links (generate, view without login, expiry)
- [ ] Test PDF generation for all 4 report types
- [ ] Run golden dataset regression suite — must pass 95%+ before launch
- [ ] Mobile test: scorecard and AI narrative on iOS and Android

### Deploy

- [x] Vercel project connected to GitHub repo (frontend auto-deploy on push)
- [ ] propscout.ca domain connected to Vercel (A record + CNAME in GoDaddy DNS)
- [ ] Railway services deployed: Fastify API, Python calc engine, scraping workers
- [ ] Environment variables set (Supabase URL/key, Stripe keys, Claude API key, Walk Score key, Mapbox token, Google Places key)
- [ ] Supabase production database — all migrations run
- [ ] Nightly rental comps scraper scheduled and confirmed running
- [ ] Error logging in place (Railway logs minimum — Sentry optional)

### Launch checklist

- [ ] "Not financial or legal advice" disclaimer visible on all reports
- [ ] Privacy policy page live at propscout.ca/privacy
- [ ] Terms of service page live at propscout.ca/terms
- [ ] Stripe billing portal linked from account settings
- [ ] Contact / support email set up (support@propscout.ca)
- [ ] Google Analytics or Plausible installed for basic traffic tracking

---

## Definition of MVP done

MVP is done when ALL of the following are true:

1. A user can paste a Realtor.ca or Zillow.ca URL and receive a full report in under 30 seconds
2. All 4 report modes work end-to-end (investment, personal, tenant, landlord)
3. Rental comps are pulling live data from the nightly scraper
4. The deal score formula is deterministic and tested against 5+ real properties
5. The extraction pipeline passes 95%+ on the golden dataset
6. PDF export works for all 4 report types
7. Stripe subscriptions are live (all 4 tiers)
8. propscout.ca is live and serving the app
9. A user who has never seen the product can complete an analysis without help
