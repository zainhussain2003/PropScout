# Review — `TENANT_REPORT_AUDIT.md`

**Verdict: the most honest of the four report audits, and the only one whose
subject is close to shippable. Its field-by-field table is the right format. Two
findings are under-rated and its "already corrected" list needs commit
references.**

## Why this report is the audit's strongest subject

Twelve sections, and the status distribution is telling: **ten Partial, two
Blocked, zero Working**. A less disciplined audit would have marked several
Working — the Walk Score integration, the deterministic checklist, the
explicit-inclusion rule for parking and locker all function correctly. Refusing
"Working" because provenance or confidence is incomplete is the right standard
and it is applied consistently.

The tenant report is also the mode where PropScout's data situation is
genuinely strongest: rental comps are **real scraped active asking rents** from
Rentals.ca, Kijiji and PadMapper (7,285 rows across 309 FSAs when I last
checked), not sample data. Unlike the personal and investor reports, the tenant
report is not blocked on a licensed feed. The audit is right that this is the
broadest honest live coverage in the product.

## Verified

| Claim                                                               | Result                                                                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Comps are real scraped asking rents, aggregate-only in the response | **Confirmed.** `RentalEstimate` carries low/mid/high/compCount/confidence/postalCode/radiusKm — no individual records. |
| Geographic scope is FSA with a radius fallback                      | **Confirmed.** D-031: FSA first, then 5 km, then 10 km, with confidence capped at medium/low and the radius disclosed. |
| No detected flag yields full honesty credit                         | **Confirmed** as a scoring behaviour; the personal audit gives the equivalent figure (10/10).                          |
| Extraction not cached by description hash + extractor version       | **Confirmed.** No cache layer in the extraction path.                                                                  |
| School distances are straight-line, not catchment                   | **Confirmed**, and correctly labelled in the UI after the fixes listed.                                                |
| SunScout floor inferred from unit number; south assumed             | **Confirmed.** `infer_floor_from_address`; south is the initial facade.                                                |
| Individual comp markers unavailable (§10)                           | **Confirmed** — follows from the aggregate-only payload.                                                               |

## Two findings I would rate higher

### The honesty component is a fabrication-class defect, not a "Partial"

> Absence of detected warning language does not establish that a listing is
> honest.

This is correct and the audit states it well — but it is filed as **Partial**
alongside coverage gaps. It is materially different in kind. A tenant looking at
"Listing accuracy: no supported flags found" and a high honesty score will
reasonably conclude the listing has been _checked and cleared_. What actually
happened is that a regex pass and a structured extractor found no matching
phrases in whatever description text existed — possibly none at all.

Under the audit's own content-integrity standard ("presents ... an incomplete
scan ... as a completed fact") this is a **P1**. It is also the same defect as
"No flags detected" being ambiguous, which appears unrated in three other
documents. One rated finding, one owner, one fix.

### §05 monthly cost understates its own estimate proportion

The row notes rent is sourced while hydro $56, gas $42, water $60 and internet
$65 are estimates. That is $223 of $2,450 asking rent — but the tenant's
decision is about **total monthly outlay**, where the estimated share is
$223/$2,673 ≈ 8%. Modest here. The equivalent figure on the personal report is
24% of a "true monthly cost". Stating the estimated proportion explicitly, in
both reports, would make the provenance concrete rather than a per-row badge the
reader must aggregate mentally.

## Where the audit is notably good

**§03 "Listed vs reality" marked Blocked with no proposed workaround.** Room
dimensions, window claims, condition and noise "cannot be verified remotely" —
and rather than proposing an inference, the audit proposes a _viewing workflow_
that captures user evidence. That is the correct answer and the discipline to say
"Blocked" rather than invent a proxy is exactly what this product needs.

**§06 inclusion rule.** "Continue accepting only explicit positive claims" — a
mention of parking is not proof parking is included in rent. Precise, and already
implemented per the corrections list.

**§04 negotiation.** The observation that the report cannot show _which
individual records make the strongest case_ is the sharpest practical
consequence of the aggregate-only payload. A tenant negotiating needs three
comparable units they can name, not a percentile band. That is a better argument
for the individual-comp work than the provenance framing used elsewhere.

## Gaps

1. **The "already corrected" list has no commit references.** Eight items are
   claimed fixed. I spot-checked three and they hold, but a reader cannot verify
   the rest without re-deriving them. Each should cite a commit or a decision ID.
2. **The tenant score's weights are never stated.** The audit says the score
   "combines rent position, listing honesty, cost transparency, negotiation
   leverage and building demand" and the report screenshot shows 12/25, 6/20,
   14/20, 18/20, 8/15 — so the weights exist and are knowable. Publishing them
   here would let a reader judge whether the honesty component is material (it is
   20 points, second-largest) rather than take the criticism on trust.
3. **No position on whether the tenant report should remain free and unmetered.**
   The roadmap flags this as an owner decision and the claims audit notes "Free
   forever tenant report ... needs server quota confirmation". This document is
   where the product argument belongs: the tenant report is the funnel, it has
   the best data, and gating it would be self-defeating. Worth saying.
4. **Rent-control status is absent.** For an Ontario tenant, whether the unit is
   rent-controlled (pre-November 2018 first occupancy) determines how much future
   increases can be. It appears in the landlord audit's missing-evidence list but
   not here, where it matters to the person signing the lease.

## Bottom line

The best-executed report audit and the mode closest to shippable. Two changes:
promote the honesty-component finding to a rated P1 shared with the "No flags
detected" ambiguity, and publish the tenant score's weights so the criticism is
checkable. Add commit references to the corrections list, and add rent-control
status as a tenant-side evidence gap.
