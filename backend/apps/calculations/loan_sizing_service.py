"""
Loan sizing and loan budget calculation service.

This module centralizes debt sizing math so both API responses and
cash-flow services use the same calculations.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict

from apps.calculations.engines.debt_service_engine import DebtServiceEngine
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService


TWO_DECIMALS = Decimal("0.01")


def _to_decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return default


def _q2(value: Decimal) -> Decimal:
    return value.quantize(TWO_DECIMALS, rounding=ROUND_HALF_UP)


def _as_float(value: Decimal) -> float:
    return float(_q2(value))


class LoanSizingService:
    """Calculations for commitment sizing, net proceeds, and budget breakdown."""

    @staticmethod
    def _holdbacks(
        loan: Any,
        commitment_amount: Decimal,
    ) -> Dict[str, Decimal]:
        origination_fee_pct = _to_decimal(getattr(loan, "origination_fee_pct", None))
        interest_reserve = _to_decimal(getattr(loan, "interest_reserve_amount", None))
        closing_costs_total = (
            _to_decimal(getattr(loan, "closing_costs_appraisal", None))
            + _to_decimal(getattr(loan, "closing_costs_legal", None))
            + _to_decimal(getattr(loan, "closing_costs_other", None))
        )

        origination_fee_amount = commitment_amount * (origination_fee_pct / Decimal("100"))
        total_holdbacks = origination_fee_amount + interest_reserve + closing_costs_total
        net_proceeds = commitment_amount - total_holdbacks

        return {
            "origination_fee_amount": _q2(origination_fee_amount),
            "interest_reserve_amount": _q2(interest_reserve),
            "closing_costs_total": _q2(closing_costs_total),
            "total_holdbacks": _q2(total_holdbacks),
            "net_loan_proceeds": _q2(net_proceeds),
        }

    @staticmethod
    def calculate_commitment(loan: Any, project: Any) -> Dict[str, Any]:
        """
        Derive commitment from LTV/LTC and compute holdbacks/net proceeds.
        """
        ltv_pct = _to_decimal(getattr(loan, "loan_to_value_pct", None), default=Decimal("-1"))
        ltc_pct = _to_decimal(getattr(loan, "loan_to_cost_pct", None), default=Decimal("-1"))

        has_ltv = ltv_pct >= 0
        has_ltc = ltc_pct >= 0

        value_basis = _to_decimal(getattr(project, "asking_price", None))

        closing_costs_total = (
            _to_decimal(getattr(loan, "closing_costs_appraisal", None))
            + _to_decimal(getattr(loan, "closing_costs_legal", None))
            + _to_decimal(getattr(loan, "closing_costs_other", None))
        )
        # TODO: Include capex budget basis once capital budget source is integrated.
        cost_basis = value_basis + closing_costs_total

        ltv_amount = (ltv_pct / Decimal("100")) * value_basis if has_ltv else None
        ltc_amount = (ltc_pct / Decimal("100")) * cost_basis if has_ltc else None

        if ltv_amount is not None and ltc_amount is not None:
            commitment = min(ltv_amount, ltc_amount)
            governing = "LTV" if ltv_amount <= ltc_amount else "LTC"
            method = "MIN_LTV_LTC"
        elif ltv_amount is not None:
            commitment = ltv_amount
            governing = "LTV"
            method = "LTV"
        elif ltc_amount is not None:
            commitment = ltc_amount
            governing = "LTC"
            method = "LTC"
        else:
            commitment = _to_decimal(
                getattr(loan, "commitment_amount", None) or getattr(loan, "loan_amount", None)
            )
            governing = "MANUAL"
            method = "MANUAL"

        commitment = _q2(commitment)
        holdbacks = LoanSizingService._holdbacks(loan, commitment)

        return {
            "commitment_amount": commitment,
            "loan_amount": commitment,
            "calculated_commitment_amount": commitment,
            "governing_constraint": governing,
            "commitment_sizing_method": method,
            "ltv_basis_amount": _q2(value_basis),
            "ltc_basis_amount": _q2(cost_basis),
            "ltv_amount": _q2(ltv_amount) if ltv_amount is not None else None,
            "ltc_amount": _q2(ltc_amount) if ltc_amount is not None else None,
            **holdbacks,
        }

    @staticmethod
    def calculate_interest_reserve_recommendation(loan: Any, project: Any) -> Dict[str, Any]:
        """
        Calculate recommended interest reserve amount.

        TERM: monthly interest * reserve months * inflator.
        REVOLVER: reuse iterative reserve sizing from debt engine.
        """
        structure_type = (getattr(loan, "structure_type", "") or "").upper()

        if structure_type == "REVOLVER":
            service = LandDevCashFlowService(project.project_id)
            project_config = service._get_project_config()
            dcf_assumptions = service._get_dcf_assumptions()
            required_periods = service._determine_required_periods(None)
            hold_period_years = dcf_assumptions.get("hold_period_years")
            hold_period_months = int(hold_period_years) * 12 if hold_period_years else None
            if hold_period_months:
                required_periods = max(required_periods, hold_period_months)
            periods = service._generate_periods(project_config["start_date"], max(required_periods, 1))
            cost_schedule = service._generate_cost_schedule(
                required_periods,
                None,
                dcf_assumptions.get("cost_inflation_rate"),
            )
            absorption_schedule = service._generate_absorption_schedule(
                project_config["start_date"],
                None,
                dcf_assumptions.get("price_growth_rate"),
                dcf_assumptions.get("cost_inflation_rate"),
            )
            period_data = service._build_period_costs_for_financing(
                cost_schedule,
                absorption_schedule,
                periods,
            )
            params = service._build_revolver_params(loan, periods)
            result = DebtServiceEngine().calculate_revolver(params, period_data)
            return {
                "recommended_reserve": round(result.interest_reserve_funded, 2),
                "calculation_basis": {
                    "method": "REVOLVER_ITERATIVE",
                    "iterations": result.iterations_to_converge,
                    "peak_balance": round(result.peak_balance, 2),
                    "inflator": float(getattr(loan, "interest_reserve_inflator", 1.0) or 1.0),
                },
            }

        commitment = _to_decimal(
            getattr(loan, "calculated_commitment_amount", None)
            or getattr(loan, "commitment_amount", None)
            or getattr(loan, "loan_amount", None)
        )
        rate_pct = _to_decimal(getattr(loan, "interest_rate_pct", None))
        inflator = _to_decimal(getattr(loan, "interest_reserve_inflator", None), default=Decimal("1"))
        io_months = int(getattr(loan, "interest_only_months", 0) or 0)
        analysis_type = (getattr(project, "analysis_type", "") or "").upper()

        if analysis_type in {"INVESTMENT", "VALUATION"}:
            reserve_months = 0
        else:
            reserve_months = io_months if io_months > 0 else 12

        monthly_interest = commitment * (rate_pct / Decimal("100")) / Decimal("12")
        recommended = monthly_interest * Decimal(str(reserve_months)) * inflator

        return {
            "recommended_reserve": _as_float(recommended),
            "calculation_basis": {
                "monthly_interest": _as_float(monthly_interest),
                "reserve_months": reserve_months,
                "inflator": float(inflator),
                "method": "TERM_IO_PERIOD",
            },
        }

    @staticmethod
    def build_budget_summary(loan: Any, project: Any) -> Dict[str, Any]:
        """Build read-only loan budget breakdown for modal display."""
        sizing = LoanSizingService.calculate_commitment(loan, project)
        commitment = _to_decimal(sizing["commitment_amount"])
        acquisition = _to_decimal(getattr(project, "asking_price", None))
        capex = Decimal("0")
        # TODO: Replace with actual capex budget once project budget source is integrated.

        origination_fee = _to_decimal(sizing["origination_fee_amount"])
        interest_reserve = _to_decimal(sizing["interest_reserve_amount"])
        loan_costs = _to_decimal(getattr(loan, "closing_costs_appraisal", None)) + _to_decimal(
            getattr(loan, "closing_costs_legal", None)
        )
        other = _to_decimal(getattr(loan, "closing_costs_other", None))

        is_land = (getattr(project, "project_type_code", "") or "").upper() == "LAND"
        line_item_a_label = "Land" if is_land else "Acquisition Price"
        line_item_b_label = "Improvements" if is_land else "Capital Expenditures"
        net_proceeds = _to_decimal(sizing["net_loan_proceeds"])
        remaining_net_proceeds = max(net_proceeds, Decimal("0"))
        acquisition_lender_alloc = min(acquisition, remaining_net_proceeds)
        remaining_net_proceeds -= acquisition_lender_alloc
        capex_lender_alloc = min(capex, remaining_net_proceeds)

        raw_budget_rows = [
            {
                "label": line_item_a_label,
                "total": acquisition,
                "lender": acquisition_lender_alloc,
            },
            {
                "label": line_item_b_label,
                "total": capex,
                "lender": capex_lender_alloc,
            },
            {
                "label": "Origination Fee",
                "total": origination_fee,
                "lender": origination_fee,
            },
            {
                "label": "Loan Costs",
                "total": loan_costs,
                "lender": loan_costs,
            },
            {
                "label": "Other",
                "total": other,
                "lender": other,
            },
            {
                "label": "Interest Reserve",
                "total": interest_reserve,
                "lender": interest_reserve,
            },
        ]

        loan_budget_rows = []
        for row in raw_budget_rows:
            borrower = _q2(row["total"] - row["lender"])
            loan_budget_rows.append(
                {
                    "label": row["label"],
                    "total": _as_float(row["total"]),
                    "borrower": _as_float(borrower),
                    "lender": _as_float(row["lender"]),
                }
            )

        total_budget = sum(_to_decimal(r["total"]) for r in loan_budget_rows)
        total_lender = sum(_to_decimal(r["lender"]) for r in loan_budget_rows)
        total_borrower = total_budget - total_lender

        def pct_of_loan(amount: Decimal) -> float:
            if commitment <= 0:
                return 0.0
            return float((amount / commitment) * Decimal("100"))

        summary_of_proceeds = [
            {"label": "Loan Amount", "pct_of_loan": None, "total": _as_float(commitment)},
            {"label": "LIP: Origination", "pct_of_loan": pct_of_loan(origination_fee), "total": _as_float(-origination_fee)},
            {
                "label": "LIP: Interest Reserve",
                "pct_of_loan": pct_of_loan(interest_reserve),
                "total": _as_float(-interest_reserve),
            },
            {
                "label": f"LIP: {line_item_b_label}",
                "pct_of_loan": pct_of_loan(capex),
                "total": _as_float(-capex),
            },
            {
                "label": "Closing Funds Available",
                "pct_of_loan": pct_of_loan(net_proceeds),
                "total": _as_float(net_proceeds),
            },
        ]

        project_costs_at_close = total_budget
        loan_proceeds = net_proceeds
        transaction_offering_cost = Decimal("0")
        option_deposit = Decimal("0")
        total_equity_to_close = project_costs_at_close - loan_proceeds + transaction_offering_cost - option_deposit

        equity_to_close = [
            {"label": "Project Costs at Close", "total": _as_float(project_costs_at_close)},
            {"label": "- Loan Proceeds", "total": _as_float(-loan_proceeds)},
            {"label": "+ Transaction / Offering Cost", "total": _as_float(transaction_offering_cost)},
        ]
        if is_land:
            equity_to_close.append({"label": "- Option Deposit", "total": _as_float(-option_deposit)})
        equity_to_close.append({"label": "Total Equity to Close", "total": _as_float(total_equity_to_close)})

        return {
            "project_id": getattr(project, "project_id", None),
            "loan_id": getattr(loan, "loan_id", None),
            "loan_name": getattr(loan, "loan_name", "Loan"),
            "project_type_code": getattr(project, "project_type_code", None),
            "governing_constraint": sizing.get("governing_constraint"),
            "sizing_method": sizing.get("commitment_sizing_method"),
            "commitment_amount": _as_float(commitment),
            "net_loan_proceeds": _as_float(loan_proceeds),
            "loan_budget": {
                "rows": loan_budget_rows,
                "totals": {
                    "total_budget": _as_float(total_budget),
                    "borrower_total": _as_float(total_borrower),
                    "lender_total": _as_float(total_lender),
                },
            },
            "summary_of_proceeds": summary_of_proceeds,
            "equity_to_close": equity_to_close,
        }
