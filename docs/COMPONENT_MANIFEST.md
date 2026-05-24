# Component Manifest

Every design artifact mapped to the React component it should become in your `apps/web/src/` codebase per `CLAUDE.md`. Build the **shared components first** (top of the list) — every page-level component depends on them.

---

## 🟦 1. Shared components — build these FIRST

Location: `apps/web/src/components/shared/`

| Component | Purpose | Design source |
|---|---|---|
| `<Wordmark height>` | "Prop*Scout*" + Scout-Mark logo | `components.jsx::Wordmark` |
| `<ScoutMark size color>` | Just the glyph (used as watermark too) | `components.jsx::ScoutMark` |
| `<Icon name size stroke>` | Line-icon library (arrow, link, check, sun, moon, house, chart, shield, doc, map, key, flag, sparkle, paste, plus, minus, dot) | `components.jsx::Icon` |
| `<Chip>` | Inline pill | `components.jsx::Chip` |
| `<Button variant="primary\|ghost\|accent">` | All three button styles | `.btn` classes |
| `<Card>` | Surface + line + shadow + radius-lg | `.card` class |
| `<SectionHead n topic question verdict tone>` | Every report section header | `tenant-sections.jsx::SectionHead` |
| `<VerdictPill tone label>` | The pass/caution/fail status pill | `.verdict-pill` class |
| `<Nav variant>` | Top nav — variants for landing vs. report vs. account | `components.jsx::Nav` + each report's own variant |
| `<Footer>` | Shared footer | `components.jsx::Footer` |
| `<SignInModal open onClose>` | Sign-in / sign-up bottom-sheet | `components.jsx::SignInModal` |

---

## 🟦 2. Domain-specific components

Location: `apps/web/src/components/analysis/`

| Component | Purpose | Design source |
|---|---|---|
| `<DealScore score size label showVerdict animate>` | Radial gauge — auto-hides label/verdict at small sizes | `report-preview.jsx::DealScore` |
| `<Metric label value sub status>` | Headline metric tile (cap rate, cash flow, etc.) | `report-preview.jsx::Metric` |
| `<RentalCompsBar low mid high ask>` | Percentile range bar + hover diamond marker | `report-preview.jsx::RentalCompsBar` |
| `<AIVerdictBlock eyebrow headline sub addr compact>` | Dark full-bleed AI verdict card | `report-preview.jsx::AIVerdictBlock` |
| `<RiskRow tone label detail>` | Inline risk flag row (red/amber/good) | `report-preview.jsx::RiskRow` |
| `<MiniMap height address pins>` | Mapbox-style mini map — **replace with real Mapbox GL JS** in production | `report-preview.jsx::MiniMap` |
| `<PropertyHero listing score>` | Shared photo grid + chips + address + sticky score card | `tenant-blocks.jsx::PropertyHero` (and the investor / personal / landlord variants — consolidate) |
| `<FlagDeepRow flag>` | Expandable risk flag with evidence quote + "Ask before signing" | `tenant-sections.jsx::FlagDeepRow` |

---

## 🟦 3. Investor-specific (mostly reusable for Landlord)

Location: `apps/web/src/components/investor/`

| Component | Purpose | Design source |
|---|---|---|
| `<FinancingSliders financing onChange>` | Live down-payment / rate / amort sliders + preset chips | `investor-blocks.jsx::FinancingSliders` |
| `<OSFICard osfi financing>` | OSFI stress test card | `investor-blocks.jsx::OSFICard` |
| `<LTTTable ltt price toronto>` | Ontario LTT bracket table | `investor-blocks.jsx::LTTTable` |
| `<EquityChart equityCurve totalCashInvested>` | 20-year line chart with hover details | `investor-blocks.jsx::EquityChart` |
| `<InvestmentMetricsSection metrics property>` | 8-tile metrics grid + annual expense breakdown | `investor-sections.jsx` |
| `<NeighbourhoodSection property>` | 6 stat tiles + comparable sales + appreciation card | `investor-sections-2.jsx` |
| `<STRPlaceholderSection property>` | Phase-2 placeholder + STR legality card | `investor-sections-2.jsx` |

