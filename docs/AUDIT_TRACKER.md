# Audit Tracker — single source of truth for remaining work

> **Purpose:** This file tracks the priority-ordered fix list from the June 2026 full audit.
> Refer to this file at the start of every session — it survives chat compaction.
> Update it in the same commit as the work it describes.
>
> Legend: ✅ done (with commit) · 🟡 partially done · ⬜ not started · 🔒 blocked on user input

---

## Phase 1 — Do now (code only, no credentials)

| #   | Item                                          | Status       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~**A — Wire SunScout to report pages**~~     | ✅ `fc0adf5` | `useInvestorReport` now returns `sunScout`; `InvestorReport.tsx` passes it through. **Key finding:** `ReportPage.tsx` (the live `/r/:token` path) was already correctly wired. Tenant/PersonalBuyer/Landlord standalone pages are demo-only — their `null` is intentional until item B.                                                                                                                                                                                                                                                     |
| 2   | ~~**12–33 — Medium/low fixes**~~              | ✅ `a2b6bde` | Mode/kind URL param validation (AnalyzingPage + API route), HardLimitGate dynamic `cycleStart`/`resetDate` props (hardcoded "May 1"/"June 1" removed), mobile grid collapse on 7 components/pages, snapshots updated.                                                                                                                                                                                                                                                                                                                       |
| 3   | ~~**C — Infinity guard on break-even rent**~~ | ✅           | `fmtMoney`/`fmtPct` return `—` for NaN/±Infinity (`b6e9536`); calc engine `sanity_check_metrics` now names a non-finite break-even explicitly (`math.isfinite` guard — also catches NaN, which slipped through every comparison-based check). 2 unit tests.                                                                                                                                                                                                                                                                                 |
| 4   | ~~**D/E — Input bounds validation**~~         | ✅           | price > 0, downPaymentPct 0–1, mortgageRate (0,1) (`a2b6bde`; note: the `findRequestProblem` validator was removed when the route moved to token+mode — rent now enters via the scraper). **Rent bounds $500–$10,000/mo (decision 2026-07-01)**: `RENT_BOUNDS` in `apps/api/src/constants/thresholds.ts`; scrape route nulls+flags implausible for-rent prices (routes to manual entry), analysis route 422s `RENT_OUT_OF_BOUNDS` on an implausible fallback mid (previously a rent-less for-rent listing scored $0 rent). 6 new API tests. |
| 5   | ~~**G — FRONTEND_URL in .env.example**~~      | ✅ `a2b6bde` | Added `FRONTEND_URL=http://localhost:5173`. Used by `stripeService.ts` for checkout redirects.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | ~~**H — Flag label fallback cleanup**~~       | ✅ TBD       | `humaniseFlagId(id)` exported from `analysis.ts` — snake_case → Title Case fallback. Both calc-engine and Haiku label paths now use it. `condo_fee_unknown` added to `FLAG_LABELS` with explicit label. 5 unit tests + 2 route tests added.                                                                                                                                                                                                                                                                                                 |
| 7   | ~~**I — Condo fee consistency**~~             | ✅ TBD       | `routers/analysis.py` now appends a `condo_fee_unknown` amber `MergedFlag` (source=`structural`, confidence=100) when `property_type=='condo'` and `condo_fee_known==False`. Propagates via existing serialisation to Fastify. 3 new router tests added.                                                                                                                                                                                                                                                                                    |

## Phase 2 — Blocked on user input 🔒

