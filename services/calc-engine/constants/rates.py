"""
Default financial rates and percentages.
All values are starting assumptions from the spec — see CLAUDE.md Section 11.

Every magic number that influences a calculation lives here.
Update this file (not the calculation modules) when assumptions change.
"""

# ── Mortgage / OSFI ────────────────────────────────────────────────────────────

# OSFI B-20 minimum qualifying rate — update when OSFI changes the floor.
# History: raised from 4.79% to 5.25% in June 2021.
OSFI_FLOOR_RATE: float = 0.0525

# Fallback mortgage rate used when the Bank of Canada API is unavailable and
# no cached value exists. Represents a mid-cycle 5-year fixed rate.
MORTGAGE_RATE_FALLBACK: float = 0.0479  # 4.79%

# Bank of Canada Valet API — group endpoint returning today's key rates.
BOC_VALET_URL: str = (
    "https://www.bankofcanada.ca/valet/observations/group/BofC-today/json"
)

# The Valet API series ID for the prime business loan rate.
# Prime drives variable mortgage rates; fixed rates track the 5-yr GoC bond.
# We use prime as a starting-point default — users should override with their
# actual quoted rate.
BOC_PRIME_SERIES: str = "PRIME"

# How long a cached rate is considered fresh before a refetch is attempted.
BOC_CACHE_TTL_DAYS: int = 7

# ── Operating expense rates ────────────────────────────────────────────────────

# Vacancy allowance — fraction of gross rent lost to vacancy and turnover.
# CMHC national average is ~3%; 5% includes turnover time between tenants.
VACANCY_ALLOWANCE: float = 0.05  # 5%

# Management fee — fraction of gross rent charged by a property manager.
# Ontario range: 8–12%. Set to 0 when self-managing (toggle in UI).
MANAGEMENT_FEE: float = 0.08  # 8%

# Insurance rate — annual landlord insurance as a fraction of property value.
# Blended estimate: ~$1,500–$2,500/yr on a $500K–$750K property.
# Get an actual quote; this is an input default only.
INSURANCE_RATE: float = 0.0035  # 0.35%

# Maintenance reserve — annual reserve as a fraction of property value, by build year.
# Covers in-unit repairs only for condos (building structure is in the condo fee).
MAINTENANCE_RESERVE_RATES: dict[str, float] = {
    "post_2010": 0.005,  # 0.5% — newer build
    "1980_2010": 0.010,  # 1.0% — mid-age
    "pre_1980": 0.015,  # 1.5% — older build
}

# ── Closing cost flat estimates ────────────────────────────────────────────────

# Legal fees: $1,500–$2,500 typical in Ontario. Higher for Toronto or complex deals.
LEGAL_FEES: float = 1_500.0

# Title insurance: protects against title defects, encroachments, fraud.
TITLE_INSURANCE: float = 300.0

# Home inspection: standard physical inspection. For condos, buyers often
# do a status certificate review (~$100–$200) instead — this is the higher estimate.
HOME_INSPECTION: float = 600.0


def get_maintenance_rate(year_built: int | None) -> float:
    """
    Return the appropriate maintenance reserve rate based on construction year.

    Args:
        year_built: Year the property was built, or None if unknown.
                    None defaults to post_2010 (conservative unknown assumption).

    Returns:
        Maintenance reserve rate as a decimal.
    """
    if year_built is None or year_built >= 2010:
        return MAINTENANCE_RESERVE_RATES["post_2010"]
    if year_built >= 1980:
        return MAINTENANCE_RESERVE_RATES["1980_2010"]
    return MAINTENANCE_RESERVE_RATES["pre_1980"]
