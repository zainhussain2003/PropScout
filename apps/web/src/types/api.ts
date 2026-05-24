// API request and response types

export interface ApiError {
  error: true
  code: string        // machine-readable, e.g. 'SCRAPER_FAILED'
  message: string     // user-facing, safe to display
}

export interface RunAnalysisRequest {
  url: string
}

export interface RunAnalysisResponse {
  token: string       // redirect to /r/[token]
  analysisId: string
}

export interface GetAnalysisResponse {
  analysis: import('./analysis').Analysis
  listing: import('./property').Listing
}

export interface FinancingInput {
  downPaymentPct: number      // e.g. 0.20 for 20%
  mortgageRate: number        // e.g. 0.0479 for 4.79%
  amortizationYears: number   // e.g. 25
}
