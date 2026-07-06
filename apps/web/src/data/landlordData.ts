/**
 * landlordData — Toronto Harbour Street 1+den condo demo dataset for the
 * Landlord report (Unit 3208 · 88 Harbour Street).
 *
 * Ported from landlord-data.jsx. These values match the design prototype exactly.
 * The landlord report reuses computeDemoMetrics + enrichMetrics from investorCalc.ts
 * for live metric recalculation when the rent slider moves.
 */

import type { LandlordProperty, LandlordRentComps, RentPositioning } from '../types/landlord'
import type {
  FinancingInputs,
  DealScoreData,
  DealVerdict,
  InvestmentMetrics,
} from '../types/analysis'
import { computeExpenses } from '../lib/investorCalc'

// ── Property ──────────────────────────────────────────────────────────────────

export const LL_PROPERTY: LandlordProperty = {
  id: 'harbour-3208',
  addressLine1: 'Unit 3208 · 88 Harbour Street',
  addressLine2: 'Toronto · M5J · South Core',
  postal: 'M5J 0C3',
  province: 'ON',
  toronto: true,
  propertyType: 'Condo apartment',
  beds: '1+den',
  baths: '2',
  sqft: 745,
  parking: '1 underground',
  yearBuilt: 2018,
  rentControl: false, // built after Nov 2018
  price: 949000,
  purchasedFor: 720000,
  purchasedYear: 2019,
  appreciation: 0.318, // (949-720)/720
  annualTaxes: 4420,
  condoFeeMonthly: 890,
  askingRent: 3400,
  rentEstimate: 3100, // building median
  rentLow: 2950,
  rentHigh: 3350,
  compCount: 12,
  compConfidence: 'high',
  market: {
    cmhcVacancy: 0.022,
    rentalDOM: 24,
    rentTrend: 'flat',
  },
  ownership: {
    owned: true,
    mortgageBalance: 478000,
    contractRate: 0.0349,
    yearsLeftOnAmort: 20,
    daysOnMarket: 38,
    priceChanges: 1,
    lastDropAmount: 100,
  },
  riskFlags: [
    {
      id: 'overpriced',
      tone: 'red',
      label: 'Asking rent above market range',
      detail: '$3,400 vs building median $3,100 · 38 days on market with one $100 drop already',
      deduct: 3,
    },
    {
      id: 'condo_fee',
      tone: 'amber',
      label: 'High condo fee for the unit size',
      detail: '$890/mo · 26% of asking gross rent (threshold 20%)',
      deduct: 2,
    },
  ],
  chips: [
    'Landlord · For rent',
    'Toronto · M5J',
    'Condo · 745 sqft',
    'Built 2018 · No rent control',
  ],
}

// ── Rent comps ────────────────────────────────────────────────────────────────

export const LL_RENT_COMPS: LandlordRentComps = {
  buildingP25: 2950,
  buildingP50: 3100,
  buildingP75: 3350,
  fsaP50: 3050,
  liveListings: [
    { unit: '#1208', beds: '1+1', sqft: 690, askedAt: 3050, status: 'rented · 7d', tone: 'pass' },
    { unit: '#2604', beds: '1+1', sqft: 710, askedAt: 3100, status: 'rented · 11d', tone: 'pass' },
    {
      unit: '#3416',
      beds: '1+1',
      sqft: 720,
      askedAt: 3175,
      status: 'active · 4d',
      tone: 'caution',
    },
    {
      unit: '#4108',
      beds: '1+1',
      sqft: 770,
      askedAt: 3250,
      status: 'active · 18d',
      tone: 'caution',
    },
    {
      unit: '#2912',
      beds: '1+1',
      sqft: 740,
      askedAt: 3475,
      status: 'active · 42d · price dropped',
      tone: 'fail',
    },
  ],
}

// ── Default financing (landlord's locked-in 2019 mortgage) ───────────────────

export const LL_DEFAULT_FINANCING: FinancingInputs = {
  downPaymentPct: 0.3,
  mortgageRate: 0.0349,
  amortizationYears: 20,
  includeManagementFee: false,
  isToronto: true,
  appreciationRate: 0.03,
  assumedIncome: 165000,
}

// ── Calculations ──────────────────────────────────────────────────────────────

/**
 * Determines where the asking rent sits relative to building comps.
 */
export function computeRentPositioning(
  askingRent: number,
  comps: LandlordRentComps
): RentPositioning {
  const { buildingP25, buildingP50, buildingP75 } = comps
  if (askingRent <= buildingP25) {
    return { label: 'Below market', tone: 'caution', gap: buildingP50 - askingRent }
  }
  if (askingRent <= buildingP50 + (buildingP75 - buildingP50) * 0.4) {
    return { label: 'At market', tone: 'pass', gap: askingRent - buildingP50 }
  }
  if (askingRent <= buildingP75 + (buildingP75 - buildingP50) * 0.3) {
    return { label: 'Top of range', tone: 'caution', gap: askingRent - buildingP50 }
  }
  return { label: 'Above market', tone: 'fail', gap: askingRent - buildingP50 }
}

/**
 * Computes the "stable" (financing-independent) metrics for the landlord's
 * property at a given rent. Returns the values needed by computeDemoMetrics.
 */
