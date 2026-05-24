"""
Investment metric calculations: cap rate, CoC, DSCR, GRM, cash flow, NOI.
Pure functions — no database, no API calls, fully testable.
"""

from constants.rates import VACANCY_ALLOWANCE, MANAGEMENT_FEE, INSURANCE_RATE


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
