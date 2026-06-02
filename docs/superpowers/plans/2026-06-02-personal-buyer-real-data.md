# PersonalBuyerPage Real Data Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded PB_PROPERTY fixture data in PersonalBuyerPage with real Listing + Analysis data when a live analysis is available, while leaving the demo path (no props) identical.

**Architecture:** Add two shim functions to `reportShims.ts` that convert API types to the `PersonalProperty` / `PersonalNeighbourhood` shapes. Refactor internal page components (`PersonalPropertyHero`, `RisksSection`, `NeighbourhoodSection`, `SchoolsSection`) to accept props instead of reading module-scope fixtures directly. Wire the orchestration block in `PersonalBuyerPage` to branch on `isReal`. `PBFMVSection` and `PBSalesSection` get opt-in `isEstimated` / `isSampleData` flags that add transparency labels.

**Tech Stack:** TypeScript, React, `apps/web/src/lib/reportShims.ts`, `apps/web/src/pages/PersonalBuyerPage.tsx`, `apps/web/src/components/personal/PBFMVSection.tsx`, `apps/web/src/components/personal/PBSalesSection.tsx`

---

## File map

| File                                                  | Change                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/src/lib/reportShims.ts`                     | Add `shimToPersonalProperty`, `shimToPersonalNeighbourhood`     |
| `apps/web/src/components/personal/PBFMVSection.tsx`   | Add `isEstimated` prop                                          |
| `apps/web/src/components/personal/PBSalesSection.tsx` | Add `isSampleData` prop                                         |
| `apps/web/src/pages/PersonalBuyerPage.tsx`            | Refactor hero + risks + neighbourhood + schools + orchestration |

---

## Task 1: Add shim functions to `reportShims.ts`

**Files:**

- Modify: `apps/web/src/lib/reportShims.ts`

- [ ] **Step 1: Add imports for personal types at the top of `reportShims.ts`**

After the existing imports, add:

```typescript
import type { PersonalProperty, PersonalNeighbourhood } from '../types/personal'
```

The full import block at the top of the file becomes:

```typescript
import type {
  Analysis,
  ListingData,
  InvestorRiskFlag,
  NeighbourhoodData,
  TenantListingData,
} from '../types/analysis'
import type { Listing } from '../types/property'
import type { PersonalProperty, PersonalNeighbourhood } from '../types/personal'
```

- [ ] **Step 2: Add `buildPersonalChips` helper function**

After the existing `buildTenantChips` function (line 53), add:

```typescript
function buildPersonalChips(listing: Listing): string[] {
  const chips: string[] = ['Personal use · For sale']
  chips.push(`${listing.city} · ${listing.postalCode}`)
  if (listing.sqft) {
    chips.push(`${listing.propertyType} · ${listing.sqft.toLocaleString()} sqft`)
  } else {
    chips.push(listing.propertyType)
  }
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  return chips
}
```

- [ ] **Step 3: Add `shimToPersonalProperty` export function**

After `buildPersonalChips`, add:

```typescript
/**
 * Maps a real Listing + Analysis to the PersonalProperty shape used by
 * PersonalBuyerPage and its sub-components.
 *
 * Fields not available from the API (lotSize, daysOnMarket, priceChange)
 * are zeroed/empty. FMV is estimated as ±5% of asking price — rendered
 * with a visual "Estimated" label in PBFMVSection when isEstimated=true.
 * Utility estimates are scaled by sqft when available.
 */
