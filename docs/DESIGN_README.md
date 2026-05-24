# PropScout MVP · Design Handoff to Claude Code

> **A complete design system + 13 finished UI screens, ready to implement in your `propscout` codebase.**
>
> This bundle contains HTML prototypes that are **design references, not production code to copy**. Recreate them in your real React + TypeScript stack (per `CLAUDE.md`) using shared components — don't ship the HTML directly.

---

## Quick start

1. Read this README in full (10 min)
2. Skim `COMPONENT_MANIFEST.md` to see what to build first
3. Open `OPENING_PROMPT.md` and paste it into your first Claude Code session
4. Drop `tokens.css` into `apps/web/src/styles/`
5. Build from the manifest, starting with shared components (top of the manifest list)

---

## Fidelity

**High-fidelity.** Every screen is pixel-final: real colors, real typography, real spacing, real interactions. Recreate them faithfully. Where data is mocked (property listings, scores, comps), wire the same shapes to real API responses.

---

## What's in this package

```
design_handoff_propscout_mvp/
├── README.md                  ← this file — the design system summary
├── COMPONENT_MANIFEST.md      ← every design surface → which React component to build
├── OPENING_PROMPT.md          ← paste this into your first Claude Code session
├── tokens.css                 ← CSS variables (light + dark) — import to apps/web/src/styles/
└── designs/                   ← all 13 HTML prototypes + JSX source
    ├── index.html             ← Landing
    ├── Mode Modal.html        ← The for-sale/for-rent routing modal
    ├── Tenant Report.html     ← The free funnel (12 sections)
    ├── Investor Report.html   ← Monetised core (live financing sliders, equity chart)
    ├── Personal Buyer Report.html
    ├── Landlord Report.html
    ├── Account.html           ← Saved analyses + Settings + Plan + Notifications
    ├── Paywall States.html    ← All 5 paywall touchpoints
    ├── Error States.html      ← 10 gate/error/empty states
    ├── Pre Report Flows.html  ← Scraping progress + manual entry fallback
    ├── Auth & Billing Stubs.html
    ├── Legal Pages.html       ← Privacy + Terms
    ├── Mobile Pass.html       ← iOS + Android funnel
    └── *.jsx                  ← Supporting React component files
```

---

## The 13 designed surfaces

| # | Design surface | File | Built around |
|---|---|---|---|
| 1 | Landing / marketing home | `index.html` | URL paste hero · embedded sample report · pricing · FAQ |
| 2 | Mode-selection modal | `Mode Modal.html` | One-question routing (Investment / Personal · Tenant / Landlord) |
| 3 | Tenant report | `Tenant Report.html` | Free, no-login, 12 sections incl. schools + listing-accuracy flags |
| 4 | Investor report | `Investor Report.html` | Live financing sliders · OSFI · LTT · equity chart · deal score |
| 5 | Personal buyer report | `Personal Buyer Report.html` | True monthly cost · comps · **schools with EQAO/Fraser** |
| 6 | Landlord report | `Landlord Report.html` | Variant of Investor with **rent-positioning slider** |
| 7 | Paywall states | `Paywall States.html` | Truncated verdict · locked sections · hard limit gate · upgrade modal |
| 8 | Account dashboard | `Account.html` | Saved analyses · Profile · Plan + billing · Notifications |
| 9 | Error & gate states | `Error States.html` | Province gate · US property · expired · scraper fail · no comps · 404 |
| 10 | Pre-report flows | `Pre Report Flows.html` | Full-screen scraping progress + manual entry fallback form |
| 11 | Auth + Stripe stubs | `Auth & Billing Stubs.html` | Magic link · reset · verify · Stripe return |
| 12 | Legal | `Legal Pages.html` | Privacy + Terms with TOC sidebar |
| 13 | Mobile pass | `Mobile Pass.html` | iOS + Android frames of the funnel |

---

## Design system

### Typography

- **Display**: `Instrument Serif` (italic for accented words like *really*, *fairly*, *honest*) — Google Fonts
- **Body**: `Geist` — weights 300, 400, 500, 600, 700
- **Mono / data**: `Geist Mono` — for eyebrows, percentages, dollar amounts, codes

All three loaded once via:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**Type scale (clamp-based, fluid)**
```
h1 — clamp(40px, 5vw, 72px)  · line-height 0.98 · letter-spacing -0.035em
h2 — clamp(30px, 3.6vw, 48px) · line-height 1.06 · letter-spacing -0.03em
h3 — 20–24px                  · line-height 1.2
body — 16px                   · line-height 1.5–1.65
mono eyebrow — 10–11px        · letter-spacing 0.14–0.18em · uppercase
```

