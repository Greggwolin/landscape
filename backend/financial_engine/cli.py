"""
Command Line Interface for Financial Engine

Provides CLI commands that can be invoked from TypeScript via child process.

Usage:
    # Calculate investment metrics
    python -m financial_engine.cli calculate-metrics \
        --property-id 1 \
        --exit-cap-rate 0.065 \
        --hold-period-years 10

    # Calculate cash flow
    python -m financial_engine.cli calculate-cashflow \
        --property-id 1 \
        --num-periods 120 \
        --period-type monthly

Integration from TypeScript:
    import { spawn } from 'child_process';

    const python = spawn('python', [
        '-m', 'financial_engine.cli',
        'calculate-metrics',
        '--property-id', '1',
        '--exit-cap-rate', '0.065'
    ]);

    python.stdout.on('data', (data) => {
        const result = JSON.parse(data.toString());
        console.log(result);
    });
"""

import sys
import json
import argparse
from datetime import date
from typing import Optional
from loguru import logger

from financial_engine.config import get_settings
from financial_engine.db import get_db_connection, execute_query
from financial_engine.core import InvestmentMetrics, CashFlowEngine
from financial_engine.models import (
    PropertyData,
    LeaseData,
    OperatingExpenses,
    CapitalItems,
    DebtAssumptions,
)


def setup_logging(verbose: bool = False):
    """Configure logging for CLI."""
    logger.remove()  # Remove default handler

    if verbose:
        logger.add(sys.stderr, level="DEBUG")
    else:
        logger.add(sys.stderr, level="WARNING")


