# Hybrid application migration

Current builder baseline: `b564af346c6bb982872b83742014bb4897515e9f`, task `hybrid-ui-browser-fixes`.
Accepted homepage foundation: `cd4260a330b5ab4cbdd0038a3df37a4c8e618712`.
Inventory originated before the foundation increment at `2c31ad8deda0d423738d1aed8223c78b296361ca`.
Owner reference: `propscout-hybrid.html`, supplied with the 2026-09-15 implementation brief.
The prototype supplies presentation only. D-125, stored report modes, existing calculations,
missing-data rules and entitlements remain authoritative.

## Route and flow inventory

**Review scope:** the coordinator-created candidate must be reviewed against
`cd4260a330b5ab4cbdd0038a3df37a4c8e618712`, including the entire sitewide delta
already in this baseline (37 files), plus the closure changes. Reviewing only the
four repaired source/test files does not satisfy the owner request. The following
inventory remains the sitewide review checklist. Historical execution tables below
are retained; the closure evidence at the end is the current builder result.

Paths below are relative to `apps/web/src`. “Shared” means the same React component and
logic render in either design; only the hybrid presentation is scoped to the design flag.

| Existing route / component                                              | Hybrid implementation                                              | Preserved behavior / validation                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` → `pages/LandingPage`                                               | Shared composition with hybrid Hero, navigation and report chooser | Empty input, address/link classification, real scrape, address details, type confirmation, samples, pricing and dialogs; landing + hybrid tests                           |
| `components/landing/Hero`                                               | Shared input/analysis state, separate hybrid headline and layout   | `classifyInput`, `validateUrl`, lookup/scrape/start services and ModeModal unchanged; no prototype manual detector                                                        |
| `ReportsSection`, `ReportShowcase`, `ModePreview`                       | Hybrid grouped rental/sale samples and existing detailed showcase  | Samples clearly separate from live reports; links go to the four existing demo URLs                                                                                       |
| Coverage, FounderNote, LandingSunScout, How, Pricing, FAQ, CTA sections | Retained in scrollable homepage                                    | Sources, seasonal controls, founder note, Free / CAD $10 monthly Pro, FAQ and actions retained                                                                            |
| `/analyzing?token=&mode=` → `pages/analyzing`                           | Shared flow with scoped surfaces                                   | Real token/mode, progress, timeout, retry, missing input, anonymous/auth/quota gates; analyzing tests                                                                     |
| `/investor-report` → `InvestorReport` + `DemoNotice`                    | Shared report + hybrid hero, chapters and section navigator        | Financing, metrics, comps, cash-to-close, OSFI, flags, equity/exit, neighbourhood, SunScout, STR, diligence, sources; PR4 + parity tests                                  |
| `/tenant-report` → `TenantReport` + `DemoNotice`                        | Shared report + hybrid hero, chapters and section navigator        | Rent positioning, accuracy, listed/reality, negotiation, monthly costs, inclusions, commute, schools, sun, comps map, unit detail, checklist, verdict; PR5 + parity tests |
| `/personal-report` → `PersonalBuyerPage` + `DemoNotice`                 | Shared report + hybrid hero, chapters and section navigator        | Monthly outflow, value, sales, schools, neighbourhood, sun, risks, checklist, conversion; PR6 tests                                                                       |
| `/landlord-report` → `LandlordPage` + `DemoNotice`                      | Shared report + hybrid hero, chapters and section navigator        | Rent positioning, investment metrics, financing, costs, risks, market, sun, STR, checklist; PR6 tests                                                                     |
| `/r/:token` → `ReportPage`, investor mode                               | Shared saved renderer + hybrid hero and chapters                   | Fetches by token; authenticates owner edits; full analysis, provenance, sliders, management toggle, overrides, facade, ledger; ReportPage tests                           |
| `/r/:token`, landlord mode                                              | Shared `ReportPage` investment renderer                            | Owner value / mortgage inputs, re-analysis and rent control; no invented purchase price or score                                                                          |
| `/r/:token`, tenant mode                                                | Shared `TenantReport` with real listing/analysis                   | No fixture fallback for missing live facts; provisional score and comp availability retained                                                                              |
| `/r/:token`, personal mode                                              | Shared `PersonalBuyerPage` with real listing/analysis              | Live HomeScore suppression, comp provenance and missing sections retained                                                                                                 |
| `/account?view=saved\|profile\|plan\|notifications` → `AccountPage`     | Shared page                                                        | Session, loading/error/empty history, profile, notifications and verified billing; PR7 tests                                                                              |
| `/auth/confirm` → `MagicLinkConfirmedPage`                              | Shared page                                                        | Provider confirmation/pending/failure; MagicLinkConfirmedPage + PR7 tests                                                                                                 |
| `/auth/reset` → `PasswordResetRequestPage`                              | Shared page                                                        | Email validation, submit, pending, success/error; PR7 tests                                                                                                               |
| `/auth/reset/confirm` → `PasswordResetConfirmPage`                      | Shared page                                                        | Recovery session, password validation, pending/error; PR7 tests                                                                                                           |
| `/auth/verified` → `EmailVerifiedPage`                                  | Shared page                                                        | Verification status; PR7 tests                                                                                                                                            |
| `/welcome-to-pro` → `StripeWelcomePage`                                 | Shared page                                                        | Existing return actions retained; activation copy conflicts with D-125 (see open decision below)                                                                          |
| `/checkout/cancelled` → `StripeCancelledPage`                           | Shared page                                                        | Cancelled checkout and return actions; PR7 tests                                                                                                                          |
| `/methodology` → `MethodologyPage`                                      | Shared page                                                        | Actual model weights, availability and limitations                                                                                                                        |
| `/privacy`, `/terms` → pages + `legal/LegalShell`                       | Shared pages                                                       | Legal content, table of contents and anchors                                                                                                                              |
| `*` → `NotFoundPage`                                                    | Shared page                                                        | Unknown routes and recovery action; PR7 tests                                                                                                                             |
| `/print-report` → `PrintReportPage`                                     | Shared print renderer + scoped print styling                       | Supplied payload, ready/error status and paid export contract; PrintReportPage tests                                                                                      |
| `MagicLinkSentPage`                                                     | Retained component (no standalone route at baseline)               | Do not invent a route for an internal auth state                                                                                                                          |

## Shared components and states

| Existing components                                                                                                                      | Presentation / behavior retained                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Nav, Wordmark, Footer, Icon, ScoutMark                                                                                                   | Hybrid landing navigation includes mobile section links; existing report/account actions retained. Legacy nav/wordmark remain selectable. |
| Button, Card, Chip, VerdictPill, SectionHead, Tooltip                                                                                    | Scoped hybrid tokens and upright display type; semantics, tones and controls retained                                                     |
| PropertyHero, DealScore, Metric, ListingVisual                                                                                           | Existing authoritative values, weighted score bars, empty-photo handling and verdict-first hierarchy                                      |
| RentalCompsBar, CompsMap, CompRowsTable, MiniMap                                                                                         | Same evidence, approximate locations, source disclosures, empty/error states                                                              |
| All `investor/`, `tenant/`, `personal/`, `landlord/` sections                                                                            | Shared business logic; complete section inventories above; no visual-mode calculation branches                                            |
| SunScoutPanel                                                                                                                            | Same season, facade, obstruction and missing-data states                                                                                  |
| ReportSectionRail, StickyActionBar                                                                                                       | Existing report anchors, share/PDF/gate actions and mobile action bar                                                                     |
| SignInModal, ModeModal, BottomSheet, AddressDetailsCard                                                                                  | Same validation, focus handling, Escape/backdrop behavior and type-compatible mode options                                                |
| PaywallContext, TruncatedVerdict, LockedSection, LockedButton, UpgradeCard, UpgradeModal, HardLimitGate, ProBadge, TierUnavailableNotice | Same entitlement/loading/failure/quota decisions and checkout actions                                                                     |
| BlockState, StubState, ProvinceGate, ErrorBoundary                                                                                       | Existing failure and recovery semantics                                                                                                   |
| DemoNotice, GuestNudge, SanityNotice, RentControlNote, RateBanner, ProvenanceBadge, ListingSourceLine                                    | Source, assumption, demo and availability disclosures stay visible                                                                        |
| DevToolbar                                                                                                                               | Existing development-only helper; no prototype Tweak controls added                                                                       |

There is no existing supported saved-report perspective-switch operation. Hybrid sample links
must never relabel `/r/:token` data or navigate to another sample as if it were the same property.

## Rollback contract

`VITE_APP_DESIGN=legacy` selects the original interface at build/dev-server startup. Omitted
or `hybrid` selects the hybrid. Restart Vite or rebuild after changing it. This flag is separate
from `propscout-theme` and does not change URLs, sessions, saved IDs, calculations or storage.
No production environment changes are part of this task.

Original `styles/tokens.css` and `styles/global.css` remain intact. Every added hybrid style
is scoped under `html[data-design='hybrid']`; legacy selects the original render branches.
The same shared report components render both designs to avoid copying business logic.

## Completion increment: implemented presentation

`styles/hybrid-surfaces.css` supplies component composition rather than only token
changes. Every selector is scoped to hybrid; original token/global styles are unchanged.

- All four hero implementations place property identity before imagery and use a dark
  verdict panel. Tenant, personal and demo-landlord verdict text sits beside a medium
  gauge; legacy retains its large gauge. Source disclosures and missing facts remain.
- `HybridReportContents` derives its disclosure navigator from actual rendered sections,
  including empty sections and asynchronous updates. Choosing a section scrolls and moves
  keyboard focus to its heading. No invented perspective switch or second section list.
- Shared chapter headings, rules and evidence spacing form a continuous report document.
  Only hybrid hides the old margin rail, replacing it with the in-document navigator.
- Account gets a contained sidebar, heading and mobile stacking. Auth, billing return and
  404 routes get `HybridUtilityShell`/`HybridUtilityLayout`, with original state components
  and handlers inside. Legacy renders the original unframed routes.
- StubState/BlockState gain left-aligned recovery cards; analyzing and saved report
  loading/error wrappers gain contained surfaces. Legal and methodology get reading
  layouts. Dialogs, bottom sheets, teasers and quota gates share hybrid shapes and upright
  typography. These changes preserve logic, entitlements and actions.
- Print overrides use paper colours in either theme, remove the navigator, make heroes
  static and keep section headings with content. The print payload contract is unchanged;
  missing payloads keep their original message in a styled status container.
- `RouteScroll` starts new pathnames at the top. Hash destinations take precedence,
  including delayed anchors; query-only navigation retains scroll. This correction also
  applies to legacy without changing its visual layout.

Supporting page inventory rows above refer to shared **logic**, with these scoped layouts.
`VITE_APP_DESIGN=legacy` continues to select the original visual treatment.

## Fresh builder evidence - 2026-09-25

These commands ran in the assigned short-path worktree at
`C:/dev/.propscout-agent-worktrees/hybrid-ui-sitewide-final/codex`. The previous draft was
read and copied only for the listed source/docs paths; its checkout was not modified.
Results below are fresh runs, replacing the previous builder execution table. There is no candidate SHA yet:
the coordinator owns committing and exact-candidate review.

| Check                                                                                                             | Observed result                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Web / API typecheck                                                                                               | Passed                                                                                                                                      |
| Web / API lint                                                                                                    | Passed                                                                                                                                      |
| Configured full web tests (including PR4-PR8)                                                                     | Failed before collection: Vite config bundling -> esbuild `spawn EPERM`; zero assertions                                                    |
| Focused RouteScroll, HybridReportContents, HybridReportPresentation, HybridUtilityShell and existing hybrid tests | Same startup failure; assertions unverified                                                                                                 |
| Configured API tests                                                                                              | Jest worker `spawn EPERM` before collection                                                                                                 |
| API tests with `--runInBand`                                                                                      | 39 suites; 503 passed, 2 existing skips; expected mocked error-path logging                                                                 |
| Calc engine                                                                                                       | 469 passed, 2 existing skips, 41 warnings                                                                                                   |
| Scrapers                                                                                                          | 212 passed, 12 warnings                                                                                                                     |
| Configured Python lint                                                                                            | Multiprocessing pipe creation failed: `PermissionError: [WinError 5]`                                                                       |
| Python lint with `--jobs=1`                                                                                       | Passed                                                                                                                                      |
| Configured Python format                                                                                          | No result; interrupted. Unverified, not passed                                                                                              |
| In-process Black formatting check on the configured source roots                                                  | No result; interrupted. Unverified                                                                                                          |
| Production build                                                                                                  | TypeScript stage passed; esbuild `spawn EPERM` before bundling                                                                              |
| Local Vite dev server                                                                                             | esbuild `spawn EPERM` before server startup                                                                                                 |
| `scripts/check_hybrid_ui.py`                                                                                      | Playwright driver failed before Chromium launch: Windows pipe creation `PermissionError: [WinError 5]`; **zero browser scenarios executed** |

Commands used: `npm.cmd run typecheck/lint --workspace=apps/web` and `apps/api`;
`npm.cmd test --workspace=apps/web`; `npm.cmd test --workspace=apps/api` (then with
`-- --runInBand`); `.venv/Scripts/python.exe -m pytest services/calc-engine/ -q` and
`services/scrapers/ -q`; configured Black/Flake8 roots `services/calc-engine services/scrapers
scripts`; `npm.cmd run build --workspace=apps/web`; `npm.cmd run dev --workspace=apps/web
-- --host 127.0.0.1`; `.venv/Scripts/python.exe scripts/check_hybrid_ui.py`.

Web typecheck and lint were rerun successfully after the final source edits.
Prettier formatted the changed web sources. `git diff --check` passed.
The permission profile disallows escalation. No tests/configuration were weakened,
no snapshots were regenerated, and startup failures are not counted as passes.

## Coverage and browser handoff

New focused tests cover route reset, hash/query preservation, deferred and malformed
anchors, actual section discovery, empty sections, focus, report scoping, recovery
navigation, theme controls and rollback. `HybridReportPresentation.test.tsx` also checks
that switching designs preserves the property heading and complete verdict content.
Snapshot-covered report components add hybrid classes only in hybrid mode, keeping the
legacy DOM stable. Existing snapshots were neither regenerated nor changed. Existing PR4-PR8, parity, ownership, print and
calculation tests are unchanged. No numeric model changed, so existing numeric sanity
bounds remain applicable.

The additional local-only browser check uses the existing Python Playwright dependency.
Start the web dev server, then run:

```powershell
.\.venv\Scripts\python.exe scripts/check_hybrid_ui.py
# Restart Vite with VITE_APP_DESIGN=legacy, then:
.\.venv\Scripts\python.exe scripts/check_hybrid_ui.py --design legacy
```

It blocks external requests and simulates unavailable APIs. It covers 375/1280 widths,
both themes, four demos, upright type, section focus, slider keyboard input, scrolled-home
navigation to each of the four samples, anchors, print navigator hiding and supporting-route layout. Screenshots go
to a temporary directory. The script has **not reached browser execution** in this turn.
It does not replace authenticated account, saved-report fixtures, checkout or PDF-service
tests. Direct `/print-report` without a payload checks only the empty state.

Manual sources inspected: `UITESTING.md`, PR4 `chrome_ui_tests.md`, PR5
`PR5_chrome_ui_tests_FINAL.md`, PR6 `CHROME_UI_TESTS.md`, PR7 `PR7_chrome_ui_tests.md`,
PR8 responsive Vitest coverage and `docs/TESTING.md`. No browser checkboxes are marked
executed. Database-writing `scripts/smoke-test.mjs` was not run: no isolated service
fixture or credential environment was supplied, and production access is not authorized.

## Open owner decision and remaining acceptance

Baseline `StripeWelcomePage` asserts Pro activation and advertises portfolio tracking and
SunScout 3D. D-125 defers planned features and requires verified billing state. Billing
copy/logic remains unchanged pending the requested owner decision under AGENTS.md; only
its presentation shell changed. The owner question is pending; no billing assertion or
behavior has been changed. Proposed resolution: neutral checkout-return copy pointing
to the verified account plan, without changing billing logic.

This is a broader presentation implementation, **not a verified completed migration**.
Still required: successful configured web/build/format gates; execution and visual review
of mobile, desktop, both-theme and rollback screenshots; all four saved-report fixtures;
authenticated account states; dialog Tab/Escape/focus checks; and actual PDF review.
Browser verification may identify additional layout work. Source inspection is not visual proof.

Final human review is mandatory under `docs/agent-loop/POLICY.md`: "Changes spanning
multiple product segments where failure has broad blast radius." Exact-candidate reviewer
acceptance and all configured gates are also required. No commit, push, merge, deploy,
migration, credential change or owner-checkout edit was made by this builder.

## Added source inventory

- `apps/web/src/components/hybrid/HybridReportContents.tsx` and its test: rendered section navigation.
- `apps/web/src/components/hybrid/HybridReportPresentation.test.tsx`: design-switch parity.
- `apps/web/src/components/hybrid/HybridUtilityShell.tsx`, `HybridUtilityLayout.tsx` and shell test: recovery-page frame.
- `apps/web/src/components/shared/RouteScroll.tsx` and its test: path and anchor scroll handling.
- `apps/web/src/styles/hybrid-surfaces.css`: scoped report, utility, dialog and print composition.
- `scripts/check_hybrid_ui.py`: offline browser acceptance runner.

The canonical structure file `CLAUDE.md` is protected, so new locations are recorded here.

## Formatting retry evidence — 2026-09-25

This follow-up starts at `602dd812f19be260a0c0b54be70933173d868e16`; the sitewide
source port is already in that baseline. The old draft was inspected read-only. Its
unconditional hero classes are superseded by the baseline's design-conditional
classes, which preserve legacy markup. No old checkout files were written.

Changed `scripts/check_hybrid_ui.py` using Black's formatting only. Assertions,
routes and browser coverage are unchanged. This is a gate-repair increment, not
evidence that the broader migration is complete.

Fresh checks in this builder environment:

| Check | Result |
| --- | --- |
| Configured web/API typechecks and lint | All four passed |
| Configured Python format | Did not finish; interrupted after no output. The `--workers 1` retry also did not finish. Neither is recorded as a pass. |
| In-process Black `format_str` comparison, default `Mode()` | All 99 Python files under the three configured roots match; includes the repaired browser script. Supplemental evidence, not a completed CLI gate. |
| Configured Flake8 | Blocked creating worker pipes: `PermissionError: [WinError 5]` |
| Flake8 with `--jobs 1`, same three roots | Passed |
| Configured full web tests, including PR4–PR8 | Failed before collection: esbuild `spawn EPERM`; no assertions executed |
| Configured API tests | Failed before collection: Jest worker `spawn EPERM` |
| API tests with `--runInBand` | 39 suites passed; 503 tests passed, 2 existing skips |
| Configured calc-engine tests | 469 passed, 2 existing skips |
| Configured scraper tests | 212 passed |
| Web production build | TypeScript completed; Vite config bundling blocked by esbuild `spawn EPERM` |
| Local Vite server, explicit workspace/host/port | Blocked by the same esbuild startup error |
| Local browser runner | Playwright transport failed before launching a browser: `PermissionError: [WinError 5]`; no screenshots or browser assertions |
| `git diff --check` | Passed |

All ten configured gates were attempted; only the outcomes explicitly marked passed
above passed. No protected test configuration, snapshots or expectations changed.
The permission profile does not permit escalation. Both-theme/mobile/rollback,
saved-report fixtures, authenticated states, dialogs and PDF visual acceptance
remain unverified. The billing-copy owner question was raised again; absent an
owner answer, the existing page remains unchanged. The coordinator must rerun the
exact gates and obtain exact-candidate review and the policy's multi-segment human
approval before accepting this migration.

## Closure evidence — 2026-09-25

Assigned lane: `C:/dev/.propscout-agent-worktrees/hybrid-ui-closure/codex`.
The four requested files were inspected and copied from `hybrid-ui-final-review/codex`
read-only. The browser script was then formatted locally. No other checkout was edited.

- `HybridReportContents.tsx` discovers shared `SectionHead` number/topic metadata,
  including personal/landlord sections without investor rail markers. Buttons have
  explicit readable accessible names and scroll to the containing section, then focus
  its heading. Rendering and calculations remain shared with the legacy design.
- `HybridReportContents.test.tsx` adds unmarked-section and repeated-number coverage,
  checking every exact label, scroll target and focused heading. Existing empty-state,
  mutation, report-scoping and rollback assertions are retained.
- `hybrid-surfaces.css` allows legal grid children to shrink, wraps long legal text and
  card rows, and collapses the legal grid/TOC on mobile. All rules are hybrid-scoped;
  no legal content is hidden or removed.
- `check_hybrid_ui.py` requires the ordered demo topic inventories: investor 12,
  tenant 12, personal 8, landlord 12. It checks every navigator label and focus target,
  preserves the inventory in print, and adds 390px alongside 375/1280px in both themes.
  These are demo inventories; live sections can differ with available evidence.

| Fresh check | Observed result |
| --- | --- |
| Configured web/API typecheck and lint | All four passed |
| Configured full web tests and focused navigator test | Blocked before collection by esbuild `spawn EPERM`; no assertions executed |
| Configured API tests | Blocked by Jest worker `spawn EPERM` |
| API tests with `--runInBand` | 39 suites passed; 503 passed, 2 existing skips |
| Configured calc-engine tests | 469 passed, 2 existing skips, 41 warnings |
| Configured scraper tests | 212 passed, 12 warnings |
| Configured Black 24.8.0 CLI | No output/completion; interrupted, not a pass |
| Supplemental system Black 26.5.1 in-process comparison | All 99 Python files under the configured roots match after formatting the script; not a substitute for the configured gate |
| Configured Flake8 | Worker pipe creation blocked by `WinError 5` |
| Flake8 with `--jobs=1` | Passed |
| Production web build | TypeScript completed; Vite blocked by esbuild `spawn EPERM` |
| Local Vite server | Blocked by esbuild `spawn EPERM` |
| Local-only Playwright runner | Transport startup blocked by `WinError 5`, before browser launch |
| `git diff --check` | Passed |

All ten configured gates, production build and local-only browser runner were attempted.
No browser assertions, screenshots, authenticated scenarios or full PDF checks executed
in this lane. Both themes, rollback, mobile overflow and the new unit test still require
successful execution by the coordinator in an environment that permits test processes.
No tests were weakened, snapshots updated, or protected files edited. The supplied
vetted changes are treated as the approved closure scope; runtime success is not assumed.

The existing billing-copy conflict described above remains unresolved and unchanged.
Exact-candidate full-site reviewer acceptance and the owner's multi-segment human gate
remain required. The builder created no commit and performed no promotion, push, merge,
deployment, migration, production access or credential change.

## Browser-fix evidence — 2026-09-25

Task `hybrid-ui-browser-fixes` repairs baseline
`8979c235ba623978dcf37fc7b0555ed5a2de2109`. The changes are uncommitted builder
work; the coordinator must create the exact candidate SHA for independent review.
The previous reviewer static-audited the sitewide delta since `cd4260a`; that does
not establish runtime acceptance of these repairs or waive the owner human gate.

- `RouteScroll.tsx` now tracks the anchor's document position through initial layout
  shifts. It only repeats the jump when that position changes, for five seconds
  after the target first appears (`constants/navigation.ts`). Wheel, touch,
  pointer and keyboard input cancel the correction immediately, without preventing
  the input. Cleanup also runs on route changes/unmount. Missing saved-report anchors
  retain the existing mutation-based wait, with the same user-input cancellation.
- `RouteScroll.test.tsx` retains the existing route/hash assertions and adds late
  layout, expiry, user-input cancellation, stable document-coordinate and cleanup
  regressions. Five seconds is a bounded implementation choice, not a guarantee for
  arbitrarily slow assets; delayed assets and user scrolling require browser review.
- Shared `global.css` lets legal grid children shrink, uses a zero-minimum mobile
  track, and wraps contact text/footer actions. This applies to privacy and terms
  in legacy as well as hybrid without hiding content or changing visual tokens.
- `TESTING.md` records repair coverage. The original `scripts/check_hybrid_ui.py`
  is byte-for-byte unchanged in the Git diff, including pricing and overflow checks.

All ten configured gates were attempted using `.agent-loop/config.json` commands,
with Python resolved to this worktree's `.venv/Scripts/python.exe`.

| Validation | This builder's result |
| --- | --- |
| Web typecheck | Passed, including after final source edits |
| API typecheck | Passed |
| Web lint | Passed, including after final source edits |
| API lint | Passed |
| Python format | No output/completion for over three minutes; stopped, not passed |
| Python lint | Blocked by multiprocessing pipe `WinError 5` |
| Full web tests and focused RouteScroll tests | Blocked before collection by esbuild `spawn EPERM` |
| API tests | Blocked by Jest worker `spawn EPERM` |
| Calc-engine tests | 469 passed, 2 existing skips, 41 warnings |
| Scraper tests | 212 passed, 12 warnings |
| Supplemental API `--runInBand` | 39 suites passed; 503 passed, 2 existing skips |
| Supplemental Flake8 `--jobs 1` | Passed |
| Supplemental Black `--workers 1` | Also produced no result; stopped, not passed |
| Production web build | TypeScript passed; Vite blocked by esbuild `spawn EPERM` |
| Hybrid/legacy local Vite servers | Both blocked by esbuild `spawn EPERM` |
| Original browser runner, hybrid and legacy | Both blocked before browser launch by Playwright transport `WinError 5` |
| `git diff --check` | Passed |

Browser attempts used loopback URLs `http://127.0.0.1:5173` (hybrid) and
`http://127.0.0.1:5174` (legacy), with the runner's unchanged 375/390/1280px,
light/dark matrix and local-only request filtering. No browser assertions or
screenshots executed. PR4–PR7 manual Chrome checklists, authenticated flows and
visual fidelity remain unverified in this turn. Gate logs are in the ignored local
`.cache/browser-fix-validation/` directory. Permission blockers must be resolved
in the coordinator's execution environment before acceptance can be claimed.

