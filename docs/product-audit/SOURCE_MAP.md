# Audit source map

This audit uses repository code and existing project records as its primary evidence. The table maps each audit domain to the implementation inspected. Line numbers will move; the file and exported symbol are the durable reference.

## Product shell and journey

| Evidence                                                                                                               | What it establishes                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx)                                                                   | Route map, global paywall surfaces and report entry points.              |
| [`apps/web/src/pages/LandingPage.tsx`](../../apps/web/src/pages/LandingPage.tsx)                                       | Input orchestration, marketing claims, pricing, report previews and FAQ. |
| [`apps/web/src/lib/classifyInput.ts`](../../apps/web/src/lib/classifyInput.ts)                                         | URL/address classification.                                              |
| [`apps/web/src/lib/validateUrl.ts`](../../apps/web/src/lib/validateUrl.ts)                                             | Advertised Realtor.ca/Zillow.ca URL support.                             |
| [`apps/web/src/components/shared/AddressDetailsCard.tsx`](../../apps/web/src/components/shared/AddressDetailsCard.tsx) | Manual facts collected and omitted.                                      |
| [`apps/web/src/components/shared/ModeModal.tsx`](../../apps/web/src/components/shared/ModeModal.tsx)                   | Mode eligibility, synthetic opening progress and switch-later claim.     |
| [`apps/web/src/pages/analyzing.tsx`](../../apps/web/src/pages/analyzing.tsx)                                           | Trigger/poll lifecycle, synthetic progress, cancel and retry behavior.   |

## Reports and shared UI

| Evidence                                                                                                           | What it establishes                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [`apps/web/src/pages/ReportPage.tsx`](../../apps/web/src/pages/ReportPage.tsx)                                     | Canonical token route, mode routing, duplicate content and report-level actions.     |
| [`apps/web/src/pages/TenantReport.tsx`](../../apps/web/src/pages/TenantReport.tsx)                                 | Full tenant sections, live adapters and actions.                                     |
| [`apps/web/src/pages/InvestorReport.tsx`](../../apps/web/src/pages/InvestorReport.tsx)                             | Full investor presentation and financing interactions.                               |
| [`apps/web/src/pages/PersonalBuyerPage.tsx`](../../apps/web/src/pages/PersonalBuyerPage.tsx)                       | Personal sections, score suppression and live adapters.                              |
| [`apps/web/src/pages/LandlordPage.tsx`](../../apps/web/src/pages/LandlordPage.tsx)                                 | Specialized landlord page and fixture leakage.                                       |
| [`apps/web/src/components/shared/Nav.tsx`](../../apps/web/src/components/shared/Nav.tsx)                           | Header share/save behavior.                                                          |
| [`apps/web/src/components/shared/StickyActionBar.tsx`](../../apps/web/src/components/shared/StickyActionBar.tsx)   | Cross-report fixed actions and responsive branch.                                    |
| [`apps/web/src/components/analysis/AIVerdictBlock.tsx`](../../apps/web/src/components/analysis/AIVerdictBlock.tsx) | Deterministic verdict presentation and stale naming.                                 |
| [`apps/web/src/lib/investorCalc.ts`](../../apps/web/src/lib/investorCalc.ts)                                       | Frontend scenario, expense, equity and metric enrichment; primary evidence for R-01. |
| [`apps/web/src/components/analysis/ListingVisual.tsx`](../../apps/web/src/components/analysis/ListingVisual.tsx)   | Photo rendering and the zero-photo honesty fix.                                      |

## API, persistence and data providers

| Evidence                                                                                                   | What it establishes                                                     |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`apps/api/src/app.ts`](../../apps/api/src/app.ts)                                                         | CORS, global rate limiting, logging, route registration and health.     |
| [`apps/api/src/routes/address.ts`](../../apps/api/src/routes/address.ts)                                   | Geocode safeguards and manual-entry defaults.                           |
| [`apps/api/src/routes/scrape.ts`](../../apps/api/src/routes/scrape.ts)                                     | Scraper orchestration, provider handling and property mapping.          |
| [`apps/api/src/routes/analysis.ts`](../../apps/api/src/routes/analysis.ts)                                 | Full analysis pipeline, fallbacks, external calls and assembled result. |
| [`apps/api/src/routes/analysisToken.ts`](../../apps/api/src/routes/analysisToken.ts)                       | Public report retrieval/status.                                         |
| [`apps/api/src/routes/overrides.ts`](../../apps/api/src/routes/overrides.ts)                               | Share-token mutation policy.                                            |
| [`apps/api/src/services/supabaseService.ts`](../../apps/api/src/services/supabaseService.ts)               | Row mapping, comps, ownership, override and analysis persistence.       |
| [`apps/api/src/services/comparableSalesService.ts`](../../apps/api/src/services/comparableSalesService.ts) | Repliers sample provenance and Ontario no-data behavior.                |
| [`apps/api/src/services/anthropicService.ts`](../../apps/api/src/services/anthropicService.ts)             | Deterministic narrative templates despite legacy service name.          |
| [`apps/api/src/constants/cmhcVacancy.ts`](../../apps/api/src/constants/cmhcVacancy.ts)                     | Indicative vacancy assumptions and their limitations.                   |
| [`supabase/migrations/20260610_initial_schema.sql`](../../supabase/migrations/20260610_initial_schema.sql) | Core tables, missing analysis status and override uniqueness.           |

