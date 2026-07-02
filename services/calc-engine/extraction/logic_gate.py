"""
Logic gate — merges regex and Haiku extraction results.
Applies confidence thresholds, then the per-mode flag severity matrix,
before flags reach the deal score. Spec Section 19 + Section 10a.
"""

from dataclasses import dataclass
from .regex_rules import RegexFlag
from constants.thresholds import (
    CONFIDENCE_RED_FLAG_MIN,
    CONFIDENCE_AMBER_FLAG_MIN,
    INFO_FLAG_IDS,
    FLAG_ID_ALIASES,
)
from constants.flag_matrix import (
    get_flag_tier,
    TIER_SEVERE,
    TIER_RED,
    TIER_AMBER,
    TIER_INFO,
    TIER_HIDDEN,
)


@dataclass
class MergedFlag:
    """A validated flag that has passed the confidence threshold."""

    flag_id: str
    severity: str  # 'red' | 'amber' — display tone
    confidence: int
    evidence: str | None
    source: str  # 'regex' | 'haiku' | 'both' | 'structural'
    # Per-mode severity tier from the flag matrix, confidence-capped:
    # 'severe' gates the score ceiling, 'red' deducts, 'amber' displays only.
    tier: str = TIER_AMBER


def merge_flags(
    regex_flags: list[RegexFlag],
    haiku_flags: dict[str, object],
    mode: str = "investor",
) -> list[MergedFlag]:
    """
    Merge regex and Haiku extraction results into validated flags.

    Rules:
    - 85%+ confidence → red-eligible; 60–84% → amber only; below 60% → discarded.
    - Haiku entries only count when value is True — confidence measures how
      sure the model is of its answer, and a confident "not detected" must
      never fire a flag (a live 2nd-floor unit once got is_basement_unit:red).
    - INFO_FLAG_IDS (amenities / lease facts) are not risks — filtered out.
    - FLAG_ID_ALIASES collapse duplicate ids for the same fact.
    - The flag severity matrix (docs/FLAG_SEVERITY_MATRIX.md) then maps each
      flag to its tier FOR THIS MODE: severe / red / amber / info / hidden.
      Confidence caps the tier — a 60–84% flag renders at most amber even in
      a severe cell. info/hidden cells drop the flag from the risk output.
      Unlisted ids default to amber in every mode (never deduct).

    If both regex and Haiku detect the same flag, use the higher confidence.

    Args:
        regex_flags: Output from regex_rules.extract_regex_flags().
        haiku_flags: Output from haiku_extraction.extract_flags_with_haiku().
        mode: Report mode ('investor' | 'personal' | 'tenant' | 'landlord').

    Returns:
        List of MergedFlag instances that passed both gates, with their
        mode-specific tier set.
    """
    combined: dict[str, dict[str, object]] = {}

    # Seed with regex results (a regex flag only exists when its pattern matched)
    for flag in regex_flags:
        flag_id = FLAG_ID_ALIASES.get(flag.flag_id, flag.flag_id)
        combined[flag_id] = {
            "confidence": flag.confidence,
            "evidence": flag.evidence,
            "source": "regex",
        }

    # Merge Haiku results — take highest confidence if duplicate
    for raw_id, data in haiku_flags.items():
        if not isinstance(data, dict):
            continue
        if data.get("value") is not True:
            continue  # confidence describes the answer; False means NOT detected
        flag_id = FLAG_ID_ALIASES.get(raw_id, raw_id)
        haiku_confidence = int(data.get("confidence", 0))
        if flag_id in combined:
            if haiku_confidence > int(combined[flag_id]["confidence"]):
                combined[flag_id]["confidence"] = haiku_confidence
                combined[flag_id]["evidence"] = data.get("evidence")
            combined[flag_id]["source"] = "both"
        else:
            combined[flag_id] = {
                "confidence": haiku_confidence,
                "evidence": data.get("evidence"),
                "source": "haiku",
            }

    # Drop amenity / lease-info facts — they are not risks and must never
    # render as red/amber rows or deduct from the deal score. (Ids the matrix
    # tiers as non-info in some mode — e.g. no_pets, amber for tenants — are
    # NOT in this set; the matrix decides for them.)
    for info_id in INFO_FLAG_IDS:
        combined.pop(info_id, None)

    # Apply confidence thresholds, then the per-mode severity matrix
    merged: list[MergedFlag] = []
    for flag_id, data in combined.items():
        confidence = int(data["confidence"])
        if confidence >= CONFIDENCE_RED_FLAG_MIN:
            red_eligible = True
        elif confidence >= CONFIDENCE_AMBER_FLAG_MIN:
            red_eligible = False
        else:
            continue  # below threshold — discard

        matrix_tier = get_flag_tier(flag_id, mode)
        if matrix_tier in (TIER_INFO, TIER_HIDDEN):
            continue  # not a risk in this mode

        # Confidence caps the tier: only red-eligible flags may reach red/severe
        if matrix_tier == TIER_SEVERE:
            tier = TIER_SEVERE if red_eligible else TIER_AMBER
        elif matrix_tier == TIER_RED:
            tier = TIER_RED if red_eligible else TIER_AMBER
        else:
            tier = TIER_AMBER

        merged.append(
            MergedFlag(
                flag_id=flag_id,
                severity="red" if tier in (TIER_SEVERE, TIER_RED) else "amber",
                confidence=confidence,
                evidence=str(data["evidence"]) if data.get("evidence") else None,
                source=str(data["source"]),
                tier=tier,
            )
        )

    return merged
