# Review — `API_DATABASE_SECURITY_AND_RELIABILITY.md`

**Verdict: accurate. The strongest document in the audit.** Every one of its
three critical integrity findings verified exactly, including the code comments
that admit the problem. This is the document to act on first.

## Verified

### Shared-link mutation (its P0)

Confirmed, and the code documents its own flaw. `apps/api/src/routes/overrides.ts`
header:

> The token here is the analysis share_token (same one used by GET/POST
> /analysis/:token). Anyone with the share token can manage overrides for
> that analysis — same trust model as viewing the report.

`GET`, `POST` and `DELETE` check only `if (!token)`. There is no ownership
check. The audit's claim that dismissals "can affect a later score calculation"
is also confirmed by the same header: `POST /analysis` forwards dismissed flag
IDs to the calc engine so the **stored** `deal_score` converges on the tampered
value.

**Severity: P0 stands.** Balancing the two directions honestly:

- _Mitigating_ — it requires the share link, which the owner deliberately
  distributed, and tokens are `randomUUID()` (non-enumerable).
- _Aggravating_ — there is no audit trail, no attribution and no versioning, and
  the effect persists into stored data. For a product whose value is a
  trustworthy verdict, a recipient silently altering the risk set is worse than
  a data leak of equivalent size.

The audit's proposed fix (owner auth or a separate high-entropy edit capability
never in the shared URL, plus who/when/why/score-version) is the right shape.

### Analysis failure state does not exist (its P1)

Confirmed exactly:

- `supabaseService.ts:929` — `updateAnalysisStatus` has an empty body and the
  comment "Intentionally a no-op — see getAnalysisStatus."
- `getAnalysisStatus` selects only `calculated_metrics` and returns
  `metrics == null ? 'pending' : 'complete'`.

So `processing` and `failed` are unreachable return values of a function whose
signature advertises all four. A failed job is indistinguishable from a queued
one, forever. The audit's field list (`status`, `failure_code`,
`failure_message_public`, `started_at`, `completed_at`, `attempt_count`,
`analysis_version`, plus a lease/heartbeat if jobs go async) is well judged.

### Override idempotence assumes a missing constraint (its P1)

Confirmed, and this is the sharpest catch in the document:

- `supabaseService.ts:784` — `if (error != null && error.code !== '23505')`,
  commented "23505 = unique_violation; treat as success (idempotent)".
- `supabase/migrations/20260610_initial_schema.sql:170` — the only index is
  `create index flag_overrides_analysis_id_idx on public.flag_overrides
(analysis_id)`. **Non-unique, and on one column.**

So 23505 can never fire on `(analysis_id, flag_id)` and duplicates insert
freely. The code's idempotence is a comment, not a guarantee.

## Where I would adjust

**Downgrade the 23505 finding from P1 to P2.** The description is exact but the
blast radius is smaller than P1 implies:

- `getFlagOverrides` returns a raw `flag_id[]` with no dedupe
  (`supabaseService.ts:767`), so duplicates do reach callers.
- The report UI consumes them as a `Set` (`flagOverrides.overrides.has(...)`),
  so display is unaffected.
- The calc engine _drops_ a deduction for a dismissed flag, and dropping the
  same deduction twice is idempotent, so the score is unaffected.
- `deleteFlagOverride` filters on both columns, so cleanup removes all copies.

Net effect today: unbounded row growth and a trap for any future consumer that
counts rather than sets. Real, worth fixing with the proposed unique constraint
plus upsert, but not a P1 alongside a false-invoice page.

## What the document gets right that is easy to miss

**API-06 — listing upsert mutating rows referenced by older reports.** This is
the most under-appreciated finding in the whole audit. It is genuinely distinct
from the blank-URL collision fixed earlier (D-028): a _fresh Realtor.ca scrape of
the same URL_ overwrites the listing row that historical analyses join to.
Stored `calculated_metrics` survive, but the address, price, beds and fees a
30-day-old share link displays can silently change. That breaks reproducibility
of an already-delivered report, and no test covers it. The proposed fix — snapshot
listing facts per analysis, or version listing observations — is correct and
should be sequenced with the evidence-envelope work rather than after it.

**Fail-open on optional sources.** The observation that optional-source failures
"are collapsed to null and generally not observable to the user" is the same
defect class as "No flags detected" being ambiguous. Both are the product
rendering _absence of data_ and _failure to fetch data_ identically. Worth
treating as one finding with one fix (a per-source status envelope) rather than
as separate items in three documents.

## Gaps

1. **RLS is described but its practical irrelevance is understated.** The document
   correctly notes the service-role key bypasses RLS and that "API authorization
   and validation form the primary security boundary." Given that, the RLS
   policies are close to decorative for anything going through the API. A reader
   could come away believing there is defence in depth where there is one layer.
2. **No threat model for the share token itself.** Expiry is covered (30 days),
   but not: does the token appear in Referer headers, analytics, PDF metadata or
   server logs? The document recommends "redacted logging policy for ... share
   URLs", which implies they are currently logged — that deserves to be a finding
   with a severity, not a recommendation in a list.
3. **The privacy section is entirely prospective.** "The audit found no
   corresponding retention/deletion policy" is a real gap, but for a product
   handling Ontario addresses and emails under PIPEDA, the absence of any
   retention policy is arguably itself a P1 launch item rather than a "define
   this" bullet.
4. No estimate of how much of the recommended control set is required _before
   launch_ versus _before scale_. The list reads as uniformly necessary; per-route
   rate limits and correlation IDs are not in the same tier as read-only share
   links.

## Bottom line

Act on this document first. Its two genuine P0/P1 integrity findings are
verified, self-documented in the code, and cheap to fix relative to their harm.
Re-rank the 23505 item to P2, promote API-06 (listing-row mutation) toward the
front because it silently invalidates already-shared reports, and turn the
retention gap into a rated finding rather than a to-do.
