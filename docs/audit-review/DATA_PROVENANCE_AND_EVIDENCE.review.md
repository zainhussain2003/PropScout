# Review — `DATA_PROVENANCE_AND_EVIDENCE.md`

**Verdict: accurate, and the most conceptually important document in the audit.
Its opening principle is the one idea that, if implemented, prevents most of the
defects the other documents list individually.**

> Every report value needs five attributes: **value, origin, observation date,
> transformation, and confidence**. A null is a valid result. A default is an
> assumption and must never be serialized or displayed as an observed fact.

That is the correct frame. Almost every P0/P1 elsewhere in the audit — condo
defaults, `detached` on read, "No flags detected", synthetic progress, silent
tier fallback, fabricated invoices — is a violation of one of those five
attributes. Treating them as one architectural problem rather than fifteen bugs
is the document's main contribution.

## Verified

| Claim                                                                      | Result                                                                                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Missing beds/baths read as zero                                            | **Confirmed.** `address.ts:270–271`.                                                                                             |
| Missing parking read as zero                                               | **Confirmed.** `address.ts:275` hardcodes `parkingSpots: 0`.                                                                     |
| Missing property type → `detached` on read                                 | **Confirmed.** `supabaseService.ts:133`.                                                                                         |
| Manual entry starts as `condo`                                             | **Confirmed.** `address.ts:273`.                                                                                                 |
| `condoFeeKnown` exists as the good precedent                               | **Confirmed.** `address.ts:277`.                                                                                                 |
| Rental comps are real scraped asking rents, aggregate-only in the response | **Confirmed.** `RentalEstimate` carries only low/mid/high/compCount/confidence/postalCode/radiusKm.                              |
| CMHC vacancy is a per-city constant map with placeholder labelling         | **Confirmed.** `cmhcVacancy.ts` — `hamilton: 0.033`, header comment "these are placeholder starting values keyed to indicative". |
| Market cap rate constants are explicitly indicative                        | **Confirmed** in `constants/valuation.ts` framing.                                                                               |
| Unknown window direction defaults south; floor inferred from unit          | **Confirmed** in `sunscout/` and by `infer_floor_from_address`.                                                                  |

## R-03 — the round-trip contradiction the document lists but does not connect

The field-level unknowns section correctly notes both halves:

> Missing property type is read as detached; manual entry starts as condo.

Stated as one sentence with a semicolon, it reads as two parallel defaults. It is
actually a **contradiction on a round trip**: an address-entered listing with no
stated type is _written_ as `condo` and _read back_ as `detached`. Maintenance
reserve (0.5/1.0/1.5% by era), condo-fee expectations and report language all key
off that field, so the same unknown yields two different property models
depending on which path the report takes.

Framed as a round-trip flip it is obviously a P1; framed as two defaults it looks
like two P2 tidy-ups. Worth restating.

## The strongest section

**"Rental comparables in detail"** is the best-argued part of the audit. The
observation that the report cannot tell the user whether "22 comparable rentals"
are comparable _by building, size, type, age, parking, furnished state or listing
date_ is exactly right, and the proposed `RentComparableEvidence` interface is
well specified — `sameBuilding`, `similarity` and `exclusions[]` are the three
fields that make the set auditable rather than merely visible.

One addition: the interface should carry the **search geography actually used**.
The comp query widens from FSA to a 5 km and then 10 km radius when the FSA is
empty (D-031), and confidence is capped accordingly — but a user seeing "22
comparables" cannot tell whether they came from their postal area or from 10 km
away in another municipality. `radiusKm` exists on the aggregate today; it needs
to survive into the per-record payload, and the requirement that "the percentile
range should be computed from the displayed eligible set" should extend to
"...and the displayed set must state the geography it was drawn from."

## Where I would push harder

**The confidence policy's consequence should be stated as a product decision, not
a design note.** The document says:

> For address-entered sale listings, low confidence will be common until the
> owner supplies rent, expenses and property type. That is a truthful product
> outcome and should be designed intentionally.

That is correct and admirably honest. But under the table above it, Low
confidence permits _"'Insufficient evidence' or 'appreciation/assumption
dependent'; no positive deal claim."_ Combined, this means **the product can
never return a positive verdict through the address-entry path built in D-020** —
the path the landing page now leads with. That is a major product boundary and it
deserves to be a named decision requiring owner sign-off, in the same register as
the roadmap's "recommended decision sequence for the owner". The investor
research reaches the identical conclusion independently, which strengthens it.

**Obstruction coverage should be quantified now, not later.** The document
correctly notes that "many buildings lack height; missing heights bias result
optimistic" and recommends suppressing a definitive score below a coverage
threshold. The reports already print the coverage: the personal audit records
"Five nearby buildings have known heights and seven are omitted" (42%) and the
tenant audit "13 surrounding buildings have no height". Those are the numbers a
threshold would use — so the recommendation is implementable immediately, and
42% known heights is plainly below any defensible threshold. This is a cheaper,
more concrete fix than its placement in the acquisition-priority list suggests.

## Gaps

1. **No source-failure state in the envelope.** The proposed `kind` enum is
   `observed | user_supplied | inferred | estimated | sample | unknown`. That
   cannot express _"we tried to fetch this and the provider failed"_ — which is
   precisely the ambiguity the shared-UI audit flags for "No flags detected" and
   the API audit flags for fail-open optional sources. Add `failed` (and,
   arguably, `stale`).
2. **Refresh semantics are described but not decided.** "Distinguish 'rerun with
   current data' from 'open original report'" is right, but which one does the
   existing `POST /analysis/:token` on an existing token do? It re-runs. So today
   the share link is _not_ immutable, which contradicts the API audit's proposed
   ownership rule 1 ("View by unexpired share token returns a redacted immutable
   snapshot"). The two documents disagree about current behaviour and neither
   flags the conflict.
3. **Mortgage-rate freshness has no staleness bound.** The table says "fallback
   can go stale" and recommends showing the retrieved date. It does not propose a
   maximum age after which the rate must not be used — which matters, because a
   stale rate silently changes every levered metric.
4. **No retention or licence-display requirements per source.** The API audit
   raises retention; this document is where per-source licence and attribution
   obligations belong (Repliers/TRREB attribution, Walk Score display terms,
   Google Places caching restrictions, OSM/ODbL attribution). Only the MLS
   attribution string is mentioned anywhere in the audit, and the others carry
   real contractual constraints.

## Bottom line

Adopt the five-attribute principle as the organising fix. Three changes: restate
the condo/detached defaults as a single round-trip contradiction (R-03); add
`failed` and `stale` to the `kind` enum; and elevate the address-entry confidence
ceiling from a design note to an owner decision. Quantify obstruction coverage
now — the numbers are already in the reports.
