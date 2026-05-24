"""
Deterministic regex extraction rules — spec Section 19 (TEMPLATE CODE).
These run first before Claude Haiku extraction.
Regex rules never hallucinate. If unsure, don't flag.

Patterns and flag types will grow over time as more listing data is analysed.
Update the spec (Section 19) whenever patterns are added or changed.
"""

import re
from dataclasses import dataclass


@dataclass
class RegexFlag:
    """A flag detected by regex with its confidence score."""
    flag_id: str
    confidence: int     # 0–100 — regex matches are deterministic, usually 90–95
    evidence: str       # the matched text


# ── Flag patterns ──────────────────────────────────────────────────────────────
# Each entry: (flag_id, compiled_regex, confidence)
# Ordered from most specific (highest confidence) to most general.

FLAG_PATTERNS: list[tuple[str, re.Pattern[str], int]] = [
    # Tenanted properties
    (
        'tenanted',
        re.compile(r'\b(tenanted|tenant in place|currently rented|existing tenant)\b', re.IGNORECASE),
        92,
    ),

    # Short-term rental history
    (
        'str_history',
        re.compile(r'\b(airbnb|short.?term rental|str\b|vrbo|vacation rental)\b', re.IGNORECASE),
        90,
    ),

    # Basement unit
    (
        'basement_unit',
        re.compile(r'\b(basement (unit|suite|apartment)|in-law suite|secondary suite)\b', re.IGNORECASE),
        88,
    ),

    # Parking included
    (
        'parking_included',
        re.compile(r'\b(parking included|includes parking|one parking|1 parking|underground parking)\b', re.IGNORECASE),
        85,
    ),

    # Pet policy
    (
        'no_pets',
        re.compile(r'\b(no pets|pets not permitted|pet free)\b', re.IGNORECASE),
        92,
    ),
    (
        'pets_allowed',
        re.compile(r'\b(pets (welcome|allowed|ok|permitted)|pet friendly)\b', re.IGNORECASE),
        88,
    ),

    # Utilities
    (
        'utilities_included',
        re.compile(r'\b(all utilities included|heat and hydro included|utilities incl)\b', re.IGNORECASE),
        90,
    ),
    (
        'utilities_extra',
        re.compile(r'\b(heat extra|hydro extra|utilities extra|tenant pays utilities)\b', re.IGNORECASE),
        90,
    ),

    # Renovation / condition flags
    (
        'needs_work',
        re.compile(r'\b(as.?is|sold as.?is|handyman special|fixer.?upper|needs (tlc|work|updating|renovation))\b', re.IGNORECASE),
        85,
    ),
    (
        'recently_renovated',
        re.compile(r'\b(newly renovated|recently updated|gut renovation|brand new (kitchen|bath|floors))\b', re.IGNORECASE),
        82,
    ),
]


def extract_regex_flags(description: str) -> list[RegexFlag]:
    """
    Run all regex patterns against a listing description.

    Args:
        description: Raw listing description text.

    Returns:
        List of RegexFlag instances for all matched patterns.
    """
    flags: list[RegexFlag] = []

    for flag_id, pattern, confidence in FLAG_PATTERNS:
        match = pattern.search(description)
        if match:
            flags.append(RegexFlag(
                flag_id=flag_id,
                confidence=confidence,
                evidence=match.group(0),
            ))

    return flags
