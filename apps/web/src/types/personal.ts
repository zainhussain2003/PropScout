// Personal buyer report types
// Used by: PersonalBuyerPage, personalBuyerData, personal components

// ── Property ──────────────────────────────────────────────────────────────────

export interface PersonalUtilities {
  hydro: number
  gas: number
  water: number
  internet: number
}

export interface PersonalFMV {
  low: number
  mid: number
  high: number
  /** Asking price minus mid, in dollars (negative = under FMV). */
  askingVsMid: number
}

export interface PersonalProperty {
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
  lotSize: string
  price: number
  daysOnMarket: number
  priceChange: { abs: number; direction: 'up' | 'down' | null }
  // Carrying-cost inputs
  annualTaxes: number
  condoFeeMonthly: number
  utilityEstMonthly: PersonalUtilities
  insuranceMonthlyEst: number
  chips: string[]
  fmv: PersonalFMV
  // Mortgage defaults for true-cost calc
  defaultDownPct: number
  defaultRate: number
  defaultAmort: number
}

// ── Schools ───────────────────────────────────────────────────────────────────

export interface PersonalSchool {
  name: string
  /** e.g. 'HDSB · public', 'HCDSB · catholic' */
  board: string
  distance: string
  driveTime: string
  eqao: number // 0–10
  fraser: number | null // 0–100 percentile · null when Fraser hasn't loaded for this school
  inCatchment: boolean
  grades: string // e.g. 'JK–8', '9–12'
  gradRate?: number // 0–1, for high schools
}

export interface PersonalSchools {
  elementary: PersonalSchool[]
  middle: PersonalSchool[]
  high: PersonalSchool[]
}

// ── Comparable sales ──────────────────────────────────────────────────────────

export interface PersonalComp {
  addr: string
  beds: string
  baths: string
  sqft: number
  sold: number
  soldDate: string // e.g. 'Apr 2026'
  dom: number
  ppsqft: number
  distance: string // e.g. '0.05 km'
}

// ── Neighbourhood ─────────────────────────────────────────────────────────────

export interface PersonalDistanceRow {
  k: string
  v: string
  unit: string
  tone: 'pass' | 'caution'
}

export interface PersonalNeighbourhood {
  walkScore: number
  transitScore: number
  bikeScore: number
  walkSub: string
  transitSub: string
  bikeSub: string
  avgIncome: number
  popGrowth5y: number
  ppsqftTrend: string
  appreciation5y: number
  appreciation10y: number
  buildingPermits: number
  distances: PersonalDistanceRow[]
}

// ── Monthly cost ──────────────────────────────────────────────────────────────

export interface PersonalMonthlyCost {
  mortgage: number
  tax: number
  condo: number
  insurance: number
  utilities: PersonalUtilities & { total: number }
  maintenance: number
  total: number
  /** Mortgage principal */
  principal: number
}

// ── Home score ────────────────────────────────────────────────────────────────

export interface HomeScoreComponents {
  pricing: number // /25
  schoolPts: number // /20
  lightPts: number // /15
  walkPts: number // /15
  lotPts: number // /15
  riskPts: number // /10
}

export interface HomeScoreVerdict {
  label: string
  tone: 'pass' | 'caution' | 'fail'
  tagline: string
}

export interface HomeScore {
  components: HomeScoreComponents
  componentMaxes: HomeScoreComponents
  total: number
  verdict: HomeScoreVerdict
  avgEqao: number
  /** (asking − mid) / mid — negative means under FMV */
  askVsMid: number
}
