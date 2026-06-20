"""
Pydantic Data Models

Type-safe data structures for financial calculations matching the
TypeScript interfaces and PostgreSQL schema.
"""

from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# ============================================================================
# Enums & Types
# ============================================================================

class LeaseType(str, Enum):
    """Lease structure types"""
    NNN = "NNN"  # Triple Net
    MODIFIED_GROSS = "Modified Gross"
    GROSS = "Gross"
    GROUND_LEASE = "Ground Lease"
    ABSOLUTE_NNN = "Absolute NNN"


class EscalationType(str, Enum):
    """Rent escalation types"""
    FIXED_PCT = "Fixed Percentage"
    FIXED_DOLLAR = "Fixed Dollar"
    CPI = "CPI"
    STEPPED = "Stepped"
    NONE = "None"


class RecoveryStructure(str, Enum):
    """Expense recovery structures"""
    GROSS = "Gross"
    NNN = "NNN"
    MODIFIED_GROSS = "Modified Gross"
    INDUSTRIAL_GROSS = "Industrial Gross"


class PeriodType(str, Enum):
    """Cash flow period types"""
    MONTHLY = "monthly"
    ANNUAL = "annual"


# ============================================================================
# Lease Models
# ============================================================================

class BaseRentSchedule(BaseModel):
    """Base rent schedule period"""
    period_start_date: date
    period_end_date: date
    base_rent_annual: float = Field(ge=0)
    base_rent_monthly: float = Field(ge=0)
    base_rent_psf_annual: float = Field(ge=0)


class RentEscalation(BaseModel):
    """Rent escalation structure"""
    escalation_type: EscalationType
    escalation_pct: Optional[float] = Field(None, ge=0, le=1)
    escalation_frequency: Optional[str] = "Annual"
    cpi_floor_pct: Optional[float] = Field(None, ge=0, le=1)
    cpi_cap_pct: Optional[float] = Field(None, ge=0, le=1)


class PercentageRent(BaseModel):
    """Percentage rent (retail)"""
    breakpoint_amount: float = Field(ge=0)
    percentage_rate: float = Field(ge=0, le=1)
    prior_year_sales: Optional[float] = Field(None, ge=0)


class ExpenseRecovery(BaseModel):
    """Expense recovery structure"""
    recovery_structure: RecoveryStructure
    property_tax_recovery_pct: float = Field(ge=0, le=1)
    insurance_recovery_pct: float = Field(ge=0, le=1)
    cam_recovery_pct: float = Field(ge=0, le=1)
    utilities_recovery_pct: Optional[float] = Field(0, ge=0, le=1)
    expense_cap_psf: Optional[float] = Field(None, ge=0)
    expense_cap_escalation_pct: Optional[float] = Field(None, ge=0, le=1)


class LeaseData(BaseModel):
    """Complete lease data structure"""
    lease_id: int
    space_id: int
    tenant_id: int
    tenant_name: str
    lease_type: LeaseType
    lease_status: str
    lease_commencement_date: date
    lease_expiration_date: date
    leased_sf: float = Field(gt=0)

    base_rent: List[BaseRentSchedule]
    escalation: Optional[RentEscalation] = None
    percentage_rent: Optional[PercentageRent] = None
    expense_recovery: ExpenseRecovery


# ============================================================================
# Property Models
# ============================================================================

class PropertyData(BaseModel):
    """Property master data"""
    cre_property_id: int
    property_name: str
    rentable_sf: float = Field(gt=0)
    acquisition_price: float = Field(gt=0)
    leases: List[LeaseData]


# ============================================================================
# Operating Expenses
# ============================================================================

class OperatingExpenses(BaseModel):
    """Operating expenses for a period"""
    period_date: date
    property_taxes: float = Field(ge=0)
    insurance: float = Field(ge=0)
    cam_expenses: float = Field(ge=0)
    utilities: float = Field(ge=0)
    management_fee_pct: float = Field(ge=0, le=1)
    repairs_maintenance: float = Field(ge=0)
    other_expenses: float = Field(ge=0)


# ============================================================================
# Capital Items
# ============================================================================

class CapitalItems(BaseModel):
    """Capital expenditures for a period"""
    period_date: date
    capital_reserves: float = Field(ge=0)
    tenant_improvements: float = Field(ge=0)
    leasing_commissions: float = Field(ge=0)


# ============================================================================
# Debt
# ============================================================================

