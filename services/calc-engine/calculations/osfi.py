"""
OSFI B-20 stress test calculation.
Determines the qualifying mortgage amount at the stress test rate.
"""

from .mortgage import calculate_monthly_payment, calculate_osfi_stress_rate


def calculate_stress_test_payment(
    mortgage_amount: float,
    contract_rate: float,
    amortization_years: int,
) -> float:
    """
    Calculate the monthly payment at the OSFI stress test rate.

    Args:
        mortgage_amount: Total mortgage principal.
        contract_rate: Actual contract rate as a decimal.
        amortization_years: Amortization period.

    Returns:
        Monthly payment at the qualifying rate.
    """
    qualifying_rate = calculate_osfi_stress_rate(contract_rate)
    return calculate_monthly_payment(mortgage_amount, qualifying_rate, amortization_years)


def passes_stress_test(
    annual_income: float,
    mortgage_amount: float,
    contract_rate: float,
    amortization_years: int,
    gds_limit: float = 0.39,
    tds_limit: float = 0.44,
    other_monthly_debts: float = 0.0,
    annual_property_tax: float = 0.0,
    monthly_heating: float = 150.0,
    condo_fee_monthly: float = 0.0,
) -> dict[str, object]:
    """
    Determine if a borrower passes the OSFI B-20 GDS/TDS stress test.

    Args:
        annual_income: Total annual gross income.
        mortgage_amount: Total mortgage principal.
        contract_rate: Actual contract rate as a decimal.
        amortization_years: Amortization period.
        gds_limit: Gross Debt Service ratio limit (default 39%).
        tds_limit: Total Debt Service ratio limit (default 44%).
        other_monthly_debts: Monthly payments on other debts (car, student loans, etc.).
        annual_property_tax: Annual property tax.
        monthly_heating: Monthly heating estimate (default $150).
        condo_fee_monthly: Monthly condo fee (50% is included in GDS per CMHC rules).

    Returns:
        Dict with pass/fail status and ratio values.
    """
    stress_payment = calculate_stress_test_payment(mortgage_amount, contract_rate, amortization_years)
    monthly_income = annual_income / 12
    monthly_tax = annual_property_tax / 12
    condo_gds_portion = condo_fee_monthly * 0.5  # CMHC: 50% of condo fee in GDS

    gds = (stress_payment + monthly_tax + monthly_heating + condo_gds_portion) / monthly_income
    tds = gds + (other_monthly_debts / monthly_income)

    return {
        'passes': gds <= gds_limit and tds <= tds_limit,
        'gds': round(gds, 4),
        'tds': round(tds, 4),
        'qualifying_rate': calculate_osfi_stress_rate(contract_rate),
        'stress_payment_monthly': stress_payment,
    }
