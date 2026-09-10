# Proposed remediation roadmap

This is a recommendation set, not an implementation plan already approved. It deliberately fixes truth, ownership and state integrity before adding data or visual polish.

## Phase 0 — stop false or mutable results

| Priority                  | Work                                                                                     | Why first                                                                                                                                    | Acceptance criterion                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P0                        | Replace or remove fabricated account dashboard content.                                  | It presents fictional personal/financial history as real.                                                                                    | A new account shows a real identity and honest empty state; cross-user tests pass.                     |
| P0                        | Make public share links read-only.                                                       | A recipient can alter risk dismissals and future score treatment.                                                                            | Override writes require authenticated ownership; viewer receives 403.                                  |
| P1                        | Preserve unknown manual-entry and scraped fields.                                        | Defaults can change the property type, costs, comps and advice.                                                                              | Null propagation tests prove missing type/bath/parking/year/fee never becomes a fact.                  |
| P1                        | Add durable analysis job states.                                                         | Failed analysis can poll forever.                                                                                                            | Each attempt reaches complete/failed/timed-out; UI stops and explains next action.                     |
| P1                        | Remove false confirmations and dead paid actions.                                        | Reset, upgrade, Save and notifications imply work that did not occur.                                                                        | Every visible action completes server-side or is absent/clearly unavailable.                           |
| P2 latent; P1 when routed | Remove fixtures from the specialized landlord page before connecting it to live traffic. | Current live landlord traffic sees investor content; changing the route first would expose unrelated Toronto fixtures beside a live subject. | Production props cannot import fixture types; only then may the canonical route use the landlord page. |

## Phase 1 — unify the product surface

1. Create a canonical report registry for tenant, personal, investor and landlord.
2. Route demo, shared report and PDF through the same mode component.
3. Remove obsolete `TenantReportContent` and duplicate investor/landlord implementations.
4. Create shared score dial, section header, evidence state and action components.
5. Make Share, Save and PDF behavior consistent and observable.
6. Remove the promise to switch mode or add a real switch that reruns the correct interpretation on the same immutable listing snapshot.

Acceptance criteria:

- The same analysis fixture rendered by demo and `/r/:token` produces the same sections.
- Landlord never renders investor labels or sections accidentally.
- All action buttons have working, tested handlers.
- 320–1440 px screenshots show no overlap, clipping or sticky obstruction.

## Phase 2 — establish one evidence contract

Introduce a field-level envelope:

```ts
interface EvidenceValue<T> {
  value: T | null
  kind: 'observed' | 'user' | 'derived' | 'estimated' | 'inferred' | 'sample' | 'unknown'
  source: string | null
  observedAt: string | null
  methodVersion: string | null
  confidence: 'high' | 'medium' | 'low' | null
  note: string | null
}
```

Apply it first to property type, price/rent, beds, baths, sqft, parking, tax, condo fee, rent comps, sales comps, window direction and floor. Persist report snapshots and analysis versions.

Acceptance criteria:

- The UI does not infer wording from raw null/zero alone.
- Report reopening reproduces the original snapshot.
- Refresh creates a new dated version and identifies changed evidence.

## Phase 3 — make the current data inspectable

1. Return individual rental comparables with source, date, approximate location, property facts, distance and similarity.
2. Rank and display which comps drive rent negotiation.
3. Cache risk extraction by normalized description hash and extractor version.
4. Expose extraction success/failure and description completeness.
5. Add source dates and geography to CMHC, Bank of Canada, school, StatsCan, Walk Score and Places values.
6. Measure SunScout obstruction coverage and suppress definitive conclusions below threshold.

This phase improves trust without waiting for new licensed sources.

## Phase 4 — clarify each report's decision method

### Tenant

- Separate score from evidence completeness.
- Stop awarding full honesty points for absence of detected warnings.
- Let users supply lease inclusions, bills and viewing evidence.

### Investor

- Keep appreciation outside the income score.
- Reduce correlated rewards after empirical calibration.
- Add Income, Balanced hold and Appreciation-thesis lenses.
- Recompute scenario outcomes coherently when financing changes.

### Personal buyer

- Keep headline score paused until Ontario sold evidence exists.
- Treat schools, light and mobility as user preferences plus evidence rather than universal value points.
- Add inspection/document workflow before “matches the unit” conclusions.

### Landlord

- Center the live report on rent evidence, operating margin and readiness.
- Ask whether the user is pricing, renewing, refinancing or acquiring.
- Add Ontario rent-control, lease, utility and condo-rule evidence.

Acceptance criterion: removing evidence can never produce a stronger recommendation in any mode.

## Phase 5 — accounts and commercial readiness

1. Real account queries and honest empty states.
2. Guest report claim and authenticated Save.
3. Real usage/quota service and entitlement matrix.
4. Functional checkout, webhook, portal, cancellation and delinquency states.
5. PDF entitlement and branded-output verification.
6. Add portfolio only after persistence, update, deletion and reporting are real.
7. Add notifications only after monitor jobs and delivery observability exist.

Do not charge for portfolio, monitoring, 3D or white-label capabilities before their end-to-end acceptance tests pass.

## Phase 6 — licensed and richer evidence

1. Ontario/TRREB sold comparables.
2. Executed rental evidence if a compliant source is available.
3. School attendance boundaries and grade coverage.
4. Route-based travel time.
5. Property/municipal records where licensed.
6. Better building-height/window-orientation acquisition.

Tacoma sample records remain labelled demonstration data until the Ontario provider is active. They must never feed an Ontario score.

## Phase 7 — operational hardening

- Separate non-production Supabase from production.
- Run CI on feature-branch pushes.
- Add browser E2E and screenshot regression.
- Version service contracts and add migration/schema checks.
- Add metrics, traces, correlation IDs, dependency readiness and alerts.
- Define retention, deletion, backup and recovery procedures.
- Run the six gates plus the real end-to-end sequence for every release.

## Recommended decision sequence for the owner

The owner should decide these product questions before calculation/UI implementation:

1. Is landlord mode for pricing an already-owned unit, acquisition underwriting, or both through an initial intent question?
2. Should personal buyer have any universal score, or a preference-weighted trade-off profile?
3. Should tenant reports remain free without quota, and which evidence must remain visible even for free users?
4. Should investor strategy be one additional question after mode selection or an in-report lens?
5. Is a 30-day public share link intended to remain immutable after creation?
6. Which advertised paid features are in the first sellable release?

## Suggested first implementation slice after approval

One bounded first slice can remove the greatest harm:

- hide the account dashboard behind an honest unavailable/empty state;
- wire password reset or remove its form;
- make override mutations owner-only;
- add real analysis status/failure persistence;
- preserve unknown property facts;
- remove landlord fixture dependencies, then route live reports away from investor content in the same reviewed change, or defer the mode.

That slice should be reviewed and recorded in `docs/DECISIONS.md` before code changes, then verified with the six gates and the approved live end-to-end sequence.

## Review trail

- [Independent review](../audit-review/MASTER_ROADMAP.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Corrected order:** reconcile expenses before calibration; remove landlord fixtures before routing; move immutable listing snapshots forward; keep owner-only overrides from slipping below the first integrity slice.
- **Prioritization rationale:** three small false-statement fixes precede the remaining P0 override design because they remove immediate harm in hours. This is explicit scheduling, not a severity downgrade.
- **Planning addition:** add rough hours/days/weeks/blocked bands, dependencies, rollback strategy and a stopping point before any implementation is approved.
