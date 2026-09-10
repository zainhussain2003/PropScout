# Verification response to the counter-review

**Received:** 2026-09-10

The following response is preserved verbatim so concessions, qualifications and open items are not lost.

Verification complete. The counter-review is right on both rejections, and I was wrong on both.
R-05 — conceded fully. TenantReportContent is unreachable dead code. The outer block at ReportPage.tsx:1141 is !loading && !notFound && !loadFailed && analysis && listing — strictly more restrictive than the early return at :1105, which needs only !loading && !notFound && analysis && listing && mode === 'tenant'. There is no state where the outer block renders tenant content but the early return didn't already fire. My error was mechanical: I read the guard at 1105, saw TenantReportContent at 1153, and never checked the enclosing conditional. That's a sloppy inference dressed as a correction, and it's exactly the kind of thing my own review criticised the audit for.
R-03 — conceded, and it's worse than they said. Listing.propertyType is typed PropertyType, non-nullable. Both callers coerce before persistence: address.ts:285 → 'condo', scrape.ts:259 → mapPropertyType() which also returns non-nullable. So listingToRow's ?? null can never fire from a type-correct caller, and rowToListing's ?? 'detached' is unreachable from any current write path. No flip, and the fallback is dead defensive code for legacy rows only.
R-08 — withdraw entirely, not correct it. cat docs/product-audit/\*.md | grep -c . returns exactly 1,553. Both numbers were right, measuring different things; I compared their non-blank count to my total and called it an error. The only residual point is that a line count should state its basis — a much weaker observation than "the number is wrong," and I should not have framed it as a credibility issue.
The two write paths default the same unknown to opposite values — and the scrape path's inline comment explicitly argues against the address path's choice:
Unknown — default to 'detached' rather than 'condo' since the latter triggers the synthetic condo_fee_unknown flag (often a false positive). Detached is the more common Ontario type and doesn't carry a fee assumption.
So one path makes a documented, reasoned decision to avoid condo; the other silently picks condo and triggers the very false-positive flag the first path was written to prevent. Identical unknown, opposite property type, opposite fee-flag behaviour, depending only on whether the user pasted a URL or typed an address.
That's the real finding, and it's the right target for item #7's word "consistently."
tier: 'free' — correct, and it relocates the defect. tier appears once in anthropicService.ts, at line 11 in the input interface, and is never read. So it is inert. Differentiation is delivered by frontend truncation instead — TruncatedVerdict at ReportPage.tsx:941 blurs paragraph two for free users on one full narrative. That's a coherent design.
Which means my "paid-promise defect" framing was wrong, and the accurate finding is different from both of ours: CLAUDE.md's "AI narrative length by tier" table (60–120 free / 150–320 Pro) describes a mechanism that doesn't exist. The promise is met by gating, not by generation. The stale artefact is the spec, and per the repo's own rule — "a stale spec is worse than no spec" — that's what needs updating.
RLS — fair. My narrow claim ("close to decorative for anything going through the API") was accurate; the follow-on sentence about "one layer" overstated it. The browser holds an anon-key client for Supabase Auth by design, so RLS is the genuine and only boundary on that surface. Two surfaces, two boundaries.
Rent-control conditionality — agreed, and it strengthens the case. It's a further argument for asking the landlord's task first, since the legal exposure only exists on the sitting-tenant renewal path. It also belongs on the tenant side regardless, where the person signing the lease needs to know whether future increases are guideline-capped.
I accept it. Moving R-01 from my #7 to #4 is better than my ordering — it's cheap and it blocks the calibration work.
One question worth settling explicitly: #5 is the last remaining P0, sitting below three P1s. I think that's correct, because items 1–3 are hours of work each and remove P0-class false statements, while owner-only overrides needs an auth-capability design. But it should be a stated decision rather than an artefact of the list, with a note that #5 doesn't slip further.
Several substantive items from my review got no response either way:

- calculate_break_even_rent(..., include_management: bool = False) — the asymmetric default that makes reintroducing R-01 a one-line mistake, even though the router currently passes it consistently
- API-06 — a fresh Realtor.ca scrape overwriting the listing row that 30-day-old share links join to, silently changing an already-delivered report. Distinct from D-028 and under-prioritised
- The evidence vocabulary (confirmed/inferred/unknown) defined in the audit README and applied to zero findings — the control that would have caught R-06 before I did
- investorCalc.ts absent from SOURCE_MAP.md — the file behind two P1s
- Obstruction coverage — the reports already print it (5 of 12 heights known, ~42%), so the suppression threshold is implementable now
- "True monthly cost" — $1,145 of $4,722 is model output (24%), and the largest estimated line depends on a build year the report marks unknown
- Effort sizing — still absent, and the constraint is a budget handoff
- Share-link mutability × the agent-sharing recommendation — the personal report tells users to hand a tamperable link to an interested professional
  Two of my five headline corrections were wrong, one should be withdrawn, and two framings were too strong. R-01, R-02, R-04, R-06 and the CI qualification stand. The exchange has left the finding set more accurate than either document alone — which is the point — but my error rate on the corrections was high enough that the two survivors I'd most want re-checked by someone else are R-01's mechanism and R-06's reachability, since both turn on the same kind of control-flow reading I got wrong twice.
  No files changed.
