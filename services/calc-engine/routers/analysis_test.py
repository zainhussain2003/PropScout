import pytest

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

import json
import sys
import os
from unittest.mock import patch, AsyncMock
from extraction.haiku_extraction import HaikuExtractionError  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)

# Patch target for the Haiku extractor as imported into the router module.
# Tests that send a description patch this so only the deterministic regex
# flags fire — no network call, no key dependency.
_HAIKU_PATCH = "routers.analysis.extract_flags_with_haiku"

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


def test_sanity_warnings_are_returned_in_words() -> None:
    """
    A $2.5M house priced off a $2,616 rent (1 Caldow Road, 2026-09-16): the
    cap rate goes negative and the break-even rent passes 3x the market rent.
    The checks already fired and were logged; the response now carries what
    they said, so the report can show which figures to doubt (D-118).
    """
    payload = json.loads(json.dumps(_VAUGHAN_PAYLOAD))
    payload["property_data"].update(
        {
            "address": "1 Caldow Road, Toronto, ON",
            "price": 2_498_000,
            "annual_taxes": 10_771,
            "condo_fee_monthly": 0,
            "condo_fee_known": False,
            "property_type": "detached",
            "is_toronto": True,
        }
    )
    payload["rental"].update({"low": 2373, "mid": 2616, "high": 2723, "comp_count": 10})

    resp = client.post("/analysis", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["has_sanity_warnings"] is True
    warnings = data["sanity_warnings"]
    assert len(warnings) >= 2
    assert any("Cap rate" in w for w in warnings)
    assert any("Break-even rent" in w and "3" in w for w in warnings)
    # Each is a sentence a reader can act on, not a code.
    assert all(w.endswith(".") for w in warnings)

    # And a plausible property carries an empty list, not a missing field.
    clean = client.post("/analysis", json=_VAUGHAN_PAYLOAD).json()
    assert clean["has_sanity_warnings"] is False
    assert clean["sanity_warnings"] == []


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


def test_condo_unknown_fee_emits_amber_flag() -> None:
    """
    Fix I — a condo with condo_fee_known=False must return a 'condo_fee_unknown'
    amber flag in risk_flags.

    The calc engine silently uses $0 when condo_fee_monthly is not provided.
    For condos this can understate carrying costs by hundreds per month.
    The structural flag surfaces this assumption so the user can correct it.
    """
    payload: dict = {
        "property_data": {
            "address": "200 Rideau St, Ottawa, ON",
            "province": "ON",
            "price": 450000,
            "annual_taxes": 2800,
            "condo_fee_monthly": None,
            "condo_fee_known": False,
            "beds": 2,
            "baths": 1.0,
            "sqft": 800,
            "year_built": 2010,
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
            "low": 2000,
            "mid": 2200,
            "high": 2500,
            "comp_count": 5,
            "confidence": "medium",
            "postal_code": "K1N",
        },
    }

    response = client.post("/analysis/", json=payload)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    flags = response.json()["risk_flags"]
    condo_fee_flags = [f for f in flags if f["flag_id"] == "condo_fee_unknown"]

    assert len(condo_fee_flags) == 1, (
        f"Expected exactly 1 'condo_fee_unknown' flag, got {len(condo_fee_flags)}. "
        f"All flags: {[f['flag_id'] for f in flags]}"
    )

    flag = condo_fee_flags[0]
    assert (
        flag["severity"] == "amber"
    ), f"'condo_fee_unknown' flag must be amber (informational), got '{flag['severity']}'"
    assert flag["evidence"] is not None, "Flag must include evidence text"


def test_condo_known_fee_does_not_emit_flag() -> None:
    """
    Fix I — when condo_fee_known=True the flag must NOT appear.
    The Vaughan Buttermill calibration condo has a known fee of $761/mo.
    """
    response = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    flags = response.json()["risk_flags"]
    condo_fee_flags = [f for f in flags if f["flag_id"] == "condo_fee_unknown"]

    assert len(condo_fee_flags) == 0, (
        f"Expected no 'condo_fee_unknown' flag when fee is known, "
        f"but got {len(condo_fee_flags)}"
    )


def test_detached_unknown_fee_does_not_emit_flag() -> None:
    """
    Fix I — the condo_fee_unknown flag must NOT fire for non-condo properties
    even when condo_fee_known=False.

    The Hamilton duplex is a detached property — it has no condo fee.
    """
    response = client.post("/analysis/", json=_HAMILTON_PAYLOAD)

    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"

    flags = response.json()["risk_flags"]
    condo_fee_flags = [f for f in flags if f["flag_id"] == "condo_fee_unknown"]

    assert len(condo_fee_flags) == 0, (
        f"Expected no 'condo_fee_unknown' flag for detached property, "
        f"but got {len(condo_fee_flags)}"
    )


def test_cmhc_vacancy_rate_flows_into_demand_score() -> None:
    """
    The per-city CMHC vacancy rate supplied by the Fastify API must drive the
    demand component of the deal score, not a flat in-module default.

    Vacancy contribution (deal_score._score_market_demand):
      < 2%  → 4 pts,  < 3% → 3 pts,  < 5% → 1 pt,  >= 5% → 0 pts.
    A tight 1% market and a soft 6% market must therefore score 4 demand
    points apart, all else equal.
    """
    tight = {**_VAUGHAN_PAYLOAD, "cmhc_vacancy_rate": 0.01}
    soft = {**_VAUGHAN_PAYLOAD, "cmhc_vacancy_rate": 0.06}

    tight_resp = client.post("/analysis/", json=tight)
    soft_resp = client.post("/analysis/", json=soft)

    assert tight_resp.status_code == 200, tight_resp.text
    assert soft_resp.status_code == 200, soft_resp.text

    tight_demand = tight_resp.json()["deal_score"]["breakdown"]["demand"]
    soft_demand = soft_resp.json()["deal_score"]["breakdown"]["demand"]

    assert tight_demand - soft_demand == 4, (
        f"Expected 4-pt demand gap between 1% and 6% vacancy, "
        f"got tight={tight_demand}, soft={soft_demand}"
    )


def test_cmhc_vacancy_rate_defaults_when_omitted() -> None:
    """
    Omitting cmhc_vacancy_rate falls back to the 2% in-module default, which
    lands in the < 3% bracket (3 demand points from vacancy). Confirms the
    optional field is backward-compatible with callers that don't send it.
    """
    response = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)
    assert response.status_code == 200, response.text

    # Vaughan: 2% vacancy (3 pts); DOM and trend not sent → not observed → 0 (D-105).
    demand = response.json()["deal_score"]["breakdown"]["demand"]
    assert demand == 3, f"Expected demand 3 with default 2% vacancy, got {demand}"


