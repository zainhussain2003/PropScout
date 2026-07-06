# Work log — 2026-07-06 · tenant report polish (populate placeholders, kill dev copy)

Follow-up to the parity pass: the live tenant report had several sections that
could be populated from data we already hold but were empty-carding, plus
dev-facing "Week 5–6 · extraction pipeline" copy. Fixed:

- **§11 Unit & building spec sheet** — now filled from scraped Listing fields
  (beds/baths/sqft/type/parking/year/fee/city/postal) via `shimToTenantSpecRows`.
  Never a placeholder — it's pure scraped data. `UnitDetailsSection` takes live rows.
- **§05 Monthly cost** — scraped rent + sqft-scaled utility estimates + parking
  (`shimToTenantCostLines`), computed like the demo. Utilities whose inclusion is
  genuinely unknown are marked 'confirm', not faked. True monthly cost is real.
- **§06 What's included** — parking known from the scrape; utilities shown as
  estimate/confirm (`shimToTenantAmenities`). Removed the fixture "$320 replace /
  $1,830 adjusted" narrative leak — `WhatsIncludedSection` now only shows that
  framing when a real valuation is supplied (demo), else an honest included/confirm tally.
- **§04 Negotiation** — real leverage from comps + every fired flag + a generated
  copy-paste message (`shimToTenantNegotiation`). `NegotiationSection` handles a
  no-comps target (points to the leverage instead of "$0") and an empty message.
  Honest empty only when there's genuinely no leverage.
- **§01 rent positioning + hero** — no more "$0–$0" range when comps are null: §01
  shows the honest no-comps state, the hero hides the target band.
- **Dev copy gone** — `SectionPlaceholder` now takes a user-facing `note`
  ("This listing doesn't include enough detail…") instead of `week=`; every
  remaining placeholder (§02 clean-scan, §03 needs-viewing, §08 geocode) has
  user-facing wording. Grep for week/sprint/phase/pipeline in user-visible tenant
  copy is clean.
- STR §10 left as the spec-sanctioned MVP placeholder (unchanged).

Verified live against the for-rent listing (610-761 Bay St, Toronto): §04 shows the
flag as leverage + a drafted message; §05 shows $2,923/mo true cost; §06 the amenity
grid ("1 of 7 confirmed, 4 to confirm"); §11 the 10-line spec sheet; §01/hero no $0.
Web 855 green, typecheck clean.

---

# Work log — 2026-07-06 · live report section parity (all 4 modes)

**Problem:** the live `/r/:token` renderer was built as "focused summaries" — the
tenant report showed 4 of 12 sections while demos/landing promised the full
experience.

**Step-1 audit (present/missing, live vs demo):**

- **Investor** (`InvestorReportContent`): present = Hero, AI verdict, Investment
  metrics, Rental comps, Cash-to-close, OSFI, Risk flags, Equity, SunScout.
  Missing = Financing sliders (live recalc), Neighbourhood, STR placeholder,
  Due-diligence checklist.
- **Landlord** reuses `InvestorReportContent` → same 4 missing + landlord
  rent-positioning/checklist.
- **Tenant** (`TenantReportContent`): present = Rent positioning, Listing flags,
  Schools, SunScout (4). Missing = Listed-vs-Reality, Negotiation, Monthly cost,
  What's-included, Location & commute, Comps map, Unit details, Before-you-sign.
- **Personal** already delegates to `PersonalBuyerPage` → full parity (FMV/sales
  already use honest `isSampleData` empty states).

**Data-availability reality (drives empty states):** the `Analysis` payload
carries metrics, dealScore, rentalComps, riskFlags, narrative, walkScore,
neighbourhood, sunScout, coordinates, schools. It does NOT carry structured
extraction outputs (amenities, per-room detail, listed-vs-reality claims, per-comp
map points, distances, negotiation leverage) — so several demo sections genuinely
have no live source and must show honest empty states, never fixtures.

**Done this pass:**

- **Tenant → full 12-section parity** (commit 644a755): live tenant delegates to
  the full `TenantReport` (like personal). Fixed the demo page's `isReal` FIXTURE
  LEAKS so no CHARLES data reaches a real listing — §02 real dismissable flags (not
  CHARLES_FLAGS), §07 "scores unavailable" when Walk Score is null (not
  CHARLES_MOBILITY_SCORES), §10 honest empty comps map (not 14 fabricated pins).
  Flag-override dismissal threaded through so the tested behaviour survives. Added
  `shimToTenantFlags`. Web 855 green.
- **Analyzing progress bar** no longer frozen at 5%: milestone pct (5/30/70/100)
  now eases toward its target every 200ms and creeps to a soft cap while awaiting
  the first poll status — animates instead of sitting dead during the ~25s scrape.

**Walk Score = 0 in prod — diagnosis:** `walkScoreService.getWalkScore` reads
`process.env.WALKSCORE_API_KEY` on the **@propscout/api** service and returns
`null` when the key is unset (logs "WALKSCORE_API_KEY is not set"). Almost
certainly the key is missing on the Railway API service → walkScore null → 0/0/0
or fixture fallback. FIX: (a) set `WALKSCORE_API_KEY` on the @propscout/api Railway
service; (b) UI shows "unavailable" for null (tenant §07 done; investor/personal
neighbourhood still to harden — see remaining).

**Investor/Landlord — now wired live (commits d4f2a2d, 418cfd9, 5886db5):**

- STR placeholder (informational, safe).
- Data-honest **Neighbourhood** §08: tiles render "—" for unknowns; appreciation "—"
  (not "+0.0%"); verdict "Market data pending" with no data; empty comps show the
  "no comparable-sales source yet" state. `shimToNeighbourhood` returns zeros, never
  fabricated figures.
- Live **Financing sliders** §02: financing stateful; every metric recomputes via
  enrichMetrics on drag. Deal SCORE stays backend-sourced (NOT re-derived).

**Personal — confirmed data-clean** (already delegated): PBSalesSection hides comps
when real (`isSampleData`), FMV is a _labeled_ ±5% estimate (not fake sold data),
personal neighbourhood zeroes non-walkscore fields, schools EMPTY when no data, real
flags. No fixture leaks.

**Due-diligence §11** now mounted live as a shared component (commit 0752573) —
generic buyer checklist. All investor/landlord sections present.

**LIVE END-TO-END — all 4 modes verified** (real backend: my calc-engine 8010 +
API 3001 → prod Supabase; real Realtor.ca URLs; rendered /r/:token in the browser):

- Scraped a for-sale listing (103 Whitchurch Mews, Mississauga) → investor +
  personal; and a for-rent listing (610-761 Bay St, Toronto) → tenant + landlord.
- **Investor**: all 11 sections render — deal score, metrics, LIVE financing sliders
  ("adjust live"), cash-to-close, OSFI, dismissable risk flags, equity, data-honest
  Neighbourhood ("0 verified sales · No comparable-sales source yet"), sunscout, STR
  placeholder, due-diligence.
- **Tenant**: all 12 sections render (was 4) — real dismissable flag, Walk 98 /
  Transit 100 / Bike 94 (Bay St), 6 real Toronto schools, sunscout, honest-empty
  comps map, honest placeholders for extraction-gated sections, checklist.
- **Personal**: schools/walkscore/sunscout/risks real; FMV + comparable-sales now
  honest empty.
- **Landlord**: shares InvestorReportContent → identical render to investor.
- **Walk Score works in this env** (86/60/60 and 98/100/94) — confirms the prod "0"
  is specifically `WALKSCORE_API_KEY` missing on the prod @propscout/api service.

**Two data-discipline violations the live render CAUGHT (code-read missed), fixed:**

