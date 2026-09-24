# Launch remediation verification — 2026-09-23

Status: local remediation implemented; staging end-to-end verification outstanding.
No release recommendation until the external checks below pass.

Work started from `50e98ba6cc7e166f0b364fce8f0c8f195d9c1139`. During testing the
shared checkout advanced to `f8cf35b6cbaa0b73555be623c5ad232f00e69fb6` (scraper
deployment documentation). These fixes are uncommitted working-tree changes,
not an independently reviewed candidate SHA. Concurrent documentation edits
were preserved. No deployment, migration, production write or credential change
was performed by this task.

## Implemented

- Toronto municipal transfer tax: missing 1.5% bracket plus April 2026 high-value
  brackets, tested at 14 purchase prices in both calculation implementations.
- GDS screening: 39% threshold and estimated heating match the engine; the UI
  explicitly distinguishes screening from mortgage approval.
- Report owner verification for value and facade changes. Anonymous and other
  users cannot write to a shared report. Facade save failures return an error.
- Free narrative truncation at the API boundary. Paid viewers retain full prose.
- PDF rendering receives the verified report payload without session credentials,
  avoiding the anonymous renderer's paywall. Tenant narrative no longer duplicates
  its first sentence or treats paragraph breaks as part of the headline.
- Stripe handlers propagate persistence failures for retry, consult current
  subscription state, and derive tier from the configured price.
- Checkout verifies the Pro price is active CAD 10/month, requires a persisted
  user profile before starting payment, and sends existing paid subscribers to
  the billing portal instead of creating another subscription.
- Public offers reduced to Free and Pro at CAD $10/month. New Professional and
  Team checkout is rejected; annual billing is not offered. Existing paid tiers
  remain recognized. Planned portfolios and white-label exports are not sold.
- Rental sample mode and navigation corrected; sample reports labelled explicitly;
  tenant cost assumptions reconciled; landlord financing and changing-rent copy
  corrected; mobile export/share buttons wrap; footer links lead to real pages.
- Signup request trims email, explicitly permits new users and handles network
  errors. SMTP, provider and redirect configuration still require live verification.
  Google sign-in is hidden unless `VITE_GOOGLE_AUTH_ENABLED=true` is configured
  at web build time after the provider and callbacks are enabled.

## Local evidence

| Check                                                                          | Result                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Complete frontend suite                                                        | 1,268 passed                                                                                      |
| Final Google-button gating checks, with shared, landing and print suites rerun | 83 passed (two additional tests beyond the complete frontend run)                                 |
| Complete API suite                                                             | 502 passed, 2 skipped                                                                             |
| Final account-profile checkout guard, with billing suite rerun                 | 15 passed (one additional test beyond the complete API run)                                       |
| Calculation engine                                                             | 469 passed, 2 skipped                                                                             |
| Scrapers                                                                       | 212 passed                                                                                        |
| Final tenant narrative change: report and tenant suites rerun                  | 114 passed                                                                                        |
| Web/API TypeScript and ESLint                                                  | Passed                                                                                            |
| Production web build                                                           | Passed; existing large-chunk warning remains                                                      |
| Real PDF renderer with synthetic local report                                  | PDF produced; full paid evidence present; no upgrade prompt; each narrative sentence appears once |
| Browser: Toronto rental sample                                                 | Rental mode choices shown; tenant choice reaches the full tenant sample                           |
| Browser: landlord at 390px viewport                                            | Document scroll width equals client width (380px after scrollbar)                                 |
| Browser: landlord median-rent action                                           | $3,100, at-market verdict and recalculated metrics shown                                          |

Snapshots were updated for intended copy, tax and footer changes, then reviewed.
Generated snapshot text includes whitespace-only formatting warnings from
`git diff --check`; no source whitespace errors were observed. Python checks ran
in an isolated Python 3.12 runtime, not CI's pinned Python 3.11. Dependency
deprecation warnings remain. The local npm launcher was broken, so local Node
entry points were invoked directly; manifests were not modified.

Reproduction: from `apps/web`, use `node ../../node_modules/vitest/vitest.mjs run`,
`node ../../node_modules/typescript/bin/tsc --noEmit`,
`node ../../node_modules/eslint/bin/eslint.js src --max-warnings 0`, and
`node ../../node_modules/vite/bin/vite.js build`. From `apps/api`, use the equivalent
TypeScript/ESLint commands and `node ../../node_modules/jest/bin/jest.js --runInBand`.
Run `python -m pytest -q` in each Python service with its requirements installed.

## Required staging acceptance

Use a named non-production environment and explicitly disposable test accounts
and reports. Configure credentials in that environment, never in chat.

1. Supabase: verified email sender/custom SMTP, allowed staging callback URLs and
   enabled desired providers. Exercise new-user email delivery, callback, returning
   login, logout, expired link and Google login if offered.
2. Stripe test mode: confirm the configured Pro price is CAD 10/month and the tax
   behavior agrees with the advertised tax-inclusive price. Confirm the webhook
   signing secret and portal. Test success, cancellation, decline, duplicate and
   delayed events, database-failure retry, past-due status and cancellation at term.
   Confirm the refreshed account and API agree on entitlement. No real charge.
3. Reports: generate all four modes through both URL and address entry, including
   missing facts, no comps, out-of-province and provider failure cases. Refresh,
   share in a signed-out browser, test another user's denied edits, then verify
   owner edits persist and paid PDFs match the underlying analysis.
4. Quotas: run the tenth and eleventh billable analyses for a disposable free
   account; verify unlimited tenant reports and Pro behavior.
5. Data: verify a successful scrape using valid provider credentials and inspect
   recent comp counts/timestamps by source, geography and property type. D-124
   records a scraper deployment fix made separately; freshness and rentals.ca
   recovery are not established by this local regression run.
6. Review the exact candidate commit and run CI, then arrange the human-owned
   release separately. Monitor the first scheduled ingestion and paid activation.

Local mocks establish application behavior, not actual email delivery, payment
settlement, provider coverage or production readiness.

## Read-only provider checks in the follow-up pass

The configured Stripe test Price was retrieved directly: active, CAD 1,000 cents,
monthly interval, interval count one, not live mode. Its tax behavior is
`unspecified`; the owner must confirm the intended tax treatment before live sales.
No checkout, payment, subscription or customer was created by this check.

The configured Supabase project's public auth settings report email enabled,
signup enabled, email confirmation required, and Google disabled. This proves
the provider flags, not SMTP delivery or callback behavior. No emails were sent
and no accounts were created by this check.

Owner inputs still needed: a staging URL and disposable test data/account scope;
a working custom SMTP sender and test inbox; the current valid ScraperAPI key
configured in the service environment; and Stripe test webhook forwarding to
that environment. Keep credentials in the service configuration, not in chat.
