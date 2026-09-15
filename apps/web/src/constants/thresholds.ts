// Deal score brackets — spec Section 10
export const DEAL_SCORE = {
  STRONG: 80,
  GOOD: 65,
  CAUTION: 50,
  MARGINAL: 35,
  DO_NOT_BUY: 20,
} as const

// Flag confidence thresholds — spec Section 19
export const CONFIDENCE = {
  RED_FLAG_MIN: 85, // 85%+ → red flag, deducts from deal score
  AMBER_FLAG_MIN: 60, // 60–84% → amber soft warning, no score deduction
  // Below 60% → not shown
} as const

// Severe dealbreaker flag ids — must mirror the calc engine's _SEVERE_FLAGS
// (services/calc-engine/routers/analysis.py). Each has a deterministic regex
// floor so the set is extracted even when Haiku is unavailable.
export const SEVERE_FLAG_IDS: ReadonlySet<string> = new Set([
  'grow_op_history',
  'flooding_history',
  'illegal_unit_risk',
  'special_assessment_risk',
])

// Personal-buyer HomeScore risk mechanics. Ceilings are approved design values
// (2026-07-01) but unsourced — tracked in NIGHT_NOTES' unsourced ledger for SME
// calibration. Harsher than the investor 40/30/20/10 ladder because an
// owner-occupier lives in the property.
export const HOME_SCORE = {
  RISK_MAX: 10, // riskPts component maximum
  RED_FLAG_DEDUCTION: 5, // per standard (non-severe) red flag, mirrors investor −5
  SEVERE_CEILINGS: [34, 20, 10], // total capped by severe-flag count: 1 / 2 / 3+
  FLOOR: 5, // "always worth something" display floor
} as const

/**
 * SunScout building-obstruction coverage (spec §17 Phase 2).
 *
 * Share of nearby buildings that had a known height. Below INDICATIVE, the
 * obstruction result is labelled indicative rather than checked: the shade is
 * a floor computed from a minority of the skyline. 0.5 is a starting point —
 * the surroundings dataset has no ground truth to calibrate against yet.
 */
export const SUN_OBSTRUCTION_COVERAGE = {
  INDICATIVE: 0.5,
} as const

/**
 * Financing slider bounds on the investment report.
 *
 * MIN_DOWN_PAYMENT is 20% because a rental (non-owner-occupied) purchase is not
 * eligible for default (high-ratio / CMHC-insured) mortgage insurance in
 * Canada — the insurers' 1–4 unit rental programs start at 20% down — so any
 * scenario below it is a mortgage no lender writes. The slider used to start
 * at 5% (D-097).
 */
export const FINANCING_SLIDER = {
  MIN_DOWN_PAYMENT: 0.2,
  MAX_DOWN_PAYMENT: 0.5,
  DOWN_PAYMENT_STEP: 0.05,
} as const

/**
 * The same slider for a property the person already owns (D-108): equity is
 * whatever it is, from the engine's 5% floor to owned outright.
 */
export const EQUITY_SLIDER = {
  MIN: 0.05,
  MAX: 1,
  STEP: 0.05,
} as const

/** A contract mortgage rate the engine accepts, as a decimal (apps/api MORTGAGE_RATE_BOUNDS). */
export const MORTGAGE_RATE_BOUNDS = {
  MIN: 0.01,
  MAX: 0.25,
} as const

/**
 * A landlord's own property value (D-107) — the same bounds the API enforces
 * (OWNER_VALUE in apps/api), so the form can say so before the round trip.
 */
export const OWNER_VALUE = {
  MIN: 50_000,
  MAX: 50_000_000,
} as const
