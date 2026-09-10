# Review — `MASTER_ROADMAP.md`

**Verdict: correctly sequenced on principle — truth and integrity before data and
polish. Two ordering errors that would cause harm if followed literally, and no
sizing, which makes it unschedulable against the owner's remaining budget.**

## What it gets right

**The phase-0 ordering principle is correct.** Fixing false statements and
mutable results before adding evidence or visual work is the right priority for
a product whose entire value proposition is trustworthiness. Most roadmaps in
this position would lead with the scoring redesign; leading with "stop false or
mutable results" shows the author understood which failures actually disqualify
the product.

**The "recommended decision sequence for the owner" is the most valuable section
in the document.** Six product questions — landlord mode's purpose, whether
personal buyer should have a universal score, tenant quota, investor strategy
placement, share-link immutability, which paid features ship first — are
correctly identified as _owner decisions rather than engineering choices_, and
correctly placed **before** implementation. That distinction is what keeps an
agent from quietly deciding product strategy through code.

**The suggested first slice is well chosen** and matches what I would do, with
one reordering (below). Six bounded items that remove the greatest harm, ending
with "reviewed and recorded in `docs/DECISIONS.md` before code changes, then
verified with the six gates".

**Phase 4's acceptance criterion is the single best line in the audit:**

> removing evidence can never produce a stronger recommendation in any mode.

That is a testable invariant, it captures the product's core ethic, and it
generalises across all four report types. It should be promoted out of phase 4
into a standing repository rule alongside the no-fabrication rule in `CLAUDE.md`.

## Two ordering errors

### 1. Landlord de-fixturing must precede (or accompany) landlord routing

Phase 0 lists "Remove fixtures from live landlord mode" and the first slice lists
"route landlord live reports away from fixture/investor content". These interact
dangerously.

Today `LandlordPage` uses `LL_RENT_COMPS` unconditionally (`:385`, `:457`) but is
mounted only at `/landlord-report` with no props (`App.tsx:47`), while live
landlord traffic goes to `InvestorReportContent`. **Live data cannot currently
reach the fixtures.** Wiring the canonical landlord route first would _create_ the
defect the roadmap wants to prevent — a live Vaughan subject shown Toronto
fixture comps.

Either strip the fixtures first, or do both in one change. The roadmap's
acceptance criterion ("Production props cannot import fixture types") is the
right end state and would prevent it structurally, but it belongs to phase 2's
type work, not phase 0.

### 2. Expense/NOI reconciliation must precede scoring calibration

Phase 4 proposes reducing correlated rewards "after empirical calibration". But
the displayed expense breakdown does not currently reconcile with the NOI beside
it — the browser recomputes expenses including an 8% management fee that the
saved backend metrics may exclude (see
[R-01](./README.md#r-01--the-expense-breakdown-does-not-reconcile-with-noi-new);
$2,160/yr on the audit's own reference property). Any calibration run measures
whichever set the harness happens to read. Fix the reconciliation first, or the
calibration is unreproducible.

## Missing: sizing

Seven phases, roughly sixty discrete items, no effort estimate on any of them.
The owner's stated constraint is limited remaining budget and a handoff to
another agent. A roadmap that cannot be cut to fit is not decision support.

Minimum useful addition — a rough band per item (hours / days / weeks) and an
explicit marker for the small number that are genuinely large:

| Item                                            | My rough band                          |
| ----------------------------------------------- | -------------------------------------- |
| Hide `/account` behind an honest empty state    | hours                                  |
| Wire or remove password reset                   | hours                                  |
| Remove/wire dead "Upgrade now" buttons          | hours                                  |
| Owner-only override mutation                    | days (needs an auth capability design) |
| Durable analysis status + polling deadline      | days (migration + client)              |
| Preserve unknown facts incl. round-trip fix     | days                                   |
| Canonical report registry (phase 1)             | weeks                                  |
| Evidence envelope across all fields (phase 2)   | weeks                                  |
| Individual rental comparables payload (phase 3) | days–weeks                             |
| Hold-case engine (phase 4, investor)            | weeks                                  |
| Accounts + commercial readiness (phase 5)       | weeks                                  |
| Ontario licensed data (phase 6)                 | blocked on vendor                      |
| Separate non-prod Supabase (phase 7)            | days                                   |

Phases 1, 2, 4 and 5 are each larger than everything in phase 0 combined. That
should be visible in the document.

## My ordering of the first slice

The roadmap's six items are right; I would sequence by harm-removed per unit of
effort:

1. **Hide `/account`.** One route, no dependencies, removes fabricated _financial
   records_ from a live URL. Highest harm, lowest cost.
2. **Password reset** — wire `resetPasswordForEmail` or delete the form. A false
   security confirmation; the service already exists.
3. **Dead "Upgrade now" buttons** — wire or remove. Inert controls on the payment
   path.
4. **Landlord: strip fixtures, then route.** In that order, per the error above.
5. **Owner-only override mutation.** The one P0 with real design work.
6. **Durable analysis status + polling deadline.**
7. **Preserve unknown facts,** including the condo-write/detached-read round trip
   as a single change.

Then stop and reassess. Items 1–3 are hours of work and remove three of the
audit's most serious integrity violations; they should not queue behind
architecture.

## Other observations

- **Phase 2's `EvidenceValue<T>` envelope is the right abstraction** but cannot
  express _"we tried and the provider failed"_. Add `failed` (and arguably
  `stale`) to the `kind` union — otherwise the "No flags detected" ambiguity
  survives the very refactor meant to fix it.
- **Phase 7's "Run CI on feature-branch pushes"** is a two-line change to
  `ci.yml` and sits in the last phase. Move it to phase 0; it makes every
  subsequent phase safer at essentially zero cost.
- **Phase 3 is well positioned.** "This phase improves trust without waiting for
  new licensed sources" is exactly the right justification — it delivers value
  during the Repliers blockage rather than idling.
- **No rollback or feature-flag strategy.** Several phases change stored
  behaviour (status columns, listing snapshots, score labels). With one shared
  Supabase project and no staging, each needs a documented back-out.
- **The audit-boundary discipline is maintained throughout** — "This is a
  recommendation set, not an implementation plan already approved", and the
  standing rule to ask before merging to `master` or touching production. That
  should survive into whatever plan the owner approves.

## Bottom line

The right principle and the right first slice. Three changes before anyone works
from it: swap the landlord fixture/routing order, put the expense/NOI
reconciliation ahead of calibration, and add effort bands so the owner can cut
it to fit. Promote "removing evidence can never produce a stronger
recommendation" into `CLAUDE.md` as a standing rule, and move the CI trigger fix
from phase 7 to phase 0.
