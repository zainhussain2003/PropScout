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

**The per-flag × mode severity matrix is NOT implemented.** This thread opened as "build the
matrix" (the four-mode colour table: `needs_work` amber-for-investor / red-for-personal-buyer,
`tenant_occupied` flipping meaning across roles). What actually shipped is the **severe gate**
(the 4 catastrophic flags capping the score for investor/landlord) **+ the personal-buyer
correctness/safety fixes** + a flat standard-red −5. The rich per-mode _cells_ — the original
Item 1 — remain a **design on paper**. Flags do **not** get mode-specific severity yet.

This line is load-bearing: months from now "the matrix is done" would be believed by everyone
(including future-me) and it would be **false**. The matrix is **unbuilt scope**, not a
finished feature. Validate AND build the cells before any doc, commit, or status says "matrix".

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
