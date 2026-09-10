# Account, authentication, billing and paywall audit

## Executive assessment

Authentication and basic Stripe service code exist, but the visible account and upgrade experience is not a truthful production feature. Several screens confirm actions that did not occur or present fixture data as the current user's data. These are launch blockers under PropScout's no-fabrication rule.

## Account dashboard

`AccountPage.tsx` contains a hard-coded user named Marcus Reilly, eight saved analyses, usage counts, renewal dates and three paid invoices. The cards link to `#report/a1`-style paths rather than canonical `/r/:token` routes. Profile fields and notification switches are local component state. “Analyze new listing” has no action. The sidebar is always passed `tier="free"` even when the page has resolved another tier.

| ID   | Severity | Finding                                                                                 | Required response                                                                               |
| ---- | -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A-01 | P0       | Fictional identity, reports, usage and invoices are shown as user data.                 | Replace with authenticated API data or an honest empty/unavailable account state before launch. |
| A-02 | P1       | Saved report links are invalid and Save actions do not persist.                         | Build authenticated ownership/attachment and use canonical tokens.                              |
| A-03 | P1       | Profile and notification controls appear persistent but are not saved.                  | Disable/remove until endpoints and confirmation/error states exist.                             |
| A-04 | P1       | Notifications promise rent drops, comparable sales and digests without monitoring jobs. | Remove them or label as planned; do not accept preferences for a service that never runs.       |
| A-05 | P2       | Sidebar tier is hard-coded free.                                                        | Pass resolved tier and represent lookup error separately.                                       |
| A-06 | P1       | Usage derives from fixture report count rather than server quota.                       | Establish server-side metering and show its as-of period.                                       |

The database has `portfolio_properties`, but a table is not a product. There is no complete save, list, update, monitor or portfolio-analysis journey.

## Authentication

### Working foundation

- Supabase session support exists.
- Email/password and magic-link service functions exist.
- Password update after recovery calls the authentication service.
- Protected API routes such as `/me` validate bearer sessions.

### Findings

| ID   | Severity | Finding                                                                                                                | Required response                                                                                                                      |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| A-07 | P1       | Password reset request sets a local submitted flag and says an email was sent without calling `resetPasswordForEmail`. | Wire the service, validate email, show loading, and only show neutral anti-enumeration success after the provider accepts the request. |
| A-08 | P2       | Magic-link confirmation declares expiry after six seconds if no session event arrives.                                 | Inspect the callback/session once, allow network recovery, and surface provider errors rather than using a short timer as evidence.    |
| A-09 | P1       | Guest analyses are not claimed after sign-in.                                                                          | Create a one-time, authenticated claim operation with ownership checks and audit trail.                                                |
| A-10 | P2       | Tier fetch failure silently appears as free.                                                                           | Return `loading                                                                                                                        | resolved | unavailable`; do not upsell a paid user because the API failed. |

## Billing

The backend checkout, portal and webhook paths exist and intentionally return service-unavailable responses when Stripe is not configured. That is a good failure mode. Billing readiness still depends on exact product configuration, webhook verification and entitlement enforcement.

Critical UI gaps:

- The global Upgrade modal's “Upgrade now” button has no handler.
- The Hard Limit Gate's “Upgrade now” button has no handler.
- Pricing cards need tracing to confirm which ones initiate checkout versus only display.
- `/welcome-to-pro` claims portfolio tracker and SunScout 3D are unlocked although those experiences are incomplete.
- The account page displays fixture invoices and renewal dates.
- There is no visible handling for `past_due`, incomplete or webhook-delay states.

## Entitlements and quota

Entitlements are scattered across page-level checks, paywall components and the resolved tier. UI gates are not sufficient protection for paid server features.

Define one server-owned capability matrix:

```text
capability: report.tenant | report.sale | verdict.full | financing.edit
            pdf.export | report.save | sun.obstruction | branding.pdf
decision: allowed | quota_exhausted | upgrade_required | unavailable
reason + reset_at + current_usage
```

The client should render the server decision. PDF, saving and expensive analysis endpoints must also enforce it.

The landing page says three sale-listing reports per month while the development Hard Limit Gate is mounted with 10 of 10 and “32 days.” A real reset date must come from the server; a monthly cycle cannot always reset in 32 days.

## Paid-claim inventory

| Claim                           | Current state                                                            | Decision before charging                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Unlimited all four report types | Four modes exist, landlord live route is wrong.                          | Fix route parity and enforce quota server-side.                                                            |
| Full verdict                    | Deterministic narrative exists.                                          | Define actual free truncation and ensure no evidence is hidden in a way that makes the free result unsafe. |
| Financing sliders               | Investor UI has them, but score can remain tied to original assumptions. | Recompute or label scenario separation.                                                                    |
| SunScout obstruction/3D         | Obstruction math exists; presentation is not a complete 3D product.      | Rename the benefit to what exists or build the promised visualization.                                     |
| Branded PDF                     | PDF route exists; branding/white-label needs end-to-end verification.    | Verify entitlement, layout and error states.                                                               |
| Portfolio tracker               | Schema/demo UI exist; persistence journey is absent.                     | Do not advertise until real.                                                                               |
| Notifications/monitoring        | UI fixtures only.                                                        | Remove from account until jobs and delivery exist.                                                         |

## Recommended release boundary

Before public account access or paid checkout:

1. Replace all account fixture data with authenticated queries and honest empty states.
2. Make reset email, save, checkout, portal and report links functional.
3. Remove all unbuilt benefit claims.
4. Enforce entitlements and quotas on the server.
5. Test signup, sign-in, recovery, checkout, webhook update, cancellation, expiry and guest-report claim in a non-production billing environment.

No production billing test should occur without the owner's explicit approval.

## Review trail

- [Independent review](../audit-review/ACCOUNT_AUTH_BILLING_AND_PAYWALL.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Retained additions:** describe account invoices as fabricated financial records on a live route; record the 10-versus-3 allowance conflict as P1; decide a server capability matrix before wiring local paywall buttons; verify guest-report claiming and Stripe webhooks.
- **Tier clarification:** hardcoded narrative tier has no runtime effect today; any unsupported Pro narrative-length promise belongs to specification/claim reconciliation.
