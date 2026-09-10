# PropScout product audit

**Audit date:** 2026-09-10

**Branch inspected:** `feat/address-input-and-mobile`

**Scope:** the complete user journey, four report modes, shared UI, data and calculation pipelines, accounts, billing, persistence, security, testing, deployment, and product claims.

This folder is an evidence-led assessment of the product as it exists. It proposes remedies but does not authorize or implement them. No recommendation should be treated as a settled product decision until the owner approves it and the decision is recorded in `docs/DECISIONS.md`.

## How to read the audit

Severity means:

| Level  | Meaning                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **P0** | Can expose or corrupt another user's data, assert a materially false fact, or make the product unsafe to launch.         |
| **P1** | Breaks a primary journey, changes a financial conclusion incorrectly, or makes a paid promise the product cannot fulfil. |
| **P2** | Materially reduces trust, clarity, accessibility, or maintainability.                                                    |
| **P3** | Refinement that can wait without invalidating the result.                                                                |

Evidence states are **confirmed** (directly observed in code/data), **inferred** (strong implication requiring runtime verification), and **unknown** (the product lacks the evidence required to answer).

## Documents

| Document                                                                               | Coverage                                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [END_TO_END_USER_JOURNEY.md](./END_TO_END_USER_JOURNEY.md)                             | Landing through input, mode choice, analysis, report, retry, save and share.     |
| [TENANT_REPORT_AUDIT.md](./TENANT_REPORT_AUDIT.md)                                     | Tenant report, all 12 sections and its scoring method.                           |
| [PERSONAL_REPORT_AUDIT.md](./PERSONAL_REPORT_AUDIT.md)                                 | Personal buyer report and home score.                                            |
| [INVESTOR_REPORT_AUDIT.md](./INVESTOR_REPORT_AUDIT.md)                                 | Investor report, section coverage, provenance and presentation.                  |
| [INVESTOR_METHOD_RESEARCH.md](./INVESTOR_METHOD_RESEARCH.md)                           | Deeper investor methodology, user profiles and hold-case research.               |
| [HAMILTON_CURRENT_LISTING_CALIBRATION.md](./HAMILTON_CURRENT_LISTING_CALIBRATION.md)   | Real current-listing calibration and source caveats.                             |
| [LANDLORD_REPORT_AUDIT.md](./LANDLORD_REPORT_AUDIT.md)                                 | Landlord demo/live divergence and section-level review.                          |
| [SHARED_UI_AND_COMPONENTS.md](./SHARED_UI_AND_COMPONENTS.md)                           | Navigation, gauges, actions, responsive layout, theme and accessibility.         |
| [DATA_PROVENANCE_AND_EVIDENCE.md](./DATA_PROVENANCE_AND_EVIDENCE.md)                   | Every external and derived data source, gaps, confidence and refresh needs.      |
| [SCORING_CALCULATIONS_AND_NARRATIVE.md](./SCORING_CALCULATIONS_AND_NARRATIVE.md)       | Scores, financial math, deterministic prose, extraction and assumption handling. |
| [ACCOUNT_AUTH_BILLING_AND_PAYWALL.md](./ACCOUNT_AUTH_BILLING_AND_PAYWALL.md)           | Authentication, account pages, subscription state, quotas and paid claims.       |
| [API_DATABASE_SECURITY_AND_RELIABILITY.md](./API_DATABASE_SECURITY_AND_RELIABILITY.md) | Tokens, ownership, state machine, validation, resilience and privacy.            |
| [TESTING_DEPLOYMENT_AND_OPERATIONS.md](./TESTING_DEPLOYMENT_AND_OPERATIONS.md)         | Test coverage, CI, environments, monitoring and operational readiness.           |
| [PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.md](./PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.md)   | Marketing, pricing, FAQ and legal claims checked against implementation.         |
| [SOURCE_MAP.md](./SOURCE_MAP.md)                                                       | Primary repository evidence used by the cross-product audit.                     |
| [MASTER_ROADMAP.md](./MASTER_ROADMAP.md)                                               | Proposed order of work, dependencies and acceptance criteria.                    |

## Review trail

- Independent review: [`docs/audit-review/README.md`](../audit-review/README.md)
- Counter-review and final reconciliation: [`COUNTER_REVIEW_RECONCILIATION.md`](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- Final settled/withdrawn disposition and verified control inventory: [`FINAL_REVIEW_CONFIRMATION.md`](../audit-review/FINAL_REVIEW_CONFIRMATION.md)
- Line-count basis: **1,553 nonblank lines; 2,128 physical lines** in the original 17-file audit set.
- Tree inspected: `6dfe200e96119341c58ed90606b2bfd28ccf2b26`.

## Highest-priority findings

1. **P0 — fabricated account content:** `/account` presents a named fictional user, eight fictional saved analyses and fictional invoices as if they belong to the signed-in visitor. This violates PropScout's core evidence rule.
2. **P0 — shared-report mutation:** flag override routes authorize by public share token alone. Anyone with a report link can add or remove dismissals, and those dismissals influence a later recalculation.
3. **P1 — failures cannot be represented:** analysis status updates are no-ops and status is inferred only from whether metrics exist. A failed job remains `pending`; the analyzing page has no deadline and can poll indefinitely.
4. **P1 — unknown manual-entry facts become facts:** missing property type defaults to condo, missing beds/baths and parking default to zero, and database reads default a missing property type to detached. These defaults can alter costs, comps and displayed property facts.
5. **P1 — live landlord report is the investor report:** the canonical shared route renders `InvestorReportContent` for both modes. The richer landlord page is used only by its standalone route and still feeds fixture rent comps into live data.
6. **P1 — paid promises exceed implementation:** upgrade and welcome screens advertise portfolio tracking and SunScout 3D; core save actions are no-ops, account data is mocked, and some upgrade buttons have no checkout handler.
7. **P1 — password-reset false confirmation:** the reset request page says an email was sent without calling the available password-reset service.
8. **P1 — data provenance is too coarse:** rental comps are real scraped asking rents, but the report stores only aggregates. Users cannot inspect source, date, location, size or similarity, and the product can overstate comparability.

## What is strong today

- The investment finance implementation uses Canadian semi-annual mortgage compounding and has been independently reproduced to the dollar in the investor research.
- The investor score does not use assumed appreciation to rescue weak income economics.
- The report now uses deterministic backend narrative assembly; language-model output does not set prices, scores or prose.
- Unknown photos and build year are handled honestly after recent fixes.
- Ontario comparable-sales absence is shown rather than filled with synthetic data; Tacoma Repliers records remain visibly labelled sample data.
- The tenant report has the broadest and most honest live section coverage, including explicit incomplete states.
- The repository has a large unit/integration baseline: 939 web, 232 API, 397 calculation-engine and 180 scraper tests at the last verified run.

## Audit boundary

This review did not alter application code, calculation constants, schemas, infrastructure, or production data. The Markdown files in this folder are the only intended changes.
