# Review — `END_TO_END_USER_JOURNEY.md`

**Verdict: accurate and well structured.** Every specific claim I checked
verified, including three that are easy to dismiss as nitpicks and are not. Its
central sentence is the best one-line summary of the product's current state:

> the product UI looks more complete than the underlying state machine, account
> system and paid actions actually are.

## Verified

| Claim                                                       | Result                                                                                                                                                                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zillow.ca advertised while the scraper is deferred (J-01)   | **Confirmed.** `LandingPage.tsx:1128` lists `'Zillow.ca'`; `validateUrl.ts:21` accepts `zillow.ca` and `:25` says "We currently read Realtor.ca and Zillow.ca". The scraper is in `services/scrapers/_unported/`. |
| "Switch later from inside the report" with no switcher      | **Confirmed.** `ModeModal.tsx:707`. No mode switch exists anywhere in the report surfaces.                                                                                                                        |
| ModeModal runs delay theatre                                | **Confirmed.** `setProgress(Math.min(p, 100))` then `setTimeout(() => onSelect(k), 250)` at `:468–471`, with "Opening your report · {progress}%" at `:650`. Nothing is being measured.                            |
| `updateAnalysisStatus` no-op → failures stay pending (J-06) | **Confirmed.** See the API review.                                                                                                                                                                                |
| Duplicate report implementations per mode                   | **Confirmed.** `ReportPage.tsx` has its own `InvestorReportContent` (`:860`) and `TenantReportContent` (`:695`) alongside the standalone pages.                                                                   |
| Manual-entry defaults table                                 | **Confirmed.** `address.ts:270–275`: `beds ?? 0`, `baths ?? 0`, `propertyType ?? 'condo'`, `parkingSpots: 0`. Property type is indeed not collected by the UI.                                                    |
| Scraper property-type mapping defaults to `detached`        | **Confirmed** on the read path at `supabaseService.ts:133`.                                                                                                                                                       |

The Zillow finding deserves emphasis. It is not just marketing copy: the
**validator actively accepts** the domain, so a user who pastes a Zillow.ca link
passes client validation and then fails at scrape. The failure looks like a
product bug rather than an unsupported source. J-01's severity of P1 is right.

## Correction

**R-05 — `TenantReportContent` is not obsolete; it is a reachable degraded
path.** The document says a "second, obsolete `TenantReportContent` remains in
`ReportPage` even though the live tenant path returns earlier." The early return
at `ReportPage.tsx:1105` is guarded:

```
if (!loading && !notFound && analysis && listing && mode === 'tenant')
```

When `listing` is null — precisely the degraded case — the guard fails and the
older `TenantReportContent` at `:1153` renders instead. So the product shows a
_different, older tenant report_ exactly when its data is most incomplete. That
is a worse defect than dead code and the remedy differs: it needs the fallback
behaviour defined, not just the component deleted. `MASTER_ROADMAP.md` phase 1
item 3 ("Remove obsolete `TenantReportContent`") inherits the same error.

## Where I would push harder

**J-05 — the sixty-second claim.** The document rates it P2 and suggests
"typically". I would rate it **P1** and remove the number entirely for now. It
appears three times (`:2004`, `:2011`, `:2828`), it is stated as "every time",
and the product has no production latency instrumentation at all — so there is no
percentile to substitute. A measured claim requires measurement that does not
exist; the honest interim is no claim.

**J-11 — reload retriggers analysis.** Rated P2. Given that each analysis calls
the scraper, Haiku extraction, Sonnet-free narrative assembly, Mapbox, Walk
Score, Google Places and Overpass, a refresh loop is a cost and rate-limit
event, not just "wasted compute". With the global limit at 10 req/min it can
also lock the user out of their own report. **P1.**

**Progress theatre is a trust finding, not a UX finding.** J-09 (progress steps
claim comps/neighbourhood/investment regardless of mode or success) and the
ModeModal fake bar are the same defect as "No flags detected" being ambiguous:
the UI asserts that work happened. For a product whose entire pitch is evidence
provenance, animating a claim that comps were fetched when the fetch failed is a
content-integrity issue. It should be cross-referenced into
`PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.md`, where it currently is not.

## Gaps

1. **No coverage of the `/analyzing` → report handoff failure mode.** J-07 and
   J-08 cover polling, but not what happens if `POST /analysis` succeeds and the
   client navigates away before the token is persisted client-side. The token is
   the only handle on the report; if it is lost before the user reaches `/r/:token`
   the analysis is orphaned and paid-for work is unrecoverable. Worth a finding.
2. **Address path validation is praised without noting its cost.** The document
   rightly calls the relevance gate and postal-code requirement "a strong
   safeguard". It does not note the consequence the provenance audit does reach:
   for address entry, rent and expenses are _always_ estimated, so under the
   proposed confidence ceiling an address-entered report can never earn a positive
   verdict. That is a journey-level consequence of the primary input path and
   belongs here.
3. **Section 6 ("Share, save and export") does not say which share control
   works.** It notes the header "Share link" has no handler and that the body copy
   works, but a reader cannot tell what a user actually experiences. The report
   body's control does copy; the nav control is inert. Two controls labelled the
   same, one working — that framing makes the fix obvious.
4. **Mermaid diagram omits the failure edges it later argues for.** The flowchart
   shows `G -->|Error| I[Retry or start over]`, which is the state the document
   proves cannot exist. A diagram of the _actual_ machine (pending → complete
   only) would make J-06 self-evident.

## Bottom line

Accurate, and the most readable entry point to the audit. Fix the
`TenantReportContent` characterisation (it is a live fallback, not dead code),
raise the sixty-second claim and the retrigger loop to P1, and cross-file the
synthetic-progress findings into the content-integrity document where their real
severity is visible.
