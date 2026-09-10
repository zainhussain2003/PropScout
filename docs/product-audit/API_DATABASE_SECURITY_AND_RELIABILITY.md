# API, database, security and reliability audit

## Architecture

The public Fastify API orchestrates Supabase persistence, scraper, calculation engine and external data providers. Supabase's service-role key is used on the backend and bypasses RLS, so API authorization and validation form the primary security boundary.

## Critical integrity findings

### Shared-link holders can mutate risk dismissals

`GET`, `POST` and `DELETE /analysis/:token/overrides` require only the report's share token. The route comment explicitly gives anyone with the link the same trust as the owner. A share URL is intended for viewing; mutation changes the report's interpretation and can affect a later score calculation.

**Severity: P0.** Shared links should be read-only. Mutation should require an authenticated owner or a separate high-entropy edit capability that is never included in the shared URL. Store who changed a flag, when, why, and which score version resulted.

### Analysis failure state does not exist

The database schema has no analysis status columns. `updateAnalysisStatus` is a no-op. `getAnalysisStatus` returns complete when `calculated_metrics` exists and pending otherwise. Processing and failed states cannot be represented, despite the API and UI behaving as though they can.

**Severity: P1.** Add durable `status`, `failure_code`, `failure_message_public`, `started_at`, `completed_at`, `attempt_count`, `analysis_version` and a lease/heartbeat if jobs become asynchronous. A failure must be terminal until an explicit retry creates a new attempt.

### Override idempotence assumes a missing constraint

The service treats PostgreSQL error `23505` as success when inserting the same `(analysis_id, flag_id)`, but the initial migration creates only a non-unique index on `analysis_id`. Duplicate rows can therefore be inserted, making idempotence depend on behavior the schema does not enforce.

**Severity: P2 today.** Current consumers treat overrides as a set and deletion removes all matching rows, so duplicates do not presently change the score. Add a unique constraint after deduplicating rows and use upsert on the exact key before a future consumer relies on row counts.

## Input validation and unknown values

| ID     | Severity | Finding                                                                                           | Proposed response                                                                                          |
| ------ | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| API-01 | P1       | Manual property type accepts any string cast and defaults missing to condo.                       | Validate an enum; preserve unknown.                                                                        |
| API-02 | P1       | Missing beds, baths and parking become zero.                                                      | Make nullable and distinguish studio/none/unknown.                                                         |
| API-03 | P1       | Database row mapping defaults missing property type to detached.                                  | Return `unknown`; do not make a structural fact from null.                                                 |
| API-04 | P2       | Public identifiers and body sizes lack route-specific schemas in several handlers.                | Use Fastify JSON schemas for type, range, length and response validation.                                  |
| API-05 | P2       | Flag IDs are accepted as arbitrary strings.                                                       | Validate against the versioned flag registry.                                                              |
| API-06 | P2       | Listing upsert by source URL mutates the shared listing row for every prior analysis of that URL. | Snapshot listing facts per analysis or version listing observations; old reports must remain reproducible. |

The last item is distinct from the already-fixed blank-URL collision. A current Realtor.ca scrape can overwrite a listing row referenced by older reports. Stored calculated results remain, but address/facts shown by those reports may change unless the joined listing is snapshotted.

## Authentication and ownership

- Guest analyses use nullable `user_id` and public share tokens.
- Direct Supabase RLS allows users to read their own analyses and manage their own portfolio; other tables have RLS enabled with no client policies.
- Backend service-role calls bypass those policies.
- Save-to-account is not complete.

Required ownership rules:

1. View by unexpired share token returns a redacted immutable snapshot.
2. Edit/recalculate/delete requires authenticated ownership.
3. Guest claim requires possession of token plus a single-use claim secret or same-browser proof, then rotates public/edit capabilities.
4. Billing and portfolio routes derive user ID from verified session, never request body.
5. Expired links return a distinct state and do not reveal existence beyond what is necessary.

## Availability and external services

The API has global CORS, a production rate limit of 10 requests per minute, logging and a basic health route. Scraper and calculation-engine calls have explicit timeout handling. Optional sources often fail open so a report can complete.

Gaps:

- One global IP limit does not reflect endpoint cost. Polling alone can consume it, and shared NAT users can collide.
- Health only proves the Node process responds, not that Supabase, scraper or calc engine is usable.
- There is no durable job queue or retry policy for long analyses.
- Optional-source failures are collapsed to null and generally not observable to the user.
- No structured correlation ID, metrics/trace system or alerting configuration is visible.
- No explicit security-header plugin/CSP is visible in the API; static-host headers require separate verification.
- PDF rendering and scraper/browser services increase SSRF/resource-exhaustion risk and need strict allowlists and budgets.

Recommended controls:

- Per-route rate limits keyed by authenticated user or anonymous session, with stricter analysis creation and looser report reads.
- Dependency readiness endpoint used only by operators, plus public liveness.
- Correlation IDs across API, scraper and calc engine.
- Metrics for latency, failures by code, missing-source rates and fallback use.
- Strict provider URL allowlist before any scraper request.
- Idempotency key on scrape/start/analyze, and bounded attempts.
- Redacted logging policy for listing descriptions, emails, bearer tokens and share URLs.

## Data lifecycle and privacy

Share links expire after 30 days, but the audit found no corresponding retention/deletion policy for analyses, listings, descriptions, generated PDFs or provider responses. Define:

- report and guest-data retention;
- whether expiry disables access or deletes data;
- deletion after account request;
- log retention and secret redaction;
- third-party data licence retention/display rules;
- who can access production through Supabase and hosting dashboards;
- backup/restore objectives and tested recovery.

## Reliability acceptance criteria

- Every analysis reaches exactly one durable terminal state.
- Retrying cannot create inconsistent parallel results for one token/version.
- Historical reports render their original listing and data snapshot.
- Public share links cannot mutate or expose private account details.
- Unknown values remain null through API, database, calculation and UI.
- Optional source failures are visible as source-level status without taking down unrelated sections.
- Load tests validate rate limits and 95th/99th percentile response times for real polling behavior.

## Review trail

- [Independent review](../audit-review/API_DATABASE_SECURITY_AND_RELIABILITY.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Severity calibration:** missing override uniqueness is P2 today because consumers deduplicate semantically, though schema idempotence remains false.
- **Priority addition:** API-06 can silently change an already-delivered report when a fresh scrape overwrites the shared listing row; immutable evidence snapshots belong near the first integrity slice.
- **RLS clarification:** API service-role calls rely on API authorization, while browser/anon-key Supabase access remains protected by RLS. Retention and share-token leakage need explicit threat and privacy review.
