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

// ── Investor report extended types ────────────────────────────────────────────

/**
 * Extended financing inputs including equity model and LTT fields.
 * This is the local UI state — richer than the FinancingInput API type.
 */
export interface FinancingInputs {
  downPaymentPct: number // e.g. 0.20 for 20%
  mortgageRate: number // e.g. 0.0479 for 4.79%
  amortizationYears: number // e.g. 25
  includeManagementFee: boolean
  isToronto: boolean // Toronto LTT stacking (doubles provincial)
  appreciationRate: number // e.g. 0.03 for 3% — equity projections only
  assumedIncome: number // household income for OSFI GDS calc, default 125000
}

/** Single bracket row in the Ontario LTT breakdown table. */
export interface LTTRow {
  band: string // e.g. '$0 – $55,000'
  rate: number // e.g. 0.005
  amount: number // taxable amount in this bracket
  ltt: number // tax owed in this bracket
}

/** Full LTT result including per-bracket breakdown. */
export interface LTTResult {
  rows: LTTRow[]
  provincial: number // provincial LTT total
  municipal: number // Toronto municipal LTT (0 if not Toronto)
  total: number // provincial + municipal
}

/** OSFI B-20 stress test result. */
export interface OSFIResult {
  qualifyingRate: number // max(contractRate + 0.02, 0.0525)
  qualifyingPmt: number // monthly payment at qualifying rate
  gds: number // gross debt service ratio
  pass: boolean // gds <= 0.44
  threshold: number // always 0.44
}

/** One data point in the 20-year equity build curve. */
export interface EquityDataPoint {
  year: number
  equity: number // current equity (appreciated value − mortgage remaining)
  propertyValue: number // appreciated property value
  remaining: number // remaining mortgage balance
  cashOnCash: number // (equity − downPayment) / totalCashInvested
}

/** Annual operating expense breakdown. */
export interface ExpenseBreakdown {
  taxes: number
  insurance: number
  maintenance: number
  vacancy: number
  condo: number
  management: number
  total: number
}

/**
 * Display-ready deal score data — extends the core DealScore with
 * the human-readable label, tagline, and tone needed by the UI.
 */
export interface DealScoreData {
  total: number
  verdict: DealVerdict
  label: string // e.g. 'Hard pass'
  tagline: string // e.g. 'Fails on multiple fundamentals.'
  tone: 'pass' | 'caution' | 'fail'
  breakdown: DealScoreBreakdown
  deductions: number // total risk-flag deductions (capped at 15)
}

/** Pin marker for the MiniMap component. */
export interface MapPin {
  lat: number
  lng: number
  label: string
}

/** Risk flag as used in the investor report UI. */
export interface InvestorRiskFlag {
  id: string
  tone: 'red' | 'amber' | 'green'
  label: string
  detail: string
  deduct: number // points deducted from deal score
}

/** Market data for a specific FSA. */
export interface MarketData {
  cmhcVacancy: number // e.g. 0.018 = 1.8%
  rentalDOM: number // avg days on market for rentals
  rentTrend: 'declining' | 'flat' | 'rising'
}

/**
 * Full listing data as displayed in the investor report.
 * Sourced from the scraper; falls back to demo data during development.
 */
export interface ListingData {
  id: string
  addressLine1: string
  addressLine2: string
  postal: string
  province: string
  isToronto: boolean
  propertyType: string
  beds: string
  baths: string
  sqft: number
  parking: string
  yearBuilt: number
  rentControl: boolean
  price: number
  annualTaxes: number
  condoFeeMonthly: number
  rentEstimate: number // mid rent estimate from comps
  rentLow: number
  rentHigh: number
  compCount: number
  compConfidence: 'low' | 'medium' | 'high'
  market: MarketData
  riskFlags: InvestorRiskFlag[]
  chips: string[] // display chips below photos
  photoUrls?: string[]
}

/**
 * Neighbourhood intelligence displayed in §08 of the investor report.
 * Sourced from Walk Score API + Stats Canada + MLS comps.
 */
