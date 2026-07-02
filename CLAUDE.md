# PropScout — Claude Code Session Instructions

You are building PropScout, a Canadian real estate analysis platform.
This file tells you everything you need to know to work effectively on this codebase.

---

## Files you must know

| File                         | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `propscout_platform_spec.md` | Single source of truth — architecture, features, formulas, prompts        |
| `CLAUDE.md`                  | This file — session instructions, coding standards, quick reference       |
| `TODO.md`                    | Full backlog across all phases                                            |
| `MVP_TODO.md`                | MVP scope only — tick off as tasks are completed                          |
| `TESTING.md`                 | Test for every feature, week by week — update when new features are added |
| `SETUP.md`                   | Pre-development checklist — accounts, tooling, CI/CD, legal               |

---

## Primary reference document

**`propscout_platform_spec.md`** is the single source of truth for this project.
Read it before making any architectural decision, adding any feature, or changing any data model.
If something is not in the spec, ask before building it.

Key sections to reference by task:

| Task                                             | Spec section          |
| ------------------------------------------------ | --------------------- |
| Adding or changing a report type                 | Section 3, 6, 7, 8, 9 |
| Changing pricing or feature access               | Section 4             |
| Changing the user flow or URL detection          | Section 5             |
| Changing investment calculations                 | Section 6, 10         |
| Changing the scraper                             | Section 11.2          |
| Changing the calc engine                         | Section 11.3          |
| Changing the database schema                     | Section 11.5          |
| Changing AI narrative prompts                    | Section 12            |
| Adding or changing APIs                          | Section 13            |
| Changing PDF output                              | Section 14            |
| Changing SunScout                                | Section 17            |
| Changing listing description extraction or flags | Section 19            |

---

## TEMPLATE CODE — important

Any code block in the spec marked with **TEMPLATE CODE** is a reference implementation,
not locked production code. These are starting points that will evolve during development.

Sections with TEMPLATE CODE markers:

- Section 11.2 — Realtor.ca scraper (endpoint URLs and field mappings will shift)
- Section 11.3 — Calc engine payload structure
- Section 11.5 — Database schema (run changes as Supabase migrations)
- Section 12 — AI narrative prompts (iterate on wording based on output quality)
- Section 17 — SunScout calculation (weights and benchmarks are starting assumptions)
- Section 19 — Extraction pipeline (regex patterns, confidence thresholds, flag types all grow over time)

When you update any TEMPLATE CODE section during development, update the spec doc too
so it stays accurate.

---

## Tech stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Frontend         | React + TypeScript                       |
| Backend API      | Fastify (Node.js)                        |
| Database         | Supabase (Postgres + Auth + Storage)     |
| Scraping         | Playwright on Railway                    |
| Calc engine      | Python FastAPI on Railway                |
| AI extraction    | Claude Haiku (claude-haiku-4-5-20251001) |
| AI narrative     | Claude Sonnet (claude-sonnet-4-6)        |
| Maps             | Mapbox GL JS                             |
| Sun path         | pvlib (runs locally, no API call)        |
| Payments         | Stripe                                   |
| PDF              | Puppeteer                                |
| Frontend hosting | Vercel                                   |
| Backend hosting  | Railway                                  |

---

## Design handoff

The product has **13 pixel-final HTML prototypes** in `docs/design_handoff_propscout_mvp/designs/`.
Every React component to build is mapped in `COMPONENT_MANIFEST.md`.
The first Claude Code session prompt is in `OPENING_PROMPT.md` — paste it verbatim.

**The designs are living documents.** They will be updated as the product evolves. Always check the latest version of the HTML file before building or modifying a component — never assume the version you saw previously is still current.

**Before writing any frontend code:**

1. Read `DESIGN_README.md` — covers the full design system
2. Open the HTML files in a browser: `npx serve docs/design_handoff_propscout_mvp/designs/`
3. Explore `Investor Report.html` and `Tenant Report.html` — the two most complex screens
4. Copy `tokens.css` into `apps/web/src/styles/` before writing a single component

**When a design changes:**

- Component not built yet → build from the new design, nothing else to do
- Component already built → update it to match; values come from tokens so most changes touch one file
- Whole section redesigned → check `COMPONENT_MANIFEST.md` for which React component maps to it
- `tokens.css` updated → replace `apps/web/src/styles/tokens.css` and check for visual regressions

**Design is the source of truth for:** colors, spacing, radii, shadows, hover states, animation timing, mobile collapse behaviour, component composition.

**Spec is the source of truth for:** business logic, formulas, calculations, feature gating, tier rules, data shapes, API contracts.

Where design conflicts with spec → **follow the design**.
Where design omits something the spec requires → **follow the spec** and flag it as a design gap.

---

## Design system rules

These rules come directly from `DESIGN_README.md` and `tokens.css`. Follow them without being asked.

### Typography

Three fonts — load all three, use each only for its intended purpose:

```html
<!-- In apps/web/index.html — load once -->
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

| Font               | Use                                                      | Never use for           |
| ------------------ | -------------------------------------------------------- | ----------------------- |
| `Instrument Serif` | Display headings, section questions, italic accent words | Body copy, data, labels |
| `Geist`            | All body copy, UI labels, buttons, navigation            | Data values, codes      |
| `Geist Mono`       | Eyebrows, percentages, dollar amounts, codes, tags       | Headings, body          |

**Italic is part of the brand.** Every section question uses Instrument Serif italic on the key noun — "Is the rent _fair_?", "Does the deal _pencil_?". Apply this consistently across all four report types.

### Tokens — never hardcode values

Every color, shadow, radius, and spacing value comes from `tokens.css`. Never write a raw hex, rgba, or pixel value in a component. Always use a CSS variable.

```css
/* Correct */
background: var(--surface);
color: var(--ink);
border: 1px solid var(--line);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-card);

/* Wrong — never do this */
background: #ffffff;
color: #0e1320;
border-radius: 22px;
```

Dark mode is handled entirely by the token system. Never write a `prefers-color-scheme` media query inside a component — set `data-theme="dark"` on the `<html>` element and the tokens handle the rest.

Key tokens to know by heart:

| Token       | Value (light) | Purpose                                               |
| ----------- | ------------- | ----------------------------------------------------- |
| `--bg`      | `#F1ECE2`     | Page background — warm cream                          |
| `--surface` | `#FFFFFF`     | Card background                                       |
| `--ink`     | `#0E1320`     | Primary text and buttons                              |
| `--accent`  | `#D97757`     | Terracotta — brand, Pro badge, CTAs, all hover states |
| `--pass`    | `#4F7A48`     | Sage — good deal, positive flags                      |
| `--caution` | `#B98724`     | Amber — soft warnings                                 |
| `--fail`    | `#B14A37`     | Clay — hard pass, red flags                           |

### Interactions — standard timing

Every interactive element follows the same motion system. Never deviate:

| Interaction                      | Timing                          | Effect                                                    |
| -------------------------------- | ------------------------------- | --------------------------------------------------------- |
| Hover (all interactive elements) | `0.15s ease`                    | Border + color → terracotta (`--accent`)                  |
| Modal open                       | `0.25s`                         | Backdrop fade + card translates up 8px + scales 0.98→1    |
| Deal score gauge animation       | `1.4s cubic-bezier(.2,.7,.2,1)` | stroke-dashoffset from full → target                      |
| Financing slider drag            | Instant (synchronous)           | Every metric on page recalculates live — no debounce      |
| Comp marker hover                | Instant                         | Diamond scales 1.18× + turns `--accent`, tooltip fades in |