| Item                       | Blocked on                             | Notes                                                                                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~**ScrapeAPI wiring**~~   | ✅ resolved                            | `realtor_scraper.py` fetches via ScraperAPI `premium=true` with `SCRAPER_API_KEY`; per-listing pipeline verified end-to-end against live Realtor.ca URLs (see NIGHT_NOTES). Remaining nicety: `render=true` 500s on Realtor.ca (ScraperAPI support ticket) — would recover JS-injected condo fee / year built. |
| **F — Golden dataset**     | 47 real listing descriptions from user | `golden_cases.json` has 3 of 50 required entries. The 95% gate passes trivially but is meaningless at this size.                                                                                                                                                                                               |
| **Stripe products**        | Price IDs from user's Stripe dashboard | Create Investor Pro / Professional / Team products, put price IDs in `.env` (`STRIPE_PRICE_PRO` etc. — placeholders already in `.env.example`).                                                                                                                                                                |
| **PR10 founder-note copy** | Zain's own 3–4 sentence story          | Shell built (`FounderNoteSection` in `LandingPage.tsx`, 2026-07-02) — renders nothing until `FOUNDER_NOTE_BODY` is filled with real first-person copy. Spec rule: ships with his words or it doesn't ship; biographical details must never be invented.                                                        |

## Known issues (found during PR10 verification, 2026-07-02 — all pre-existing)

| Item                                       | Notes                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landing 380px horizontal overflow** ⬜   | `document.scrollWidth` 743px at a 380px viewport. Offenders: header `.nav-links` row (no mobile collapse/hamburger), `#sunscout` inner grid (457px), `#pricing` grid (473px). Predates PR10 (PR10 changed no layout in these sections; its new sections pass at 380). PR8's mobile pass covered reports/modals but not these landing sections. Follow-up mobile PR. |
| **Prototype HTML files on old palette** ⬜ | `docs/design_handoff_propscout_mvp/` (designs + handoff `tokens.css`) still terracotta/cream. Production `apps/web/src/styles/tokens.css` is ahead — divergence table in `DESIGN_README.md`. Resync when the designs are next edited.                                                                                                                               |

## Phase 3 — Deferred (requires full pipeline live)

| Item                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **B — Live data on the 4 standalone report pages** | Pages render hardcoded demo constants (`VAUGHAN_LISTING`, `CHARLES_FLAGS`, `LL_PROPERTY`, `PB_SCHOOLS`). The live path today is `ReportPage.tsx` (`/r/:token`) which renders real analysis data. Wiring the standalone pages to live data requires scraper + comps pipeline to be live first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Walk Score integration                             | Service stub exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| CMHC vacancy data                                  | Service stub exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Google Places / Schools                            | 🟡 READ PATH BUILT 2026-07-02: `getNearbySchools(lat, lng)` in `supabaseService` (bounding box + haversine, nearest ≤3 per level, distance-ranked — catchment explicitly NOT claimed), fetched non-fatally in the analysis orchestrator, persisted in `market_data.schools`, threaded to the frontend (`Analysis.schools` + `shimToPersonalSchools`/`shimToTenantSchools`). Personal §04 + tenant §08 render real rows the moment the table has data; real addresses NEVER show fixture schools ("data pending" instead); the personal HomeScore gauge un-suppresses when schools are real (the documented re-enable trigger). **Verified live 2026-07-02: schools table = 0 rows and migration `20260701_add_schools_name_postal_unique.sql` NOT applied** (probed: no unique constraint) — apply it, then `node scripts/load-schools.mjs <csv>`, and the sections light up on the next analysis. Google Places live discovery still needs `GOOGLE_PLACES_KEY`. |
| PDF export (Puppeteer)                             | ✅ 2026-07-02 (except white-label): `GET /analysis/:token/pdf` (Pro+ gated) renders the live `/r/:token` report via Puppeteer with the branded footer (branding + disclaimer + timestamp + token + **share-link QR**, spec §14). Frontend: `reportService.ts` + `usePdfExport` hook wired into ReportPage (share bar + mobile sticky bar) and all 4 report pages (LockedButton→UpgradeModal for free; demo routes no-op). Print stylesheet in `global.css` (`@media print`: chrome hidden, cards never split). **Remaining:** Professional white-label branding (tier sold with manual delivery until built).                                                                                                                                                                                                                                                                                                                                                    |     |
| Flag override UI                                   | Post-MVP                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Current test baseline (keep green) — measured 2026-07-02 (post E2E proof run)

