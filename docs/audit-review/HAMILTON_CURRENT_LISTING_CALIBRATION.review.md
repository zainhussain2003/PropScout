# Review — `HAMILTON_CURRENT_LISTING_CALIBRATION.md`

**Verdict: a well-designed experiment and the empirical backbone of the audit's
strongest structural finding. Its method discipline is exemplary. Two
limitations it should state more plainly.**

## Why this document matters more than its length suggests

It is the only place in the audit where a claim is tested against _current, real
market listings_ rather than code. And it produces the evidence for S-01
(correlated score components) rather than asserting it:

**Baseline run — four of six properties land at exactly 92 raw / 97 displayed
"Strong buy":** 90 Sherman ($499,900), 16 Beaucourt ($599,900), 10 Fairleigh
($559,000), 66 Wellington ($1,499,000). Their cap rates span 7.43%–9.19%, cash
flows $982–$2,911/mo, CoC 9.00%–17.09%, DSCR 1.36×–1.68×, and prices differ by
3×. **The score cannot distinguish any of them.**

That is saturation demonstrated, not argued. It follows necessarily from the
step thresholds I verified in `deal_score.py` (cap ≥6% → full 25; cash flow
≥$500 → full 25), and 92 × 100/95 = 96.8 → 97 confirms the display arithmetic.

**The conservative sensitivity is the more useful half.** Reducing rent 5% and
enabling the 8% management fee spreads the same four properties across 97 / 76 /
65 / 81 — Strong buy, Good deal, Caution, Good deal. The ranking becomes
informative precisely when the assumptions become conservative.

That is a strong, self-contained argument for the audit's recommendation to make
the conservative case the headline. It deserves to be stated as the document's
conclusion; currently it is left for the reader to infer.

**It also shows the engine is not broken, only top-saturated.** 406 East 43rd
(27/28, "Do not buy") and 156 East 36th (24/25, "Do not buy") separate cleanly.
The score discriminates bad from good; it cannot rank good from excellent. Worth
saying explicitly, because "the score cannot express that difference" elsewhere
in the audit reads more damningly than the data supports.

## Method discipline — worth crediting

- Realtor.ca pages read directly; **the application scraper and shared Supabase
  project were not used**, so no listings or reports were created.
- Calculation service called locally through `POST /analysis/`.
- **No listing description sent to extraction**, so the results isolate the
  financial score with no risk-flag deductions. That is the right control for a
  scoring-calibration exercise and the document says so.
- Baseline assumptions tabulated with a _reason_ column, each traced to an
  existing default rather than chosen for the experiment.
- Rents explicitly described as "listing-side claims, not verified lease
  documents".

I verified the regression-fixture claim: `test_regression.py:13` and `:68`
confirm 146 East 19th Street, Hamilton at $449,000 is a real regression case
alongside Vaughan. The document's framing of it as "old calibration data" that
"should not be treated as proof that a similar deal is available today" is
accurate and appropriately careful.

## Limitations it should state more plainly

### 1. The 90 Sherman NOI agreement is weaker evidence than it reads

The document notes the engine's baseline NOI ($45,946) is "close to the listing's
$44,850 claim" and calls that "encouraging". But both figures rest on the
**same** listing-reported gross rent of $58,500. Agreement on NOI given agreement
on rent tests only that the expense model is in the same neighbourhood as the
seller's — and the seller has an incentive to understate expenses. The document
does add the right caveat ("a rent roll, leases, utility bills, insurance quote,
and repair history are still required"), but "encouraging" overstates what a
shared input can establish. It is a consistency check, not corroboration.

### 2. Six properties in one city is not a calibration set

The document is careful never to claim it is — but the audit and roadmap lean on
it to justify re-weighting the score. Six Hamilton listings, selected for having
rent disclosed (a non-random selection criterion that likely favours investor-
marketed properties), cannot support new component weights. The investor
research says this correctly: "No component weights should be finalized before
calibration against a documented set of real Ontario properties." This document
should carry the same sentence so it is not cited as sufficient.

### 3. Selection bias deserves a line

Properties were included because rent was disclosed in the sale listing, or
because the exact units were separately listed for rent. That selects for
tenanted, investor-targeted stock — exactly the properties most likely to score
well. A calibration set that over-represents good deals will understate
saturation if anything, so the finding survives; but the bias direction should
be named.

## Gaps

1. **No monotonicity probe.** The document has six properties, a working local
   service and two assumption sets — it was one loop away from testing whether
   worse inputs can ever produce a better score. That would have been the single
   most valuable addition, and it is the audit's own proposed validation item 4.
2. **Demand-component inputs are defaults and this is not flagged as a finding.**
   The baseline table lists "Rental days on market: 21 days — current service
   default" and "Rent trend: Flat — current service default". Since demand is 10
   points and the investor audit notes demand was the _only_ component earning
   points on the Buttermill property, defaults feeding this component is a
   fabrication-class issue (S-02). This document has the cleanest evidence for it
   and does not connect them.
3. **Break-even rent is reported but never reconciled.** The tables give
   break-even rents ($3,243–$9,519). Given R-01 elsewhere in this review — that
   break-even excludes the management fee while other metrics may include it —
   the conservative run (management **enabled**) is where a discrepancy would
   surface. Checking one row by hand would either confirm the engine is coherent
   under management or expose the split.
4. **No date on the listings' availability.** Research date is given (2026-09-09)
   but MLS listings expire. A future reader cannot tell whether a link that now
   404s means the method was wrong or the listing sold.

## Bottom line

The best empirical work in the audit and the reason S-01 is credible rather than
theoretical. Three additions would strengthen it: state the conservative-case
spread as the explicit conclusion; add the "not sufficient for re-weighting"
caveat so it is not over-cited; and hand-reconcile one break-even rent under the
management-enabled run to test R-01.