### Absolute UI rules

- **No emoji anywhere in the UI. Ever.** Use line-icon SVG from the `<Icon>` component.
- **No hardcoded colors or spacing.** Always use tokens.
- **The Tweaks panel in the HTML prototypes does not ship.** It exists for design review only. Do not port it.
- **The ScoutMark watermark** (460–560px at 6–8% opacity) appears on dark hero cards only: AI verdict block, hard-limit gate, Pro CTA sections.
- **Wordmark styling**: "Prop*Scout*" — "Prop" in regular weight, "Scout" in Instrument Serif italic.

### Component build order

Build in this exact order — every later component depends on the earlier ones being stable:

1. `tokens.css` imported → shared primitives (`Wordmark`, `ScoutMark`, `Icon`, `Chip`, `Button`, `Card`, `SectionHead`, `VerdictPill`, `Nav`, `Footer`, `SignInModal`)
2. Calc engine Python port (no UI dependency)
3. Landing page + `<ModeModal>`
4. Investor report (largest single piece — all analysis components built here)
5. Tenant report (reuses investor patterns)
6. Personal buyer + Landlord (variants of above)
7. Paywall states + Account + Error states + Auth stubs
8. Legal + 404
9. Mobile responsive pass

Full mapping of every component to its design source file is in `COMPONENT_MANIFEST.md`.

---

## Coding best practices

These rules apply to every file written in this project.
Follow them without being asked. Never deviate without a documented reason.

---

### 1. File and folder structure rules

**One responsibility per file.** A file that does two unrelated things should be two files.

**Name files after what they do, not what they contain.**

- `useAnalysis.ts` not `hooks.ts`
- `realtorScraper.py` not `scraper.py`
- `calculateDealScore.py` not `utils.py`

**Never put business logic in a component file.**
Components render UI. All calculations, API calls, data transformations, and decision logic live in service files, hooks, or the calc engine.

---

### 2. Environment variables — absolute rules

**Never hardcode an API key, secret, token, or URL in any file.**
Every external service credential lives in a `.env` file and is accessed via environment variables only.

```
# .env (never committed to git)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
STRIPE_SECRET_KEY=...
WALKSCORE_API_KEY=...
MAPBOX_TOKEN=...
GOOGLE_PLACES_KEY=...
```

**`.env` is always in `.gitignore`.** If it is ever committed by mistake, rotate all keys immediately.

**`.env.example` is committed to git** with placeholder values so developers know which variables are needed:

```
# .env.example (safe to commit — no real values)
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
STRIPE_SECRET_KEY=your_stripe_secret_here
WALKSCORE_API_KEY=your_walkscore_key_here
MAPBOX_TOKEN=your_mapbox_token_here
GOOGLE_PLACES_KEY=your_google_places_key_here
```

---

### 3. API calls — service layer pattern

**API calls are never made directly inside React components or route handlers.**
Every external API has its own dedicated service file. Components and routes call the service — never the API directly.

**Frontend service files live at:** `apps/web/src/lib/services/`
**Backend service files live at:** `apps/api/src/services/`
**Python service files live at:** `services/calc-engine/services/`

**Naming convention:** `[thirdParty]Service.ts` or `[thirdParty]_service.py`

Examples of correct structure:

```
apps/api/src/services/
├── anthropicService.ts       # All Claude API calls (Haiku + Sonnet)
├── walkScoreService.ts       # Walk Score + Transit Score API
├── mapboxService.ts          # Mapbox geocoding and map tile calls
├── googlePlacesService.ts    # School discovery API calls
├── stripeService.ts          # Stripe subscription and billing
├── cmhcService.ts            # CMHC vacancy rate data
├── bankOfCanadaService.ts    # Mortgage rate feed
└── supabaseService.ts        # All Supabase database operations

apps/web/src/lib/services/
├── analysisService.ts        # Calls the Fastify API — never Supabase directly
├── authService.ts            # Supabase auth (signup, login, session)
└── reportService.ts          # PDF generation and share link creation

services/calc-engine/services/
├── anthropic_service.py      # Haiku extraction calls
├── walkscore_service.py      # Walk Score lookups
└── cmhc_service.py           # CMHC data fetching
```

**Example — correct pattern:**

```typescript
// apps/api/src/services/anthropicService.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateNarrative(input: NarrativeInput): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: buildNarrativePrompt(input) }],
  })
  return response.content[0].text
}
```

```typescript
// apps/api/src/routes/analysis.ts  ← route calls the service, never the API directly
import { generateNarrative } from '../services/anthropicService'

export async function analysisRoute(req, reply) {
  const narrative = await generateNarrative(req.body)
  reply.send({ narrative })
}
```

**Example — wrong pattern (never do this):**

```typescript
// WRONG — API called directly inside a route handler
export async function analysisRoute(req, reply) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await anthropic.messages.create({ ... })  // ← wrong
}
```

---

### 4. Supabase — access rules

**The frontend never calls Supabase directly for data queries.**
The frontend calls the Fastify API, which calls Supabase. The only exception is Supabase Auth — login, signup, and session management can be called from the frontend auth service.

```
React component
    → analysisService.ts (frontend)
        → Fastify API route
            → supabaseService.ts (backend)
                → Supabase database
```

**Never expose the Supabase service role key to the frontend.** The `SUPABASE_SERVICE_ROLE_KEY` is backend-only. The frontend only ever uses `SUPABASE_ANON_KEY`.

**All database changes go through migrations.** Never alter the schema directly in the Supabase dashboard. Every change is a new file in `supabase/migrations/` so the schema history is tracked.

Migration file naming: `YYYYMMDD_description.sql`
Example: `20260523_add_flag_overrides_table.sql`

---

### 5. TypeScript — strictness rules

**Strict mode is always on.** `tsconfig.json` must have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Never use `any`.** If a type is genuinely unknown, use `unknown` and narrow it explicitly.

**Every function has typed parameters and a typed return value.**

```typescript
// Correct
function calculateCapRate(noi: number, purchasePrice: number): number {
  return noi / purchasePrice
}

// Wrong
function calculateCapRate(noi, purchasePrice) {
  return noi / purchasePrice
}
```

**All shared types and interfaces live in a `/types` folder**, not inline in the file that first uses them.

```
apps/web/src/types/
├── analysis.ts      # Analysis, ReportMode, DealScore types
├── property.ts      # Listing, PropertyType, Province types
├── user.ts          # User, Tier, Subscription types
└── api.ts           # API request/response types

apps/api/src/types/
├── analysis.ts
├── property.ts
└── scraper.ts
```

---

### 6. React — component rules

**Component files contain only the component and its direct rendering logic.**
No API calls, no calculations, no business logic inside a component file.

**Custom hooks handle all stateful logic.**
If a component needs to fetch data, manage loading states, or transform data — that logic lives in a custom hook in `hooks/`.

```
apps/web/src/hooks/
├── useAnalysis.ts        # Fetches and manages analysis state
├── useRentalComps.ts     # Rental comps data and loading state
├── useSunScout.ts        # Sun hours calculation state
├── useAuth.ts            # Auth state and methods
└── useTier.ts            # Current user tier and feature access
```

**Example — correct pattern:**

