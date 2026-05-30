// Landlord report types
// Used by: LandlordPage, landlordData, landlord components

import type { FinancingInputs } from './analysis'

// ── Property ──────────────────────────────────────────────────────────────────

export interface LandlordOwnership {
  owned: boolean
  mortgageBalance: number
  contractRate: number
  yearsLeftOnAmort: number
  daysOnMarket: number
  priceChanges: number
  lastDropAmount: number
}

export interface LandlordRiskFlag {
  id: string
  tone: 'red' | 'amber'
  label: string
  detail: string
  deduct: number
}

export interface LandlordMarket {
  cmhcVacancy: number
  rentalDOM: number
  rentTrend: 'declining' | 'flat' | 'rising'
}

export interface LandlordProperty {
  id: string
  addressLine1: string
  addressLine2: string
  postal: string
  province: string
  toronto: boolean
  propertyType: string
  beds: string
  baths: string
  sqft: number
  parking: string
  yearBuilt: number
  rentControl: boolean
  price: number
  purchasedFor: number
  purchasedYear: number
  /** Appreciation decimal e.g. 0.318 = 31.8% */
  appreciation: number
  annualTaxes: number
  condoFeeMonthly: number
  /** Current asking rent (overridden by state in the page) */
  askingRent: number
  /** Building median rent from comps */
  rentEstimate: number
  rentLow: number
  rentHigh: number
  compCount: number
  compConfidence: 'low' | 'medium' | 'high'
  market: LandlordMarket
  ownership: LandlordOwnership
  riskFlags: LandlordRiskFlag[]
  chips: string[]
}

// ── Rent comps ────────────────────────────────────────────────────────────────

export interface LandlordLiveUnit {
  unit: string
  beds: string
  sqft: number
  askedAt: number
  status: string
  tone: 'pass' | 'caution' | 'fail'
}

export interface LandlordRentComps {
  buildingP25: number
  buildingP50: number
  buildingP75: number
  fsaP50: number
  liveListings: LandlordLiveUnit[]
}

// ── Rent positioning ──────────────────────────────────────────────────────────

export interface RentPositioning {
  label: string
  tone: 'pass' | 'caution' | 'fail'
  /** Dollar difference from building P50. Positive = above, negative = below. */
  gap: number
}

// ── Landlord-specific financing ───────────────────────────────────────────────

/** Landlord's financing — default based on their locked-in 2019 mortgage. */
export type LandlordFinancing = FinancingInputs
