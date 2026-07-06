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
  return {
    avgIncome: 0,
    popGrowth5y: 0,
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
  const scoreNumber = analysis.dealScore?.total ?? 50
  const scoreTone: TenantListingData['scoreTone'] =
    scoreNumber >= 65 ? 'pass' : scoreNumber >= 40 ? 'caution' : 'fail'
  const verdictRaw = analysis.dealScore?.verdict ?? ''
  const verdictLabel = verdictRaw.replace(/_/g, ' ')
  const comps = analysis.rentalComps
  const targetHigh = comps?.mid ?? 0
  const targetLow = comps ? Math.round(comps.low * 0.97) : 0

  return {
    id: listing.id,
    addressLine1: line1,
    addressLine2: line2 || `${listing.city}, ${listing.province}`,
    asking: listing.rentMonthly ?? 0,
    beds: `${listing.beds} bed${listing.beds !== 1 ? 's' : ''}`,
    baths: `${listing.baths} bath${listing.baths !== 1 ? 's' : ''}`,
    sqft: listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : '—',
    floor: '—',
    utilities: '—',
    scoreNumber,
    scoreTone,
    verdictLabel,
    verdictSub: analysis.narrative?.split('. ')[0] ?? '',
    targetLow,
    targetHigh,
    chips: buildTenantChips(listing),
    photoUrls: listing.photos.length > 0 ? listing.photos : undefined,
  }
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
    if (school.eqaoScore >= 8) return 'above'
    if (school.eqaoScore >= 6.5) return 'avg'
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
    eqao: school.eqaoScore ?? 0,
    fraser: school.fraserRankPct ?? 0,
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