```typescript
// hooks/useAnalysis.ts — logic lives here
export function useAnalysis(url: string) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    try {
      const result = await analysisService.run(url)
      setAnalysis(result)
    } catch (e) {
      setError('Analysis failed — try again')
    } finally {
      setLoading(false)
    }
  }

  return { analysis, loading, error, run }
}

// components/AnalysisReport.tsx — component only renders
export function AnalysisReport({ url }: { url: string }) {
  const { analysis, loading, error, run } = useAnalysis(url)

  if (loading) return <ProgressDisplay />
  if (error) return <ErrorState message={error} />
  if (!analysis) return null

  return <ReportLayout analysis={analysis} />
}
```

**One component per file.** If a file exports two components, split it.

**Component folder structure — feature-based, not type-based:**

```
apps/web/src/components/
├── analysis/
│   ├── DealScorecard.tsx
│   ├── InvestmentMetrics.tsx
│   ├── RentalComps.tsx
│   ├── FinancingScenarios.tsx
│   ├── RiskFlags.tsx
│   └── AINarrative.tsx
├── reports/
│   ├── ReportA.tsx
│   ├── ReportB.tsx
│   ├── ReportC.tsx
│   └── ReportD.tsx
├── sunscout/
│   ├── SunScoutPanel.tsx
│   ├── SunArcViz.tsx
│   └── SeasonalGrid.tsx
├── schools/
│   └── SchoolRankings.tsx
├── shared/
│   ├── ProgressDisplay.tsx
│   ├── ErrorState.tsx
│   ├── TierGate.tsx          # Blurred paywall component
│   └── ModeModal.tsx         # Investment/personal and tenant/landlord modal
└── layout/
    ├── Header.tsx
    └── Footer.tsx
```

---

### 7. Python — structure rules

**All Python services use type hints on every function.**

```python
# Correct
def calculate_cap_rate(noi: float, purchase_price: float) -> float:
    return noi / purchase_price

# Wrong
def calculate_cap_rate(noi, purchase_price):
    return noi / purchase_price
```

**Every function has a docstring** explaining what it does, its inputs, and its outputs.

```python
def calculate_cap_rate(noi: float, purchase_price: float) -> float:
    """
    Calculate the capitalisation rate for a property.

    Args:
        noi: Net Operating Income (annual rent minus operating expenses)
        purchase_price: Total purchase price of the property

    Returns:
        Cap rate as a decimal (e.g. 0.045 for 4.5%)
    """
    return noi / purchase_price
```

**Python file structure inside `services/calc-engine/`:**

```
services/calc-engine/
├── main.py                   # FastAPI app — routes only, no logic
├── routers/
│   └── analysis.py           # Route handlers — call services, return responses
├── services/
│   ├── anthropic_service.py  # All Claude API calls
│   ├── walkscore_service.py  # Walk Score API
│   └── cmhc_service.py       # CMHC data
├── calculations/
│   ├── mortgage.py           # Mortgage payment, amortisation
│   ├── investment.py         # Cap rate, CoC, DSCR, GRM, cash flow
│   ├── closing_costs.py      # LTT by province, closing cost estimates
│   ├── deal_score.py         # Deal score formula (spec Section 10)
│   └── osfi.py               # OSFI stress test calculation
├── extraction/
│   ├── regex_rules.py        # Deterministic flag patterns (spec Section 19)
│   ├── haiku_extraction.py   # Claude Haiku JSON extraction
│   └── logic_gate.py         # Confidence threshold merging
├── sunscout/
│   └── sun_path.py           # NREL SPA via pvlib (spec Section 17)
├── models/
│   └── schemas.py            # Pydantic models for all request/response types
└── tests/
    ├── golden_dataset/
    │   ├── golden_cases.json
    │   └── test_extraction.py
    ├── test_calculations.py
    ├── test_deal_score.py
    └── test_osfi.py
```

**No raw `dict` types in function signatures.** Use Pydantic models for all API inputs and outputs.

```python
# Correct — Pydantic model
from pydantic import BaseModel

class PropertyInput(BaseModel):
    address: str
    price: int
    annual_taxes: int
    condo_fee_monthly: int | None = None
    condo_fee_known: bool = False

def analyse(property: PropertyInput) -> AnalysisOutput:
    ...

# Wrong — raw dict
def analyse(property: dict) -> dict:
    ...
```

---

### 8. Error handling rules

**Every external call is wrapped in try/catch (TypeScript) or try/except (Python).**
Never let an unhandled exception surface to the user as an error screen.

**Errors are logged server-side and shown to the user as a friendly message.**
Never show a raw error message, stack trace, or API error response to the user.

**The app never crashes because one section failed.**
If the AI narrative fails, the rest of the report still loads.
If the SunScout calculation fails, the rest of the report still loads.
If the rental comps query returns no results, the report shows the low-confidence warning — not an error.

```typescript
// Correct — isolated failure per section
async function buildReport(listing: Listing): Promise<Report> {
  const [metrics, comps, narrative] = await Promise.allSettled([
    calcEngine.run(listing),
    compsService.query(listing.postalCode, listing.beds),
    anthropicService.generateNarrative(listing),
  ])

  return {
    metrics: metrics.status === 'fulfilled' ? metrics.value : null,
    comps: comps.status === 'fulfilled' ? comps.value : null,
    narrative: narrative.status === 'fulfilled' ? narrative.value : NARRATIVE_FALLBACK,
  }
}
```

**API errors have consistent shape across the entire backend:**

```typescript
// All error responses follow this shape
{
  "error": true,
  "code": "SCRAPER_FAILED",          // machine-readable code
  "message": "Could not read that listing — enter details manually",  // user-facing
  "details": "..."                   // optional, internal only, not sent to frontend
}
```

---

### 9. Security rules

**Validate all user inputs server-side.** Never trust data from the frontend.

**Rate limit all public endpoints.** The URL analysis endpoint is particularly exposed.
Use Fastify's `@fastify/rate-limit` plugin:

```typescript
// apps/api/src/plugins/rateLimit.ts
import rateLimit from '@fastify/rate-limit'

fastify.register(rateLimit, {
  max: 10, // 10 requests
  timeWindow: '1 minute', // per minute per IP
})
```

**The Stripe webhook endpoint verifies the signature on every request.**
Never process a Stripe webhook without verifying it came from Stripe.

```typescript
// Correct — verify before processing
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
```

**SQL queries always use parameterised queries.** Never concatenate user input into a query string.

```typescript
// Correct — parameterised
const { data } = await supabase.from('analyses').select('*').eq('user_id', userId) // ← parameterised, safe

// Wrong — never do this
const query = `SELECT * FROM analyses WHERE user_id = '${userId}'` // ← SQL injection risk
```

---

### 10. Git commit conventions

Every commit message follows this format:

```
type(scope): short description

Types:
  feat     — new feature
  fix      — bug fix
  refactor — code change that is not a feature or bug fix
  test     — adding or updating tests
  docs     — documentation only
  chore    — dependency updates, config changes

Examples:
  feat(scraper): add Zillow.ca listing type detection
  fix(calc): correct Ontario Toronto LTT double-bracket calculation
  test(extraction): add 10 basement unit cases to golden dataset
  refactor(api): move Anthropic calls into anthropicService
  docs(spec): update Section 19 confidence thresholds
  chore(deps): update pvlib to 0.11.0
```

**Never commit directly to main.** All changes go through a branch and are merged via pull request, even when working solo. Branch names follow the same format: `feat/scraper-zillow`, `fix/ltt-calculation`.

**Never commit `.env`.** It must be in `.gitignore` before the first commit.

---

### 11. Constants — no magic numbers

