// Analysis, report, and deal score types

/**
 * User-editable assumptions that override calc engine defaults.
 * Every field has a tooltip in constants/assumptions.ts explaining its default.
 * All percentage values are stored as plain numbers (e.g. 5 = 5%, not 0.05).
 */
export interface AnalysisAssumptions {
  vacancyAllowance: number // % — default 5 (= 5%)
  insuranceRate: number // % — default 0.35 (= 0.35% of property value)
  managementFee: number // % — default 8 (= 8% of gross rent). 0 = self-managing.
  maintenanceRate: number // % — default auto by build year (0.5 / 1.0 / 1.5%)
  appreciationRate: number // % — default 3. Equity projections only.
  legalFees: number // $ — default 1500
  mortgageRate: number // % — default 0 (= use live Bank of Canada rate)
  nonResident: boolean // default false — if true, Ontario NRST (25% of price) is added to closing costs
}

export type ReportMode = 'investor' | 'personal' | 'tenant' | 'landlord'

export type DealVerdict =
  | 'strong_buy'
  | 'good_deal'
  | 'caution'
  | 'marginal'
  | 'do_not_buy'
  | 'hard_pass'

export interface DealScoreBreakdown {
  capRate: number // maps to Python 'cap_rate'        — max 25
  cashFlow: number // maps to Python 'cash_flow'      — max 25
  cashOnCash: number // maps to Python 'cash_on_cash' — max 20
  dscr: number // maps to Python 'dscr'               — max 15
  demand: number // maps to Python 'demand'           — max 10
  subtotal: number // sum before deductions
  deduction: number // maps to Python 'deduction'    — risk flag penalty, capped at 15
  componentMaxes: {
    capRate: number // always 25
    cashFlow: number // always 25
    cashOnCash: number // always 20
    dscr: number // always 15
    demand: number // always 10
  }
}

export interface DealScore {
  total: number // 0–100
  verdict: DealVerdict
  breakdown: DealScoreBreakdown
}

export interface InvestmentMetrics {
  // Core returns
  cashFlowMonthly: number
  cashFlowAnnual: number
  capRate: number // decimal (e.g. 0.045 = 4.5%)
  cashOnCashReturn: number
  dscr: number // debt-service coverage ratio
  grm: number // gross rent multiplier
  noi: number // net operating income (annual)

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
  lttMunicipal: number // Toronto only
  nrst: number // Non-Resident Speculation Tax — 0 when buyer is resident

  // Sanity
  hasSanityWarnings: boolean
}

export type FlagSeverity = 'red' | 'amber'

export interface RiskFlag {
  id: string
  severity: FlagSeverity
  label: string
  evidence: string | null // quote from listing description
  confidence: number // 0–100
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
  token: string // share token for /r/[token]
  mode: ReportMode
  createdAt: string
  metrics: InvestmentMetrics | null
  dealScore: DealScore | null
  rentalComps: RentalEstimate | null
  riskFlags: RiskFlag[]
  narrative: string | null
  hasSanityWarnings: boolean
}
