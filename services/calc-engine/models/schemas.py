"""
Pydantic models for all calc engine inputs and outputs.
No raw dict types in function signatures — always use these models.
"""

from pydantic import BaseModel, Field


class FinancingInput(BaseModel):
    """Financing parameters — driven by the frontend sliders."""

    down_payment_pct: float = Field(
        ..., ge=0.05, le=1.0, description="e.g. 0.20 for 20%"
    )
    mortgage_rate: float = Field(
        ..., ge=0.01, le=0.25, description="e.g. 0.0479 for 4.79%"
    )
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
    lat: float | None = None  # geocoded coordinates for SunScout
    lng: float | None = None


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
    # Financing inputs passed through so the frontend can display them
    # without storing separate state.
    amortization_years: int
    mortgage_rate: float
    break_even_rent: float
    closing_costs_total: float
    ltt_provincial: float
    ltt_municipal: float
    has_sanity_warnings: bool


class ComponentMaxes(BaseModel):
    """Maximum points each deal-score component can contribute."""

    cap_rate: int
    cash_flow: int
    cash_on_cash: int
    dscr: int
    demand: int


class DealScoreBreakdownOutput(BaseModel):
    """Per-component deal-score breakdown returned to the Fastify API."""

    cap_rate: int
    cash_flow: int
    cash_on_cash: int
    dscr: int
    demand: int
    subtotal: int
    deduction: int
    component_maxes: ComponentMaxes


class DealScoreOutput(BaseModel):
    """Deal score result with component breakdown."""

    total: int  # 0–95 — the raw gated score (verdict is derived from THIS)
    display_total: int  # 0–100 — floored + normalised for the gauge (spec §10a)
    verdict: str
    breakdown: DealScoreBreakdownOutput


class SunScoutOutput(BaseModel):
    """SunScout solar exposure result — omitted when lat/lng are unavailable."""

    annual_peak_sun_hours: float
    summer_daily_hours: float
    winter_daily_hours: float
    seasonal_grid: dict[str, float]
    monthly_hours: list[
        float
    ]  # 12 values, index 0 = Jan, index 11 = Dec (bedroom_main window)
    sun_score: float
    verdict: str


class SunScoutRequest(BaseModel):
    """Standalone SunScout recalculation request (facade-direction input UI)."""

    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    azimuth_deg: float = Field(
        180.0,
        ge=0,
        le=360,
        description="Primary facade bearing in degrees; 180 = south (the pipeline default)",
    )


class SunScoutResponse(BaseModel):
    """Standalone SunScout recalculation response."""

    sun_scout: SunScoutOutput | None


class AnalysisOutput(BaseModel):
    """Full analysis result returned to the Fastify API."""

    metrics: InvestmentMetricsOutput
    deal_score: DealScoreOutput
    risk_flags: list[dict[str, object]]
    has_sanity_warnings: bool
    sun_scout: SunScoutOutput | None = None
