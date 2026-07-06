"""
Sanity checks for analysis output values.

Runs after every analysis before the response is returned to the API layer.
Returns a list of warning strings — empty list means all checks passed.

These are not errors: the analysis still returns if checks fail, but the
result is flagged with has_sanity_warnings=True so the UI can show a notice
and the failure is logged to Supabase for review.

Rule of thumb for bounds:
  - If a real Canadian property could produce this value, allow it.
  - If it would require a data entry error, flag it.
"""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class SanityBounds:
    """
    Numeric bounds used in sanity checks.
    All dollar values in CAD. Rates as decimals.
    """

    # Cap rate: 0% = NOI barely covers expenses; 20% = unrealistically high yield
    cap_rate_min: float = 0.0
    cap_rate_max: float = 0.20

    # Monthly rent: $500 = basement room minimum; $15,000 = very high-end unit
    monthly_rent_min: float = 500.0
    monthly_rent_max: float = 15_000.0

    # Purchase price: $50K = condemned/rural fringe; $10M = well above Ontario luxury
    purchase_price_min: float = 50_000.0
    purchase_price_max: float = 10_000_000.0

    # DSCR: above 5.0 is almost certainly a data error (NOI input too high)
    dscr_max: float = 5.0

    # Break-even rent vs market rent ratio: above 3× means the numbers are extreme
    break_even_rent_ratio_max: float = 3.0

    # Deal score: the engine produces 0–95 (sum of component maxes). Anything
    # outside this range means a scoring bug, not a bad deal.
    deal_score_min: float = 0.0
    deal_score_max: float = 95.0

    # Monthly cash flow: beyond ±$20K/mo on a residential property means a data
    # error in rent or expenses, not a real (if extreme) deal.
    cash_flow_monthly_abs_max: float = 20_000.0


_BOUNDS = SanityBounds()


def sanity_check_metrics(
    *,
    cap_rate: float,
    monthly_rent: float,
    purchase_price: float,
    dscr: float,
    break_even_rent: float,
    deal_score: float | None = None,
    cash_flow_monthly: float | None = None,
    bounds: SanityBounds = _BOUNDS,
) -> list[str]:
    """
    Run sanity checks on computed analysis outputs.

    Checks are intentionally permissive — they flag clear data errors, not
    merely bad deals. A score of 0 on a deeply negative property is not a
    sanity failure; a cap rate of 450% is.

    Args:
        cap_rate: Cap rate as a decimal (e.g. 0.045 = 4.5%).
        monthly_rent: Estimated monthly rent at full occupancy, in dollars.
        purchase_price: Property purchase price, in dollars.
        dscr: Debt service coverage ratio.
        break_even_rent: Monthly rent required to break even, in dollars.
        deal_score: Final deal score (0–95). Optional — checked only when provided.
        cash_flow_monthly: Monthly cash flow in dollars. Optional — checked only
            when provided.
        bounds: Override default bounds for testing (use default in production).

    Returns:
        List of human-readable warning strings.
        Empty list = all checks passed.

    Example::

        warnings = sanity_check_metrics(
            cap_rate=0.025,
            monthly_rent=2_900,
            purchase_price=729_900,
            dscr=0.36,
            break_even_rent=4_585,
        )
        # returns [] — all values are within realistic bounds
    """
    warnings: list[str] = []

    # ── Cap rate ──────────────────────────────────────────────────────────────
    if not (bounds.cap_rate_min <= cap_rate <= bounds.cap_rate_max):
        warnings.append(
            f"Cap rate {cap_rate:.2%} is outside the expected range "
            f"({bounds.cap_rate_min:.0%}–{bounds.cap_rate_max:.0%}). "
            "Check rent and purchase price inputs."
        )

    # ── Monthly rent ─────────────────────────────────────────────────────────
    if not (bounds.monthly_rent_min <= monthly_rent <= bounds.monthly_rent_max):
        warnings.append(
            f"Monthly rent ${monthly_rent:,.0f} is outside the expected range "
            f"(${bounds.monthly_rent_min:,.0f}–${bounds.monthly_rent_max:,.0f}). "
            "Verify rent estimate."
        )

    # ── Purchase price ────────────────────────────────────────────────────────
    if not (bounds.purchase_price_min <= purchase_price <= bounds.purchase_price_max):
        warnings.append(
            f"Purchase price ${purchase_price:,.0f} is outside the expected range "
            f"(${bounds.purchase_price_min:,.0f}–${bounds.purchase_price_max:,.0f}). "
            "Verify listing price."
        )

    # ── DSCR ─────────────────────────────────────────────────────────────────
    if dscr > bounds.dscr_max:
        warnings.append(
            f"DSCR of {dscr:.2f}x exceeds {bounds.dscr_max:.1f}x — "
            "this is unusually high and may indicate a data entry error in rent or expenses."
        )

    # ── Break-even rent must be a finite number ───────────────────────────────
    # calculate_break_even_rent returns float("inf") when net_factor <= 0
    # (unreachable with current constants, but constants change) and NaN would
    # slip through every comparison-based check below. Named explicitly so the
    # warning says what happened rather than relying on the 3×-ratio check to
    # catch infinity by accident.
    if not math.isfinite(break_even_rent):
        warnings.append(
            f"Break-even rent ({break_even_rent}) is not a finite number — "
            "expense factors (vacancy + management) consumed the entire rent. "
            "Verify rate constants."
        )
        break_even_rent = 0.0  # neutralise for the comparison checks below

    # ── Break-even rent vs market rent ────────────────────────────────────────
    if (
        monthly_rent > 0
        and break_even_rent > monthly_rent * bounds.break_even_rent_ratio_max
    ):
        warnings.append(
            f"Break-even rent (${break_even_rent:,.0f}/mo) is more than "
            f"{bounds.break_even_rent_ratio_max:.0f}× the estimated market rent "
            f"(${monthly_rent:,.0f}/mo). Verify expense inputs."
        )

    # ── Break-even rent must not be negative ──────────────────────────────────
    # A negative break-even implies you'd profit at $0 rent — impossible on a
    # leveraged purchase, so it signals an expense-input error.
    if break_even_rent < 0:
        warnings.append(
            f"Break-even rent (${break_even_rent:,.0f}/mo) is negative — "
            "verify expense and mortgage inputs."
        )

    # ── Deal score ────────────────────────────────────────────────────────────
    if deal_score is not None and not (
        bounds.deal_score_min <= deal_score <= bounds.deal_score_max
    ):
        warnings.append(
            f"Deal score {deal_score:.0f} is outside the valid range "
            f"({bounds.deal_score_min:.0f}–{bounds.deal_score_max:.0f}) — "
            "this indicates a scoring bug, not a bad deal."
        )

    # ── Monthly cash flow ─────────────────────────────────────────────────────
    if (
        cash_flow_monthly is not None
        and abs(cash_flow_monthly) > bounds.cash_flow_monthly_abs_max
    ):
        warnings.append(
            f"Monthly cash flow ${cash_flow_monthly:,.0f} is implausible "
            f"(beyond ±${bounds.cash_flow_monthly_abs_max:,.0f}). "
            "Verify rent and expense inputs."
        )

    return warnings
