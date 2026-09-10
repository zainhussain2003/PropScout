# Product claims and content-integrity audit

## Standard

PropScout's central promise is that it will tell a user not to proceed. That requires a higher bar than avoiding fabricated prices. A claim is misleading when the product presents a fixture, estimate, incomplete scan, inactive control or planned feature as a completed fact.

## Claim matrix

| Claim or implication                        | Evidence in product                     | Assessment                                                                                                                                                              | Proposed response                                                                                                                  |
| ------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| “Any Canadian listing URL”                  | Landing copy.                           | Unsupported. Runtime scope is Ontario and live scraping is Realtor.ca.                                                                                                  | Say “Ontario Realtor.ca listing or Ontario address” until coverage expands.                                                        |
| Realtor.ca and Zillow.ca supported          | Validator and landing.                  | Zillow path is deferred/unported.                                                                                                                                       | Remove Zillow from accepted domains/copy or implement and live-test it.                                                            |
| Full report in under 60 seconds, every time | Landing/how-it-works copy.              | Absolute claim cannot survive dependency failure; no production percentile evidence.                                                                                    | Use measured “typically” claim with as-of date, or omit speed claim.                                                               |
| Every number has a source, date and method  | Landing methodology section.            | Not true for many constants/defaults; dates/methods are often absent in UI.                                                                                             | Add an assumption/evidence ledger before restoring the claim.                                                                      |
| Comparable sales for personal buyers        | Personal report marketing.              | Ontario source unavailable; Tacoma sample only.                                                                                                                         | Keep live score paused and label sample as demonstration.                                                                          |
| School catchments                           | Landing copy.                           | Schools are nearest by straight-line distance; boundaries are unavailable.                                                                                              | Say “nearby schools” until boundary data exists.                                                                                   |
| SunScout with building obstruction/3D       | Pricing, upgrade, welcome.              | Solar/OSM obstruction calculations exist; promised 3D experience is incomplete and inputs may be inferred.                                                              | Describe the actual modeled estimate and its coverage, or complete the product.                                                    |
| Portfolio tracker/save                      | Pricing, upgrade, welcome, nav/account. | Database table and mock UI exist; save/portfolio journey is not implemented.                                                                                            | Remove from sale and account navigation until persistence is real.                                                                 |
| Monitoring and alerts                       | Account notifications.                  | No monitoring workflow behind toggles.                                                                                                                                  | Remove or label as unavailable; never confirm monitoring.                                                                          |
| Reset link sent                             | Password reset request success state.   | No request is made.                                                                                                                                                     | Wire the auth service before showing confirmation.                                                                                 |
| Mode can be switched inside report          | Mode modal.                             | No report switcher exists.                                                                                                                                              | Remove the sentence or implement switch.                                                                                           |
| “No flags detected” / clean scan            | Report empty state.                     | Can also mean missing description or extraction failure.                                                                                                                | Expose extraction status and evidence completeness.                                                                                |
| “Comparable rentals”                        | Tenant narrative and rent positioning.  | Real scraped active asking rents, but individual similarity is hidden.                                                                                                  | Say “active asking-rent records” and show the matched set.                                                                         |
| Free forever tenant report                  | Mode card.                              | Unenforced. The broader allowance is 10 analyses in web/API constants and `CLAUDE.md`, while landing copy says three sale reports; no server meter applies either rule. | Decide the unit and allowance, enforce it server-side, and ensure tenant really bypasses the sale quota if “free forever” remains. |
| Professional white-label PDF                | Pricing/FAQ.                            | Requires end-to-end confirmation.                                                                                                                                       | Do not sell until branding, entitlement and PDF QA pass.                                                                           |

## Fixture isolation

Fixtures are legitimate for demos and tests only when the user can unmistakably identify them. The landing sample report is labelled, and Tacoma sales are labelled sample data. The account dashboard fails this standard on a live route. The specialized landlord page is currently demo-only, but it accepts live props while retaining fixtures; this latent boundary failure would become a live defect if the canonical route were connected first.

Required controls:

- Fixture types cannot satisfy production component props.
- Production builds either exclude fixture modules or require `dataMode="demo"` at a route boundary.
- Every demo has a visible “Sample report” marker and cannot be saved, shared as real, billed or mixed with a live subject.
- Automated tests fail if fixture IDs/addresses appear on live routes.

## Estimate language

Use consistent language:

| Evidence            | Preferred label                    | Avoid                                      |
| ------------------- | ---------------------------------- | ------------------------------------------ |
| Direct listing fact | “Listing states …”                 | “Confirmed” unless independently verified. |
| User-entered fact   | “You entered …”                    | “Listing states …”                         |
| Derived calculation | “Calculated from …”                | “Actual” or “true” without qualification.  |
| Market default      | “Assumed … as of …”                | Silent default.                            |
| Model inference     | “Inferred; confirm …”              | Rendering it as a property fact.           |
| Missing             | Em dash plus reason                | Zero, “none,” or a plausible substitute.   |
| Sample              | “Sample data — Tacoma, Washington” | “Comparable Ontario sale.”                 |

“True monthly cost” should be reconsidered because it includes estimated insurance, maintenance, utilities and sometimes tax. “Modeled monthly cost” is more accurate until all material costs are supplied.

## AI language

Sonnet no longer writes the verdict. Haiku is limited to structured description-risk extraction behind deterministic rules and confidence gates. User-facing copy should describe this narrowly where relevant:

> Listing language is checked with rules and a structured language model. Financial values and the written verdict come from versioned calculations and templates.

Do not imply that “AI” guarantees accuracy. Internal names such as `AIVerdictBlock` and `anthropicService` should eventually be renamed because they obscure the actual boundary, though this is a code-refactor recommendation rather than a launch claim by itself.

## Legal and financial framing

The legal page says data and verdicts are not guaranteed and the product is not a substitute for professional advice. That is appropriate, but a disclaimer does not cure a concrete false UI statement. The report itself must still expose known, estimated, inferred, sample and missing states.

Because reports may influence a major purchase or lease:

- cite the calculation method and assumption version;
- show downside scenarios before upside assumptions;
- avoid language that sounds like a property inspection, appraisal, legal opinion or mortgage qualification;
- distinguish active asking rents from executed leases;
- distinguish nearby schools from attendance eligibility;
- make user-dismissed risks visible in the audit trail.

## Content acceptance checklist

Before any release, reviewers should be able to answer yes to all of these:

- Can every number be traced to a displayed fact, user input, source snapshot or named assumption?
- Does every unknown remain unknown?
- Are samples and demos impossible to mistake for subject-property evidence?
- Does every button either work or clearly state it is unavailable?
- Does every success confirmation follow an acknowledged backend operation?
- Can missing evidence only weaken, never strengthen, a conclusion?
- Are time, accuracy and coverage claims supported by measured production evidence?

## Review trail

- [Independent review](../audit-review/PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Retained additions:** move “every number has a source, date and method” to the lead meta-claim; add the 10-versus-3 free allowance; treat synthetic progress as asserted work; review “STR legality · live”; quantify the modelled share of “true monthly cost”; test fixture isolation on live routes.
- **Privacy addition:** compare legal-page claims with actual retention, logging, analytics and share-link behavior.
