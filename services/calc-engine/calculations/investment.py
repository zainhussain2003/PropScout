"""
Investment metric calculations: cap rate, CoC, DSCR, GRM, cash flow, NOI.
Pure functions — no database, no API calls, fully testable.
"""

from constants.rates import VACANCY_ALLOWANCE, MANAGEMENT_FEE, INSURANCE_RATE
from .mortgage import calculate_monthly_payment, calculate_osfi_stress_rate
from .closing_costs import estimate_closing_costs


def calculate_noi(
    gross_annual_rent: float,
    annual_taxes: float,
    insurance_value: float,
    condo_fee_annual: float,
    maintenance_rate: float,
    property_value: float,
    include_management: bool = False,
    vacancy_allowance: float = VACANCY_ALLOWANCE,
) -> float:
    """
    Calculate Net Operating Income (NOI).

    NOI = Gross Rent × (1 - vacancy) - operating expenses

    Args:
        gross_annual_rent: Annual rent at full occupancy.
        annual_taxes: Annual property tax.
        insurance_value: Property value used for insurance calculation.
        condo_fee_annual: Annual condo / maintenance fee.
        maintenance_rate: Maintenance reserve as a decimal of property value.
        property_value: Purchase price (used for maintenance + insurance).
        include_management: Whether to include management fee.
        vacancy_allowance: Fraction of rent lost to vacancy (default 5%).

    Returns:
        Net Operating Income in dollars per year.
    """
    effective_gross_income = gross_annual_rent * (1 - vacancy_allowance)
    insurance = insurance_value * INSURANCE_RATE
    maintenance = property_value * maintenance_rate
    management = gross_annual_rent * MANAGEMENT_FEE if include_management else 0.0

    total_expenses = (
        annual_taxes + insurance + condo_fee_annual + maintenance + management
    )
    return effective_gross_income - total_expenses


def calculate_cap_rate(noi: float, purchase_price: float) -> float:
    """
    Calculate the capitalisation rate.

    Args:
        noi: Net Operating Income (annual).
        purchase_price: Total purchase price.

    Returns:
        Cap rate as a decimal (e.g. 0.045 = 4.5%).
    """
    if purchase_price <= 0:
        raise ValueError("Purchase price must be greater than zero")
    return noi / purchase_price


def calculate_cash_flow_monthly(
    monthly_rent: float,
    mortgage_payment: float,
    annual_taxes: float,
    insurance_value: float,
    condo_fee_monthly: float,
    maintenance_rate: float,
    property_value: float,
    include_management: bool = False,
    vacancy_allowance: float = VACANCY_ALLOWANCE,
) -> float:
    """
    Calculate monthly cash flow (rent net of all expenses and mortgage).

    Returns:
        Monthly cash flow in dollars (negative = loss).
    """
    effective_rent = monthly_rent * (1 - vacancy_allowance)
    insurance_monthly = (property_value * INSURANCE_RATE) / 12
    maintenance_monthly = (property_value * maintenance_rate) / 12
    taxes_monthly = annual_taxes / 12
    management_monthly = monthly_rent * MANAGEMENT_FEE if include_management else 0.0

    total_monthly_expenses = (
        mortgage_payment
        + taxes_monthly
        + insurance_monthly
        + condo_fee_monthly
        + maintenance_monthly
        + management_monthly
    )
    return effective_rent - total_monthly_expenses


def calculate_dscr(noi: float, annual_debt_service: float) -> float:
    """
    Calculate Debt Service Coverage Ratio.

    DSCR = NOI / Annual Debt Service
    A DSCR >= 1.0 means the property cash-flows positively before expenses.

    Args:
        noi: Net Operating Income.
        annual_debt_service: Annual mortgage payment total.

    Returns:
        DSCR as a ratio (e.g. 0.85).
    """
    if annual_debt_service <= 0:
        raise ValueError("Annual debt service must be greater than zero")
    return noi / annual_debt_service


