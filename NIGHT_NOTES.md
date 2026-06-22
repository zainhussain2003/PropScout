# Work log — 2026-06-21

## ⚠️ Unsourced / assumed values — track, validate, do not trust as researched

These numbers drive user-facing decisions but are **not** backed by a dataset in
the codebase. They are hand-picked or industry-norm assumptions. Each needs a real
source before it should be presented as authoritative. (Added during the product-design
pass on mode-specific severity, OSFI income, and cap-rate valuation.)

| Factor                                            | Current / proposed value              | Source status                                                                                                 | What would validate it                                                                                                            |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Per-city cap rates** (for-rent value est.)      | none yet — table to be created        | ❌ GUESS — no constant exists; CMHC has rent not cap rates                                                    | Published Ontario cap-rate survey (e.g. CBRE Cap Rate Survey), or derive from board median price ÷ CMHC median rent per city/type |
| **expenseRatio per property type** (NOI est.)     | ~35–45% of gross rent (TBD)           | 🟡 DERIVED/NORM — partials exist in `rates.py` (% of value, not rent); OER is an industry norm                | Compute the calc engine's own expense model across a representative sample, or use a documented residential OER benchmark         |
| **Flag severity × mode mapping** (the matrix)     | see matrix draft v2                   | 🟡 INFORMED — legal cells (no_pets void = RTA s.14; N12 own-use) are law-sourced; the rest is reasoned design | Investor/realtor/paralegal SME review of the non-legal cells                                                                      |
| **Red-flag deduction magnitudes** (points column) | −5 standard / −10 severe (proposed)   | ❌ GUESS — no dataset ranks flag severity in points                                                           | SME calibration against known deals                                                                                               |
| **Severe = 2× standard (the ratio)**              | implied by −10 vs −5                  | ❌ GUESS — a grow-op isn't exactly 2× a reno; the ratio is as invented as the absolutes                       | SME calibration; tune the ratio independently of the absolute values                                                              |
| **Tiered deduction caps**                         | severe −30 (3 express) / standard −15 | ❌ GUESS — replaces the old flat −15 so dealbreakers can crater the score while soft flags can't pile up      | SME calibration of how far the worst-tail should be allowed to fall                                                               |
| **OSFI default household income**                 | $125,000 (existing placeholder)       | ❌ GUESS — placeholder in `demoData`/types                                                                    | StatsCan Ontario median household income for the buyer demographic                                                                |

**Rule going forward:** any new decision-driving number that can't cite a source lands
in this table with its placeholder and a validation path — not buried in code as if researched.

### Re-basing check — downstream consumers of the deal score (done before coding the matrix)

The mode-weighted magnitudes change the score _distribution_, not just individual
properties. I audited every consumer:

- **Sort order:** none — nothing sorts analyses by score (Account list is "most recent").
- **Filter thresholds:** none by score — Account filters by _mode_ (`kind`), not score.
- **API gating:** none — no route filters/sorts/gates on score.
- **Label cutoffs:** the only score→label mapping is `verdictFromScore` / `get_verdict`
  on the fixed brackets (20/50/65/80). Distribution-agnostic — labels just re-distribute
  (intended), the mapping doesn't break. ✅
- **Stored score — the one real exposure:** `analyses.deal_score` is persisted. Records
  scored under the old flat −5 will read differently from a re-analysis under the new
  tiers. **Pre-launch (test data only) ⇒ accept the re-base.** If real saved scores ever
  exist, add a `score_version` column or batch-recompute rather than mix scales.
- **Pre-existing wart surfaced (not caused by this):** three _different_ hardcoded
  score→colour cutoffs exist that don't match the verdict brackets — `DealScore.tsx`
  gauge (≤25 fail / ≤60 caution) and `LandingPage.tsx` (≥65 / ≥40). The re-base makes
  label↔colour disagreements more visible. Worth a small cleanup to unify all colour
  bands on the verdict brackets. Separate from the matrix.

### Nightly scraper — deploy-readiness audit (read-only, greenlit)

**Verdict: structurally deploy-ready; one expected caveat.**

- Entry `python rental_comps_scraper.py` matches `railway.json` (NIXPACKS, `playwright
install --with-deps chromium`, cron `0 6 * * *` UTC, restart NEVER). ✅
- Pipeline: scrape → normalise → dedupe (in-batch + 7-day window) → geocode (non-fatal)
  → **append-only** insert into `rental_listings`. Per-source failure is isolated. ✅
