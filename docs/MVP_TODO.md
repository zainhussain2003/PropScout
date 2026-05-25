# PropScout — MVP Task List

Last updated: 2026-05-25 — ticked items confirmed complete as of feat/financing-scenarios branch
Reference spec: `propscout_platform_spec.md`
Full backlog: `TODO.md`

Tick off tasks as they are completed. Build in this order — each week's work depends on the previous.

---

## Week 1–2 — Data pipeline (nothing else works without this)

### Realtor.ca scraper

- [x] Extract listing ID from Realtor.ca URL
- [x] Fetch listing page and parse dataLayer.push() + element IDs (internal JSON API is Incapsula-blocked; HTML scraping via ScraperAPI is the confirmed approach — spec Section 11.2)
- [x] Parse: address, price, beds, baths, sqft, property type
- [x] Parse: annual taxes (taxes_known = true/false)
- [x] Parse: condo fee (condo_fee_known = true/false)
- [x] Parse: year built (year_built_known = true/false)
- [x] Parse: listing type (for_sale vs for_rent)
- [x] Parse: days on market, photo URLs, listing description
- [x] Store to `listings` table in Supabase
- [x] Handle scraper failure → return partial data for manual entry fallback
- [x] Rate limiting: file-based 4 s global limiter + 3–7 s jitter; proxy rotation via PROXY_1/2/3 env vars

### Zillow.ca scraper

- [x] Playwright headless Chrome setup on Railway
- [x] Navigate to listing URL, wait for full page load
- [x] Extract same fields as Realtor.ca scraper (Cloudflare bypass deferred to FUTURE.md until demand confirmed)
- [x] Detect listing type from page structure and price format
- [x] Detect if URL is a US property — postal code gate returns Ontario error for non-Canadian addresses
- [x] Handle scraper failure gracefully

### Listing type detection

- [x] Parse URL to detect for-sale vs for-rent (spec Section 3)
- [x] Fallback: detect from scraped price format (monthly = rental)
- [ ] Ambiguous case: default to for-sale, show toggle (toggle is frontend — PR 3)

### Rental comps scraper (nightly job)

- [ ] Playwright scraper for Rentals.ca
- [ ] Playwright scraper for Kijiji (rental category)
- [ ] Playwright scraper for PadMapper
- [ ] Normalise: geocode address to lat/lng
- [ ] Normalise: convert weekly rents to monthly
- [ ] Normalise: parse beds to integer
- [ ] Deduplicate: same address + rent + beds within 7 days = one record
- [ ] Store to `rental_listings` table with timestamp
- [ ] Schedule as nightly Railway job at 2am ET

### Province detection

- [x] Parse postal code from scraped address
- [x] Ontario FSA check (starts with K, L, M, N, P)
- [x] Non-Ontario → return province code, block analysis, trigger waitlist flow

---

## Week 2–3 — Calc engine

