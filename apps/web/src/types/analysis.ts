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
  total: number // 0–95 raw gated score (verdict derives from this)
  displayTotal: number // 0–100 floored + normalised for the gauge
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
  /**
   * Whether the 8% management fee is inside `noi`. The report recomputes its
   * expense table in the browser, so without this it could show a management
   * row that NOI does not include — the expense breakdown then cannot be
   * reconciled with the NOI printed beside it (audit R-01).
   *
   * Optional: analyses saved before this shipped do not carry it, and absent
   * reads as false, which matches the engine's default.
   */
  managementFeeIncluded?: boolean
  closingCostsTotal: number
  lttProvincial: number
  lttMunicipal: number // Toronto only
  /** Effective annual tax used by the backend; optional on older saved reports. */
  annualTaxesUsed?: number
  /** Whether annualTaxesUsed came from the city-rate fallback. */
  annualTaxesEstimated?: boolean
  /**
   * The monthly rent the engine actually scored with (D-101). With comps it
   * is the comps mid; without, the listing's own rent or the price-based
   * proxy. Optional on analyses saved before this shipped.
   */
  rentUsedMonthly?: number
  /** True when rentUsedMonthly is the ~6% gross-yield proxy — no comps, no listed rent. */
  rentIsProxy?: boolean

  // Sanity
  hasSanityWarnings: boolean
}

export interface WalkScoreResult {
  walk: number
  transit: number | null
  bike: number | null
  description: string
  /** ISO time the scores were fetched; absent on older analyses. */
  fetchedAt?: string
}

export type FlagSeverity = 'red' | 'amber'

export interface RiskFlag {
  id: string
  severity: FlagSeverity
  /** Per-mode severity tier from the flag matrix (docs/FLAG_SEVERITY_MATRIX.md).
   * Optional: analyses stored before the matrix shipped don't carry it. */
  tier?: 'severe' | 'red' | 'amber'
  label: string
  evidence: string | null // quote from listing description
  confidence: number // 0–100
}

/**
 * Controls for dismissing/restoring risk flags within a report.
 * Threaded from the page (which owns the useFlagOverrides hook) down to the
 * RiskRow renderers so flags can be dismissed inline.
 */
export interface FlagOverrideControls {
  /** Set of flag IDs the user has dismissed for this analysis. */
  overrides: Set<string>
  /** True when a live analysis token exists — show the Dismiss/Restore button. */
  canOverride: boolean
  /** Toggle dismissal for a flag (dismiss if active, restore if already dismissed). */
  onToggle: (flagId: string) => void
}

/**
 * One comparable rental behind the rent band, sanitised for the report
 * (D-099): no address, no URL — the FSA, the source, the size and the rent are
 * what a reader needs to judge the band; the listing itself is the source
 * site's to publish.
 */
export interface CompRow {
  rentMonthly: number
  beds: number | null
  sqft: number | null
  /** Forward sortation area (first three characters of the postal code). */
  fsa: string | null
  source: 'rentals_ca' | 'kijiji' | 'padmapper' | string
  /** ISO date the row was last seen by the nightly scraper. */
  seenAt: string | null
  /** Straight-line km from the subject; null on the same-FSA path (no subject coords used). */
  distanceKm: number | null
}

export interface RentalEstimate {
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
  postalCode: string
  /**
   * Radius searched, in km, when this FSA had no comps and the search widened
   * geographically. Null or absent when the comps are from this FSA.
   *
   * Shown in the report: a median drawn from 10km away can cross into another
   * municipality's rental market, and presenting it as local would be wrong.
   */
  radiusKm?: number | null
  /** Individual comps behind the band (D-099); absent on fixtures and older analyses. */
  rows?: CompRow[]
}

