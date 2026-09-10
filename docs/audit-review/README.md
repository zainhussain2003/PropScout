# Independent review of `docs/product-audit`

**Review date:** 2026-09-10
**Reviewer:** Claude Opus 5 (Claude Code session)
**Subject:** the 17 documents in [`docs/product-audit`](../product-audit/README.md)
**Method:** re-verification of checkable claims against the code, schema and CI
config on `feat/address-input-and-mobile`. No application code, configuration,
schema or data was changed. No files in `docs/product-audit` were modified.

---

## Headline verdict

**The audit makes sense. It is accurate, evidence-led, and the most useful
document set in the repository.**

Every claim I could check independently was true, and several were true in a
sharper way than the audit stated. I found **no fabricated findings** and **no
claim that collapsed on inspection**. That is unusual for a self-audit of this
size and it is the single most important thing to say about it.

The audit is also correctly _disciplined about its own authority_: it repeatedly
states that it proposes rather than decides, and that nothing is settled until
the owner approves it and it is recorded in `docs/DECISIONS.md`. That framing
should be preserved.

**What that does not mean.** The audit is a static repository review. It does
not establish that the deployed product behaves this way, and it says so. Its
severities are defensible but not uniformly calibrated. And it missed at least
one arithmetic inconsistency sitting inside its own reference figures — see
[cross-cutting finding R-01](#r-01--the-expense-breakdown-does-not-reconcile-with-noi-new).

## Verification summary

Claims I re-derived from source, independently:

| Audit claim                                               | Verified                          | Evidence                                                                           |
| --------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| Score weights 25/25/20/15/10, raw max 95, ×100/95 display | **Exact**                         | `deal_score.py` `_CAP_MAX`…`_DEMAND_MAX`, `_COMPONENT_MAX = 95`                    |
| Saturation at cap 6% / cash flow $500                     | **Exact**                         | `_score_cap_rate`, `_score_cash_flow` step thresholds                              |
| "92 raw / 97 displayed"                                   | **Exact**                         | 92 × 100/95 = 96.8 → 97                                                            |
| Display floor of 5                                        | **Exact**                         | `_DISPLAY_FLOOR = 5`                                                               |
| Share-token holders can mutate overrides                  | **Exact, and self-documented**    | `overrides.ts` header: "Anyone with the share token can manage overrides"          |
| `updateAnalysisStatus` is a no-op                         | **Exact**                         | `supabaseService.ts:929` — empty body, comment says intentional                    |
| Status inferred only from `calculated_metrics`            | **Exact**                         | `getAnalysisStatus` returns `pending`/`complete` only                              |
| 23505 treated as success without a unique constraint      | **Exact**                         | code at `:784`; schema has only `flag_overrides_analysis_id_idx` (non-unique)      |
| Manual entry defaults type→condo, beds/baths/parking→0    | **Exact**                         | `address.ts:270–275`                                                               |
| DB read defaults type→detached                            | **Exact**                         | `supabaseService.ts:133`                                                           |
| `/account` shows a fictional user and paid invoices       | **Exact, and live-routed**        | `AccountPage.tsx:69` (Marcus Reilly), `:232` (3 "Paid" invoices), `App.tsx:49`     |
| Password reset confirms without sending                   | **Exact**                         | page imports no auth service; `resetPasswordForEmail` exists and is uncalled       |
| Live landlord renders investor content                    | **Exact**                         | `ReportPage.tsx:1143–1144`                                                         |
| Zillow.ca advertised but unsupported                      | **Exact**                         | `LandingPage.tsx:1128`, `validateUrl.ts:21`                                        |
| "Switch later from inside the report" with no switcher    | **Exact**                         | `ModeModal.tsx:707`; no switch exists                                              |
| ModeModal runs synthetic progress                         | **Exact**                         | `setProgress`, then `setTimeout(() => onSelect(k), 250)`                           |
| Both "Upgrade now" buttons lack handlers                  | **Exact**                         | `UpgradeModal.tsx:281`, `HardLimitGate.tsx:193` — no `onClick`                     |
| Narrative input hardcodes `tier: 'free'`                  | **Exact**                         | `analysis.ts:521`                                                                  |
| CI does not run on feature-branch pushes                  | **Exact**                         | `ci.yml` triggers `[master, main]` only                                            |
| "Every number has a source, a date, and a method"         | **False claim, correctly caught** | `LandingPage.tsx:2191` vs `cmhcVacancy.ts` "indicative placeholders"               |
| Investor finance reproduces to the dollar                 | **Exact**                         | payment $2,594.88, cap 1.21%, DSCR 0.23×, cash flow −$2,000 all re-derived         |
| Hold-case IRR tables reproduce                            | **Exact, all 12 rows**            | recomputed with semi-annual compounding; payment $3,326.64, yr-1 principal $12,494 |
| Hamilton regression fixture is 146 East 19th St, $449,000 | **Exact**                         | `test_regression.py:13,68`                                                         |

## Cross-cutting findings the audit did not make

### R-01 — The expense breakdown does not reconcile with NOI (new)

This is the most substantive gap, and it sits **inside the audit's own reference
figures** in `INVESTOR_REPORT_AUDIT.md`.

That document reports, for the same analysis: annual operating expenses
**$22,020.50** and NOI **$7,139.50** on $27,000 gross rent. Those two numbers
cannot both be right — $27,000 − $22,020.50 = $4,979.50, not $7,139.50.

Reconciling from source:

- Expenses **excluding** management = $3,011 tax + $7,548 condo fee + $2,061.50
  insurance (0.35%) + $5,890 maintenance (1.0%, unknown year) + $1,350 vacancy
  (5%) = **$19,860.50**, and $27,000 − $19,860.50 = **$7,139.50** — the stated NOI.
- The $2,160 difference is **exactly** 8% of $27,000: the management fee.
- Every other stated metric also reconciles with management **off**: cap rate
  1.21%, DSCR 0.23×, cash flow −$2,000, and break-even rent **$4,355**
  (= $4,137.42 ÷ 0.95, i.e. vacancy only).

**Mechanism.** `apps/web/src/lib/investorCalc.ts:310` recomputes the expense
table in the browser with `management = includeManagementFee ? annualGrossRent *
0.08 : 0`, independently of the saved backend metrics. So the _displayed expense
total_ can include a management fee that **none of the displayed metrics
reflect**. A reader summing the expense rows cannot arrive at the NOI on the
same screen.

This is a concrete, arithmetic instance of the audit's own **S-05** ("live slider
changes update displayed economics while the saved backend score remains
fixed"). The audit reported S-05 qualitatively as a _score_ problem; it did not
notice that the same split desynchronises the **expense breakdown from NOI**,
and its own figures carry the discrepancy unflagged.

**Severity: P1.** It is not a wrong verdict, but it makes the headline
underwriting numbers non-reproducible from the page that presents them — which
is precisely the property the product sells.

**Related footgun.** `calculate_break_even_rent(..., include_management: bool =
False)` defaults to excluding management while `calculate_noi` is called with an
explicit flag. The router currently passes `fin.include_management_fee` to all
three call sites consistently (`routers/analysis.py:248,261,288`), so the engine
itself is coherent today — but the asymmetric default is an easy way to
reintroduce the divergence.

### R-02 — Free-tier allowance diverges three ways, and nothing enforces any of them (new)

The audit notes landing copy saying three sale reports against a dev gate
mounted at 10 of 10. The fuller picture:

| Source                               | Value                            |
| ------------------------------------ | -------------------------------- |
| `apps/web/src/constants/tiers.ts:18` | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `apps/api/src/constants/tiers.ts:2`  | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `CLAUDE.md` pricing table            | 10 analyses/month                |
| `LandingPage.tsx:2444`               | "3 sale-listing reports / month" |

The advertised number contradicts the constant in **both** workspaces and the
spec, the units differ (sale reports vs analyses), and no server-side metering
enforces either. This is a pricing claim, so it belongs in
`PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.md` alongside the other paid-promise
findings, not only as a quota-plumbing note.

### R-03 — The unknown property type flips on a round trip (sharpened)

> [!CAUTION]
> **Withdrawn after end-to-end write/read verification.** An address-entered unknown is coerced to `condo` before persistence and reads back as `condo`; it does not flip on the same record. The replacement finding is path-dependent coercion: address entry chooses `condo`, while URL scraping chooses `detached`, producing different cost and flag behavior for the same unknown. See [the reconciliation](./COUNTER_REVIEW_RECONCILIATION.md#resolution-of-headline-findings).

The audit lists both defaults separately (API-01: manual entry → condo; API-03:
DB read → detached). It does not connect them: an address-entered listing with
no stated type is **written as `condo` and read back as `detached`**. Maintenance
reserve, condo-fee expectations and report language all key off that field, so
the same unknown produces two different property models depending on path. Stated
as a round-trip contradiction it is more obviously a P1 than either default is
alone.

### R-04 — Two different "Buttermill" reference properties are in circulation (new)

- `AGENT_HANDOFF.md` and `TESTING_DEPLOYMENT_AND_OPERATIONS.md` release gate #9:
  the known-good Vaughan condo is **$729,900**, cash flow **−$2,723.68/mo**,
  score 8.
- `INVESTOR_REPORT_AUDIT.md` and `PERSONAL_REPORT_AUDIT.md`: the reference is
  **2501–5 Buttermill Avenue at $589,000**, cash flow **≈ −$2,000/mo**, also
  score 8.

Both are legitimate, both score 8, and neither document says the other exists.
A future agent running the release gate against the wrong one will see a
$700/month discrepancy and conclude there is a regression. Give each a distinct
label and unit number wherever it is cited.

### R-05 — `TenantReportContent` is a reachable fallback, not dead code (correction)

> [!CAUTION]
> **Withdrawn after checking the enclosing render condition.** The fallback block itself requires `analysis && listing`; whenever that tenant state exists, the earlier return has already rendered the full `TenantReport`. `TenantReportContent` is unreachable duplicate code, as the original audit stated. See [the reconciliation](./COUNTER_REVIEW_RECONCILIATION.md#resolution-of-headline-findings).

`END_TO_END_USER_JOURNEY.md` and `MASTER_ROADMAP.md` describe it as obsolete
because "the live tenant path returns earlier". The early return at
`ReportPage.tsx:1105` is guarded by `analysis && listing && mode === 'tenant'`.
When `listing` is null the guard fails and `TenantReportContent` at `:1153`
**does** render — a second, older tenant implementation shown exactly when data
is most incomplete. That is worse than dead code and should be characterised as
an inconsistent degraded path, not merely deleted as unused.

### R-06 — The landlord fixture leak is latent, not active (calibration)

`LANDLORD_REPORT_AUDIT.md` L-02 says the specialized page "computes positioning
from `LL_RENT_COMPS`... even when passed a real analysis." The code supports
this: `LandlordPage.tsx:385,457` use fixtures unconditionally and the component
does accept `analysis`/`listing` props with an `isReal` flag.

But `LandlordPage` is mounted **only** at `/landlord-report` with no props
(`App.tsx:47`), and live landlord traffic goes to `InvestorReportContent`. So
live data cannot currently reach the fixtures. Present exposure is **nil**; the
risk is that wiring the canonical landlord route (the audit's own L-01 fix) would
activate the leak. Sequencing L-02 _before_ L-01 matters, and the audit's phrasing
implies a live defect that does not exist yet.

### R-07 — CI exposure is conditional (nuance)

`ci.yml` triggering only on `[master, main]` is confirmed. But PR #21 is open
against `master`, so pull-request runs **do** execute for this branch today —
all eight checks passed on the last push I observed. The real risk is narrower
than "the branch can be synchronized without any hosted verification": it
applies to branches with no open PR, and to the window between a push and the PR
run. Worth stating precisely so the fix is scoped correctly.

### R-08 — Document metrics are overstated

> [!CAUTION]
> **Withdrawn as an error claim.** The audit contains 1,553 nonblank lines and 2,128 physical lines. The figures used different counting rules; future summaries must state the basis rather than treating either result as incorrect. See [the final confirmation](./FINAL_REVIEW_CONFIRMATION.md#withdrawn-or-superseded).

The completion message reports "1,553 lines". `wc -l` gives **2,128** across the
17 files (1,278 of which are the twelve newly written documents). Minor, but the
audit's credibility rests on checkable numbers.

## Severity calibration

I agree with the audit's severity on the great majority of findings. Where I
would differ:

| Finding                         | Audit                   | Mine                              | Reason                                                                                                                                                                                                |
| ------------------------------- | ----------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fabricated `/account` content   | P0                      | **P0 — agree, strongest finding** | Fictional _paid invoices_ on a live route are a false financial record, not a placeholder.                                                                                                            |
| Share-link override mutation    | P0                      | **P0 — defensible**               | Mitigating: requires the link the owner chose to share, and tokens are non-enumerable UUIDs. Aggravating: no audit trail and it converges the _stored_ score on re-run. Net: keep P0.                 |
| Override duplicate rows (23505) | P1                      | **P2**                            | Technically exact, but the UI consumes overrides as a `Set` and dropping a deduction twice is idempotent. Practical impact is row bloat plus a latent trap, not a wrong number. Fix is still correct. |
| Landlord fixture leak (L-02)    | P1                      | **P2 now, P1 on L-01 landing**    | Unreachable with live data today. See R-06.                                                                                                                                                           |
| Free-tier divergence            | (not raised as a claim) | **P1**                            | See R-02.                                                                                                                                                                                             |
| Expense/NOI reconciliation      | (not found)             | **P1**                            | See R-01.                                                                                                                                                                                             |

## Where the audit is weakest

1. **It does not verify its own arithmetic end to end.** R-01 was discoverable
   from two numbers printed in the same table. A reconciliation pass — does
   gross − expenses equal the stated NOI? — should be part of any future audit.
2. **"Confirmed" is doing heavy lifting.** The audit's evidence key distinguishes
   confirmed/inferred/unknown, but individual findings rarely carry the label, so
   a reader cannot tell which claims were runtime-verified. Several — the landlord
   fixture leak, PDF error handling, "some upgrade buttons" — are static
   inferences presented in the same voice as verified facts.
3. **Some findings are recommendations wearing a finding's clothes.** Much of
   `SHARED_UI_AND_COMPONENTS.md` and the phase 2–6 roadmap is design proposal, not
   defect. That is legitimate and the audit says so up front, but the mixture
   makes the P-scale less meaningful in those documents.
4. **No effort or dependency estimates.** The roadmap is well sequenced but a
   seven-phase plan with no sizing cannot be scheduled against the owner's
   remaining budget.

## What I would do first

The audit's own "suggested first implementation slice" is the right one, with two
changes. Ordered by harm removed per unit of work:

1. **Hide `/account` behind an honest empty state.** One route, no dependencies,
   removes fabricated financial records from a live URL. Do this first.
2. **Delete or wire the password-reset form.** A false security confirmation, and
   `resetPasswordForEmail` already exists.
3. **Remove the dead "Upgrade now" handlers** — either wire checkout or remove the
   buttons. Dead buttons on the payment path.
4. **Make override mutation owner-only.** The only P0 with real design work in it.
5. **Persist analysis status and add a polling deadline.** Fixes the infinite-poll
   failure mode.
6. **Preserve unknown property facts** — and fix the condo/detached round trip
   (R-03) as one change, not two.
7. **Reconcile the expense table with NOI** (R-01) before any investor-score work,
   because every calibration exercise depends on those numbers agreeing.

I would defer the report registry, evidence envelope and scoring redesign until
after the above. They are correct and they are large.

## Per-document reviews

| Review                                                                                               | Subject                       |
| ---------------------------------------------------------------------------------------------------- | ----------------------------- |
| [END_TO_END_USER_JOURNEY.review.md](./END_TO_END_USER_JOURNEY.review.md)                             | Journey audit                 |
| [TENANT_REPORT_AUDIT.review.md](./TENANT_REPORT_AUDIT.review.md)                                     | Tenant report                 |
| [PERSONAL_REPORT_AUDIT.review.md](./PERSONAL_REPORT_AUDIT.review.md)                                 | Personal buyer report         |
| [INVESTOR_REPORT_AUDIT.review.md](./INVESTOR_REPORT_AUDIT.review.md)                                 | Investor report               |
| [INVESTOR_METHOD_RESEARCH.review.md](./INVESTOR_METHOD_RESEARCH.review.md)                           | Investor methodology research |
| [HAMILTON_CURRENT_LISTING_CALIBRATION.review.md](./HAMILTON_CURRENT_LISTING_CALIBRATION.review.md)   | Hamilton calibration          |
| [LANDLORD_REPORT_AUDIT.review.md](./LANDLORD_REPORT_AUDIT.review.md)                                 | Landlord report               |
| [SHARED_UI_AND_COMPONENTS.review.md](./SHARED_UI_AND_COMPONENTS.review.md)                           | Shared UI                     |
| [DATA_PROVENANCE_AND_EVIDENCE.review.md](./DATA_PROVENANCE_AND_EVIDENCE.review.md)                   | Data provenance               |
| [SCORING_CALCULATIONS_AND_NARRATIVE.review.md](./SCORING_CALCULATIONS_AND_NARRATIVE.review.md)       | Scoring and narrative         |
| [ACCOUNT_AUTH_BILLING_AND_PAYWALL.review.md](./ACCOUNT_AUTH_BILLING_AND_PAYWALL.review.md)           | Account, auth, billing        |
| [API_DATABASE_SECURITY_AND_RELIABILITY.review.md](./API_DATABASE_SECURITY_AND_RELIABILITY.review.md) | API and security              |
| [TESTING_DEPLOYMENT_AND_OPERATIONS.review.md](./TESTING_DEPLOYMENT_AND_OPERATIONS.review.md)         | Testing and operations        |
| [PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.review.md](./PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.review.md)   | Product claims                |
| [SOURCE_MAP.review.md](./SOURCE_MAP.review.md)                                                       | Source map                    |
| [MASTER_ROADMAP.review.md](./MASTER_ROADMAP.review.md)                                               | Remediation roadmap           |
| [AUDIT_README.review.md](./AUDIT_README.review.md)                                                   | The audit's own index         |

## Boundary of this review

- No application code, constants, schema, configuration or data was changed.
- No file in `docs/product-audit` was modified.
- No production write, migration, deployment or billing action was performed.
- External sources cited by the audit (CMHC, OSFI, RICS, CRA, FCAC, MSCI, Bank of
  Canada, Statistics Canada) were **not** fetched or verified in this review.
- Runtime behaviour of deployed services was not tested; all verification is
  static plus local arithmetic re-derivation.

## Counter-review disposition

The subsequent counter-review and the reviewer's verification response are
preserved in [COUNTER_REVIEW_RECONCILIATION.md](./COUNTER_REVIEW_RECONCILIATION.md).
That record withdraws R-03's claimed round-trip flip, R-05's claimed reachable
tenant fallback, and R-08's claim that the line count was wrong. It retains and
sharpens R-01, R-02, R-04, R-06 and the conditional CI finding.

The reviewer's complete response is retained verbatim in
[VERIFICATION_RESPONSE.md](./VERIFICATION_RESPONSE.md).

The final confirmation of settled, withdrawn, and still-open items is recorded
in [FINAL_REVIEW_CONFIRMATION.md](./FINAL_REVIEW_CONFIRMATION.md).
