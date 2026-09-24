# Hybrid application migration

Baseline: `2c31ad8deda0d423738d1aed8223c78b296361ca`. Inventory taken before implementation.
Owner reference: `propscout-hybrid.html`, supplied with the 2026-09-15 implementation brief.
The prototype supplies presentation only. D-125, stored report modes, existing calculations,
missing-data rules and entitlements remain authoritative.

## Route and flow inventory

Paths below are relative to `apps/web/src`. “Shared” means the same React component and
logic render in either design; only the hybrid presentation is scoped to the design flag.

| Existing route / component                                              | Hybrid implementation                                              | Preserved behavior / validation                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` → `pages/LandingPage`                                               | Shared composition with hybrid Hero, navigation and report chooser | Empty input, address/link classification, real scrape, address details, type confirmation, samples, pricing and dialogs; landing + hybrid tests                           |
| `components/landing/Hero`                                               | Shared input/analysis state, separate hybrid headline and layout   | `classifyInput`, `validateUrl`, lookup/scrape/start services and ModeModal unchanged; no prototype manual detector                                                        |
| `ReportsSection`, `ReportShowcase`, `ModePreview`                       | Hybrid grouped rental/sale samples and existing detailed showcase  | Samples clearly separate from live reports; links go to the four existing demo URLs                                                                                       |
| Coverage, FounderNote, LandingSunScout, How, Pricing, FAQ, CTA sections | Retained in scrollable homepage                                    | Sources, seasonal controls, founder note, Free / CAD $10 monthly Pro, FAQ and actions retained                                                                            |
| `/analyzing?token=&mode=` → `pages/analyzing`                           | Shared flow with scoped surfaces                                   | Real token/mode, progress, timeout, retry, missing input, anonymous/auth/quota gates; analyzing tests                                                                     |
| `/investor-report` → `InvestorReport` + `DemoNotice`                    | Shared complete sample report                                      | Financing, metrics, comps, cash-to-close, OSFI, flags, equity/exit, neighbourhood, SunScout, STR, diligence, sources; PR4 + parity tests                                  |
| `/tenant-report` → `TenantReport` + `DemoNotice`                        | Shared complete sample report                                      | Rent positioning, accuracy, listed/reality, negotiation, monthly costs, inclusions, commute, schools, sun, comps map, unit detail, checklist, verdict; PR5 + parity tests |
| `/personal-report` → `PersonalBuyerPage` + `DemoNotice`                 | Shared complete sample report                                      | Monthly outflow, value, sales, schools, neighbourhood, sun, risks, checklist, conversion; PR6 tests                                                                       |
| `/landlord-report` → `LandlordPage` + `DemoNotice`                      | Shared complete sample report                                      | Rent positioning, investment metrics, financing, costs, risks, market, sun, STR, checklist; PR6 tests                                                                     |
| `/r/:token` → `ReportPage`, investor mode                               | Shared saved-report renderer                                       | Fetches by token; authenticates owner edits; full analysis, provenance, sliders, management toggle, overrides, facade, ledger; ReportPage tests                           |
| `/r/:token`, landlord mode                                              | Shared `ReportPage` investment renderer                            | Owner value / mortgage inputs, re-analysis and rent control; no invented purchase price or score                                                                          |
| `/r/:token`, tenant mode                                                | Shared `TenantReport` with real listing/analysis                   | No fixture fallback for missing live facts; provisional score and comp availability retained                                                                              |
| `/r/:token`, personal mode                                              | Shared `PersonalBuyerPage` with real listing/analysis              | Live HomeScore suppression, comp provenance and missing sections retained                                                                                                 |
| `/account?view=saved\|profile\|plan\|notifications` → `AccountPage`     | Shared page                                                        | Session, loading/error/empty history, profile, notifications and verified billing; PR7 tests                                                                              |
| `/auth/confirm` → `MagicLinkConfirmedPage`                              | Shared page                                                        | Provider confirmation/pending/failure; MagicLinkConfirmedPage + PR7 tests                                                                                                 |
| `/auth/reset` → `PasswordResetRequestPage`                              | Shared page                                                        | Email validation, submit, pending, success/error; PR7 tests                                                                                                               |
| `/auth/reset/confirm` → `PasswordResetConfirmPage`                      | Shared page                                                        | Recovery session, password validation, pending/error; PR7 tests                                                                                                           |
| `/auth/verified` → `EmailVerifiedPage`                                  | Shared page                                                        | Verification status; PR7 tests                                                                                                                                            |
| `/welcome-to-pro` → `StripeWelcomePage`                                 | Shared page                                                        | Actual billing refresh, polling/error; no assumed activation; PR7 tests                                                                                                   |
| `/checkout/cancelled` → `StripeCancelledPage`                           | Shared page                                                        | Cancelled checkout and return actions; PR7 tests                                                                                                                          |
| `/methodology` → `MethodologyPage`                                      | Shared page                                                        | Actual model weights, availability and limitations                                                                                                                        |
| `/privacy`, `/terms` → pages + `legal/LegalShell`                       | Shared pages                                                       | Legal content, table of contents and anchors                                                                                                                              |
| `*` → `NotFoundPage`                                                    | Shared page                                                        | Unknown routes and recovery action; PR7 tests                                                                                                                             |
| `/print-report` → `PrintReportPage`                                     | Shared dedicated print renderer                                    | Supplied payload, ready/error status and paid export contract; PrintReportPage tests                                                                                      |
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

## Verification and remaining work

This increment adds the developer design boundary, scoped hybrid tokens, a composed hybrid
homepage hero, rental/sale sample navigation, detailed tenant preview and accessible mobile
section navigation. Existing report, account, auth, billing, legal and print renderers remain
shared and receive scoped palette/typography treatment. The verdict block stays dark in both
themes. This is a foundation/homepage increment, **not a claim of a completed visual migration**:
detailed reference-fidelity review and any resulting per-page layout work remain outstanding.

New source locations: `components/hybrid/` (provider, nav, hero intro, report chooser, tests),
`hooks/useAppDesign.ts`, `lib/appDesign.ts` and its tests, `types/design.ts`, and
`styles/hybrid.css`, `styles/hybrid-tokens.css`, `styles/hybridContrast.test.ts`. Structure is
documented here because the canonical `CLAUDE.md` structure is protected in this task.

### Builder execution, 2026-09-24

| Check                                                     | Result                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Web / API typecheck                                       | Passed                                                                                                                                        |
| Web / API lint                                            | Passed                                                                                                                                        |
| Web focused tests (design + landing)                      | Blocked before collection: esbuild `spawn EPERM`                                                                                              |
| Complete web suite, including PR4–PR8 configured includes | Attempted; same startup block; no assertions executed                                                                                         |
| API configured test command                               | Worker startup blocked (`spawn EPERM`)                                                                                                        |
| API tests with `--runInBand`                              | 39 suites passed; 503 passed, 2 existing skips                                                                                                |
| Calc engine                                               | 469 passed, 2 existing skips (network checks), 41 warnings                                                                                    |
| Scrapers                                                  | 212 passed, 12 warnings                                                                                                                       |
| Python lint                                               | Configured parallel run denied Windows pipe creation; `--jobs=1` passed                                                                       |
| Python format                                             | Configured run and `--workers 1` produced no result and were interrupted; unverified                                                          |
| Web production build                                      | TypeScript stage passed; Vite/esbuild startup blocked (`spawn EPERM`)                                                                         |
| Playwright / browser E2E                                  | Startup failed on Windows pipe creation (`WinError 5`); zero browser scenarios executed                                                       |
| Hybrid contrast calculation                               | Direct offline check: minimum text/status ratio 4.76 light / 6.22 dark on page/card/elevated surfaces; focused Vitest tests added but blocked |
| Diff whitespace                                           | Passed                                                                                                                                        |

Existing API error-path tests emit expected mocked service errors despite the passing result.
Neither the blocked commands nor existing skips are counted as passes. No tests were changed,
skipped or removed to obtain these results; no snapshots were regenerated.

`scripts/smoke-test.mjs` was inspected but not executed: it writes database records using a
service-role credential and requires a configured API, engine and isolated database. No such
test environment was supplied; this turn does not authorize production access. The coordinator
loop's own E2E suite is for coordinator changes, not this UI increment, and was not run.

Still required: successful full Vitest/build/format gates, both-design browser runs at desktop
and mobile widths, keyboard/modal/anchor checks, full manual checklist execution, saved-report
and print visual review, and multi-segment owner review. Unit tests cannot establish CSS layout
or browser behavior. No deployment, migration, credentials change, commit or promotion occurred.

The migration is not complete until exact-candidate review, configured gates, browser coverage and the final
multi-segment human gate are satisfied. Existing manual checklists: `UITESTING.md`, PR4
`chrome_ui_tests.md`, PR5 `PR5_chrome_ui_tests_FINAL.md`, PR6 `CHROME_UI_TESTS.md`, PR7
`PR7_chrome_ui_tests.md`, PR8 responsive tests and `docs/TESTING.md`. Manual checklists are
not automated browser tests and unit success does not mark them executed.

### Coordinator feedback follow-up, 2026-09-24

Baseline `e3da7e6056785fc801ff6f6dabd7210eb1236dee` already contains the foundation above.
The implementation brief's round-2 feedback identifies an ambiguous rollback assertion:
both the legacy header and pricing section contain a `Start free` button. The test now
queries the banner's exact-name button, checks visibility, and clicks it to verify the
existing sign-in dialog opens. No application behavior or test requirement is changed.

Web typecheck, web lint and `git diff --check` passed for this follow-up. The focused
`hybrid.test.tsx`, `appDesign.test.ts` and `hybridContrast.test.ts` Vitest command was
attempted but failed before collection with esbuild `spawn EPERM`; no assertions ran.
Per the brief's follow-up instruction, the coordinator must rerun every configured gate.
No new browser scenarios were executed, and all remaining migration and human-review
requirements above remain open.
