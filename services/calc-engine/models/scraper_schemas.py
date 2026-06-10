"""
Pydantic models for the scraper endpoint.
Kept separate from schemas.py (calc engine I/O) to prevent coupling.
"""

from pydantic import BaseModel


class ScrapeRequest(BaseModel):
    """Request body for the POST /scrape endpoint."""

    url: str


class ScrapedListing(BaseModel):
    """
    Structured listing data extracted from a Realtor.ca URL.

    All fields that may be absent from the listing carry a companion _known flag
    so the Fastify API and frontend know whether to show the value or prompt the
    user to enter it manually.
    """

    address: str
    price: int
    annual_taxes: int
    tax_known: bool
    condo_fee_monthly: int | None
    condo_fee_known: bool
    beds: int
    baths: float
    sqft: int | None
    sqft_known: bool
    year_built: int | None
    year_built_known: bool
    province: str
    property_type: str  # "condo" | "house" | "townhouse" | "semi"
    is_toronto: bool
    listing_type: str  # "for_sale" | "for_rent"


class ScrapeResponse(BaseModel):
    """
    Response body from the POST /scrape endpoint.

    On success: listing is populated, error is None.
    On province gate: listing is None, error == "province_not_supported",
                       province is the detected province code.
    On scraper failure: listing is None, error == "scrape_failed".
    """

    listing: ScrapedListing | None
    error: str | None = None
    province: str | None = None  # only set when error == "province_not_supported"
