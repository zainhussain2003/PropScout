# Review — `INVESTOR_REPORT_AUDIT.md`

**Verdict: accurate and unusually well evidenced — I reproduced its financial
figures independently. But its own §01 table contains an unnoticed arithmetic
inconsistency, and it is one of two documents using a "Buttermill" reference
property that differs from the one in the release gate.**

## Verified by independent recomputation

For the stated case — $589,000 asking, 20% down ($117,800), 4.45%, 25 years,
$2,250/mo modelled rent, $3,011 listed tax, $629 condo fee:

| Figure            |     Audit | My recomputation | Match |
| ----------------- | --------: | ---------------: | :---: |
| Mortgage payment  | $2,594.88 |         $2,594.9 |   ✓   |
| NOI               | $7,139.50 |        $7,139.50 |   ✓   |
| Cap rate          |     1.21% |           1.212% |   ✓   |
| DSCR              |     0.23× |           0.229× |   ✓   |
| Monthly cash flow |   −$2,000 |       −$1,999.92 |   ✓   |
| Break-even rent   |    $4,355 |        $4,355.18 |   ✓   |

Method: Canadian semi-annual compounding, effective monthly rate
`(1 + 0.0445/2)^(1/6) − 1`. Every figure reconciles. The financial engine behind
this report is sound and the audit's confidence in it is justified.

Also verified:

- **Ontario LTT $8,255 with no Toronto municipal component for Vaughan** —
  correct behaviour, and a real bug fixed earlier this project.
- **Five components totalling 95 displayed out of 100** — `_COMPONENT_MAX = 95`,
  `to_display_score` scales by `100/95`. The finding is exact.
- **No deduction when the wording scan finds nothing** — correct, and the audit
  is right that silence is not clearance.

## R-01 — §01's expense total contradicts its own NOI (new finding)

The §01 row states **annual operating expenses $22,020.50** and **NOI
$7,139.50** on $27,000 gross rent. Those cannot both hold: $27,000 − $22,020.50
= $4,979.50.

The expenses actually behind the stated NOI are:

| Component                        |         Amount |
| -------------------------------- | -------------: |
| Property tax (listed)            |      $3,011.00 |
| Condo fee                        |      $7,548.00 |
| Insurance (0.35%)                |      $2,061.50 |
| Maintenance (1.0%, unknown year) |      $5,890.00 |
| Vacancy (5%)                     |      $1,350.00 |
| **Total**                        | **$19,860.50** |

$27,000 − $19,860.50 = $7,139.50 ✓. The $2,160 gap is **exactly 8% of $27,000** —
the management fee. And every other figure in the row also reconciles with
management **off**, including break-even rent ($4,137.42 ÷ 0.95 = $4,355).

**Mechanism:** `apps/web/src/lib/investorCalc.ts:310` recomputes the expense
breakdown in the browser with `management = includeManagementFee ?
annualGrossRent * 0.08 : 0`, independently of the saved backend metrics. So the
displayed expense total can include a fee that no displayed metric reflects.

This matters here more than anywhere else in the audit, because §01 is the row a
sceptical investor will check by hand — and it does not add up. The document's
own recommendation ("Show a source/assumption badge on every row") is
insufficient: the rows need to _sum to the NOI beside them_. **P1, and a
prerequisite for the score calibration work in items 1 and 3 of the work queue.**

## R-04 — two different Buttermill reference properties

This document (and `PERSONAL_REPORT_AUDIT.md`) uses **2501–5 Buttermill Avenue,
$589,000, ≈ −$2,000/mo, score 8**.

`AGENT_HANDOFF.md` and the release gate in
`TESTING_DEPLOYMENT_AND_OPERATIONS.md` (item 9) use **5702–5 Buttermill Avenue,
$729,900, −$2,723.68/mo, score 8**.

Both are real, both score 8, and neither document acknowledges the other. An
agent running the release gate against the wrong unit sees a ~$700/month
discrepancy and concludes there is a regression that flatters bad deals — the
precise failure the gate exists to catch. Label each by unit number wherever
cited, and state which one the gate means.

## Findings I would re-rate

**§10 STR versus LTR — the "live" label.** The document rates this **Blocked**
and notes that `"STR legality · live"` is "stronger than a static code snapshot
with no official citation or effective date." That understates it: the word
_live_ asserts a real-time regulatory feed that does not exist, about **municipal
law**, in a report a user may act on. A wrong or stale STR-legality claim is a
legal-exposure item, not a provenance nicety. I would rate the label itself a
**P1 content-integrity defect** and remove the word immediately — a one-word
change, independent of the rest of the STR work.

**§02 Financing — slider steps.** The observation that presets are 4.79%/6.79%
while the slider advances in 0.25 steps is a good catch and correctly rated
Partial. Worth adding the consequence: a user who nudges the slider cannot return
to the preset, so the "original assumptions" case becomes unreachable — which
interacts badly with S-05's stale-score problem.

## Gaps

1. **The score is described as "Only rental-demand points contribute"** but the
   demand component's inputs are defaults (21-day DOM, flat trend — see the
   Hamilton doc's baseline table). So the _only_ points this property earns come
   from unobserved defaults. That is a sharper statement of S-02 than the scoring
   document makes, and it belongs in the hero row.
2. **No check that the saved analysis and the live UI agree.** The document notes
   the saved case uses 4.45% while presets are 4.79%/6.79%, but does not ask
   whether the displayed metrics correspond to the saved 4.45% or to whatever the
   sliders currently show. Given `enrichMetrics`, this is the S-05 question
   applied to a concrete report, and it is answerable.
3. **§07 Equity build** is well criticised (omits selling costs, tax, renewals,
   capex, cumulative negative cash flow) but the document does not state the
   magnitude. The investor research quantifies it: at −$2,724/mo the 10-year 3%
   case is +$17,662 pre-tax, essentially break-even. Citing that number here
   would show the equity chart is not merely incomplete but directionally
   misleading.
4. **"Already corrected during this audit" is unverified by me.** Eleven items
   are claimed fixed. I spot-checked three (Toronto LTT bracket handling,
   unknown-year/parking preservation, Tacoma labelling) and they hold, but the
   list should carry commit references so a reviewer can confirm rather than
   trust.

## Bottom line

The best-evidenced report audit — its finance reproduces to the cent. Three
changes: add R-01 and require §01's rows to sum to NOI before any scoring work;
disambiguate the two Buttermill properties against the release gate; and treat
`"STR legality · live"` as an immediate one-word content fix rather than a
blocked capability.