Scoring, data, authentication, billing and the owner checkout were not changed.
The brief's later welcome-page copy approval is explicitly a separate follow-on;
this increment preserves the browser-fix task's billing exclusion.
Independent review of the coordinator-created exact candidate, successful gates
and browser matrix, and the mandatory owner approval for the broad migration
remain outstanding under `docs/agent-loop/POLICY.md`. No commit or promotion was
performed by this builder.

## Browser-fix clock regression retry — 2026-09-25

This increment starts at `b564af346c6bb982872b83742014bb4897515e9f` and retains
its production RouteScroll and legal sizing repairs. The supplied brief reports
that candidate passed the original browser checks at 375px in both designs and
themes; that is prior evidence, not browser execution by this builder.

The failed expiry test advanced Vitest's default timers while production reads
`performance.now()`. Inspection of the installed Vitest defaults confirmed that
`performance` is excluded. The test now explicitly fakes performance and animation
frames together, retains the two-jump expiry assertion, and additionally requires
the clock to reach the deadline and no timers to remain. Production behavior and
the original browser script are unchanged. The corrected test could not execute
in this sandbox, so coordinator verification is still required.

All ten configured gates were attempted again; logs are in the ignored local
`.cache/browser-fix-retry/` directory:

| Validation | Retry result |
| --- | --- |
| Web/API typecheck and web/API lint (four gates) | Passed |
| Python format | Passed |
| Python lint | Blocked by multiprocessing pipe `WinError 5` |
| Full web tests and focused RouteScroll test | Blocked before collection by esbuild `spawn EPERM` |
| API tests | Blocked by Jest worker `spawn EPERM` |
| Calc-engine tests | 469 passed, 2 existing skips |
| Scraper tests | 212 passed |
| Supplemental serial Python lint | Passed |
| Supplemental API `--runInBand` | 39 suites passed; 503 passed, 2 existing skips |
| Production web build | TypeScript passed; Vite blocked by esbuild `spawn EPERM` |
| Local hybrid/legacy servers | Blocked by esbuild `spawn EPERM` |
| Original browser script, both designs | Blocked before browser launch by Playwright transport `WinError 5` |