**Every number that has a meaning lives in a constants file, not inline in the code.**

```
apps/api/src/constants/
├── tiers.ts           # Free analysis limit, tier names, prices
├── thresholds.ts      # Deal score brackets, confidence thresholds
└── provinces.ts       # Ontario FSA prefixes, LTT brackets by province

services/calc-engine/constants/
├── thresholds.py      # Confidence thresholds, score brackets
├── rates.py           # Default vacancy rate, management fee %, maintenance %
└── provinces.py       # LTT brackets, Ontario FSA prefixes
```

```typescript
// constants/thresholds.ts
export const CONFIDENCE = {
  RED_FLAG_MIN: 85,
  AMBER_FLAG_MIN: 60,
} as const

export const DEAL_SCORE = {
  STRONG: 80,
  GOOD: 65,
  CAUTION: 50,
  MARGINAL: 35,
  DO_NOT_BUY: 20,
} as const

export const FREE_TIER = {
  MONTHLY_ANALYSIS_LIMIT: 10,
  NARRATIVE_MIN_WORDS: 60,
  NARRATIVE_MAX_WORDS: 120,
} as const
```

```python
# constants/thresholds.py
CONFIDENCE_RED_FLAG_MIN = 85
CONFIDENCE_AMBER_FLAG_MIN = 60

MAINTENANCE_RESERVE_RATES = {
    'post_2010': 0.005,    # 0.5% of value per year
    '1980_2010': 0.010,    # 1.0%
    'pre_1980':  0.015,    # 1.5%
}

VACANCY_ALLOWANCE = 0.05   # 5%
MANAGEMENT_FEE    = 0.08   # 8% (when toggled on)
INSURANCE_RATE    = 0.0035 # 0.35% of value per year
```

---

### 12. Testing conventions

Every new feature or piece of functionality requires four types of tests before it is considered done.
These are mandatory — not optional. They apply on top of the manual tests listed in `TESTING.md`.

---

#### The four required test types

**Unit tests** — test a single function or module in complete isolation.
No database, no API calls, no other services. Input goes in, output comes out, assert it is correct.
Every calculation function, every extraction rule, every utility function needs at least one unit test.
If a function is too tangled with other things to unit test, that is a sign it needs to be refactored first.

```python
# Unit test — isolated, no external dependencies
def test_calculate_cap_rate():
    # Arrange
    noi = 18_082
    purchase_price = 729_900

    # Act
    result = calculate_cap_rate(noi, purchase_price)

    # Assert
    assert abs(result - 0.02477) < 0.0001  # within 0.01% of expected value
```

```typescript
// Unit test — mock all external calls
describe('buildNarrativePrompt', () => {
  it('includes the cap rate in the prompt', () => {
    const input = { capRate: 0.025, cashFlowMonthly: -1833 } as NarrativeInput
    const prompt = buildNarrativePrompt(input)
    expect(prompt).toContain('2.5%')
    expect(prompt).toContain('-$1,833')
  })
})
```

---

**Functionality tests** — test that a complete feature works end-to-end from the user's perspective.
These test the full flow: input → service → output. External APIs are mocked but the internal
logic runs fully. Functionality tests confirm the feature does what the spec says it does.

```python
# Functionality test — full pipeline, external APIs mocked
def test_report_a_investment_analysis(mock_comps, mock_walkscore):
    """Full Report A pipeline for a condo with known values."""
    listing = PropertyInput(
        address="5702-5 Buttermill Ave, Vaughan",
        price=729_900,
        annual_taxes=3_326,
        condo_fee_monthly=761,
        condo_fee_known=True,
        beds=3,
        province="ON"
    )
    financing = FinancingInput(down_payment_pct=0.20, mortgage_rate=0.0479, amortization_years=25)
    rental = RentalEstimate(low=2700, mid=2900, high=3200, comp_count=8, confidence="medium")

    result = run_full_analysis(listing, financing, rental)

    assert result.metrics.cash_flow_monthly < -1800       # deeply negative
    assert result.metrics.cap_rate < 0.03                 # below 3%
    assert result.deal_score.total < 15                   # near-zero score
    assert result.deal_score.verdict == "hard_pass"
    assert "condo_fee_high" in result.risk_flags          # fee flag fires
```

---

**Sanity tests** — quick checks that confirm the output is within the bounds of reality.
These catch situations where the code runs without errors but produces nonsense output —
a cap rate of 450%, a deal score of -12, a monthly mortgage payment of $0.
Sanity tests run after every analysis and fail loudly if outputs are unrealistic.

```python
# Sanity checks — run on every analysis output before returning to the frontend
def sanity_check_metrics(metrics: AnalysisOutput) -> list[str]:
    """
    Returns a list of sanity failures. Empty list means all checks passed.
    If any failures are returned, the analysis is flagged for review and
    the user sees a warning rather than wrong numbers.
    """
    failures = []

    if not (0 < metrics.cap_rate < 0.30):
        failures.append(f"Cap rate out of range: {metrics.cap_rate:.2%} (expected 0–30%)")

    if not (0 <= metrics.deal_score <= 100):
        failures.append(f"Deal score out of range: {metrics.deal_score} (expected 0–100)")

    if not (-20_000 < metrics.cash_flow_monthly < 20_000):
        failures.append(f"Monthly cash flow implausible: ${metrics.cash_flow_monthly:,}")

    if not (0.5 < metrics.dscr < 5.0):
        failures.append(f"DSCR out of range: {metrics.dscr:.2f}x (expected 0.5–5.0x)")

    if metrics.break_even_rent < 0:
        failures.append(f"Break-even rent is negative: ${metrics.break_even_rent:,}")

    return failures
```

Run sanity checks as part of the calc engine — before the response is returned to Fastify.
Log any sanity failures to Supabase for review. Never silently return wrong numbers.

```python
# In the analysis router
result = run_full_analysis(listing, financing, rental)
failures = sanity_check_metrics(result.metrics)

if failures:
    log_sanity_failure(listing.address, failures)  # log for review
    result.has_sanity_warnings = True              # shown as a flag in the UI
    # Still return the result — do not crash — but flag it visibly
```

---

**Regression tests** — confirm that a change to one part of the system has not broken something
that was already working. Run the full regression suite before every merge to main.

PropScout has two regression suites:

1. **Golden dataset suite** — listing description extraction accuracy.
   Must pass 95%+ on every run.
   `pytest services/calc-engine/tests/golden_dataset/test_extraction.py -v`

2. **Calculation regression suite** — known properties with expected outputs.
   Uses the calibration properties from `TESTING.md` (5702 Buttermill Ave and others).
   Must pass 100% — these are exact known values, not estimates.
   `pytest services/calc-engine/tests/test_regression.py -v`

```python
# services/calc-engine/tests/test_regression.py
# These are known correct values — never change the expected outputs.
# If a test fails, the code is wrong, not the expected value.

REGRESSION_CASES = [
    {
        "name": "5702 Buttermill Ave — deep negative cash flow condo",
        "inputs": {
            "price": 729_900, "annual_taxes": 3_326, "condo_fee_monthly": 761,
            "rent_mid": 2_900, "down_pct": 0.20, "rate": 0.0479, "amort": 25
        },
        "expected": {
            "cash_flow_monthly":  (-1_900, -1_750),   # acceptable range
            "cap_rate":           (0.023, 0.027),
            "dscr":               (0.40, 0.50),
            "deal_score_max":     15,                  # must be at or below this
        }
    },
]

@pytest.mark.parametrize("case", REGRESSION_CASES)
def test_regression(case):
    result = run_full_analysis_from_dict(case["inputs"])
    exp = case["expected"]

    assert exp["cash_flow_monthly"][0] <= result.metrics.cash_flow_monthly <= exp["cash_flow_monthly"][1]
    assert exp["cap_rate"][0] <= result.metrics.cap_rate <= exp["cap_rate"][1]
    assert exp["dscr"][0] <= result.metrics.dscr <= exp["dscr"][1]
    assert result.deal_score.total <= exp["deal_score_max"]
```

