"""
Pydantic models for all calc engine inputs and outputs.
No raw dict types in function signatures — always use these models.
"""

from pydantic import BaseModel, Field


class FinancingInput(BaseModel):
    """Financing parameters — driven by the frontend sliders."""
    down_payment_pct: float = Field(..., ge=0.05, le=1.0, description="e.g. 0.20 for 20%")
    mortgage_rate: float = Field(..., ge=0.01, le=0.25, description="e.g. 0.0479 for 4.79%")
    amortization_years: int = Field(..., ge=1, le=30)
    include_management_fee: bool = False


class PropertyInput(BaseModel):
    """Scraped or manually entered property data."""
    address: str
    province: str = "ON"
    price: int = Field(..., gt=0)
    annual_taxes: int = Field(..., ge=0)
    condo_fee_monthly: int | None = None
    condo_fee_known: bool = False
    beds: int = Field(..., ge=0)
    baths: float = Field(..., ge=0)
    sqft: int | None = None
    year_built: int | None = None
    property_type: str = "condo"
    is_toronto: bool = False  # determines whether MLTT applies


class RentalEstimate(BaseModel):
    """Rental comp estimates — sourced from the nightly scraper."""
    low: int
    mid: int
    high: int
    comp_count: int
    confidence: str  # "low" | "medium" | "high"
    postal_code: str


class InvestmentMetricsOutput(BaseModel):
    """All calculated investment metrics returned to Fastify."""
    cash_flow_monthly: float
    cash_flow_annual: float
    cap_rate: float
    cash_on_cash_return: float
    dscr: float
    grm: float
    noi: float
    mortgage_payment_monthly: float
    down_payment: float
    mortgage_amount: float
    break_even_rent: float
    closing_costs_total: float
    ltt_provincial: float
    ltt_municipal: float
    has_sanity_warnings: bool


class DealScoreOutput(BaseModel):
    """Deal score result with component breakdown."""
    total: float  # 0–100
    verdict: str
    breakdown: dict[str, float]


class AnalysisOutput(BaseModel):
    """Full analysis result returned to the Fastify API."""
    metrics: InvestmentMetricsOutput
    deal_score: DealScoreOutput
    risk_flags: list[dict[str, object]]
    has_sanity_warnings: bool