Both browser attempts retain the original 375/390/1280px, light/dark matrix and
local-only filtering, targeting loopback ports 5173 and 5174. No browser assertion
or screenshot executed in this retry. Manual visual and authenticated-flow checks
remain unverified. No protected files, scoring, data, auth, billing, credentials or
owner checkout were changed. The welcome-page copy decision remains a separate
follow-on. The coordinator must create and obtain independent review of the exact
candidate, rerun blocked checks and the full browser matrix, and retain the
mandatory owner human gate for the broad migration. No commit or promotion occurred.

## Final polish — 2026-09-25

Builder baseline: `7ccc3eda6d35056aea4332cd04483580cc34888a`.
The owner approved these two follow-on repairs and the PR7 headline assertion update.

- `global.css`: extend the existing single-column legal grid and hidden TOC through
  600px, covering the reported 500px overflow. Keep header-action hiding at 480px
  and the existing wide-screen layout and visual styling. The breakpoint is an
  implementation choice pending browser verification, not a measured pass.
- `StripeWelcomePage.tsx`: replace the activation and deferred-feature promises
  with neutral guidance to Account for the verified plan. Preserve both button
  labels, destinations, query parameters and billing behavior.
- PR7 auth tests cover the approved copy, absence of deferred claims and both
  action destinations. The local browser script adds 500px to the full matrix
  without changing overflow assertions or local-only request filtering.