- [x] Python FastAPI service set up on Railway
- [x] Gross rental income calculation
- [x] Operating expenses: taxes + insurance (0.35% of value) + maintenance + vacancy (5%)
- [x] Management fee toggle (8%, off by default)
- [x] Maintenance reserve by age: post-2010 (0.5%), 1980–2010 (1.0%), pre-1980 (1.5%)
- [x] NOI calculation
- [x] Cap rate = NOI / purchase price
- [x] Monthly mortgage payment (standard amortisation formula)
- [x] Annual and monthly debt service
- [x] Annual and monthly cash flow = NOI − debt service
- [x] Total cash invested = down payment + LTT + closing costs estimate
- [x] Cash-on-cash return = annual cash flow / total cash invested
- [x] DSCR = NOI / annual debt service
- [x] GRM = purchase price / annual gross rent
- [x] Break-even rent = all monthly expenses combined
- [x] Ontario LTT calculation (non-Toronto and Toronto — spec Section 6)
- [x] OSFI stress test: qualifying_rate = max(contract_rate + 0.02, 0.0525)
- [x] Four financing scenarios (base, OSFI stress, 35% down, conservative)
- [x] Equity build projection — 20-year equity curve with appreciation (`equity_build.py`)
- [x] Sanity checks on all metric outputs — cap rate, deal score, cash flow, DSCR, break-even (`sanity.py`)
- [x] Deal score formula — all components (spec Section 10)
- [x] Risk flag deductions applied to deal score
- [x] NRST (25% of purchase price) added to closing costs for Ontario non-resident buyers
- [x] `get_nrst_risk_flag()` — red flag with formatted dollar amount surfaced when NRST applies
- [x] Bank of Canada weekly rate fetch — 7-day file cache, 3-level fallback (live → cached → hardcoded 4.79%)
- [x] `GET /rates/mortgage` FastAPI route — returns rate + source + fetched_at + warning
- [x] `GET /rates/mortgage` Fastify proxy route — frontend calls this, never Python directly
- [x] Unit tests: all passing across mortgage, investment, closing_costs, deal_score, osfi, equity_build, sanity, bank_of_canada_service
- [x] Calibration test: 5702 Buttermill Ave scores ≤ 5/100 (hard pass — correct direction)

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
- [x] `<Chip>` — inline pill tag
- [x] `<Button variant="primary|ghost|accent">` — all three variants, hover → terracotta 0.15s
- [x] `<Card>` — surface + line + shadow + radius-lg
- [x] `<SectionHead n topic question verdict tone>` — every report section header (shared across all 4 reports)
- [x] `<VerdictPill tone label>` — pass / caution / fail pill with dot prefix
- [x] `<Nav variant>` — landing, report, and account variants
- [x] `<Footer>` — shared footer
- [x] `<SignInModal open onClose>` — bottom-sheet sign-in / sign-up
- [x] `<Tooltip text>` — inline ? trigger with floating tooltip (used by AssumptionFields and report sections)
- [x] `<RateBanner warning>` — amber alert banner shown when mortgage rate is from stale cache or hardcoded fallback
- [x] Unit test + accessibility test every shared component before moving to PR 2

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
- [x] 100% unit test coverage on all 8 functions (101 tests passing)
- [x] Calibration test: 5702 Buttermill scores 0/100 (hard pass — scores ≤ 5, correct direction)
- [x] Hamilton duplex calibration test: scores 72/100 (good deal — scores ≥ 65, correct direction; corrected from 84 — prior figure used 1.8% vacancy instead of standard 5%)

### PR 2b — Investor assumption inputs (built ahead of PR 4 to unblock calc engine wiring)

Reference: `Investor Report.html` — financing/assumptions panel

- [x] `<AssumptionFields onAssumptionsChange initialValues rateMetadata compact>` — 7 editable numeric assumption inputs (vacancy, insurance, management fee, maintenance, appreciation, legal fees, mortgage rate) + non-resident buyer boolean toggle
- [x] Mortgage rate pre-filled from live Bank of Canada rate (`rateMetadata.rate × 100`)
- [x] NRST checkbox — checked state adds 25% of purchase price to closing costs; tooltip cites exemptions and links to lawyer advice
- [x] `AnalysisAssumptions` type exported — used by investor report + landlord report
- [x] `constants/assumptions.ts` — `ASSUMPTION_FIELDS`, `BOOLEAN_ASSUMPTION_FIELDS`, `DEFAULT_ASSUMPTIONS`, `DEFAULT_BOOLEAN_ASSUMPTIONS` — no magic numbers in component
- [x] 31 unit tests passing (field defaults, clamping, tooltip count, boolean toggle, banner conditions, rate pre-fill, initialValues precedence)

### PR 3 — Landing + Mode modal

Reference: `index.html` + `Mode Modal.html` + `mode-modal.jsx`

- [ ] Landing page `/` — URL paste hero, embedded sample report, pricing section, FAQ
- [ ] URL input bar with validation (Realtor.ca and Zillow.ca regex patterns)
- [ ] `<ModeModal open listing onSelect>` — for-sale (Investment/Personal) and for-rent (Tenant/Landlord) routing
- [ ] Listing type auto-detection (for-sale vs for-rent from URL)
- [ ] All hover and click interactions match the design exactly
- [ ] Modal open animation: backdrop 0.25s fade + card translates up 8px + scales 0.98→1

### PR 4 — Investor report end-to-end

Reference: `Investor Report.html` + `investor-report.jsx` + `investor-sections.jsx` + `investor-sections-2.jsx`

