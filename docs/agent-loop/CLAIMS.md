# PropScout agent findings

## codex-hybrid-ui-final-polish-01 — P3 — open

Neither the legal-page breakpoint fix nor the new PR7 StripeWelcomePage assertions were actually executed this round (Vitest, production build, and the Playwright matrix were all blocked by sandbox spawn errors), so the 500px /privacy /terms overflow fix is verified only by static reading of the CSS, not by any runtime pass; if the 600px collapse does not fully eliminate the reported 535px scrollWidth (e.g. some other element besides .legal-grid also contributes), only the still-unrun width-500 Playwright check would catch it.

- Author: claude
- Evidence: confirmed
- Subject: `c7f5e45e22d8347173e94f718fcdac01cf4050a2`
- Citations:
  - `apps/web/src/styles/global.css:841-863`
  - `scripts/check_hybrid_ui.py:163-166`
  - `docs/HYBRID_UI_MIGRATION.md:420-440`

_Generated from `docs/agent-loop/claims/*.json`; do not edit by hand._
