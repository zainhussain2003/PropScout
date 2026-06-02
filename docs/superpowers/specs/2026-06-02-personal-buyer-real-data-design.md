# PersonalBuyerPage — Real Data Wiring Design

**Date:** 2026-06-02
**Branch:** feat/route-wiring
**Scope:** Wire real `Analysis` + `Listing` data into PersonalBuyerPage (Report B). Demo path unchanged.

---

## Context

The end-to-end pipeline (scrape → calc engine → Supabase → report page) is working. `ReportPage` passes `analysis` and `listing` props to all four report components. `InvestorReport`, `TenantReport`, and `LandlordPage` already use shims from `reportShims.ts`. `PersonalBuyerPage` only uses real data for the Nav address slug — everything else renders `PB_PROPERTY` fixture data.

---

## What changes

### 1. `reportShims.ts` — two new functions

**`shimToPersonalProperty(listing, analysis) → PersonalProperty`**

| Field                 | Source                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addressLine1`        | `listing.address` before first comma                                                                                                                              |
| `addressLine2`        | `${listing.city} · ${listing.postalCode}`                                                                                                                         |
| `postal`              | `listing.postalCode`                                                                                                                                              |
| `province`            | `listing.province`                                                                                                                                                |
| `toronto`             | `listing.city.toLowerCase() === 'toronto'`                                                                                                                        |
| `propertyType`        | `listing.propertyType`                                                                                                                                            |
| `beds`                | `String(listing.beds)`                                                                                                                                            |
| `baths`               | `String(listing.baths)`                                                                                                                                           |
| `sqft`                | `listing.sqft ?? 0`                                                                                                                                               |
| `parking`             | derived from `listing.parkingSpots` (same logic as `shimToListingData`)                                                                                           |
| `yearBuilt`           | `listing.yearBuilt ?? 0`                                                                                                                                          |
| `lotSize`             | `''` (not in API)                                                                                                                                                 |
| `price`               | `listing.price ?? 0`                                                                                                                                              |
| `daysOnMarket`        | `0` (not scraped — omit the "Listed N days ago" strip)                                                                                                            |
| `priceChange`         | `{ abs: 0, direction: null }`                                                                                                                                     |
| `annualTaxes`         | `listing.annualTaxes ?? 0`                                                                                                                                        |
| `condoFeeMonthly`     | `listing.condoFeeMonthly ?? 0`                                                                                                                                    |
| `utilityEstMonthly`   | Sqft-scaled: `hydro = Math.round((sqft ?? 800) * 0.08)`, `gas = Math.round((sqft ?? 800) * 0.06)`, `water = 60`, `internet = 65`                                  |
| `insuranceMonthlyEst` | `Math.round((listing.price ?? 0) * 0.0035 / 12)`                                                                                                                  |
| `chips`               | Built from real fields: `["Personal use · For sale", "${city} · ${postalCode}", "${propertyType} · ${sqft} sqft" (if sqft), "Built ${yearBuilt}" (if yearBuilt)]` |
| `fmv`                 | `{ low: price * 0.95, mid: price, high: price * 1.05, askingVsMid: 0 }`                                                                                           |
| `defaultDownPct`      | `0.20`                                                                                                                                                            |
| `defaultRate`         | `0.0479`                                                                                                                                                          |
| `defaultAmort`        | `25`                                                                                                                                                              |

**`shimToPersonalNeighbourhood(analysis) → PersonalNeighbourhood`**

Pulls walk/transit/bike from `analysis.walkScore` — all three null-safe, default `0`. All other `PersonalNeighbourhood` fields (income, growth, permits, appreciation) default to `0`. When Week 4-5 neighbourhood data lands, this function is the only place to update.

---

### 2. `PBFMVSection` — add `isEstimated` prop

Add `isEstimated?: boolean`. When `true`:

- Prepend `~` to all three FMV value displays (`~$831,250`, `~$875,000`, `~$918,750`)
- Add a muted chip below the section head: `"Estimated range · real comps in Phase 2"`
- No layout changes

---

### 3. `PersonalPropertyHero` — accept `property` and `photoUrls` as props

Currently reads `PB_PROPERTY` from module scope. Change to accept:

```typescript
interface PersonalHeroProps {
  property: PersonalProperty
  score: HomeScore
  monthly: PersonalMonthlyCost
  photoUrls?: string[]
}
```

Photo grid: when `photoUrls` has entries, render `<img>` tags with `onError` fallback to placeholder div. If CDN hotlink-protection blocks the request, the fallback fires silently. Add a comment explaining this.

The "Listed N days ago" strip: hide when `property.daysOnMarket === 0`.

---

### 4. `RisksSection` — accept `flags` prop

Change from reading module-level `RISK_FLAGS` to accepting:

```typescript
interface RisksSectionProps {
  flags?: Array<{ tone: 'amber' | 'red'; label: string; evidence?: string | null }>
}
```

Behaviour:

- `flags` not passed (demo path) → render `RISK_FLAGS` constant as before
- `flags` passed, non-empty → render real flags; map `red` → `amber` tone for `RiskRow` (RiskRow only has amber/green)
- `flags` passed, empty array → render one green row: _"No flags detected in this listing"_

The `SectionHead` verdict string: when real data, use `"${amberCount} flagged · ${redCount > 0 ? redCount + ' critical' : 'none critical'}"`. When empty: `"No flags detected"`.

---

### 5. `PBSalesSection` — add `isSampleData` prop

Add `isSampleData?: boolean`. When `true`, render a muted chip above the comps list: `"Sample comparables · real sales data in Phase 2"`. Fixture comp data unchanged — this label makes clear they aren't derived from the current listing.

---

### 6. Schools section — Phase 2 note when real

Below the schools `SectionHead`, when `isReal`, render a single muted line:
_"School catchment data · real lookup in Phase 2"_

`PB_SCHOOLS` fixture renders as-is in both paths.

---

### 7. `PersonalBuyerPage` — orchestration

```typescript
const isReal = !!(realAnalysis && realListing)

