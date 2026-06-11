"""
Analysis router — handles POST /analysis requests from the Fastify API.
Route handlers call services and calculations. No business logic here.
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel

from models.schemas import (
    PropertyInput,
    FinancingInput,
    RentalEstimate,
    AnalysisOutput,
    InvestmentMetricsOutput,
    DealScoreOutput,
    DealScoreBreakdownOutput,
    ComponentMaxes,
    SunScoutOutput,
)
from sunscout.sun_path import calculate_sun_hours
from constants.rates import get_maintenance_rate
from calculations.mortgage import calculate_monthly_payment
from calculations.closing_costs import estimate_closing_costs
from calculations.investment import (
    calculate_noi,
    calculate_cap_rate,
    calculate_cash_flow_monthly,
    calculate_dscr,
    calculate_grm,
    calculate_cash_on_cash,
    calculate_break_even_rent,
)
from calculations.deal_score import calculate_deal_score
from calculations.sanity import sanity_check_metrics
from extraction.regex_rules import extract_regex_flags
from extraction.haiku_extraction import extract_flags_with_haiku
from extraction.logic_gate import merge_flags

logger = logging.getLogger(__name__)

router = APIRouter()

# ── CMHC defaults (nightly scraper not yet wired — Week 5–6) ─────────────────
_DEFAULT_CMHC_VACANCY_RATE: float = 0.02
_DEFAULT_RENTAL_DOM: int = 21
_DEFAULT_RENT_TREND: str = "flat"

# Points deducted from the deal score per confirmed red flag
_DEDUCTION_PER_RED_FLAG: int = 5


class AnalysisRequest(BaseModel):
    """Combined request body for the analysis endpoint."""

    property_data: PropertyInput
    financing: FinancingInput
    rental: RentalEstimate
    description: str | None = (
        None  # raw listing description; run through extraction pipeline
    )


@router.post("/", response_model=AnalysisOutput)
async def run_analysis(body: AnalysisRequest) -> AnalysisOutput:
    """
    Run a full investment analysis for a property.

    Steps:
      1. Derive maintenance rate from build year.
      2. Compute mortgage payment and closing costs.
      3. Compute all investment metrics (NOI, cap rate, cash flow, DSCR, GRM, CoC,
         break-even rent).
      4. Compute deal score.
      5. Run sanity checks; log any failures.
      6. Return AnalysisOutput to the Fastify API.

    Args:
        body: Combined request with property_data, financing, and rental inputs.

    Returns:
        Full AnalysisOutput with metrics, deal_score, risk_flags, and warning flag.
    """
    prop = body.property_data
    fin = body.financing
    rental = body.rental

    # ── 1. Maintenance rate ───────────────────────────────────────────────────
    maintenance_rate = get_maintenance_rate(prop.year_built)

    # ── 2. Mortgage + closing costs ───────────────────────────────────────────
    down_payment = float(prop.price) * fin.down_payment_pct
    mortgage_amount = float(prop.price) - down_payment

    mortgage_payment_monthly = calculate_monthly_payment(
        principal=mortgage_amount,
        annual_rate=fin.mortgage_rate,
        amortization_years=fin.amortization_years,
    )
    annual_debt_service = mortgage_payment_monthly * 12

    closing = estimate_closing_costs(
        purchase_price=float(prop.price),
        is_toronto=prop.is_toronto,
    )

    # ── 3. Investment metrics ─────────────────────────────────────────────────
    monthly_rent = float(rental.mid)
    gross_annual_rent = monthly_rent * 12
    condo_fee_monthly = float(prop.condo_fee_monthly or 0)

    noi = calculate_noi(
        gross_annual_rent=gross_annual_rent,
        annual_taxes=float(prop.annual_taxes),
        insurance_value=float(prop.price),
        condo_fee_annual=condo_fee_monthly * 12,
        maintenance_rate=maintenance_rate,
        property_value=float(prop.price),
        include_management=fin.include_management_fee,
    )

    cap_rate = calculate_cap_rate(noi=noi, purchase_price=float(prop.price))

    cash_flow_monthly = calculate_cash_flow_monthly(
        monthly_rent=monthly_rent,
        mortgage_payment=mortgage_payment_monthly,
        annual_taxes=float(prop.annual_taxes),
        insurance_value=float(prop.price),
        condo_fee_monthly=condo_fee_monthly,
        maintenance_rate=maintenance_rate,
        property_value=float(prop.price),
        include_management=fin.include_management_fee,
    )
    cash_flow_annual = cash_flow_monthly * 12

    dscr = calculate_dscr(noi=noi, annual_debt_service=annual_debt_service)

    grm = calculate_grm(
        purchase_price=float(prop.price),
        annual_gross_rent=gross_annual_rent,
    )

    total_cash_invested = down_payment + closing["total"]
    cash_on_cash = calculate_cash_on_cash(
        annual_cash_flow=cash_flow_annual,
        total_cash_invested=total_cash_invested,
    )

    break_even_rent = calculate_break_even_rent(
        mortgage_payment=mortgage_payment_monthly,
        annual_taxes=float(prop.annual_taxes),
        insurance_value=float(prop.price),
        condo_fee_monthly=condo_fee_monthly,
        maintenance_rate=maintenance_rate,
        property_value=float(prop.price),
        include_management=fin.include_management_fee,
    )

    # ── 3b. Listing description extraction pipeline ───────────────────────────
    # Runs regex first (deterministic), then Haiku for gray areas.
    # Logic gate merges and applies confidence thresholds.
    # Only validated red flags (85%+ confidence) deduct from the deal score.
    merged_flags: list = []
    risk_flag_deductions: float = 0.0

    if body.description:
        try:
            regex_flags = extract_regex_flags(body.description)
            haiku_flags = await extract_flags_with_haiku(body.description)
            merged_flags = merge_flags(regex_flags, haiku_flags)

            red_flag_count = sum(1 for f in merged_flags if f.severity == "red")
            risk_flag_deductions = float(red_flag_count * _DEDUCTION_PER_RED_FLAG)
        except Exception as exc:  # noqa: BLE001 — non-fatal; rest of report still loads
            logger.error("Extraction pipeline failed for %s: %s", prop.address, exc)
            merged_flags = []
            risk_flag_deductions = 0.0

    # ── 4. Deal score ─────────────────────────────────────────────────────────
    score_result = calculate_deal_score(
        cap_rate=cap_rate,
        cash_flow_monthly=cash_flow_monthly,
        cash_on_cash=cash_on_cash,
        dscr=dscr,
        cmhc_vacancy_rate=_DEFAULT_CMHC_VACANCY_RATE,
        rental_days_on_market=_DEFAULT_RENTAL_DOM,
        rent_trend=_DEFAULT_RENT_TREND,
        risk_flag_deductions=risk_flag_deductions,
    )

    br = score_result["breakdown"]
    cm = br["component_maxes"]
    deal_score = DealScoreOutput(
        total=score_result["total"],
        verdict=score_result["verdict"],
        breakdown=DealScoreBreakdownOutput(
            cap_rate=br["cap_rate"],
            cash_flow=br["cash_flow"],
            cash_on_cash=br["cash_on_cash"],
            dscr=br["dscr"],
            demand=br["demand"],
            subtotal=br["subtotal"],
            deduction=br["deduction"],
            component_maxes=ComponentMaxes(
                cap_rate=cm["cap_rate"],
                cash_flow=cm["cash_flow"],
                cash_on_cash=cm["cash_on_cash"],
                dscr=cm["dscr"],
                demand=cm["demand"],
            ),
        ),
    )

    # ── 5. Sanity checks ──────────────────────────────────────────────────────
    sanity_warnings = sanity_check_metrics(
        cap_rate=cap_rate,
        monthly_rent=monthly_rent,
        purchase_price=float(prop.price),
        dscr=dscr,
        break_even_rent=break_even_rent,
    )
    has_sanity_warnings = len(sanity_warnings) > 0

    if sanity_warnings:
        for warning in sanity_warnings:
            logger.warning("Sanity check failed for %s: %s", prop.address, warning)

    # ── 6. SunScout (non-fatal — skipped when lat/lng unavailable) ───────────
    sun_scout_result: SunScoutOutput | None = None
    if prop.lat is not None and prop.lng is not None:
        try:
            ss = calculate_sun_hours(prop.lat, prop.lng)
            sun_scout_result = SunScoutOutput(
                annual_peak_sun_hours=ss.annual_peak_sun_hours,
                summer_daily_hours=ss.summer_daily_hours,
                winter_daily_hours=ss.winter_daily_hours,
                seasonal_grid=ss.seasonal_grid,
                sun_score=ss.sun_score,
                verdict=ss.verdict,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("SunScout failed for %s: %s", prop.address, exc)

    # ── 7. Assemble and return output ─────────────────────────────────────────
    metrics = InvestmentMetricsOutput(
        cash_flow_monthly=round(cash_flow_monthly, 2),
        cash_flow_annual=round(cash_flow_annual, 2),
        cap_rate=round(cap_rate, 6),
        cash_on_cash_return=round(cash_on_cash, 6),
        dscr=round(dscr, 4),
        grm=round(grm, 2),
        noi=round(noi, 2),
        mortgage_payment_monthly=round(mortgage_payment_monthly, 2),
        down_payment=round(down_payment, 2),
        mortgage_amount=round(mortgage_amount, 2),
        amortization_years=fin.amortization_years,
        mortgage_rate=fin.mortgage_rate,
        break_even_rent=round(break_even_rent, 2),
        closing_costs_total=round(closing["total"], 2),
        ltt_provincial=round(closing["ltt_provincial"], 2),
        ltt_municipal=round(closing["ltt_municipal"], 2),
        has_sanity_warnings=has_sanity_warnings,
    )

    # Serialise merged flags into the response — only flags above amber threshold
    serialised_flags: list[dict[str, object]] = [
        {
            "flag_id": f.flag_id,
            "severity": f.severity,
            "confidence": f.confidence,
            "evidence": f.evidence,
            "source": f.source,
        }
        for f in merged_flags
    ]

    return AnalysisOutput(
        metrics=metrics,
        deal_score=deal_score,
        risk_flags=serialised_flags,
        has_sanity_warnings=has_sanity_warnings,
        sun_scout=sun_scout_result,
    )