All ten configured gates were attempted in the builder sandbox:

| Validation | Result |
| --- | --- |
| Web/API typecheck; web/API lint | All four passed |
| Python format | No result; interrupted after hanging; serial retry also hung |
| Python lint | Blocked by multiprocessing pipe `WinError 5` |
| Web tests; focused PR7 auth tests | Blocked before collection by esbuild `spawn EPERM` |
| API tests | Blocked by Jest worker `spawn EPERM` |
| Calc engine | 469 passed, 2 existing skips |
| Scrapers | 212 passed |
| Supplemental serial Python lint | Passed |
| Supplemental API `--runInBand` | 39 suites passed; 503 passed, 2 existing skips |
| Production web build | TypeScript passed; Vite blocked by esbuild `spawn EPERM` |
| Hybrid/legacy local dev servers | Both blocked by esbuild `spawn EPERM` |
| Local browser runner, both designs | Both blocked before browser launch by Playwright pipe `WinError 5` |
| `git diff --check` | Passed |

Configured gate logs are in the OS temporary directory as
`propscout-final-polish-<gate-name>.log`. Browser attempts targeted loopback ports
5173/5174, with 375/390/500/1280px and light/dark configured. No browser assertions,
screenshots, manual Chrome checklist or authenticated billing verification ran.
The coordinator must rerun blocked checks, create the candidate and obtain review
of that exact SHA. The broad migration remains at the owner human gate. No builder
commit, deployment, promotion or owner-checkout edit occurred.