**Italics are part of the brand** — every section question (`Is the rent fair?`, `Does the deal pencil?`) uses Instrument Serif italic on the key noun. Apply consistently.

### Colors (full token list in `tokens.css`)

```css
/* Light mode */
--bg:           #F1ECE2;  /* warm cream — page background */
--bg-elev:      #FBF7EE;  /* lifted cream — input fields, soft cards */
--surface:      #FFFFFF;  /* hard surface — cards */
--ink:          #0E1320;  /* near-black with cool tint — text + buttons */
--ink-2:        #3B3A35;  /* body copy */
--muted:        #76716A;  /* labels, hints */
--line:         rgba(14,19,32,0.10);
--line-strong:  rgba(14,19,32,0.16);

--accent:       #D97757;  /* terracotta — brand + Pro / CTA */
--accent-ink:   #FFFFFF;

/* Data-state colors — used for verdicts, status pills, deal-score gauge */
--pass:         #4F7A48;  /* sage — good deal, pass */
--caution:      #B98724;  /* amber — caution, soft warning */
--fail:         #B14A37;  /* clay — hard pass, fail */
```

Dark mode tokens are defined on `[data-theme="dark"]`. See `tokens.css`.

### Spacing & radii

```css
--radius-sm: 8px;
--radius:    14px;
--radius-lg: 22px;
--maxw:      1240–1320px;     /* page container max-width */
--gutter:    clamp(20px, 4vw, 56px);
```

Section padding rhythm: `padding-top: clamp(56px, 7vw, 96px)`.

### Shadows

```css
--shadow-card: 0 1px 0 rgba(14,19,32,.04), 0 8px 28px -16px rgba(14,19,32,.18);
--shadow-pop:  0 24px 48px -24px rgba(14,19,32,.35), 0 4px 16px -8px rgba(14,19,32,.16);
```

### Component vocabulary (build once, reuse everywhere)

| Token / class | What it is | Where it appears |
|---|---|---|
| `.btn-primary` | Ink-background pill, hovers to terracotta | Every CTA across the product |
| `.btn-ghost` | Transparent pill with line-strong border, hovers to terracotta | Secondary actions |
| `.btn-accent` | Terracotta pill | Upgrade / save-report CTAs |
| `.chip` | Small inline tag, chip-bg + line border | Property facts, filter chips |
| `.card` | Surface + line + shadow-card + radius-lg | Every content card |
| `.verdict-pill` (pass · caution · fail) | Tonal pill with dot prefix | Section headers, results |
| `.section-tag` | Mono eyebrow with `―` prefix | Every page header |
| `Tweaks panel` (top-right) | Design-review only — **does not ship** | Every prototype |

### Patterns (DRY in production)

These patterns repeat verbatim across reports — extract each into one shared component:

1. **`<SectionHead n topic question verdict tone>`** — every section uses §0X mono eyebrow + serif question with italic accent + verdict pill on the right. See `tenant-sections.jsx::SectionHead`.

2. **`<PropertyHero listing score>`** — every report has photo grid (left) + chips/address (left) + sticky right card with gauge + verdict + headline metrics + actions.

3. **`<DealScore score size label showVerdict>`** — radial gauge with optional label and verdict pill. Auto-hides label and verdict at small sizes. Defined in `report-preview.jsx`.

4. **`<AIVerdictBlock>`** — dark full-bleed card with Scout-Mark watermark + live-dot + claude · sonnet tag.

5. **`<MiniMap height address pins>`** — SVG fake Mapbox map with comp pins. Replace with real Mapbox GL JS in production.

6. **`<RentalCompsBar low mid high ask>`** — percentile range bar with diamond marker + hover tooltip.

7. **`<UpgradeModal feature open onClose>`** — feature-specific upgrade pitch. Defined in `paywall-components.jsx`.

8. **Block state for errors / gates** — icon halo + eyebrow + serif headline + body + primary + secondary action. See `error-states.jsx::BlockState` and `auth-stubs.jsx::StubState`.

### Brand mark

Custom SVG glyph: **Scout-Mark** — a roof-line triangulation that doubles as a compass needle. In `components.jsx::ScoutMark`. Use:
- 28–32px alongside "PropScout" wordmark in navs
- 460–560px at 6–8% opacity as background watermark on dark hero cards (AI verdict, CTAs, hard-limit gate)

The wordmark itself uses Instrument Serif with italic on "Scout": **Prop*Scout***.

---

## Interactions / motion