export function computeLandlordStable(
  property: LandlordProperty,
  rent: number,
  includeManagementFee: boolean
): { noi: number; capRate: number; grm: number; closingCostsTotal: number } {
  const grossRentAnnual = rent * 12
  const expenses = computeExpenses(
    property.price,
    property.annualTaxes,
    property.condoFeeMonthly,
    grossRentAnnual,
    property.yearBuilt,
    includeManagementFee
  )
  const noi = grossRentAnnual - expenses.total
  const capRate = noi / property.price
  const grm = property.price / grossRentAnnual
  const closingCostsTotal = 3000 // demo estimate

  return { noi, capRate, grm, closingCostsTotal }
}

/**
 * Computes a deal score from investor metrics + landlord property.
 * Ported from investor-calc.jsx::computeDealScore (spec Section 10 formula).
 * Returns a DealScoreData object compatible with the investor components.
 */
export function computeLandlordDealScore(
  metrics: Pick<InvestmentMetrics, 'capRate' | 'cashFlowMonthly' | 'cashOnCashReturn' | 'dscr'>,
  property: Pick<LandlordProperty, 'market' | 'riskFlags'>
): DealScoreData {
  // Cap rate component (max 25)
  let capRatePts = 0
  if (metrics.capRate >= 0.06) capRatePts = 25
  else if (metrics.capRate >= 0.05) capRatePts = 20
  else if (metrics.capRate >= 0.04) capRatePts = 15
  else if (metrics.capRate >= 0.03) capRatePts = 10
  else if (metrics.capRate >= 0.02) capRatePts = 5

  // Cash flow component (max 25)
  let cashFlowPts = 0
  if (metrics.cashFlowMonthly >= 500) cashFlowPts = 25
  else if (metrics.cashFlowMonthly >= 200) cashFlowPts = 20
  else if (metrics.cashFlowMonthly >= 0) cashFlowPts = 13
  else if (metrics.cashFlowMonthly >= -300) cashFlowPts = 6
  else if (metrics.cashFlowMonthly >= -700) cashFlowPts = 2

  // Cash-on-cash component (max 20)
  let cocPts = 0
  if (metrics.cashOnCashReturn >= 0.08) cocPts = 20
  else if (metrics.cashOnCashReturn >= 0.06) cocPts = 16
  else if (metrics.cashOnCashReturn >= 0.04) cocPts = 12
  else if (metrics.cashOnCashReturn >= 0.02) cocPts = 8
  else if (metrics.cashOnCashReturn >= 0.0) cocPts = 4

  // DSCR component (max 15)
  let dscrPts = 0
  if (metrics.dscr >= 1.25) dscrPts = 15
  else if (metrics.dscr >= 1.1) dscrPts = 12
  else if (metrics.dscr >= 1.0) dscrPts = 7
  else if (metrics.dscr >= 0.85) dscrPts = 3

  // Demand component (max 10)
  let demandPts = 0
  const v = property.market.cmhcVacancy
  if (v < 0.02) demandPts += 4
  else if (v < 0.03) demandPts += 3
  else if (v < 0.05) demandPts += 1
  const dom = property.market.rentalDOM
  if (dom < 14) demandPts += 3
  else if (dom <= 30) demandPts += 2
  const trend = property.market.rentTrend
  if (trend === 'rising') demandPts += 3
  else if (trend === 'flat') demandPts += 2

  const subtotal = capRatePts + cashFlowPts + cocPts + dscrPts + demandPts
  const totalDeduction = Math.min(
    15,
    property.riskFlags.reduce((s, f) => s + (f.deduct ?? 0), 0)
  )
  const total = Math.max(0, subtotal - totalDeduction)

  const VERDICT_TABLE: Array<{
    min: number
    verdict: DealVerdict
    label: string
    tagline: string
    tone: 'pass' | 'caution' | 'fail'
  }> = [
    {
      min: 80,
      verdict: 'strong_buy',
      label: 'Strong deal',
      tagline: 'Proceed — fundamentals are solid.',
      tone: 'pass',
    },
    {
      min: 65,
      verdict: 'good_deal',
      label: 'Good deal',
      tagline: 'Proceed with standard due diligence.',
      tone: 'pass',
    },
    {
      min: 50,
      verdict: 'caution',
      label: 'Caution',
      tagline: 'Real issues — model the risks carefully.',
      tone: 'caution',
    },
    {
      min: 35,
      verdict: 'marginal',
      label: 'Marginal',
      tagline: 'Significant headwinds — need a specific thesis.',
      tone: 'caution',
    },
    {
      min: 20,
      verdict: 'do_not_buy',
      label: 'Do not buy',
      tagline: "Numbers don't pencil as a rental.",
      tone: 'fail',
    },
    {
      min: 0,
      verdict: 'hard_pass',
      label: 'Hard pass',
      tagline: 'Fails on multiple fundamentals.',
      tone: 'fail',
    },
  ]
  const row = VERDICT_TABLE.find((r) => total >= r.min) ?? VERDICT_TABLE[VERDICT_TABLE.length - 1]

  return {
    total,
    displayTotal: Math.round((Math.max(5, total) * 100) / 95),
    verdict: row.verdict,
    label: row.label,
    tagline: row.tagline,
    tone: row.tone,
    breakdown: {
      capRate: capRatePts,
      cashFlow: cashFlowPts,
      cashOnCash: cocPts,
      dscr: dscrPts,
      demand: demandPts,
      subtotal,
      deduction: totalDeduction,
      componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
    },
    deductions: totalDeduction,
  }
}
