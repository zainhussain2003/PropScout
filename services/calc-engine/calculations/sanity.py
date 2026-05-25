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


_BOUNDS = SanityBounds()


def sanity_check_metrics(
    *,
    cap_rate: float,
    monthly_rent: float,
    purchase_price: float,
    dscr: float,
    break_even_rent: float,
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

    return warnings
