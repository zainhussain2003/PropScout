/**
 * reportShims.ts — compatibility shims for the /r/:token report page.
 *
 * Maps the API's Analysis + Listing types to the internal display shapes
 * that each report page currently expects. Fields that don't exist in the
 * API response fall back to safe zero / empty defaults. Those sections will
 * be fully populated as the API expands.
 */

import type {
  Analysis,
  ListingData,
  InvestorRiskFlag,
  NeighbourhoodData,
  TenantListingData,
  SchoolsResult,
  NearbySchool,
  TenantSchools,
  TenantSchool,
  TenantFlag,
  TenantRealityItem,
  TenantCostLine,
  TenantAmenity,
  TenantLeverageRow,
  SchoolBoard,
  SchoolQuality,
} from '../types/analysis'
import type { Listing } from '../types/property'
import type {
  PersonalProperty,
  PersonalNeighbourhood,
  PersonalSchools,
  PersonalSchool,
} from '../types/personal'
import type { LandlordProperty } from '../types/landlord'
import {
  FINANCING_DEFAULTS,
  PROPERTY_COST_ESTIMATES,
  formatPropertyType,
} from '../constants/defaults'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Real risk flags → the TenantFlag shape §02 Listing Accuracy renders. Keeps the
 * live tenant report on REAL extracted flags instead of the CHARLES fixtures
 * (which previously leaked into real mode). Risk flags are all warnings, so tone
 * is red/amber only (never the fixture's confirmed-'good' rows). The evidence
 * quote becomes both the detail summary and the expandable evidence line.
 */
export function shimToTenantFlags(flags: Analysis['riskFlags']): TenantFlag[] {
  return flags.map((f) => ({
    id: f.id,
    tone: f.severity === 'red' ? 'red' : 'amber',
    label: f.label,
    detail: f.evidence ?? 'Flagged from the listing description.',
    evidence: f.evidence ?? undefined,
  }))
}

/**
 * Build the §03 Listed-vs-Reality comparison from the analysis's risk flags.
 *
 * Only flags that carry an evidence quote (the exact wording the listing used)
 * can be shown as a claim-vs-reality pair: the quote is "how it's listed" and
 * the flag label is the caveat to verify in person. Returns null when no flag
 * carries evidence, so the caller falls back to the honest placeholder.
 */
export function shimToListedVsReality(
  analysis: Analysis
): { listed: string[]; reality: TenantRealityItem[] } | null {
  const withEvidence = analysis.riskFlags.filter(
    (f) => f.evidence != null && f.evidence.trim().length > 0
  )
  if (withEvidence.length === 0) return null

  const listed = withEvidence.map((f) => `"${f.evidence!.trim()}"`)
  const reality: TenantRealityItem[] = withEvidence.map((f) => ({
    txt: f.label,
    tone: 'bad',
  }))
  return { listed, reality }
}

function parseAddress(address: string): { line1: string; line2: string } {
  const idx = address.indexOf(',')
  if (idx === -1) return { line1: address, line2: '' }
  return { line1: address.slice(0, idx).trim(), line2: address.slice(idx + 1).trim() }
}

function shimInvestorRiskFlags(flags: Analysis['riskFlags']): InvestorRiskFlag[] {
  return flags.map((f) => ({
    id: f.id,
    tone: f.severity === 'red' ? 'red' : ('amber' as InvestorRiskFlag['tone']),
    label: f.label,
    detail: f.evidence ?? '',
    deduct: 0, // deduction already applied to deal score by the calc engine
  }))
}

function buildInvestorChips(listing: Listing): string[] {
  const chips: string[] = []
  chips.push(listing.listingType === 'for-sale' ? 'For sale' : 'For rent')
  chips.push(`${listing.beds} bed · ${listing.baths} bath`)
  if (listing.sqft) chips.push(`${listing.sqft.toLocaleString()} sqft`)
  if (listing.condoFeeKnown && listing.condoFeeMonthly) chips.push('Condo')
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  return chips
}

function buildTenantChips(listing: Listing): string[] {
  const chips: string[] = []
  chips.push('For rent')
  if (listing.sqft) chips.push(`${listing.sqft.toLocaleString()} sqft`)
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  return chips
}

function buildPersonalChips(listing: Listing): string[] {
  const chips: string[] = ['Personal use · For sale']
  chips.push(`${listing.city} · ${listing.postalCode}`)
  if (listing.sqft) {
    chips.push(
      `${formatPropertyType(listing.propertyType)} · ${listing.sqft.toLocaleString()} sqft`
    )
  } else {
    chips.push(formatPropertyType(listing.propertyType))
  }
  if (listing.yearBuilt) chips.push(`Built ${listing.yearBuilt}`)
  return chips
}

// ── Public shims ──────────────────────────────────────────────────────────────

/**
 * Converts a real API Listing + Analysis into the PersonalProperty
 * shape expected by PersonalBuyerPage.
 *
 * @param listing - scraped listing data from Supabase
 * @param _analysis - reserved for when dealScore or riskFlags feed
 *   into the personal report score (Week 4-5). Unused for MVP.
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
  const sqftBasis = sqft > 0 ? sqft : PROPERTY_COST_ESTIMATES.SQFT_FALLBACK
  const hydro = Math.round(sqftBasis * PROPERTY_COST_ESTIMATES.HYDRO_PER_SQFT)
  const gas = Math.round(sqftBasis * PROPERTY_COST_ESTIMATES.GAS_PER_SQFT)

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
    utilityEstMonthly: {
      hydro,
      gas,
      water: PROPERTY_COST_ESTIMATES.WATER_MONTHLY,
      internet: PROPERTY_COST_ESTIMATES.INTERNET_MONTHLY,
    },
    insuranceMonthlyEst: Math.round((price * PROPERTY_COST_ESTIMATES.INSURANCE_RATE_ANNUAL) / 12),
    chips: buildPersonalChips(listing),
    fmv: {
      low: Math.round(price * 0.95),
      mid: price,
      high: Math.round(price * 1.05),
      askingVsMid: 0,
    },
    defaultDownPct: FINANCING_DEFAULTS.DOWN_PAYMENT_PCT,
    defaultRate: FINANCING_DEFAULTS.MORTGAGE_RATE,
    defaultAmort: FINANCING_DEFAULTS.AMORTIZATION_YEARS,
  }
}

/**
 * Maps Analysis walk score data to the PersonalNeighbourhood shape.
 * Walk/transit/bike scores come from the Walk Score API (already wired in
 * the orchestrator). All other neighbourhood fields (income, distances, etc.)
 * are zeroed — to be populated when Week 4-5 neighbourhood data lands.
 * Only this function needs updating at that point.
 */
/** Google-Places distances → the {k,v,unit,tone} rows the report tables render. */
function mapDistanceRows(analysis: Analysis): Array<{
  k: string
  v: string
  unit: string
  tone: 'pass' | 'caution'
}> {
  return (analysis.nearbyDistances ?? []).map((d) => ({
    k: d.label,
    v: d.distanceKm.toFixed(1),
    unit: `km · ${d.driveMin} min drive`,
    tone: d.distanceKm <= 1.5 ? 'pass' : 'caution',
  }))
}

export function shimToPersonalNeighbourhood(analysis: Analysis): PersonalNeighbourhood {
  const stats = analysis.neighbourhoodStats
  return {
    walkScore: analysis.walkScore?.walk ?? 0,
    transitScore: analysis.walkScore?.transit ?? 0,
    bikeScore: analysis.walkScore?.bike ?? 0,
    walkSub: analysis.walkScore?.description ?? '',
    transitSub: '',
    bikeSub: '',
    // Real census figures when the FSA matched; 0 (→ "—" in the UI) otherwise.
    avgIncome: stats?.avgIncome ?? 0,
    popGrowth5y: stats?.popGrowth5y ?? 0,
    ppsqftTrend: 'N/A',
    appreciation5y: 0,
    appreciation10y: 0,
    buildingPermits: 0,
    distances: mapDistanceRows(analysis),
  }
}

/**
 * Maps a real Listing + Analysis to the ListingData shape used by
 * InvestorReport and LandlordPage components.
 */
export function shimToListingData(listing: Listing, analysis: Analysis): ListingData {
  const { line1, line2 } = parseAddress(listing.address)

  return {
    id: listing.id,
    addressLine1: line1,
    addressLine2: line2 || `${listing.city}, ${listing.province}`,
    postal: listing.postalCode,
    province: listing.province,
    isToronto: listing.city.toLowerCase() === 'toronto',
    propertyType: listing.propertyType,
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqft: listing.sqft ?? 0,
    parking:
      listing.parkingSpots > 0
        ? `${listing.parkingSpots} spot${listing.parkingSpots !== 1 ? 's' : ''}`
        : 'None',
    yearBuilt: listing.yearBuilt ?? 0,
    rentControl: true, // conservative Ontario default
    price: listing.price ?? 0,
    annualTaxes: listing.annualTaxes ?? 0,
    condoFeeMonthly: listing.condoFeeMonthly ?? 0,
    rentEstimate: analysis.rentalComps?.mid ?? 0,
    rentLow: analysis.rentalComps?.low ?? 0,
    rentHigh: analysis.rentalComps?.high ?? 0,
    compCount: analysis.rentalComps?.compCount ?? 0,
    compConfidence: analysis.rentalComps?.confidence ?? 'low',
    market: { cmhcVacancy: 0.03, rentalDOM: 14, rentTrend: 'flat' },
    riskFlags: shimInvestorRiskFlags(analysis.riskFlags),
    chips: buildInvestorChips(listing),
    photoUrls: listing.photos.length > 0 ? listing.photos : undefined,
  }
}

/**
 * Maps Analysis to the NeighbourhoodData shape. If the API already returns
 * neighbourhood data (Phase 2+) it is used directly; otherwise walk score
 * data is preserved and other stats default to zero.
 */
export function shimToNeighbourhood(analysis: Analysis): NeighbourhoodData {
  if (analysis.neighbourhood) return analysis.neighbourhood
  const stats = analysis.neighbourhoodStats
  return {
    // Real census figures when the FSA matched; 0 (→ "—" in the UI) otherwise.
    avgIncome: stats?.avgIncome ?? 0,
    popGrowth5y: stats?.popGrowth5y ?? 0,
    walkScore: analysis.walkScore?.walk ?? 0,
    transitScore: analysis.walkScore?.transit ?? 0,
    bikeScore: analysis.walkScore?.bike ?? 0,
    buildingPermits: 0,
    appreciation5y: 0,
    appreciation10y: 0,
    ppsqftTrend: 'N/A',
    comps: [],
  }
}

/**
 * Maps a real Listing + Analysis to the TenantListingData shape used by
 * TenantReport's hero and sub-components.
 */
export function shimToTenantListingData(listing: Listing, analysis: Analysis): TenantListingData {
  const { line1, line2 } = parseAddress(listing.address)
  const comps = analysis.rentalComps
  // The tenant score is currently the investment deal score. When there are no
  // comparable rentals for the area, the for-rent valuation falls back to
  // proxies and the deal score craters to a misleading "Hard pass" — which
  // tells a renter a fine apartment is terrible when the truth is we couldn't
  // assess the rent. Suppress the gauge in that case (same condition §01 uses
  // for its honest no-comps state). See the NIGHT_NOTES follow-up on redesigning
  // the tenant score to tenant-relevant signals.
  const scoreSuppressed = comps == null || comps.compCount === 0
  const scoreNumber = analysis.dealScore?.total ?? 50
  const scoreTone: TenantListingData['scoreTone'] =
    scoreNumber >= 65 ? 'pass' : scoreNumber >= 40 ? 'caution' : 'fail'
  const verdictRaw = analysis.dealScore?.verdict ?? ''
  const verdictLabel = verdictRaw.replace(/_/g, ' ')
  const targetHigh = comps?.mid ?? 0
  const targetLow = comps ? Math.round(comps.low * 0.97) : 0

  return {
    id: listing.id,
    addressLine1: line1,
    addressLine2: line2 || `${listing.city}, ${listing.province}`,
    asking: listing.rentMonthly ?? 0,
    // The hero appends the unit ("{beds} · {baths} bath", "{sqft} sqft"), so these
    // carry bare values — beds keeps its "bed(s)" word (hero shows it as-is), but
    // baths/sqft must be bare or they double ("2 baths bath", "700 sqft sqft").
    beds: `${listing.beds} bed${listing.beds !== 1 ? 's' : ''}`,
    baths: String(listing.baths),
    sqft: listing.sqft ? listing.sqft.toLocaleString() : '',
    floor: '',
    utilities: '',
    scoreNumber,
    scoreTone,
    scoreSuppressed,
    verdictLabel,
    verdictSub: analysis.narrative?.split('. ')[0] ?? '',
    targetLow,
    targetHigh,
    chips: buildTenantChips(listing),
    photoUrls: listing.photos.length > 0 ? listing.photos : undefined,
  }
}

/** Sqft-scaled utility estimates (shared with the personal report's cost model). */
function tenantUtilityEstimates(listing: Listing): {
  hydro: number
  gas: number
  water: number
  internet: number
} {
  const sqftBasis =
    listing.sqft && listing.sqft > 0 ? listing.sqft : PROPERTY_COST_ESTIMATES.SQFT_FALLBACK
  return {
    hydro: Math.round(sqftBasis * PROPERTY_COST_ESTIMATES.HYDRO_PER_SQFT),
    gas: Math.round(sqftBasis * PROPERTY_COST_ESTIMATES.GAS_PER_SQFT),
    water: PROPERTY_COST_ESTIMATES.WATER_MONTHLY,
    internet: PROPERTY_COST_ESTIMATES.INTERNET_MONTHLY,
  }
}

/**
 * §11 Unit & building spec sheet — pure scraped Listing fields. This is never a
 * placeholder: everything here comes straight off the listing. Fields the scrape
 * doesn't carry (floor, ceiling height) are simply omitted, not faked.
 */
export function shimToTenantSpecRows(listing: Listing): {
  unitRows: Array<[string, string]>
  buildingRows: Array<[string, string]>
} {
  const unitRows: Array<[string, string]> = [
    ['Bedrooms', String(listing.beds)],
    ['Bathrooms', String(listing.baths)],
    ['Interior size', listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : 'Not listed'],
    ['Property type', formatPropertyType(listing.propertyType)],
    [
      'Parking',
      listing.parkingSpots > 0
        ? `${listing.parkingSpots} space${listing.parkingSpots !== 1 ? 's' : ''}`
        : 'Not listed',
    ],
  ]
  const buildingRows: Array<[string, string]> = [
    ['Year built', listing.yearBuilt ? String(listing.yearBuilt) : 'Not listed'],
    [
      'Maintenance fee',
      listing.condoFeeKnown && listing.condoFeeMonthly != null && listing.condoFeeMonthly > 0
        ? `$${listing.condoFeeMonthly.toLocaleString()}/mo`
        : 'Not listed',
    ],
    ['City', listing.city],
    ['Postal code', listing.postalCode],
    ['Listing type', 'For rent'],
  ]
  return { unitRows, buildingRows }
}

/**
 * §05 Monthly cost — scraped rent + sqft-scaled utility estimates + parking. The
 * "target" column is the achievable rent from comps when we have them (so the
 * savings line is real), otherwise it equals asking (no fabricated savings).
 * Utility inclusion is genuinely unknown from the scrape, so heat/water are
 * marked 'maybe' (confirm), while hydro/internet are the usual tenant-paid.
 */
export function shimToTenantCostLines(listing: Listing, analysis: Analysis): TenantCostLine[] {
  const rent = listing.rentMonthly ?? 0
  const comps = analysis.rentalComps
  const rentTarget = comps ? Math.round(comps.low * 0.97) : rent
  const u = tenantUtilityEstimates(listing)
  return [
    { k: 'Rent', asking: rent, target: rentTarget, included: false },
    {
      k: 'Hydro (est.)',
      asking: u.hydro,
      target: u.hydro,
      included: false,
      note: 'estimated · usually tenant-paid',
    },
    {
      k: 'Internet (est.)',
      asking: u.internet,
      target: u.internet,
      included: false,
      note: 'estimated · usually tenant-paid',
    },
    {
      k: 'Heat / gas (est.)',
      asking: u.gas,
      target: u.gas,
      included: 'maybe',
      note: 'confirm if included in rent',
    },
    {
      k: 'Water',
      asking: u.water,
      target: u.water,
      included: 'maybe',
      note: 'confirm if included in rent',
    },
    listing.parkingSpots > 0
      ? {
          k: 'Parking',
          asking: 0,
          target: 0,
          included: true,
          note: `${listing.parkingSpots} space${listing.parkingSpots !== 1 ? 's' : ''} — confirm if extra`,
        }
      : { k: 'Parking', asking: 0, target: 0, included: 'maybe', note: 'not listed — confirm' },
  ]
}

/**
 * §06 What's included — parking is known from the scrape; utility inclusion isn't
 * carried in the payload, so those are 'unclear' (confirm) rather than faked as
 * included. Never fabricates an "included" claim we can't back up.
 */
export function shimToTenantAmenities(listing: Listing): TenantAmenity[] {
  const u = tenantUtilityEstimates(listing)
  return [
    {
      label: 'Parking',
      status: listing.parkingSpots > 0 ? 'incl' : 'unclear',
      note:
        listing.parkingSpots > 0
          ? `${listing.parkingSpots} space${listing.parkingSpots !== 1 ? 's' : ''}`
          : 'not listed — confirm',
    },
    { label: 'Heat / gas', status: 'unclear', note: 'confirm with landlord' },
    { label: 'Water', status: 'unclear', note: 'confirm with landlord' },
    { label: 'Hydro / electricity', status: 'extra', note: `~$${u.hydro}/mo (est.)` },
    { label: 'Internet', status: 'extra', note: `~$${u.internet}/mo (est.)` },
    { label: 'Air conditioning', status: 'unclear', note: 'central vs wall unit — confirm' },
    { label: 'Laundry', status: 'unclear', note: 'in-unit vs shared — confirm' },
  ]
}

/**
 * §04 Negotiation — real leverage built from what we have: how the asking rent
 * sits against the postal-code comps (when present) and every fired listing flag
 * (each is a talking point). Target range comes from comps; a copy-pasteable
 * message is generated only when there's genuine leverage to cite. `hasLeverage`
 * lets the section fall back to an honest empty when neither comps nor flags exist.
 */
export function shimToTenantNegotiation(
  listing: Listing,
  analysis: Analysis
): {
  targetLow: number
  targetHigh: number
  leverageFactors: TenantLeverageRow[]
  suggestedMessage: string
  messageReasons: string[]
  hasLeverage: boolean
} {
  const asking = listing.rentMonthly ?? 0
  const comps = analysis.rentalComps
  const targetHigh = comps?.mid ?? 0
  const targetLow = comps ? Math.round(comps.low * 0.97) : 0
  const flags = analysis.riskFlags ?? []

  const leverageFactors: TenantLeverageRow[] = []
  if (comps && comps.mid > 0) {
    const above = asking > comps.mid
    leverageFactors.push({
      k: 'Asking vs market',
      v: above
        ? `$${asking.toLocaleString()} · above the $${comps.mid.toLocaleString()} median`
        : `$${asking.toLocaleString()} · at/below market`,
      tone: above ? 'pass' : 'caution',
    })
    leverageFactors.push({
      k: 'Comparable rentals',
      v: `$${comps.low.toLocaleString()}–$${comps.high.toLocaleString()} (${comps.compCount} comps)`,
      tone: 'pass',
    })
  }
  for (const f of flags) {
    leverageFactors.push({
      k: f.label,
      v: 'Flagged in listing',
      tone: f.severity === 'red' ? 'pass' : 'caution',
    })
  }

  const hasLeverage = leverageFactors.length > 0
  const addr = parseAddress(listing.address).line1

  let suggestedMessage = ''
  const messageReasons: string[] = []
  if (hasLeverage) {
    const parts: string[] = [`Hi — I'm interested in ${addr} and ready to sign quickly.`]
    if (comps && targetLow > 0) {
      parts.push(
        `Comparable units in this area rent around $${comps.low.toLocaleString()}–$${comps.high.toLocaleString()}, so I'd like to propose $${targetLow.toLocaleString()}/mo.`
      )
      messageReasons.push('Anchors the number in the local comp range')
    }
    if (flags.length > 0) {
      parts.push(
        `A couple of things I'd want confirmed first: ${flags.map((f) => f.label.toLowerCase()).join('; ')}.`
      )
      messageReasons.push('Raises the flagged items as points to resolve before signing')
    }
    parts.push('Happy to provide references and sign this week if we can align.')
    messageReasons.push('Signals a low-risk, ready tenant to reduce their vacancy risk')
    suggestedMessage = parts.join(' ')
  }

  return { targetLow, targetHigh, leverageFactors, suggestedMessage, messageReasons, hasLeverage }
}

/**
 * Maps a real Listing + Analysis to the LandlordProperty shape used by
 * LandlordPage and its sub-components.
 *
 * Fields specific to the landlord's purchase history (purchasedFor, purchasedYear,
 * appreciation) are zeroed — these aren't in the scraped listing data.
 */
export function shimToLandlordProperty(listing: Listing, analysis: Analysis): LandlordProperty {
  const { line1, line2 } = parseAddress(listing.address)
  const price = listing.price ?? 0
  const parking =
    listing.parkingSpots > 0
      ? `${listing.parkingSpots} spot${listing.parkingSpots !== 1 ? 's' : ''}`
      : 'None'

  return {
    id: listing.id,
    addressLine1: line1,
    addressLine2: line2 || `${listing.city}, ${listing.province}`,
    postal: listing.postalCode,
    province: listing.province,
    toronto: listing.city.toLowerCase() === 'toronto',
    propertyType: formatPropertyType(listing.propertyType),
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqft: listing.sqft ?? 0,
    parking,
    yearBuilt: listing.yearBuilt ?? 0,
    rentControl: true, // conservative Ontario default
    price,
    purchasedFor: 0, // not in scraped data
    purchasedYear: 0, // not in scraped data
    appreciation: 0, // not in scraped data
    annualTaxes: listing.annualTaxes ?? 0,
    condoFeeMonthly: listing.condoFeeMonthly ?? 0,
    askingRent: listing.rentMonthly ?? 0,
    rentEstimate: analysis.rentalComps?.mid ?? 0,
    rentLow: analysis.rentalComps?.low ?? 0,
    rentHigh: analysis.rentalComps?.high ?? 0,
    compCount: analysis.rentalComps?.compCount ?? 0,
    compConfidence: analysis.rentalComps?.confidence ?? 'low',
    market: { cmhcVacancy: 0.03, rentalDOM: 14, rentTrend: 'flat' },
    ownership: {
      owned: false,
      mortgageBalance: 0,
      contractRate: FINANCING_DEFAULTS.MORTGAGE_RATE,
      yearsLeftOnAmort: FINANCING_DEFAULTS.AMORTIZATION_YEARS,
      daysOnMarket: 0,
      priceChanges: 0,
      lastDropAmount: 0,
    },
    riskFlags: analysis.riskFlags.map((f) => ({
      id: f.id,
      tone: f.severity === 'red' ? 'red' : ('amber' as 'red' | 'amber'),
      label: f.label,
      detail: f.evidence ?? '',
      deduct: 0,
    })),
    chips: buildInvestorChips(listing),
  }
}

// ── School shims (real schools table → report display shapes) ─────────────────

/** 12 min per km — average walking pace used for the tenant walk estimate. */
const WALK_MIN_PER_KM = 12
/** ~2 min per km city driving — used for the personal drive-time estimate. */
const DRIVE_MIN_PER_KM = 2

function classifyBoard(board: string | null): SchoolBoard {
  const b = (board ?? '').toLowerCase()
  if (b.includes('catholic') || b.includes('csdc') || b.includes('cdsb')) return 'catholic'
  if (b.includes('french') || b.includes('viamonde') || b.includes('monavenir')) return 'french'
  return 'public'
}

function qualityFor(school: NearbySchool): SchoolQuality {
  if (school.fraserRankPct != null) {
    if (school.fraserRankPct >= 67) return 'above'
    if (school.fraserRankPct >= 33) return 'avg'
    return 'below'
  }
  if (school.eqaoScore != null) {
    // eqaoScore is a 0–100 composite (% meeting the provincial standard).
    if (school.eqaoScore >= 75) return 'above'
    if (school.eqaoScore >= 60) return 'avg'
    return 'below'
  }
  return 'avg'
}

function toPersonalSchool(school: NearbySchool): PersonalSchool {
  return {
    name: school.name,
    board: school.board ?? '—',
    distance: `${school.distanceKm.toFixed(1)} km`,
    driveTime: `${Math.max(1, Math.round(school.distanceKm * DRIVE_MIN_PER_KM))} min`,
    // Keep null when EQAO hasn't loaded for this school (French boards, alternative
    // schools, tiny cohorts) so the card shows "No EQAO score" rather than a red 0.
    eqao: school.eqaoScore,
    // Keep null when Fraser hasn't loaded (currently all schools) so the card can
    // hide the figure rather than render a fabricated "0th %ile".
    fraser: school.fraserRankPct,
    // Attendance boundaries are NOT ingested — never claim catchment.
    inCatchment: false,
    grades: '—',
    gradRate: school.graduationRate ?? undefined,
  }
}

/** Map the API's distance-ranked schools to the personal-buyer display shape. */
export function shimToPersonalSchools(schools: SchoolsResult): PersonalSchools {
  return {
    elementary: schools.elementary.map(toPersonalSchool),
    middle: schools.middle.map(toPersonalSchool),
    high: schools.high.map(toPersonalSchool),
  }
}

function toTenantSchool(school: NearbySchool): TenantSchool {
  const board = classifyBoard(school.board)
  return {
    board,
    boardLabel: school.board ?? board,
    name: school.name,
    grades: '—',
    eqao: school.eqaoScore,
    distance: `${school.distanceKm.toFixed(1)} km`,
    walk: `${Math.max(1, Math.round(school.distanceKm * WALK_MIN_PER_KM))} min`,
    quality: qualityFor(school),
    // Attendance boundaries are NOT ingested — never claim catchment.
    inCatchment: false,
  }
}

/** Map the API's distance-ranked schools to the tenant slim-schools shape. */
export function shimToTenantSchools(schools: SchoolsResult): TenantSchools {
  return {
    elementary: schools.elementary.map(toTenantSchool),
    middle: schools.middle.map(toTenantSchool),
    high: schools.high.map(toTenantSchool),
  }
}
