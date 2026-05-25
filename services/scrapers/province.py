"""
Province detection from Canadian postal codes.

The MVP covers Ontario only. Non-Ontario listings are gated at the
scraper level — analysis does not run. The frontend shows a waitlist
screen when province != 'ON'.

FSA (Forward Sortation Area) prefixes are the first letter of a postal code.
Source: Canada Post postal code reference — updated May 2026.
"""

# FSA prefix → two-letter province/territory code
_FSA_TO_PROVINCE: dict[str, str] = {
    # Ontario
    "K": "ON",
    "L": "ON",
    "M": "ON",
    "N": "ON",
    "P": "ON",
    # British Columbia
    "V": "BC",
    # Alberta
    "T": "AB",
    # Saskatchewan
    "S": "SK",
    # Manitoba
    "R": "MB",
    # Quebec
    "G": "QC",
    "H": "QC",
    "J": "QC",
    # Nova Scotia
    "B": "NS",
    # New Brunswick
    "E": "NB",
    # Prince Edward Island
    "C": "PE",
    # Newfoundland and Labrador
    "A": "NL",
    # Northwest Territories / Nunavut (shared prefix)
    "X": "NT",
    # Yukon
    "Y": "YT",
}

# Ontario FSA prefixes as a frozenset for O(1) lookup
_ONTARIO_FSA: frozenset[str] = frozenset(
    k for k, v in _FSA_TO_PROVINCE.items() if v == "ON"
)


def detect_province(postal_code: str) -> str | None:
    """
    Detect the province from a Canadian postal code FSA prefix.

    The FSA is the first character of the postal code. Only the first
    character is needed — the full postal code does not need to be valid.

    Args:
        postal_code: Canadian postal code, e.g. "L4J 7K1" or "M5V1A1".
                     May contain spaces. Case-insensitive.

    Returns:
        Two-letter province code (e.g. "ON", "BC") or None if the
        postal code is empty, too short, or the prefix is unrecognised.
    """
    if not postal_code:
        return None

    fsa = postal_code.strip().upper()
    if not fsa:
        return None

    return _FSA_TO_PROVINCE.get(fsa[0])


def is_ontario(postal_code: str) -> bool:
    """
    Return True if the postal code belongs to Ontario.

    This is the MVP gate — analysis only runs for Ontario properties.

    Args:
        postal_code: Canadian postal code (any format, case-insensitive).

    Returns:
        True if the FSA prefix maps to Ontario (K, L, M, N, P).
    """
    if not postal_code:
        return False

    fsa = postal_code.strip().upper()
    return bool(fsa) and fsa[0] in _ONTARIO_FSA


def province_gate_error(province: str | None) -> dict[str, str]:
    """
    Build the structured error payload returned when a listing is outside Ontario.

    The frontend uses this to show the waitlist screen.

    Args:
        province: Province code (e.g. "BC") or None if unknown.

    Returns:
        Dict with keys: error, code, province, message.
    """
    province_display = province or "Unknown province"
    return {
        "error": "true",
        "code": "PROVINCE_NOT_SUPPORTED",
        "province": province or "",
        "message": (
            f"PropScout currently covers Ontario only. "
            f"{province_display} support is coming — join the waitlist."
        ),
    }
