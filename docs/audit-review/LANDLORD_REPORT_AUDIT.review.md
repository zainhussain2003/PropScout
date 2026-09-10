# Review — `LANDLORD_REPORT_AUDIT.md`

**Verdict: the diagnosis is right and the proposed method is the best product
thinking in the audit. One finding (L-02) overstates present exposure — the
fixture leak is latent, not active — and the sequencing consequence of that
matters.**

## Verified

**L-01 — live landlord mode renders the investor report.** Confirmed.
`ReportPage.tsx:1143` gates on `(mode === 'investor' || mode === 'landlord')`
and renders `InvestorReportContent`, with `:936` switching only the breadcrumb
label via `viewLabel={mode === 'landlord' ? 'Landlord view' : 'Investor view'}`.

So a landlord who asks "what should I charge?" receives an acquisition
underwriting report — cap rate, DSCR, cash-to-close, OSFI stress test, equity
build — with a relabelled breadcrumb. For an owner who already holds the unit,
most of that is not merely unhelpful; cash-to-close and stress-test output are
meaningless. P1 is right.

**L-03 — the live backend score is the investor acquisition score.** Confirmed:
all modes run the same calc payload and `deal_score.py`. This is the same root
cause as S-06 in the scoring audit, correctly cross-referenced.

**L-04 — the standalone route and the shared route are different products.**
Confirmed. `App.tsx:47` mounts `<LandlordPage tier={tier} />` at
`/landlord-report`; `/r/:token` never reaches it.

## Correction — L-02 describes a latent defect as an active one

The document states the specialized page "uses a hard-coded Toronto comp fixture
**even when passed a real analysis**", and the executive assessment says "the UI
**can** show plausible rent positioning unrelated to the subject property".

The code half is accurate:

- `LandlordPage.tsx:290–297` accepts `analysis` and `listing` props and computes
  `isReal = !!(realAnalysis && realListing)` at `:307`.
- `:385` — `computeRentPositioning(askingRent, LL_RENT_COMPS)` and `:457` —
  `comps={LL_RENT_COMPS}` both use fixtures **unconditionally**, ignoring
  `isReal`.

But the reachability half is not. `LandlordPage` is mounted **only** at
`/landlord-report`, **with no props** (`App.tsx:47`), and live landlord traffic
goes to `InvestorReportContent`. There is no code path by which a real analysis
reaches `LandlordPage`, so **no user can currently see fixture comps beside a
live subject property.** Present exposure is nil.

Two consequences:

1. **Severity.** As written today this is **P2** (latent trap), not P1. It
   becomes P1 the moment L-01 is fixed.
2. **Sequencing — this is the important part.** The roadmap puts "Remove fixtures
   from live landlord mode" in Phase 0 and "route landlord live reports away from
   fixture/investor content" in the first slice. Those must be done in that
   order, or in the same change. Wiring the canonical landlord route first
   _activates_ the leak. This is exactly the bug class already fixed once in
   `PBSalesSection` (D-029), where comps were fetched, delivered and then
   rendered from fixtures. The document should say so explicitly — it is the
   strongest available argument for its own recommendation.

## The proposed method is the audit's best product contribution

The three-output split is well judged:

1. **Rent evidence** — supported range and confidence from comparable active
   asking rents.
2. **Operating margin** — rent minus property-level operating expenses,
   _excluding owner-specific mortgage by default_.
3. **Readiness / risk** — evidence completeness and legal/lease questions.

Excluding the mortgage by default is the key insight and it is correct. An
existing owner's financing is a fact about them, not the property; folding it
into a "landlord score" produces a number that changes when the owner
refinances, which is nonsense for a pricing decision. This is the same
property/equity separation the investor research argues for, applied
consistently — good sign of a coherent method rather than ad-hoc fixes.

The recommendation that a single summary badge express **evidence readiness**
rather than a pseudo-precise score is also right, and is the honest answer given
that asking-rent aggregates are the only rent evidence available.

The "ask the landlord task first" recommendation (pricing / renewal / refinance /
acquisition) is necessary — without it the report cannot know whether financing
is relevant. Note the tension with `D-021`'s deliberate two-field minimalism and
with the existing `ModeModal`: this would be a _third_ question before an answer.
Defensible, but it should be an explicit decision rather than an implied one.

## Gaps

1. **Ontario rent control is listed as missing evidence but not as a correctness
   risk.** A landlord report that suggests an asking rent without establishing
   whether the unit is rent-controlled (pre-November 2018 occupancy) can suggest
   an _unlawful_ increase for a sitting tenant. That is a legal-exposure finding,
   not just a data gap, and it deserves its own severity. It is the one place in
   this audit where a wrong number could put a user in breach of the Residential
   Tenancies Act.
2. **No position on whether landlord mode should ship at all in the first
   release.** Given that the live route is the wrong report, the score is the
   wrong score, and the specialized page is fixture-bound, "defer landlord mode
   and remove it from the mode modal for launch" is a legitimate option the
   document does not evaluate. It would be cheaper than building the method and
   would remove a P1 from the launch path.
3. **The STR row says "Remove from a long-term rental decision report"** — agreed,
   and this connects to the investor audit's finding that the "STR legality ·
   live" label is a static table. Same defect, two documents, no cross-reference.
4. **No acceptance criterion for the asking-vs-leased distinction being
   _visible_.** The criteria say the report "never calls an asking-rent aggregate
   a leased-rent comparable", which is a prohibition. The positive requirement —
   that the UI states "active asking rents" wherever the band appears — is what
   an implementer needs.

## Bottom line

Right diagnosis, right method, one mis-scoped severity. Downgrade L-02 to P2
today, state that fixing L-01 first would promote it to P1, and add Ontario
rent-control status as a rated legal-exposure finding rather than a bullet in a
missing-evidence list. Consider whether landlord mode should be deferred out of
the first release entirely.