---

#### Test file placement

Unit and functionality tests live next to the code they test:

```
services/calc-engine/calculations/
├── deal_score.py
├── deal_score_test.py          ← unit tests for deal_score.py
├── investment.py
└── investment_test.py

apps/api/src/services/
├── anthropicService.ts
└── anthropicService.test.ts

apps/api/src/routes/
├── analysis.ts
└── analysis.test.ts            ← functionality tests for the analysis route
```

Regression and golden dataset tests live in the dedicated test folders:

```
services/calc-engine/tests/
├── test_regression.py          ← known-property regression suite
└── golden_dataset/
    ├── golden_cases.json
    └── test_extraction.py      ← 95% accuracy gate
```

---

#### When each test type is required

| Situation                            | Unit        | Functionality | Sanity       | Regression               |
| ------------------------------------ | ----------- | ------------- | ------------ | ------------------------ |
| New calculation function added       | ✅ Required | ✅ Required   | ✅ Add check | ✅ Add case              |
| New risk flag added                  | ✅ Required | ✅ Required   | —            | ✅ Add to golden dataset |
| New API service file added           | ✅ Required | ✅ Required   | —            | —                        |
| New React component added            | —           | ✅ Required   | —            | —                        |
| New report section added             | —           | ✅ Required   | —            | ✅ Add case              |
| Extraction prompt changed            | —           | —             | —            | ✅ Run golden dataset    |
| Model version updated (Haiku/Sonnet) | —           | —             | —            | ✅ Run both suites       |
| Scraper updated                      | ✅ Required | ✅ Required   | —            | —                        |
| Database schema changed              | —           | ✅ Required   | —            | —                        |

---

#### The test checklist — run before every merge to main

```
[ ] All unit tests pass
    pytest services/calc-engine/ -v --ignore=tests/
    npm test --workspace=apps/api
    npm test --workspace=apps/web

[ ] All functionality tests pass (included in above runs)

[ ] Sanity checks pass on 5 test properties
    (run a manual analysis on the calibration properties in TESTING.md)

[ ] Golden dataset regression passes at 95%+
    pytest services/calc-engine/tests/golden_dataset/test_extraction.py -v

[ ] Calculation regression passes at 100%
    pytest services/calc-engine/tests/test_regression.py -v

[ ] No TypeScript errors
    npm run typecheck --workspace=apps/web
    npm run typecheck --workspace=apps/api
```

Nothing merges to main until all six items are checked.

---

**The golden dataset regression suite must pass 95%+ before any merge to main.**
**The calculation regression suite must pass 100% before any merge to main.**

---

## Full project structure

> This is the authoritative directory layout. Update this section whenever a new file, folder, or service is added. A stale structure is worse than no structure — keep it accurate.