def fetch_property_from_db(property_id: int) -> Optional[PropertyData]:
    """
    Fetch property data from database.

    This mirrors the TypeScript fetchPropertyData() function from
    src/app/api/cre/properties/[property_id]/metrics/route.ts
    """
    with get_db_connection() as conn:
        # Fetch property
        property_rows = execute_query(
            conn,
            """
            SELECT
                cre_property_id,
                property_name,
                rentable_sf,
                acquisition_price
            FROM landscape.tbl_cre_property
            WHERE cre_property_id = %s
            """,
            (property_id,),
        )

        if not property_rows:
            return None

        property_row = property_rows[0]

        # Fetch active leases
        lease_rows = execute_query(
            conn,
            """
            SELECT
                l.lease_id,
                l.space_id,
                l.tenant_id,
                t.tenant_name,
                l.lease_type,
                l.lease_status,
                l.lease_commencement_date,
                l.lease_expiration_date,
                l.leased_sf
            FROM landscape.tbl_cre_lease l
            LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
            WHERE l.cre_property_id = %s
              AND l.lease_status = 'Active'
            ORDER BY l.lease_id
            """,
            (property_id,),
        )

        leases = []

        for lease_row in lease_rows:
            # Fetch base rent schedule
            rent_rows = execute_query(
                conn,
                """
                SELECT
                    period_start_date,
                    period_end_date,
                    base_rent_annual,
                    base_rent_monthly,
                    base_rent_psf_annual
                FROM landscape.tbl_cre_base_rent
                WHERE lease_id = %s
                ORDER BY period_start_date
                """,
                (lease_row["lease_id"],),
            )

            # Fetch escalation
            escalation_rows = execute_query(
                conn,
                """
                SELECT
                    escalation_type,
                    escalation_pct,
                    escalation_frequency,
                    cpi_floor_pct,
                    cpi_cap_pct
                FROM landscape.tbl_cre_rent_escalation
                WHERE lease_id = %s
                LIMIT 1
                """,
                (lease_row["lease_id"],),
            )

            # Fetch expense recovery
            recovery_rows = execute_query(
                conn,
                """
                SELECT
                    recovery_structure,
                    property_tax_recovery_pct,
                    insurance_recovery_pct,
                    cam_recovery_pct,
                    utilities_recovery_pct,
                    expense_cap_psf,
                    expense_cap_escalation_pct
                FROM landscape.tbl_cre_expense_recovery
                WHERE lease_id = %s
                LIMIT 1
                """,
                (lease_row["lease_id"],),
            )

            # Build lease data model
            lease_data = {
                "lease_id": lease_row["lease_id"],
                "space_id": lease_row["space_id"],
                "tenant_id": lease_row["tenant_id"],
                "tenant_name": lease_row["tenant_name"] or "Unknown",
                "lease_type": lease_row["lease_type"],
                "lease_status": lease_row["lease_status"],
                "lease_commencement_date": lease_row["lease_commencement_date"],
                "lease_expiration_date": lease_row["lease_expiration_date"],
                "leased_sf": float(lease_row["leased_sf"]),
                "base_rent": [
                    {
                        "period_start_date": r["period_start_date"],
                        "period_end_date": r["period_end_date"],
                        "base_rent_annual": float(r["base_rent_annual"] or 0),
                        "base_rent_monthly": float(r["base_rent_monthly"] or 0),
                        "base_rent_psf_annual": float(r["base_rent_psf_annual"] or 0),
                    }
                    for r in rent_rows
                ],
            }

            # Add escalation if present
            if escalation_rows:
                esc = escalation_rows[0]
                lease_data["escalation"] = {
                    "escalation_type": esc["escalation_type"],
                    "escalation_pct": float(esc["escalation_pct"] or 0),
                    "escalation_frequency": esc["escalation_frequency"],
                    "cpi_floor_pct": float(esc["cpi_floor_pct"] or 0),
                    "cpi_cap_pct": float(esc["cpi_cap_pct"] or 0),
                }

            # Add expense recovery
            if recovery_rows:
                rec = recovery_rows[0]
                lease_data["expense_recovery"] = {
                    "recovery_structure": rec["recovery_structure"],
                    "property_tax_recovery_pct": float(rec["property_tax_recovery_pct"] or 0),
                    "insurance_recovery_pct": float(rec["insurance_recovery_pct"] or 0),
                    "cam_recovery_pct": float(rec["cam_recovery_pct"] or 0),
                    "utilities_recovery_pct": float(rec.get("utilities_recovery_pct") or 0),
                    "expense_cap_psf": float(rec.get("expense_cap_psf") or 0),
                    "expense_cap_escalation_pct": float(rec.get("expense_cap_escalation_pct") or 0),
                }
            else:
                # Default to Gross lease
                lease_data["expense_recovery"] = {
                    "recovery_structure": "Gross",
                    "property_tax_recovery_pct": 0,
                    "insurance_recovery_pct": 0,
                    "cam_recovery_pct": 0,
                }

            leases.append(LeaseData(**lease_data))

        # Build property data model
        property_data = PropertyData(
            cre_property_id=property_row["cre_property_id"],
            property_name=property_row["property_name"],
            rentable_sf=float(property_row["rentable_sf"]),
            acquisition_price=float(property_row["acquisition_price"]),
            leases=leases,
        )

        return property_data


