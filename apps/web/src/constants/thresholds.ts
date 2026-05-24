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
  RED_FLAG_MIN: 85,   // 85%+ → red flag, deducts from deal score
  AMBER_FLAG_MIN: 60, // 60–84% → amber soft warning, no score deduction
  // Below 60% → not shown
} as const
