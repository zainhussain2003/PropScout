# Counter-review reconciliation

**Reconciliation date:** 2026-09-10

**Tree inspected:** `6dfe200e96119341c58ed90606b2bfd28ccf2b26`

**Inputs:** the original `docs/product-audit` set, the independent per-document reviews in this folder, the Codex counter-review, and the reviewer's attached verification response, preserved verbatim in [VERIFICATION_RESPONSE.md](./VERIFICATION_RESPONSE.md).

The final reviewer confirmation accepting the two qualifications and verifying the control inventory is recorded in [FINAL_REVIEW_CONFIRMATION.md](./FINAL_REVIEW_CONFIRMATION.md).

This record preserves disagreements and their resolution. It changes no application code, configuration, schema, calculation or data. Recommendations remain proposals until the owner approves them and they are recorded in `docs/DECISIONS.md`.

## Resolution of headline findings

| ID   | Final status                                                 | Reconciled finding                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | **Accepted — P1**                                            | The backend calculation engine is coherent when it receives one management-fee setting. The live report can still show a frontend-recomputed expense total that includes management while saved NOI, cap rate, DSCR, cash flow and score retain the original backend scenario. Fix this reconciliation before score calibration. The asymmetric `include_management=False` defaults are a regression hazard even though the router currently passes the flag consistently. |
| R-02 | **Accepted — P1**                                            | Free allowance is 10 in web/API constants and `CLAUDE.md`, three sale reports in landing copy, and not enforced by the server. The claim, unit and entitlement behavior must be decided together.                                                                                                                                                                                                                                                                          |
| R-03 | **Original correction withdrawn; replacement accepted — P1** | There is no condo-to-detached round-trip flip. Address input coerces unknown type to condo and persists it; current scrape input coerces unknown type to detached. The defect is path-dependent treatment of the same unknown, including different condo-fee flag behavior. A null legacy row can still read as detached.                                                                                                                                                  |
| R-04 | **Accepted — operational P1**                                | Two Buttermill references exist: Unit 5702 at $729,900 with about `-$2,723.68/month`, and Unit 2501 at $589,000 with about `-$2,000/month`. Release instructions must name unit, price, assumptions and fixture/token.                                                                                                                                                                                                                                                     |
| R-05 | **Withdrawn**                                                | `TenantReportContent` is unreachable under current control flow. The fallback block requires `analysis && listing`; that same tenant state has already returned the full `TenantReport`. It is dead duplicate code, as the original audit stated.                                                                                                                                                                                                                          |
| R-06 | **Accepted — P2 latent, P1 when routed**                     | `LandlordPage` contains unconditional fixture comps but does not currently receive live data. Remove fixtures before, or atomically with, routing canonical landlord traffic to it.                                                                                                                                                                                                                                                                                        |
| R-07 | **Accepted with verified current state**                     | CI does not run for a feature-branch push by that trigger alone. PR #21 is currently open against `master`, so pull-request CI runs for this branch; all eight checks passed on the inspected run. Branches without an open PR remain exposed.                                                                                                                                                                                                                             |
| R-08 | **Withdrawn as an error claim**                              | The audit has 1,553 nonblank lines and 2,128 physical lines. Both counts are reproducible; future counts must state their basis.                                                                                                                                                                                                                                                                                                                                           |

## Additional findings retained

