# Review — `TESTING_DEPLOYMENT_AND_OPERATIONS.md`

**Verdict: accurate, and its central judgement is the one I would most defend
from my own experience on this codebase. Two claims need nuance and one release
gate is unusable as written.**

> This is a strong unit/integration base. It does not establish that the deployed
> multi-service product works. Previous live runs found high-impact bugs that
> mocks missed.

I can corroborate that from direct experience rather than inference. Three
significant bugs on this branch were found **only** by running the product end to
end, and every one was invisible to a passing test suite:

1. **Address-entered listings overwrote each other.** `saveListing` upserted on
   `source_url`, every address listing wrote `''`, so each new address silently
   replaced the previous listing and already-issued share tokens repointed at a
   stranger's property. All API tests mocked Supabase, so the UNIQUE constraint
   that caused it was never exercised (D-028).
2. **Comparable sales reached the API and the investor report but were thrown
   away by the personal buyer report** — fetched, mapped, returned, discarded
   (D-029).
3. **Production CORS admitted only `propscout.ca`**, and the client mislabelled
   the resulting network failure as "Report not found" (D-045).

That is three for three in favour of the document's thesis. T-01 through T-10 are
the right gaps.

## Verified

| Claim                                                              | Result                                                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| CI triggers only on `master`/`main`                                | **Confirmed.** `ci.yml`: `push: branches: [master, main]`, `pull_request: branches: [master, main]`.                                        |
| Calculation regression has a 100% gate                             | **Confirmed.** `test_regression.py` with fixed expected ranges.                                                                             |
| Golden dataset gates accuracy and now includes real descriptions   | **Confirmed.** 58 cases / 85 assertions when I last ran it; gc-052…gc-058 are verbatim real phrasings.                                      |
| Lint runs at zero warnings                                         | **Confirmed.** `eslint --max-warnings 0` in the pre-commit chain.                                                                           |
| Single Supabase project serves dev and production                  | **Confirmed.** One `SUPABASE_URL` in `.env`; no staging project.                                                                            |
| Migration comments claim not-applied while the handoff says loaded | **Confirmed.** `20260701_add_schools_name_postal_unique.sql` is annotated "NOT applied" in `CLAUDE.md`'s tree while schools data is loaded. |

## Nuance on two claims

### CI exposure is conditional, not absolute

"Direct pushes to the feature branch do not trigger the workflow. That means the
branch can be synchronized to GitHub without any hosted verification until a PR
is opened."

The first sentence is exactly right. The second overstates the present risk: **PR
#21 is open against `master`**, so `pull_request` runs do fire for this branch,
and all eight checks passed on the last push I observed (typecheck ×2, tests ×4,
lint, golden dataset). The real exposure is narrower and worth scoping precisely:

- branches with **no** open PR get no hosted verification at all;
- there is a window between a push and the PR run completing;
- if PR #21 were closed, the branch would go dark.

The recommendation (run lint/typecheck/unit suites on every branch push) is still
right. The framing should not imply the current branch is unverified.

### The 397/2-skipped calculation figure is not reproducible from the tree I inspected

The baseline table lists "Calculation engine: 397 passing, 2 skipped". My own run
on 2026-09-10 gave **376 passed** before the golden-dataset expansion and would
now be higher, but I cannot reproduce 397/2. Likely explanations: the count
postdates additional work, or `-m network` contract tests are being counted or
skipped differently. Not a defect — but it illustrates the document's own advice
("keep test counts dated and generated where possible"), which it does not follow
for its own table. Every count in the audit should carry the command and date
that produced it.

## Release gate item 9 is unusable as written

> Confirm the known Vaughan condo remains near score 8/hard pass with roughly
> `-$2,724/month` cash flow under the reference assumptions.

There are **two** Vaughan Buttermill reference properties in the audit set:

- **5702–5 Buttermill Avenue, $729,900, −$2,723.68/mo, score 8** —
  `AGENT_HANDOFF.md`, `test_regression.py`, and this gate.
- **2501–5 Buttermill Avenue, $589,000, ≈ −$2,000/mo, score 8** —
  `INVESTOR_REPORT_AUDIT.md`, `PERSONAL_REPORT_AUDIT.md`.

Both score 8. An operator who runs the gate against 2501 sees −$2,000 against an
expected −$2,724 and concludes the score has drifted toward flattering a bad
deal — which is exactly the regression the gate exists to detect. The gate must
name the unit number, the asking price and the token, or cite the regression
fixture directly.

## Agreements worth recording

- **T-01 (shared recipient cannot mutate owner state) rated P0** is the only P0
  in the testing document and it is correctly the same finding as the API
  audit's. Good that the test gap inherits the defect's severity.
- **T-07 (property-based null-propagation tests)** is the highest-leverage item
  in the table. It is the only proposed test that would catch the whole
  unknown-becomes-fact class — including the condo-on-write / detached-on-read
  round trip — rather than one instance.
- **"The golden dataset is a development corpus and should not be marketed as an
  independent 95% real-world accuracy measurement"** is exactly right and is a
  correction of the project's own earlier framing. I verified the substance: real
  Realtor.ca recall was 6/22 before pattern widening and 10/22 after, against a
  synthetic set at 100%. Held-out, multi-reviewer labelling is the correct bar
  before publishing any accuracy number.

## Gaps

1. **No mention of the pre-commit hook as part of the verification story.** The
   repo runs `lint-staged` with eslint/prettier/black/flake8 and blocks on a
   single warning. That is a real gate with real failure modes (it cannot resolve
   `services/agents/` files, so `git add -A` breaks commits), and it is the gate
   developers hit most often. Absent from the document.
2. **Observability list has no minimum viable subset.** Twelve metrics and an
   alerting policy are proposed; none is marked as required before launch. For a
   pre-revenue product, "analysis failures by code" and "report fetch failures"
   are the two that would have caught the CORS incident. Say which two.
3. **No backup/restore verification despite one shared database.** The API audit
   asks for "backup/restore objectives and tested recovery"; this document owns
   operations and does not state whether Supabase point-in-time recovery is even
   enabled on the plan in use. With dev and production sharing one project, an
   errant migration is an unrecovered-data event.
4. **The release gate has no time estimate.** Ten steps including four full report
   modes, multi-viewport inspection and determinism checks is plausibly a
   half-day of manual work per release candidate. That should be stated, because
   an unaffordable gate is a gate that gets skipped.

## Bottom line

The thesis is right and I can corroborate it with three concrete bugs that mocks
missed. Fix release-gate item 9 to name the property unambiguously, scope the CI
claim to branches without an open PR, date and attribute every test count, and
nominate the two observability metrics that must exist before launch.