- Env: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` required (fails loud if missing);
  `MAPBOX_TOKEN` optional (warns, stores without coords). Matches the Tier-1 instructions. ✅
- Tests: **105 passing** (normalisation, dedupe, orchestrator with mocked sources). ✅
- ⚠️ **Caveat:** the three source scrapers (`sources/rentals_ca|kijiji|padmapper.py`) use
  **TEMPLATE CSS selectors** (CLAUDE.md §11.2). They run, but the first live run may return
  few/zero rows until the selectors are verified against current site markup. Plan: deploy →
  manual run → check `rental_listings` → tune selectors if sparse. (`realtor_scraper.py` is a
  stub, but that's the per-listing scraper, not the nightly cron — irrelevant to this deploy.)

## Blocked on you — handle when you have time

In priority order:

### Tier 1 — directly affects score accuracy

1. **Deploy nightly scraper to Railway** (Phase 2)
   - `npm install -g @railway/cli` if needed
   - `cd services/scrapers && railway login && railway init`
   - Set in Railway dashboard env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MAPBOX_TOKEN`
   - `railway up`
   - Trigger one manual run from the dashboard; verify `rental_listings` rows appear
   - **Impact:** until this runs, `rentalComps` is always a fallback estimate, which directly degrades `cap_rate`, `cash_flow`, `DSCR`, `CoC`

### Tier 2 — improves data quality

2. **Refresh CMHC vacancy table** with current published numbers
   - Open `apps/api/src/constants/cmhcVacancy.ts`
   - Get the latest CMHC Rental Market Survey (cmhc-schl.gc.ca, published ~Q1 annually)
   - Replace the placeholder values with current actual rates per CMA
   - **Impact:** `demand` component of deal score (max 10 pts) is currently using indicative not authoritative values

3. **Refresh Ontario property tax rates** (annual)
   - `apps/api/src/constants/propertyTaxRates.ts` — values are 2024/25 cycle
   - Refresh annually from municipal budget docs

4. **ScraperAPI render mode** — Realtor.ca returns 500 with `render=true`, only works with `premium=true` alone (already wired). Worth contacting ScraperAPI support if you want JS-rendered fields (year_built, sometimes condo fee) back

### Tier 3 — feature gaps

5. **Stripe products live** (Phase 6)
   - Create Investor Pro $10/mo, Professional $59/mo, Team $299/mo in Stripe dashboard
   - Put price IDs in `.env`: `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_TEAM`
   - Register webhook at `/webhooks/stripe`; copy signing secret to `STRIPE_WEBHOOK_SECRET`
   - For local testing: `ngrok http 3001`