```
propscout/
│
├── .env                               # Never committed — all API keys and secrets
├── .env.example                       # Committed — placeholder values only
├── .gitignore                         # Covers .env, node_modules, __pycache__, .venv, dist
├── README.md                          # Setup instructions, how to run tests, architecture overview
├── package.json                       # Monorepo root — workspaces for apps/web and apps/api
│
├── .github/
│   └── workflows/
│       └── ci.yml                     # CI pipeline — runs on every PR, blocks merge on failure
│
├── docs/                              # All project documentation — keep every file up to date
│   ├── propscout_platform_spec.md     # Single source of truth — features, formulas, architecture
│   ├── CLAUDE.md                      # POINTER ONLY → root CLAUDE.md is canonical (decision 2026-07-01)
│   ├── TODO.md                        # Full backlog across all phases
│   ├── MVP_TODO.md                    # MVP scope only — tick off as completed
│   ├── TESTING.md                     # Test for every feature — update when features are added
│   ├── SETUP.md                       # Pre-development checklist — accounts, tooling, legal
│   ├── DESIGN_README.md               # Design system — typography, tokens, interactions
│   ├── COMPONENT_MANIFEST.md          # Every design surface → React component + build order
│   ├── OPENING_PROMPT.md              # Paste into first Claude Code session
│   ├── AUDIT_TRACKER.md               # Priority-ordered fix list from June 2026 audit — check at session start
│   ├── FLAG_SEVERITY_MATRIX.md        # Approved per-flag × per-mode severity ruleset (v1) — SEVERE cells need sign-off
│   └── design_handoff_propscout_mvp/  # Design files — living documents, will be updated
│       ├── tokens.css                 # CSS variables — copy to apps/web/src/styles/tokens.css
│       └── designs/                   # 13 pixel-final HTML prototypes + JSX source
│           ├── index.html             # Landing page
│           ├── Mode Modal.html        # For-sale / for-rent routing modal
│           ├── Tenant Report.html     # Free funnel — 12 sections
│           ├── Investor Report.html   # Core monetised product — live sliders, equity chart
│           ├── Personal Buyer Report.html
│           ├── Landlord Report.html
│           ├── Paywall States.html    # All 5 paywall touchpoints
│           ├── Account.html           # Saved analyses, settings, plan, notifications
│           ├── Error States.html      # Province gate, scraper fail, no comps, 404, etc.
│           ├── Pre Report Flows.html  # Scraping progress + manual entry fallback
│           ├── Auth & Billing Stubs.html
│           ├── Legal Pages.html       # Privacy + Terms with TOC sidebar
│           ├── Mobile Pass.html       # iOS + Android funnel
│           └── *.jsx                  # React component source files for each surface
│
├── apps/
│   │
│   ├── web/                           # React + TypeScript — hosted on Vercel
│   │   ├── index.html                 # Vite entry — Google Fonts preconnect + link here
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json              # strict: true, noImplicitAny, strictNullChecks
│   │   ├── package.json
│   │   └── src/
│   │       ├── main.tsx               # App entry point
│   │       ├── App.tsx                # Root component — router, theme, global providers
│   │       │
│   │       ├── styles/
│   │       │   ├── tokens.css         # Copied from design_handoff — source of all CSS vars
│   │       │   └── global.css         # Global resets, type scale, @import tokens.css
│   │       │
│   │       ├── components/
│   │       │   ├── shared/            # Build these FIRST — every other component depends on them
│   │       │   │   ├── Wordmark.tsx           # "Prop Scout" wordmark with ScoutMark glyph
│   │       │   │   ├── ScoutMark.tsx          # Standalone glyph — used as watermark on dark cards
│   │       │   │   ├── Icon.tsx               # Full line-icon library
│   │       │   │   ├── Chip.tsx               # Inline pill tag
│   │       │   │   ├── Button.tsx             # primary / ghost / accent variants
│   │       │   │   ├── Card.tsx               # Surface + line + shadow + radius-lg
│   │       │   │   ├── SectionHead.tsx        # Every report section header — shared across all 4 reports
│   │       │   │   ├── VerdictPill.tsx        # pass / caution / fail pill
│   │       │   │   ├── Nav.tsx                # landing / report / account variants
│   │       │   │   ├── Footer.tsx
│   │       │   │   ├── ModeModal.tsx          # For-sale/for-rent routing modal
│   │       │   │   ├── ProgressDisplay.tsx    # Scraping progress screen
│   │       │   │   ├── SignInModal.tsx        # Sign-in / sign-up bottom-sheet
│   │       │   │   ├── BottomSheet.tsx        # Mobile bottom-sheet wrapper (slide-up from bottom)
│   │       │   │   ├── StickyActionBar.tsx    # Mobile-only sticky bottom bar (Save / Share / PDF)
│   │       │   │   └── ErrorBoundary.tsx      # Root error boundary — app never blank-screens
│   │       │   │
│   │       │   ├── analysis/          # Domain components — used across investor + landlord reports
│   │       │   │   ├── DealScore.tsx          # Radial gauge with animation
│   │       │   │   ├── Metric.tsx             # Headline metric tile
│   │       │   │   ├── RentalCompsBar.tsx     # Percentile range bar + hover marker
│   │       │   │   ├── AIVerdictBlock.tsx     # Dark full-bleed AI verdict card
│   │       │   │   ├── RiskRow.tsx            # Inline risk flag row
│   │       │   │   ├── MiniMap.tsx            # Real Mapbox GL JS map (token + coords) with SVG placeholder fallback
│   │       │   │   └── PropertyHero.tsx       # Photo grid + chips + address + sticky score card
│   │       │   │
│   │       │   ├── investor/          # Investor-specific — also reused by landlord report
│   │       │   │   ├── FinancingSliders.tsx   # Live sliders — every metric recalculates on drag
│   │       │   │   ├── OSFICard.tsx
│   │       │   │   ├── LTTTable.tsx           # Ontario LTT bracket table
│   │       │   │   ├── EquityChart.tsx        # 20-year line chart with hover tooltip
│   │       │   │   ├── InvestmentMetricsSection.tsx
│   │       │   │   ├── NeighbourhoodSection.tsx
│   │       │   │   └── STRPlaceholderSection.tsx  # Phase 2 placeholder
│   │       │   │
│   │       │   ├── tenant/            # Tenant-specific components
│   │       │   │   ├── FlagDeepRow.tsx        # Expandable risk flag with evidence quote
│   │       │   │   ├── ListedVsRealitySection.tsx  # Conditional — only when flags fire
│   │       │   │   ├── WhatsIncludedSection.tsx    # Amenities grid
│   │       │   │   ├── LocationCommuteSection.tsx  # Walk/Transit scores + distances
│   │       │   │   ├── NegotiationSection.tsx      # Leverage card + suggested message
│   │       │   │   └── TenantSchoolsSection.tsx    # Slim schools (1 per board × 3 levels)
│   │       │   │
│   │       │   ├── personal/          # Personal buyer-specific
│   │       │   │   ├── SchoolCard.tsx
│   │       │   │   ├── SchoolColumn.tsx
│   │       │   │   ├── PBTrueCostSection.tsx       # Monthly ownership cost table
│   │       │   │   ├── PBFMVSection.tsx            # Fair market value positioning bar
│   │       │   │   └── PBSalesSection.tsx          # Comparable sales table
│   │       │   │
│   │       │   ├── sunscout/
│   │       │   │   └── SunScoutPanel.tsx + SunScoutPanel.test.tsx  # Live sun section: gauge, monthly bars, facade-direction input (SunArcViz/SeasonalGrid never existed — not in the designs)
│   │       │   │
│   │       │   ├── paywall/           # Tier gating — wired into every report
│   │       │   │   ├── ProBadge.tsx
│   │       │   │   ├── UpgradeCard.tsx
│   │       │   │   ├── LockedSection.tsx      # Blurred content + upgrade overlay
│   │       │   │   ├── TruncatedVerdict.tsx   # AI verdict paragraph 2 blurred
│   │       │   │   ├── LockedButton.tsx       # Lock-icon button
│   │       │   │   ├── UpgradeModal.tsx       # 5 feature-specific variants
│   │       │   │   └── HardLimitGate.tsx      # Full-screen monthly limit blocker
│   │       │   │
│   │       │   └── states/            # Error, empty, and gate states
│   │       │       ├── BlockState.tsx         # Full-page error/gate state
│   │       │       ├── ProvinceGate.tsx       # Non-Ontario waitlist
│   │       │       ├── NoCompsInlineState.tsx
│   │       │       └── ScraperPartialInlineState.tsx
│   │       │
│   │       ├── hooks/
│   │       │   ├── useAnalysis.ts     # Fetches and manages analysis state
│   │       │   ├── useAuth.ts         # Auth state and methods
│   │       │   ├── useTier.ts         # Current user tier + feature access checks
│   │       │   ├── useRentalComps.ts  # Rental comps data and loading state
│   │       │   └── useSunScout.ts     # Sun hours calculation state
│   │       │
│   │       ├── lib/
│   │       │   └── services/          # Frontend services — call Fastify API, never Supabase directly
│   │       │       ├── analysisService.ts   # POST /analysis, GET /analysis/:token
│   │       │       ├── authService.ts       # Supabase auth only (signup, login, session)
│   │       │       ├── billingService.ts    # Stripe checkout/portal sessions via the API
│   │       │       ├── overrideService.ts   # Risk-flag dismissal persistence
│   │       │       ├── sunScoutService.ts   # Facade-direction SunScout recalculation
│   │       │       └── mapboxGlService.ts   # Lazy mapbox-gl loader + mini-map mount (VITE_MAPBOX_TOKEN)
│   │       │
│   │       ├── types/                 # All shared TypeScript types — never inline
│   │       │   ├── analysis.ts        # Analysis, ReportMode, DealScore, RiskFlag
│   │       │   ├── property.ts        # Listing, PropertyType, Province
│   │       │   ├── user.ts            # User, Tier, Subscription
│   │       │   └── api.ts             # API request/response shapes
│   │       │
│   │       ├── constants/             # No magic numbers in components — all values here
│   │       │   ├── tiers.ts           # Tier names, prices, analysis limits
│   │       │   └── thresholds.ts      # Deal score brackets, confidence thresholds
│   │       │
│   │       └── pages/                 # One file per route (see App.tsx for the router)
│   │           ├── LandingPage.tsx            # / — Landing + URL paste home (+ landing.test.tsx)
│   │           ├── analyzing.tsx              # /analyzing — Scraping progress + manual-entry fallback
│   │           ├── ReportPage.tsx             # /r/:token — LIVE shareable report, all 4 modes (+ ReportPage.test.tsx)
│   │           ├── InvestorReport.tsx         # /investor-report — demo route (fixtures)
│   │           ├── TenantReport.tsx           # /tenant-report — demo route (fixtures)
│   │           ├── PersonalBuyerPage.tsx      # /personal-report demo + real renderer used by ReportPage for mode=personal
│   │           ├── LandlordPage.tsx           # /landlord-report — demo route (fixtures)
│   │           ├── AccountPage.tsx            # /account — saved, profile, plan, notifications
│   │           ├── StripeWelcomePage.tsx      # /welcome-to-pro — Stripe success return
│   │           ├── StripeCancelledPage.tsx    # /checkout/cancelled — Stripe cancel return
│   │           ├── MagicLinkConfirmedPage.tsx # /auth/confirm
│   │           ├── MagicLinkSentPage.tsx      # (shown from sign-in flow)
│   │           ├── PasswordResetRequestPage.tsx  # /auth/reset
│   │           ├── PasswordResetConfirmPage.tsx  # /auth/reset/confirm
│   │           ├── EmailVerifiedPage.tsx      # /auth/verified
│   │           ├── PrivacyPage.tsx            # /privacy — PIPEDA privacy policy with TOC
│   │           ├── TermsPage.tsx              # /terms — Terms of Service with TOC
│   │           ├── legal/
│   │           │   ├── LegalShell.tsx         # Shared layout: sticky nav + TOC + scroll-spy
│   │           │   └── legalContent.ts        # Pure data: PRIVACY_SECTIONS, TERMS_SECTIONS
│   │           └── NotFoundPage.tsx           # * catch-all 404
│   │
│   └── api/                           # Fastify — hosted on Railway
│       ├── tsconfig.json
│       ├── package.json
│       └── src/
│           ├── app.ts                 # Fastify app setup — plugins, routes registered here
│           ├── routes/
│           │   ├── analysis.ts        # POST /analysis — orchestrates full pipeline (incl. flag overrides + vacancy)
│           │   ├── analysisToken.ts   # GET/POST /analysis/:token — fetch + trigger by share token
│           │   ├── overrides.ts       # GET/POST/DELETE /analysis/:token/overrides — risk-flag dismissals
│           │   ├── sunscout.ts        # POST /analysis/:token/sunscout — facade-direction SunScout recalc
│           │   ├── pdf.ts             # GET /analysis/:token/pdf — Pro-gated Puppeteer PDF export
│           │   ├── scrape.ts          # POST /scrape — scrape a listing URL into a pending analysis
│           │   ├── rates.ts           # GET /rates/mortgage — live Bank of Canada rate proxy
│           │   ├── billing.ts         # Stripe checkout + billing portal sessions
│           │   ├── me.ts              # Current-user profile + tier
│           │   ├── waitlist.ts        # Non-Ontario province-gate waitlist signups
│           │   └── webhooks.ts        # Stripe webhook — verifies signature before processing
│           ├── services/              # One file per external API — never call APIs in routes
│           │   ├── anthropicService.ts      # Claude Haiku (extraction) + Sonnet (narrative)
│           │   ├── walkScoreService.ts      # Walk Score + Transit Score
│           │   ├── mapboxService.ts         # Geocoding + map tiles
│           │   ├── googlePlacesService.ts   # School discovery
│           │   ├── stripeService.ts         # Subscriptions + billing portal
│           │   ├── cmhcService.ts           # Vacancy rates (getVacancyRateByCity)
│           │   ├── bankOfCanadaService.ts   # Current mortgage rates
│           │   ├── pdfService.ts            # Puppeteer renders /r/:token → branded PDF (spec §14)
│           │   └── supabaseService.ts       # All DB reads and writes (incl. flag_overrides)
│           ├── plugins/
│           │   └── rateLimit.ts       # @fastify/rate-limit — 10 req/min on analysis endpoint
│           ├── types/
│           │   ├── analysis.ts
│           │   ├── property.ts
│           │   └── api.ts             # Consistent error response shape
│           └── constants/
│               ├── tiers.ts
│               ├── thresholds.ts
│               ├── flagLabels.ts      # Risk-flag id → human-readable label
│               ├── cmhcVacancy.ts     # CMHC vacancy rates by city (refresh annually)
│               ├── propertyTaxRates.ts # Ontario municipal property-tax rates (refresh annually)
│               ├── valuation.ts       # Fallback rent↔price proxies (~6% gross yield) for missing data
│               └── provinces.ts       # Ontario FSA prefixes, LTT brackets
│
├── services/
│   │
│   ├── calc-engine/                   # Python FastAPI — hosted on Railway
│   │   ├── main.py                    # FastAPI app — registers routers only, no logic here
│   │   ├── requirements.txt
│   │   ├── routers/
│   │   │   └── analysis.py            # Route handlers — call services/calculations, return responses
│   │   ├── services/                  # One file per external dependency
│   │   │   ├── anthropic_service.py   # Claude Haiku extraction calls
│   │   │   ├── walkscore_service.py
│   │   │   └── cmhc_service.py
│   │   ├── calculations/              # Pure functions — no DB, no API calls, fully testable
│   │   │   ├── mortgage.py + mortgage_test.py
│   │   │   ├── investment.py + investment_test.py   # Cap rate, CoC, DSCR, GRM, cash flow, NOI
│   │   │   ├── closing_costs.py + closing_costs_test.py  # LTT by province
│   │   │   ├── deal_score.py + deal_score_test.py   # Spec Section 10 formula
│   │   │   └── osfi.py + osfi_test.py
│   │   ├── extraction/                # Listing description pipeline — spec Section 19 (TEMPLATE)
│   │   │   ├── regex_rules.py         # Deterministic patterns — run first, never hallucinate
│   │   │   ├── haiku_extraction.py    # Claude Haiku JSON extraction
│   │   │   └── logic_gate.py          # Confidence threshold merging
│   │   ├── sunscout/                  # TEMPLATE — spec Section 17
│   │   │   ├── sun_path.py            # NREL SPA via pvlib — runs locally, no API call
│   │   │   └── sun_path_test.py
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic models for all inputs/outputs — no raw dicts
│   │   ├── constants/
│   │   │   ├── thresholds.py          # Confidence thresholds, deal score brackets, INFO_FLAG_IDS
│   │   │   ├── flag_matrix.py + flag_matrix_test.py  # Per-flag × per-mode severity tiers (docs/FLAG_SEVERITY_MATRIX.md)
│   │   │   ├── rates.py               # Vacancy allowance, management fee, insurance rate
│   │   │   └── provinces.py           # Ontario FSA prefixes, LTT brackets by province
│   │   └── tests/
│   │       ├── test_regression.py     # Known-property regression suite — must pass 100%
│   │       └── golden_dataset/
│   │           ├── golden_cases.json  # 50+ labelled listing descriptions
│   │           └── test_extraction.py # Accuracy gate — must pass 95%+ before merging
│   │
│   └── scrapers/                      # Python scrapers — per-listing service + nightly Railway job
│       ├── README.md                  # Deploy + first-run checklist (env vars, run #1 = selector test, yield-check)
│       ├── requirements.txt           # playwright, supabase, httpx, pytest
│       ├── railway.json               # Nightly cron config — 0 6 * * * UTC (2am ET)
│       ├── conftest.py                # Pytest path setup
│       ├── constants.py               # Rent bounds, dedupe window, target cities, depth, politeness delays
│       ├── main.py                    # FastAPI scraper service — POST /scrape (called by the API's scrape route)
│       ├── realtor_scraper.py         # Per-listing Realtor.ca scraper via ScraperAPI premium (dataLayer + JSON-LD parse)
│       ├── rental_comps_scraper.py + rental_comps_scraper_test.py  # Nightly pipeline orchestrator
│       ├── normalization.py + normalization_test.py  # Rent/beds/postal parsing — pure functions
│       ├── dedupe.py + dedupe_test.py # Same address + rent + beds within 7 days = one record
│       ├── sources/                   # One module per rental site (selectors are TEMPLATE)
│       │   ├── browser.py + browser_test.py  # Shared Playwright launch, politeness delay, PageFetch block detection
│       │   ├── rentals_ca.py + rentals_ca_test.py
│       │   ├── kijiji.py + kijiji_test.py    # Gated to Toronto (city slug ignored by Kijiji — enforced by test)
│       │   └── padmapper.py + padmapper_test.py
│       └── services/                  # Service layer — external calls never inline
│           ├── supabase_service.py    # source_url upsert writes (scraped_at refresh, first_seen_at insert-only)
│           └── mapbox_service.py      # Geocoding, non-fatal on failure
│
├── supabase/
│   └── migrations/                    # All schema changes — never edit DB directly in dashboard
│       ├── 20260610_initial_schema.sql  # All 10 tables + RLS + comp-query/dedupe indexes
│       ├── 20260622_align_to_initial_schema.sql
│       ├── 20260622_add_listing_extras.sql   # rent_monthly, city, walk_score, has_sanity_warnings
│       ├── 20260623_add_rental_listings_source_url_unique.sql
│       ├── 20260623_add_score_version.sql
│       ├── 20260624_add_rental_listings_first_seen_at.sql
│       └── 20260701_add_schools_name_postal_unique.sql  # NOT applied — required by load-schools.mjs upsert
│
└── Week3-4 Front end/                 # External test suites — referenced from vite.config.ts includes
    ├── PR4/                           # Investor report + shared component tests
    ├── PR5/                           # Tenant report component tests
    ├── PR6/                           # Personal buyer + landlord report tests
    ├── PR7/                           # Paywall, Account, Auth, States tests
    └── PR8/                           # Mobile responsive pass tests (legal, bottom sheet, sticky bar, routes, regression)
```

