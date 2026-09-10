# Review — `PRODUCT_CLAIMS_AND_CONTENT_INTEGRITY.md`

**Verdict: accurate, and the document with the clearest standard. Its opening
sentence is the right test and the claim matrix is the most directly actionable
table in the audit. Three additions and one omission.**

> A claim is misleading when the product presents a fixture, estimate,
> incomplete scan, inactive control or planned feature as a completed fact.

That is a better standard than "don't fabricate data", because it catches the
four defect classes the audit actually found: fixtures on live routes, estimates
labelled as facts, silence labelled as clearance, and dead controls.

## Verified from the claim matrix

| Claim                                                           | Result                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Any Canadian listing URL"                                      | **Confirmed misleading.** Runtime scope is Ontario; live scraping is Realtor.ca only.                                                                                                                                                                                                                |
| Zillow.ca listed as supported                                   | **Confirmed.** `LandingPage.tsx:1128`; `validateUrl.ts:21,25` actively accepts it. Scraper is in `_unported/`.                                                                                                                                                                                       |
| "Every number in the report has a source, a date, and a method" | **Confirmed false.** `LandingPage.tsx:2191`. Counter-evidence: `cmhcVacancy.ts` header says "placeholder starting values keyed to indicative"; insurance is a flat 0.35%; maintenance is a build-year bracket; DOM and rent trend are service defaults. Neither dates nor methods surface in the UI. |
| "Reset link sent" without a request                             | **Confirmed.** See the account review.                                                                                                                                                                                                                                                               |
| Mode can be switched inside the report                          | **Confirmed.** `ModeModal.tsx:707`; no switcher exists.                                                                                                                                                                                                                                              |
| Portfolio tracker / save advertised                             | **Confirmed.** `portfolio_properties` table exists; no save path.                                                                                                                                                                                                                                    |
| "No flags detected" ambiguity                                   | **Confirmed** as a real ambiguity in the extraction path.                                                                                                                                                                                                                                            |
| Comparable rentals are asking rents                             | **Confirmed.** `rental_listings` holds scraped active asks, not leases.                                                                                                                                                                                                                              |

The "source, date and method" finding is the most damaging one in the audit and
this document is the only place it appears. It is a **meta-claim**: the product
promises the very discipline the audit repeatedly shows it lacks. Every
individual provenance gap elsewhere is also a breach of this one sentence. It
should be the matrix's first row, not its fifth.

## Additions

### 1. The free-tier allowance contradicts the coded constant

Missing from the matrix entirely, and it is a pricing claim:

| Source                               | Value                            |
| ------------------------------------ | -------------------------------- |
| `apps/web/src/constants/tiers.ts:18` | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `apps/api/src/constants/tiers.ts:2`  | `MONTHLY_ANALYSIS_LIMIT: 10`     |
| `CLAUDE.md` pricing table            | 10 analyses/month                |
| `LandingPage.tsx:2444`               | "3 sale-listing reports / month" |

The advertised number contradicts the constant in both workspaces and the spec,
the unit differs (sale reports vs analyses), and nothing enforces either.
**P1** — it describes what a customer is buying.

### 2. Synthetic progress belongs in this document

`ModeModal` animates to 100% and prints "Opening your report · {progress}%"
before a fixed 250 ms `setTimeout` (`:468–471`, `:650`), and the analyzing page's
step labels claim comps, neighbourhood and investment work regardless of mode or
service success (J-09).

Both are the UI **asserting that work happened**. Under this document's own
standard — "presents ... an incomplete scan ... as a completed fact" — that is a
content-integrity breach, not a UX quibble. It is currently rated P2 in the
journey audit and absent here. For a product selling evidence provenance,
animating a claim that comps were fetched when the fetch failed is squarely in
scope.

### 3. "STR legality · live" is a one-word legal-exposure claim

The investor audit rates this Blocked and notes the label is "stronger than a
static code snapshot with no official citation or effective date." In this
document's terms it is a **planned feature presented as a completed fact**, about
**municipal law**, in a report a user may act on. Removing the word "live" is a
one-word change and should not wait behind the rest of the STR work. **P1.**

## Where the document is strongest

**"True monthly cost" should be reconsidered.** Calling it "modeled monthly cost"
because it contains estimated insurance, maintenance, utilities and sometimes tax
is exactly the right instinct, and it is the kind of finding only a careful
reader produces. I would go further: the personal report's $4,722/month figure
contains **$1,145 of pure estimate** (insurance $172 + utilities $237 + maintenance
$736) out of $4,722 — 24% of the headline "true" cost is modelled. The word is
not merely imprecise; it inverts the provenance.

**The estimate-language table** is the most immediately usable artefact in the
audit. "Listing states …" / "You entered …" / "Calculated from …" / "Assumed … as
of …" / "Inferred; confirm …" / em dash plus reason / "Sample data — Tacoma,
Washington" — that is a house style an implementer can apply mechanically. It
should be promoted out of this document into a shared copy standard.

**The AI-language paragraph** is well judged. The proposed user-facing sentence
draws the boundary accurately (rules + structured extraction for language;
versioned calculations and templates for values and prose) without either
overclaiming or hiding the model's involvement.

## Gaps

1. **No assessment of the legal pages against the findings.** The document says
   the legal page's disclaimers are "appropriate" but that "a disclaimer does not
   cure a concrete false UI statement" — correct. It does not check whether the
   privacy policy's data-handling description matches actual behaviour (30-day
   share links, no retention policy, listing descriptions and emails in logs).
   For a PIPEDA-scoped product that is the more consequential legal check.
2. **The fixture-isolation controls are proposed but not tested.** "Automated
   tests fail if fixture IDs/addresses appear on live routes" is the correct
   control and would have caught the landlord fixture leak and the account page.
   It is also cheap — a grep-level assertion over rendered live routes. Worth
   flagging as the highest-leverage single test in the whole audit.
3. **No inventory of where claims live.** The matrix cites "Landing copy",
   "Pricing/FAQ", "upgrade, welcome" — but a fix requires knowing every surface.
   Claims appear in `LandingPage.tsx` (~2,900 lines), `UpgradeModal`,
   `HardLimitGate`, `StripeWelcomePage`, `AccountPage`, `ModeModal` and
   `legalContent.ts`. A file-and-line inventory would make this document
   executable rather than illustrative.
4. **"Free forever tenant report" is left unresolved.** The matrix says it "needs
   server quota/entitlement confirmation" — which, given that no server metering
   exists at all, means the claim is currently unenforced rather than unverified.
   That is a determinable answer, not an open question.

## Bottom line

The clearest standard in the audit and the table to hand an implementer. Four
changes: promote "every number has a source, a date, and a method" to the first
row as the meta-claim it is; add the free-tier divergence; move synthetic
progress into scope; and treat `"STR legality · live"` as an immediate one-word
fix. Then build the fixture-isolation test — it is the cheapest control that
prevents recurrence.
