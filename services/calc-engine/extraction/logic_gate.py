"""
Logic gate — merges regex and Haiku extraction results.
Applies confidence thresholds before flags reach the deal score.
Spec Section 19.
"""

from dataclasses import dataclass
from .regex_rules import RegexFlag
from ..constants.thresholds import CONFIDENCE_RED_FLAG_MIN, CONFIDENCE_AMBER_FLAG_MIN


@dataclass
class MergedFlag:
    """A validated flag that has passed the confidence threshold."""
    flag_id: str
    severity: str           # 'red' | 'amber'
    confidence: int
    evidence: str | None
    source: str             # 'regex' | 'haiku' | 'both'


def merge_flags(
    regex_flags: list[RegexFlag],
    haiku_flags: dict[str, object],
) -> list[MergedFlag]:
    """
    Merge regex and Haiku extraction results into validated flags.

    Rules:
    - 85%+ confidence → red flag (deducts from deal score)
    - 60–84% confidence → amber soft warning (no score deduction)
    - Below 60% → discarded

    If both regex and Haiku detect the same flag, use the higher confidence.

    Args:
        regex_flags: Output from regex_rules.extract_regex_flags().
        haiku_flags: Output from haiku_extraction.extract_flags_with_haiku().

    Returns:
        List of MergedFlag instances that passed the confidence threshold.
    """
    combined: dict[str, dict[str, object]] = {}

    # Seed with regex results
    for flag in regex_flags:
        combined[flag.flag_id] = {
            'confidence': flag.confidence,
            'evidence': flag.evidence,
            'source': 'regex',
        }

    # Merge Haiku results — take highest confidence if duplicate
    for flag_id, data in haiku_flags.items():
        if not isinstance(data, dict):
            continue
        haiku_confidence = int(data.get('confidence', 0))
        if flag_id in combined:
            if haiku_confidence > int(combined[flag_id]['confidence']):
                combined[flag_id]['confidence'] = haiku_confidence
                combined[flag_id]['evidence'] = data.get('evidence')
            combined[flag_id]['source'] = 'both'
        else:
            combined[flag_id] = {
                'confidence': haiku_confidence,
                'evidence': data.get('evidence'),
                'source': 'haiku',
            }

    # Apply thresholds
    merged: list[MergedFlag] = []
    for flag_id, data in combined.items():
        confidence = int(data['confidence'])
        if confidence >= CONFIDENCE_RED_FLAG_MIN:
            severity = 'red'
        elif confidence >= CONFIDENCE_AMBER_FLAG_MIN:
            severity = 'amber'
        else:
            continue  # below threshold — discard

        merged.append(MergedFlag(
            flag_id=flag_id,
            severity=severity,
            confidence=confidence,
            evidence=str(data['evidence']) if data.get('evidence') else None,
            source=str(data['source']),
        ))

    return merged
