export type ReportMode = 'investor' | 'personal' | 'tenant' | 'landlord'

export type DealVerdict =
  | 'strong_buy'
  | 'good_deal'
  | 'caution'
  | 'marginal'
  | 'do_not_buy'
  | 'hard_pass'

export interface DealScoreBreakdown {
  capRate: number // maps to Python 'cap_rate'      — max 25
  cashFlow: number // maps to Python 'cash_flow'    — max 25
  cashOnCash: number // maps to Python 'cash_on_cash' — max 20
  dscr: number // maps to Python 'dscr'             — max 15
  demand: number // maps to Python 'demand'         — max 10
  subtotal: number // sum before deductions
  deduction: number // maps to Python 'deduction'  — risk flag penalty, capped at 15
  componentMaxes: {
    capRate: number // always 25
    cashFlow: number // always 25
    cashOnCash: number // always 20
    dscr: number // always 15
    demand: number // always 10
  }
}

export interface DealScore {
  total: number // 0–95 raw gated score (verdict derives from this)
  displayTotal: number // 0–100 floored + normalised for the gauge
  verdict: DealVerdict
  breakdown: DealScoreBreakdown
}

export interface InvestmentMetrics {
  cashFlowMonthly: number
  cashFlowAnnual: number
  capRate: number
  cashOnCashReturn: number
  dscr: number
  grm: number
  noi: number
  mortgagePaymentMonthly: number
  downPayment: number
  mortgageAmount: number
  amortizationYears: number
  mortgageRate: number
  breakEvenRent: number
  closingCostsTotal: number
  lttProvincial: number
  lttMunicipal: number
  hasSanityWarnings: boolean
}

export type FlagSeverity = 'red' | 'amber'

/** Per-mode severity tier from the flag matrix (docs/FLAG_SEVERITY_MATRIX.md).
 * 'severe' gates the score ceiling, 'red' deducts, 'amber' displays only. */
export type FlagTier = 'severe' | 'red' | 'amber'

export interface RiskFlag {
  id: string
  severity: FlagSeverity
  /** Optional: analyses stored before the matrix shipped don't carry it. */
  tier?: FlagTier
  label: string
  evidence: string | null
  confidence: number
}

export interface WalkScoreResult {
  walk: number // 0–100
  transit: number | null // 0–100, null if no transit data
  bike: number | null // 0–100, null if no bike data
  description: string // e.g. "Walker's Paradise"
}

export interface RentalEstimate {
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
  postalCode: string
}

export interface SunScoutResult {
  annualPeakSunHours: number
  summerDailyHours: number
  winterDailyHours: number
  seasonalGrid: { Dec: number; Mar: number; Jun: number; Sep: number }
  monthlyHours: number[] // 12 values, index 0=Jan, index 11=Dec (bedroom_main window)
  sunScore: number
  verdict: 'excellent' | 'good' | 'average' | 'below_average' | 'poor'
}

/** One school from the schools table, ranked by straight-line distance. */
export interface NearbySchool {
  name: string
  schoolType: 'elementary' | 'middle' | 'high'
  board: string | null
  /** Straight-line distance from the subject property, km (1 decimal). */
  distanceKm: number
  eqaoScore: number | null // 0–10 (EQAO)
  fraserRankPct: number | null // 0–100 percentile (Fraser Institute)
  graduationRate: number | null // 0–1, high schools only
}

/**
 * Nearest schools per level (max 3 each). IMPORTANT: distance-ranked only —
 * we do NOT ingest attendance-boundary data, so nothing here may be presented
 * as "in catchment" (copy-honesty rule). catchmentNote carries the disclaimer.
 */
export interface SchoolsResult {
  elementary: NearbySchool[]
  middle: NearbySchool[]
  high: NearbySchool[]
  catchmentNote: string
}

export interface Analysis {
  id: string
  token: string
  mode: ReportMode
  createdAt: string
  metrics: InvestmentMetrics | null
  dealScore: DealScore | null
  rentalComps: RentalEstimate | null
  riskFlags: RiskFlag[]
  narrative: string | null
  hasSanityWarnings: boolean
  walkScore: WalkScoreResult | null
  neighbourhood: null // placeholder for Phase 2; always null in MVP
  sunScout: SunScoutResult | null
  /** Geocoded subject-property coordinates — feeds the real MiniMap (and
   * SunScout's sun-path input). Optional: analyses stored before 2026-07-01
   * don't carry it; null when geocoding failed. */
  coordinates?: { lat: number; lng: number } | null
  /** Nearest schools per level from the schools table. Optional: analyses
   * stored before 2026-07-02 don't carry it; null until the EQAO/Fraser CSV
   * is loaded (empty table) or when geocoding failed. */
  schools?: SchoolsResult | null
}