- [ ] `<DealScore score size label showVerdict animate>` — radial gauge, stroke animation 1.4s cubic-bezier(.2,.7,.2,1)
- [ ] `<Metric label value sub status>` — headline metric tile
- [ ] `<RentalCompsBar low mid high ask>` — percentile bar + hover diamond marker
- [ ] `<AIVerdictBlock>` — dark full-bleed card with ScoutMark watermark
- [ ] `<RiskRow tone label detail>` — inline risk flag row
- [ ] `<MiniMap height address pins>` — placeholder SVG map (replace with real Mapbox GL JS)
- [ ] `<PropertyHero listing score>` — photo grid + chips + address + sticky score card
- [ ] `<FinancingSliders financing onChange>` — live sliders, every metric recalculates instantly on drag
- [ ] `<OSFICard osfi financing>` — OSFI stress test card
- [ ] `<LTTTable ltt price toronto>` — Ontario LTT bracket table
- [ ] `<EquityChart equityCurve totalCashInvested>` — 20-year line chart with hover tooltip
- [ ] `<InvestmentMetricsSection>` — 8-tile metrics grid + annual expense breakdown
- [ ] `<NeighbourhoodSection>` — 6 stat tiles + comparable sales + appreciation card
- [ ] `<STRPlaceholderSection>` — Phase-2 placeholder + STR legality card
- [ ] All 11 investor report sections rendered and functional
- [ ] Use Vaughan dataset from `investor-calc.jsx` until scraper is live

### PR 5 — Tenant report

Reference: `Tenant Report.html` + `tenant-report.jsx` + `tenant-sections.jsx` + `tenant-sections-2.jsx` + `tenant-sections-3.jsx` + `tenant-schools.jsx`

- [ ] `<FlagDeepRow flag>` — expandable risk flag with evidence quote + "Ask before signing"
- [ ] `<ListedVsRealitySection>` — conditional side-by-side cards (only when flags fire)
- [ ] `<WhatsIncludedSection>` — amenities grid with included/extra/unclear colouring
- [ ] `<LocationCommuteSection>` — Walk/Transit/Bike scores + distances
- [ ] `<NegotiationSection>` — leverage card + suggested-message card
- [ ] `<TenantSchoolsSection>` — slim schools section (1 per board × 3 levels)
- [ ] Full unit breakdown card — all scraped fields, "Not listed" for missing values
- [ ] Confirm-before-signing checklist — dynamically generated from fired flags, copy-pasteable negotiation script
- [ ] Conversion prompt at bottom — links to Report A flow + optional email capture
- [ ] All 12 tenant report sections rendered (spec Section 8)

### PR 6 — Personal buyer + Landlord reports

Reference: `Personal Buyer Report.html` + `Landlord Report.html`

- [ ] `<SchoolCard school>` + `<SchoolColumn>` — EQAO + Fraser + catchment badge
- [ ] `<PBTrueCostSection>` — itemised monthly cost table
- [ ] `<PBFMVSection>` — FMV positioning bar
- [ ] `<PBSalesSection>` — comparable sales table
- [ ] Personal buyer report — all 6 sections (spec Section 7)
- [ ] Landlord report — all sections (reuses investor components heavily)

### PR 7 — Paywall, account, errors, auth

Reference: `Paywall States.html` + `Account.html` + `Error States.html` + `Auth & Billing Stubs.html`

- [ ] `<ProBadge tier>` — inline Pro marker with lock icon
- [ ] `<UpgradeCard headline sub ctaLabel dark>` — upgrade pitch card
- [ ] `<LockedSection headline sub mockContent height>` — blurred content + upgrade overlay
- [ ] `<TruncatedVerdict firstParagraph>` — AI verdict paragraph 2 blurred + inline upgrade strip
- [ ] `<LockedButton label icon onClick>` — lock-icon button opening upgrade modal
- [ ] `<UpgradeModal open onClose feature>` — 5 feature-specific variants
- [ ] `<HardLimitGate onClose monthlyLimit used resetsIn>` — full-screen monthly limit blocker
- [ ] `<BlockState>` — full-page error/gate state
- [ ] `<ProvinceGate>` — non-Ontario waitlist
- [ ] `<NoCompsInlineState>` — inline low-confidence callout
- [ ] `<ScraperPartialInlineState>` — inline "X of Y fields" + missing-field inputs
- [ ] Account dashboard `/account` — saved analyses, profile, plan, notifications tabs
- [ ] Auth stubs: magic link confirm, password reset, email verified, Stripe welcome, Stripe cancelled
- [ ] Wire all paywall components into every report

### PR 8 — Legal + 404 + mobile pass

Reference: `Legal Pages.html` + `Mobile Pass.html`

