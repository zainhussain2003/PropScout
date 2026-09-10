# Scoring, calculations and narrative audit

## Executive assessment

The calculation engine is strongest where it performs explicit mortgage and income-property math. It is weaker where multiple correlated outputs become a single 0–100 score, where missing inputs become assumptions, and where frontend report modes invent their own scores outside the backend evidence contract.

## Investor calculation

The investor method currently awards:

| Component           | Maximum |
| ------------------- | ------: |
| Cap rate            |      25 |
| Monthly cash flow   |      25 |
| Cash-on-cash return |      20 |
| DSCR                |      15 |
| Demand              |      10 |

The raw maximum is 95 and is normalized to 100 for display. Independent recomputation confirmed Canadian semi-annual compounding, payment, principal reduction and hold-return rows. Principal is not double-counted.

### Strengths

- Appreciation does not feed the income score.
- Severe listing risks gate the ceiling rather than allowing strong economics to wash them out.
- The result exposes component values and maximums.
- Sanity checks and rent plausibility gates stop some impossible inputs.

### Weaknesses

| ID   | Severity | Finding                                                                                                                   | Proposed response                                                                                                                                                |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | P1       | Cap rate, cash flow, cash-on-cash and DSCR reward overlapping economics, heavily weighting one financing scenario.        | Retain cap rate for asset quality and DSCR for financing resilience; treat cash flow as an output; remove or reduce CoC in the headline score after calibration. |
| S-02 | P1       | Default DOM and rent-trend inputs can contribute to demand as though observed.                                            | Score only observed dated demand evidence; otherwise mark demand incomplete.                                                                                     |
| S-03 | P2       | Display score floors zero at 5 because “a property is always worth something.”                                            | Let the evidence score express zero; property utility/value is a separate concept.                                                                               |
| S-04 | P1       | Severe gate constants are documented as unsourced placeholders.                                                           | Calibrate with expert policy and retrospective cases; version the thresholds.                                                                                    |
| S-05 | P1       | Live slider changes update displayed economics while the saved backend score remains fixed.                               | Recompute the score from the same scenario or visibly label the score as “original assumptions” and show scenario outcome separately.                            |
| S-06 | P1       | One score is generated for tenant, personal and landlord analysis payloads even when those modes ask different questions. | Give each mode a mode-specific evidence model and avoid computing irrelevant investment conclusions.                                                             |

## Buy-and-hold investors

The current score is curated mainly for leveraged rental investors who require sustainable operating economics. That is a defensible default, but it is not a complete model for users who accept near-term negative cash flow to build equity or pursue appreciation.

The remedy is not to make the income score more generous. Add an explicit strategy lens:

- **Income:** cap rate, DSCR and cash-flow resilience.
- **Balanced hold:** income plus principal paydown and a labelled appreciation sensitivity table.
- **Appreciation thesis:** requires the user to state a thesis and still shows carrying-cost risk prominently.

A property at `-$1,000/month` may fit a well-capitalized appreciation strategy, but the report should quantify required liquidity, cumulative shortfall, break-even appreciation after selling costs/tax assumptions, refinancing exposure and downside cases. It should never turn assumed appreciation into points in the income score.

See [INVESTOR_METHOD_RESEARCH.md](./INVESTOR_METHOD_RESEARCH.md) for the full method and reviewer feedback.

## Tenant score

The tenant score combines rent position, listing honesty, cost transparency, negotiation leverage and building demand. This makes intuitive sense, but current evidence completeness can inflate it:

- No detected flag receives a high honesty component even when the description is absent or incomplete.
- Estimated utilities influence affordability without actual inclusion or bill evidence.
- Aggregate comparables can look precise without showing match quality.

Recommendation: show a verdict plus evidence completeness. Score only sections with enough evidence, report the denominator used, and never award “honesty” points merely because extraction found nothing.

## Personal-buyer home score

The live page correctly suppresses the overall home score when local comparable sales are unavailable. This is the right behavior. The frontend still contains a detailed score method for demo data: pricing, schools, light, mobility, lot value-add and risk.