- Personal §03 Comparable Sales rendered 8 FIXTURE sold listings under a "Sample"
  banner; §02 FMV rendered a fabricated ±5% band. Both now show the required
  "no comparable-sales source yet" empty state in live mode (commit 7d79494).
- Tenant §03 Listed-vs-Reality was DROPPED live; now an honest placeholder (bf2c8e2).

**Minor polish left (non-blocking):** tenant extraction-gated placeholders (§04/05/06/
§11 + §03) use dev-facing "Week 5–6 · extraction pipeline" copy — could be softened to
user-facing wording. Tenant §01 shows "$0" comp range + "Above market" when comps are
null (cosmetic). STR §10 shows illustrative placeholder numbers (spec-sanctioned MVP
placeholder). **Action:** set `WALKSCORE_API_KEY` on the prod @propscout/api service.

---

# Work log — 2026-07-05 · rentals_ca zero-yield fixed (GraphQL rewrite)

**Symptom:** the Railway nightly run showed rentals_ca = 0 raw listings while kijiji (92)
and padmapper (364) worked from the same datacenter IP.

**Root cause — NOT an IP block. A site redesign (selector rot's bigger cousin).**
Diagnosed live: local Playwright loads `rentals.ca/toronto?p=1` with HTTP 200 and a real
321 KB page, but the old `[class*='listing-card']` selector matches 0 elements. Rentals.ca
rebuilt search from a server-rendered card list into a **Google-Maps SPA**: the map shows
price-only pins (`listing-map-marker__label`, no id/address/beds), and the actual listings
come from an **authenticated GraphQL API** (`POST /graphql`, operation `RentalListingSearch`).
Confirmation it isn't an IP block: kijiji/padmapper (same Playwright path, same Railway IP)
succeeded, and the page itself returns 200 from any IP — only the extraction was dead.
Direct/httpx and replayed `page.request` calls to the API hit Cloudflare "Just a moment"
(403); the page's OWN in-context fetch (with its client-minted bearer + CF clearance) gets
200 and 500 listings/query.

**Fix (rewrite, not a selector tweak):** `sources/rentals_ca.py` now

1. loads the city page in Playwright (passes CF, sets clearance),
2. lifts the SPA's own bearer token off its first `/graphql` request
   (`browser.open_page_capturing_token`),
3. replays an **enriched** `RentalListingSearch` query IN the page context
   (`page.evaluate` fetch) — one query/city, `first=100` (env `SCRAPER_RENTALS_CA_PAGE_SIZE`),
   20 km radius (`SCRAPER_RENTALS_CA_RADIUS_M`), returning nodes with
   path/name/rentRange/bedsRange/bathsRange/sizeRange/location/address,
4. parses each node → RawRentalListing (ranges collapse to their **low end** — the existing
   building-listing discipline). Anchored on the GraphQL schema, not CSS = far less rot-prone.

**Why no ScraperAPI (the goal's IP-block branch):** it isn't an IP block, so proxying buys
nothing here and the API needs the client-minted bearer anyway. Documented fallback lever: if
a future Railway run shows the `/graphql` XHR itself getting CF-challenged from the datacenter
IP (page loads but every city query returns non-200/blocked), route rentals_ca's GraphQL POST
through ScraperAPI premium (reuse the realtor_scraper pattern) — the per-source split is
already in place (kijiji/padmapper stay on the direct card path, untouched).

**Bonus — no geocoding cost regression:** the GraphQL nodes carry exact coords + postal, now
plumbed through RawRentalListing→CleanRentalListing; `geocode_listings` skips the Mapbox call
when both are present. So the much higher row volume (vs the old ~75/run) costs ~0 extra
geocoding.

**Verified live (2 cities, depth-1):** 200 raw → 193 unique, **100% coords / postal / beds**,
100% would-skip-geocode, realistic rents ($1.6k–$2.7k), real addresses+URLs. Scraper tests
**176 pass** (floor was 151; +25 new). Yield floor `MIN_RAW_ROWS_PER_SOURCE=5` left UNCHANGED
(never masked the problem). `data.ontario.ca` note: unrelated.

---

# Work log — 2026-06-21

## ⚠️ Unsourced / assumed values — track, validate, do not trust as researched

These numbers drive user-facing decisions but are **not** backed by a dataset in
the codebase. They are hand-picked or industry-norm assumptions. Each needs a real
source before it should be presented as authoritative. (Added during the product-design
pass on mode-specific severity, OSFI income, and cap-rate valuation.)

| Factor                                                             | Current / proposed value                          | Source status                                                                                                                                                   | What would validate it                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Per-city cap rates** (for-rent value est.)                       | seeded 3.8%–5.8% in `marketCapRates.ts`           | ❌ GUESS — hand-picked Ontario ladder (GTA low → cheaper markets high); no source                                                                               | Published Ontario cap-rate survey (e.g. CBRE Cap Rate Survey), or derive from board median price ÷ CMHC median rent per city/type |
| **Residual expense ratio per property type** (NOI est.)            | 18%–30% (condo→commercial) in `marketCapRates.ts` | ❌ GUESS — residual (vacancy+mgmt+maintenance+insurance, EXCL tax & condo fee); partials in `rates.py` are %-of-value                                           | Compute the calc engine's own expense model across a sample, or a documented residential OER benchmark (the residual, not all-in) |
| **Flag severity × mode mapping** (the matrix)                      | see matrix draft v2                               | 🟡 INFORMED — legal cells (no_pets void = RTA s.14; N12 own-use) are law-sourced; the rest is reasoned design                                                   | Investor/realtor/paralegal SME review of the non-legal cells                                                                      |
| **Red-flag deduction magnitudes** (points column)                  | −5 standard / −10 severe (proposed)               | ❌ GUESS — no dataset ranks flag severity in points                                                                                                             | SME calibration against known deals                                                                                               |
| **Severe = 2× standard (the ratio)**                               | implied by −10 vs −5                              | ❌ GUESS — a grow-op isn't exactly 2× a reno; the ratio is as invented as the absolutes                                                                         | SME calibration; tune the ratio independently of the absolute values                                                              |
| **Tiered deduction caps**                                          | severe −30 (3 express) / standard −15             | ❌ GUESS — replaces the old flat −15 so dealbreakers can crater the score while soft flags can't pile up                                                        | SME calibration of how far the worst-tail should be allowed to fall                                                               |
| **OSFI default household income**                                  | $125,000 (existing placeholder)                   | ❌ GUESS — placeholder in `demoData`/types                                                                                                                      | StatsCan Ontario median household income for the buyer demographic                                                                |
| **Haiku euphemism recall for severe flags** (potential phantom #7) | grow-op/flooding added to Haiku prompt            | ❌ UNVERIFIED — regex catches explicit only (tested); Haiku's recall on oblique MLS phrasing ("as-is, no representations", "remediation completed") is unproven | Labelled euphemistic grow-op/flood cases in the golden dataset (Tier-3 task #7), then measure recall                              |

**Rule going forward:** any new decision-driving number that can't cite a source lands
in this table with its placeholder and a validation path — not buried in code as if researched.

---

## 📒 CONSOLIDATED UNSOURCED LEDGER — reconciled to SHIPPED code (2026-06-22)

The scoring engine is **structurally done and numerically unvalidated** — different kinds of
done a user can't tell apart (a 68/100 looks identical whether the 68 came from board data
or a turn-three guess). This is the single list of every guess still LIVE in shipped code,
its actual value, and how to validate it. "Flagged as unsourced" was a promise to validate
later; this is the promise made visible so validation is a _choice_, not a forgotten debt.

| #   | Constant (file)                                                                                 | Shipped value                                            | Status                                                                                                     | Validation path                                                             |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Severe-gate ceilings `_SEVERE_GATE_BASE/STEP/FLOOR` (`deal_score.py`)                           | 40 / 30 / 20 / 10 by count                               | ❌ GUESS — _(the earlier "−30 tiered cap" in the table above NEVER shipped; the gate ceiling replaced it)_ | SME calibration: how far should 1 vs 2+ severe flags cap a score            |
| 2   | Standard red deduction + cap (`_DEDUCTION_PER_RED_FLAG`=5, `_DEDUCTION_MAX`=15)                 | −5/flag, capped −15                                      | ❌ GUESS                                                                                                   | SME calibration against known deals                                         |
| 3   | Display floor `_DISPLAY_FLOOR` (`deal_score.py`)                                                | 5                                                        | 🟢 DESIGN — low-stakes ("always worth something"); not a data claim                                        | —                                                                           |
| 4   | Component point ladders (cap/cf/coc/dscr/demand)                                                | from `investor-calc.jsx`                                 | 🟡 INFORMED — the jsx _is_ the only source; no external citation                                           | Validate brackets against real Ontario deal outcomes                        |
| 5   | Severe-flag regex confidences (`regex_rules.py`)                                                | grow-op 90, flood 87, illegal-unit 85, special-assess 88 | ❌ GUESS — hand-assigned, not measured precision/recall                                                    | Label a corpus; measure actual precision per flag                           |
| 6   | Soft-tier `verify_history` confidence + fire rate                                               | 65; fire rate UNMEASURED                                 | ❌ UNVERIFIED — the base-rate watch item; could be noisy on real MLS copy                                  | Run against real listings; measure how often it fires                       |
| 7   | Non-severe regex confidences (tenanted 92, str 90, basement 88, needs_work 85, …)               | hand-assigned                                            | ❌ GUESS                                                                                                   | Same corpus measurement                                                     |
| 8   | Per-city cap rates + default (`marketCapRates.ts`)                                              | 3.8–5.8%; default 5.0%                                   | ❌ GUESS — hand-picked Ontario ladder                                                                      | CBRE Cap Rate Survey, or board median price ÷ CMHC median rent              |
| 9   | Residual expense ratios by type + default (`marketCapRates.ts`)                                 | 18–30%; default 24%                                      | ❌ GUESS — residual (vacancy+mgmt+maint+insurance, EXCL tax & condo fee)                                   | Documented residential OER benchmark, or derive from the engine's own model |
| 10  | OSFI default household income (`osfi.ts`)                                                       | $125,000                                                 | ❌ GUESS                                                                                                   | StatsCan Ontario median household income for the buyer demographic          |
| 11  | Demand defaults `_DEFAULT_RENTAL_DOM`=21, `_DEFAULT_RENT_TREND`="flat" (`analysis.py`)          | 21 days / flat                                           | ❌ NO SOURCE — always used (no data feed exists for DOM or trend)                                          | Derive DOM + trend from the nightly rental corpus once it accumulates       |
| 12  | `_DEFAULT_CMHC_VACANCY_RATE`=2% (`analysis.py`)                                                 | 2% fallback                                              | 🟡 PARTIAL — overridden by real `cmhcService` per-city when present; the _fallback_ is the guess           | Ensure cmhcService covers all target cities so the fallback rarely fires    |
| 13  | Maintenance reserve / vacancy 5% / mgmt 8% / insurance 0.35% (`rates.py`)                       | industry-norm                                            | 🟡 INFORMED — common assumptions, not a cited dataset                                                      | Document the industry source or calibrate                                   |
| 14  | `MIN_RAW_ROWS_PER_SOURCE`=5 (`scrapers/constants.py`)                                           | 5                                                        | 🟡 NEW/CONSERVATIVE — selector-health floor; intentionally low to avoid false alarms                       | Raise once real per-night per-source baselines exist                        |
| 15  | HomeScore severe ceilings + red deduction (`apps/web/src/constants/thresholds.ts` `HOME_SCORE`) | ceilings 34/20/10, floor 5, −5/standard red              | ❌ GUESS — approved to ship 2026-07-01, still unsourced; −5 mirrors investor #2                            | Same SME calibration as #1/#2                                               |

### ⛔ gate ≠ matrix — DO NOT remember the gate as "the matrix is done"

> **RESOLVED 2026-07-02 — the matrix IS now implemented.** Zain approved the
> per-flag × per-mode ruleset (`docs/FLAG_SEVERITY_MATRIX.md`, v1) and it shipped:
> `constants/flag_matrix.py` + mode-aware `merge_flags(…, mode)` in the calc
> engine, tier threaded through the API to the frontend, unit + functionality +
> regression tests pinning every distinctive cell. Magnitudes unchanged (−5 cap
> −15, gate 40/30/20/10, HomeScore 34/20/10) and still unsourced (ledger rows
> 1/2/15). The paragraph below is retained as history of why this warning existed.

**(Historical, pre-2026-07-02)** The per-flag × mode severity matrix was NOT implemented.
This thread opened as "build the matrix" (the four-mode colour table: `needs_work`
amber-for-investor / red-for-personal-buyer, `tenant_occupied` flipping meaning across
roles). What actually shipped first was the **severe gate** (the 4 catastrophic flags
capping the score for investor/landlord) **+ the personal-buyer correctness/safety fixes**

- a flat standard-red −5. The rich per-mode _cells_ remained a design on paper until the
  approved ruleset landed.

**None of the above is "do it now."** It's the list to see before context-switching to the
scraper, so validation is scheduled, not forgotten.

---

## 🕓 Scraper freshness + comp-query semantic debt (2026-06-24)

Recorded while adding `first_seen_at` (migration `20260624_…`). Two known-debt items
the backfill run surfaced — neither built yet, both required decisions before the cron
runs unattended.

### Freshness window N is NOT a single number — it's bounded by rotation × scrape depth

The query-time freshness filter (`scraped_at >= now() - N`) ages "ghost" rows out of the
comp set. But the right N is **per-source**, and the real constraint is **scrape depth**,
not cron cadence:

- We scrape **page 1 only** (`MAX_PAGES_PER_CITY = 1`). A still-live listing pushed to
  page 2 by newer posts **stops appearing in our scrape** — so its `scraped_at` stops
  refreshing and it ages out of comps **even though it's still on the market.** Freshness
  can't tell "delisted" from "pushed off page 1."
- Backfill evidence (one night, toronto p1): **padmapper** 20/22 URLs recurred (persistent
  building URLs, low rotation) → a tight window is safe. **rentals_ca** 7/25 recurred
  (~72% page-1 turnover/day) → live listings drop off fast. **kijiji** 0/45 recurred (100%
  page-1 turnover/day) → listings are effectively one-night-visible at depth 1.
- So for high-rotation sources the lever is **deeper scraping** (raise `MAX_PAGES_PER_CITY`
  so live listings keep reappearing and refreshing `scraped_at`), paired with a wider N.
  Widening N alone just keeps stale rows around un-refreshed.

**Proposed (named constant, not hardcoded — same discipline as `MIN_RAW_ROWS_PER_SOURCE`):**
`FRESHNESS_WINDOW_DAYS_BY_SOURCE = {padmapper: 3, rentals_ca: 7, kijiji: 10}` as a _starting_
guess, explicitly tied to each source's measured rotation + the scrape depth in force. Revisit
the moment `MAX_PAGES_PER_CITY` changes. Validation: measure per-source recurrence over a week
of real runs.

### Comp-query equality on `beds` / `postal_code` is lossy — a phantom-in-waiting

The freshness/comp query keys on exact `postal_code` and `beds`. Both are stored lossy:

- **`beds` for padmapper is a building RANGE FLOOR**, not a unit count: `beds=1` means
  "cheapest unit is a 1-bed", from a `1–3 Bedrooms` building. An exact `beds=2` comp query
  **silently excludes** every padmapper building whose range covers 2-beds but whose stored
  floor is 1. Looks correct, returns thin/skewed comps.
- **`postal_code` precision is mixed**: card-extracted + normalized on some rows,
  **geocode-approximate** on the ~89% of kijiji rows that got postal from Mapbox (often from
  a messy title, so neighbourhood-level, not unit-level).

Equality-matching a range-floor `beds` and mixed-precision `postal` is the next phantom:
a query that _runs_ and returns _confidently wrong_ comps because the keys don't mean what
`=` assumes. **Known debt — needs a deliberate decision later** (range-aware beds matching;
postal precision tiers / FSA-level fallback), same as the source-provenance tag. Do not
solve at write time; it's a read-path concern. Flagged so it's a choice, not a surprise.

### `scraped_at` / `first_seen_at` timestamp caveats (verified in prod 2026-06-24)

The `first_seen_at` migration is applied and verified: across all 40 recurring rows in the
verification run, `first_seen_at` stayed frozen while `scraped_at` advanced — the insert-only
(payload-omitted) vs last-seen (payload-stamped) split works on real writes. Two caveats the
verification surfaced, both **read-path concerns to handle when the days-on-market / freshness
query is built** (not code yet):

1. **`days_on_market` needs a `greatest(0, scraped_at - first_seen_at)` clamp.** The two
   columns use different clocks by necessity — `scraped_at` is **client-stamped** (Python
   `now()` in the upsert payload, so it can refresh on every upsert) and `first_seen_at` is the
   **server-side column default** (Postgres `now()` at INSERT, so it stays insert-only). On a
   brand-new row `scraped_at` lands microseconds _before_ `first_seen_at`, so the subtraction
   goes very slightly negative (`dom ≈ -0.0`). Benign (sub-second on a days-scale metric), but
   clamp it at query time so dom is never negative.

2. **`scraped_at` is BATCH-BUILD time, not per-listing fetch time.** It's stamped once when the
   upsert payload is built, so every row in one run shares the same `scraped_at` regardless of
   when in the run (scrape → geocode → upsert, possibly many minutes) it was actually fetched.
   Fine for days-on-market (measured across _days_) and fine for the freshness window (day-scale).
   But it makes `scraped_at` **unsuitable as a precise "seen at" for any future sub-day freshness
   need** — if something downstream ever assumes `scraped_at` is when _this listing_ was seen, it
   will be wrong by up to the run duration. Invisible until depended on; recorded so it isn't.

### Kijiji multi-city blocker — DEFERRED, not forgotten (2026-06-25)

The 12-city baseline probe (depth 1) caught a silent phantom: **Kijiji's city slug is
ignored** — the URL filters by a location ID (`.../c37l1700273`), not the slug, so every
one of the 12 cities returns the _same_ Toronto/GTA listings (verified: 87–93% URL overlap
with Toronto, 0 addresses matching the requested city). It returns 200 with full rows for
every city, so a row-count check passes while 11 of 12 are the **wrong city**. Caught at
depth-1 multi-city — the cheapest place; a depth ratchet first would have multiplied wrong
data and made it _harder_ to see.

**Action taken now:** Kijiji is gated to Toronto only — `KIJIJI_CITIES = ("toronto",)` in
`constants.py`, used by `kijiji.fetch_listings` instead of `TARGET_CITIES`, with an
enforcement test (`test_kijiji_is_gated_to_toronto_only`). This is **enforced, not labeled**.

**Correction to the rationale (traced 2026-06-25):** the gate is about WASTE, not comp
corruption. The `rental_listings` table has **no city column** — search-city is never stored;
rows are located by their geocoded `postal_code` and comps key on `postal_code`. So Kijiji's
12 identical result sets would just collapse by `source_url` and locate correctly — they would
NOT mislabel or corrupt per-city comps. The real cost of running it per-city is **11×
redundant requests for the exact same listings on a bot-aggressive source** (load + block
risk, zero new coverage). The gate is still correct; the reason is efficiency/safety.

**rentals_ca / padmapper across 12 cities — a sharper characterization (this corrects an
earlier overstatement):** the 0% cross-city overlap proved each seed returns _distinct_ data,
but a Vaughan postal-FSA spot-check (positive confirmation, not reasoning) showed rentals_ca's
city search is a **proximity/radius search, NOT a strict municipal filter**: a "vaughan" seed
returned 2/8 actually in Vaughan (Thornhill L3T) and 6/8 in adjacent North York (M2R) /
Richmond Hill (L4C) / Toronto (M9M). **This is fine** — same reason as above: every listing is
stored + queried by its real geocoded postal, so a North-York-via-Vaughan-search row correctly
serves North York comps. The city slugs are discovery seeds whose only job is to collectively
cover the province; per-seed precision doesn't matter. (It does mean per-seed row counts
overlap at borders, so "12 cities" ≠ 12× distinct inventory.)

**Deferred fix (own sub-project, do NOT bolt onto the depth/Railway work):** build a verified
`city → Kijiji location-ID` map. The `l#######` codes are undocumented, hierarchical
(province → region → city), and some target cities may only exist as a broader region code —
so building it means harvesting + verifying the correct code per city (the same phantom check,
12 more times). Until then Kijiji is a known Toronto-only coverage limitation (Toronto is the
densest market anyway). Validate the map the same way: per-city URL distinctness + address
sanity, before trusting it.

### Multi-city coverage — depth pays out, DON'T prune the city list (measured 2026-06-26)

The depth-vs-prune fork was resolved by measurement (run-wide distinct after whole-run dedup,
pages 1–3 × 12 cities, rentals_ca + padmapper), not judgment. Whole-run dedup is confirmed
double-layered (`dedupe_by_source_url` over the full concatenated batch before geocode, +
`insert_rental_listings` re-dedup), so cross-city URL collision is safe.

**Cross-city overlap is high but depth still pays out, linearly:**

| source     | depth 1 | depth 2 | depth 3 | per-depth marginal | cross-city dup |
| ---------- | ------- | ------- | ------- | ------------------ | -------------- |
| rentals_ca | 352     | 630     | 909     | +278 / +279 (flat) | ~62%           |
| padmapper  | 200     | 366     | 508     | +166 / +142        | ~20%           |

The "overlap eats depth" pessimistic case is **false** — dup % stays flat while absolute
distinct-new per depth is large and steady (no plateau, consistent with the earlier
Toronto-only depth-5 finding).

**DON'T prune the city list — the depth-1 redundancy was a shallow-scraping artifact.** At
depth 1, Waterloo/Richmond-Hill added only +8/+16 distinct (looked prunable). At depth 3, each
city's _unique-to-city_ contribution (listings found via NO other city) is real: london 99,
ottawa 90, hamilton 89, toronto/brampton 80, … kitchener/waterloo 31 each. **820 of 909
distinct rentals_ca listings (90%) are surfaced by exactly one city** — every city pulls its
weight at depth. Each suburb's distinct inventory lives DEEPER in its own results; pruning on
depth-1 marginals would cut ~31+ real listings per "redundant" city. (Corrects an earlier
"prune the leaky city list" suggestion that was based on the misleading depth-1 number.)

**Coverage / cost curve** (distinct listings/night, both sources + ~46 kijiji Toronto):
depth 1 ≈ 600, depth 2 ≈ 1040, depth 3 ≈ 1460. Nightly = `25 × D` page loads
(12 rentals_ca + 12 padmapper + 1 kijiji). Depth 3 ≈ 75 loads ≈ 7–8 min + geocoding. No
blocking through the 72-request probe — Railway-IP caveat still live at real nightly volume.

**Decision pending:** ratchet `MAX_PAGES_PER_CITY` to 2 or 3 (keep all cities), with the
per-source yield alarm watching the first real Railway runs. Freshness-window retune still
waits for multi-night recurrence data at the chosen depth.

### Step 3 — investment severe-gate: calc engine DONE, frontend wiring REMAINS (don't hide the seam)

Built (calc engine, authoritative): `mode` threaded through the payload/schema;
`calculate_deal_score` now takes `severe_flag_count` (backward-compatible default 0 →
no gate → identical to the old flat model, so the regression suite is untouched). Severe
flags (the 4, all with regex floors) GATE the ceiling (40 / 30 / 20 / 10 by count);
standard reds deduct −5 capped −15; order = cap → subtract → gate, verified by a
**composition test** (a 95-fundamentals property + 1 severe → 40/marginal, display 42 —
not floated up; severe+standard proves the order). `severe_ceiling` + `to_display_score`
(floor 5 → ×100/95) are tested helpers. Gate applies only to investor/landlord modes.

**Seam #2 — CLOSED by deleting the second computation (the dangerous one).**
Traced the dangerous _direction_ first: `adjustDealScoreForOverrides` recomputed
`newTotal = subtotal − remainingApplied` from the pre-gate subtotal (~95), **ignoring the
ceiling**. So dismissing ANY flag on a grow-op property (gated `total = 40`) inflated the
live gauge to ~90 = "good deal" — while the grow-op was still present. A normal click made
a grow-op home read as a good deal. Fixed per the one-source rule: **removed the frontend
re-derivation entirely** (`adjustDealScoreForOverrides` + `verdictFromScore` deleted, plus
the re-derived "−X pts" line in `RiskFlagsSection`). The gauge + verdict now come straight
from the calc engine's gated number — never recomputed. Dismiss still persists + greys the
flag; the gated score updates on the next backend re-run (which IS gate-correct — the
router excludes dismissed flags from `severe_flag_count`). Trade-off: the instant
live-recalc-on-dismiss (requested earlier) is gone — the safe direction (the gauge can
never show better than the gate). ReportPage test now asserts exactly this: dismiss greys
the flag but the score stays at the backend value. Web 799 passing.

**Seam #1 — CLOSED, one-source.** The calc engine now RETURNS `display_total` (floored +
×100/95 via the tested `to_display_score`) on `DealScoreOutput`; threaded through API →
`DealScore`/`DealScoreData` types → the gauge. React does **not** re-implement ×100/95 —
it consumes the backend value. The `DealScore` gauge gained `max` (100) + `tone` props:
the ring colour now comes from the backend **verdict tone**, never re-derived from the
(normalized) number against raw brackets — so the colour-cutoff near-miss can't resurrect
as a number/label/colour disagreement. Label + number + colour all read from one backend
result. Composition test asserts the displayed `68 out of 100` AND the "Good deal" verdict
label render together from the same source. Web 799 passing, calc 312, API 130, typecheck
clean. (Standalone `DealScore` keeps default `max=95`; only gauges showing a verdict pass
`max=100` + `tone`.)