- **Hover**: every interactive element transitions border + color to terracotta over 0.15s ease
- **Slider drag** (financing sliders, rent positioning): every metric on the page recalculates live
- **Modal open**: backdrop fades in over 0.25s, card translates up 8px + scales 0.98→1
- **Score gauge**: stroke-dashoffset animates from full → target over 1.4s cubic-bezier(.2,.7,.2,1)
- **Comp marker hover**: diamond scales 1.18× + turns accent, tooltip fades in
- **No emoji** in the UI. Ever. Use line-icon SVG (see `Icon` component for the inventory)

---

## What's mocked (replace with real data)

Every dataset constant in `*-data.jsx` and the inline mocks in section files (`PROPERTIES`, `PB_PROPERTY`, `PB_SCHOOLS`, `PB_COMPS`, `SAVED_ANALYSES`, `LL_PROPERTY`, `LL_RENT_COMPS`) — replace with API calls to your Fastify backend per `CLAUDE.md` § 4.

Pure functions in `investor-calc.jsx` (`computeMetrics`, `computeDealScore`, `monthlyPayment`, `ontarioLTT`, `osfiStressTest`) are **already production-ready** — port them to the Python calc engine at `services/calc-engine/calculations/` and they'll produce identical outputs.

---

## What changes on mobile

Mobile is real responsive design — the prototypes use flex/grid wrap, so most screens collapse naturally. The dedicated `Mobile Pass.html` shows specific mobile-only patterns for the funnel:

- **Modal becomes a bottom-sheet** — slides up from the bottom with drag handle. Choice cards stack vertically (side-by-side would crush at 380px).
- **Two-column reports collapse to single-column** — score card moves above content. Gauge shrinks to ~84px.
- **Sticky bottom action bar** — Save / Share / PDF collapse to a fixed bottom strip, always thumb-reachable.
- **AI verdict shows headline only** — full body expands via "Read full verdict" tap.

---

## Tweaks panel — **does not ship**

Every prototype has a tweaks panel in the top-right (theme toggle, accent picker, page-specific demo state). These exist purely for design review. **Do not port them.** In production, theme + accent come from user preferences in state.

---

## Files map · design surface → primary JSX file(s)

See `COMPONENT_MANIFEST.md` for the full mapping. Quick reference:

| Design surface | Primary jsx source |
|---|---|
| Landing | `app.jsx` + `sections.jsx` + `components.jsx` |
| Mode modal | `mode-modal.jsx` |
| Tenant report | `tenant-report.jsx` + `tenant-blocks.jsx` + `tenant-sections.jsx` + `tenant-sections-2.jsx` + `tenant-sections-3.jsx` + `tenant-schools.jsx` |
| Investor report | `investor-report.jsx` + `investor-calc.jsx` + `investor-blocks.jsx` + `investor-sections.jsx` + `investor-sections-2.jsx` |
| Personal buyer | `personal-report.jsx` + `personal-data.jsx` + `personal-sections.jsx` + `personal-sections-2.jsx` + `personal-sections-3.jsx` |
| Landlord | `landlord-report.jsx` + `landlord-data.jsx` + `landlord-sections.jsx` (reuses investor-* heavily) |
| Paywalls | `paywall-components.jsx` + `paywall-states.jsx` |
| Account | `account-app.jsx` + `account-views.jsx` |
| Errors | `error-states.jsx` |
| Pre-report flows | `pre-report.jsx` |
| Auth stubs | `auth-stubs.jsx` |
| Legal | `legal.jsx` |
| Mobile pass | `mobile-pass.jsx` + `ios-frame.jsx` + `android-frame.jsx` |

---

## Spec & build order

Your repo already has the authoritative documents — this design package is meant to slot in alongside them:

- `propscout_platform_spec.md` — single source of truth for features & business logic
- `CLAUDE.md` — coding standards, file structure, API service pattern, testing rules
- `MVP_TODO.md` — week-by-week build order

**Build order recommendation** (matches MVP_TODO weeks 3–4 frontend skeleton):

1. **Week 1**: Set up Vite + tokens.css + shared components (`SectionHead`, `Button`, `Chip`, `Card`, `DealScore`, `Icon`)
2. **Week 2**: Landing + Mode modal
3. **Week 3–4**: Investor report (the calc engine + report shell — biggest single piece)
4. **Week 5**: Tenant report (the free funnel — re-uses Investor patterns)
5. **Week 6**: Personal Buyer + Landlord (variants of the first two)
6. **Week 7**: Paywall states + Account + Error states + Auth stubs
7. **Week 8**: Legal + Mobile responsive pass

---

## Contact

If anything in the design needs clarification, the design files themselves are the source of truth — open them in a browser to see exact spacing, hover states, and animations. Where a spec value conflicts with a design value, follow the design — it was iterated on.

— PropScout Design Handoff · May 2026