export interface SunScoutResult {
  /**
   * Facade bearing the figures were computed for, degrees (180 = south). Absent
   * on an analysis that never had the facade set → the pipeline's south
   * assumption (D-098).
   */
  facadeBearing?: number
  /** True once the user chose the facade; the figures are then an input, not an assumption. */
  facadeConfirmed?: boolean
  annualPeakSunHours: number
  summerDailyHours: number
  winterDailyHours: number
  seasonalGrid: { Dec: number; Mar: number; Jun: number; Sep: number }
  monthlyHours: number[] // 12 values, index 0=Jan, index 11=Dec (bedroom_main window)
  sunScore: number
  verdict: 'excellent' | 'good' | 'average' | 'below_average' | 'poor'
  /**
   * Building-obstruction results (spec §17 Phase 2). All optional: analyses
   * stored before 2026-09-06 predate the feature, and `false` ("we checked, the
   * sky is open") is a different claim from absent ("we did not check").
   */
  obstructionAssessed?: boolean
  obstructionOpenness?: number | null
  obstructionBuildingsUsed?: number | null
  obstructionBuildingsUnknown?: number | null
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
  /** School coordinates (public data) — what the walk time is routed to. */
  lat?: number | null
  lng?: number | null
  /** Walking minutes on the footpath network (Mapbox Directions); null/absent when not routed (D-100). */
  walkMin?: number | null
}

/**
 * Nearest schools per level (max 3 each). Distance-ranked only — attendance
 * boundaries are NOT ingested, so nothing here may render as "in catchment".
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
  /** Walking minutes on the footpath network; null/absent when not routed (D-096). */
  walkMin?: number | null
  /** True when the times are routed (Mapbox Directions), not a straight-line formula. */
  routed?: boolean
}

/** Census stats for the listing's area (StatsCan). Null fields = no match/data. */
export interface NeighbourhoodStats {
  avgIncome: number | null
  popGrowth5y: number | null
  areaLabel: string
}

/**
 * Break-even economics for one hold period, from the calc engine
 * (`calculations/hold_case.py`).
 *
 * `breakEvenAnnualRate` is the annual price growth required to return every
 * dollar the hold consumes — down payment, purchase closing costs and every
 * monthly shortfall — after selling costs and discharging the mortgage. It is
 * NOT a return: at this rate the buyer gets their money back and nothing more,
 * and the model credits no return on the cash while it is tied up.
 *
 * Held at today's rent and costs: no rent growth, expense growth, vacancy,
 * capital work or renewal-rate shock. Report it as arithmetic, never a forecast.
 */
export interface HoldCaseRow {
  /** Hold period in years — 5, 10 and 20, matching the equity chart. */
  year: number
  /** Down payment plus purchase closing costs. */
  cashInvested: number
  /** Total shortfall funded over the hold; 0 when cash flow is not negative. */
  cumulativeContribution: number
  /** cashInvested + cumulativeContribution. */
  totalCashIn: number
  mortgageBalance: number
  principalRepaid: number
  /** Sale price that returns totalCashIn exactly. */
  breakEvenSalePrice: number
  /** Required annual growth as a decimal (0.042 = 4.2%); may be negative. */
  breakEvenAnnualRate: number
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
  walkScore: WalkScoreResult | null
  neighbourhood: NeighbourhoodData | null
  /** Nearest transit/grocery/highway/pharmacy distances (Google Places). */
  nearbyDistances?: NearbyDistance[] | null
  /** Census income + population growth for the listing's FSA (StatsCan). */
  neighbourhoodStats?: NeighbourhoodStats | null
  /** Recent comparable sales within 1km (spec §7.3); empty when unavailable. */
  comparableSales?: Array<{
    addr: string
    beds: string
    sqft: number
    sold: string
    soldPrice: number
    date: string
    pricePerSqft: number | null
  }>
  /**
   * True when those comps came from the provider's sample coverage rather than
   * this property's area — the report labels them instead of presenting them as
   * local comparables.
   */
  comparableSalesAreSample?: boolean
  hasSanityWarnings: boolean
  sunScout: SunScoutResult | null
  /**
   * Break-even appreciation per hold period. Optional: analyses stored before
   * this shipped don't carry it; null when the calc engine did not return it.
   */
  holdCase?: HoldCaseRow[] | null
  /** Geocoded subject-property coordinates — enables the real MiniMap.
   * Optional: analyses stored before 2026-07-01 don't carry it; null when
   * geocoding failed. */
  coordinates?: { lat: number; lng: number } | null
  /** Nearest schools per level. Optional: analyses stored before 2026-07-02
   * don't carry it; null until the schools CSV is loaded. */
  schools?: SchoolsResult | null
  /**
   * Every modelled number behind the report with its source, date and method
   * (D-088). Optional: analyses stored before 2026-09-13 don't carry it.
   */
  assumptions?: AssumptionEntry[] | null
  /** Outcome of the description scan (D-090). Optional: older analyses don't carry it. */
  extractionStatus?: ExtractionStatus | null
}