**Seventh phantom — caught before building the investor gate (verify inputs exist first).**
The §10a investor severe gate keys on grow_op / flooding / illegal_unit / special_assessment.
Traced all four to their extractors before building: grow-op + flooding have a regex floor
(added earlier), but `illegal_unit_risk` and `special_assessment_risk` were **Haiku-only** —
no deterministic extractor. Since the calc engine keeps regex flags but loses Haiku-only
flags when Haiku is unavailable, the gate would have silently run on 2 of 4 inputs. Fixed:
added regex floors for the explicit cases of both (guarded against "healthy reserve fund" /
"legal duplex"), and a permanent test asserts all four fire via regex. End-to-end check also
done: a real grow-op listing flows description → pipeline → `grow_op_history` (red),
`flooding_history` (red), `verify_history` (amber), and the routed personal report renders
the grow-op red **above** the amber soft-caution with the gauge paused (ReportPage test with
ordering assertion). Lesson now a habit: verify a gate's inputs are extracted before building
the gate, and look at the composition, not just the unit tests.

**Copy phantoms count too.** The personal risk-section disclaimer claimed a "municipal open
data (flood overlays, conservation)" source the product does **not** ingest — a phantom
aimed straight at buyer trust, in the one domain (flood) where false reassurance is most
dangerous. Fixed to "listing description only". **New rule: every user-facing disclaimer
that names a data source must trace to a source we actually ingest.** Audit copy the same
way we audit code — a confident sentence about data we don't have is as bad as a fake number.

