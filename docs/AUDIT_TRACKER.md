# Audit Tracker — single source of truth for remaining work

> **Purpose:** This file tracks the priority-ordered fix list from the June 2026 full audit.
> Refer to this file at the start of every session — it survives chat compaction.
> Update it in the same commit as the work it describes.
>
> Legend: ✅ done (with commit) · 🟡 partially done · ⬜ not started · 🔒 blocked on user input

---

## Phase 1 — Do now (code only, no credentials)

| #   | Item                                      | Status       | Notes                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~**A — Wire SunScout to report pages**~~ | ✅ `fc0adf5` | `useInvestorReport` now returns `sunScout`; `InvestorReport.tsx` passes it through. **Key finding:** `ReportPage.tsx` (the live `/r/:token` path) was already correctly wired. Tenant/PersonalBuyer/Landlord standalone pages are demo-only — their `null` is intentional until item B.                                                                   |
| 2   | ~~**12–33 — Medium/low fixes**~~          | ✅ `a2b6bde` | Mode/kind URL param validation (AnalyzingPage + API route), HardLimitGate dynamic `cycleStart`/`resetDate` props (hardcoded "May 1"/"June 1" removed), mobile grid collapse on 7 components/pages, snapshots updated.                                                                                                                                     |
| 3   | **C — Infinity guard on break-even rent** | 🟡 `b6e9536` | **Done:** `fmtMoney`/`fmtPct` return `—` for NaN/±Infinity — protects every money/pct display. **Remaining (low priority):** `investment.py:190` still returns `float("inf")` when `net_factor ≤ 0`. Unreachable with current constants (vacancy 5% + mgmt 8% → net_factor ≈ 0.87), but a sanity-check clamp in the calc engine would be belt-and-braces. |
| 4   | **D/E — Input bounds validation**         | 🟡 `a2b6bde` | **Done:** price > 0, downPaymentPct 0–1, mortgageRate (0,1), rent low ≤ mid ≤ high — 7 new API tests. **Remaining:** realistic rent bounds (e.g. $500–$10,000/mo) not enforced — only ordering. Decide if wanted.                                                                                                                                         |
| 5   | ~~**G — FRONTEND_URL in .env.example**~~  | ✅ `a2b6bde` | Added `FRONTEND_URL=http://localhost:5173`. Used by `stripeService.ts` for checkout redirects.                                                                                                                                                                                                                                                            |
| 6   | ~~**H — Flag label fallback cleanup**~~   | ✅ TBD       | `humaniseFlagId(id)` exported from `analysis.ts` — snake_case → Title Case fallback. Both calc-engine and Haiku label paths now use it. `condo_fee_unknown` added to `FLAG_LABELS` with explicit label. 5 unit tests + 2 route tests added.                                                                                                               |
| 7   | ~~**I — Condo fee consistency**~~         | ✅ TBD       | `routers/analysis.py` now appends a `condo_fee_unknown` amber `MergedFlag` (source=`structural`, confidence=100) when `property_type=='condo'` and `condo_fee_known==False`. Propagates via existing serialisation to Fastify. 3 new router tests added.                                                                                                  |

## Phase 2 — Blocked on user input 🔒

| Item                   | Blocked on                             | Notes                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ScrapeAPI wiring**   | API key from user                      | Realtor.ca returns 403 from cloud IPs (`x-deny-reason: host_not_allowed`). User has ScrapeAPI subscription. Fix = `SCRAPER_API_KEY` env var + route httpx through proxy in `realtor_scraper.py`. ~1 env var + 1 line. |
| **F — Golden dataset** | 47 real listing descriptions from user | `golden_cases.json` has 3 of 50 required entries. The 95% gate passes trivially but is meaningless at this size.                                                                                                      |
| **Stripe products**    | Price IDs from user's Stripe dashboard | Create Investor Pro / Professional / Team products, put price IDs in `.env` (`STRIPE_PRICE_PRO` etc. — placeholders already in `.env.example`).                                                                       |

## Phase 3 — Deferred (requires full pipeline live)

| Item                                               | Notes                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B — Live data on the 4 standalone report pages** | Pages render hardcoded demo constants (`VAUGHAN_LISTING`, `CHARLES_FLAGS`, `LL_PROPERTY`, `PB_SCHOOLS`). The live path today is `ReportPage.tsx` (`/r/:token`) which renders real analysis data. Wiring the standalone pages to live data requires scraper + comps pipeline to be live first. |
| Walk Score integration                             | Service stub exists                                                                                                                                                                                                                                                                           |
| CMHC vacancy data                                  | Service stub exists                                                                                                                                                                                                                                                                           |
| Google Places / Schools                            | Service stub exists                                                                                                                                                                                                                                                                           |
| PDF export (Puppeteer)                             | Pro tier feature                                                                                                                                                                                                                                                                              |
| Flag override UI                                   | Post-MVP                                                                                                                                                                                                                                                                                      |

---

## Current test baseline (keep green)

| Suite              | Count | Command                                               |
| ------------------ | ----- | ----------------------------------------------------- |
| Python calc-engine | 286   | `python3 -m pytest services/calc-engine/ -q`          |
| API (Jest)         | 123   | `npm test --workspace=apps/api`                       |
| Web (Vitest)       | 779   | `cd apps/web && npx vitest run`                       |
| Typecheck          | clean | `npm run typecheck --workspace=apps/web` / `apps/api` |

> Scraper tests (`services/scrapers/`) error on collection in this environment (missing playwright deps) — pre-existing, not a regression.

## Working agreement

- Branch: `claude/codebase-status-next-b2uufc` (PR #16). Never push elsewhere.
- After every item: run affected suites + typecheck, update this file, commit, push.
- All Phase 1 items done. Next: decide on the two 🟡 remainders (Python inf clamp in `investment.py:190`, realistic rent bounds enforcement).