def test_unobserved_demand_inputs_score_zero_and_are_echoed() -> None:
    """
    D-105: when the API sends no days-on-market and no rent trend, those two
    inputs contribute 0 of their 6 points — the engine no longer substitutes
    21 days / 'flat' (4 points for nothing). The echo says what ran.
    """
    body = {**_VAUGHAN_PAYLOAD, "cmhc_vacancy_rate": 0.06}  # 0 vacancy pts
    resp = client.post("/analysis/", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["deal_score"]["breakdown"]["demand"] == 0
    assert data["assumptions"]["rental_days_on_market"] is None
    assert data["assumptions"]["rent_trend"] is None


def test_observed_demand_inputs_are_scored_and_echoed() -> None:
    """A measured 9-day DOM (3 pts) and rising trend (3 pts) count and are echoed."""
    body = {
        **_VAUGHAN_PAYLOAD,
        "cmhc_vacancy_rate": 0.06,
        "rental_days_on_market": 9,
        "rent_trend": "rising",
    }
    resp = client.post("/analysis/", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["deal_score"]["breakdown"]["demand"] == 6
    assert data["assumptions"]["rental_days_on_market"] == 9
    assert data["assumptions"]["rent_trend"] == "rising"


def test_owned_outright_has_no_debt_service_and_no_closing_costs() -> None:
    """
    D-108: financing.owned with 100% equity — mortgage payment 0, DSCR None
    (not infinite, not 0), DSCR component at its maximum, closing costs and
    LTT zero, cash on cash measured against the equity alone.
    """
    body = {
        **_VAUGHAN_PAYLOAD,
        "financing": {
            **_VAUGHAN_PAYLOAD["financing"],
            "down_payment_pct": 1.0,
            "owned": True,
        },
    }
    resp = client.post("/analysis/", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    m = data["metrics"]
    assert m["mortgage_payment_monthly"] == 0
    assert m["mortgage_amount"] == 0
    assert m["dscr"] is None
    assert m["closing_costs_total"] == 0
    assert m["ltt_provincial"] == 0
    assert data["deal_score"]["breakdown"]["dscr"] == 15
    assert data["assumptions"]["owned"] is True
    assert data["has_sanity_warnings"] is False
    # Cash flow is NOI with nothing to pay the bank; CoC is on the full value.
    assert m["cash_flow_monthly"] == pytest.approx(m["noi"] / 12, abs=1)
    assert m["cash_on_cash_return"] == pytest.approx(
        m["cash_flow_annual"] / 729900, abs=1e-4
    )


def test_owned_with_a_mortgage_keeps_debt_service_but_drops_closing_costs() -> None:
    """A 40% equity position: the mortgage is real, the LTT is not payable again."""
    body = {
        **_VAUGHAN_PAYLOAD,
        "financing": {
            **_VAUGHAN_PAYLOAD["financing"],
            "down_payment_pct": 0.4,
            "owned": True,
        },
    }
    m = client.post("/analysis/", json=body).json()["metrics"]
    assert m["mortgage_payment_monthly"] > 0
    assert m["dscr"] is not None and m["dscr"] > 0
    assert m["closing_costs_total"] == 0
    assert m["down_payment"] == pytest.approx(729900 * 0.4)


def test_headline_is_version_2_with_no_floor_and_a_version_3_shadow_rides_along() -> (
    None
):
    """D-115: deal_score.version 2; a zero displays as zero; shadow_score stored beside it."""
    resp = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["deal_score"]["version"] == 2
    assert data["deal_score"]["display_total"] == round(
        data["deal_score"]["total"] * 100 / 95
    )
    shadow = data["shadow_score"]
    assert shadow["version"] == 3
    assert 0 <= shadow["property_economics"] <= 100
    assert 0 <= shadow["financing_resilience"] <= 100
    assert shadow["risk_status"] in {"clear", "flagged", "critical"}
    assert shadow["outcomes"]["cash_flow_monthly"] == pytest.approx(
        data["metrics"]["cash_flow_monthly"], abs=0.01
    )


def test_rent_trend_outside_the_vocabulary_is_rejected() -> None:
    """'up' is not a trend the score understands; a 422 beats a silent 0."""
    body = {**_VAUGHAN_PAYLOAD, "rent_trend": "up"}
    assert client.post("/analysis/", json=body).status_code == 422


def test_dismissed_red_flag_removes_its_score_deduction() -> None:
    """
    A red flag the user has dismissed (passed in dismissed_flag_ids) must stop
    deducting from the deal score on re-run, while still being returned in
    risk_flags so the UI can show it greyed out.

    'currently rented' deterministically triggers the regex 'tenanted' flag at
    confidence 92 (>= 85 -> red-eligible). Per the flag severity matrix,
    tenanted is only a RED tier for the PERSONAL mode (N12 own-use risk) —
    for an investor it is amber and never deducts.
    """
    base = {
        **_HAMILTON_PAYLOAD,
        "mode": "personal",
        "description": "Bright duplex, currently rented to great tenants.",
    }
    dismissed = {**base, "dismissed_flag_ids": ["tenanted"]}

    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        base_resp = client.post("/analysis/", json=base)
        dismissed_resp = client.post("/analysis/", json=dismissed)

    assert base_resp.status_code == 200, base_resp.text
    assert dismissed_resp.status_code == 200, dismissed_resp.text

    base_data = base_resp.json()
    dismissed_data = dismissed_resp.json()

    # The red flag fires in both responses (still shown), ...
    assert any(f["flag_id"] == "tenanted" for f in base_data["risk_flags"])
    assert any(f["flag_id"] == "tenanted" for f in dismissed_data["risk_flags"])

    # ... but its -5 deduction is gone once dismissed, lifting the score by 5.
    assert base_data["deal_score"]["breakdown"]["deduction"] == 5
    assert dismissed_data["deal_score"]["breakdown"]["deduction"] == 0
    assert dismissed_data["deal_score"]["total"] == base_data["deal_score"]["total"] + 5


def test_dismissing_unknown_flag_id_is_a_noop() -> None:
    """Dismissing a flag_id that isn't present must not change the score."""
    base = {**_HAMILTON_PAYLOAD, "description": "Bright duplex, currently rented."}
    other = {**base, "dismissed_flag_ids": ["some_other_flag"]}

    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        base_total = client.post("/analysis/", json=base).json()["deal_score"]["total"]
        other_total = client.post("/analysis/", json=other).json()["deal_score"][
            "total"
        ]

    assert base_total == other_total


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


# -- POST /analysis/sunscout - facade-direction recalculation ------------------


def test_sunscout_endpoint_recalculates_for_facade_bearing() -> None:
    """A south-facing facade in Toronto must out-score a north-facing one -
    the endpoint exists so the UI can turn the assumed-south default into a
    user-supplied input."""
    south = client.post(
        "/analysis/sunscout",
        json={"lat": 43.65, "lng": -79.38, "azimuth_deg": 180},
    )
    north = client.post(
        "/analysis/sunscout",
        json={"lat": 43.65, "lng": -79.38, "azimuth_deg": 0},
    )
    assert south.status_code == 200
    assert north.status_code == 200
    s = south.json()["sun_scout"]
    n = north.json()["sun_scout"]
    assert s is not None and n is not None
    assert s["sun_score"] > n["sun_score"]
    assert len(s["monthly_hours"]) == 12


def test_sunscout_endpoint_defaults_to_south_facade() -> None:
    """Omitting azimuth_deg uses the same south (180) assumption as the main
    analysis pipeline."""
    default = client.post("/analysis/sunscout", json={"lat": 43.65, "lng": -79.38})
    explicit = client.post(
        "/analysis/sunscout",
        json={"lat": 43.65, "lng": -79.38, "azimuth_deg": 180},
    )
    assert default.status_code == 200
    assert default.json() == explicit.json()


def test_sunscout_endpoint_rejects_invalid_bearing() -> None:
    """Bearings outside 0-360 are a caller bug, not a calculation input."""
    res = client.post(
        "/analysis/sunscout",
        json={"lat": 43.65, "lng": -79.38, "azimuth_deg": 400},
    )
    assert res.status_code == 422


# ── Flag severity matrix — per-mode severities (docs/FLAG_SEVERITY_MATRIX.md) ──


def _flags_for_mode(description: str, mode: str) -> dict[str, dict]:
    """Run the same listing through one mode; return {flag_id: flag dict}."""
    payload = {**_HAMILTON_PAYLOAD, "mode": mode, "description": description}
    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        resp = client.post("/analysis/", json=payload)
    assert resp.status_code == 200, resp.text
    return {f["flag_id"]: f for f in resp.json()["risk_flags"]}


def test_matrix_same_listing_gets_mode_specific_severities() -> None:
    """One tenanted + needs-work listing through all four modes: the flag set
    and tones must follow the matrix, not a single global severity."""
    desc = "Sold as-is, handyman special. Currently rented to great tenants."

    investor = _flags_for_mode(desc, "investor")
    assert investor["tenanted"]["severity"] == "amber"
    assert investor["needs_work"]["severity"] == "amber"

    personal = _flags_for_mode(desc, "personal")
    assert personal["tenanted"]["severity"] == "red"  # N12 own-use risk
    assert personal["needs_work"]["severity"] == "red"

    tenant = _flags_for_mode(desc, "tenant")
    assert "tenanted" not in tenant  # hidden — the reader IS the tenant
    assert "needs_work" not in tenant

    landlord = _flags_for_mode(desc, "landlord")
    assert landlord["tenanted"]["severity"] == "amber"


def test_matrix_amber_tiers_do_not_deduct_from_the_investor_score() -> None:
    """Under the approved matrix, tenanted/needs_work are amber for an
    investor — the score must match the no-description baseline exactly."""
    desc = "Sold as-is, handyman special. Currently rented to great tenants."
    flagged = {**_HAMILTON_PAYLOAD, "mode": "investor", "description": desc}

    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        flagged_resp = client.post("/analysis/", json=flagged)
        base_resp = client.post("/analysis/", json=_HAMILTON_PAYLOAD)

    flagged_data = flagged_resp.json()
    assert flagged_data["deal_score"]["breakdown"]["deduction"] == 0
    assert (
        flagged_data["deal_score"]["total"] == base_resp.json()["deal_score"]["total"]
    )


def test_matrix_severe_gate_still_fires_for_investor() -> None:
    """The §10a severe gate is unchanged: a grow-op caps the investor score
    at the 1-severe ceiling (40)."""
    desc = "Former grow op, fully remediated with city sign-off."
    payload = {**_HAMILTON_PAYLOAD, "mode": "investor", "description": desc}

    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        resp = client.post("/analysis/", json=payload)

    data = resp.json()
    assert any(
        f["flag_id"] == "grow_op_history" and f["tier"] == "severe"
        for f in data["risk_flags"]
    )
    assert data["deal_score"]["total"] <= 40


def test_matrix_condo_fee_unknown_is_hidden_from_tenants() -> None:
    """The structural condo-fee flag doesn't apply to tenants — they don't
    pay the fee."""
    condo = {
        **_VAUGHAN_PAYLOAD,
        "property_data": {
            **_VAUGHAN_PAYLOAD["property_data"],
            "condo_fee_known": False,
            "condo_fee_monthly": 0,
        },
    }
    investor = {**condo, "mode": "investor"}
    tenant = {**condo, "mode": "tenant"}

    inv_flags = {
        f["flag_id"]
        for f in client.post("/analysis/", json=investor).json()["risk_flags"]
    }
    ten_flags = {
        f["flag_id"]
        for f in client.post("/analysis/", json=tenant).json()["risk_flags"]
    }

    assert "condo_fee_unknown" in inv_flags
    assert "condo_fee_unknown" not in ten_flags


def test_analysis_returns_break_even_appreciation() -> None:
    """
    The hold case reaches the API and describes the same scenario as the metrics.

    Buttermill carries a deep monthly shortfall, so the required growth must be
    positive, and it must fall as the hold lengthens — paydown and compounding
    both work in the buyer's favour over time. That ordering is the claim the
    section exists to make, so it is asserted rather than assumed.
    """
    data = client.post("/analysis/", json=_VAUGHAN_PAYLOAD).json()
    hold_case = data["hold_case"]

    assert [row["year"] for row in hold_case] == [5, 10, 20]

    rates = [row["break_even_annual_rate"] for row in hold_case]
    assert all(
        rate > 0 for rate in rates
    ), f"Expected positive required growth: {rates}"
    assert (
        rates[0] > rates[1] > rates[2]
    ), f"Required growth should fall with hold: {rates}"

    # The cumulative contribution must reconcile with the cash flow reported
    # beside it; a mismatch would mean the two describe different scenarios.
    monthly_shortfall = -data["metrics"]["cash_flow_monthly"]
    for row in hold_case:
        expected = monthly_shortfall * 12 * row["year"]
        assert abs(row["cumulative_contribution"] - expected) < 1.0
        assert row["total_cash_in"] > row["cash_invested"]


def test_hold_case_absent_shortfall_is_not_credited() -> None:
    """
    A property that covers its costs reports no contribution, and its required
    growth is lower than the same property running a shortfall.
    """
    strong = {
        **_VAUGHAN_PAYLOAD,
        "rental": {
            **_VAUGHAN_PAYLOAD["rental"],
            "low": 6_000,
            "mid": 6_500,
            "high": 7_000,
        },
    }
    data = client.post("/analysis/", json=strong).json()

    assert data["metrics"]["cash_flow_monthly"] > 0
    assert all(row["cumulative_contribution"] == 0.0 for row in data["hold_case"])

    weak_rates = [
        row["break_even_annual_rate"]
        for row in client.post("/analysis/", json=_VAUGHAN_PAYLOAD).json()["hold_case"]
    ]
    strong_rates = [row["break_even_annual_rate"] for row in data["hold_case"]]
    assert all(s < w for s, w in zip(strong_rates, weak_rates))


# ── Applied assumptions are reported, not inferred (assumption ledger) ─────────


def test_analysis_reports_the_assumptions_it_applied() -> None:
    """
    The engine echoes every default it used so the report can show a ledger
    of sources instead of the API guessing at engine constants.
    """
    client = TestClient(app)
    res = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)
    assert res.status_code == 200
    a = res.json()["assumptions"]

    assert a["vacancy_allowance"] == 0.05
    assert a["management_fee"] == 0.08
    assert a["management_fee_included"] is False
    assert a["insurance_rate"] == 0.0035
    # Built 2018 → post-2010 band
    assert a["maintenance_rate"] == 0.005
    assert a["maintenance_basis"] == "post_2010"
    assert a["legal_fees"] == 1500.0
    assert a["title_insurance"] == 300.0
    assert a["home_inspection"] == 600.0
    assert a["down_payment_pct"] == 0.20
    assert a["mortgage_rate"] == 0.0479
    assert a["amortization_years"] == 25
    # No CMHC rate supplied → the engine's own default, and it says so
    assert a["cmhc_vacancy_rate_supplied"] is False
    assert a["cmhc_vacancy_rate"] == 0.02


def test_analysis_assumptions_track_build_year_and_supplied_vacancy() -> None:
    client = TestClient(app)
    payload = {**_HAMILTON_PAYLOAD, "cmhc_vacancy_rate": 0.033}
    res = client.post("/analysis/", json=payload)
    assert res.status_code == 200
    a = res.json()["assumptions"]
    # Built 1985 → mid band
    assert a["maintenance_rate"] == 0.010
    assert a["maintenance_basis"] == "1980_2010"
    assert a["cmhc_vacancy_rate_supplied"] is True
    assert a["cmhc_vacancy_rate"] == 0.033


def test_analysis_assumptions_unknown_build_year_is_named() -> None:
    client = TestClient(app)
    payload = {
        **_HAMILTON_PAYLOAD,
        "property_data": {**_HAMILTON_PAYLOAD["property_data"], "year_built": None},
    }
    res = client.post("/analysis/", json=payload)
    assert res.status_code == 200
    a = res.json()["assumptions"]
    assert a["maintenance_rate"] == 0.010
    assert a["maintenance_basis"] == "year_unknown"


# ── The scan's own status is reported (D-090) ──────────────────────────────────


def test_extraction_status_no_text_without_a_description() -> None:
    client = TestClient(app)
    res = client.post("/analysis/", json=_VAUGHAN_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["extraction_status"] == "no_text"


def test_extraction_status_ok_when_both_passes_run() -> None:
    client = TestClient(app)
    payload = {
        **_VAUGHAN_PAYLOAD,
        "description": "Bright corner unit, freshly painted.",
    }
    with patch(_HAIKU_PATCH, new=AsyncMock(return_value={})):
        res = client.post("/analysis/", json=payload)
    assert res.status_code == 200
    assert res.json()["extraction_status"] == "ok"


def test_extraction_status_partial_keeps_regex_flags_when_haiku_fails() -> None:
    """A failed Haiku read is not a clean scan: status says partial, and the
    deterministic pattern flags still fire."""
    client = TestClient(app)
    payload = {
        **_VAUGHAN_PAYLOAD,
        "description": "Sold as-is, where-is. Former grow op, fully remediated.",
    }
    with patch(_HAIKU_PATCH, new=AsyncMock(side_effect=HaikuExtractionError("429"))):
        res = client.post("/analysis/", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["extraction_status"] == "partial"
    ids = {f["flag_id"] for f in body["risk_flags"]}
    assert "grow_op_history" in ids, ids