def calculate_grm(purchase_price: float, annual_gross_rent: float) -> float:
    """
    Calculate Gross Rent Multiplier.

    GRM = Purchase Price / Annual Gross Rent
    Lower is generally better (more rent per dollar of price).

    Args:
        purchase_price: Total purchase price.
        annual_gross_rent: Annual rent at full occupancy.

    Returns:
        GRM ratio.
    """
    if annual_gross_rent <= 0:
        raise ValueError("Annual gross rent must be greater than zero")
    return purchase_price / annual_gross_rent


def calculate_cash_on_cash(
    annual_cash_flow: float, total_cash_invested: float
) -> float:
    """
    Calculate Cash-on-Cash return.

    CoC = Annual Cash Flow / Total Cash Invested
    Total cash invested = down payment + closing costs.

    Returns:
        CoC as a decimal (e.g. 0.06 = 6%).
    """
    if total_cash_invested <= 0:
        raise ValueError("Total cash invested must be greater than zero")
    return annual_cash_flow / total_cash_invested


def calculate_break_even_rent(
    mortgage_payment: float,
    annual_taxes: float,
    insurance_value: float,
    condo_fee_monthly: float,
    maintenance_rate: float,
    property_value: float,
    include_management: bool = False,
) -> float:
    """
    Calculate the minimum monthly rent required to break even.

    Returns:
        Break-even rent in dollars per month.
    """
    insurance_monthly = (property_value * INSURANCE_RATE) / 12
    maintenance_monthly = (property_value * maintenance_rate) / 12
    taxes_monthly = annual_taxes / 12

    fixed_costs = (
        mortgage_payment
        + taxes_monthly
        + insurance_monthly
        + condo_fee_monthly
        + maintenance_monthly
    )

    if include_management:
        # Solve: rent × (1 - vacancy - management%) = fixed_costs
        # rent = fixed_costs / (1 - vacancy - management%)
        net_factor = 1 - VACANCY_ALLOWANCE - MANAGEMENT_FEE
    else:
        net_factor = 1 - VACANCY_ALLOWANCE

    if net_factor <= 0:
        return float("inf")

    return fixed_costs / net_factor