export function shimToPersonalProperty(listing: Listing, _analysis: Analysis): PersonalProperty {
  const { line1 } = parseAddress(listing.address)
  const price = listing.price ?? 0
  const sqft = listing.sqft ?? 0

  const parking =
    listing.parkingSpots > 0
      ? `${listing.parkingSpots} spot${listing.parkingSpots !== 1 ? 's' : ''}`
      : 'None'

  // Sqft-scaled utility estimates — more accurate than flat rates for varied property sizes
  const sqftBasis = sqft > 0 ? sqft : 800
  const hydro = Math.round(sqftBasis * 0.08)
  const gas = Math.round(sqftBasis * 0.06)

  return {
    addressLine1: line1,
    addressLine2: `${listing.city} · ${listing.postalCode}`,
    postal: listing.postalCode,
    province: listing.province,
    toronto: listing.city.toLowerCase() === 'toronto',
    propertyType: listing.propertyType,
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqft,
    parking,
    yearBuilt: listing.yearBuilt ?? 0,
    lotSize: '',
    price,
    daysOnMarket: 0, // not scraped — "Listed N days ago" strip hidden when 0
    priceChange: { abs: 0, direction: null },
    annualTaxes: listing.annualTaxes ?? 0,
    condoFeeMonthly: listing.condoFeeMonthly ?? 0,
    utilityEstMonthly: { hydro, gas, water: 60, internet: 65 },
    insuranceMonthlyEst: Math.round((price * 0.0035) / 12),
    chips: buildPersonalChips(listing),
    fmv: {
      low: Math.round(price * 0.95),
      mid: price,
      high: Math.round(price * 1.05),
      askingVsMid: 0,
    },
    defaultDownPct: 0.2,
    defaultRate: 0.0479,
    defaultAmort: 25,
  }
}
```

- [ ] **Step 4: Add `shimToPersonalNeighbourhood` export function**

Immediately after `shimToPersonalProperty`, add:

```typescript
/**
 * Maps Analysis walk score data to the PersonalNeighbourhood shape.
 * Walk/transit/bike scores come from the Walk Score API (already wired in
 * the orchestrator). All other neighbourhood fields (income, distances, etc.)
 * are zeroed — to be populated when Week 4-5 neighbourhood data lands.
 * Only this function needs updating at that point.
 */
