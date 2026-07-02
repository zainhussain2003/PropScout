"""
Confidence thresholds and deal score brackets.
All magic numbers live here — never inline in calculation functions.
"""

# Flag confidence thresholds — spec Section 19
CONFIDENCE_RED_FLAG_MIN = 85  # 85%+ → red flag, deducts from deal score
CONFIDENCE_AMBER_FLAG_MIN = 60  # 60–84% → amber soft warning, no score deduction
# Below 60% → not shown

# Deal score brackets — spec Section 10
DEAL_SCORE_STRONG = 80
DEAL_SCORE_GOOD = 65
DEAL_SCORE_CAUTION = 50
DEAL_SCORE_MARGINAL = 35
DEAL_SCORE_DO_NOT_BUY = 20

# Flag polarity — spec Section 19 (found in live E2E 2026-07-01).
# The extractors detect both RISKS and neutral amenity/lease-info facts. Only
# risks may become red/amber and deduct from the deal score; info facts are
# filtered out of the risk output (they'll feed an amenities panel later).
# Without this, "all utilities included" fired as a −5 red flag.
INFO_FLAG_IDS: frozenset[str] = frozenset(
    {
        "parking_included",
        "utilities_included",
        "utilities_extra",
        "pets_allowed",
        "no_pets",
        "furnished",
        "den_present",
        "no_smoking",
        "short_term_ok",
        "new_construction",
        "recently_renovated",
    }
)

# Duplicate flag ids that describe the same fact — normalised at merge time so
# a listing never shows two rows for one issue (seen live: is_basement_unit +
# basement_unit both firing on the same unit).
FLAG_ID_ALIASES: dict[str, str] = {
    "is_basement_unit": "basement_unit",
}
