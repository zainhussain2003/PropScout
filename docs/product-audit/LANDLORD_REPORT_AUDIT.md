# Landlord report audit

## Executive assessment

The landlord concept is useful, but the live product does not currently deliver the landlord report shown on the demo route. The canonical shared route sends landlord mode through the investor report component, a **P1 product-integrity issue**. The specialized `LandlordPage` also has a **P2 latent defect**: it uses hard-coded Toronto comp fixtures unconditionally, but current routing never passes a live subject into that page. Routing live data there before removing the fixtures would activate a P1 defect.

## Audience and decision

The intended user is an Ontario long-term landlord deciding what rent to ask, how competitive the unit is, what it costs to operate, and what evidence supports a negotiation or listing strategy. A good landlord report should answer:

1. What asking-rent range is supported by comparable active rentals?
2. What costs and legal constraints determine sustainable net income?
3. Which listing facts are confirmed, estimated or unknown?
4. What risks must be resolved before advertising or signing a lease?

The current specialized page partially answers these, but also imports investor concepts such as acquisition score, mortgage stress and equity build without first establishing whether the landlord owns the unit already, is refinancing, or is evaluating a purchase.

## Route and data integrity

| ID   | Severity                     | Finding                                                                                                                                                     | Evidence                                                                     | Proposed response                                                                                                                                       |
| ---- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-01 | P1                           | Live landlord mode renders `InvestorReportContent`.                                                                                                         | `ReportPage.tsx` renders the same branch for `investor` and `landlord`.      | Route live landlord analysis to one canonical landlord component.                                                                                       |
| L-02 | P2 latent; P1 if routed live | `LandlordPage` computes positioning from `LL_RENT_COMPS` even though its props permit real data; current routes mount it only as a demo without live props. | `LandlordPage.tsx` line 385 and its comp table; `App.tsx`; `ReportPage.tsx`. | Remove fixture dependencies before, or atomically with, routing live landlord data. Render aggregate-only honestly until individual comps are returned. |
| L-03 | P1                           | Live backend score is the investor acquisition score.                                                                                                       | All modes run the same calculation payload and deal score.                   | Define whether landlord mode is acquisition underwriting or operating/pricing health. Give the latter its own method.                                   |
| L-04 | P2                           | The standalone landlord route and shared report route are different products.                                                                               | `App.tsx`, `LandlordPage.tsx`, `ReportPage.tsx`.                             | Demo and production must use the same component and adapters.                                                                                           |

## Section-by-section audit

| Area              | Current behavior                                                                                                      | Source or missing data                                             | Assessment and response                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero/verdict      | Shows asking rent, stable metrics and a score; live shared route instead shows investor content.                      | Backend investment metrics plus frontend adapter.                  | Decide the landlord question first. A pricing report should lead with supported rent band and confidence, not purchase deal score.                                                |
| Rent positioning  | Demo fixture distribution and comps; the specialized component would retain those fixtures if later given live props. | `LL_RENT_COMPS`, not subject comps.                                | Remove fixtures before live routing. API should return sanitized comparable records with provider, observed date, beds, type, size, approximate location and match score.         |
| Monthly economics | NOI, cap rate, GRM and costs.                                                                                         | Same estimated value and expenses used by investor engine.         | Useful for an acquisition, weaker for an existing owner. Ask mortgage balance/rate only if the user wants financing cash flow. Separate property operations from owner financing. |
| Listing accuracy  | Structured flags from description extraction.                                                                         | Regex plus Haiku extraction, no description-hash cache.            | Relevant, but a landlord-authored listing needs a compliance/completeness check distinct from detecting seller/landlord misrepresentation.                                        |
| Market/demand     | Vacancy and neighborhood signals.                                                                                     | City-level CMHC mapping; DOM/rent trend defaults remain.           | Show geography and release date. Do not call default DOM or flat trend observed market data.                                                                                      |
| Neighborhood      | Walk/Transit/Bike, amenities and census.                                                                              | Walk Score, Google Places, StatsCan FSA.                           | Useful demand context. Label straight-line distances and 2021 census vintage.                                                                                                     |
| Equity build      | Long-term balance/value projection.                                                                                   | Appreciation assumptions and mortgage model.                       | This belongs behind an optional ownership/hold scenario. It ignores cumulative cash deficits in the displayed equity figure and can overstate wealth.                             |
| SunScout          | Light score and obstruction.                                                                                          | Solar geometry, inferred direction/floor, OpenStreetMap buildings. | Valuable listing evidence only after window direction and floor are confirmed. Unknown building heights bias obstruction optimistic.                                              |
| STR               | Coming-soon placeholder.                                                                                              | No regulation, licensing or STR economics data.                    | Remove from a long-term rental decision report until a jurisdiction-specific module exists.                                                                                       |
| Checklist         | Static landlord checklist.                                                                                            | Generic copy, no saved answers.                                    | Turn into a persistent evidence checklist with lease package, utilities, parking, condo bylaws and rent-control status.                                                           |

## Missing landlord-specific evidence

- Ontario rent-control status and exemption basis.
- Current lawful rent, last increase date, and annual guideline eligibility.
- Utility responsibility and actual 12-month bills.
- Parking/locker rent separated from unit rent.
- Condo declaration and rules affecting leasing, pets or minimum term.
- Property management contract and leasing commission.
- Turnover costs, repairs, bad-debt allowance and capital reserve.
- Existing tenant status, arrears, notices and vacancy possession risk.
- Insurance quote and municipal licensing requirements where applicable.
- Whether the objective is new-listing price, renewal increase, refinance, or acquisition.

These fields must remain unknown until the owner supplies documents or an authoritative integration supplies them.

## Proposed landlord method

Use three separate outputs rather than one blended score:

1. **Rent evidence:** supported range and confidence based on comparable active asking rents, with executed lease data added when a licensed source becomes available.
2. **Operating margin:** rent minus property-level operating expenses, excluding owner-specific mortgage by default.
3. **Readiness/risk:** evidence completeness, legal/lease questions, and listing-description risks.

If a single summary badge is required, it should express evidence readiness (“Strong evidence,” “Partial evidence,” “Insufficient evidence”) rather than a pseudo-precise investment score. Acquisition underwriting can link to investor mode.

## Acceptance criteria

- A live landlord report cannot import any demo fixture.
- The report never calls an asking-rent aggregate a leased-rent comparable.
- Every expense has amount, known/estimated state, method and source date.
- The user states the landlord task before owner-specific financing appears.
- The report has unique section numbering and all action buttons work or are absent.
- Repeating the same listing and inputs yields the same rent evidence and prose for a fixed data snapshot/version.

## Review trail

- [Independent review](../audit-review/LANDLORD_REPORT_AUDIT.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Severity correction:** fixture use is P2 latent today because `LandlordPage` receives no live props. It becomes P1 when canonical traffic is routed there.
- **Required order:** remove fixture comparables before, or atomically with, the route change.
- **Retained additions:** decide whether landlord mode ships at all; ask whether the task is vacancy pricing, renewal, refinance or acquisition; apply rent-control/legal checks only to the relevant path and obtain qualified review.
