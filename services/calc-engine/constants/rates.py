"""
Default financial rates and percentages.
All values are starting assumptions from the spec — see CLAUDE.md Section 11.
"""

# Vacancy allowance — used in NOI calculation
VACANCY_ALLOWANCE = 0.05        # 5%

# Management fee — toggled on/off by user
MANAGEMENT_FEE = 0.08           # 8% of gross rent

# Insurance rate — percentage of property value per year
INSURANCE_RATE = 0.0035         # 0.35%

# Maintenance reserve — percentage of property value per year, by age
MAINTENANCE_RESERVE_RATES = {
    'post_2010': 0.005,     # 0.5% — newer build
    '1980_2010': 0.010,     # 1.0% — mid-age
    'pre_1980':  0.015,     # 1.5% — older build
}

def get_maintenance_rate(year_built: int | None) -> float:
    """
    Return the appropriate maintenance reserve rate based on construction year.

    Args:
        year_built: Year the property was built, or None if unknown.

    Returns:
        Maintenance reserve rate as a decimal.
    """
    if year_built is None or year_built >= 2010:
        return MAINTENANCE_RESERVE_RATES['post_2010']
    if year_built >= 1980:
        return MAINTENANCE_RESERVE_RATES['1980_2010']
    return MAINTENANCE_RESERVE_RATES['pre_1980']