## Calculations and extraction

| Evidence                                                                                                   | What it establishes                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`services/calc-engine/calculations/deal_score.py`](../../services/calc-engine/calculations/deal_score.py) | Investor component weights, normalization, display floor and severe gate. |
| [`services/calc-engine/calculations/investment.py`](../../services/calc-engine/calculations/investment.py) | Mortgage, income, expenses and stress calculations.                       |
| [`services/calc-engine/routers/analysis.py`](../../services/calc-engine/routers/analysis.py)               | Mode handling, extraction, scoring and SunScout orchestration.            |
| [`services/calc-engine/extraction/regex_rules.py`](../../services/calc-engine/extraction/regex_rules.py)   | Deterministic risk-pattern floor.                                         |
| [`services/calc-engine/extraction/logic_gate.py`](../../services/calc-engine/extraction/logic_gate.py)     | Confidence merge and per-mode severity.                                   |
| [`services/calc-engine/constants/flag_matrix.py`](../../services/calc-engine/constants/flag_matrix.py)     | Mode-specific flag policy.                                                |
| [`services/calc-engine/sunscout/sun_path.py`](../../services/calc-engine/sunscout/sun_path.py)             | Solar modeling inputs and assumptions.                                    |
| [`services/calc-engine/sunscout/obstruction.py`](../../services/calc-engine/sunscout/obstruction.py)       | OSM obstruction coverage and inferred-floor method.                       |
| [`services/calc-engine/tests/test_regression.py`](../../services/calc-engine/tests/test_regression.py)     | Unit 5702 Buttermill and Hamilton calculation fixtures.                   |

## Accounts, billing and claims

| Evidence                                                                                                       | What it establishes                                        |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`apps/web/src/pages/AccountPage.tsx`](../../apps/web/src/pages/AccountPage.tsx)                               | Fixture user, reports, invoices, usage and local settings. |
| [`apps/web/src/pages/PasswordResetRequestPage.tsx`](../../apps/web/src/pages/PasswordResetRequestPage.tsx)     | Reset-email false confirmation.                            |
| [`apps/web/src/pages/PasswordResetConfirmPage.tsx`](../../apps/web/src/pages/PasswordResetConfirmPage.tsx)     | Working password-update path after recovery.               |
| [`apps/web/src/lib/services/authService.ts`](../../apps/web/src/lib/services/authService.ts)                   | Available authentication/reset functions.                  |
| [`apps/web/src/constants/tiers.ts`](../../apps/web/src/constants/tiers.ts)                                     | Web free-tier allowance constant.                          |
| [`apps/api/src/constants/tiers.ts`](../../apps/api/src/constants/tiers.ts)                                     | API free-tier allowance constant.                          |
| [`apps/web/src/hooks/useTier.ts`](../../apps/web/src/hooks/useTier.ts)                                         | Tier resolution and silent failure-to-free behavior.       |
| [`apps/web/src/components/paywall/UpgradeModal.tsx`](../../apps/web/src/components/paywall/UpgradeModal.tsx)   | Paid feature claims and inactive upgrade action.           |
| [`apps/web/src/components/paywall/HardLimitGate.tsx`](../../apps/web/src/components/paywall/HardLimitGate.tsx) | Quota/reset copy and inactive upgrade action.              |
| [`apps/web/src/pages/StripeWelcomePage.tsx`](../../apps/web/src/pages/StripeWelcomePage.tsx)                   | Post-purchase feature claims.                              |
| [`apps/api/src/routes/billing.ts`](../../apps/api/src/routes/billing.ts)                                       | Checkout/portal behavior and configuration failure states. |
| [`apps/api/src/routes/webhooks.ts`](../../apps/api/src/routes/webhooks.ts)                                     | Stripe webhook handling.                                   |
| [`apps/web/src/pages/legal/legalContent.ts`](../../apps/web/src/pages/legal/legalContent.ts)                   | User-facing legal/data limitations.                        |

## Quality and operational record

| Evidence                                                           | What it establishes                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)       | CI gates and branch trigger scope.                                                 |
| [`docs/AGENT_HANDOFF.md`](../AGENT_HANDOFF.md)                     | Last verified test counts, live-run history, deployment state and queue.           |
| [`docs/DECISIONS.md`](../DECISIONS.md)                             | Accepted product/engineering decisions and rejected alternatives.                  |
| [`docs/TESTING.md`](../TESTING.md)                                 | Required testing practices and scenario inventory.                                 |
| [`docs/propscout_platform_spec.md`](../propscout_platform_spec.md) | Product intent, entitlements, report contracts and older claims checked for drift. |

## Evidence limitations

- This audit is a static repository and existing-test-record review. It does not claim that dashboard-only environment configuration matches every deployed service today.
- It does not perform new production writes, billing events, migrations or deployments.
- Current provider availability and commercial data licences require owner/vendor confirmation.
- Recommendations involving Ontario law, regulated financial advice, privacy or data licensing require qualified legal/domain review before implementation.

## Review trail

- [Independent review](../audit-review/SOURCE_MAP.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Review addition completed:** the map now includes `investorCalc.ts`, both tier constant files, `cmhcVacancy.ts`, the calculation regression fixture, `ListingVisual.tsx`, and the password-reset confirmation page.
- **Audit process:** pin the inspected commit and apply confirmed/inferred/unknown labels to findings rather than only defining them.
