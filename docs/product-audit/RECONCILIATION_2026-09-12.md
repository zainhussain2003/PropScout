# Audit reconciliation — 2026-09-12

Every finding in this folder and in `docs/audit-review/`, checked against `master` at the end of
2026-09-12 (PRs #27–#60). "Fixed" means the code changed and a test pins it; "verified live"
means it was also exercised on propscout.ca that day. Anything not fixed is in
[`docs/BACKLOG.md`](../BACKLOG.md) with its reason.

Legend: ✅ fixed · 🟡 partly fixed · ⬜ open · 🔒 owner decision or credential · ➖ withdrawn /
not a defect.

## Findings by ID

| ID     | Sev | Finding                                              | Status | Where                                                                                              |
| ------ | --- | ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| A-01   | P0  | Fictional identity, reports, usage, invoices         | ✅     | #33 D-064; plan tab fixtures #46 D-076                                                             |
| A-02   | P1  | Saved report links invalid; Save does nothing        | ✅     | #33 (links removed), #48/#59 (Save honest)                                                         |
| A-03   | P1  | Profile/notification controls appear persistent      | ✅     | #55                                                                                                |
| A-04   | P1  | Notifications promise monitoring that does not exist | ✅     | #55                                                                                                |
| A-05   | P2  | Sidebar tier hard-coded free                         | ✅     | #45 D-075                                                                                          |
| A-06   | P1  | Usage from fixture count, not server                 | ✅     | #40 D-071, #46; verified live                                                                      |
| A-07   | P1  | Password reset says sent without sending             | ✅     | #35                                                                                                |
| A-08   | P2  | Magic-link page guesses expiry after 6 s             | ✅     | #49 D-078                                                                                          |
| A-09   | P1  | Guest analyses not claimed after sign-in             | 🔒     | Guest policy — BACKLOG                                                                             |
| A-10   | P2  | Tier fetch failure silently reads as free            | ✅     | #49 D-078                                                                                          |
| API-01 | P1  | Manual property type defaults to condo               | ✅     | #58 D-082                                                                                          |
| API-02 | P1  | Missing beds/baths/parking become zero               | ✅     | #42 D-072; form sends null #58                                                                     |
| API-03 | P1  | Row reader defaults type to detached                 | ✅     | #58 D-082                                                                                          |
| API-04 | P2  | No route schemas / body limits                       | ✅     | #53 D-081                                                                                          |
| API-05 | P2  | Flag IDs accepted as any string                      | ✅     | #53 D-081                                                                                          |
| API-06 | P2  | Listing upsert rewrites issued reports               | ✅     | #38 D-069                                                                                          |
| J-01   | P1  | "Any Canadian listing URL" / Zillow advertised       | ✅     | #57                                                                                                |
| J-02   | P1  | Report cards advertise what live does not provide    | 🟡     | Landlord → L-01/L-03 🔒; personal comps copy #57                                                   |
| J-03   | P1  | Pricing advertises portfolio, white-label, 3D        | 🔒     | Paywall — lower priority per owner; BACKLOG                                                        |
| J-04   | P2  | 2,900-line landing page                              | ⬜     | Maintainability; BACKLOG                                                                           |
| J-05   | P2  | "Under sixty seconds, every time"                    | ✅     | #57                                                                                                |
| J-06   | P1  | Status updates are no-ops; failed = pending          | 🟡     | Code #67 D-087; migration awaiting apply — BACKLOG                                                 |
| J-07   | P1  | No polling deadline                                  | ✅     | #37 D-068 (no backoff; not needed at 2 s)                                                          |
| J-08   | P1  | Transient poll error ends the flow                   | ✅     | #62 D-083                                                                                          |
| J-09   | P2  | Progress steps claim things they cannot know         | ✅     | #48 D-077                                                                                          |
| J-10   | P2  | Cancel does not cancel server work                   | 🔒     | Needs job status — BACKLOG                                                                         |
| J-11   | P2  | Reload retriggers analysis                           | ✅     | #52 D-080                                                                                          |
| L-01   | P1  | Live landlord renders investor content               | 🔒     | Blocked on L-03 — BACKLOG                                                                          |
| L-02   | P2  | LandlordPage fixture-coupled                         | ✅     | #39 D-070                                                                                          |
| L-03   | P1  | Landlord score is the acquisition score              | 🔒     | Owner decision — BACKLOG                                                                           |
| L-04   | P2  | Landlord demo and live are different products        | 🔒     | Follows L-03                                                                                       |
| S-01   | P1  | Overlapping economics in score weights               | 🔒     | Scoring method (spec §10) — BACKLOG                                                                |
| S-02   | P1  | Default DOM / rent trend score as if observed        | 🟡     | Labelled #56; whether they score at all is 🔒                                                      |
| S-03   | P2  | Display score floors at 5                            | 🔒     | Scoring decision — BACKLOG                                                                         |
| S-04   | P1  | Severe gate constants unsourced                      | 🔒     | Research/decision — BACKLOG                                                                        |
| S-05   | P1  | Sliders move economics; saved score fixed            | 🟡     | Metrics recompute (#32 D-054/55); score stays at saved case, labelled "with the assumptions below" |
| S-06   | P1  | One score for all modes                              | 🟡     | Tenant has its own score; personal paused; landlord = L-03 🔒                                      |
| UI-01  | P1  | Report header Share has no handler                   | ✅     | #48 D-077                                                                                          |
| UI-02  | P1  | Save to account does not save                        | ✅     | #48, #59                                                                                           |
| UI-03  | P2  | Breadcrumbs inconsistent; no mode switch             | ✅     | Mode-switch claim removed #57; crumbs #66 D-086                                                    |
| UI-04  | P2  | Theme page-local, not persisted                      | ✅     | #50 D-079                                                                                          |
| T-01   | P0  | Share recipient cannot mutate owner state            | ✅     | #34 D-065; verified live                                                                           |
| T-02   | P1  | Durable processing/failed states                     | 🟡     | Code #67 D-087; migration awaiting apply — BACKLOG                                                 |
| T-03   | P1  | All four live modes render canonical pages           | 🟡     | Investor/tenant/personal verified live; landlord 🔒                                                |
| T-04   | P1  | Account contains only authenticated data             | ✅     | #33, #45, #46, #55                                                                                 |
| T-05   | P1  | Password reset invokes Supabase                      | ✅     | #35                                                                                                |
| T-06   | P1  | Save/claim/share/checkout do what they say           | 🟡     | Share/Save/PDF ✅; checkout needs price IDs 🔒                                                     |
| T-07   | P1  | Unknown facts never become zero/condo/detached       | ✅     | #42 D-072, #58 D-082                                                                               |
| T-08   | P1  | Financing changes and score consistent               | 🟡     | Presets vs live base #44 D-074; see S-05                                                           |
| T-09   | P2  | Layout at real viewports/zoom                        | ⬜     | Manual — lower priority; BACKLOG                                                                   |
| T-10   | P2  | External degradation named per section               | 🟡     | Sections show honest empties; no contract tests                                                    |
| R-01   | P1  | Management fee desync between expense rows and NOI   | ✅     | #36 D-067                                                                                          |
| R-02   | P1  | Free allowance 3 vs 10, unenforced                   | ✅     | #40 D-071 (owner chose 10)                                                                         |
| R-03   | P1  | Unknown type → condo (address) / detached (scrape)   | ✅     | #58 D-082                                                                                          |
| R-04   | P1  | Two Buttermill calibration references                | ➖     | Documentation; regression pins Unit 5702                                                           |
| R-05   | —   | TenantReportContent unreachable                      | ➖     | Withdrawn by the counter-review                                                                    |
| R-06   | P2  | Landlord fixture comps                               | ✅     | #39 D-070                                                                                          |
| R-07   | —   | CI on feature branches                               | ➖     | PR CI runs; verified on every PR this cycle                                                        |
| R-08   | —   | Line counts                                          | ➖     | Withdrawn                                                                                          |

## Retained counter-review findings

| Finding                                                 | Status | Where                                                                   |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| "No flags detected" conflates no text / failure / clean | 🟡     | No-text state #60; extraction failure still indistinguishable — BACKLOG |
| `calculate_break_even_rent` management asymmetry        | ✅     | Router tests kept; D-067                                                |
| Listing rows overwritten by re-scrape                   | ✅     | #38 D-069                                                               |
| Evidence labels not applied                             | ➖     | Process note                                                            |
| Sun obstruction coverage threshold                      | ✅     | #64 D-085 — below 50% measured, labelled indicative                     |
| "True monthly cost" ~24% modelled                       | 🟡     | Rows labelled estimate/confirm; headline still "true" — BACKLOG         |
| Narrative `tier: 'free'` hardcoded                      | ➖     | Inert; truncation is client-side                                        |
| Agent sharing vs mutable share links                    | ✅     | Links are read-only for recipients (#34)                                |
| Rent control (landlord vs tenant)                       | 🔒     | Needs Ontario source — BACKLOG                                          |

## Product-claims table

| Claim                                   | Status | Where                                                                             |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| "Any Canadian listing URL"              | ✅     | #57                                                                               |
| Zillow.ca supported                     | ✅     | #57                                                                               |
| Under 60 seconds every time             | ✅     | #57                                                                               |
| Every number has a source, date, method | ✅     | #68 D-088 — ledger section on every live report; landing claim reworded to match  |
| Comparable sales for personal buyers    | ✅     | Copy #57; score paused with reason (live)                                         |
| School catchments                       | ✅     | #57                                                                               |
| SunScout obstruction / 3D               | 🟡     | Obstruction is live for everyone; "3D" wording — paywall BACKLOG                  |
| Portfolio tracker / save                | 🟡     | Removed from nav/account as a working control; still on pricing — paywall BACKLOG |
| Monitoring and alerts                   | ✅     | #55                                                                               |
| Reset link sent                         | ✅     | #35                                                                               |
| Mode switch inside report               | ✅     | #57                                                                               |
| "No flags detected" ambiguity           | 🟡     | #60; see above                                                                    |
| "Comparable rentals" wording            | ✅     | Live copy says "asking rents, not signed leases"                                  |
| Free forever tenant report              | ✅     | Tenant exempt from quota #40                                                      |
| Professional white-label PDF            | 🔒     | Paywall — BACKLOG                                                                 |

## Per-report "field to work on" rows

The four report audits' section tables are roadmap rather than defects (routing API for travel
times, attendance-boundary polygons, per-comp similarity rows, saved checklist state, evidence
ledgers, scenario comparisons). None were implemented; they are grouped in BACKLOG under
"Roadmap from the report audits" so they are not lost and not mistaken for open bugs.

## Verified on production on 2026-09-12

Investor (address and Realtor.ca paths), tenant (address), personal (Realtor.ca): full pipeline,
independent recomputation of every headline figure, magic-link sign-in, attribution, owner-only
dismissal, stranger share-link view, guest report ownership, presets against the live rate,
Toronto LTT, real Mapbox maps, schools, SunScout with obstruction, 60-comp rent band, honest empty
states for sales, appreciation and STR. Landlord mode was not run live (L-01).