- [ ] Privacy policy `/privacy` with TOC sidebar
- [ ] Terms of service `/terms` with TOC sidebar
- [ ] 404 catch-all
- [ ] Mobile responsive pass — all routes at 380px
- [ ] Modal → bottom-sheet on mobile (slides up with drag handle)
- [ ] Two-column reports collapse to single-column
- [ ] Sticky bottom action bar (Save/Share/PDF)
- [ ] AI verdict headline-only on mobile with "Read full verdict" expand
- [ ] Score card moves above content on mobile (gauge shrinks to ~84px)

---

## Week 4–5 — School and neighbourhood data

- [ ] Load EQAO dataset into Supabase `schools` table (download from eqao.on.ca)
- [ ] Scrape Fraser Institute school rankings (fraserinstitute.org/school-performance)
- [ ] Store Fraser data in `schools` table alongside EQAO
- [ ] Google Places API integration — find nearby schools by coordinates (type=school)
- [ ] Match Google Places results to `schools` table by name + address
- [ ] Return nearest 3 per type (elementary, middle, high) with distance and drive time
- [ ] Highlight schools within catchment area (TDSB polygon data — Toronto first)
- [ ] Walk Score API integration (Walk Score + Transit Score)
- [ ] Statistics Canada — demographics by postal code (household income, population growth)
- [ ] CMHC vacancy rate by city (public API, refresh quarterly)
- [ ] Neighbourhood intelligence module assembled from above sources

---

## Week 5–6 — Extraction pipeline and risk flags

All tasks reference spec Section 19.

- [ ] Deterministic regex rules — all patterns for all flag types
- [ ] Claude Haiku extraction — API call setup, prompt template (TEMPLATE — iterate)
- [ ] JSON parse validation with fallback (all-false on parse error, log failure)
- [ ] Logic gate — merge regex + AI results with confidence thresholds
- [ ] Red flag threshold: 85%+ → red, deducts score
- [ ] Amber flag threshold: 60–84% → amber, no score deduction
- [ ] Below 60% → not shown
- [ ] `flag_overrides` table in Supabase
- [ ] User override toggle component in React
- [ ] Override triggers instant deal score recalculation (no page reload)
- [ ] Override state saved to analysis record
- [ ] All 7 risk flag types rendering correctly in report UI
- [ ] **Golden dataset — 50 real Ontario listing descriptions collected and labelled**
- [ ] Pytest regression test suite written for golden dataset
- [ ] Accuracy at or above 95% before proceeding to Week 6

### SunScout

- [ ] pvlib installed in Python calc engine
- [ ] `window_sun_hours_by_month()` function (spec Section 17 — TEMPLATE)
- [ ] `annual_light_score()` function (spec Section 17 — TEMPLATE)
- [ ] Window direction input UI (compass direction dropdown per window)
- [ ] Monthly sun hours grid output (Dec / Mar / Jun / Sep columns)
- [ ] Sun arc SVG visualization (summer vs winter day)
- [ ] Score interpretation labels (80–100 excellent, etc.)
- [ ] SunScout section rendering in all 4 report types

---

## Week 6–7 — AI narratives and PDF

### Claude Sonnet narratives

- [ ] Report A / D investment prompt — free tier (1 paragraph, 60–120 words)
- [ ] Report A / D investment prompt — Pro tier (3 paragraphs, 150–320 words)
- [ ] Report B personal prompt — free tier
- [ ] Report B personal prompt — Pro tier
- [ ] Report C tenant prompt — free tier
- [ ] Report C tenant prompt — Pro tier
- [ ] Output validation: word count, banned phrases, dollar figure requirement
- [ ] Regenerate once on validation failure, log and show fallback on second failure
- [ ] Calibrate against gold-standard examples in spec Section 12

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
- [ ] Free tier: 10 analyses/month counter enforced
- [ ] Free tier: analysis limit gate screen with upgrade prompt
- [ ] Free tier: PDF button locked with upgrade prompt
- [ ] Free tier: SunScout building obstruction locked (Phase 2 — show placeholder)
- [ ] Free tier: portfolio tracker locked
- [ ] Free tier: AI narrative capped at 1 paragraph
- [ ] Pro tier: all above unlocked
- [ ] Shareable link generation (UUID token stored in `analyses.share_token`)
- [ ] Shareable link viewer (no login, shows full report, 30-day expiry)
- [ ] Province waitlist — email capture stored to `waitlist` table with province tag
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
