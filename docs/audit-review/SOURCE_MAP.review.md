# Review — `SOURCE_MAP.md`

**Verdict: useful and honest about its own limits. Its best decision is citing
files and exported symbols rather than line numbers. Three gaps that matter for
whoever works from the audit next.**

## What it gets right

**"Line numbers will move; the file and exported symbol are the durable
reference."** Correct, and unusually disciplined. Most audit source maps rot
within a week because they pin line numbers. This one will still resolve after a
refactor.

**Relative links are correct.** I resolved a sample (`../../apps/web/src/App.tsx`,
`../../services/calc-engine/calculations/deal_score.py`, `../DECISIONS.md`) —
all valid from `docs/product-audit/`. The completion claim that "all relative
documentation links resolve" holds for the ones I checked.

**The "what this establishes" column is the right second column.** It turns a
file list into an evidence chain: a reader can go from a finding to the file to
the specific property that file demonstrates. That is what makes the audit
auditable.

**The evidence-limitations section is the most important part of the document**
and belongs in every audit:

> This audit is a static repository and existing-test-record review. It does not
> claim that dashboard-only environment configuration matches every deployed
> service today.

Combined with the explicit statements that no production writes, billing events,
migrations or deployments were performed, and that Ontario law / regulated advice
/ privacy / licensing need qualified review — this is the correct scope
disclosure. It is also the answer to anyone treating the audit as a statement
about production behaviour.

## Gaps

### 1. Files cited in findings but missing from the map

Several files carry findings elsewhere in the audit and do not appear here:

| File                                                                 | Finding it evidences                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/investorCalc.ts`                                   | The frontend expense/equity recomputation behind S-05 — and behind R-01, the expense/NOI reconciliation failure. The single most important omission. |
| `apps/web/src/constants/tiers.ts`, `apps/api/src/constants/tiers.ts` | `MONTHLY_ANALYSIS_LIMIT: 10` versus the landing page's "3 sale-listing reports / month".                                                             |
| `apps/api/src/constants/cmhcVacancy.ts`                              | The "indicative placeholders" comment that disproves "every number has a source, a date, and a method".                                              |
| `services/calc-engine/tests/test_regression.py`                      | The Vaughan and Hamilton regression fixtures the calibration document discusses.                                                                     |
| `apps/web/src/components/analysis/ListingVisual.tsx`                 | The photo-honesty fix claimed as corrected in three report audits.                                                                                   |
| `apps/web/src/pages/PasswordResetConfirmPage.tsx`                    | Cited as working (it does call the auth service) in contrast to the request page.                                                                    |

`investorCalc.ts` is the notable one: it is the file where the frontend
independently recomputes expenses, equity and score adjustments, which makes it
the mechanism behind two P1 findings. An audit that discusses frontend/backend
score divergence without mapping that file leaves its most consequential
evidence untraceable.

### 2. No commit or tree identifier

The document names the branch (`feat/address-input-and-mobile`) but not the
commit. The handoff records the branch moving from 12 to 19 commits during the
audit window, and the audit's own changes are uncommitted. A reader cannot
reconstruct which tree was inspected. One `git rev-parse HEAD` would fix it, and
without it every "confirmed" finding is unanchored in time.

### 3. Evidence states are defined but never applied

`README.md` defines **confirmed** / **inferred** / **unknown**. This map — the
natural place to record which is which — carries no such column. As a result,
findings that are static inferences read identically to findings that were
runtime-verified. Concretely:

- _Confirmed by code inspection:_ the overrides trust model, `updateAnalysisStatus`
  no-op, the missing unique index, account fixtures, absent auth import in the
  reset page, dead upgrade handlers, CI triggers.
- _Inferred, needs runtime verification:_ the landlord fixture leak's live
  reachability (I found it is **not** currently reachable), PDF error handling,
  "some upgrade buttons", polling behaviour under network failure, whether
  displayed metrics correspond to saved or slider financing.

Adding a third column would let a reader triage by confidence as well as
severity, and would have surfaced the landlord-reachability overstatement.

## Minor

- **`docs/TESTING.md` is cited as establishing "required testing practices and
  scenario inventory"**, but the testing audit never references it — it uses the
  handoff's test counts instead. Either it informed the audit or it did not.
- **No mention of `docs/NIGHT_NOTES`**, which `deal_score.py` cites directly for
  the unsourced severe-gate placeholders (S-04). That is the primary source for a
  P1 finding and it is not in the map.
- **The audit's own outputs are not listed.** `docs/product-audit/` is 17 files
  and 2,128 lines of new project documentation; the map covers what was read, not
  what was produced. A one-line note that the folder is the sole intended change
  would close the loop (the audit README says this, but the map is where a
  provenance-minded reader looks).

## Bottom line

Good discipline on durability and scope; the evidence-limitations section is
exemplary. Three additions: map `investorCalc.ts` and the other files carrying
findings, record the commit SHA that was inspected, and add a
confirmed/inferred/unknown column so a reader can tell verified facts from
strong inferences.
