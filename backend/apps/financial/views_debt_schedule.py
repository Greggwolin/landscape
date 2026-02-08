"""Debt schedule endpoint for loan-level schedule generation."""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.financial.models_debt import Loan, LoanContainer
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService
from apps.calculations.engines.debt_service_engine import DebtServiceEngine


class DebtScheduleView(APIView):
    """Generate debt schedule for a specific loan."""

    permission_classes = [AllowAny]

    def get(self, request, project_id: int, loan_id: int):
        loan = get_object_or_404(Loan, loan_id=loan_id, project_id=project_id)

        if loan.takes_out_loan_id:
            return Response(
                {
                    'error': 'TERM take-out logic not implemented for debt schedule',
                    'loan_id': loan.loan_id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        container_ids = list(
            LoanContainer.objects.filter(loan_id=loan.loan_id).values_list('division_id', flat=True)
        )
        if not container_ids:
            container_ids = None

        service = LandDevCashFlowService(project_id)
        project_config = service._get_project_config()
        dcf_assumptions = service._get_dcf_assumptions()
        required_periods = service._determine_required_periods(container_ids)
        hold_period_years = dcf_assumptions.get('hold_period_years')
        hold_period_months = int(hold_period_years) * 12 if hold_period_years else None
        if hold_period_months:
            required_periods = max(required_periods, hold_period_months)

        # Ensure enough periods to cover the loan term (especially for
        # standalone TERM loans on projects without budget/parcel data).
        loan_term_months = service._normalize_term_months(
            loan.loan_term_months, loan.loan_term_years
        ) or 0
        loan_start_period = service._get_period_index_for_date(
            service._generate_periods(project_config['start_date'], max(required_periods, 1)),
            loan.loan_start_date,
        )
        min_periods_for_loan = loan_start_period + loan_term_months + 1
        required_periods = max(required_periods, min_periods_for_loan)
        if hold_period_months:
            required_periods = min(required_periods, hold_period_months)

        periods = service._generate_periods(project_config['start_date'], required_periods)
        cost_schedule = service._generate_cost_schedule(
            required_periods,
            container_ids,
            dcf_assumptions.get('cost_inflation_rate'),
        )
        absorption_schedule = service._generate_absorption_schedule(
            project_config['start_date'],
            container_ids,
            dcf_assumptions.get('price_growth_rate'),
            dcf_assumptions.get('cost_inflation_rate'),
        )
        period_data = service._build_period_costs_for_financing(
            cost_schedule,
            absorption_schedule,
            periods,
        )

        engine = DebtServiceEngine()

        if loan.structure_type == 'REVOLVER':
            params = service._build_revolver_params(loan, periods)
            try:
                result = engine.calculate_revolver(params, period_data)
            except NotImplementedError as exc:
                return Response(
                    {'error': str(exc), 'loan_id': loan.loan_id},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            response = {
                'loan_id': loan.loan_id,
                'loan_name': loan.loan_name,
                'structure_type': loan.structure_type,
                'calculation_summary': {
                    'commitment_amount': result.commitment_amount,
                    'interest_reserve_funded': result.interest_reserve_funded,
                    'origination_fee': result.origination_fee,
                    'total_interest': result.total_interest,
                    'total_release_payments': result.total_release_payments,
                    'peak_balance': result.peak_balance,
                    'peak_balance_pct': result.peak_balance_pct,
                    'iterations_to_converge': result.iterations_to_converge,
                },
                'periods': [
                    {
                        'period_index': p.period_index,
                        'date': p.date,
                        'beginning_balance': p.beginning_balance,
                        'cost_draw': p.cost_draw,
                        'accrued_interest': p.accrued_interest,
                        'interest_reserve_draw': p.interest_reserve_draw,
                        'interest_reserve_balance': p.interest_reserve_balance,
                        'origination_cost': p.origination_cost,
                        'release_payments': p.release_payments,
                        'ending_balance': p.ending_balance,
                        'loan_activity': p.loan_activity,
                    }
                    for p in result.periods
                ],
            }
            return Response(response, status=status.HTTP_200_OK)

        if loan.structure_type == 'TERM':
            params = service._build_term_params(loan, periods)
            result = engine.calculate_term(params, len(periods))
            response = {
                'loan_id': loan.loan_id,
                'loan_name': loan.loan_name,
                'structure_type': loan.structure_type,
                'calculation_summary': {
                    'loan_amount': result.loan_amount,
                    'total_interest': result.total_interest,
                    'total_principal': result.total_principal,
                    'balloon_amount': result.balloon_amount,
                    'monthly_payment_io': result.monthly_payment_io,
                    'monthly_payment_amort': result.monthly_payment_amort,
                },
                'periods': [
                    {
                        'period_index': p.period_index,
                        'date': p.date,
                        'beginning_balance': p.beginning_balance,
                        'scheduled_payment': p.scheduled_payment,
                        'interest_component': p.interest_component,
                        'principal_component': p.principal_component,
                        'ending_balance': p.ending_balance,
                        'is_io_period': p.is_io_period,
                        'is_balloon': p.is_balloon,
                        'balloon_amount': p.balloon_amount,
                    }
                    for p in result.periods
                ],
            }
            return Response(response, status=status.HTTP_200_OK)

        return Response(
            {
                'error': f"Unsupported structure_type '{loan.structure_type}'",
                'loan_id': loan.loan_id,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
