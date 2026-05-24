"""
CMHC vacancy rate data service.
Used to refine the vacancy allowance for a specific postal code area.
Falls back to the default 5% if CMHC data is unavailable.
"""

from constants.rates import VACANCY_ALLOWANCE


async def get_vacancy_rate(postal_code: str) -> float:
    """
    Get the current vacancy rate for a given postal code area.

    Args:
        postal_code: Canadian postal code (e.g. "L4J 7K1").

    Returns:
        Vacancy rate as a decimal (e.g. 0.03 for 3%).
        Falls back to default VACANCY_ALLOWANCE (5%) if unavailable.
    """
    # TODO: implement CMHC data fetch
    return VACANCY_ALLOWANCE
