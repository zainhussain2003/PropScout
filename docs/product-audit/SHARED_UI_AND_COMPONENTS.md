# Shared UI and component audit

## Overall assessment

The visual foundation is coherent: strong editorial typography, restrained color, reusable cards and a circular score language. The recent full-circle score treatment addresses the earlier inconsistent arcs. The main UI risk is behavioral inconsistency: shared-looking controls often do different things, do nothing, or render different report implementations depending on route.

## Navigation

| ID    | Severity | Finding                                                                                                                               | Proposed response                                                                                                  |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| UI-01 | P1       | Report header “Share link” has no click handler.                                                                                      | Use one shared share action with clipboard success/error feedback.                                                 |
| UI-02 | P1       | “Save to account” does not save. For Pro it invokes sign-in; for free it opens an upgrade modal.                                      | Implement one authenticated save state machine: sign in, attach report, confirm saved. Hide the action until real. |
| UI-03 | P2       | Breadcrumbs use an address slug/property label inconsistently and do not expose report mode switching despite the mode-modal promise. | Define breadcrumb information hierarchy and remove or implement the switch promise.                                |
| UI-04 | P2       | Theme state is page-local and is not persisted.                                                                                       | Put theme in one app provider, initialize from saved/system preference, and prevent navigation resets.             |

## Score and verdict components

The user preference is a clock-style gauge that begins at the top and fills clockwise. All score-like elements should use one primitive with explicit variants for score, completeness and directional measures.

Requirements:

- A 0–100 score uses the full circle, begins at 12 o'clock and fills clockwise.
- The number, label and `/ 100` remain within the dial at 320 CSS px through narrow mobile widths.
- `aria-label` states the metric, score, maximum and verdict.
- Color never carries the verdict alone.
- Unknown or suppressed scores show an em dash and reason, never an empty track that resembles zero.
- A score and a confidence/completeness measure must not share identical visual semantics.

Current risks:

- Multiple score components and adapters remain (`DealScore`, personal home score, tenant score, landing previews), so style and semantics can drift.
- The backend exposes both raw `total` and normalized `displayTotal`; UI code can accidentally compare one and show the other.
- The investment score has a visual minimum of 5 even when raw fundamentals are zero, which weakens the meaning of the dial.
- Score component names and comments still use “AI” even though the prose is deterministic. This is code-semantic debt and risks reintroducing the wrong product claim.

## Cards, labels and section structure

The screenshots that initiated this work showed overlap between listing-type pills and labels, inconsistent card heights, and gauge labels escaping their bounds. The new styles improve those particular cases, but the root causes remain:

- Many layouts combine utility classes with large inline style objects.
- Pixel widths, radii, shadows and colors frequently bypass design tokens.
- Content-dependent card height is used in comparison rows that visually imply equal structure.
- Absolute-positioned pills and labels do not always reserve layout space.
- Section headers can contain long status chips without a small-width wrapping contract.

Recommendation: define layout primitives for report section headers, equalized comparison cards, metric tiles and status chips. Test real long values, translated-length copy, zoom at 200%, and missing values.

## Sticky action bar and scroll behavior

The previously observed “report card stuck while images scroll behind it” came from sticky/fixed report surfaces interacting with viewport height and stacking contexts. The current shared sticky bar still warrants a systematic contract:

- It uses `window.innerWidth` to choose behavior.
- Its fixed height and safe-area padding can disagree.
- It can render buttons whose callbacks are no-ops.
- It must reserve bottom document space so the last checklist row is not obscured.

Acceptance matrix:

| Width       | Required behavior                                                                          |
| ----------- | ------------------------------------------------------------------------------------------ |
| 320–374 px  | Single-column actions, no horizontal scroll, safe-area respected.                          |
| 375–480 px  | Bottom action bar never covers report content; long labels truncate or wrap intentionally. |
| 481–767 px  | No mobile/desktop component swap during resize that loses state.                           |
| 768–1023 px | Two-column sections collapse based on container space.                                     |
| 1024+ px    | Sticky elements remain bounded by their section and never cover following content.         |

Use CSS media/container queries for layout. Use JavaScript only when behavior, not presentation, truly differs.

## Empty, loading and error states

### Strong patterns

- Tenant placeholders explicitly say “Not enough detail.”
- Personal buyer pauses its overall score when local comparable sales are absent.
- Photo and year-built fixes preserve unknown values.

### Gaps

- “No flags detected” can mean no description, extraction failure, incomplete description or a true clean scan. These states need different copy.
- PDF failures are logged without user feedback.
- Tier lookup failure silently looks like a free account.
- Analysis polling uses synthetic progress and cannot represent durable failure.
- Share actions have no confirmation or clipboard fallback.
- Some inactive features previously appeared actionable; remaining paywall and account actions still do.

Use a standard evidence-state component with `known`, `estimated`, `unavailable`, `failed`, `sample`, and `not applicable` states. Do not encode those distinctions only in prose.

## Accessibility

Positive evidence includes modal focus-trap work, icon labels in many controls, and broad component tests. Remaining work:

- Add live-region announcements for analysis status, copied links and errors.
- Ensure every icon-only control has a unique accessible name.
- Add focus trapping/restoration to the mode modal and hard-limit gate.
- Do not disable zoom or assume hover.
- Validate contrast for muted monospaced labels and color-mixed statuses in both themes.
- Ensure gauges have text equivalents and do not animate when reduced motion is requested.
- Test keyboard order when sticky actions duplicate header actions.

## Component architecture

The same concepts are implemented more than once:

- Full report content exists in standalone pages and again inside `ReportPage`.
- Investor and landlord score/data adapters live in frontend data files as well as backend results.
- Demo fixtures are imported close to live data code.
- Responsive branches appear in several components through `window.innerWidth`.

Proposed structure:

```text
report registry
  mode -> canonical page
       -> data adapter
       -> entitlement policy
       -> PDF metadata

shared primitives
  ReportNav / ReportSection / EvidenceState / ScoreDial
  ActionBar / ShareAction / SaveAction / ExportAction
```

Demo routes should invoke the same pages with an explicit `dataMode="demo"`. A production report should reject fixture inputs at the type boundary.

## Visual verification suite

A useful screenshot suite should capture each report with:

- complete real-like data;
- missing photos, year, taxes, fees, schools, comps and description;
- long address, large currency values and multiple flags;
- free and Pro entitlements;
- light and dark themes;
- widths 320, 375, 768, 1024 and 1440 px;
- 200% browser zoom and reduced motion.

The suite should assert absence of overlap and clipping, but human review remains necessary for hierarchy and truthfulness.

## Review trail

- [Independent review](../audit-review/SHARED_UI_AND_COMPONENTS.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Retained additions:** give ambiguous “No flags detected” one P1 owner; rate accessibility findings; include `ReportSectionRail`; measure residual overflow and dark-mode contrast rather than claiming visual fixes from static review.
- **Documentation improvement:** keep current defects distinguishable from proposed design standards and acceptance matrices.
