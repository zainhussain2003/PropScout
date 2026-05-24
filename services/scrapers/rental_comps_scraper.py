"""
Rental comparables scraper — runs nightly at 2am ET on Railway.
Collects recent rental listings for a given postal code and bed count.
Used to populate the rental comp estimates in the analysis reports.
"""

# TODO: Implement rental comps scraper.
# Must return: low, mid, high rent estimates + comp count for a given area.


async def scrape_rental_comps(
    postal_code: str,
    beds: int,
) -> dict[str, object] | None:
    """
    Scrape current rental listings near a postal code for a given bedroom count.

    Args:
        postal_code: Target postal code area.
        beds: Number of bedrooms to match.

    Returns:
        Dict with low, mid, high, comp_count, or None if scraping fails.
    """
    raise NotImplementedError("Rental comps scraper: not yet implemented")
