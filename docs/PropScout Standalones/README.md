# PropScout — Harbour re-skin · handoff package

Two ways to use what's in this folder.

## 1. `PropScout Standalones/*.html` — offline, self-contained

Twelve single-file HTML pages, one per surface. Each has every script, style,
font, and image inlined — double-click to open in any browser, no server, no
internet. Hand these to stakeholders or open them anywhere for review.

    01 Landing.html                 07 Pre Report Flows.html
    02 Mode Modal.html              08 Paywall States.html
    03 Investor Report.html         09 Account.html
    04 Tenant Report.html           10 Error States.html
    05 Personal Buyer Report.html   11 Auth and Billing Stubs.html
    06 Landlord Report.html         12 Legal Pages.html

Interactivity works offline: theme toggle, tweaks panel, sliders, tabs,
modals, scroll-spy. Dark mode is also reachable via URL: append `#theme=dark`.

## 2. `source/` — the editable code base

The working, un-inlined files. This is what to port into the app.

- `source/*.jsx` — React components + page assemblies (browser Babel; no build step)
- `source/rp-global.css` — shared support classes (tokens + color-mix only)
- `source/surfaces/*.html` — each surface's HTML shell (inlines the Harbour token
  block, links `rp-global.css`, loads the jsx). Open these against the sibling
  jsx/css to edit.
- `source/Handoff Note.html` — the implementation spec: canonical token block,
  per-surface → codebase mapping + section order, proposals, CAPTURE image
  slots, and the verify-list.

### File map (which jsx each surface loads)

- Reports share: components.jsx, rp-core.jsx, rp-chrome.jsx, rp-data.jsx
  - Investor → rp-blocks, rp-investor-sections, investor-report-v2
  - Tenant → tenant-report-v2
  - Personal → rp-personal-sections(-2), personal-report-v2
  - Landlord → rp-blocks, rp-investor-sections, rp-landlord-sections, landlord-report-v2
- Utility surfaces share: components.jsx, rp-stub.jsx
  - Pre-report → pre-report-v2
  - Paywall → rp-core, rp-data, paywall-components-v2, paywall-states-v2
  - Account → rp-core, account-v2
  - Error → error-states-v2
  - Auth → auth-stubs-v2
  - Legal → legal-v2

### Token discipline

The `:root` / `[data-theme]` block is byte-identical to Landing v2 in every
surface. No raw color / radius / shadow values live outside it — everything
else references a token or a `color-mix()` of tokens.

Locked references (Landing v2, Mode Modal) are included as-is and were not
modified during the re-skin.