---

## 🟦 4. Personal-buyer-specific

Location: `apps/web/src/components/personal/`

| Component | Purpose | Design source |
|---|---|---|
| `<SchoolCard school>` + `<SchoolColumn>` | Single school card with EQAO + Fraser + catchment badge | `personal-sections-2.jsx` |
| `<PBTrueCostSection property monthly>` | Itemized monthly cost table | `personal-sections.jsx` |
| `<PBFMVSection property score>` | FMV positioning bar | `personal-sections-2.jsx` |
| `<PBSalesSection comps>` | Comparable sales table | `personal-sections-2.jsx` |

---

## 🟦 5. Tenant-specific

Location: `apps/web/src/components/tenant/`

| Component | Purpose | Design source |
|---|---|---|
| `<TenantSchoolsSection>` | Slim schools section (1 per board × 3 levels) | `tenant-schools.jsx` |
| `<NegotiationSection>` | Leverage card + suggested-message card | `tenant-sections-2.jsx` |
| `<ListedVsRealitySection>` | Side-by-side "what listing says" vs "what you get" | `tenant-sections-3.jsx` |
| `<WhatsIncludedSection>` | Amenities grid with included/extra/unclear coloring | `tenant-sections-3.jsx` |
| `<LocationCommuteSection>` | Walk/Transit/Bike scores + distances | `tenant-sections-3.jsx` |

---

## 🟦 6. Paywall

Location: `apps/web/src/components/paywall/`

| Component | Purpose | Design source |
|---|---|---|
| `<ProBadge tier>` | Small inline Pro marker with lock icon | `paywall-components.jsx::ProBadge` |
| `<UpgradeCard headline sub ctaLabel dark>` | Consistent upgrade pitch — used inside paywalls | `paywall-components.jsx::UpgradeCard` |
| `<LockedSection headline sub mockContent height>` | Blurred content + upgrade overlay | `paywall-components.jsx::LockedSection` |
| `<TruncatedVerdict firstParagraph>` | AI verdict with paragraph 2 blurred + inline upgrade strip | `paywall-components.jsx::TruncatedVerdict` |
| `<LockedButton label icon onClick>` | Lock-icon button (PDF, Save) — opens UpgradeModal | `paywall-components.jsx::LockedButton` |
| `<UpgradeModal open onClose feature>` | Feature-specific upgrade modal (5 variants) | `paywall-components.jsx::UpgradeModal` |
| `<HardLimitGate onClose monthlyLimit used resetsIn>` | Full-screen blocker on monthly limit | `paywall-components.jsx::HardLimitGate` |

---

## 🟦 7. State & error patterns

Location: `apps/web/src/components/states/`

| Component | Purpose | Design source |
|---|---|---|
| `<BlockState tone icon eyebrow headline body primary secondary>` | Full-page error/gate state | `error-states.jsx::BlockState` |
| `<StubState>` | Same pattern for auth landings | `auth-stubs.jsx::StubState` |
| `<ProvinceGate submitted onSubmit>` | Non-Ontario waitlist | `error-states.jsx::ProvinceGateState` |
| `<NoCompsInlineState>` | Inline low-confidence callout | `error-states.jsx::NoCompsInlineState` |
| `<ScraperPartialInlineState>` | Inline "X of Y fields" + missing-field inputs | `error-states.jsx::ScraperPartialInlineState` |

---

## 🟦 8. Page-level routes

Location: `apps/web/src/pages/` (Next-style) or `apps/web/src/routes/` (Tanstack/React Router)

