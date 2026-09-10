# Review — `PERSONAL_REPORT_AUDIT.md`

**Verdict: accurate, and it documents the audit's best decision — pausing the
aggregate home score rather than deriving one from the asking price. That single
choice is the clearest evidence the project's evidence discipline is real.**

## The decision worth crediting

> Overall score is paused with "Verified pricing data pending."
> ...
> Live reports never synthesize a fair-market-value band from the asking price.

Deriving an FMV band from the ask would have been trivial, would have looked
completely normal, and would have been circular — the product telling the user
that a $589,000 listing is worth about $589,000 and calling it a valuation. The
report shows only the ask and $736/sqft "for reference", and says why the band is
missing.

Withholding a headline number that the UI has a slot for is the hardest kind of
honesty to sustain, and it is the strongest single signal in the whole audit set.
It should be cited whenever anyone proposes relaxing the evidence rules.

## Verified

| Claim                                                             | Result                                                                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §02 FMV is an honest empty state; no band derived from ask        | **Confirmed** in `PBFMVSection` behaviour and the D-029 decision record.                                                                                           |
| §03 shows two Tacoma rows explicitly labelled provider sample     | **Confirmed.** `comparableSalesService.ts` sample mode; label is caution-coloured: "Real sales from the provider's sample coverage area — not this neighbourhood." |
| Zero parking cannot distinguish missing from confirmed absence    | **Confirmed.** `address.ts:275` hardcodes `parkingSpots: 0`; no `parkingKnown` flag exists.                                                                        |
| Twelve genuine listing photos render without invented frames      | **Confirmed.** `ListingVisual` builds thumbnails from photos that exist and only claims "+ N more" when N > 0 (D-034).                                             |
| Unknown build year stays unknown                                  | **Confirmed.** `maintenanceNote(0)` returns "build year unknown" rather than asserting pre-1980 (D-030).                                                           |
| Silent wording scan still shows as 10/10 in the component summary | **Confirmed** as described.                                                                                                                                        |
| Straight-line school distance, no catchment claim                 | **Confirmed** and labelled.                                                                                                                                        |
| Market trends remain em dashes with "No source connected"         | **Confirmed.**                                                                                                                                                     |

## The 10/10 risk component is the sharpest finding here

> A silent wording scan still appears as 10/10 in the component summary, which
> can look more conclusive than the evidence warrants.

This is the same defect as the tenant report's honesty component and the "No
flags detected" ambiguity, and this document states it most precisely because it
gives the number. **10 out of 10** for "we found no risk words in whatever
description text existed" is the most conclusive-looking output the product
produces, on the least evidence it has.

It is filed as **Partial**. Under the audit's own content-integrity standard it is
a **P1**: a full score presented as an assessment when no assessment occurred.
The proposed fix ("Replace full risk credit under incomplete evidence with a
neutral completeness state") is right.

## The "true monthly cost" figure quantified

§01 reports $4,722/month: mortgage $2,697, tax $251, condo fee $629, insurance
$172, utilities $237, maintenance $736.

Of that, **$1,145 is pure model output** — insurance (0.35% of value), utilities
(sqft-derived constants) and maintenance reserve (build-year bracket, and the
build year is _unknown_ here so it takes a default). That is **24% of the
headline "true" cost**.

The claims audit is right that "true monthly cost" should become "modeled
monthly cost". This document has the arithmetic that proves it and does not do
the sum. Worth adding — a quarter of a figure labelled "true" being modelled is a
more persuasive argument than a per-row badge.

Note also that maintenance is the **largest** estimated line ($736) and depends
on a build year the report itself marks unknown. So the single biggest modelled
cost rests on a missing fact. That interaction is not called out.

## Gaps

1. **The home-score method is described as existing for demo data but its
   components are not listed.** The scoring audit names them (pricing, schools,
   light, mobility, lot value-add, risk) but not their weights. Since the audit's
   recommendation is to reconsider whether a universal home score should exist at
   all, the reader needs to see what it currently weighs. A score that gives
   points for transit richness is making a lifestyle judgement, not an evidence
   judgement — the audit says so, but without the weights the claim is unfalsifiable.
2. **R-04 — the Buttermill reference collides with the release gate.** This
   document uses **2501–5 Buttermill Avenue at $589,000**. `AGENT_HANDOFF.md`,
   `test_regression.py` and the testing document's release gate use **5702–5
   Buttermill Avenue at $729,900** with −$2,723.68/mo. Both score 8; neither
   document mentions the other. An operator checking the gate against 2501 will
   see a ~$700/month gap and diagnose a regression that does not exist.
3. **"Local-agent second opinion" marked Blocked is right but incomplete.** The
   report tells the user to share with an agent they trust. It does not consider
   that the share link is currently **mutable by the recipient** (see the API
   review) — so the product is actively recommending that users hand a
   tamperable link to a professional with an interest in the outcome. Those two
   findings interact and neither document connects them.
4. **No treatment of the condo/detached round trip for this mode.** The personal
   report keys maintenance, fee expectations and language off property type. An
   address-entered condo is written as `condo` and read back as `detached`
   (R-03), which would flip the maintenance bracket and remove fee expectations.
   For the mode most sensitive to property type, that deserves a row.
5. **"Already corrected" list lacks commit references** — same gap as the tenant
   audit. Twelve items claimed; three spot-checked and holding.

## Bottom line

Accurate, and its central decision — pausing a score rather than fabricating a
band — is the audit's best evidence that the project's stated ethics are
operational rather than aspirational. Four changes: promote the 10/10 silent-scan
component to a rated P1; add the arithmetic showing 24% of "true monthly cost" is
modelled; disambiguate the Buttermill property against the release gate; and
connect the agent-sharing recommendation to the mutable-share-link finding.
