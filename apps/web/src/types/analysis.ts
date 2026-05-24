// Analysis, report, and deal score types

export type ReportMode = 'investor' | 'personal' | 'tenant' | 'landlord'

export type DealVerdict =
  | 'strong_buy'
  | 'good_deal'
  | 'caution'
  | 'marginal'
  | 'do_not_buy'
  | 'hard_pass'

export interface DealScore {
  total: number           // 0–100
  verdict: DealVerdict
  breakdown: {
    cashFlow: number
    capRate: number
    dscr: number
    closingCosts: number
    riskFlags: number
  }
}

export interface InvestmentMetrics {
  // Core returns
  cashFlowMonthly: number
  cashFlowAnnual: number
  capRate: number         // decimal (e.g. 0.045 = 4.5%)
  cashOnCashReturn: number
  dscr: number            // debt-service coverage ratio
  grm: number             // gross rent multiplier
  noi: number             // net operating income (annual)

  // Mortgage
  mortgagePaymentMonthly: number
  downPayment: number
  mortgageAmount: number
  amortizationYears: number
  mortgageRate: number

  // Costs
  breakEvenRent: number
  closingCostsTotal: number
  lttProvincial: number
  lttMunicipal: number    // Toronto only

  // Sanity
  hasSanityWarnings: boolean
}

export type FlagSeverity = 'red' | 'amber'

export interface RiskFlag {
  id: string
  severity: FlagSeverity
  label: string
  evidence: string | null   // quote from listing description
  confidence: number        // 0–100
}

export interface RentalEstimate {
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
  postalCode: string
}

export interface Analysis {
  id: string
  token: string             // share token for /r/[token]
  mode: ReportMode
  createdAt: string
  metrics: InvestmentMetrics | null
  dealScore: DealScore | null
  rentalComps: RentalEstimate | null
  riskFlags: RiskFlag[]
  narrative: string | null
  hasSanityWarnings: boolean
}
