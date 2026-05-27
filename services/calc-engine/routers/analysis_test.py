"""
Functionality tests for the FastAPI analysis router (POST /analysis/).

These tests exercise the full POST /analysis/ pipeline by calling the route
handler directly via FastAPI's TestClient — no live server, no real network
calls. External dependencies (CMHC, Bank of Canada) are either stubbed at the
router level or avoided because the route uses in-module defaults.

Calibration properties used:
  - 5702-5 Buttermill Ave, Vaughan ON  — deep-negative condo (hard pass)
  - 146 East 19th Street, Hamilton ON  — cashflowing duplex (good/strong deal)
  - Toronto MLTT property              — verifies municipal LTT is applied
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

# ── Shared payloads ────────────────────────────────────────────────────────────

_VAUGHAN_PAYLOAD: dict = {
    "property_data": {
        "address": "5702-5 Buttermill Ave, Vaughan, ON",
        "province": "ON",
        "price": 729900,
        "annual_taxes": 3326,
        "condo_fee_monthly": 761,
        "condo_fee_known": True,
        "beds": 3,
        "baths": 2.0,
        "sqft": 1050,
        "year_built": 2018,
        "property_type": "condo",
        "is_toronto": False,
    },
    "financing": {
        "down_payment_pct": 0.20,
        "mortgage_rate": 0.0479,
        "amortization_years": 25,
        "include_management_fee": False,
    },
    "rental": {
        "low": 2700,
        "mid": 2900,
        "high": 3200,
        "comp_count": 8,
        "confidence": "medium",
        "postal_code": "L4K",
    },
}

_HAMILTON_PAYLOAD: dict = {
    "property_data": {
        "address": "146 East 19th Street, Hamilton, ON",
        "province": "ON",
        "price": 449000,
        "annual_taxes": 5200,
        "condo_fee_monthly": 0,
        "condo_fee_known": False,
        "beds": 4,
        "baths": 2.0,
        "sqft": 1820,
        "year_built": 1985,
        "property_type": "detached",
        "is_toronto": False,
    },
    "financing": {
        "down_payment_pct": 0.20,
        "mortgage_rate": 0.0479,
        "amortization_years": 25,
        "include_management_fee": False,
    },
    "rental": {
        "low": 3200,
        "mid": 3600,
        "high": 4000,
        "comp_count": 6,
        "confidence": "medium",
        "postal_code": "L8V",
    },
}


# ── Test cases ─────────────────────────────────────────────────────────────────


def test_analysis_vaughan_buttermill() -> None:
    """
    Full pipeline for the Vaughan Buttermill calibration property.

    This is a 3-bed condo with a high condo fee and rent that does not cover
    carrying costs. Expected to return a hard_pass verdict with deeply negative
    cash flow and a cap rate well below 3%.

    Verified expected values:
      - Mortgage payment: ~3,326.64/mo  (20% down, 4.79%, 25yr on $583,920)
      - Cash flow: ~-2,126.82/mo        (rent $2,755 effective − $4,881.83 costs)
      - Cap rate: ~1.7–2.2%             (NOI is negative due to condo fee weight)
      - DSCR: ~0.30–0.42
    """
    response = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    data = response.json()
    metrics = data["metrics"]
    deal_score = data["deal_score"]

    # ── Cash flow ──────────────────────────────────────────────────────────────
    cf = metrics["cash_flow_monthly"]
    assert (
        -2500 < cf < -1700
    ), f"Cash flow {cf:.2f} outside expected range (-2500, -1700)"
    assert (
        abs(cf - (-2126.82)) < 1.0
    ), f"Cash flow {cf:.2f} deviates more than $1 from calibration value -2126.82"

    # ── Cap rate ───────────────────────────────────────────────────────────────
    cap = metrics["cap_rate"]
    assert (
        0.015 < cap < 0.022
    ), f"Cap rate {cap:.4f} outside expected range (0.015, 0.022)"

    # ── DSCR ───────────────────────────────────────────────────────────────────
    dscr = metrics["dscr"]
    assert 0.30 < dscr < 0.42, f"DSCR {dscr:.4f} outside expected range (0.30, 0.42)"

    # ── Mortgage payment ───────────────────────────────────────────────────────
    mtg = metrics["mortgage_payment_monthly"]
    assert (
        abs(mtg - 3326.64) < 1.0
    ), f"Mortgage payment {mtg:.2f} deviates more than $1 from 3326.64"

    # ── LTT — not a Toronto property ──────────────────────────────────────────
    assert (
        metrics["ltt_municipal"] == 0.0
    ), f"Expected ltt_municipal == 0.0 for non-Toronto property, got {metrics['ltt_municipal']}"

    # ── Sanity warnings ────────────────────────────────────────────────────────
    assert (
        metrics["has_sanity_warnings"] is False
    ), "Expected no sanity warnings for Vaughan Buttermill"
    assert (
        data["has_sanity_warnings"] is False
    ), "Top-level has_sanity_warnings should be False for Vaughan Buttermill"

    # ── Deal score ─────────────────────────────────────────────────────────────
    assert (
        deal_score["verdict"] == "hard_pass"
    ), f"Expected verdict 'hard_pass', got '{deal_score['verdict']}'"

    # cap_rate component max must be 25 (spec constant)
    assert (
        deal_score["breakdown"]["component_maxes"]["cap_rate"] == 25
    ), "cap_rate component_max must always be 25"

    # ── Risk flags ─────────────────────────────────────────────────────────────
    assert data["risk_flags"] == [], f"Expected no risk flags, got {data['risk_flags']}"


def test_analysis_hamilton_duplex() -> None:
    """
    Full pipeline for the Hamilton duplex calibration property.

    This is a 4-bed detached property (built 1985) with strong rent relative to
    price. Expected to produce positive cash flow, a cap rate above 6%, and a
    deal score of at least 50 (caution or better).
    """
    response = client.post("/analysis/", json=_HAMILTON_PAYLOAD)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    data = response.json()
    metrics = data["metrics"]
    deal_score = data["deal_score"]

    # ── Cash flow — must be positive ───────────────────────────────────────────
    cf = metrics["cash_flow_monthly"]
    assert cf >= 300, f"Expected positive cash flow >= $300, got {cf:.2f}"

    # ── Cap rate — must be above 6% for a good duplex deal ────────────────────
    cap = metrics["cap_rate"]
    assert cap >= 0.06, f"Expected cap rate >= 6%, got {cap:.4f} ({cap * 100:.2f}%)"

    # ── DSCR — must be above 1.15 to comfortably cover debt ───────────────────
    dscr = metrics["dscr"]
    assert dscr >= 1.15, f"Expected DSCR >= 1.15, got {dscr:.4f}"

    # ── Deal score verdict and total ───────────────────────────────────────────
    allowed_verdicts = {"good_deal", "strong_buy", "caution"}
    assert (
        deal_score["verdict"] in allowed_verdicts
    ), f"Expected verdict in {allowed_verdicts}, got '{deal_score['verdict']}'"
    assert (
        deal_score["total"] >= 50
    ), f"Expected deal score >= 50, got {deal_score['total']}"


def test_analysis_toronto_mltt() -> None:
    """
    Verify that the Municipal Land Transfer Tax (MLTT) is applied for Toronto
    properties and that the provincial LTT is also present.

    Uses a $750,000 Toronto condo to confirm both LTT fields are non-zero.
    """
    payload: dict = {
        "property_data": {
            "address": "100 Queens Quay E, Toronto, ON",
            "province": "ON",
            "price": 750000,
            "annual_taxes": 4000,
            "condo_fee_monthly": 600,
            "condo_fee_known": True,
            "beds": 2,
            "baths": 1.0,
            "sqft": 900,
            "year_built": 2015,
            "property_type": "condo",
            "is_toronto": True,
        },
        "financing": {
            "down_payment_pct": 0.20,
            "mortgage_rate": 0.0479,
            "amortization_years": 25,
            "include_management_fee": False,
        },
        "rental": {
            "low": 2800,
            "mid": 3000,
            "high": 3300,
            "comp_count": 12,
            "confidence": "high",
            "postal_code": "M5E",
        },
    }

    response = client.post("/analysis/", json=payload)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    metrics = response.json()["metrics"]

    assert (
        metrics["ltt_municipal"] > 0
    ), f"Expected ltt_municipal > 0 for Toronto property, got {metrics['ltt_municipal']}"
    assert (
        metrics["ltt_provincial"] > 0
    ), f"Expected ltt_provincial > 0 for Toronto property, got {metrics['ltt_provincial']}"


def test_analysis_missing_field_returns_422() -> None:
    """
    Submitting a request with a missing required field (price) must return 422.

    FastAPI/Pydantic validates the request body against PropertyInput and rejects
    any payload that is missing a required field with HTTP 422 Unprocessable Entity.
    """
    payload_missing_price: dict = {
        "property_data": {
            "address": "5702-5 Buttermill Ave, Vaughan, ON",
            "province": "ON",
            # "price" intentionally omitted
            "annual_taxes": 3326,
            "condo_fee_monthly": 761,
            "condo_fee_known": True,
            "beds": 3,
            "baths": 2.0,
            "sqft": 1050,
            "year_built": 2018,
            "property_type": "condo",
            "is_toronto": False,
        },
        "financing": {
            "down_payment_pct": 0.20,
            "mortgage_rate": 0.0479,
            "amortization_years": 25,
            "include_management_fee": False,
        },
        "rental": {
            "low": 2700,
            "mid": 2900,
            "high": 3200,
            "comp_count": 8,
            "confidence": "medium",
            "postal_code": "L4K",
        },
    }

    response = client.post("/analysis/", json=payload_missing_price)

    assert (
        response.status_code == 422
    ), f"Expected 422 Unprocessable Entity for missing 'price', got {response.status_code}"


def test_analysis_management_fee_toggle() -> None:
    """
    Enabling include_management_fee must reduce monthly cash flow by approximately
    8% of mid rent (2900 × 0.08 = $232/mo).

    The test posts the same Vaughan Buttermill property twice — once with
    management off (baseline -2126.82) and once with management on — and asserts:
      1. The management-on result is lower (more negative) than -2126.82.
      2. The difference is approximately $232 (within $10 tolerance).
    """
    payload_with_mgmt = {
        **_VAUGHAN_PAYLOAD,
        "financing": {
            **_VAUGHAN_PAYLOAD["financing"],
            "include_management_fee": True,
        },
    }

    response = client.post("/analysis/", json=payload_with_mgmt)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    cf_with_mgmt: float = response.json()["metrics"]["cash_flow_monthly"]

    baseline: float = -2126.82

    assert cf_with_mgmt < baseline, (
        f"Cash flow with management ({cf_with_mgmt:.2f}) should be lower than "
        f"baseline ({baseline:.2f})"
    )

    expected_mgmt_fee: float = 2900 * 0.08  # $232.00
    actual_difference: float = baseline - cf_with_mgmt

    assert abs(actual_difference - expected_mgmt_fee) < 10.0, (
        f"Management fee impact ({actual_difference:.2f}) should be approximately "
        f"${expected_mgmt_fee:.2f} (tolerance ±$10)"
    )


def test_analysis_response_has_all_required_fields() -> None:
    """
    The /analysis/ response must include every field defined in AnalysisOutput,
    InvestmentMetricsOutput, DealScoreOutput, and DealScoreBreakdownOutput.

    This acts as a contract test: if any field is ever removed from the Pydantic
    models or the route handler, this test will catch it before the Fastify API
    silently breaks.
    """
    response = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    data = response.json()

    # ── Top-level keys ─────────────────────────────────────────────────────────
    required_top_level = {"metrics", "deal_score", "risk_flags", "has_sanity_warnings"}
    missing_top = required_top_level - data.keys()
    assert not missing_top, f"Top-level keys missing from response: {missing_top}"

    # ── metrics keys ──────────────────────────────────────────────────────────
    required_metrics = {
        "cash_flow_monthly",
        "cap_rate",
        "dscr",
        "grm",
        "noi",
        "mortgage_payment_monthly",
        "down_payment",
        "mortgage_amount",
        "amortization_years",
        "mortgage_rate",
        "break_even_rent",
        "closing_costs_total",
        "ltt_provincial",
        "ltt_municipal",
        "has_sanity_warnings",
    }
    missing_metrics = required_metrics - data["metrics"].keys()
    assert not missing_metrics, f"metrics keys missing from response: {missing_metrics}"

    # ── deal_score keys ───────────────────────────────────────────────────────
    required_deal_score = {"total", "verdict", "breakdown"}
    missing_ds = required_deal_score - data["deal_score"].keys()
    assert not missing_ds, f"deal_score keys missing from response: {missing_ds}"

    # ── breakdown keys ────────────────────────────────────────────────────────
    required_breakdown = {
        "cap_rate",
        "cash_flow",
        "cash_on_cash",
        "dscr",
        "demand",
        "subtotal",
        "deduction",
        "component_maxes",
    }
    breakdown = data["deal_score"]["breakdown"]
    missing_bd = required_breakdown - breakdown.keys()
    assert not missing_bd, f"breakdown keys missing from response: {missing_bd}"

    # ── component_maxes keys ──────────────────────────────────────────────────
    required_maxes = {"cap_rate", "cash_flow", "cash_on_cash", "dscr", "demand"}
    missing_maxes = required_maxes - breakdown["component_maxes"].keys()
    assert (
        not missing_maxes
    ), f"component_maxes keys missing from response: {missing_maxes}"