/**
 * How the listing-description scan went (D-090).
 *   ok      — regex + Haiku both ran (an empty flag list is a clean scan)
 *   partial — regex ran; the Haiku read failed, so only pattern flags exist
 *   failed  — the pipeline raised; nothing was read
 *   no_text — there was no description to scan
 */
export type ExtractionStatus = 'ok' | 'partial' | 'failed' | 'no_text'

// ── Assumption ledger (D-088) ─────────────────────────────────────────────────

/**
 * Where a number the report relies on came from. Mirrors the API type.
 *   observed  — from the listing or the user
 *   published — a named third-party source with a date
 *   estimate  — a stated PropScout formula over other inputs
 *   default   — a starting constant with no external source behind it
 */
export type AssumptionBasis = 'observed' | 'published' | 'estimate' | 'default'

export interface AssumptionEntry {
  key: string
  label: string
  value: string
  basis: AssumptionBasis
  source: string
  asOf: string | null
  method: string
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
  isToronto: boolean // adds Toronto municipal LTT using its own brackets
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
  total: number // 0–95 raw gated score (label/tone derive from this)
  displayTotal: number // 0–100 floored + normalised — the number the gauge shows
  verdict: DealVerdict
  label: string // e.g. 'Hard pass'
  tagline: string // e.g. 'Fails on multiple fundamentals.'
  tone: 'pass' | 'caution' | 'fail'
  breakdown: DealScoreBreakdown
  deductions: number // total risk-flag deductions (capped at 15)
  /** True when DOM / rent trend were measured or scored 0 (D-105) — no assumed-points note. */
  demandMeasured?: boolean
}

/** Presentation of a component on the common weighted-points scale. */
export interface ScoreBarData {
  label: string
  value: number | null
  max: number
  trackPercent: number
  fillPercent: number
  /** A caveat about where the points came from, shown under the bar. */
  note?: string
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
  /** False when the listing carried no build year — yearBuilt is then an
   * internal maintenance-bucket fallback and must not render as a fact. */
  yearBuiltKnown?: boolean
  rentControl: boolean
  price: number
  annualTaxes: number
  /** False when annualTaxes is a conservative estimate rather than a listing fact. */
  annualTaxesKnown?: boolean
  condoFeeMonthly: number
  rentEstimate: number // mid rent estimate from comps, else the rent the engine scored with
  /** The listing's own asking rent on a for-rent listing; null/absent on a sale (D-104). */
  askingRent?: number | null
  /** True when rentEstimate is the price-based proxy — no comps, no listed rent (D-101). */
  rentIsProxy?: boolean
  rentLow: number
  rentHigh: number
  compCount: number
  compConfidence: 'low' | 'medium' | 'high'
  market: MarketData
  riskFlags: InvestorRiskFlag[]
  /**
   * Whether the source supplied listing text at all. An address-entered
   * property has none, and "no risk language was found in the listing
   * description" would then describe a scan that never happened (audit
   * counter-review: missing description, extraction failure and a clean
   * result must not share one sentence). Undefined = unknown → treated as
   * scanned, for older callers.
   */
  hasDescription?: boolean
  /**
   * How the scan went (D-090). Undefined on fixtures and older analyses →
   * treated as 'ok' so a saved report keeps reading as it did.
   */
  extractionStatus?: ExtractionStatus | null
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
  /** ISO time the Walk Score call was made; null on fixtures and older analyses. */
  walkScoreAsOf?: string | null
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
  /**
   * Break-even appreciation recomputed from the current slider state, so it
   * always describes the same scenario as the cash flow shown beside it.
   * Mirrors the calc engine's `hold_case.py`; parity is pinned by test.
   */
  holdCase: HoldCaseRow[]
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
  /** EQAO composite score (0–100, % meeting standard); null when not loaded. */
  eqao: number | null
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
  /**
   * When true, the numeric tenant score gauge + verdict are hidden in the hero.
   * The current tenant score is the investment deal score, which craters to a
   * misleading "Hard pass" when the for-rent valuation falls back to proxies
   * because there are no comparable rentals for the area. In that case we show
   * an honest "can't assess rent" state instead of a low number. See the
   * NIGHT_NOTES follow-up on redesigning the tenant score entirely.
   */
  scoreSuppressed: boolean
  targetLow: number
  targetHigh: number
  chips: string[]
  photoUrls?: string[]
  /** ISO time the analysis was produced; absent on the demo fixture. */
  analyzedAt?: string
}