Before enabling the live score:

- Ontario sales evidence must support pricing/FMV.
- Attendance boundaries must support school/catchment claims.
- Lot/value-add inputs need property-specific zoning/lot evidence.
- Light inputs need confirmed direction/floor or an explicit low-confidence state.
- Preferences must be separated from objective evidence. A transit-rich condo is not universally a better “home.”

The product may be better served by a decision profile and trade-off panel than a universal home score.

## Landlord score

Landlord mode currently inherits the investor score. A landlord pricing an owned unit needs rent evidence, operating margin, demand and readiness. Mortgage leverage is owner-specific and may be irrelevant. See [LANDLORD_REPORT_AUDIT.md](./LANDLORD_REPORT_AUDIT.md).

## Assumption engine

Current useful assumptions include mortgage rate fallback, vacancy, management, insurance, maintenance, property-tax estimate, rent proxy and appreciation scenarios. They should be classified:

| Class          | Behavior                                                                |
| -------------- | ----------------------------------------------------------------------- |
| Observed       | Locked to source snapshot until user chooses refresh.                   |
| User input     | Editable and attributed to the user.                                    |
| Market default | Dated, sourced, editable, never described as observed for the property. |
| Stress case    | Labelled scenario, not “expected” or baseline.                          |
| Placeholder    | Excluded from decision score and clearly marked unavailable.            |

Every report should include an assumption ledger. Changes should recompute all dependent values together.

## Risk extraction

The pipeline uses deterministic regex rules as a recall floor and Haiku only for structured flag extraction. A logic gate applies confidence and per-mode severity. This is a sound separation because language-model output does not invent financial values.

Gaps:

- Extraction is not cached by description hash/version.
- A provider/API failure can collapse to no flags, which is hard to distinguish from a clean result.
- The golden corpus has grown substantially, but it remains a development corpus rather than an independent accuracy claim.
- Description text alone cannot verify physical condition or legal status.
- Share-link holders can alter stored dismissals.

Required response schema: `status`, `rulesVersion`, `modelVersion`, `descriptionHash`, `flags`, `failedChecks`, and `completedAt`.

## Deterministic narrative

Narrative is assembled in the backend from validated structured inputs. Sonnet no longer writes report prose. This satisfies repeatability for a fixed input snapshot and code version.

Remaining risks:

- The service and component names still say `anthropicService` and `AIVerdictBlock`, obscuring the architecture.
- Narrative input always uses `tier: 'free'`, but the deterministic generator never reads that field. Free/Pro differentiation currently happens through frontend truncation, so the tier-length mechanism described in `CLAUDE.md` is stale rather than a runtime generation defect.
- Reanalysis against new comps/rates can change prose without the UI explaining the changed data snapshot.
- String templates can still overstate low-confidence inputs if confidence is not a first-class decision constraint.

Rename internals during a later authorized refactor, version templates, and snapshot-test truth conditions rather than exact marketing tone alone.

## Validation program

1. Create a versioned suite of representative real properties across city, type, price and strategy.
2. Recompute all finance from raw inputs independently.
3. Ask domain reviewers to judge direction and evidence sufficiency, not preferred score aesthetics.
4. Run monotonicity tests: worse expense/rate/rent/risk inputs cannot improve a conclusion.
5. Run missingness tests: removing evidence cannot strengthen a verdict.
6. Publish a method card with version and as-of date inside each report.

## Review trail

- [Independent review](../audit-review/SCORING_CALCULATIONS_AND_NARRATIVE.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Accepted P1:** reconcile frontend expense rows with saved NOI and every dependent metric before calibration.
- **Clarification:** correlated investment measures are not identical; retain separate asset and leverage information while reducing duplicate reward.
- **Tier resolution:** backend narrative `tier: 'free'` is inert because the deterministic generator never reads it. Current differentiation is frontend truncation. The stale tier-length mechanism in `CLAUDE.md` needs a documentation decision.
