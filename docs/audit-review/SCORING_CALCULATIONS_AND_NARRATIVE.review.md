# Review — `SCORING_CALCULATIONS_AND_NARRATIVE.md`

**Verdict: accurate on every checkable claim, and it contains the audit's best
structural insight (S-01, correlated components). But it praises the calculation
layer as "strongest" while missing an arithmetic inconsistency in that exact
layer — see R-01 below.**

## Verified

| Claim                                                      | Result                                                                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weights 25/25/20/15/10; raw max 95 normalized to 100       | **Exact.** `deal_score.py` `_CAP_MAX=25`, `_CF_MAX=25`, `_COC_MAX=20`, `_DSCR_MAX=15`, `_DEMAND_MAX=10`, `_COMPONENT_MAX=95`, `to_display_score` multiplies by `100/95`.                            |
| Display floor of 5 (S-03)                                  | **Exact.** `_DISPLAY_FLOOR = 5`, applied in `to_display_score`.                                                                                                                                     |
| Severe risks gate the ceiling rather than deducting        | **Exact.** `severe_ceiling()`, `_SEVERE_GATE_BASE=40`, `_STEP=10`, `_FLOOR=10`.                                                                                                                     |
| Severe-gate constants are unsourced placeholders (S-04)    | **Exact, and the code says so:** "All values are unsourced placeholders (see NIGHT_NOTES)."                                                                                                         |
| Appreciation does not feed the income score                | **Confirmed.** No appreciation term in any component function.                                                                                                                                      |
| Verdict label taken from raw, not floored/normalized score | **Confirmed** — `to_display_score` docstring states it explicitly, so the floor cannot lift a property into a better band. Worth crediting; the document mentions the floor but not this safeguard. |
| Narrative assembled deterministically in the backend       | **Confirmed** by the audit's own account and the D-043/D-045 handoff entries.                                                                                                                       |
| Narrative input always `tier: 'free'`                      | **Exact.** `apps/api/src/routes/analysis.ts:521`.                                                                                                                                                   |
| Independent reproduction of mortgage math                  | **Reproduced.** Payment $2,594.88 on $471,200 at 4.45%/25y semi-annual; cap 1.21%; DSCR 0.23×; cash flow −$2,000. All match.                                                                        |

## R-01 — the expense breakdown does not reconcile with NOI (new finding)

The document calls the calculation engine "strongest where it performs explicit
mortgage and income-property math". That is true of the mortgage math. It is not
true of the expense presentation, and the discrepancy is visible in the audit's
own reference figures (`INVESTOR_REPORT_AUDIT.md`, §01):

- Annual operating expenses: **$22,020.50**
- NOI: **$7,139.50**
- Gross rent: $2,250/mo = **$27,000/yr**

$27,000 − $22,020.50 = $4,979.50 ≠ $7,139.50.

Reconciling from source, the expenses actually behind that NOI are:

| Component                              |         Amount |
| -------------------------------------- | -------------: |
| Property tax (listed)                  |      $3,011.00 |
| Condo fee ($629 × 12)                  |      $7,548.00 |
| Insurance (0.35% of $589,000)          |      $2,061.50 |
| Maintenance (1.0%, unknown build year) |      $5,890.00 |
| Vacancy (5% of gross)                  |      $1,350.00 |
| **Total**                              | **$19,860.50** |

$27,000 − $19,860.50 = **$7,139.50** — the stated NOI exactly. The $2,160
difference from the displayed total is **precisely 8% of $27,000**: the
management fee. Every other metric also reconciles with management _off_ —
including break-even rent $4,355 = $4,137.42 ÷ 0.95 (vacancy only).

**Mechanism.** `apps/web/src/lib/investorCalc.ts:310` recomputes the expense
table in the browser:

```ts
const management = includeManagementFee ? annualGrossRent * 0.08 : 0
const total = annualTaxes + insurance + maintenance + vacancy + condo + management
```

independently of the saved backend metrics. So the **displayed expense total can
include a fee that none of the displayed metrics reflect**, and a reader adding
up the rows cannot arrive at the NOI printed beside them.