| Page | Route | Design source |
|---|---|---|
| Landing | `/` | `index.html` + `app.jsx` + `sections.jsx` |
| URL paste (scraping screen) | `/analyzing` | `pre-report.jsx::ScrapingProgress` |
| Manual entry fallback | `/analyzing/manual` | `pre-report.jsx::ManualEntry` |
| Tenant report | `/r/[token]?mode=tenant` | `tenant-report.jsx` |
| Investor report | `/r/[token]?mode=investor` | `investor-report.jsx` |
| Personal buyer report | `/r/[token]?mode=personal` | `personal-report.jsx` |
| Landlord report | `/r/[token]?mode=landlord` | `landlord-report.jsx` |
| Account dashboard | `/account` (with `?view=saved\|profile\|plan\|notifications`) | `account-app.jsx` |
| Privacy policy | `/privacy` | `legal.jsx` (with `pageKey="privacy"`) |
| Terms of service | `/terms` | `legal.jsx` (with `pageKey="terms"`) |
| 404 | `*` catch-all | `error-states.jsx::NotFoundState` |
| Magic-link confirm | `/auth/confirm` | `auth-stubs.jsx::MagicLinkConfirmed` |
| Password reset request | `/auth/reset` | `auth-stubs.jsx::PasswordResetRequest` |
| Password reset confirm | `/auth/reset/confirm` | `auth-stubs.jsx::PasswordResetConfirm` |
| Email verified | `/auth/verified` | `auth-stubs.jsx::EmailVerified` |
| Stripe welcome | `/welcome-to-pro` | `auth-stubs.jsx::StripeWelcomePro` |
| Stripe cancelled | `/checkout/cancelled` | `auth-stubs.jsx::StripeCancelled` |

---

## 🟦 9. Modals (mounted at app root, controlled by global state)

| Component | Trigger | Design source |
|---|---|---|
| `<ModeModal open listing onSelect>` | After URL paste, before scraping | `mode-modal.jsx` |
| `<SignInModal>` | "Sign in" / "Read full verdict" link clicks | `components.jsx::SignInModal` |
| `<UpgradeModal>` | Free user clicks any locked Pro action | `paywall-components.jsx::UpgradeModal` |
| `<HardLimitGate>` | Free user pastes 4th URL in a month | `paywall-components.jsx::HardLimitGate` |

---

## 🟦 10. Calc engine — port pure JS → Python

Location: `services/calc-engine/calculations/` per `CLAUDE.md`

Every function in `investor-calc.jsx` is pure (no DOM, no React) and translates directly to Python:

| JS function | Python equivalent | Calc engine file |
|---|---|---|
| `monthlyPayment(principal, rate, years)` | `monthly_payment(...)` | `mortgage.py` |
| `remainingBalance(...)` | `remaining_balance(...)` | `mortgage.py` |
| `ontarioLTT(price, isToronto)` | `ontario_ltt(price, is_toronto)` | `closing_costs.py` |
| `osfiStressTest(input)` | `osfi_stress_test(...)` | `osfi.py` |
| `computeMetrics(property, financing)` | `compute_metrics(...)` | `investment.py` |
| `computeDealScore(metrics, property)` | `compute_deal_score(...)` | `deal_score.py` |
| `closingCostsEstimate(price)` | `closing_costs_estimate(...)` | `closing_costs.py` |
| `maintenanceRate(yearBuilt)` | `maintenance_rate(...)` | `investment.py` |

Run the regression tests from `CLAUDE.md` §12 to confirm the Python port produces identical outputs to the JS designs.

---

## Build-order priority (matches MVP_TODO weeks 3–4 → 8)

1. **Shared (§1)** — tokens.css + every primitive in §1
2. **Calc engine port (§10)** — Python, with tests
3. **Landing + Mode modal** — first user-facing route
4. **Investor report (§3 + analysis components from §2)** — biggest single piece
5. **Tenant report (§5 + reuse §2)** — free funnel
6. **Personal + Landlord (§4 + reuse §3 sections)**
7. **Account dashboard (§8)** + auth stubs
8. **Paywall states (§6)** wired into every report
9. **Error/empty states (§7)** wired into every route
10. **Legal + 404**
11. **Mobile responsive pass** — all routes

Don't try to do anything in parallel until the shared components in §1 are stable.