export interface NeighbourhoodData {
  avgIncome: number
  popGrowth5y: number
  walkScore: number
  transitScore: number
  bikeScore: number
  buildingPermits: number // active permits in 1km radius
  appreciation5y: number // e.g. 0.276 = 27.6%
  appreciation10y: number
  ppsqftTrend: string // e.g. 'Up 8.2% YoY'
  comps: Array<{
    addr: string
    beds: string
    sqft: number
    sold: string // formatted, e.g. '$705,000'
    date: string // e.g. 'Mar 2026'
  }>
}

/**
 * Full enriched metrics for the investor report.
 * Extends the core InvestmentMetrics (from the API) with display-only extras
 * computed client-side from property + financing inputs.
 */
export interface ComputedInvestorMetrics extends InvestmentMetrics {
  expenses: ExpenseBreakdown
  ltt: LTTResult
  osfi: OSFIResult
  equityCurve: EquityDataPoint[]
  grossRentAnnual: number
  totalCashInvested: number
  principal: number
}

// ── Tenant report types ────────────────────────────────────────────────────────

/**
 * A single flag surfaced in the listing accuracy and listed-vs-reality sections.
 * tone 'good' is used for confirmed positives (e.g. "Utilities are clear").
 */
export interface TenantFlag {
  id?: string
  tone: 'red' | 'amber' | 'good'
  label: string
  detail: string
  /** Exact quote pulled from the listing description as evidence. */
  evidence?: string
  /** Suggested question to ask the landlord before signing. */
  ask?: string
}

/** Single amenity cell in the What's Included grid. */
export interface TenantAmenity {
  label: string
  /** 'incl' = included in rent · 'extra' = additional cost · 'unclear' = needs confirmation */
  status: 'incl' | 'extra' | 'unclear'
  /** Short note displayed below the label, e.g. "~$80–110/mo" */
  note?: string
}

export type SchoolBoard = 'public' | 'catholic' | 'french'
export type SchoolQuality = 'above' | 'avg' | 'below'

/** One school card in the TenantSchoolsSection. */
export interface TenantSchool {
  board: SchoolBoard
  boardLabel: string
  name: string
  grades: string
  distance: string
  walk: string
  quality: SchoolQuality
  inCatchment: boolean
}

/** Three-level school breakdown passed to TenantSchoolsSection. */
export interface TenantSchools {
  elementary: TenantSchool[]
  middle: TenantSchool[]
  high: TenantSchool[]
}

/** Walk / Transit / Bike score tile. */
export interface TenantMobilityScore {
  label: string
  val: number
  sub: string
  tone: 'pass' | 'caution'
}

/** One row in the "From this address" distance table. */
export interface TenantDistanceRow {
  k: string
  v: string
  unit: string
  tone: 'pass' | 'caution'
}

/** One factor row in the negotiation leverage card. */
export interface TenantLeverageRow {
  k: string
  v: string
  tone: 'pass' | 'caution'
}

/** One line in the monthly cost breakdown table. */
export interface TenantCostLine {
  k: string
  asking: number
  target: number
  included: boolean | 'maybe'
  note?: string
}

/** One item in the Listed vs Reality side-by-side comparison. */
export interface TenantRealityItem {
  txt: string
  tone: 'ok' | 'bad'
}

/** One confirm-before-signing checklist item. */
export interface TenantChecklistItem {
  label: string
  critical: boolean
}

/**
 * Tenant-specific listing data.
 * Separate from ListingData (investor) — rental listings have different fields.
 */
export interface TenantListingData {
  id: string
  addressLine1: string
  addressLine2: string
  asking: number
  beds: string
  baths: string
  sqft: string
  floor: string
  utilities: string
  scoreNumber: number
  scoreTone: 'pass' | 'caution' | 'fail'
  verdictLabel: string
  verdictSub: string
  targetLow: number
  targetHigh: number
  chips: string[]
  photoUrls?: string[]
}