This is a concrete arithmetic instance of the document's own **S-05**. S-05 is
framed as a _score_ problem ("displayed economics update while the saved backend
score remains fixed"); the same frontend/backend split also desynchronises the
**expense breakdown from NOI**, which is arguably worse because it is
self-contradictory on a single screen rather than merely stale.

**Severity: P1.** It does not change the verdict, but it makes the headline
underwriting numbers non-reproducible from the page presenting them — the exact
property this product sells. Fix before any scoring calibration, because every
calibration run depends on those numbers agreeing.

**Related footgun.** `calculate_break_even_rent(..., include_management: bool =
False)` defaults to excluding management, while `calculate_noi` takes the flag
explicitly. The router passes `fin.include_management_fee` to all three call
sites (`routers/analysis.py:248, 261, 288`), so the engine is coherent today —
but the asymmetric default makes reintroducing the divergence a one-line
mistake.

## S-01 is the right diagnosis, with an important caveat

The finding — that cap rate, cash flow, cash-on-cash and DSCR reward overlapping
economics — is correct, and the Hamilton calibration proves it empirically (four
properties at exactly 92/97). The proposed response is also right in outline:
keep cap rate for asset quality, DSCR for financing resilience, demote CoC.

**The caveat the document should state:** these four are collinear _because
financing is a single user-chosen scenario_, not because they measure the same
thing. Cap rate is unlevered; cash flow, CoC and DSCR are levered. Two properties
at identical cap rates and different leverage have very different DSCR. If a
future implementer reads "highly correlated metrics" as "redundant metrics" and
collapses them, the score loses the leverage dimension — which is exactly what
the proposed hold-case engine needs. The fix is **decorrelation**, not fewer
points.

## Agreements worth recording

- **S-02 (default DOM and rent-trend scoring as if observed)** is a real
  fabrication-class defect, not a refinement. The Hamilton calibration lists
  "Rental days on market: 21 days — current service default" and "Rent trend:
  Flat — current service default", both feeding a 10-point demand component. A
  default contributing points is indistinguishable in the output from an
  observation contributing points. P1 is right.
- **S-03 (display floor of 5)** — agree, and the reason given ("a property is
  always worth something") conflates _asset value_ with _deal quality_. A score
  of 0 on a 0–100 deal scale is a legitimate answer.
- **S-06 (one score computed for all four modes)** is the root cause of the
  landlord problem in `LANDLORD_REPORT_AUDIT.md`. Good that it is identified here
  as a scoring issue rather than only a routing issue.

## Gaps

1. **No monotonicity evidence.** The validation programme proposes monotonicity
   and missingness tests (items 4–5), which is exactly right — but the document
   does not report running even a spot check. Given step-threshold components, a
   monotonicity violation is plausible at bracket boundaries and would be cheap
   to probe.
2. **Tenant honesty component is criticised but not quantified.** "No detected
   flag receives a high honesty component" — how many points, out of what? The
   personal-report audit gives the equivalent figure (10/10 for a silent scan).
   Without the number the reader cannot judge severity.
3. **The `tier: 'free'` finding is under-read.** The document treats it as
   naming/architecture debt. It is a **paid-promise defect**: `CLAUDE.md`
   specifies 150–320 words for Pro versus 60–120 for free, so a paying user's
   narrative is generated with free-tier parameters regardless of UI gating.
   That belongs in the paid-claim inventory.
4. **No position on whether the score should exist for personal buyers.** The
   document raises the question ("may be better served by a decision profile")
   and the roadmap defers it to the owner. Reasonable — but the personal audit
   already _paused_ the aggregate score in production, which is a de facto answer
   that the document does not acknowledge.

## Bottom line

The strongest analytical document after the investor research. Its central
insight (correlated components) is correct and empirically backed. Three
changes: add R-01 and fix the expense/NOI reconciliation before any calibration;
qualify S-01 so "correlated" is not implemented as "redundant"; and reclassify
the hardcoded `tier: 'free'` as a paid-promise defect rather than naming debt.
