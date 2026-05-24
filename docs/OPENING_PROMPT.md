# Opening Prompt · PropScout Build

**Paste this into your first Claude Code session.** Run it inside the `propscout` repo root, after you've set up Vite + the monorepo structure per `CLAUDE.md`.

---

```
I'm building PropScout — a Canadian real estate analysis platform. The design is
fully complete and lives in /docs/design_handoff_propscout_mvp/.

BEFORE you write a single line of code, do the following IN ORDER:

1. Read these files in full:
   - propscout_platform_spec.md  (single source of truth — features, formulas)
   - CLAUDE.md                   (coding standards, file structure, API rules)
   - MVP_TODO.md                 (week-by-week build order)
   - /docs/design_handoff_propscout_mvp/README.md
   - /docs/design_handoff_propscout_mvp/COMPONENT_MANIFEST.md

2. Open these design files in a browser (they're standalone HTML — just double-
   click them or serve with `npx serve docs/design_handoff_propscout_mvp/designs/`):
   - index.html              — the landing page (the design system in action)
   - Investor Report.html    — the most complex single screen
   - Tenant Report.html      — the free funnel

   Spend 10 minutes exploring them. Toggle theme. Drag sliders. Click locked
   buttons. Open the mode modal. These are pixel-final.

3. Tell me ONE THING you noticed in the design that the spec doesn't cover.
   This is to confirm you've actually read the design before building.

Once we agree on (3), build in this order, one PR at a time:

PR 1 — Foundation
  - Copy tokens.css into apps/web/src/styles/
  - Install Geist + Instrument Serif via Google Fonts (preconnect + link in
    apps/web/index.html)
  - Build shared/ components from COMPONENT_MANIFEST.md §1:
    * Wordmark, ScoutMark, Icon, Chip, Button, Card, SectionHead,
      VerdictPill, Nav, Footer, SignInModal
  - Unit test every primitive — snapshot + a11y

PR 2 — Calc engine (Python)
  - Port every function from investor-calc.jsx to services/calc-engine/
    per COMPONENT_MANIFEST.md §10
  - 100% calc-engine unit test coverage on the 5 pure functions
  - Calibration test: 5702 Buttermill scores within ±2 of 9/100
  - Hamilton duplex scores within ±2 of 84/100

PR 3 — Landing + Mode modal
  - Build / route with the landing layout from index.html
  - Build <ModeModal> per mode-modal.jsx — wire it into the URL-paste flow
  - URL validation (Realtor.ca, Zillow.ca regex) before scraping
  - All hover/click interactions match the design

PR 4 — Investor report end-to-end
  - All 11 sections from Investor Report.html
  - <FinancingSliders> with live recalc — every metric on the page updates
    when the user drags a slider
  - <EquityChart> with hover tooltip showing year-by-year detail
  - Use the Vaughan dataset from investor-calc.jsx until the scraper is live

(continue from MVP_TODO.md week 5+ for tenant / personal / landlord / etc.)

Important rules from CLAUDE.md to keep in mind throughout:
  - One responsibility per file
  - API calls go through service files only — never in components
  - All shared types in /types — never inline
  - No `any` in TypeScript — use `unknown` and narrow
  - Every external call wrapped in try/catch
  - Errors are isolated per section — a SunScout failure doesn't crash the
    whole report

DO NOT skip the design exploration in step (2). The designs encode decisions
about hover states, mobile collapse behaviour, and tone that aren't in the spec.

When you're ready to start PR 1, write me a single-paragraph summary of:
  - The design system's color tokens
  - The typography stack
  - The five shared components you'll build first
  - Where each lives in the folder structure

Then start building. Ask if anything is ambiguous.
```

---

## Why this prompt is shaped this way

- **Step 3 (the "tell me one thing")** forces Claude Code to actually read the designs instead of skimming. Without this, models tend to guess at the visual language.
- **PR-by-PR commitment** prevents Claude Code from trying to build everything at once (a common failure mode) and matches your branch-protection rules.
- **Foundation first** is non-negotiable. If `<SectionHead>` and `<DealScore>` aren't stable before the reports start, you'll churn rewriting reports later.
- **Calc engine before reports** because the reports are visualizations of the calc output. Without a working calc engine, the design fidelity loop gets blocked on mocks.

## After PR 4

Drop a second instruction:

```
PR 5 — Tenant report (the free funnel · highest leverage)
PR 6 — Personal Buyer + Landlord reports
PR 7 — Paywall wiring
PR 8 — Account dashboard
PR 9 — Error/empty states
PR 10 — Legal + 404
PR 11 — Mobile responsive pass

After each PR: run the regression suite from CLAUDE.md §12 before merging.
Golden dataset must pass 95%+. Calculation regression must pass 100%.
```
