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


# Activity order for the budget breakdown, matching the budget screen.
_ACTIVITY_ORDER = (
    "Acquisition",
    "Planning & Engineering",
    "Improvements",
    "Operations",
    "Disposition",
    "Financing",
)


def _loan_scope_rows(loan: Any):
    """(division_id, share, collateral_type) for each container the loan funds.

    Empty for an unsaved loan or one with no container rows — both mean the
    loan is project-wide.
    """
    loan_id = getattr(loan, "loan_id", None)
    if loan_id is None:
        return []
    from apps.financial.models_debt import LoanContainer

    out = []
    for division_id, pct, collateral_type in LoanContainer.objects.filter(
        loan_id=loan_id
    ).values_list("division_id", "allocation_pct", "collateral_type"):
        if division_id is None:
            continue
        share = _to_decimal(pct) / Decimal("100") if pct is not None else Decimal("1")
        out.append((int(division_id), share, (collateral_type or "").upper()))
    return out


def development_budget_basis(loan: Any, project_id: int) -> Dict[str, Any]:
    """The development budget a loan is sized against.

    Every budget line on a funded container — or on anything underneath one
    (a parcel line under a funded phase) — times the loan's share of that
    container. A project-wide loan takes every line. Lines with no dates count:
    a static estimate is still cost; only the timing of draws needs dates.

    Returns ``{"total": Decimal, "by_activity": {activity: Decimal},
    "funds_acquisition": bool, "project_wide": bool}``.
    """
    from django.db import connection
    from apps.containers.ancestry import DIVISION_ANCESTRY_CTE
    from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

    rows = _loan_scope_rows(loan)
    project_wide = not rows
    shares: Dict[int, float] = {}
    funds_acquisition = project_wide
    for division_id, share, collateral_type in rows:
        shares[division_id] = shares.get(division_id, 0.0) + float(share)
        if collateral_type in LandDevCashFlowService.ACQUISITION_COLLATERAL_TYPES:
            funds_acquisition = True

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH {DIVISION_ANCESTRY_CTE}
            SELECT b.division_id, a.tier1_id, a.tier2_id,
                   COALESCE(NULLIF(TRIM(b.activity), ''), 'Unassigned') AS activity,
                   b.amount
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN division_ancestry a ON a.division_id = b.division_id
            WHERE b.project_id = %s AND b.amount > 0
            """,
            [project_id],
        )
        budget_rows = cursor.fetchall()

    total, by_activity = budget_basis_from_rows(budget_rows, shares, project_wide)
    return {
        "total": total,
        "by_activity": by_activity,
        "funds_acquisition": funds_acquisition,
        "project_wide": project_wide,
    }


def budget_basis_from_rows(budget_rows, shares: Dict[int, float], project_wide: bool):
    """Sum ``(division_id, tier1_id, tier2_id, activity, amount)`` rows at the
    loan's share. Pure, so the sizing rule is testable without a database."""
    from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

    total = Decimal("0")
    by_activity: Dict[str, Decimal] = {}
    for division_id, tier1_id, tier2_id, activity, amount in budget_rows:
        if project_wide:
            share = 1.0
        else:
            ancestry = {division_id: (tier1_id, tier2_id)} if division_id is not None else {}
            share = LandDevCashFlowService._share_for_division(division_id, shares, ancestry)
        if share <= 0:
            continue
        contribution = _to_decimal(amount) * Decimal(str(share))
        total += contribution
        by_activity[activity] = by_activity.get(activity, Decimal("0")) + contribution
    return total, by_activity