const property = useMemo(
  () => (isReal ? shimToPersonalProperty(realListing!, realAnalysis!) : PB_PROPERTY),
  [isReal, realAnalysis, realListing]
)

const neighbourhood = useMemo(
  () => (isReal ? shimToPersonalNeighbourhood(realAnalysis!) : PB_NEIGHBOURHOOD),
  [isReal, realAnalysis]
)

const financing = { downPct: 0.2, rate: 0.0479, amort: 25 }

const monthly = useMemo(() => computeMonthlyCost(property, financing), [property])

// When isReal: pass 0 for schoolPts and lightScore — honest, not a hack.
// Week 4-5 wires real school data; STATIC_LIGHT_SCORE replaced by pvlib output.
const schoolsForScore = isReal ? EMPTY_SCHOOLS : PB_SCHOOLS
const lightScore = isReal ? 0 : STATIC_LIGHT_SCORE

const score = useMemo(
  () => computeHomeScore(property, schoolsForScore, neighbourhood, lightScore),
  [property, schoolsForScore, neighbourhood, lightScore]
)
```

`EMPTY_SCHOOLS` is a module-level constant — a `PersonalSchools` with empty arrays for all three levels. This ensures `computeHomeScore` gives 0 pts for schools when real data isn't yet available.

When `isReal`, show the caveat below the score gauge:
`"School and sun data · available in Phase 2"` — rendered as a muted mono chip, not a prominent warning.

---

## What does NOT change

- Demo path (`!isReal`) — identical to current behaviour, all fixture data
- `computeMonthlyCost` and `computeHomeScore` functions — no changes to logic
- `PBTrueCostSection` — already receives `property` and `monthly` props, will automatically show real values once `property` is shimmed
- `SchoolColumn` — receives `PB_SCHOOLS`, unchanged in both paths
- Checklist section — static, unchanged
- Conversion strip — static, unchanged

---

## Forward compatibility

Every placeholder in this design is designed to be replaced by a single prop or shim update in Week 4-5:

| Placeholder                         | Replaced by                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `EMPTY_SCHOOLS` → 0 school pts      | Real Google Places + EQAO data via `shimToPersonalSchools()` |
| `lightScore = 0`                    | pvlib `annual_light_score()` output                          |
| `shimToPersonalNeighbourhood` zeros | Real Statistics Canada + CMHC data                           |
| FMV ±5% estimate                    | Real sales comp data                                         |

No follow-up patches needed to the component — just the shim functions and the data source.

---

## Files touched

| File                                                  | Change                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/src/lib/reportShims.ts`                     | Add `shimToPersonalProperty`, `shimToPersonalNeighbourhood`     |
| `apps/web/src/pages/PersonalBuyerPage.tsx`            | Orchestration layer + prop plumbing through internal components |
| `apps/web/src/components/personal/PBFMVSection.tsx`   | Add `isEstimated` prop                                          |
| `apps/web/src/components/personal/PBSalesSection.tsx` | Add `isSampleData` prop                                         |
| `docs/MVP_TODO.md`                                    | SunScout moved to Week 4-5 (already done)                       |

`reportShims.ts` and the four component files are the complete change surface — no new files, no schema changes, no API changes.
