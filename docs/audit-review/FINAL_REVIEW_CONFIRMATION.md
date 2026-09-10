# Final review confirmation

**Recorded:** 2026-09-10

**Scope:** confirmation after the original audit, independent review, counter-review, and verification response. This document records the final state so a later reader does not need to reconstruct it from conversation history.

No application code, configuration, schema, calculation or data was changed while recording this confirmation.

## Settled and verified

- **R-01:** frontend scenario enrichment can make the displayed expense table disagree with saved NOI and dependent metrics. Reconcile before score calibration.
- **R-02:** the free allowance conflicts across landing copy, web/API constants and documentation, and no server meter enforces it.
- **R-04:** Unit 5702 and Unit 2501 at 5 Buttermill Avenue are different reference properties and must always be identified by unit, price and expected result.
- **R-06:** landlord fixture exposure is latent today and becomes active if canonical live routing is connected before fixture removal.
- **CI qualification:** feature-branch pushes have no push trigger of their own; open PR #21 currently gives this branch pull-request CI coverage.
- **Line-count basis:** the original 17-file audit has 1,553 nonblank lines and 2,128 physical lines.
- **Control inventory:** report-body Share works; navigation Share is inert; Save is inert; Upgrade controls are inert; PDF is functional but does not surface failures; billing backend routes exist but the complete commercial flow is not verified.
- **Ordering:** decide the first paid feature set before wiring commercial controls.
- **Effort:** the first small truth fixes are measured in days; ownership, durable status, unknown-value migration and immutable snapshots are approximately one to three weeks and may take longer with one shared production database.

## Withdrawn or superseded

- **R-03:** withdrawn as a round-trip flip. Replacement: URL and address paths coerce the same unknown property type differently.
- **R-05:** withdrawn. `TenantReportContent` is unreachable duplicate code.
- **R-08:** withdrawn as an error claim. The two line counts measure different things.
- **PDF grouping:** withdrawn. PDF works; its defect is error visibility and end-to-end entitlement/output verification.
- **RLS framing:** narrowed. Service-role API calls depend on API authorization; browser/anon-key Supabase access still depends on RLS.
- **Narrative `tier: 'free'`:** inert today because the deterministic generator does not read the field. The stale tier-length mechanism in `CLAUDE.md` is the documentation defect.
- **Source-map omission:** superseded. `investorCalc.ts` and the other requested primary sources are now included.
- **Earlier no-file-change objection:** withdrawn. The statement was true for the turn in which it was made; later documentation changes were separately authorized and reported.

## Verified action inventory

| Action            | Current state                                  | Required response                                                        |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Report-body Share | Works through `navigator.clipboard.writeText`. | Add visible success/failure handling and fallback.                       |
| Navigation Share  | Inert.                                         | Connect it to the shared Share action.                                   |
| Save              | Does not persist.                              | Build authenticated ownership, guest claiming and confirmation.          |
| Upgrade controls  | Inert in the modal and hard gate.              | Decide paid scope first, then wire checkout or remove.                   |
| PDF               | Functional hook and API route exist.           | Surface failures; verify entitlement, rendering and branding end to end. |
| Billing backend   | Checkout, portal and webhook routes exist.     | Verify configuration, UI entry, webhook lifecycle and account states.    |

## Retained next-plan additions

- Update the stale narrative-tier specification to match frontend truncation, or explicitly choose a different product contract.
- Define a SunScout height-coverage threshold below which a definitive light score is suppressed.
- Do not recommend sharing a personal report with an agent until shared recipients cannot modify risk dismissals.
- Keep API-06, immutable historical listing/evidence snapshots, near the first integrity work.
- Add rough effort and dependency bands before the owner funds a slice.
- Keep the management-inclusion default asymmetry recorded as a regression hazard.

## Evidence-state rule

Every future audit finding must be labelled:

- **Confirmed:** the relevant control flow, write/read path or runtime behavior was inspected end to end.
- **Inferred:** source evidence strongly suggests the behavior, but reachability or runtime effect is not verified.
- **Unknown:** the available repository or environment evidence cannot answer it.

Finding a plausible line is not enough for **Confirmed**. The label must describe the specific claim being made. When a finding changes, annotate it where readers first encounter it and link to the disposition rather than relying only on a later correction.

## Remaining documentation work before implementation planning

- Apply evidence-state labels to every rated audit finding.
- Update the stale tier-length description in `CLAUDE.md` only after the owner confirms the intended free/Pro contract.
- Add effort bands, dependencies and rollback considerations to the funded implementation plan.

Recommendations remain proposals until the owner approves them and the corresponding decisions are recorded in `docs/DECISIONS.md`.