### Keeping the structure accurate

**Every time a new file or folder is added**, update the structure above in the same commit.
A file that exists in the repo but not in this structure will confuse any developer (or Claude Code session) reading the project later.

**Signs the structure is stale:**

- A file exists in the repo but is not listed here
- A listed file no longer exists
- A new service was added but its folder is not shown
- A component was renamed but the old name is still in the tree

If you notice the structure is stale, fix it before doing anything else in that session.

---

## The four report modes

Every URL a user pastes routes to one of four reports. Never mix their logic.

| Mode                           | Trigger                                      | Section        |
| ------------------------------ | -------------------------------------------- | -------------- |
| Report A — Investment purchase | For-sale URL + user selects "Investment"     | Spec Section 6 |
| Report B — Personal purchase   | For-sale URL + user selects "Personal use"   | Spec Section 7 |
| Report C — Tenant evaluation   | For-rent URL + user selects "I'm a tenant"   | Spec Section 8 |
| Report D — Landlord rental     | For-rent URL + user selects "I'm a landlord" | Spec Section 9 |

---

## Listing description extraction — critical rule

**Never feed raw listing description text into the deal score calculation or the narrative prompt.**

All unstructured text must pass through the extraction pipeline first (Section 19):

1. Regex rules run first (deterministic, no AI)
2. Claude Haiku extracts structured JSON flags
3. Logic gate applies confidence thresholds
4. Only validated structured flags reach the calc engine
5. Only hard numbers reach the Sonnet narrative prompt