**Soft-caution tier — base-rate watch (revisit once real listings flow).** `verify_history`
fires amber on "no representations / as-is / buyer due diligence" — which is boilerplate
legal cover on a large share of estate / power-of-sale / tenanted listings, unrelated to
grow-ops or floods. Risk: if it fires on most personal reports it becomes wallpaper and
buyers tune it out, silently re-creating the false-negative problem one layer up. Mitigation
shipped: the flag's evidence quotes the exact trigger phrase so it reads "this listing says
X — worth asking", not a generic amber. **To do when real data flows: measure the soft-tier
fire-rate; if it lights up the majority of reports, tighten the patterns.** Don't remove the
tier — keep it from becoming noise.

### Visible risk path for the gauge-suppressed personal report — VERIFIED BROKEN

With the HomeScore gauge suppressed, the severe-gate's safety purpose can only reach the
user through the visible risk section. Traced it; it does not work today:

- **Severe flags aren't all extracted (6th phantom):** `grow_op_history` and
  `flooding_history` have **no extractor** (not in regex, not in Haiku) — they're labels
  only, so a grow-op/flood listing never produces the flag. (`illegal_unit_risk` +
  `special_assessment_risk` ARE extracted by Haiku.)
- **Critical flags render as amber:** `PersonalBuyerPage` `RisksSection` (line ~1129) maps
  every real flag to `tone="amber"` — a `red` flag shows amber, indistinguishable from a
  minor one. The "N critical" verdict text is computed but the rows don't reflect it.

