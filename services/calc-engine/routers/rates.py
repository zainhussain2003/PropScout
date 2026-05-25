"""
Rates router — exposes Bank of Canada rate data to the Fastify API.

GET /rates/mortgage  →  current prime rate with source metadata.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from services.bank_of_canada_service import get_current_rate

router = APIRouter()


class MortgageRateResponse(BaseModel):
    """Response shape for the mortgage rate endpoint."""

    rate: float
    """Prime rate as a decimal (e.g. 0.052 = 5.20%)."""

    source: str
    """One of 'live', 'cached', or 'fallback'."""

    fetched_at: str | None
    """ISO 8601 timestamp of the last successful fetch, or None for fallback."""

    warning: str | None
    """
    User-facing warning text when the live rate is unavailable.
    None when source is 'live'.
    """


@router.get("/mortgage", response_model=MortgageRateResponse)
def get_mortgage_rate() -> MortgageRateResponse:
    """
    Return the current Bank of Canada prime rate.

    Checks a 7-day local cache before making an HTTP request.
    Falls back to the last cached value or MORTGAGE_RATE_FALLBACK
    (0.0479) if the API is unreachable.
    """
    data = get_current_rate()
    return MortgageRateResponse(**data)