export function shimToPersonalNeighbourhood(analysis: Analysis): PersonalNeighbourhood {
  return {
    walkScore: analysis.walkScore?.walk ?? 0,
    transitScore: analysis.walkScore?.transit ?? 0,
    bikeScore: analysis.walkScore?.bike ?? 0,
    walkSub: analysis.walkScore?.description ?? '',
    transitSub: '',
    bikeSub: '',
    avgIncome: 0,
    popGrowth5y: 0,
    ppsqftTrend: 'N/A',
    appreciation5y: 0,
    appreciation10y: 0,
    buildingPermits: 0,
    distances: [],
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors in `reportShims.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/reportShims.ts
git commit -m "feat(shims): add shimToPersonalProperty and shimToPersonalNeighbourhood"
```

---

## Task 2: Add `isEstimated` prop to `PBFMVSection`

**Files:**

- Modify: `apps/web/src/components/personal/PBFMVSection.tsx`

- [ ] **Step 1: Add `isEstimated` to the props interface and import `Chip`**

Replace the existing interface and imports at the top of the file:

```typescript
/**
 * PBFMVSection — §02 Fair market value positioning.
 *
 * Shows the asking price pinned on a gradient bar between the FMV low/mid/high
 * range, with a verdict pill (Below market / At market / Above market) and
 * quick summary stats (comp count, avg DOM, median $/sqft, this listing $/sqft).
 *
 * Design source: personal-sections-2.jsx > PBFMVSection
 */

import type { PersonalProperty } from '../../types/personal'
import type { HomeScore } from '../../types/personal'
import { SectionHead } from '../shared/SectionHead'
import { VerdictPill } from '../shared/VerdictPill'
import { fmtMoney } from '../../lib/investorCalc'

interface PBFMVSectionProps {
  property: PersonalProperty
  score: HomeScore
  /** Number of verified comparable sales (shown in summary stats row). Default 8. */
  compCount?: number
  /** Average days on market for comps. Default 12. */
  avgDOM?: number
  /** Median $/sqft from comps. Default computed from property price / sqft. */
  medianPPSqft?: number
  /**
   * When true, FMV values are ±5% estimates rather than comp-derived.
   * Renders ~ prefix on all three values and an "Estimated range" footnote.
   */
  isEstimated?: boolean
}
```

- [ ] **Step 2: Add `isEstimated` to the destructure**

Change the function signature from:

```typescript
export function PBFMVSection({
  property,
  score,
  compCount = 8,
  avgDOM = 12,
  medianPPSqft,
}: PBFMVSectionProps): JSX.Element {
```

To:

```typescript
export function PBFMVSection({
  property,
  score,
  compCount = 8,
  avgDOM = 12,
  medianPPSqft,
  isEstimated = false,
}: PBFMVSectionProps): JSX.Element {
```

- [ ] **Step 3: Add the estimated chip after SectionHead**

Replace:

```typescript
  return (
    <section className="container tr-section">
      <SectionHead
        n="02"
        topic="Fair market value"
        question={
          <>
            Is it priced <em>fairly</em>?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="card" style={{ padding: 28 }}>
```

With:

```typescript
  return (
    <section className="container tr-section">
      <SectionHead
        n="02"
        topic="Fair market value"
        question={
          <>
            Is it priced <em>fairly</em>?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      {isEstimated && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Estimated range · real comps in Phase 2
        </p>
      )}

      <div className="card" style={{ padding: 28 }}>
```

- [ ] **Step 4: Prepend `~` to the three FMV percentile value displays**

In the percentile labels section, replace the `fmtMoney(t.val)` call so estimated values get a prefix. Replace:

```typescript
          {(
            [
              { lbl: 'P25 · low', val: fmv.low, align: 'flex-start' },
              { lbl: 'P50 · median', val: fmv.mid, align: 'center' },
              { lbl: 'P75 · high', val: fmv.high, align: 'flex-end' },
            ] as const
          ).map((t) => (
            <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                {t.lbl}
              </div>
              <div
                className="mono tabular"
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
              >
                {fmtMoney(t.val)}
              </div>
            </div>
          ))}
```

With:

```typescript
          {(
            [
              { lbl: 'P25 · low', val: fmv.low, align: 'flex-start' },
              { lbl: 'P50 · median', val: fmv.mid, align: 'center' },
              { lbl: 'P75 · high', val: fmv.high, align: 'flex-end' },
            ] as const
          ).map((t) => (
            <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                {t.lbl}
              </div>
              <div
                className="mono tabular"
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
              >
                {isEstimated ? '~' : ''}{fmtMoney(t.val)}
              </div>
            </div>
          ))}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/personal/PBFMVSection.tsx
git commit -m "feat(personal): add isEstimated prop to PBFMVSection"
```

---

## Task 3: Add `isSampleData` prop to `PBSalesSection`

**Files:**

- Modify: `apps/web/src/components/personal/PBSalesSection.tsx`

- [ ] **Step 1: Add `isSampleData` to the props interface**

Replace the existing interface:

```typescript
interface PBSalesSectionProps {
  comps: PersonalComp[]
  /**
   * When true, renders a "Sample comparables · real sales data in Phase 2"
   * label above the comps table to indicate the data is not derived from
   * the current listing's location.
   */
  isSampleData?: boolean
}
```

- [ ] **Step 2: Add `isSampleData` to the destructure**

Change:

```typescript
export function PBSalesSection({ comps }: PBSalesSectionProps): JSX.Element {
```

To:

```typescript
export function PBSalesSection({ comps, isSampleData = false }: PBSalesSectionProps): JSX.Element {
```

- [ ] **Step 3: Render the label above the comps table**

Replace:

```typescript
  return (
    <section className="container tr-section">
      <SectionHead
        n="03"
        topic="Comparable sales"
        question={
          <>
            What's <em>actually</em> selling around here?
          </>
        }
        verdict={`${comps.length} sales · last 6 mo`}
        tone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
```

With:

```typescript
  return (
    <section className="container tr-section">
      <SectionHead
        n="03"
        topic="Comparable sales"
        question={
          <>
            What's <em>actually</em> selling around here?
          </>
        }
        verdict={`${comps.length} sales · last 6 mo`}
        tone="pass"
      />

      {isSampleData && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}
        >
          Sample comparables · real sales data in Phase 2
        </p>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/personal/PBSalesSection.tsx
git commit -m "feat(personal): add isSampleData prop to PBSalesSection"
```

---

## Task 4: Refactor internal components in `PersonalBuyerPage.tsx`

**Files:**

- Modify: `apps/web/src/pages/PersonalBuyerPage.tsx`

This task makes four internal components prop-driven: `PersonalPropertyHero`, `RisksSection`, `NeighbourhoodSection`, and `SchoolsSection`. None of the actual JSX output changes for the demo path.

- [ ] **Step 1: Add `EMPTY_SCHOOLS` constant and update imports**

After the `STATIC_LIGHT_SCORE` constant (line 53), add:

```typescript
// ── Empty schools — used when isReal to give 0 pts without fixture data ────────
const EMPTY_SCHOOLS: PersonalSchools = { elementary: [], middle: [], high: [] }
```

Also add `PersonalSchools` and `PersonalProperty` to the type imports. The existing imports at the top of the file already have `type { HomeScore, PersonalMonthlyCost } from '../types/personal'`. Add the two new types:

```typescript
import type {
  HomeScore,
  PersonalMonthlyCost,
  PersonalSchools,
  PersonalProperty,
} from '../types/personal'
```

And add `shimToPersonalProperty`, `shimToPersonalNeighbourhood` to the reportShims import. After the existing `import { fmtMoney, fmtPct } from '../lib/investorCalc'` line, add:

```typescript
import { shimToPersonalProperty, shimToPersonalNeighbourhood } from '../lib/reportShims'
```

- [ ] **Step 2: Refactor `PersonalPropertyHero` to accept `property` and `photoUrls` as props**

Replace the interface and function signature:

```typescript
// ── Personal property hero ────────────────────────────────────────────────────

interface PersonalHeroProps {
  property: PersonalProperty
  score: HomeScore
  monthly: PersonalMonthlyCost
  photoUrls?: string[]
}

function PersonalPropertyHero({
  property,
  score,
  monthly,
  photoUrls,
}: PersonalHeroProps): JSX.Element {
  const verdictColor =
    score.verdict.tone === 'pass'
      ? 'var(--pass)'
      : score.verdict.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'
```

(Remove the `const property = PB_PROPERTY` line — `property` is now a prop.)

- [ ] **Step 3: Update "Listed N days ago" strip to hide when `daysOnMarket === 0`**

Find this block inside `PersonalPropertyHero` (lines 88–96):

```tsx
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
  <span
    className="live-dot"
    style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
  />
  Listed {property.daysOnMarket} days ago
</span>
```

Replace with:

```tsx
{
  property.daysOnMarket > 0 && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        className="live-dot"
        style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
      />
      Listed {property.daysOnMarket} days ago
    </span>
  )
}
```

- [ ] **Step 4: Update photo grid to render real photos when `photoUrls` is provided**

Replace the entire photo grid block (the `<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>` block) with:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
  {photoUrls && photoUrls.length > 0 ? (
    <>
      {/* Realtor.ca CDN may block hotlink requests from localhost.
                    onError falls back to placeholder silently. */}
      <RealPhoto url={photoUrls[0]} style={{ borderRadius: 18, height: '100%' }} />
      <div className="col" style={{ gap: 8 }}>
        {[1, 2, 3].map((i) =>
          photoUrls[i] ? (
            <RealPhoto
              key={i}
              url={photoUrls[i]}
              style={{ borderRadius: 14, flex: 1 }}
              extra={i === 3 && photoUrls.length > 4 ? `+ ${photoUrls.length - 4} more` : undefined}
            />
          ) : (
            <div key={i} className="photo-ph" style={{ borderRadius: 14, flex: 1 }} />
          )
        )}
      </div>
    </>
  ) : (
    <>
      <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
        <span>front · curb view</span>
      </div>
      <div className="col" style={{ gap: 8 }}>
        <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}>
          <span>living room</span>
        </div>
        <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}>
          <span>kitchen</span>
        </div>
        <div className="photo-ph" style={{ borderRadius: 14, flex: 1, position: 'relative' }}>
          <span>backyard</span>
          <div
            className="mono"
            style={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '3px 8px',
              background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
              borderRadius: 999,
              color: 'var(--ink)',
              backdropFilter: 'blur(4px)',
            }}
          >
            + 28 more
          </div>
        </div>
      </div>
    </>
  )}