def calculate_financing_scenarios(
    purchase_price: float,
    monthly_rent: float,
    annual_taxes: float,
    condo_fee_monthly: float,
    maintenance_rate: float,
    base_down_pct: float,
    base_rate: float,
    amortization_years: int = 25,
    is_toronto: bool = False,
    include_management: bool = False,
) -> list[dict[str, object]]:
    """
    Calculate all four standard financing scenarios for a property.

    The four scenarios are:
      1. Base       — user's inputs as-is
      2. OSFI stress — same down, qualifying rate = max(contract + 2%, 5.25%)
      3. Higher down — 35% down, same rate and amortization
      4. Conservative — same down, rate + 2% (stress without the OSFI floor)

    NOI and cap rate are the same across all scenarios (they depend on rent and
    expenses, not financing). Monthly mortgage, cash flow, DSCR, CoC, and
    break-even rent all vary.

    Invariant: scenario 2 always has the highest monthly mortgage payment;
    scenario 3 always has the lowest (larger down = smaller principal).

    Args:
        purchase_price: Total purchase price in dollars.
        monthly_rent: Estimated monthly rent at full occupancy.
        annual_taxes: Annual property tax in dollars.
        condo_fee_monthly: Monthly condo / maintenance fee (0 if none).
        maintenance_rate: Maintenance reserve as a decimal of property value.
        base_down_pct: Base down payment as a decimal (e.g. 0.20 = 20%).
        base_rate: Base mortgage rate as a decimal (e.g. 0.0479 = 4.79%).
        amortization_years: Amortization period in years (default 25).
        is_toronto: Whether the property is in Toronto (adds MLTT).
        include_management: Whether to include an 8% management fee in expenses.

    Returns:
        List of 4 scenario dicts, each containing:
            name (str): Human-readable scenario label.
            down_pct (float): Down payment fraction used.
            rate (float): Mortgage rate used.
            amortization_years (int): Amortization period.
            down_payment (float): Dollar amount of down payment.
            principal (float): Mortgage principal.
            total_cash_invested (float): Down + LTT + closing costs.
            monthly_mortgage (float): Monthly P+I payment.
            annual_debt_service (float): Annual mortgage cost.
            noi (float): Net Operating Income (same across all scenarios).
            cap_rate (float): Cap rate (same across all scenarios).
            monthly_cash_flow (float): Monthly cash flow after all costs.
            annual_cash_flow (float): Annual cash flow.
            dscr (float): Debt service coverage ratio.
            cash_on_cash (float): Annual cash flow / total cash invested.
            break_even_rent (float): Minimum rent to break even per month.
    """
    gross_annual_rent = monthly_rent * 12

    # NOI and cap rate are financing-independent — compute once
    noi = calculate_noi(
        gross_annual_rent=gross_annual_rent,
        annual_taxes=annual_taxes,
        insurance_value=purchase_price,
        condo_fee_annual=condo_fee_monthly * 12,
        maintenance_rate=maintenance_rate,
        property_value=purchase_price,
        include_management=include_management,
    )
    cap_rate = calculate_cap_rate(noi=noi, purchase_price=purchase_price)

    # Closing costs are financing-independent (includes provincial + municipal LTT)
    closing = estimate_closing_costs(
        purchase_price=purchase_price,
        is_toronto=is_toronto,
    )

    # Define the four scenarios as (name, down_pct, rate)
    osfi_rate = calculate_osfi_stress_rate(base_rate)
    scenarios_def = [
        ("Base", base_down_pct, base_rate),
        ("OSFI stress", base_down_pct, osfi_rate),
        ("Higher down (35%)", 0.35, base_rate),
        ("Conservative (+2%)", base_down_pct, base_rate + 0.02),
    ]

    results = []
    for name, down_pct, rate in scenarios_def:
        down_payment = purchase_price * down_pct
        principal = purchase_price - down_payment
        total_cash_invested = down_payment + closing["total"]

        monthly_mortgage = calculate_monthly_payment(
            principal=principal,
            annual_rate=rate,
            amortization_years=amortization_years,
        )
        annual_debt_service = monthly_mortgage * 12

        monthly_cf = calculate_cash_flow_monthly(
            monthly_rent=monthly_rent,
            mortgage_payment=monthly_mortgage,
            annual_taxes=annual_taxes,
            insurance_value=purchase_price,
            condo_fee_monthly=condo_fee_monthly,
            maintenance_rate=maintenance_rate,
            property_value=purchase_price,
            include_management=include_management,
        )
        annual_cf = monthly_cf * 12

        dscr = calculate_dscr(noi=noi, annual_debt_service=annual_debt_service)
        coc = calculate_cash_on_cash(
            annual_cash_flow=annual_cf,
            total_cash_invested=total_cash_invested,
        )
        break_even = calculate_break_even_rent(
            mortgage_payment=monthly_mortgage,
            annual_taxes=annual_taxes,
            insurance_value=purchase_price,
            condo_fee_monthly=condo_fee_monthly,
            maintenance_rate=maintenance_rate,
            property_value=purchase_price,
            include_management=include_management,
        )

        results.append(
            {
                "name": name,
                "down_pct": down_pct,
                "rate": rate,
                "amortization_years": amortization_years,
                "down_payment": down_payment,
                "principal": principal,
                "total_cash_invested": total_cash_invested,
                "monthly_mortgage": monthly_mortgage,
                "annual_debt_service": annual_debt_service,
                "noi": noi,
                "cap_rate": cap_rate,
                "monthly_cash_flow": monthly_cf,
                "annual_cash_flow": annual_cf,
                "dscr": dscr,
                "cash_on_cash": coc,
                "break_even_rent": break_even,
            }
        )

    return results