6. **School data** (Phase 4)
   - Download EQAO results (https://www.eqao.com/results-and-data)
   - Download Fraser Institute rankings (https://www.fraserinstitute.org/school-performance)
   - Either combine into one CSV matching the headers expected by `scripts/load-schools.mjs`, or pre-process
   - Run: `node scripts/load-schools.mjs path/to/schools.csv`
   - Get Google Places API key (Maps Platform → enable Places API), add `GOOGLE_PLACES_KEY=<key>` to `.env`

7. **Golden dataset** (Phase 7)
   - Collect 50 labelled Ontario listing descriptions
   - Save to `services/calc-engine/tests/golden_dataset/golden_cases.json`
   - Run `pytest services/calc-engine/tests/golden_dataset/test_extraction.py` until ≥95%

---

## What I worked on overnight + today

See git log on branch `feat/combined-route-wiring-and-status`. Highlights:

- Merge of `feat/route-wiring` + `origin/claude/codebase-status-next-b2uufc`
- DB schema alignment (`20260622_align_to_initial_schema.sql`)
- Per-listing pipeline working end-to-end against live Realtor.ca URLs
- Data persistence fixes (rent_monthly, city, walkScore, hasSanityWarnings) + migration `20260622_add_listing_extras.sql`
- Score accuracy fixes (risk-flag deductions, live mortgage rate, estimated taxes, year-built fallback, calc engine .env loading, flag labels)
- 1300+ tests passing across 4 test suites

---

## What's running while you're away

Per your direction: keep going on backend / data / quality. All four focus areas:

- Score quality improvements (dedup, mode-specific severity, OSFI surfacing, better for-rent valuation)
- Schools service layer (reads empty table, ready for data)
- Observability + error handling
- Spec doc updates
- ~~Override UI wiring into the 4 report pages~~ ✅ **done** — see below

I'll fix edge cases I find as I find them and note unusual ones at the bottom of this file.

---

## Done since last update

### Risk-flag override UI wired into all 4 report modes

`apps/web/src/pages/ReportPage.tsx` (`/r/:token`) is the live renderer for every
real analysis. The override infra already existed (hook `useFlagOverrides`,
`overrideService`, API route `/analysis/:token/overrides`, and `RiskRow`'s
`dismissable`/`dismissed`/`onToggleDismiss` props) but **no report page consumed it** —
flags rendered read-only.

Wired `useFlagOverrides(token)` into `ReportPage` and threaded a new
`FlagOverrideControls` type into both renderers:

- `InvestorReportContent` (investor / landlord / personal) → `RiskFlagsSection`
- `TenantReportContent` (tenant) → inline flag list

Each flag now shows Dismiss / Restore; toggling persists via the service with
optimistic update + rollback on failure (hook already handled that). No-ops on
the demo routes (`/investor-report`, etc.) since there's no live token.

Added `apps/web/src/pages/ReportPage.test.tsx` (3 functionality tests). Full web
suite green: **795 passing / 59 files**, typecheck clean.

---

### Live deal-score recalc on flag dismissal ✅ (you chose option B)

You said dismissing a flag should move the score live. Done.

- New pure functions in `apps/web/src/lib/investorCalc.ts`:
  - `verdictFromScore(score)` — mirrors the Python `get_verdict` brackets exactly.
  - `adjustDealScoreForOverrides(base, flags, dismissed)` — restores dismissed
    flags' deductions to the score, re-applies the 15-pt cap to the _remaining_
    deductions, and recomputes verdict / label / tagline / tone. Same formula the
    calc engine uses, so a client recompute lands on the identical number.
- Wired into `InvestorReportContent` (investor / landlord / personal). The
  `PropertyHero` gauge animates to the new score, the verdict pill + tagline flip,
  and the §06 "−X pts" line updates — all instantly on Dismiss / Restore, and on
  page load for already-dismissed flags (persisted overrides applied on first render).
- Stored `deal_score` stays the raw baseline; the display layer applies the
  adjustment. Updated the now-accurate docstrings in `overrides.ts` +
  `supabaseService.ts` (they previously claimed a calc-engine re-run filter that
  was never actually implemented — see follow-up below).
- Tests: 5 unit tests for the two pure fns (cap behaviour, verdict crossing, amber
  no-op), 2 functionality tests proving the gauge moves 65 → 70 on dismiss and
  starts at 70 when pre-dismissed. Full web suite green: **802 passing / 59 files**,
  typecheck clean.

---

### Quality pass — calc-engine + API (autonomous, no blockers hit)

Three score-accuracy / code-quality fixes, each with tests:

1. **Sanity checks now cover deal score + cash flow + negative break-even.**
   `sanity_check_metrics` (calc engine) previously bounded cap rate, rent, price,
   DSCR and the break-even _ratio_ — but not the deal score or monthly cash flow,
   both of which CLAUDE.md §12 says must have bounds, and a _negative_ break-even
   slipped through. Added optional `deal_score` (0–95) and `cash_flow_monthly`
   (±$20K) params + a negative-break-even guard; wired the two new values from the
   router. +11 unit tests. (`calculations/sanity.py`, `sanity_test.py`, `routers/analysis.py`)

2. **For-rent valuation magic numbers → documented constants.** The orchestrator
   had inline `* 200`, `* 0.005`, `±10%`, `1500` literals burying the ~6% gross-yield
   assumption (CLAUDE.md §11 violation). Extracted to `apps/api/src/constants/valuation.ts`
   with the rent↔price proxies locked as exact reciprocals. +4 unit tests.

3. **Real per-city CMHC vacancy now drives the demand score.** The deal score's
   demand component (up to 10 pts) was using a flat hardcoded `0.02` while the API
   already fetched real per-city vacancy (`getVacancyRateByCity`) — but only used it
   for the narrative. Threaded the real rate into the calc payload + schema; the
   calc engine uses it (falls back to default when omitted). This is the unblocked
   complement to your Tier-2 "refresh CMHC table" task — once you refresh the
   numbers, they now actually move the score. +3 tests (2 calc-route, 1 API payload).

Suites green after each: calc-engine **298 passing**, API **124 passing**, typecheck clean.

4. **Docs synced to shipped code** (CLAUDE.md's "new feature" Step 1 + 2):
   - Spec §19 (override toggle) reworded to match the shipped design — greys out +
     **Restore** (not "disappears"), live recalc via `adjustDealScoreForOverrides`,
     stored score stays raw baseline. The spec already specified live recalc and
     already listed `cmhc_vacancy_rate` in the calc payload — so the per-city vacancy
     change brought the _code_ in line with the _spec_, not the other way round.
   - `TESTING.md` Test 33 rewritten (dismiss/restore + live gauge + reload persistence
     - demo-route gating) and Tests 33a (sanity bounds) + 33b (vacancy→demand) added,
       each with their automated-coverage pointers.

---

## Where I've stopped — remaining items need you or are deferred

I worked through everything unblocked. What's left needs a decision or data from you:

- **Mode-specific flag severity** — needs you to define _which_ flags change severity by
  report mode and by how much. The calc engine doesn't even receive `mode` yet; threading
  it in is pointless until the rules exist. Product decision.
- **OSFI "surfacing"** — currently OSFI uses a fixed $125K assumed income (shown as
  "at $125K income", by design). Making it real needs an income-input UI + decision on
  prominence. Product/design decision.
- **Better for-rent valuation** — the `rent × 200` proxy (now a documented constant) needs
  real market cap-rate data to improve. Data-blocked (overlaps your CMHC/comps tasks).
- **Schools service layer** — code reads an empty table; nothing to verify until the EQAO /
  Fraser data is loaded (your Tier-3 task #6).
- The earlier follow-ups (account-list / PDF score consistency, backend re-run override
  filter) you said to handle later.

Error isolation in the orchestrator was reviewed and is already sound (geocode + walk score

- narrative all degrade to null/fallback; only a calc-engine outage hard-fails, correctly).

---

## Non-blocking follow-ups — status

### ✅ Done: backend re-run now honours overrides (was follow-up #2)

`POST /analysis` now fetches `getFlagOverrides(token)` and forwards
`dismissed_flag_ids` to the calc engine, which drops those flags' deductions (the
flags are still returned, shown greyed out). The override fetch is fully defensive
(any failure → no dismissals; analysis never fails). Verified this can't
double-count with the live display recalc: `adjustDealScoreForOverrides` recomputes
from the score _subtotal_, not the stored total, so it's idempotent — whether the
stored score is raw or already-adjusted, the displayed value is the same. +3 tests
(2 calc-route: deduction drops on dismiss / unknown id is a no-op; 1 API: payload
forwards the dismissed IDs). Updated `overrides.ts` docstring to describe both paths.

### ✅ Done (partial): CLAUDE.md structure reconciled for the backend (was follow-up #3)

Both `CLAUDE.md` and `docs/CLAUDE.md` had the api `routes/` and `constants/`
trees badly out of date (missing overrides, scrape, rates, billing, me, waitlist,
analysisToken; flagLabels, cmhcVacancy, propertyTaxRates, valuation). Reconciled
those sections in both files.

### ⚠️ Not done — needs a decision from you

1. **Account "saved analyses" list (was follow-up #1) is NOT a quick cleanup.**
   `AccountPage` renders a hardcoded `SAVED_ANALYSES` fixture — there is **no
   endpoint to list a user's real saved analyses**, so there's no real score to
   override-adjust yet. Making it real = a new auth'd list endpoint + frontend
   fetch + wiring (a feature, not a cleanup). Same applies to PDF export (not built).
   When we build either, they should call `adjustDealScoreForOverrides` — but note
   that with the backend re-run filter above, the _stored_ score already converges,
   so this matters less now.
2. **Two near-duplicate `CLAUDE.md` files** (root + `docs/`, ~66 KB each) drift
   independently — I had to edit both. Worth picking one canonical copy (or making
   one a pointer to the other). A full web-component-tree audit of the structure is
   also still pending. Quick decision needed before I invest in either.