def purchase_price_basis(project: Any) -> Dict[str, Any]:
    """The land purchase price and where it came from.

    The acquisition ledger wins — the same rows the cash flow puts in period 0
    (``is_applied_to_purchase`` and a positive amount). Then the project's own
    acquisition price, then its asking price. None of them: zero, and the
    caller says there is no price on the record rather than sizing off it.
    """
    project_id = getattr(project, "project_id", None)
    if project_id is not None:
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM landscape.tbl_acquisition
                WHERE project_id = %s
                  AND COALESCE(is_applied_to_purchase, true)
                  AND amount > 0
                """,
                [project_id],
            )
            ledger = _to_decimal(cursor.fetchone()[0])
        if ledger > 0:
            return {"amount": ledger, "source": "acquisition ledger"}
    for field, label in (("acquisition_price", "acquisition price"), ("asking_price", "asking price")):
        value = _to_decimal(getattr(project, field, None))
        if value > 0:
            return {"amount": value, "source": label}
    return {"amount": Decimal("0"), "source": None}


def _is_land(project: Any) -> bool:
    return (getattr(project, "project_type_code", "") or "").upper() == "LAND"


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

        # Value basis for LTV: the purchase price on record (acquisition
        # ledger first). There is no separate appraised-value field; this is
        # the same role the asking price played before, from the right table.
        price = purchase_price_basis(project)
        value_basis = price["amount"]

        closing_costs_total = (
            _to_decimal(getattr(loan, "closing_costs_appraisal", None))
            + _to_decimal(getattr(loan, "closing_costs_legal", None))
            + _to_decimal(getattr(loan, "closing_costs_other", None))
        )
        # Land: LTC is sized on the purchase (when the loan funds it) plus the
        # development budget of the containers it funds. Income property keeps
        # its purchase-plus-closing basis until its capital budget is wired.
        budget_basis = None
        if _is_land(project) and getattr(project, "project_id", None) is not None:
            budget_basis = development_budget_basis(loan, project.project_id)
            purchase = value_basis if budget_basis["funds_acquisition"] else Decimal("0")
            cost_basis = purchase + closing_costs_total + budget_basis["total"]
        else:
            cost_basis = value_basis + closing_costs_total

        # A ratio with nothing to multiply is not a $0 loan. Skip it and say
        # why, so "the lesser of LTV and LTC" is never won by a missing basis.
        sizing_notes = []
        if has_ltv and value_basis <= 0:
            has_ltv = False
            sizing_notes.append(
                "Loan-to-value ignored: no purchase price or value on the record."
            )
        if has_ltc and cost_basis <= 0:
            has_ltc = False
            sizing_notes.append(
                "Loan-to-cost ignored: no purchase price or budget on the record for what this loan funds."
            )

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
            "purchase_price_source": price["source"],
            "sizing_notes": sizing_notes,
            "development_budget_basis": (
                _q2(budget_basis["total"]) if budget_basis is not None else None
            ),
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

        if LandDevCashFlowService.uses_release_calculator(loan):
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
            period_data = service.build_loan_period_data(
                loan,
                cost_schedule,
                absorption_schedule,
                periods,
            )
            params = service._build_revolver_params(loan, periods, period_data)
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
        perspective = (getattr(project, "analysis_perspective", "") or "").upper()
        purpose = (getattr(project, "analysis_purpose", "") or "").upper()

        # Income-property style reserve behavior applies to INVESTMENT perspective.
        if perspective == "INVESTMENT":
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
                "analysis_perspective": perspective or None,
                "analysis_purpose": purpose or None,
            },
        }

    @staticmethod
    def build_budget_summary(loan: Any, project: Any) -> Dict[str, Any]:
        """Build read-only loan budget breakdown for modal display."""
        sizing = LoanSizingService.calculate_commitment(loan, project)
        commitment = _to_decimal(sizing["commitment_amount"])
        acquisition = purchase_price_basis(project)["amount"]
        capex = Decimal("0")
        activity_rows = []
        if _is_land(project) and getattr(project, "project_id", None) is not None:
            basis = development_budget_basis(loan, project.project_id)
            if not basis["funds_acquisition"]:
                acquisition = Decimal("0")
            capex = basis["total"]
            order = {name: i for i, name in enumerate(_ACTIVITY_ORDER)}
            activity_rows = sorted(
                basis["by_activity"].items(),
                key=lambda kv: (order.get(kv[0], len(order)), kv[0]),
            )

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

        # The development budget, one row per activity, when there is one to
        # show; otherwise the single improvements row as before. The lender's
        # allocation is spread over the activities in order.
        if activity_rows:
            capex_rows = []
            remaining_capex_alloc = capex_lender_alloc
            for activity, amount in activity_rows:
                lender = min(amount, remaining_capex_alloc)
                remaining_capex_alloc -= lender
                capex_rows.append({"label": activity, "total": amount, "lender": lender})
        else:
            capex_rows = [{"label": line_item_b_label, "total": capex, "lender": capex_lender_alloc}]

        raw_budget_rows = [
            {
                "label": line_item_a_label,
                "total": acquisition,
                "lender": acquisition_lender_alloc,
            },
            *capex_rows,
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