</div>
```

Also add the `RealPhoto` helper component above `PersonalPropertyHero` (after `EMPTY_SCHOOLS`):

```typescript
// ── RealPhoto — img with fallback to placeholder on CDN hotlink block ──────────

interface RealPhotoProps {
  url: string
  style: React.CSSProperties
  extra?: string
}

function RealPhoto({ url, style, extra }: RealPhotoProps): JSX.Element {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <div className="photo-ph" style={style} />
  }

  return (
    <div style={{ ...style, position: 'relative', overflow: 'hidden', background: 'var(--line)' }}>
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {extra && (
        <div
          className="mono"
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            fontSize: 10,
            letterSpacing: '0.1em',
            padding: '3px 8px',
            background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
            borderRadius: 999,
            color: 'var(--ink)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {extra}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Refactor `RisksSection` to accept `flags` prop**

Replace the existing `RisksSection` function (lines 948–991):

```typescript
interface RisksSectionProps {
  flags?: Array<{ severity: 'red' | 'amber'; label: string; evidence?: string | null }>
}

function RisksSection({ flags }: RisksSectionProps): JSX.Element {
  // Real flags path: use API data. Demo path (flags undefined): use RISK_FLAGS fixture.
  if (flags !== undefined) {
    const redCount = flags.filter((f) => f.severity === 'red').length
    const amberCount = flags.filter((f) => f.severity === 'amber').length
    const verdict =
      flags.length === 0
        ? 'No flags detected'
        : `${amberCount + redCount} flagged · ${redCount > 0 ? redCount + ' critical' : 'none critical'}`

    return (
      <section className="container tr-section">
        <SectionHead
          n="07"
          topic="Risks & conditions"
          question={
            <>
              What should the <em>inspector</em> look at?
            </>
          }
          verdict={verdict}
          tone={flags.length === 0 ? 'pass' : 'caution'}
        />

        <div className="col gap-12">
          {flags.length === 0 ? (
            <RiskRow tone="green" label="No flags detected in this listing" detail="" />
          ) : (
            flags.map((f) => (
              <RiskRow
                key={f.label}
                tone="amber"
                label={f.label}
                detail={f.evidence ?? ''}
              />
            ))
          )}
        </div>

        <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
          Risks above come from listing description parsing, municipal open data (flood overlays,
          conservation), and PropScout's pre-1980 build heuristics. Use them to scope your
          inspection and your conditional period — not as a final word.
        </p>
      </section>
    )
  }

  // Demo path — fixture data
  const amberCount = RISK_FLAGS.filter((f) => f.tone === 'amber').length
  const clearCount = RISK_FLAGS.filter((f) => f.tone === 'green').length

  return (
    <section className="container tr-section">
      <SectionHead
        n="07"
        topic="Risks & conditions"
        question={
          <>
            What should the <em>inspector</em> look at?
          </>
        }
        verdict={`${amberCount} to verify · ${clearCount} clear`}
        tone="caution"
      />

      <div className="col gap-12">
        {RISK_FLAGS.map((f) => (
          <RiskRow
            key={f.label}
            tone={f.tone === 'amber' ? 'amber' : 'green'}
            label={f.label}
            detail={f.detail}
          />
        ))}
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Risks above come from listing description parsing, municipal open data (flood overlays,
        conservation), and PropScout's pre-1980 build heuristics. Use them to scope your inspection
        and your conditional period — not as a final word.
      </p>
    </section>
  )
}
```

- [ ] **Step 6: Refactor `NeighbourhoodSection` to accept `neigh` prop**

Replace the function signature from:

```typescript
function NeighbourhoodSection(): JSX.Element {
  const neigh = PB_NEIGHBOURHOOD
```

To:

```typescript
interface NeighbourhoodSectionProps {
  neigh: PersonalNeighbourhood
}

function NeighbourhoodSection({ neigh }: NeighbourhoodSectionProps): JSX.Element {
```

(Remove `const neigh = PB_NEIGHBOURHOOD` — `neigh` is now a prop.)

Also import `PersonalNeighbourhood` — already added in Step 1.

- [ ] **Step 7: Refactor `SchoolsSection` to accept `isReal` prop**

Replace the function signature from:

```typescript
function SchoolsSection(): JSX.Element {
  const schools = PB_SCHOOLS
```

To:

```typescript
interface SchoolsSectionProps {
  isReal: boolean
}

function SchoolsSection({ isReal }: SchoolsSectionProps): JSX.Element {
  const schools = PB_SCHOOLS
```

Then add the Phase 2 note after the `SectionHead` (after the closing `/>` of SectionHead):

```tsx
{
  isReal && (
    <p
      className="mono"
      style={{
        fontSize: 11,
        color: 'var(--muted)',
        letterSpacing: '0.12em',
        marginBottom: 16,
      }}
    >
      School catchment data · real lookup in Phase 2
    </p>
  )
}
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck --workspace=apps/web
```

Fix any errors before committing.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/PersonalBuyerPage.tsx
git commit -m "refactor(personal): make hero/risks/neighbourhood/schools prop-driven"
```

---

## Task 5: Wire orchestration + prop plumbing in `PersonalBuyerPage`

**Files:**

- Modify: `apps/web/src/pages/PersonalBuyerPage.tsx`

- [ ] **Step 1: Replace the orchestration block inside `PersonalBuyerPage`**

Find the existing orchestration block (lines 1252–1274) and replace it entirely:

```typescript
export function PersonalBuyerPage({
  tier: _tier = 'pro',
  analysis: realAnalysis,
  listing: realListing,
}: PersonalBuyerPageProps): JSX.Element {
  const [dark, setDark] = useState(false)

  const isReal = !!(realAnalysis && realListing)

  const property = useMemo(
    () =>
      isReal
        ? shimToPersonalProperty(realListing!, realAnalysis!)
        : PB_PROPERTY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal]
  )

  const neighbourhood = useMemo(
    () => (isReal ? shimToPersonalNeighbourhood(realAnalysis!) : PB_NEIGHBOURHOOD),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal]
  )

  const financing = {
    downPct: property.defaultDownPct,
    rate: property.defaultRate,
    amort: property.defaultAmort,
  }

  const monthly = useMemo(
    () => computeMonthlyCost(property, financing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property]
  )

  // When isReal: pass 0 for schools and light — score reflects only what's known.
  // Week 4-5 will replace these with real EQAO data and pvlib sun output.
  const schoolsForScore = isReal ? EMPTY_SCHOOLS : PB_SCHOOLS
  const lightScore = isReal ? 0 : STATIC_LIGHT_SCORE

  const score = useMemo(
    () => computeHomeScore(property, schoolsForScore, neighbourhood, lightScore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property, neighbourhood, lightScore]
  )

  const addressSlug = realListing
    ? realListing.address.split(',')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
      '248-mountcrest-burlington'
    : '248-mountcrest-burlington'
```

- [ ] **Step 2: Update `PersonalPropertyHero` call — pass `property`, `photoUrls`, and score card caveat**

Replace:

```tsx
<PersonalPropertyHero score={score} monthly={monthly} />
```

With:

```tsx
;<PersonalPropertyHero
  property={property}
  score={score}
  monthly={monthly}
  photoUrls={
    isReal ? (realListing!.photos.length > 0 ? realListing!.photos : undefined) : undefined
  }
/>
{
  isReal && (
    <div className="container" style={{ marginTop: -24, marginBottom: 8 }}>
      <p
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.12em',
        }}
      >
        School and sun data · available in Phase 2
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Update `PBTrueCostSection` to use shimmed property**

Replace:

```tsx
<PBTrueCostSection property={PB_PROPERTY} monthly={monthly} />
```

With:

```tsx
<PBTrueCostSection property={property} monthly={monthly} />
```

- [ ] **Step 4: Update `PBFMVSection` to use shimmed property + `isEstimated`**

Replace:

```tsx
<PBFMVSection
  property={PB_PROPERTY}
  score={score}
  compCount={PB_COMPS.length}
  avgDOM={12}
  medianPPSqft={538}
/>
```

With:

```tsx
<PBFMVSection
  property={property}
  score={score}
  compCount={isReal ? undefined : PB_COMPS.length}
  avgDOM={isReal ? undefined : 12}
  medianPPSqft={isReal ? undefined : 538}
  isEstimated={isReal}
/>
```

- [ ] **Step 5: Update `PBSalesSection` to pass `isSampleData`**

Replace:

```tsx
<PBSalesSection comps={PB_COMPS} />
```

With:

```tsx
<PBSalesSection comps={PB_COMPS} isSampleData={isReal} />
```

- [ ] **Step 6: Update `SchoolsSection` call to pass `isReal`**

Replace:

```tsx
<SchoolsSection />
```

With:

```tsx
<SchoolsSection isReal={isReal} />
```

- [ ] **Step 7: Update `NeighbourhoodSection` call to pass `neigh`**

Replace:

```tsx
<NeighbourhoodSection />
```

With:

```tsx
<NeighbourhoodSection neigh={neighbourhood} />
```

- [ ] **Step 8: Update `RisksSection` call to pass `flags`**

Replace:

```tsx
<RisksSection />
```

With:

```tsx
<RisksSection flags={isReal ? realAnalysis!.riskFlags : undefined} />
```

- [ ] **Step 9: Typecheck**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/pages/PersonalBuyerPage.tsx
git commit -m "feat(personal): wire real analysis + listing data into PersonalBuyerPage"
```

---

## Task 6: Verify demo path + run tests

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test --workspace=apps/web
```

Expected: all existing tests pass. If any snapshot tests fail due to the prop changes, update snapshots:

```bash
npm test --workspace=apps/web -- --updateSnapshot
```

Only update snapshots that changed due to this PR. Do not update snapshots that were already failing before this PR.

- [ ] **Step 2: Run typecheck one final time**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no errors.

- [ ] **Step 3: Verify demo path manually**

Start the dev server and open `http://localhost:5173`. Click "Hamilton duplex" or "Toronto rental" sample link on the landing page. Verify:

- Report shows 248 Mountcrest Avenue (Burlington fixture data)
- No `~` prefix on FMV values
- No "Estimated range" chip
- No "Sample comparables" chip
- No "School catchment data · real lookup in Phase 2" label
- No "School and sun data · available in Phase 2" chip below score gauge
- Score gauge shows 74 (fixture value with PB_SCHOOLS + STATIC_LIGHT_SCORE)
- Photo grid shows placeholder divs

- [ ] **Step 4: Verify real listing path manually**

Paste a live Realtor.ca URL (e.g. `https://www.realtor.ca/real-estate/29826509/ph07-5-buttermill-avenue-vaughan`), select "I'm buying to live", wait for the report. Verify:

- Address in hero matches the listing (PH07 Buttermill, not 248 Mountcrest)
- Price shown matches the listing ($523,000, not $875,000)
- Beds/baths/sqft match the listing
- FMV values have `~` prefix
- "Estimated range · real comps in Phase 2" chip visible
- "Sample comparables · real sales data in Phase 2" chip visible
- "School catchment data · real lookup in Phase 2" visible below schools section head
- "School and sun data · available in Phase 2" chip visible below score gauge
- Score is lower than 74 (schools + light are 0)
- AI narrative shows real text (not Burlington fixture text)

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(personal): post-review corrections from demo/real path verification"
```
