// API request and response types

export interface ApiError {
  error: true
  code: string // machine-readable, e.g. 'SCRAPER_FAILED'
  message: string // user-facing, safe to display
}

export interface RunAnalysisRequest {
  url: string
}

export interface RunAnalysisResponse {
  token: string // redirect to /r/[token]
  analysisId: string
}

export interface GetAnalysisResponse {
  analysis: import('./analysis').Analysis
  listing: import('./property').Listing
}

export interface PropertyInput {
  address: string
  province?: string // default 'ON'
  price: number
  annualTaxes: number
  condoFeeMonthly?: number | null
  condoFeeKnown?: boolean
  beds: number
  baths: number
  sqft?: number | null
  yearBuilt?: number | null
  propertyType?: string // default 'condo'
  isToronto?: boolean
  postalCode?: string
  sourceUrl?: string
  listingType?: 'for-sale' | 'for-rent'
}

export interface FinancingInput {
  downPaymentPct: number // e.g. 0.20 for 20%
  mortgageRate: number // e.g. 0.0479 for 4.79%
  amortizationYears: number // e.g. 25
  includeManagementFee?: boolean
}

export interface RentalInput {
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
  postalCode: string
}
