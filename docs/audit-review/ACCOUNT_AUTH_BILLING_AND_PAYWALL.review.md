# Review — `ACCOUNT_AUTH_BILLING_AND_PAYWALL.md`

**Verdict: accurate, and it contains the single most serious finding in the
audit.** Everything checkable verified. If only one document is acted on, it
should be this one together with the security audit.

## Verified

### A-01 — fabricated account content (its P0)

Confirmed, and worse than "fixture data" conveys:

- `AccountPage.tsx:69` — `const USER = { name: 'Marcus Reilly', email:
'marcus.reilly@example.com', avatarInitials: 'MR', joined: 'March 2026' }`
- `AccountPage.tsx:232` — `const INVOICES` with three rows: `May 24, 2026 ·
Investor Pro · monthly · $10.00 · Paid`, and the same for April and March.
- `App.tsx:49` — `<Route path="/account" element={<AccountPage />} />`. **This is
  a live route, not a demo path.**

The distinction that matters and that the audit could state more forcefully: the
invoices are not lorem-ipsum placeholders, they are **fabricated financial
records marked "Paid"**. Any real user who signs up and opens `/account` sees
another person's name, email and three payments they never made. Under
PropScout's own no-fabrication rule this is the clearest violation in the
codebase, and it is worse than the report-level fabrications already fixed
(invented photo frames, "pre-1980 build") because it concerns money and identity
rather than an estimate.

**P0 is correct.** I would additionally mark it the top item of the entire audit.

### A-07 — password reset false confirmation (its P1)

Confirmed exactly. `PasswordResetRequestPage.tsx` imports only `useState`,
`useNavigate` and `StubState` — **no auth service at all**. It sets
`submitted = true` and renders `headline="Reset link sent."` Meanwhile
`authService.ts:149` exports a working `resetPasswordForEmail(email)` that calls
`client.auth.resetPasswordForEmail` with a correct `redirectTo`.

So the capability exists and is simply not wired. A user locked out of their
account is told help is on the way and waits for an email that will never
arrive. I would rate this **P0-adjacent**: it is a security-flow false
confirmation, and it is a five-line fix.

### Dead upgrade buttons

Confirmed:

- `UpgradeModal.tsx:281` — `<button ...>Upgrade now <Icon name="arrow" /></button>`
- `HardLimitGate.tsx:193` — `<button className="btn btn-accent" ...>Upgrade now</button>`

Neither has an `onClick`. Both sit at the exact moment the product asks for
money. The audit's phrasing "has no handler" is precise.

### Hard-limit gate copy

Confirmed and the audit is careful here: `App.tsx:70` mounts
`<HardLimitGate monthlyLimit={10} used={10} resetsIn="32 days" />` behind a **dev
toolbar** trigger (`App.tsx:96`), and the document says "development Hard Limit
Gate". Good precision — it does not overstate this as user-facing. The "32 days"
observation is nonetheless valid: a monthly cycle cannot always reset in 32 days,
so the string is wrong even as dev copy.

### `tier: 'free'` hardcoded in narrative input

Confirmed at `apps/api/src/routes/analysis.ts:521`. The audit reports this in
`SCORING_...` rather than here, but it belongs in the entitlement discussion too:
a paying user's report is generated with free-tier narrative parameters, which
means the _paid_ narrative length promised in `CLAUDE.md` (150–320 words vs
60–120) is not being delivered by the pipeline regardless of what the UI gates.
That makes it a **paid-promise defect**, not just a naming issue.

## What I would add

### The free-tier allowance diverges three ways and nothing enforces it

The document notes landing copy (3 sale reports) against the dev gate (10 of 10).
The complete picture is worse:

| Source                               | Value                            |
| ------------------------------------ | -------------------------------- |
| `apps/web/src/constants/tiers.ts:18` | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `apps/api/src/constants/tiers.ts:2`  | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `CLAUDE.md` pricing table            | 10 analyses/month                |
| `LandingPage.tsx:2444`               | "3 sale-listing reports / month" |

The advertised figure contradicts the coded constant in both workspaces and the
spec, the _unit_ differs (sale reports vs analyses), and no server-side metering
enforces either. Since this is what a customer is told they are buying, it
belongs in the paid-claim inventory with a severity, not only as a plumbing
note. **P1.**

### The capability matrix is the right answer and should be pulled forward

The proposed server-owned matrix (`capability` × `decision` × `reason` +
`reset_at` + `current_usage`) is the correct design and is currently the only
thing in the document that would prevent the whole class of defect from
recurring. Right now entitlement logic is scattered across `useTier`, individual
paywall components and page-level checks, which is exactly why some buttons gate
and others do nothing. I would sequence this **before** wiring individual
buttons, otherwise each fix re-implements a local policy.

## Gaps and calibration

1. **A-05 (sidebar hardcoded `tier="free"`) is rated P2 but compounds A-10.** If
   tier lookup already fails silently to free (A-10) and the sidebar is
   additionally hardcoded, there are two independent paths that show a paying
   customer a free account. Together that is a billing-trust problem, not two
   cosmetic ones.
2. **"Pricing cards need tracing to confirm which ones initiate checkout versus
   only display" is an unfinished check, presented in the same voice as the
   verified findings.** It should be labelled `unknown` under the audit's own
   evidence key. It is also a ten-minute grep — leaving it open weakens the
   document.
3. **No assessment of what happens to a guest report after sign-in.** A-09 states
   guest analyses are not claimed, but not what the user _sees_ — presumably their
   report simply is not in the account, with no explanation. That is the
   user-visible half of the finding and it is missing.
4. **Stripe test-mode state is not assessed.** The keys in `.env` are test keys
   and `STRIPE_WEBHOOK_SECRET` was never obtained. The document says billing
   "intentionally return[s] service-unavailable responses when Stripe is not
   configured", which is right, but it does not say that webhook verification has
   therefore **never been exercised** — which is the actual readiness blocker for
   charging anyone.

## Bottom line

Correct on every checkable point and correctly severity-ranked. Three changes I
would make: state explicitly that the invoices are fabricated _financial records_
on a _live route_ (the strongest single finding in the audit), promote the
hardcoded `tier: 'free'` narrative input into this document as a paid-promise
defect, and add the three-way free-tier divergence as a rated claim. Build the
server capability matrix before wiring individual buttons.