class DebtAssumptions(BaseModel):
    """Debt facility assumptions"""
    loan_amount: float = Field(gt=0)
    interest_rate: float = Field(gt=0, le=1)
    amortization_years: int = Field(gt=0, le=50)
    annual_debt_service: float = Field(ge=0)

    @field_validator("annual_debt_service", mode="before")
    @classmethod
    def calculate_debt_service(cls, v: Optional[float], info) -> float:
        """Auto-calculate annual debt service if not provided"""
        if v is None or v == 0:
            # Calculate from loan amount, rate, and amortization
            loan_amount = info.data.get("loan_amount", 0)
            interest_rate = info.data.get("interest_rate", 0)
            amortization_years = info.data.get("amortization_years", 0)

            if loan_amount and interest_rate and amortization_years:
                # PMT calculation
                monthly_rate = interest_rate / 12
                num_payments = amortization_years * 12
                monthly_payment = (
                    loan_amount
                    * (monthly_rate * (1 + monthly_rate) ** num_payments)
                    / ((1 + monthly_rate) ** num_payments - 1)
                )
                return monthly_payment * 12
        return v or 0


# ============================================================================
# Cash Flow Results
# ============================================================================

class CashFlowPeriod(BaseModel):
    """Cash flow for a single period"""
    period_id: int
    period_date: date
    period_type: PeriodType

    # Revenue
    base_rent: float
    escalated_rent: float
    percentage_rent: float
    expense_recoveries: float
    vacancy_loss: float
    credit_loss: float
    effective_gross_income: float

    # Expenses
    operating_expenses: float
    net_operating_income: float

    # Capital & Debt
    capital_expenditures: float
    debt_service: float

    # Net cash flow
    net_cash_flow: float


# ============================================================================
# Investment Metrics
# ============================================================================

class InvestmentMetricsResult(BaseModel):
    """Investment return metrics"""
    # Investment summary
    acquisition_price: float
    total_equity_invested: float
    debt_amount: float
    hold_period_years: int

    # Exit assumptions
    exit_cap_rate: float
    terminal_noi: float
    exit_value: float
    selling_costs_pct: float = 0.03
    net_reversion: float

    # Return metrics
    levered_irr: float
    unlevered_irr: float
    npv: float
    equity_multiple: float
    cash_on_cash_year_1: float
    avg_dscr: Optional[float] = None

    # Cash flow totals
    total_cash_distributed: float
    total_noi: float


# ============================================================================
# Sensitivity Analysis
# ============================================================================

class SensitivityVariable(BaseModel):
    """Variable for sensitivity analysis"""
    name: str
    base_value: float
    swing_pct: float = 0.10  # +/- 10% default


class TornadoResult(BaseModel):
    """Tornado chart result for a single variable"""
    variable: str
    base_value: float
    upside_value: float
    downside_value: float
    upside_irr: float
    downside_irr: float
    range: float
    impact_bps: float  # Impact in basis points


# ============================================================================
# Monte Carlo
# ============================================================================

class DistributionType(str, Enum):
    """Statistical distribution types"""
    NORMAL = "normal"
    TRIANGULAR = "triangular"
    UNIFORM = "uniform"
    LOGNORMAL = "lognormal"


class VariableDistribution(BaseModel):
    """Variable distribution for Monte Carlo"""
    variable_name: str
    distribution_type: DistributionType
    # Parameters vary by distribution
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    mode: Optional[float] = None  # For triangular


class MonteCarloResult(BaseModel):
    """Monte Carlo simulation results"""
    num_simulations: int
    mean_irr: float
    median_irr: float
    std_dev: float
    coefficient_of_variation: float

    # Percentiles
    p10_irr: float
    p25_irr: float
    p75_irr: float
    p90_irr: float

    # Probability analysis
    probability_irr_above_target: Optional[float] = None
    target_irr: Optional[float] = None


# ============================================================================
# Waterfall Distribution
# ============================================================================

class WaterfallTier(BaseModel):
    """Single tier in distribution waterfall"""
    tier_number: int
    tier_name: str
    tier_type: Literal["return_of_capital", "preferred_return", "catch_up", "residual_split"]
    threshold_amount: Optional[float] = None
    gp_split_pct: float = Field(ge=0, le=1)
    lp_split_pct: float = Field(ge=0, le=1)

    @field_validator("lp_split_pct")
    @classmethod
    def validate_splits_sum_to_one(cls, v: float, info) -> float:
        """Ensure GP + LP splits = 100%"""
        gp_split = info.data.get("gp_split_pct", 0)
        total = gp_split + v
        if not (0.999 <= total <= 1.001):  # Allow small floating point errors
            raise ValueError(f"GP + LP splits must equal 100% (got {total*100:.1f}%)")
        return v


class WaterfallDistributionResult(BaseModel):
    """Results of waterfall distribution calculation"""
    total_cash_available: float
    total_distributed: float
    remaining_cash: float

    gp_total: float
    lp_total: float

    tier_distributions: List[dict]  # Detail by tier