def command_calculate_metrics(args):
    """
    Calculate investment metrics for a property.

    Outputs JSON to stdout for TypeScript to parse.
    """
    try:
        # Fetch property data
        property_data = fetch_property_from_db(args.property_id)

        if not property_data:
            output = {
                "success": False,
                "error": f"Property {args.property_id} not found",
            }
            print(json.dumps(output))
            sys.exit(1)

        # Build operating expenses (simplified - using defaults)
        monthly_opex = OperatingExpenses(
            period_date=date.today(),
            property_taxes=(property_data.acquisition_price * 0.0115) / 12,
            insurance=(property_data.rentable_sf * 0.50) / 12,
            cam_expenses=(property_data.rentable_sf * 2.50) / 12,
            utilities=(property_data.rentable_sf * 1.00) / 12,
            management_fee_pct=3.0,
            repairs_maintenance=(property_data.rentable_sf * 0.75) / 12,
            other_expenses=5000 / 12,
        )

        num_periods = args.hold_period_years * 12
        opex_schedule = [monthly_opex] * num_periods

        # Build capital schedule
        monthly_capital = CapitalItems(
            period_date=date.today(),
            capital_reserves=(property_data.rentable_sf * 0.25) / 12,
            tenant_improvements=0,
            leasing_commissions=0,
        )
        capital_schedule = [monthly_capital] * num_periods

        # Debt assumptions (if provided)
        debt_assumptions = None
        annual_debt_service = 0

        if args.loan_amount and args.interest_rate and args.amortization_years:
            monthly_rate = args.interest_rate / 12
            num_payments = args.amortization_years * 12
            monthly_payment = (
                args.loan_amount
                * (monthly_rate * (1 + monthly_rate) ** num_payments)
                / ((1 + monthly_rate) ** num_payments - 1)
            )
            annual_debt_service = monthly_payment * 12

            debt_assumptions = DebtAssumptions(
                loan_amount=args.loan_amount,
                interest_rate=args.interest_rate,
                amortization_years=args.amortization_years,
                annual_debt_service=annual_debt_service,
            )

        # Calculate cash flows
        cf_engine = CashFlowEngine()
        cash_flows = cf_engine.calculate_multi_period_cashflow(
            property=property_data,
            start_date=date.today(),
            num_periods=num_periods,
            period_type="monthly",
            opex_schedule=opex_schedule,
            capital_schedule=capital_schedule,
            annual_debt_service=annual_debt_service,
            vacancy_pct=args.vacancy_pct,
            credit_loss_pct=args.credit_loss_pct,
        )

        # Calculate metrics
        metrics_engine = InvestmentMetrics()
        metrics = metrics_engine.calculate_comprehensive_metrics(
            cash_flow_periods=cash_flows,
            acquisition_price=property_data.acquisition_price,
            exit_cap_rate=args.exit_cap_rate,
            debt_assumptions=debt_assumptions,
            discount_rate=args.discount_rate,
        )

        # Output JSON result
        output = {
            "success": True,
            "property": {
                "cre_property_id": property_data.cre_property_id,
                "property_name": property_data.property_name,
                "rentable_sf": property_data.rentable_sf,
                "acquisition_price": property_data.acquisition_price,
            },
            "assumptions": {
                "hold_period_years": args.hold_period_years,
                "exit_cap_rate": args.exit_cap_rate,
                "discount_rate": args.discount_rate,
                "vacancy_pct": args.vacancy_pct,
                "credit_loss_pct": args.credit_loss_pct,
            },
            "metrics": metrics.dict(),
        }

        print(json.dumps(output, default=str))
        sys.exit(0)

    except Exception as e:
        logger.exception("Error calculating metrics")
        output = {
            "success": False,
            "error": str(e),
        }
        print(json.dumps(output))
        sys.exit(1)


