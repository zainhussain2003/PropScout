"""
Analysis router — handles POST /analysis requests from the Fastify API.
Route handlers call services and calculations. No business logic here.
"""

from fastapi import APIRouter, HTTPException
from ..models.schemas import PropertyInput, FinancingInput, RentalEstimate, AnalysisOutput

router = APIRouter()


@router.post("/", response_model=AnalysisOutput)
async def run_analysis(
    property_data: PropertyInput,
    financing: FinancingInput,
    rental: RentalEstimate,
) -> AnalysisOutput:
    """
    Run a full investment analysis for a property.

    1. Run calculations (mortgage, NOI, cap rate, cash flow, DSCR, GRM, LTT)
    2. Run sanity checks
    3. Calculate deal score
    4. Return structured output to Fastify API

    TODO: Implement once all calculation modules are complete.
    """
    raise HTTPException(status_code=501, detail="Analysis endpoint: not yet implemented")