**So the real (B) deliverable in a gauge-suppressed world is the VISIBLE path, not the
hidden ceiling:** (1) add `grow_op_history` + `flooding_history` extractors (regex
keywords: grow-op/cannabis/marijuana grow; flood/water damage/flood zone), (2) fix the
personal `RisksSection` to render each flag at its true severity and surface red flags
prominently ("Grow-op history — major risk" at the top). The 34/20/10 ceiling ladder is
correct and stays in code for when the gauge turns on, but it's mathematically invisible
until then — the extraction + rendering fixes are what actually protect the buyer now.

**DONE + a third tier (precision vs recall for a safety signal).** Both fixes shipped.
Plus: regex staying silent on euphemisms optimised for precision, which is wrong for an
owner-occupier (false positive = one wasted question; false negative = family buys a
remediated grow-op blind). Added a **soft-caution tier**: ambiguous phrasing ("no
representations", "remediation", "stigmatized", "buyer due diligence") fires
`verify_history` (amber, conf 65, no deduction) — a "verify, don't assume" prompt,
distinct from a confirmed red flag; hard grow-op/flood flags stay explicit-only.
**UI honesty:** the personal zero-flag state now says "Listing text only — verify
directly / not a clean bill of health", never "no risks / clear"; and the section
disclaimer no longer claims municipal flood-overlay data we don't ingest (a copy
phantom). Detection is partial → no report may imply a clearance.

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
  > **CLOSED 2026-07-01.** Colour bands were already unified on `DEAL_SCORE` in a prior
  > pass; the last stragglers were the `showVerdict` LABEL ladder inside `DealScore.tsx`
  > (wrong at every bracket edge — exactly 80 read "Good deal", 25 read "Hard pass") and
  > the degraded ReportPage path re-deriving the verdict text. Now: `verdictForScore` /
  > `verdictLabelForScore` in `investorCalc.ts` mirror `get_verdict` exactly (demo-only,
  > docstring warns against live use), `DealScore` takes `verdictLabel` for backend
  > verdicts, and the degraded path passes the backend label + tone. 12 boundary tests.