def command_calculate_cashflow(args):
    """
    Calculate cash flow projections for a property.

    Outputs JSON to stdout for TypeScript to parse.
    """
    try:
        # Fetch property data
        property_data = fetch_property_from_db(args.property_id)

        if not property_data:
            output = {
                "success": False,
                "error": f"Property {args.property_id} not found",
            }
            print(json.dumps(output))
            sys.exit(1)

        # Build operating expenses
        monthly_opex = OperatingExpenses(
            period_date=date.today(),
            property_taxes=(property_data.acquisition_price * 0.0115) / 12,
            insurance=(property_data.rentable_sf * 0.50) / 12,
            cam_expenses=(property_data.rentable_sf * 2.50) / 12,
            utilities=(property_data.rentable_sf * 1.00) / 12,
            management_fee_pct=3.0,
            repairs_maintenance=(property_data.rentable_sf * 0.75) / 12,
            other_expenses=5000 / 12,
        )
        opex_schedule = [monthly_opex] * args.num_periods

        # Build capital schedule
        monthly_capital = CapitalItems(
            period_date=date.today(),
            capital_reserves=(property_data.rentable_sf * 0.25) / 12,
            tenant_improvements=0,
            leasing_commissions=0,
        )
        capital_schedule = [monthly_capital] * args.num_periods

        # Calculate cash flows
        cf_engine = CashFlowEngine()
        cash_flows = cf_engine.calculate_multi_period_cashflow(
            property=property_data,
            start_date=date.today(),
            num_periods=args.num_periods,
            period_type=args.period_type,
            opex_schedule=opex_schedule,
            capital_schedule=capital_schedule,
            annual_debt_service=args.debt_service_annual,
            vacancy_pct=args.vacancy_pct,
            credit_loss_pct=args.credit_loss_pct,
        )

        # Output JSON result
        output = {
            "success": True,
            "property": {
                "cre_property_id": property_data.cre_property_id,
                "property_name": property_data.property_name,
                "rentable_sf": property_data.rentable_sf,
            },
            "parameters": {
                "num_periods": args.num_periods,
                "period_type": args.period_type,
                "vacancy_pct": args.vacancy_pct,
                "credit_loss_pct": args.credit_loss_pct,
            },
            "cash_flows": [cf.dict() for cf in cash_flows],
            "summary": {
                "total_periods": len(cash_flows),
                "total_noi": sum(cf.net_operating_income for cf in cash_flows),
                "total_cash_flow": sum(cf.net_cash_flow for cf in cash_flows),
                "avg_monthly_noi": sum(cf.net_operating_income for cf in cash_flows) / len(cash_flows),
            },
        }

        print(json.dumps(output, default=str))
        sys.exit(0)

    except Exception as e:
        logger.exception("Error calculating cash flow")
        output = {
            "success": False,
            "error": str(e),
        }
        print(json.dumps(output))
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Financial Engine CLI - CRE Investment Calculations"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Calculate Metrics command
    metrics_parser = subparsers.add_parser(
        "calculate-metrics", help="Calculate investment metrics"
    )
    metrics_parser.add_argument(
        "--property-id", type=int, required=True, help="CRE Property ID"
    )
    metrics_parser.add_argument(
        "--hold-period-years", type=int, default=10, help="Hold period in years"
    )
    metrics_parser.add_argument(
        "--exit-cap-rate", type=float, default=0.065, help="Exit cap rate (e.g., 0.065)"
    )
    metrics_parser.add_argument(
        "--discount-rate", type=float, default=0.10, help="Discount rate for NPV"
    )
    metrics_parser.add_argument(
        "--vacancy-pct", type=float, default=0.05, help="Vacancy percentage"
    )
    metrics_parser.add_argument(
        "--credit-loss-pct", type=float, default=0.02, help="Credit loss percentage"
    )
    metrics_parser.add_argument(
        "--loan-amount", type=float, help="Loan amount (optional)"
    )
    metrics_parser.add_argument(
        "--interest-rate", type=float, help="Interest rate (optional)"
    )
    metrics_parser.add_argument(
        "--amortization-years", type=int, help="Amortization period in years (optional)"
    )
    metrics_parser.set_defaults(func=command_calculate_metrics)

    # Calculate Cash Flow command
    cashflow_parser = subparsers.add_parser(
        "calculate-cashflow", help="Calculate cash flow projections"
    )
    cashflow_parser.add_argument(
        "--property-id", type=int, required=True, help="CRE Property ID"
    )
    cashflow_parser.add_argument(
        "--num-periods", type=int, default=120, help="Number of periods to project"
    )
    cashflow_parser.add_argument(
        "--period-type",
        type=str,
        default="monthly",
        choices=["monthly", "annual"],
        help="Period type",
    )
    cashflow_parser.add_argument(
        "--vacancy-pct", type=float, default=0.05, help="Vacancy percentage"
    )
    cashflow_parser.add_argument(
        "--credit-loss-pct", type=float, default=0.02, help="Credit loss percentage"
    )
    cashflow_parser.add_argument(
        "--debt-service-annual", type=float, default=0, help="Annual debt service"
    )
    cashflow_parser.set_defaults(func=command_calculate_cashflow)

    # Parse arguments and execute command
    args = parser.parse_args()
    setup_logging(args.verbose)

    args.func(args)


if __name__ == "__main__":
    main()
