# Testing, deployment and operations audit

## Current verification baseline

The last complete local verification recorded for this branch is:

| Gate               |                 Result |
| ------------------ | ---------------------: |
| Web                |      939 passing tests |
| API                | 232 passing, 2 skipped |
| Calculation engine | 397 passing, 2 skipped |
| Scrapers           |            180 passing |
| Typecheck          |    Web and API passing |
| Lint               |    Web and API passing |

This is a strong unit/integration base. It does not establish that the deployed multi-service product works. Previous live runs found high-impact bugs that mocks missed, including address listings overwriting one another and production CORS/report-fetch failures.

## Coverage strengths

- Calculation regression has a 100% gate.
- The extraction golden dataset gates accuracy and now includes many real descriptions with provenance.
- Scraper tests isolate provider shapes without requiring a browser download in CI.
- API routes cover common provider failures and timeouts.
- Web component, accessibility and integration tests cover substantial rendering behavior.
- Lint uses zero warnings.

## Coverage gaps

| ID   | Severity | Missing verification                                                       | Proposed test                                                           |
| ---- | -------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| T-01 | P0       | Shared report recipient cannot mutate owner state.                         | Security integration test with viewer token and authenticated owner.    |
| T-02 | P1       | Durable processing/failed terminal states.                                 | Real database state-machine tests and client timeout/retry tests.       |
| T-03 | P1       | All four live `/r/:token` modes render their canonical pages.              | Browser E2E using seeded real-shaped analyses.                          |
| T-04 | P1       | Account contains only authenticated data.                                  | Empty/new user, populated user, cross-user and expired-session E2E.     |
| T-05 | P1       | Password reset actually invokes Supabase and handles errors.               | Provider-mocked integration plus staging email test.                    |
| T-06 | P1       | Save/claim/report links/checkout buttons perform their advertised actions. | Browser workflow with test Stripe/Supabase project.                     |
| T-07 | P1       | Unknown facts never become zero/condo/detached assertions.                 | Property-based null-propagation tests across all services.              |
| T-08 | P1       | Financing changes and score remain consistent.                             | Monotonic scenario tests at component and browser levels.               |
| T-09 | P2       | Layout works at real viewport/zoom combinations.                           | Screenshot suite at 320/375/768/1024/1440, 200% zoom, both themes.      |
| T-10 | P2       | External source degradation is named per section.                          | Contract tests for every source unavailable/timeout/malformed response. |

The golden dataset is a development corpus and should not be marketed as an independent 95% real-world accuracy measurement. Maintain a held-out set labelled by more than one reviewer before publishing accuracy.

## CI behavior

GitHub Actions runs on pushes to `master`/`main` and on pull requests targeting those branches. A direct feature-branch push has no `push` trigger of its own. At the time of reconciliation, PR #21 is open against `master`, so pushes to this branch do receive pull-request CI; all eight checks passed on the inspected run. The unverified-branch risk applies when no qualifying PR is open and during the interval before a new PR run completes.

Recommended CI structure:

1. Run lint, typecheck and deterministic unit suites on every branch push.
2. Run golden extraction only when extraction code/corpus/model configuration changes, with explicit handling for missing secrets.
3. Run browser E2E against ephemeral services for pull requests.
4. Run a post-deploy preview smoke test against the exact Vercel URL and API environment.
5. Require all gates and human report review before merge.

The user's standing rule still applies: ask before merging to `master` and before actions touching the shared production Supabase project.

## Environment and deployment risks

- Vercel Preview and Production `VITE_API_URL` were manually verified in the current handoff, but environment configuration is dashboard state and can drift.
- A single Supabase project serves development and production. Test writes can pollute production and migrations have no staging rehearsal target.
- API, scraper and calculation-engine deploys can become version-incompatible during rollout.
- Some migration comments say data is not applied while the handoff says tables are loaded; documentation and live schema can diverge.
- There is no repository-level deployment manifest for every service, so reproducibility depends partly on dashboard configuration.

Recommended release architecture:

- Separate development/staging Supabase from production.
- Version the API-analysis contract and record component versions per result.
- Deploy backward-compatible consumers before producers, then remove compatibility code later.
- Store non-secret environment requirements in checked-in templates and validate required variables at boot.
- Add a migration ledger check and schema smoke test.
- Keep Preview isolated from production writes.

## End-to-end release gate

For each release candidate:

1. Run all six repository gates.
2. Start the actual web, API, calculation and scraper services.
3. Run both URL and address entry.
4. Create tenant, landlord, investor and personal reports.
5. Verify unknown photo/year/tax/fee/type behavior.
6. Verify repeat input does not repoint earlier share links.
7. Verify same snapshot/version returns deterministic flags and narrative.
8. Verify share is read-only, Save persists to the correct account, and PDF opens.
9. Confirm the known Vaughan condo remains near score 8/hard pass with roughly `-$2,724/month` cash flow under the reference assumptions. A materially better result is a regression toward flattering a bad deal.
10. Inspect phone, tablet and desktop layouts.

Production execution requires the owner's approval because the same Supabase project serves production.

## Observability

Minimum operational dashboard:

- analysis starts, completes, fails and times out by mode;
- end-to-end duration percentiles;
- scraper success by provider and page shape;
- rental comp count/confidence and fallback rate;
- optional-source availability;
- extraction error and flag distribution by version;
- report fetch/PDF/share/save failures;
- version skew among services;
- production sanity failures.

Alerts should fire on error-rate or missing-data shifts, not only process health.

## Documentation hygiene

- Keep test counts dated and generated where possible.
- Mark migrations as applied through an actual ledger, not file comments.
- Update the handoff after every release with deployed commit IDs and service versions.
- Keep research proposals separate from accepted decisions until owner approval.

## Review trail

- [Independent review](../audit-review/TESTING_DEPLOYMENT_AND_OPERATIONS.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **CI status:** branch pushes alone are not covered by the workflow trigger, but open PR #21 currently triggers CI and the inspected run passed all eight checks.
- **Release fixture correction:** name Unit 5702, $729,900 and approximately `-$2,723.68/month`; do not confuse it with Unit 2501 at $589,000.
- **Retained additions:** record commands and dates with counts; document the pre-commit gate; prioritize analysis/report-fetch observability; verify backup/restore for the shared database; size the manual release gate.
