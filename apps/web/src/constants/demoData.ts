/**
 * Demo property datasets — used until the Realtor.ca scraper is live.
 * Values match the calibration fixtures in investor-calc.jsx exactly.
 * Do NOT change the expected numeric values — they are used in regression tests.
 *
 * Vaughan (5702 Buttermill): bad deal, deal score ~9 / hard_pass
 * Hamilton (146 East 19th): good deal, deal score ~85 / strong_buy
 */

import type { ListingData, NeighbourhoodData, DealScore } from '../types/analysis'
import type { RentalInput } from '../types/api'

// ── Vaughan ────────────────────────────────────────────────────────────────────

export const VAUGHAN_LISTING: ListingData = {
  id: 'vaughan',
  addressLine1: 'Unit 5702 · 5 Buttermill Avenue',
  addressLine2: 'Vaughan · L4K · VMC Corridor',
  postal: 'L4K 5W4',
  province: 'ON',
  isToronto: false,
  propertyType: 'Condo apartment',
  beds: '3',
  baths: '2',
  sqft: 950,
  parking: '1',
  yearBuilt: 2020,
  rentControl: false, // built after Nov 15 2018
  price: 729900,
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  rentEstimate: 2900,
  rentLow: 2700,
  rentHigh: 3200,
  compCount: 8,
  compConfidence: 'medium',
  market: {
    cmhcVacancy: 0.018,
    rentalDOM: 18,
    rentTrend: 'declining',
  },
  riskFlags: [
    {
      id: 'condo_fee',
      tone: 'red',
      label: 'Condo-fee burden',
      detail: '$761/mo · 26% of estimated gross rent (threshold 20%)',
      deduct: 4,
    },
    {
      id: 'cash_flow',
      tone: 'red',
      label: 'Deeply negative cash flow',
      detail: 'Break-even rent $4,585 vs. market $2,900',
      deduct: 0,
    },
    {
      id: 'supply',
      tone: 'amber',
      label: 'Building supply pressure',
      detail: '24 active rentals in same building · trend declining',
      deduct: 2,
    },
  ],
  chips: [
    'Investment · For sale',
    'Vaughan · L4K',
    'Condo · 950 sqft',
    'Built 2020 · No rent control',
  ],
}

export const VAUGHAN_RENTAL: RentalInput = {
  low: 2700,
  mid: 2900,
  high: 3200,
  compCount: 8,
  confidence: 'medium',
  postalCode: 'L4K',
}

export const VAUGHAN_NEIGHBOURHOOD: NeighbourhoodData = {
  avgIncome: 88500,
  popGrowth5y: 0.182,
  walkScore: 72,
  transitScore: 85,
  bikeScore: 58,
  buildingPermits: 24,
  appreciation5y: 0.276,
  appreciation10y: 0.612,
  ppsqftTrend: 'Up 8.2% YoY',
  comps: [
    {
      addr: 'Unit 4203 · 5 Buttermill Ave',
      beds: '3',
      sqft: 945,
      sold: '$705,000',
      date: 'Mar 2026',
    },
    {
      addr: 'Unit 3115 · 7 Buttermill Ave',
      beds: '3',
      sqft: 970,
      sold: '$721,500',
      date: 'Feb 2026',
    },
    {
      addr: 'Unit 2802 · 5 Buttermill Ave',
      beds: '3',
      sqft: 925,
      sold: '$695,000',
      date: 'Jan 2026',
    },
  ],
}

// ── Hamilton ───────────────────────────────────────────────────────────────────

export const HAMILTON_LISTING: ListingData = {
  id: 'hamilton',
  addressLine1: '146 East 19th Street',
  addressLine2: 'Hamilton · L8V · Crown Point',
  postal: 'L8V 2P5',
  province: 'ON',
  isToronto: false,
  propertyType: 'Detached duplex',
  beds: '4 (2+2)',
  baths: '2',
  sqft: 1820,
  parking: '3 driveway',
  yearBuilt: 1985,
  rentControl: true, // pre Nov 2018
  price: 449000,
  annualTaxes: 3800,
  condoFeeMonthly: 0,
  rentEstimate: 3600,
  rentLow: 3400,
  rentHigh: 3800,
  compCount: 12,
  compConfidence: 'high',
  market: {
    cmhcVacancy: 0.025,
    rentalDOM: 22,
    rentTrend: 'rising',
  },
  riskFlags: [
    {
      id: 'rent_ctrl',
      tone: 'red',
      label: 'Ontario rent control',
      detail: 'Built pre-Nov 2018 — annual rent increases capped at provincial guideline',
      deduct: 5,
    },
    {
      id: 'age',
      tone: 'amber',
      label: 'Mid-age building (1985)',
      detail: 'Maintenance reserve set to 1.0% of value annually',
      deduct: 0,
    },
  ],
  chips: [
    'Investment · For sale',
    'Hamilton · L8V',
    'Duplex · 1,820 sqft',
    'Built 1985 · Rent-controlled',
  ],
}

export const HAMILTON_RENTAL: RentalInput = {
  low: 3400,
  mid: 3600,
  high: 3800,
  compCount: 12,
  confidence: 'high',
  postalCode: 'L8V',
}

export const HAMILTON_NEIGHBOURHOOD: NeighbourhoodData = {
  avgIncome: 72400,
  popGrowth5y: 0.094,
  walkScore: 79,
  transitScore: 64,
  bikeScore: 71,
  buildingPermits: 8,
  appreciation5y: 0.342,
  appreciation10y: 0.748,
  ppsqftTrend: 'Up 4.6% YoY',
  comps: [
    { addr: '128 East 18th Street', beds: '4', sqft: 1780, sold: '$432,000', date: 'Apr 2026' },
    { addr: '210 East 21st Street', beds: '4', sqft: 1840, sold: '$455,000', date: 'Mar 2026' },
    { addr: '95 East 17th Street', beds: '3', sqft: 1620, sold: '$418,500', date: 'Feb 2026' },
  ],
}

// ── Demo-mode stable metrics ───────────────────────────────────────────────────
// NOI, cap rate, and GRM are property-level values that do not change when
// financing sliders are adjusted. These match the Python calc engine regression
// test values exactly. Used by computeDemoMetrics in investorCalc.ts so the
// investor report page works without the backend running.

export const VAUGHAN_STABLE_METRICS = {
  noi: 10730,
  capRate: 0.0147,
  grm: 20.97,
  closingCostsTotal: 3000,
} as const

export const HAMILTON_STABLE_METRICS = {
  noi: 25144,
  capRate: 0.056,
  grm: 10.4,
  closingCostsTotal: 3000,
} as const

export const VAUGHAN_DEAL_SCORE: DealScore = {
  total: 8,
  verdict: 'hard_pass',
  breakdown: {
    capRate: 0,
    cashFlow: 0,
    cashOnCash: 0,
    dscr: 0,
    demand: 3,
    subtotal: 3,
    deduction: 6,
    componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
  },
}

export const HAMILTON_DEAL_SCORE: DealScore = {
  total: 72,
  verdict: 'good_deal',
  breakdown: {
    capRate: 22,
    cashFlow: 20,
    cashOnCash: 16,
    dscr: 12,
    demand: 7,
    subtotal: 77,
    deduction: 5,
    componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
  },
}

/** Default financing per spec — 20% down, 4.79%, 25-yr amort. */
export const DEFAULT_FINANCING_INPUTS = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
  includeManagementFee: false,
  isToronto: false,
  appreciationRate: 0.03,
  assumedIncome: 125000,
} as const
