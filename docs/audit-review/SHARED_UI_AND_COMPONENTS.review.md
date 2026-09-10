# Review — `SHARED_UI_AND_COMPONENTS.md`

**Verdict: its diagnosis is correct and its central sentence is the sharpest
observation in the audit. But it is the document where recommendation is most
often dressed as finding, and its P-scale is correspondingly less meaningful.**

> The main UI risk is behavioral inconsistency: shared-looking controls often do
> different things, do nothing, or render different report implementations
> depending on route.

That is exactly right, and it reframes what looked like a visual-polish problem
as a trust problem.

## Verified

| Claim                                                                      | Result                                                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| UI-01 — report header "Share link" has no click handler                    | **Confirmed.** `Nav.tsx` renders `<button className="btn btn-ghost nav-hide-sm">…Share link</button>` with no `onClick`.    |
| UI-02 — "Save to account" does not save                                    | **Confirmed.** Pro path calls `onSignIn`; free path calls `openUpgradeModal('portfolio')`. Neither persists.                |
| Mode-modal switch promise with no switcher                                 | **Confirmed.** `ModeModal.tsx:707`.                                                                                         |
| Backend exposes both raw `total` and normalized `displayTotal`             | **Confirmed.** `deal_score.py` `to_display_score`; the docstring warns the verdict label must come from raw.                |
| Investment score has a visual minimum of 5                                 | **Confirmed.** `_DISPLAY_FLOOR = 5`.                                                                                        |
| Full report content duplicated in standalone pages and inside `ReportPage` | **Confirmed.** `InvestorReportContent` at `ReportPage.tsx:860`, `TenantReportContent` at `:695`.                            |
| Responsive branches via `window.innerWidth`                                | **Confirmed** in `StickyActionBar` and `ModeModal`; note `PropertyHero` was already migrated to `matchMedia` + CSS (D-035). |
| Score component names still say "AI" despite deterministic prose           | **Confirmed.** `AIVerdictBlock.tsx`, `anthropicService.ts`.                                                                 |

The `window.innerWidth` critique is well founded and I can confirm it from
direct experience: it is the exact mechanism behind D-035, where `innerWidth`
reported the _overflowing_ width (723px on a 375px viewport), so a layout check
fed on its own output. The document's prescription — "Use CSS media/container
queries for layout. Use JavaScript only when behavior, not presentation, truly
differs" — is the right rule and is already partly applied.

## Where finding and recommendation are conflated

Roughly two-thirds of this document is design specification rather than defect
report. The "Score and verdict components" requirements list, the responsive
acceptance matrix, the proposed component architecture and the visual
verification suite are all _proposals_. They are good proposals. But they sit in
a document whose other half carries P1 severities, and the audit's own severity
key defines P1 as "breaks a primary journey, changes a financial conclusion
incorrectly, or makes a paid promise the product cannot fulfil." A missing
container-query contract does not meet that bar.

Consequence: a reader triaging by severity cannot use this document the way they
can use the API or account audits. Splitting it into `SHARED_UI_FINDINGS.md`
(UI-01 to UI-04, the ambiguous empty states, the accessibility gaps) and
`SHARED_UI_DESIGN_STANDARD.md` (the dial contract, matrices, architecture) would
make both halves actionable.

## Findings I would re-rate

**"No flags detected" ambiguity — the strongest item here, and it is unrated.**
It sits in a "Gaps" bullet list with no ID or severity:

> "No flags detected" can mean no description, extraction failure, incomplete
> description or a true clean scan. These states need different copy.

This is a content-integrity defect of the same class as the fabricated invoices —
the product asserting a clean result when it does not know. It appears in four
documents (here, scoring, provenance, claims) and is rated nowhere. It should be
a single **P1** with one owner and one fix (a per-source status envelope), not a
recurring observation.

**Theme state not persisted (UI-04, P2)** — agree with P2, but note it interacts
with the report's dark-mode surfaces: a user who sets dark mode, shares a link
and reopens it gets light mode, and the AI verdict block and hard-limit gate are
designed dark-on-dark. Cosmetic, but the failure is more visible than "not
persisted" suggests.

**Accessibility items are all unrated.** Live-region announcements for analysis
status, focus trapping on the mode modal and hard-limit gate, gauge text
equivalents, reduced-motion handling — these are listed as "remaining work" with
no severity. Missing focus management on a modal that blocks the primary journey
is at least P2, arguably P1 for keyboard-only users. The document has the right
list and gives a triager nothing to act on.

## Gaps

1. **No verification that the claimed visual fixes hold.** The document says "the
   new styles improve those particular cases" and "the recent full-circle score
   treatment addresses the earlier inconsistent arcs". Neither is evidenced — no
   screenshot, no test reference, no viewport. Given that the whole point of the
   proposed screenshot suite is that human review is required, the claims of
   improvement need the same standard.
2. **`ReportSectionRail` is not mentioned.** A fixed left-margin navigation
   component was added in D-036 with its own breakpoints (hidden < 1240px, labels
   ≥ 1620px). It is a shared UI element with responsive behaviour and it is absent
   from a shared-UI audit — suggesting the document was written against an
   earlier tree, or that the component was missed.
3. **The residual 375px overflow is not quantified.** `AGENT_HANDOFF.md` records
   "the remaining 375px overflow" as fixed on 2026-09-07; D-035 records ~10px
   remaining from `StickyActionBar`. This document discusses the sticky bar's
   contract but never states whether overflow is currently zero. That is a
   measurable fact and the acceptance matrix depends on it.
4. **No dark-mode contrast verification.** The document asks to "validate contrast
   for muted monospaced labels and color-mixed statuses in both themes" — the
   `color-mix(in oklab, …)` patterns used throughout for status backgrounds are
   the obvious risk, and `btnContrast.test.ts` shows the project already has
   machinery for exactly this kind of check. The audit could have run it.

## Bottom line

Correct diagnosis, useful standard, wrong container. Split findings from design
standard; give the "No flags detected" ambiguity a single rated home; assign
severities to the accessibility list; and evidence the claimed visual fixes to
the standard the document itself demands of everything else.
