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
  /** Annual property tax supplied to the calculator. */
  annualTaxesUsed?: number
  /** True when annualTaxesUsed is a conservative city-rate estimate. */
  annualTaxesEstimated?: boolean
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
  /**
   * Radius searched, in km, when the FSA itself had no comps and the search
   * widened geographically. Null when the comps are from this FSA.
   *
   * The report must disclose it: a median drawn from 10km away can cross into
   * another municipality's rental market, and presenting it as local would be
   * confidently wrong.
   */
  radiusKm?: number | null
}

export interface SunScoutResult {
  annualPeakSunHours: number
  summerDailyHours: number
  winterDailyHours: number
  seasonalGrid: { Dec: number; Mar: number; Jun: number; Sep: number }
  monthlyHours: number[] // 12 values, index 0=Jan, index 11=Dec (bedroom_main window)
  sunScore: number
  verdict: 'excellent' | 'good' | 'average' | 'below_average' | 'poor'
  /**
   * Optional throughout: analyses stored before 2026-09-06 predate obstruction
   * and carry none of these fields, so absent and false are both possible.
   *
   * Whether surrounding buildings were actually assessed (spec §17 Phase 2).
   * False means the sky was treated as open — either the lookup failed or the
   * area had no usable building heights. Distinct from "assessed and clear".
   */
  obstructionAssessed?: boolean
  /** Share of the sky dome unobstructed, 0–1. Null when not assessed. */
  obstructionOpenness?: number | null
  /** Footprints that carried a usable height. */
  obstructionBuildingsUsed?: number | null
  /** Footprints found but skipped for want of a height tag — the model's blind spot. */
  obstructionBuildingsUnknown?: number | null
  /** Annual direct-sun hours lost to neighbouring buildings vs an open sky. */
  hoursLostToBuildings?: number | null
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

/** One distance from the listing to a nearby amenity (Google Places). */
export interface NearbyDistance {
  key: string
  label: string
  distanceKm: number
  driveMin: number
}

/** Census stats for the listing's area (StatsCan). Null fields = no match/data. */
export interface NeighbourhoodStats {
  avgIncome: number | null // median household income (StatsCan census)
  popGrowth5y: number | null // 5-year population growth, decimal (0.08 = 8%)
  areaLabel: string // e.g. the FSA "L5A" the stats were matched on
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
  /** Nearest transit/grocery/highway/pharmacy distances (Google Places). */
  nearbyDistances?: NearbyDistance[] | null
  /** Census income + population growth for the listing's FSA (StatsCan). */
  neighbourhoodStats?: NeighbourhoodStats | null
  /**
   * Recent comparable sales within 1km (spec §7.3). Empty when the provider is
   * unconfigured or has no coverage — the report shows an honest empty state
   * rather than estimating a sale price.
   */
  comparableSales?: ComparableSale[]
  /**
   * True when the comps came from the provider's sample coverage area rather
   * than this property's neighbourhood (REPLIERS_SAMPLE_MODE). The report must
   * label them — they are real sales, but not local ones.
   */
  comparableSalesAreSample?: boolean
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

/**
 * One recent comparable sale near the subject property (spec §7.3).
 *
 * `sold` and `date` are pre-formatted for display; `soldPrice` and
 * `pricePerSqft` stay numeric so the FMV band can be derived from them.
 * `pricePerSqft` is null when the listing had no usable square footage — a comp
 * still worth showing, but not one that can inform a per-sqft band.
 */
export interface ComparableSale {
  addr: string
  /** e.g. "3 bed · 2 bath", or "—" when the feed omitted both. */
  beds: string
  sqft: number
  /** Formatted for display, e.g. "$705,000". */
  sold: string
  soldPrice: number
  /** e.g. "Mar 2026". */
  date: string
  pricePerSqft: number | null
}
