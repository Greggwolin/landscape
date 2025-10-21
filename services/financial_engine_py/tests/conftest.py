"""
Pytest configuration and shared fixtures.

Provides test data and fixtures used across all test modules.
"""

import pytest
from datetime import date, timedelta
from financial_engine.models import (
    PropertyData,
    LeaseData,
    BaseRentSchedule,
    RentEscalation,
    ExpenseRecovery,
    OperatingExpenses,
    CapitalItems,
    DebtAssumptions,
)


@pytest.fixture
def simple_property() -> PropertyData:
    """
    Simple property with one tenant for basic testing.

    10,000 SF office building, $2M purchase, single 5-year lease.
    """
    lease = LeaseData(
        lease_id=1,
        space_id=1,
        tenant_id=1,
        tenant_name="Test Tenant",
        lease_type="Gross",
        lease_status="Active",
        lease_commencement_date=date(2025, 1, 1),
        lease_expiration_date=date(2029, 12, 31),
        leased_sf=10000,
        base_rent=[
            BaseRentSchedule(
                period_start_date=date(2025, 1, 1),
                period_end_date=date(2029, 12, 31),
                base_rent_annual=300_000,
                base_rent_monthly=25_000,
                base_rent_psf_annual=30.0,
            )
        ],
        escalation=None,  # No escalation for simplicity
        expense_recovery=ExpenseRecovery(
            recovery_structure="Gross",
            property_tax_recovery_pct=0,
            insurance_recovery_pct=0,
            cam_recovery_pct=0,
        ),
    )

    return PropertyData(
        cre_property_id=1,
        property_name="Test Property",
        rentable_sf=10000,
        acquisition_price=2_000_000,
        leases=[lease],
    )


@pytest.fixture
def nnn_property() -> PropertyData:
    """
    Property with NNN lease for expense recovery testing.

    20,000 SF retail, $5M purchase, NNN lease with full expense recovery.
    """
    lease = LeaseData(
        lease_id=2,
        space_id=2,
        tenant_id=2,
        tenant_name="Retail Tenant",
        lease_type="NNN",
        lease_status="Active",
        lease_commencement_date=date(2025, 1, 1),
        lease_expiration_date=date(2034, 12, 31),
        leased_sf=20000,
        base_rent=[
            BaseRentSchedule(
                period_start_date=date(2025, 1, 1),
                period_end_date=date(2034, 12, 31),
                base_rent_annual=600_000,
                base_rent_monthly=50_000,
                base_rent_psf_annual=30.0,
            )
        ],
        escalation=RentEscalation(
            escalation_type="Fixed Percentage",
            escalation_pct=3.0,
            escalation_frequency="Annual",
            cpi_floor_pct=0,
            cpi_cap_pct=0,
        ),
        expense_recovery=ExpenseRecovery(
            recovery_structure="Triple Net (NNN)",
            property_tax_recovery_pct=100,
            insurance_recovery_pct=100,
            cam_recovery_pct=100,
        ),
    )

    return PropertyData(
        cre_property_id=2,
        property_name="NNN Retail Center",
        rentable_sf=20000,
        acquisition_price=5_000_000,
        leases=[lease],
    )


@pytest.fixture
def monthly_opex() -> OperatingExpenses:
    """Standard monthly operating expenses for a 10,000 SF property."""
    return OperatingExpenses(
        period_date=date(2025, 1, 1),
        property_taxes=2_000,  # $24k/year
        insurance=500,  # $6k/year
        cam_expenses=2_000,  # $24k/year
        utilities=800,  # $9.6k/year
        management_fee_pct=3.0,
        repairs_maintenance=600,  # $7.2k/year
        other_expenses=400,  # $4.8k/year
    )


@pytest.fixture
def monthly_capital() -> CapitalItems:
    """Standard monthly capital items."""
    return CapitalItems(
        period_date=date(2025, 1, 1),
        capital_reserves=500,  # $6k/year
        tenant_improvements=0,
        leasing_commissions=0,
    )


@pytest.fixture
def debt_70ltv() -> DebtAssumptions:
    """
    70% LTV debt on $2M property = $1.4M loan.

    5.5% interest, 30-year amortization.
    """
    loan_amount = 1_400_000
    interest_rate = 0.055
    amortization_years = 30

    # Calculate monthly payment
    monthly_rate = interest_rate / 12
    num_payments = amortization_years * 12
    monthly_payment = (
        loan_amount
        * (monthly_rate * (1 + monthly_rate) ** num_payments)
        / ((1 + monthly_rate) ** num_payments - 1)
    )
    annual_debt_service = monthly_payment * 12

    return DebtAssumptions(
        loan_amount=loan_amount,
        interest_rate=interest_rate,
        amortization_years=amortization_years,
        annual_debt_service=annual_debt_service,
    )


@pytest.fixture
def known_irr_case():
    """
    Known IRR test case with validated answer.

    This is the Excel XIRR example from numpy-financial docs.
    Expected IRR: 7.93%
    """
    return {
        "initial_investment": 10_000_000,
        "cash_flows": [500_000, 500_000, 500_000, 500_000, 500_000],
        "reversion_value": 11_000_000,
        "expected_irr": 0.0793,  # 7.93%
        "tolerance": 0.0001,  # Within 0.01%
    }


@pytest.fixture
def known_npv_case():
    """
    Known NPV test case.

    $10M investment, $500k annual cash flow, $11M exit after 5 years.
    At 10% discount rate, NPV should be ~$1.24M.
    """
    return {
        "discount_rate": 0.10,
        "initial_investment": 10_000_000,
        "cash_flows": [500_000, 500_000, 500_000, 500_000, 500_000],
        "reversion_value": 11_000_000,
        "expected_npv": 1_234_567,  # Approximate
        "tolerance": 50_000,  # Within $50k
    }


@pytest.fixture
def known_dscr_case():
    """
    Known DSCR test case.

    $650k NOI, $483k annual debt service = 1.35x DSCR
    """
    return {
        "noi": 650_000,
        "annual_debt_service": 483_000,
        "expected_dscr": 1.35,
        "tolerance": 0.01,
    }