| Suite              | Count | Command                                               |
| ------------------ | ----- | ----------------------------------------------------- |
| Python calc-engine | 344   | `python -m pytest services/calc-engine/ -q`           |
| API (Jest)         | 167   | `npm test --workspace=apps/api`                       |
| Web (Vitest)       | 849   | `cd apps/web && npx vitest run`                       |
| Scrapers (pytest)  | 151   | `python -m pytest services/scrapers/ -q`              |
| Typecheck          | clean | `npm run typecheck --workspace=apps/web` / `apps/api` |

> Golden dataset gate: passes but is still **trivial at 3/50 labelled cases** —
> do not report it as a meaningful pass until the 47 remaining descriptions land.

## Visual-polish pass (2026-07-02) — prototype-fidelity fixes

Side-by-side audit of every built page against the 13 HTML prototypes
(headless tile screenshots, app vs `npx serve docs/…/designs`). Fixed:

- **Photo placeholders** — `PropertyHero` + `TenantReport` hero hard-coded flat
  `var(--line)` tiles with centered labels; now use the design's `.photo-ph`
  hatch texture with bottom-left mono labels (class already existed in
  global.css, was unused on these pages).
- **DealScore gauge** — number was small + tone-coloured; now large ink serif
  (`size*0.42`) per report-preview.jsx, with the verdict pill rendered INSIDE
  the ring (border + 8% tint). All hero gauges pass `showVerdict`; tenant,
  personal and sunscout gauges pass `max={100}` (arc was drawn against /95).
- **RentalCompsBar** — rebuilt to the prototype composition: "Asking rent"
  serif header + market-position pill, accent gradient bar with P25/P50/P75
  ticks, CSS-hover diamond tooltip, percentile labels, optional 12-mo
  trend/DOM/vacancy context strip (new `context` prop).
- **MiniMap placeholder** — flat grid replaced with the prototype's street-grid
  mock (park, river, road casings, buildings, halo subject pin, price-tag
  comp pins, zoom controls, attribution).
- **Section question copy** — InvestorReport + ReportPage(live) + TenantReport
  (live sections) had invented questions; restored the prototype wording
  ("What could break this thesis?", "Will the bank actually fund this?", …).
  LandlordPage's rewrites are deliberate owner-POV adaptations — kept.
- **AI verdict eyebrows** — TruncatedVerdict hardcoded "investor verdict" on
  all four modes; now a prop, mode-correct everywhere (tenant / home buyer /
  landlord / investor), including landlord mode on /r/:token.
- **SunScout demo fixtures** — demo routes showed the Phase-2 placeholder while
  every prototype shows the full sun section; added design-fixture SunScout
  data (Vaughan 84 / Hamilton 62 / Charles 84) + mode-specific question prop.
  (Landlord demo keeps the placeholder — the landlord prototype has no sun
  section. Tenant window-by-window card skipped: no per-window data exists.)
- **Metric tiles** — values were mono; design uses Instrument Serif.
- **Dark-mode parity** — 46 raw `rgba(255,255,255,…)` on ink cards (invisible
  on the cream-inverted dark-mode cards) → `color-mix(in oklab, var(--bg) N%)`.
  This fixes dark-mode readability the prototypes themselves get wrong.

> The old "scraper tests error on collection (missing playwright deps)" caveat no longer
> holds on the current dev machine — the scraper suite collects and passes; treat scraper
> failures as real regressions, not environment noise.

## Working agreement

- Branch: `feat/combined-route-wiring-and-status` — `claude/codebase-status-next-b2uufc`
  (PR #16) was merged into it and is stale; verify `git branch --show-current` rather than
  trusting this line if they ever disagree again.
- After every item: run affected suites + typecheck, update this file, commit, push.
- All Phase 1 items done (items 3 + 4 closed 2026-07-01: non-finite break-even sanity guard,
  $500–$10k rent bounds).
