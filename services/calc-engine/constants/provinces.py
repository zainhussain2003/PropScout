"""
Province-specific data: Ontario FSA prefixes and LTT brackets.
MVP covers Ontario only.
"""

# Ontario FSA prefixes — first letter of postal code
# K, L, M, N, P = Ontario
ONTARIO_FSA_PREFIXES: frozenset[str] = frozenset({'K', 'L', 'M', 'N', 'P'})


def is_ontario_postal_code(postal_code: str) -> bool:
    """
    Return True if the postal code belongs to Ontario.

    Args:
        postal_code: Canadian postal code (e.g. "L4J 7K1").

    Returns:
        True if the FSA prefix is one of K, L, M, N, P.
    """
    fsa = postal_code.strip().upper()[0] if postal_code.strip() else ''
    return fsa in ONTARIO_FSA_PREFIXES


# Ontario Land Transfer Tax brackets (provincial)
# Source: ontario.ca — updated May 2026
ONTARIO_LTT_BRACKETS: list[tuple[float, float]] = [
    (55_000,      0.005),
    (250_000,     0.010),
    (400_000,     0.015),
    (2_000_000,   0.020),
    (float('inf'), 0.025),
]

# Toronto Municipal Land Transfer Tax brackets (applies on top of provincial)
TORONTO_MLTT_BRACKETS: list[tuple[float, float]] = [
    (55_000,      0.005),
    (400_000,     0.010),
    (2_000_000,   0.020),
    (float('inf'), 0.025),
]
