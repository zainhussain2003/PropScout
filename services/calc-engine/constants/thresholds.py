"""
Confidence thresholds and deal score brackets.
All magic numbers live here — never inline in calculation functions.
"""

# Flag confidence thresholds — spec Section 19
CONFIDENCE_RED_FLAG_MIN = 85    # 85%+ → red flag, deducts from deal score
CONFIDENCE_AMBER_FLAG_MIN = 60  # 60–84% → amber soft warning, no score deduction
# Below 60% → not shown

# Deal score brackets — spec Section 10
DEAL_SCORE_STRONG = 80
DEAL_SCORE_GOOD = 65
DEAL_SCORE_CAUTION = 50
DEAL_SCORE_MARGINAL = 35
DEAL_SCORE_DO_NOT_BUY = 20
