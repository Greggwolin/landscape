"""
Construction Loan Calculation Service.

Orchestrates the existing DebtServiceEngine to calculate construction loan
schedules for land development projects, persists results to
tbl_debt_draw_schedule, and returns summary metrics.

Pipeline:
    Project Cash Flows (LandDevCashFlowService)
    → DebtServiceEngine (iterative reserve solver)
    → tbl_debt_draw_schedule (persistence)
    → Summary metrics (response)
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import connection, transaction

from apps.financial.models_debt import Loan

logger = logging.getLogger(__name__)


class ConstructionLoanService:
    """
    Calculate and persist a construction loan schedule for land development.

    Uses the existing DebtServiceEngine revolver solver with iterative
    interest reserve convergence, then writes per-period results to
    tbl_debt_draw_schedule.
    """

    def __init__(self, project_id: int, loan_id: int):
        self.project_id = project_id
        self.loan_id = loan_id

    def calculate_and_store(
        self,
        container_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full construction loan calculation and persist results.

        Args:
            container_ids: Optional list of division_ids to scope the loan
                          (Village level 1 or Phase level 2).

        Returns:
            Dict with summary metrics and per-period schedule.
        """
        # 1. Load loan
        try:
            loan = Loan.objects.get(loan_id=self.loan_id, project_id=self.project_id)
        except Loan.DoesNotExist:
            return {'success': False, 'error': f'Loan {self.loan_id} not found for project {self.project_id}'}

        structure_type = (loan.structure_type or '').upper()
        if structure_type != 'REVOLVER':
            return {
                'success': False,
                'error': f'Construction loan calculation requires REVOLVER structure_type, got {structure_type}',
            }

        # If container_ids not passed, try to get from loan_container assignments
        if container_ids is None:
            assigned = list(
                loan.loan_containers.values_list('division_id', flat=True)
            )
            if assigned:
                container_ids = assigned

        # 2. Run the cash flow service with financing included
        try:
            from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService
            from apps.calculations.engines.debt_service_engine import (
                DebtServiceEngine,
                PeriodCosts,
            )

            svc = LandDevCashFlowService(self.project_id)
            project_config = svc._get_project_config()
            dcf_assumptions = svc._get_dcf_assumptions()
            hold_period_months = svc._get_dcf_hold_period_months()
            required_periods = svc._determine_required_periods(container_ids)

            if hold_period_months:
                required_periods = max(required_periods, hold_period_months)

            required_periods = svc._extend_periods_for_loans(
                required_periods, project_config['start_date'], container_ids
            )
            # Do NOT cap at hold_period_months for construction loans —
            # the schedule must cover the full loan term + absorption tail
            # so interest accrues and release payments apply in every period.

            periods = svc._generate_periods(
                project_config['start_date'],
                max(required_periods, 1),
            )

            cost_schedule = svc._generate_cost_schedule(
                required_periods,
                container_ids,
                dcf_assumptions.get('cost_inflation_rate'),
            )
            absorption_schedule = svc._generate_absorption_schedule(
                project_config['start_date'],
                container_ids,
                dcf_assumptions.get('price_growth_rate'),
                dcf_assumptions.get('cost_inflation_rate'),
            )

            # 3. Build PeriodCosts for the engine
            period_data = svc._build_period_costs_for_financing(
                cost_schedule,
                absorption_schedule,
                periods,
            )

            # 4. Build revolver params from the loan
            params = svc._build_revolver_params(loan, periods)

            # 5. Run the engine (iterative reserve convergence)
            engine = DebtServiceEngine()
            result = engine.calculate_revolver(params, period_data)

        except Exception as e:
            logger.error(f"[CONSTRUCTION_LOAN] Engine failed for loan {self.loan_id}: {e}", exc_info=True)
            return {'success': False, 'error': f'Calculation engine error: {str(e)}'}

        # 6. Ensure calculation periods exist in DB and persist draw schedule
        try:
            period_id_map = self._ensure_calculation_periods(periods)
            self._persist_draw_schedule(loan, result, periods, period_id_map)
        except Exception as e:
            logger.error(f"[CONSTRUCTION_LOAN] Persist failed for loan {self.loan_id}: {e}", exc_info=True)
            return {'success': False, 'error': f'Failed to persist results: {str(e)}'}

        # 7. Update loan summary fields
        try:
            self._update_loan_summary(loan, result)
        except Exception as e:
            logger.warning(f"[CONSTRUCTION_LOAN] Failed to update loan summary: {e}")

        # 8. Build response
        schedule = []
        cumulative_drawn = 0.0
        cumulative_interest = 0.0
        for rp in result.periods:
            cumulative_drawn += rp.cost_draw
            cumulative_interest += rp.accrued_interest
            period_info = periods[rp.period_index] if rp.period_index < len(periods) else {}
            schedule.append({
                'period_index': rp.period_index,
                'date': rp.date,
                'beginning_balance': round(rp.beginning_balance, 2),
                'cost_draw': round(rp.cost_draw, 2),
                'accrued_interest': round(rp.accrued_interest, 2),
                'interest_reserve_draw': round(rp.interest_reserve_draw, 2),
                'interest_reserve_balance': round(rp.interest_reserve_balance, 2),
                'release_payments': round(rp.release_payments, 2),
                'origination_cost': round(rp.origination_cost, 2),
                'ending_balance': round(rp.ending_balance, 2),
                'loan_activity': round(rp.loan_activity, 2),
                'cumulative_drawn': round(cumulative_drawn, 2),
                'cumulative_interest': round(cumulative_interest, 2),
            })

        net_proceeds = (
            result.commitment_amount
            - result.origination_fee
            - result.interest_reserve_funded
            - result.closing_costs
        )

        summary = {
            'commitment_amount': round(result.commitment_amount, 2),
            'interest_reserve_funded': round(result.interest_reserve_funded, 2),
            'origination_fee': round(result.origination_fee, 2),
            'closing_costs': round(result.closing_costs, 2),
            'net_loan_proceeds': round(net_proceeds, 2),
            'total_interest': round(result.total_interest, 2),
            'total_release_payments': round(result.total_release_payments, 2),
            'peak_balance': round(result.peak_balance, 2),
            'peak_balance_pct': round(result.peak_balance_pct * 100, 2),
            'convergence_iterations': result.iterations_to_converge,
        }

        return {
            'success': True,
            'project_id': self.project_id,
            'loan_id': self.loan_id,
            'loan_name': loan.loan_name,
            'summary': summary,
            'schedule': schedule,
            'total_periods': len(schedule),
        }

    def _ensure_calculation_periods(self, periods: List[Dict]) -> Dict[int, int]:
        """
        Ensure tbl_calculation_period rows exist for each period.
        Returns a mapping of period_index → period_id.
        """
        period_id_map = {}
        with connection.cursor() as cursor:
            for idx, period in enumerate(periods):
                start_date = period.get('startDate')
                end_date = period.get('endDate')
                if not start_date or not end_date:
                    continue

                # Upsert: find existing or create
                cursor.execute("""
                    SELECT period_id FROM landscape.tbl_calculation_period
                    WHERE project_id = %s
                      AND period_start_date = %s
                      AND period_end_date = %s
                    LIMIT 1
                """, [self.project_id, start_date, end_date])
                row = cursor.fetchone()

                if row:
                    period_id_map[idx] = row[0]
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_calculation_period
                            (project_id, period_start_date, period_end_date, period_type, period_sequence)
                        VALUES (%s, %s, %s, 'MONTH', %s)
                        RETURNING period_id
                    """, [self.project_id, start_date, end_date, idx + 1])
                    period_id_map[idx] = cursor.fetchone()[0]

        return period_id_map

    @transaction.atomic
    def _persist_draw_schedule(
        self,
        loan: Loan,
        result: Any,
        periods: List[Dict],
        period_id_map: Dict[int, int],
    ) -> None:
        """
        Delete old schedule rows for this loan and insert new ones.
        """
        with connection.cursor() as cursor:
            # Clear existing schedule
            cursor.execute(
                "DELETE FROM landscape.tbl_debt_draw_schedule WHERE loan_id = %s",
                [loan.loan_id],
            )

            cumulative_drawn = 0.0
            cumulative_interest = 0.0
            rate_pct = float(loan.interest_rate_pct or 0)

            for rp in result.periods:
                period_id = period_id_map.get(rp.period_index)
                if period_id is None:
                    continue

                cumulative_drawn += rp.cost_draw
                cumulative_interest += rp.accrued_interest

                # Interest paid = either from reserve or from project cash flow
                interest_paid = rp.interest_reserve_draw
                deferred = rp.accrued_interest - interest_paid

                cursor.execute("""
                    INSERT INTO landscape.tbl_debt_draw_schedule (
                        loan_id, period_id, draw_number,
                        draw_amount, cumulative_drawn, available_remaining,
                        beginning_balance, ending_balance,
                        draw_date, draw_purpose, draw_status,
                        interest_rate_pct, interest_amount, interest_expense,
                        interest_paid, deferred_interest, cumulative_interest,
                        principal_payment, outstanding_balance,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        NOW(), NOW()
                    )
                """, [
                    loan.loan_id,
                    period_id,
                    rp.period_index + 1,  # draw_number (1-based)
                    round(rp.cost_draw, 2),
                    round(cumulative_drawn, 2),
                    round(max(result.commitment_amount - cumulative_drawn - result.origination_fee - result.interest_reserve_funded, 0), 2),
                    round(rp.beginning_balance, 2),
                    round(rp.ending_balance, 2),
                    rp.date or None,  # draw_date
                    'COST_DRAW' if rp.cost_draw > 0 else None,
                    'PROJECTED',
                    rate_pct,
                    round(rp.accrued_interest, 2),
                    round(rp.accrued_interest, 2),  # interest_expense = accrued
                    round(interest_paid, 2),
                    round(deferred, 2),
                    round(cumulative_interest, 2),
                    round(rp.release_payments, 2),  # principal_payment = release payments
                    round(rp.ending_balance, 2),
                ])

    def _update_loan_summary(self, loan: Loan, result: Any) -> None:
        """Update loan record with calculated commitment and reserve."""
        net_proceeds = (
            result.commitment_amount
            - result.origination_fee
            - result.interest_reserve_funded
            - result.closing_costs
        )
        loan.commitment_amount = Decimal(str(round(result.commitment_amount, 2)))
        loan.calculated_commitment_amount = Decimal(str(round(result.commitment_amount, 2)))
        loan.interest_reserve_amount = Decimal(str(round(result.interest_reserve_funded, 2)))
        loan.net_loan_proceeds = Decimal(str(round(net_proceeds, 2)))
        loan.commitment_sizing_method = 'LTC'
        loan.governing_constraint = 'LTC'
        loan.save(update_fields=[
            'commitment_amount',
            'calculated_commitment_amount',
            'interest_reserve_amount',
            'net_loan_proceeds',
            'commitment_sizing_method',
            'governing_constraint',
            'updated_at',
        ])