Confidence thresholds:

- 85%+ confidence → red flag, deducts from deal score
- 60–84% confidence → amber soft warning only, no score deduction
- Below 60% → not shown

---

## Deal score rules

- Score is always calculated by the Python calc engine from validated structured data
- Score is never assigned manually or estimated
- Formula is in spec Section 10 — do not deviate from it without updating the spec
- Same inputs must always produce the same score (deterministic)

---

## Province scope

MVP covers Ontario only. Ontario postal codes start with: K, L, M, N, P.
Non-Ontario properties show a waitlist prompt — analysis does not run.
Do not add province logic for BC or Alberta until Phase 3 is explicitly started.

---

## Pricing tiers

| Tier         | Price    | Key unlock                                                                                   |
| ------------ | -------- | -------------------------------------------------------------------------------------------- |
| Free         | $0       | 10 analyses/month, full comps, basic AI narrative (1 paragraph)                              |
| Investor Pro | $10/mo   | Unlimited analyses, PDF, SunScout building obstruction, full AI narrative, portfolio tracker |
| Professional | $59/mo   | Everything in Pro + white-label PDF, client sharing, bulk analysis                           |
| Team         | $299+/mo | Everything in Professional + multi-user seats, API access                                    |

Full matrix in spec Section 4. When in doubt about what a tier can access, check the matrix.

---

## AI narrative length by tier

| Tier          | Length                                         |
| ------------- | ---------------------------------------------- |
| Free          | 1 short paragraph, 4–5 sentences, 60–120 words |
| Pro and above | Full narrative, 2–3 paragraphs, 150–320 words  |

Gold-standard examples for each report type are in spec Section 12.
If generated output doesn't match that quality, fix the prompt — not the examples.

---

## What to do when a new feature is added during development

When you build something that was not planned in the original spec, complete every step below.
Do not skip steps. Do not ship until all steps are done.

**Step 1 — Update the documentation**

- Add it to `propscout_platform_spec.md` in the relevant section. If it does not fit an existing section, create a new one.
- Add the build task to `TODO.md` under the correct phase.
- If it is in MVP scope, add it to `MVP_TODO.md` and tick it off when done.

**Step 2 — Add it to the manual test guide**

- Add at least one test for it in `TESTING.md`.
- Label it correctly: ✋ manual, 🔗 combined, or 🤖 automated.
- Place it in the correct week block.
- Note any dependencies on other components that must be built first.

**Step 3 — Write the four required tests**
Every new feature requires all four test types. See Section 12 of this file for full details.

- **Unit test** — test the core function or module in isolation. No external calls, no database.
  Write this first, before the feature is integrated anywhere else.

- **Functionality test** — test the complete flow end-to-end with external APIs mocked.
  Confirm the feature does exactly what the spec says it should do.

- **Sanity check** — if the feature produces a numeric output (a score, a rate, a dollar amount),
  add a sanity check to `sanity_check_metrics()` in the calc engine that validates the output
  is within realistic bounds. A feature that produces numbers must have bounds defined.

- **Regression test** — add at least one case to the appropriate regression suite:
  - New calculation or score change → add to `test_regression.py` with known expected outputs
  - New extraction flag → add to `golden_dataset/golden_cases.json` with correct labels
  - Re-run both suites and confirm they still pass before merging

**Step 4 — API and service rules**

- If the new feature calls an external API, create a dedicated service file for it.
  Never call an API inline inside a route, component, or calculation function.
- If the feature reads from or writes to the database, all queries go through `supabaseService.ts`.
  Never call Supabase directly from a component or route handler.

**Step 5 — Run the full test checklist before merging**

```
[ ] Unit tests pass
[ ] Functionality tests pass
[ ] Sanity checks pass on calibration properties
[ ] Golden dataset regression passes at 95%+
[ ] Calculation regression passes at 100%
[ ] No TypeScript errors
```

**Never ship a new feature without completing all five steps.**
If you cannot write a unit test for something, the function needs to be refactored first.
If you cannot write a functionality test, the feature is not well enough defined yet.
If you cannot define sanity bounds for a numeric output, go back to the spec.

---

## What to do when the spec and code diverge

If you build something that differs from the spec — even slightly — update the spec immediately.
The spec must always reflect what the code actually does, not what was originally planned.
A stale spec is worse than no spec.

---

## Do not build these at MVP

- BC or Alberta province support
- AirDNA STR vs LTR data (show placeholder)
- Teranet historical sales data
- SunScout building obstruction (Phase 2)
- White-label PDF (Professional tier — sell the tier, deliver manually until built)
- Portfolio tracker (add post-launch)
- Multi-user Team seats
- API access for external partners