| Finding                                                               | Status and destination                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambiguous “No flags detected” and full honesty/risk credit            | **P1.** Consolidate in tenant, personal, shared UI, scoring and claims audits. Missing description, extraction failure and clean result need distinct states.                                                                                     |
| `calculate_break_even_rent(... include_management=False)` asymmetry   | **Regression hazard.** Record with R-01 in scoring/investor material; keep router-call tests.                                                                                                                                                     |
| Historical listing rows overwritten by a fresh scrape of the same URL | **P1.** API-06 remains under-prioritized. Reports need immutable listing/evidence snapshots.                                                                                                                                                      |
| Evidence labels defined but not applied                               | **Audit-process weakness.** Every finding should carry confirmed, inferred or unknown; runtime status should be explicit.                                                                                                                         |
| `investorCalc.ts` missing from source map                             | **Accepted.** It is primary evidence for expense/scenario divergence.                                                                                                                                                                             |
| Sun obstruction coverage                                              | **Accepted.** Known-height coverage is already exposed; define a suppression threshold before presenting a definitive score.                                                                                                                      |
| “True monthly cost”                                                   | **Accepted — claim problem.** The reference personal report has $1,145 of modelled expense in a $4,722 headline total (about 24%), including its largest estimated line based on unknown build year. Use “modelled” and show the estimated share. |
| Effort sizing                                                         | **Accepted.** Add rough hours/days/weeks/blocked bands before scheduling implementation.                                                                                                                                                          |
| Personal-report agent sharing versus mutable share links              | **Accepted interaction.** Do not encourage professional sharing as review evidence while recipients can alter dismissals.                                                                                                                         |
| Hardcoded narrative `tier: 'free'`                                    | **Inert today.** `generateNarrative` does not read tier. Free/Pro differentiation is frontend truncation. The stale mechanism is the tier-length table in `CLAUDE.md`; reconcile the specification with the chosen gating design.                 |
| RLS characterization                                                  | **Qualified.** RLS does not constrain backend service-role calls, so API authorization is the boundary there. It remains a real boundary for browser/anon-key Supabase access.                                                                    |
| Rent control                                                          | **Conditional landlord risk and unconditional tenant evidence need.** A landlord task question must distinguish vacancy pricing from a sitting-tenant increase. Legal behavior requires authoritative Ontario guidance and qualified review.      |

## Corrected first implementation sequence

No implementation is authorized by this list.

1. Hide fabricated account identity, reports and paid invoices behind an honest real-data/empty state.
2. Wire or remove the password-reset request form.
3. Wire or remove inactive payment controls and decide one capability/entitlement policy.
4. Reconcile the expense table with NOI and every dependent metric.
5. Make risk-override mutation owner-only. It remains the last P0 and must not slip further; it follows three very small false-statement fixes because those remove high harm in hours while the authorization design takes longer.
6. Persist analysis status and bound polling/retry behavior.
7. Preserve unknown facts consistently across URL and address paths.
8. Remove landlord fixtures, then route the canonical landlord report, or defer landlord mode from launch.
9. Snapshot listing evidence so a fresh scrape cannot rewrite an already-issued report.

## Audit-process improvements

- Add `confirmed`, `inferred` or `unknown` to every rated finding. **Confirmed requires reading the specific control flow or write/read path end to end; finding one plausible line is insufficient.**
- Separate current defect from recommendation and acceptance criteria.
- Cite the exact commit inspected.
- Reconcile arithmetic identities such as `gross rent - operating expenses = NOI` in every financial audit.
- Distinguish static source review from browser/runtime and deployed-environment verification.
- State the command, date and inclusion rules for test and line counts.
- Add effort bands and dependencies before the owner chooses a funded slice.

## Verified control inventory

| Action            | Current state                              | Disposition                                                            |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| Report-body Share | Functional clipboard write.                | Add success/failure feedback.                                          |
| Navigation Share  | No handler.                                | Connect to the shared action.                                          |
| Save              | No persistence.                            | Build ownership and guest claiming.                                    |
| Upgrade controls  | No handler.                                | Decide paid scope, then wire or remove.                                |
| PDF               | Functional hook and API route.             | Preserve; add error UI and end-to-end entitlement/output verification. |
| Billing backend   | Checkout, portal and webhook routes exist. | Verify configuration and complete UI/account lifecycle.                |

## Evidence re-checks requested by the reviewer

### R-01 mechanism

Confirmed from `apps/web/src/lib/investorCalc.ts`: `computeExpenses` uses the current frontend `includeManagementFee`, while `computeDemoMetrics` receives saved NOI as a stable input. The API engine consistently passes its management flag to NOI, cash-flow and break-even calculations. The inconsistency arises when the frontend scenario differs from the saved backend scenario; it is not an arithmetic error inside the Python engine.

### R-06 reachability

Confirmed from `App.tsx`, `ReportPage.tsx` and `LandlordPage.tsx`: the standalone landlord page is mounted without live props, while canonical live landlord mode renders investor content. Fixture leakage into a live subject is therefore latent today and would become active if routing changed without first removing the fixture dependency.

## Document map

Each original audit now contains a short review trail linking its independent review and this reconciliation. The independent review files remain unchanged as historical artifacts except for the review index link added below. Incorrect claims are not erased; this document records their withdrawal and replacement.
