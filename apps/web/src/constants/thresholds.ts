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