### Per-mode score model — verified in code (don't assume one scale)

There is no single "out of 100" deal score. Three distinct models:

| Mode               | Intended score                                                              | Scale             | What the LIVE `/r/:token` actually shows      |
| ------------------ | --------------------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| Investor (A)       | Investment (cap/cashflow/CoC/DSCR/demand)                                   | **0–95**          | ✅ investment 95                              |
| Landlord (D)       | Investment (reuses investor)                                                | **0–95**          | ✅ investment 95                              |
| Personal buyer (B) | **HomeScore** (pricing + schools 20 + light 15 + walk 15 + lot 8 + risk 10) | **0–100**         | ⚠️ **investment 95** — WRONG (see divergence) |
| Tenant (C)         | rent positioning + flags; spec mentions a "tenant score badge" (unwired)    | **no deal score** | rent positioning + flags, no gauge            |

**Consequences for the mode-severity matrix:**

- **Flag display-severity (colour)** applies to **all four modes** — flags render in every report.
- **Investment score-impact (deductions + severe gating)** is only coherent for the
  modes that actually show the 0–95 investment score: **investor + landlord**.
- **Tenant** has no deal score → its matrix column is **display-only** (no deductions).
- **Personal buyer's** real model is HomeScore (its own `riskPts`, max 10) — investment-style
  −5/gating doesn't apply; flag impact there is a separate mechanism.

**New divergence to track (pre-existing, not from this work):** the live `ReportPage`
routes `mode === 'personal'` through `InvestorReportContent`, so a personal buyer is
shown the **investment** deal score (cap-rate/DSCR/cash-flow) — but the demo
`PersonalBuyerPage` correctly uses `computeHomeScore` (FMV + schools + light + walk),
which is what spec §7 (Report B) describes. Live personal reports are scoring the wrong
thing. **Personal-buyer IS a v1 launch criterion (MVP_TODO line 522)** → this must be
fixed (route live personal → HomeScore), not deferred.

**And HomeScore itself has NO risk gating (verified):** `computeHomeScore` does not take
flags as input — `riskPts` is a hardcoded constant `10`. So a grow-op / flood / illegal
unit does **nothing** to a HomeScore today; a catastrophic home scores identically to a
clean one. This is the personal-buyer equivalent of the severe-flag gating we built for
investors, and it is currently entirely absent. Fixing live personal = two pieces:
(A) route personal → HomeScore, (B) wire flags into HomeScore with severe gating.

**HomeScore production-readiness audit (the hidden dependency before (A)):**
HomeScore works in the demo on fixtures. In the `isReal` path its inputs are mostly
placeholder, so routing live personal → HomeScore yields a data-thin score, not a
trustworthy one:

| Component (max)     | Real-path source                                                                                       | Status                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Pricing vs FMV (25) | `shimToPersonalProperty`: `fmv.mid = asking price` (±5%), so `askVsMid` is **always 0** → always 18/25 | ❌ meaningless — no comparable-SALES source; Teranet is explicitly out of MVP |
| Schools (20)        | `EMPTY_SCHOOLS` → 0 pts                                                                                | ❌ schools table not loaded (Tier-3 task #6)                                  |
| Light (15)          | `lightScore = 0` → 4 pts                                                                               | ❌ pvlib→HomeScore not wired (MVP_TODO line 389 unchecked)                    |
| Walk/transit (15)   | from `analysis.walkScore`                                                                              | ✅ real                                                                       |
| Lot (8)             | hardcoded 8                                                                                            | ⚠️ baseline                                                                   |
| Risk (10)           | hardcoded 10, no flag input                                                                            | ❌ the gating gap                                                             |

So **(A) is a bounded routing task, but a _meaningful_ HomeScore is gated on data that
doesn't exist yet** — chiefly a real FMV / comparable-sales source (out of MVP scope)
and the schools load. (A)+(B) make personal _less wrong_ (right questions + real risk
signal); the score stays low-confidence until FMV + schools land. The sales comps are
already flagged `isSampleData`/`isEstimated` in the UI, which is honest — keep that.

**Correction — light is a FOURTH phantom, not a "free fix":** `analysis.sunScout` is
hardcoded `null` (`analysis.ts:410`) and the calc payload sends **no lat/lng**, so the
calc engine's sun-path branch never fires. Light can't come from sunScout without wiring
that pipeline first. **Only trusted live components: walk + flags/risk.** Light joins
FMV/schools as "data pending."

> **CLOSED 2026-07-01 — light is REAL now.** Geocode moved before the calc call; lat/lng
> ride in `property_data`, the calc engine's sun-path branch fires, `sun_scout` maps back
> to `analysis.sunScout` (camelCase) and persists in `market_data`. PersonalBuyerPage's
> HomeScore light component consumes `sunScout.sunScore` (honest 0 floor when geocoding
> fails). Bonus: the assumed-south facade is now an INPUT — compass dropdown in
> SunScoutPanel → `POST /analysis/:token/sunscout` → calc `/analysis/sunscout` (light
> recalc, no extraction/narrative), result persisted. Trusted live components are now
> walk + flags/risk + light; FMV/schools remain "data pending" and keep the gauge suppressed.

**DECISION — gauge suppression (option iii):** A live HomeScore would be ~80% constants
(pricing pinned to "asking = fair", schools 0, light 4, lot 8) — a confident number that
can't tell a buyer they're overpaying. So: route personal → HomeScore, wire the risk
readout + severe-gate (B), but **suppress the numeric gauge** until **FMV _or_ schools is
real**. Show only trusted sub-readouts (walk, risk/flags); pricing shown as "no
comparable-sales source — not scored", schools/light "data pending". **Re-enable
condition: gauge turns on when FMV or schools becomes real.** Justified by MVP
"Definition of done" criterion 2 = modes "work end-to-end" (a complete honest report),
NOT "show a score" — v1 doesn't require the gauge. Severe-gate ceilings are designed now
but only display once the gauge is un-suppressed; until then the safety fix is showing
severe flags prominently in the risk readout.

**HomeScore severe-gate ceilings — DRAFT for review (derived vs HomeScore's OWN brackets,
not the investor ladder):** HomeScore bands are ≥80 "Make an offer" / ≥65 "Worth
pursuing" / ≥50 "Negotiate first" / ≥35 "Look further" / <35 "Probably not". Below 35 is
all one band, so the investor 40/30/20/10 ladder's lower rungs don't add verdict
distinction here. And a severe flag is _worse_ for an owner-occupier (you live in it)
than for an investor (who can remediate-and-rent), so personal is harsher: 1 severe →
**34** ("Probably not"/fail, vs investor's "marginal"), 2 severe → **20**, 3+ → **10**,
floor 5. All ceilings flagged unsourced. Send for review before coding.

> **APPROVED + SHIPPED 2026-07-01.** Zain approved the 34/20/10 draft as-is. Now live in
> `computeHomeScore` (`personalBuyerData.ts`) via `HOME_SCORE` constants
> (`apps/web/src/constants/thresholds.ts`): standard reds deduct −5 from riskPts (floor 0),
> severe flags gate the total (they don't double-deduct), floor 5 applied last. Severe set
> mirrors the calc engine's `_SEVERE_FLAGS` as `SEVERE_FLAG_IDS`. `PersonalBuyerPage`
> passes `analysis.riskFlags` in the isReal path — visible today through the Risk
> breakdown bar (the gauge itself stays suppressed until FMV or schools is real).
> Ledger row 15 tracks the values as unsourced. 9 unit + 1 page functionality test.

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

## 🔴 LIVE E2E RUN — real Realtor.ca listings through the full local pipeline (2026-07-01)

7 live listings (Toronto condos, Hamilton detached, Toronto rentals incl. a basement and a
2nd-floor unit) + 1 deliberately broken URL, through scrape → analysis in all 4 modes
(10 analyses). Full results in the session log; what matters:

**Works end-to-end on real data:** 6/7 scraped (address/price/beds/condo fees where present —
$718 and $953 fees + $1,410 taxes parsed correctly); every analysis returned real
coordinates, real Walk Scores (Yorkville walk 100/transit 91), live SunScout (same-day
feature), real narratives; partial-scrape detection flagged missing year_built/taxes
consistently; broken URL and the failed basement listing both returned clean 422
SCRAPER_FAILED → manual entry. All error paths behaved.

**BUG FOUND + FIXED — flag polarity + value handling (`logic_gate.py`):**

1. Every extracted field was treated as a RISK: amenity facts (`utilities_included`,
   `parking_included`, `den_present`) became red flags at ≥85 confidence and deducted
   −5 each. A real Gerrard St rental lost 15 points _for including utilities_.
2. Haiku's `value` was ignored — a confident FALSE ("not a basement", value=false,
   conf 90) still fired. A live _2nd-floor_ unit showed `is_basement_unit:red` +
   `basement_unit:red` (duplicate ids for the same fact, also fixed via alias).

Fixed with `INFO_FLAG_IDS` (11 amenity/lease facts filtered from risk output) +
`value is True` gate + `FLAG_ID_ALIASES` in `constants/thresholds.py`. Re-verified against
the same live listings: Gerrard 5 flags/score 1 → 0 flags/score 16; Mimico 5 flags →
one legitimate `illegal_unit_risk:amber`. 7 unit tests in the NEW `logic_gate_test.py`
(the gate had no test file at all). Info facts are extracted but not yet surfaced —
they should feed a future amenities panel, not the risk section.

**Known-gap observations (data-blocked, not bugs):**

- `comps=null` on ALL 7 listings — **checked directly against `rental_listings`: it IS thin
  data, not a query bug.** Only 221 rows total, newest `scraped_at` 2026-06-24 (the June
  25–26 depth probes did not persist rows); the tested FSAs hold 0–4 rows each, mostly
  studios (M5B: 4 rows all beds=0; M3J/L8H: 0). `fetchRentalComps` correctly returns null
  at 0 matches. The lever is the Railway nightly deploy (Tier-1 below) — the beds
  range-floor + postal precision debts only matter once rows exist.
- Every live listing scores 0–16 `hard_pass` — real cash-flow math at 4.79%/20% down is
  brutal, but with comps always null the mid-rent is the price×0.005 proxy, so the score
  distribution is currently driven by fallback assumptions. Deploy the nightly scraper +
  real comps before reading anything into live score levels.

---

## 🔴 LIVE MODE-MATRIX RUN — 6 listings × 4 modes (2026-07-02)

Re-ran the stored live listings (6 usable tokens; the 7th was the deliberately
broken URL) through all four modes after the flag severity matrix shipped:

- **Matrix verified on real data:** `needs_work` renders amber for
  investor/personal/landlord but is HIDDEN for tenant (Rowanwood, the matrix's
  hidden cell working live); the unlisted `parking_unclear` id lands on the
  default-amber path; every low-confidence flag capped at amber in every mode.
  No severe flags fired in the sample (no grow-ops in the wild) — the gate
  itself is pinned by unit/route/regression tests.
- **⚠️ Haiku extraction is nondeterministic run-to-run:** the SAME Gerrard St
  description produced `unverified_bedroom` + `parking_unclear` on two runs and
  zero flags on two others (Haiku sampling variance; both are Haiku-only ids).
  Regex-floored flags are deterministic; soft Haiku-only flags can flicker
  between re-runs. Not new behaviour, but first time observed side-by-side.
  Watch item: if flicker bothers users, pin extraction per listing (cache the
  merged flags) rather than re-extracting on every mode re-run.
- **Schools:** every analysis returned `schools:null` — correct, the table is
  empty AND (verified by probe, not assumption) migration
  `20260701_add_schools_name_postal_unique.sql` is NOT applied. Apply it, load
  the CSV, and the personal §04 / tenant §08 sections + HomeScore schools
  component light up on the next analysis with zero further code.
- Note: these re-runs updated each stored analysis's `report_mode` to the last
  mode run (test data only — pre-launch, no user impact).

---

## 🔴 FULL E2E PROOF RUN — 2 fresh listings × 4 modes, browser-verified (2026-07-02)

Scrape → analyze → render proven end-to-end on 1205-33 Helendale Ave (Whitehaus
condo rental, $2,650/mo) and 662 Byngmount Ave (detached sale, $3,499,000), with
every field checked against the live Realtor.ca pages in a real browser. Six
bugs found and fixed (commits c1ebc1d, 92f707e, 57c626b):

1. **ScraperAPI single-attempt** — premium succeeds ~1-in-3 vs Realtor.ca;
   added a 4-attempt retry (failures unbilled, their documented guidance).
2. **Condo mapped to detached** — Realtor's propertyType is "Single Family"
   for condos AND houses; now discriminate on dataLayer buildingType.
3. **parkingSpots hardcoded 0** — now parsed from "Total Parking Spaces"
   (Helendale 1, Byngmount 8). Photos: JSON-LD carries only #1 — page sweep
   now captures the set (capped 12). Beds: "2 + 1" arrives as dataLayer 3 —
   above-grade count (2) used instead (a den is not a legal bedroom; comps
   key on beds).
4. **Rent-bounds gate killed >$2M sales** — the $500–$10k mid check tripped on
   the for-sale price proxy ($17.5k/mo at $3.5M); gate now applies only to
   observed rents.
5. **Live-report rendering lies** — "2 bed bed", fabricated "Built 2016",
   "Asking $0" on rentals, $0-LTT card, all-dash expense card, pass-green
   amber chip.
6. **Personal-report copy phantoms on live** — "8 verified comparable sales"
   from fixture DEFAULTS (PBFMVSection compCount=8/avgDOM=12) + the verdict
   hero's Burlington fixture prose ("At $875,000… Tom Thomson catchment") on
   real addresses. Now honest "no source yet" provenance.

**Matrix live again:** condo_fee_unknown amber for landlord / hidden for
tenant on the SAME listing; basement_unit amber for investor / info-dropped
for personal on the SAME description (deterministic regex → matrix, not
Haiku variance).

**Comps scraper (pre-Railway selector check, depth-1 Toronto, live run):**
rentals_ca 75 raw · kijiji 46 · padmapper 19 → 100 rows upserted after dedup
(geocoded, 201s). No blocks, yield alarm quiet — selectors have NOT rotted.
NOTE: the nightly scrapers' supabase/mapbox services read env vars only (no
.env fallback like realtor_scraper) — fine on Railway, remember locally.

**Remaining honesty wart (product decision needed):** the personal §03
comparable-SALES table still renders the Burlington fixture rows on live
reports — labeled "Sample comparables · real sales data in Phase 2", but the
"8 sales · last 6 mo" chip reads real. Decide: keep the labeled sample, or
hide the table until a sales source exists.

**SunScout numbers sanity-checked, not a bug:** a south window sees the sun
in front of its plane nearly all of a short winter day (~9h/day) but loses
the high NE/NW summer sun (~8h/day); "annual peak sun hours" (~3,600) is the
geometric direct-sun-hours sum per the spec §17 template model + 2,500-hour
benchmark. Coarse (no obstruction/intensity), but internally consistent.

---

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

---

## 🎨 HARBOUR RE-SKIN — token port + live-verdict dark contrast fix (2026-07-05)

Ported the locked "Harbour" token system into production and verified the whole
app re-skins from tokens alone.

- **`tokens.css` ported byte-for-byte from `Landing v2.html`** (the locked
  standalone), onto the repo's own token _names_. bg cream `#F4F2ED` → cool
  limestone `#EFEFEA`; added `--accent-hover` (`#17405A` light / `#74A5BF`
  dark); radii → `6/12/18`; added `--sect` (aliases `--pad-y`) and `--r-*`
  aliases. Accent stays harbour `#1F4E68` / dark `#5E93B0`; caution darkened
  to `#8A6410` for AA on limestone.
- **🔴 Live dark-mode contrast bug fixed.** The `[data-theme="dark"]` block
  never redefined `--pass / --caution / --fail`, so the _light_ verdict colors
  bled onto dark surfaces (sage/amber/clay under-contrasted on `#171F28`).
  Added the measured dark variants: `--pass #7FB076` (6.63:1), `--caution
#D9A83F` (7.62:1), `--fail #E27F63` (5.90:1), all on `--surface`. Every
  accent/verdict pair is now ≥ 4.5:1 in **both** themes — ratios computed and
  recorded in the `tokens.css` header + the DESIGN_README divergence table.
- **Zero-breakage.** Snapshots reference `var(--*)`, not resolved values, so
  the value swap touched no test. Gates after the change: calc **344/344**,
  API **167/167**, web **853/853**, scrapers **151/151**; typecheck clean both
  workspaces.
- **Live E2E (Chrome, real data).** Re-ran both stored listings across all four
  modes and inspected each rendered report's DOM:
  - Investor (662 Byngmount, $3.499M) — full report, deal score 87/100,
    sections 01/04/05/06/07/08 (§02/§03 intentionally absent per Handoff).
  - Personal (Byngmount) — HomeScore hero gauge suppressed, honest "data
    pending" copy, `/100` values are Walk/Transit/Sun sub-scores only.
  - Tenant (1205-33 Helendale, $2,650/mo) — rent positioning + flags, **no
    investment deal-score gauge** (confirmed); the one gauge ring is SunScout.
  - Landlord (Helendale) — investment metrics via the live investor renderer
    (the accepted live behavior; Handoff Proposal 03 is a separate IA call).
  - **Zero stray terracotta anywhere** in any live DOM (light + dark). The only
    salmon hit is `mapboxgl-canary`, mapbox-gl's own hidden WebGL-probe element
    (CSS named color "salmon"), not our styling.
  - Dark mode verified live: verdict tokens resolve to the new dark variants.
- **Faux-browser window dots** on the landing proof card (were hardcoded
  `#E26060/#E2B660/#7CB36B`, non-theme-aware) re-tokenized to neutral ink
  `color-mix` shades — verdict tokens stay reserved for report data, not chrome.

**Environment note:** Chrome's logical viewport in this harness is pinned at
~4600px regardless of `resize_window`, so a true 380px browser overflow test
wasn't reproducible here — the PR8 mobile suite covers 380px deterministically
and passed. Screenshots also intermittently time out on the WebGL-heavy report
pages; DOM inspection (reliable) was used for the token/terracotta verification.

---

## 🎨 HARBOUR CLOSEOUT — visual-fidelity pass + 380px overflow fix (2026-07-05, cont.)

Closed out the Harbour re-skin: the visual pass the token session couldn't do,
the known mobile overflow bug, and the untracked design source.

- **Visual fidelity pass (Chrome, real data, iframe-viewport method).** The
  harness pins Chrome's layout viewport at ~4608px (devicePixelRatio 0.42) and
  `resize_window` doesn't move it, so screenshots were taken by mounting each
  surface in a **same-origin iframe at a real 380/1440px viewport** (media
  queries evaluate against the iframe width), CSS-transform-scaled to fill the
  capture, WebGL disabled in-frame so MiniMap renders its SVG fallback. Saved
  matrix: landing desktop-light (ss_7852a736l), landing mobile-380
  (ss_161677ggz), investor light (ss_7913l5wfn) + dark (ss_6994vhn01), tenant
  light (ss_647246eda), personal light (ss_1107aunzj), landlord light
  (ss_4713dyq2h). Verified against the standalones — **no fidelity gaps found**:
  - Gauge: large ink Instrument-Serif number, verdict pill inside the ring,
    "/100" denominator, ring colour = verdict tone (investor/landlord 15/100
    "Hard pass", red ring). (Last session's "87" was a mis-read Walk/Sun
    sub-score, not the deal score — the real score is 15, correct for a $3.5M
    sale underwritten as a rental.)
  - Section questions: Instrument-Serif italic on the key noun ("Does the deal
    _pencil?_", "…in the _bank_…", "Will the bank actually _fund_ it?").
  - Mono for every number (`$2,650/mo`, `$3,499,000`, `$23,534/mo`); card
    radius 18px (`--radius-lg`); card shadow = `--shadow-card`.
  - Dark mode: body + cards flip to dark tokens; verdict tokens resolve to the
    new dark variants; the AIVerdictBlock is a deliberate inverted card
    (`background:var(--ink); color:var(--bg)` — identical to the standalone
    rp-chrome.jsx), so it becomes a light hero card with dark text in dark mode
    (legible, faithful).
  - Personal HomeScore gauge suppressed → "Pricing & schools data pending"
    honest card; tenant has a dark hero band + AI verdict + rent positioning,
    **no deal-score gauge**.
- **🔴 Fixed the pre-existing 380px landing horizontal overflow** (was
  scrollWidth 751px). Root causes + fixes (all via existing collapse patterns,
  no new hardcoded values): nav collapses to wordmark + theme toggle (hide
  `.nav-links` ≤820px, `.lp-nav-cta` ≤640px); hero / #sunscout / #faq grids
  get `grid-1col-mobile`; pricing `grid-2col-mobile`→`grid-1col-mobile` (tier
  cards' min-content overflowed a 2-col split); Footer 5-col →
  `grid-1col-mobile`; bottom CTA row `flex-wrap`. Verified in a 380px iframe:
  scrollWidth 369<380, **zero unclipped elements past the edge**, no h-scroll
  at 360/380/414px. Two landing mobile-collapse regression guards added.
- **Committed `docs/PropScout Standalones/`** (the design source of truth,
  previously an untracked dangling reference) — 17MB, no node_modules, nothing
  > 5MB. `services/agents/` left untracked (unrelated, node_modules inside).
- **Gates:** calc 344/344 · API 167/167 · web **855/855** (+2 new mobile
  guards) · scrapers 151/151; typecheck clean both workspaces. 4 Footer
  snapshots updated one-file-at-a-time (sole diff = the added collapse class).
