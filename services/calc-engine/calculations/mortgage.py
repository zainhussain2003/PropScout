"""
Mortgage payment and amortisation calculations.
Pure functions — no database, no API calls, fully testable.
"""

import math


def calculate_monthly_payment(
    principal: float,
    annual_rate: float,
    amortization_years: int,
) -> float:
    """
    Calculate the fixed monthly mortgage payment using the standard annuity formula.

    Args:
        principal: Loan amount in dollars.
        annual_rate: Annual interest rate as a decimal (e.g. 0.0479 for 4.79%).
        amortization_years: Amortization period in years.

    Returns:
        Monthly payment in dollars.
    """
    monthly_rate = annual_rate / 12
    n = amortization_years * 12

    if monthly_rate == 0:
        return principal / n

    payment = principal * (monthly_rate * (1 + monthly_rate) ** n) / ((1 + monthly_rate) ** n - 1)
    return round(payment, 2)


def calculate_osfi_stress_rate(contract_rate: float) -> float:
    """
    Calculate the OSFI B-20 stress test qualifying rate.
    Borrowers must qualify at the higher of: contract rate + 2%, or 5.25%.

    Args:
        contract_rate: The actual mortgage contract rate as a decimal.

    Returns:
        The qualifying rate for stress test purposes.
    """
    return max(contract_rate + 0.02, 0.0525)


def calculate_amortization_schedule(
    principal: float,
    annual_rate: float,
    amortization_years: int,
) -> list[dict[str, float]]:
    """
    Generate a year-by-year amortization schedule.

    Args:
        principal: Loan amount in dollars.
        annual_rate: Annual interest rate as a decimal.
        amortization_years: Amortization period in years.

    Returns:
        List of yearly snapshots with keys: year, balance, principal_paid, interest_paid.
    """
    monthly_rate = annual_rate / 12
    monthly_payment = calculate_monthly_payment(principal, annual_rate, amortization_years)
    balance = principal
    schedule = []

    for year in range(1, amortization_years + 1):
        year_principal = 0.0
        year_interest = 0.0

        for _ in range(12):
            interest = balance * monthly_rate
            principal_paid = monthly_payment - interest
            balance = max(0.0, balance - principal_paid)
            year_principal += principal_paid
            year_interest += interest

        schedule.append({
            'year': float(year),
            'balance': round(balance, 2),
            'principal_paid': round(year_principal, 2),
            'interest_paid': round(year_interest, 2),
        })

    return schedule
