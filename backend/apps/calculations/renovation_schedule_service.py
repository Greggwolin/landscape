"""
Renovation Schedule Service

Generates a month-by-month, unit-by-unit renovation schedule for value-add
multifamily projects. This schedule drives the DCF revenue bifurcation,
renovation vacancy calculation, and renovation cost timing.

Input sources:
- tbl_value_add_assumptions: Renovation program parameters
- tbl_multifamily_unit: Individual unit rent roll data
- tbl_dcf_analysis (CRE row): Hold period, vacancy rates, growth rates
- tbl_project_assumption: Fallback growth rates

Output:
- monthly_summary: Aggregated month-by-month revenue/cost totals
- unit_schedule: Per-unit renovation timeline
- program_summary: High-level program metrics
"""

import math
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

from django.db import connection
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.multifamily.models import MultifamilyUnit, ValueAddAssumptions


class RenovationScheduleService:
    """
    Generates a monthly unit-by-unit renovation schedule for value-add projects.
    """

    # Non-residential unit types to exclude from renovation
    NON_RESIDENTIAL_TYPES = {
        'office', 'commercial', 'retail', 'storage', 'parking',
        'leasing office', 'manager', 'maintenance',
    }

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._assumptions = None
        self._units = None
        self._hold_period_months = None
        self._rent_growth_rate = None
        self._cost_inflation_rate = None
        self._vacancy_rate = None
        self._stabilized_vacancy_rate = None
        self._load_data()

    def _load_data(self):
        """Load value-add assumptions, units, and growth rates."""
        self._assumptions = self._load_assumptions()
        self._units = self._load_units()
        dcf_params = self._load_dcf_params()
        self._hold_period_months = dcf_params['hold_period_years'] * 12
        self._rent_growth_rate = dcf_params['income_growth_rate']
        self._cost_inflation_rate = dcf_params['expense_growth_rate']
        self._vacancy_rate = dcf_params['vacancy_rate']
        self._stabilized_vacancy_rate = dcf_params['stabilized_vacancy_rate']

    def _load_assumptions(self) -> Dict[str, Any]:
        """Load from tbl_value_add_assumptions."""
        try:
            va = ValueAddAssumptions.objects.get(project_id=self.project_id)
            return {
                'is_enabled': va.is_enabled,
                'reno_start_month': int(va.reno_start_month or 3),
                'reno_starts_per_month': int(va.reno_starts_per_month or 2),
                'months_to_complete': int(va.months_to_complete or 3),
                'relet_lag_months': int(va.relet_lag_months or 2),
                'reno_cost_per_sf': float(va.reno_cost_per_sf or 0),
                'reno_cost_basis': va.reno_cost_basis or 'sf',
                'relocation_incentive': float(va.relocation_incentive or 0),
                'rent_premium_pct': float(va.rent_premium_pct or 0),
                'renovate_all': va.renovate_all,
                'units_to_renovate': va.units_to_renovate,
            }
        except ValueAddAssumptions.DoesNotExist:
            return {
                'is_enabled': False,
                'reno_start_month': 3,
                'reno_starts_per_month': 2,
                'months_to_complete': 3,
                'relet_lag_months': 2,
                'reno_cost_per_sf': 25.0,
                'reno_cost_basis': 'sf',
                'relocation_incentive': 3500.0,
                'rent_premium_pct': 0.30,
                'renovate_all': True,
                'units_to_renovate': None,
            }

    def _load_units(self) -> List[Dict[str, Any]]:
        """Load residential units from tbl_multifamily_unit, sorted by unit_number."""
        units_qs = MultifamilyUnit.objects.filter(
            project_id=self.project_id,
        ).order_by('unit_number')

        result = []
        for u in units_qs:
            # Exclude non-residential units
            unit_type_lower = (u.unit_type or '').lower().strip()
            is_residential = not any(
                nr in unit_type_lower for nr in self.NON_RESIDENTIAL_TYPES
            )
            if not is_residential:
                continue

            result.append({
                'unit_id': u.unit_id,
                'unit_number': u.unit_number,
                'unit_type': u.unit_type,
                'square_feet': int(u.square_feet or 0),
                'bedrooms': float(u.bedrooms) if u.bedrooms else None,
                'bathrooms': float(u.bathrooms) if u.bathrooms else None,
                'current_rent': float(u.current_rent or 0),
                'market_rent': float(u.market_rent or 0),
                'renovation_status': u.renovation_status or 'ORIGINAL',
            })

        return result

    def _load_dcf_params(self) -> Dict[str, Any]:
        """Load hold period, growth rates, and vacancy from DCF analysis and assumptions."""
        defaults = {
            'hold_period_years': 10,
            'income_growth_rate': 0.03,
            'expense_growth_rate': 0.03,
            'vacancy_rate': 0.05,
            'stabilized_vacancy_rate': 0.05,
        }

        with connection.cursor() as cursor:
            # Get CRE DCF analysis for this project
            try:
                cursor.execute("""
                    SELECT hold_period_years, vacancy_rate, stabilized_vacancy
                    FROM landscape.tbl_dcf_analysis
                    WHERE project_id = %s AND property_type = 'cre'
                    ORDER BY updated_at DESC LIMIT 1
                """, [self.project_id])
                row = cursor.fetchone()
                if row:
                    if row[0]:
                        defaults['hold_period_years'] = int(row[0])
                    if row[1]:
                        defaults['vacancy_rate'] = float(row[1])
                    if row[2]:
                        defaults['stabilized_vacancy_rate'] = float(row[2])
            except Exception:
                pass

            # Get growth rates from project assumptions
            try:
                cursor.execute("""
                    SELECT assumption_key, assumption_value
                    FROM landscape.tbl_project_assumption
                    WHERE project_id = %s AND assumption_key IN (
                        'rent_growth_rate', 'income_growth_rate',
                        'expense_inflation_rate', 'expense_growth_rate',
                        'general_inflation_rate',
                        'physical_vacancy_pct'
                    )
                """, [self.project_id])
                for key, value in cursor.fetchall():
                    fval = float(value) if value else None
                    if fval is not None:
                        if key in ('rent_growth_rate', 'income_growth_rate'):
                            defaults['income_growth_rate'] = fval
                        elif key in ('expense_inflation_rate', 'expense_growth_rate'):
                            defaults['expense_growth_rate'] = fval
                        elif key == 'general_inflation_rate':
                            # Use as fallback for expense inflation
                            if defaults['expense_growth_rate'] == 0.03:
                                defaults['expense_growth_rate'] = fval
                        elif key == 'physical_vacancy_pct':
                            defaults['vacancy_rate'] = fval
            except Exception:
                pass

            # Try growth rate sets from DCF analysis
            try:
                cursor.execute("""
                    SELECT income_growth_set_id, expense_growth_set_id
                    FROM landscape.tbl_dcf_analysis
                    WHERE project_id = %s AND property_type = 'cre'
                    ORDER BY updated_at DESC LIMIT 1
                """, [self.project_id])
                row = cursor.fetchone()
                if row:
                    for set_id, target_key in [
                        (row[0], 'income_growth_rate'),
                        (row[1], 'expense_growth_rate'),
                    ]:
                        if set_id:
                            cursor.execute("""
                                SELECT rate_value
                                FROM landscape.core_fin_growth_rate_steps
                                WHERE set_id = %s
                                ORDER BY period_index ASC LIMIT 1
                            """, [set_id])
                            rate_row = cursor.fetchone()
                            if rate_row and rate_row[0]:
                                defaults[target_key] = float(rate_row[0])
            except Exception:
                pass

        return defaults

    def generate_schedule(self) -> Dict[str, Any]:
        """
        Generate the full renovation schedule.

        Returns:
            {
                'monthly_summary': [...],  # Per-month aggregated totals
                'unit_schedule': [...],    # Per-unit renovation timeline
                'program_summary': {...},  # High-level program metrics
            }
        """
        a = self._assumptions
        rent_growth = self._rent_growth_rate
        cost_inflation = self._cost_inflation_rate
        hold_months = self._hold_period_months

        # Determine which units to renovate
        renovatable = [
            u for u in self._units
            if u['renovation_status'] in ('ORIGINAL', 'PLANNED')
        ]

        if a['renovate_all']:
            units_to_reno = renovatable
        else:
            limit = a['units_to_renovate'] or len(renovatable)
            units_to_reno = renovatable[:limit]

        # Build per-unit schedule
        unit_schedule = self._build_unit_schedule(units_to_reno, a, cost_inflation)

        # Build monthly summary across full hold period
        monthly_summary = self._build_monthly_summary(
            unit_schedule, hold_months, rent_growth,
            a, self._vacancy_rate, self._stabilized_vacancy_rate,
        )

        # Build program summary
        program_summary = self._build_program_summary(
            unit_schedule, monthly_summary, a, rent_growth,
        )

        return {
            'monthly_summary': monthly_summary,
            'unit_schedule': unit_schedule,
            'program_summary': program_summary,
        }

    def _build_unit_schedule(
        self,
        units: List[Dict],
        assumptions: Dict,
        cost_inflation: float,
    ) -> List[Dict]:
        """Build per-unit renovation timeline with batch processing."""
        start_month = assumptions['reno_start_month']
        starts_per_month = assumptions['reno_starts_per_month']
        months_to_complete = assumptions['months_to_complete']
        relet_lag = assumptions['relet_lag_months']
        base_reno_cost_per_sf = assumptions['reno_cost_per_sf']
        reno_cost_basis = assumptions['reno_cost_basis']
        base_relocation = assumptions['relocation_incentive']

        schedule = []
        for idx, unit in enumerate(units):
            # Determine which month this unit starts reno
            batch_index = idx // starts_per_month
            unit_start_month = start_month + batch_index

            # Timeline
            reno_complete_month = unit_start_month + months_to_complete - 1
            relet_month = reno_complete_month + relet_lag + 1  # First revenue month

            # Offline months (construction + relet lag)
            offline_months = list(range(
                unit_start_month,
                relet_month
            ))

            # Cost calculation (inflate from Time 0)
            # NOTE: reno_cost_per_sf always stores cost-per-SF in the DB,
            # even when reno_cost_basis='unit'. The frontend converts
            # per-unit cost to per-SF by dividing by avg_sf before saving.
            # So we always multiply by unit square footage.
            inflation_factor = (1 + cost_inflation) ** (unit_start_month / 12.0)
            base_cost = base_reno_cost_per_sf * unit['square_feet']
            reno_cost_inflated = round(base_cost * inflation_factor, 2)
            relocation_inflated = round(base_relocation * inflation_factor, 2)

            schedule.append({
                'unit_id': unit['unit_id'],
                'unit_number': unit['unit_number'],
                'unit_type': unit['unit_type'],
                'square_feet': unit['square_feet'],
                'current_rent': unit['current_rent'],
                'market_rent': unit['market_rent'],
                'reno_start_month': unit_start_month,
                'reno_complete_month': reno_complete_month,
                'relet_month': relet_month,
                'offline_months': offline_months,
                'reno_cost_inflated': reno_cost_inflated,
                'relocation_inflated': relocation_inflated,
            })

        return schedule

    def _build_monthly_summary(
        self,
        unit_schedule: List[Dict],
        hold_months: int,
        rent_growth: float,
        assumptions: Dict,
        vacancy_rate: float,
        stabilized_vacancy_rate: float,
    ) -> List[Dict]:
        """Build month-by-month aggregated totals across the full hold period."""
        # All units (including non-renovated) for total revenue calculation
        all_residential = self._units

        # Create a lookup for units in the renovation program
        reno_lookup = {entry['unit_id']: entry for entry in unit_schedule}

        summary = []
        for month in range(1, hold_months + 1):
            units_existing = 0
            units_in_reno = 0
            units_in_relet = 0
            units_renovated = 0
            revenue_existing = 0.0
            revenue_renovated = 0.0
            reno_vacancy_loss = 0.0
            reno_cost_total = 0.0
            relocation_cost_total = 0.0

            for unit in all_residential:
                uid = unit['unit_id']
                sched = reno_lookup.get(uid)

                if sched is None:
                    # Not in renovation program — existing throughout
                    inflated_rent = unit['current_rent'] * (1 + rent_growth) ** (month / 12.0)
                    revenue_existing += inflated_rent
                    units_existing += 1
                    continue

                status = self.get_unit_status_at_month(sched, month)
                rent = self.get_unit_rent_at_month(sched, month, rent_growth)

                if status == 'ORIGINAL':
                    revenue_existing += rent
                    units_existing += 1
                elif status == 'IN_PROGRESS':
                    units_in_reno += 1
                    # Vacancy loss = what would have been collected (inflated current rent)
                    lost_rent = unit['current_rent'] * (1 + rent_growth) ** (month / 12.0)
                    reno_vacancy_loss += lost_rent
                    # Cost hits in first month of construction (Option A)
                    if month == sched['reno_start_month']:
                        reno_cost_total += sched['reno_cost_inflated']
                        relocation_cost_total += sched['relocation_inflated']
                elif status == 'RELET_LAG':
                    units_in_relet += 1
                    lost_rent = unit['current_rent'] * (1 + rent_growth) ** (month / 12.0)
                    reno_vacancy_loss += lost_rent
                elif status == 'RENOVATED':
                    revenue_renovated += rent
                    units_renovated += 1

            summary.append({
                'month': month,
                'units_existing': units_existing,
                'units_in_reno': units_in_reno,
                'units_in_relet': units_in_relet,
                'units_renovated': units_renovated,
                'revenue_existing': round(revenue_existing, 2),
                'revenue_renovated': round(revenue_renovated, 2),
                'revenue_total': round(revenue_existing + revenue_renovated, 2),
                'reno_vacancy_loss': round(reno_vacancy_loss, 2),
                'reno_cost': round(reno_cost_total, 2),
                'relocation_cost': round(relocation_cost_total, 2),
            })

        return summary

    def _build_program_summary(
        self,
        unit_schedule: List[Dict],
        monthly_summary: List[Dict],
        assumptions: Dict,
        rent_growth: float,
    ) -> Dict[str, Any]:
        """Build high-level program metrics."""
        total_residential = len(self._units)
        units_to_renovate = len(unit_schedule)

        if units_to_renovate == 0:
            return {
                'total_units': total_residential,
                'units_to_renovate': 0,
                'program_start_month': 0,
                'program_end_month': 0,
                'program_duration_months': 0,
                'total_reno_cost': 0,
                'total_relocation_cost': 0,
                'total_vacancy_loss': 0,
                'total_program_cost': 0,
                'annual_revenue_increase': 0,
                'simple_payback_months': 0,
            }

        program_start = unit_schedule[0]['reno_start_month']
        last_relet = max(s['relet_month'] for s in unit_schedule)
        program_duration = last_relet - program_start

        total_reno_cost = sum(s['reno_cost_inflated'] for s in unit_schedule)
        total_relocation = sum(s['relocation_inflated'] for s in unit_schedule)
        total_vacancy_loss = sum(m['reno_vacancy_loss'] for m in monthly_summary)
        total_program_cost = total_reno_cost + total_relocation + total_vacancy_loss

        # Annual revenue increase at stabilization (all renovated, inflated at last relet month)
        annual_increase = 0.0
        for sched in unit_schedule:
            post_reno_rent = sched['market_rent'] * (1 + rent_growth) ** (last_relet / 12.0)
            pre_reno_rent = sched['current_rent'] * (1 + rent_growth) ** (last_relet / 12.0)
            annual_increase += (post_reno_rent - pre_reno_rent) * 12

        simple_payback = 0
        if annual_increase > 0:
            simple_payback = math.ceil(total_program_cost / (annual_increase / 12))

        return {
            'total_units': total_residential,
            'units_to_renovate': units_to_renovate,
            'program_start_month': program_start,
            'program_end_month': last_relet,
            'program_duration_months': program_duration,
            'total_reno_cost': round(total_reno_cost, 2),
            'total_relocation_cost': round(total_relocation, 2),
            'total_vacancy_loss': round(total_vacancy_loss, 2),
            'total_program_cost': round(total_program_cost, 2),
            'annual_revenue_increase': round(annual_increase, 2),
            'simple_payback_months': simple_payback,
        }

    @staticmethod
    def get_unit_status_at_month(unit_schedule_entry: Dict, month: int) -> str:
        """Returns: ORIGINAL, IN_PROGRESS, RELET_LAG, or RENOVATED."""
        start = unit_schedule_entry['reno_start_month']
        complete = unit_schedule_entry['reno_complete_month']
        relet = unit_schedule_entry['relet_month']

        if month < start:
            return 'ORIGINAL'
        elif month <= complete:
            return 'IN_PROGRESS'
        elif month < relet:
            return 'RELET_LAG'
        else:
            return 'RENOVATED'

    @staticmethod
    def get_unit_rent_at_month(
        unit_schedule_entry: Dict,
        month: int,
        rent_growth_rate: float,
    ) -> float:
        """
        Returns the monthly rent for a unit at a given month.
        - ORIGINAL: current_rent inflated from Time 0
        - IN_PROGRESS or RELET_LAG: $0
        - RENOVATED: market_rent inflated from Time 0
        """
        start = unit_schedule_entry['reno_start_month']
        complete = unit_schedule_entry['reno_complete_month']
        relet = unit_schedule_entry['relet_month']

        if month < start:
            return unit_schedule_entry['current_rent'] * (1 + rent_growth_rate) ** (month / 12.0)
        elif month <= complete:
            return 0.0
        elif month < relet:
            return 0.0
        else:
            return unit_schedule_entry['market_rent'] * (1 + rent_growth_rate) ** (month / 12.0)

    def get_cost_to_complete(self, exit_month: int) -> Dict[str, Any]:
        """
        At a given exit month, calculate the remaining cost to complete
        the renovation program. Returns unit-level detail for audit trail.

        Args:
            exit_month: The month of projected sale/exit (1-indexed)

        Returns dict with:
        {
            'exit_month': int,
            'summary': {
                'units_completed': int,
                'units_in_relet': int,
                'units_in_construction': int,
                'units_not_started': int,
                'total_units_in_program': int,
                'remaining_reno_cost': Decimal,
                'remaining_relocation_cost': Decimal,
                'remaining_vacancy_loss': Decimal,
                'total_pending_offset': Decimal,
            },
            'by_category': [
                {
                    'category': str,
                    'units': int,
                    'detail': str,
                    'amount': Decimal,
                },
                ...
            ],
            'unit_detail': [
                {
                    'unit_id': int,
                    'unit_number': str,
                    'unit_type': str,
                    'square_feet': int,
                    'current_rent': Decimal,
                    'market_rent': Decimal,
                    'status_at_exit': str,
                    'reno_start_month': int,
                    'reno_complete_month': int,
                    'relet_month': int,
                    'months_remaining_offline': int,
                    'remaining_reno_cost': Decimal,
                    'remaining_vacancy_loss': Decimal,
                    'remaining_relocation': Decimal,
                    'total_remaining': Decimal,
                },
                ...
            ]
        }
        """
        # Generate schedule to get unit timelines
        schedule = self.generate_schedule()
        unit_schedule = schedule['unit_schedule']

        rent_growth = self._rent_growth_rate
        cost_inflation = self._cost_inflation_rate

        # Counters for summary
        units_completed = 0
        units_in_relet = 0
        units_in_construction = 0
        units_not_started = 0

        # Category accumulators
        reno_cost_not_started = Decimal('0')
        reno_cost_in_progress = Decimal('0')
        vacancy_not_started = Decimal('0')
        vacancy_in_progress = Decimal('0')
        vacancy_relet_lag = Decimal('0')
        relocation_not_started = Decimal('0')

        unit_detail = []

        for unit_sched in unit_schedule:
            status = self.get_unit_status_at_month(unit_sched, exit_month)

            # Skip completed units
            if status == 'RENOVATED':
                units_completed += 1
                continue

            # Find original unit data for current_rent
            unit_data = next(
                (u for u in self._units if u['unit_id'] == unit_sched['unit_id']),
                None
            )
            if not unit_data:
                continue

            current_rent = Decimal(str(unit_data['current_rent']))
            market_rent = Decimal(str(unit_sched['market_rent']))
            square_feet = unit_sched['square_feet']

            remaining_reno_cost = Decimal('0')
            remaining_relocation = Decimal('0')
            remaining_vacancy_loss = Decimal('0')
            months_remaining_offline = 0

            if status == 'RELET_LAG':
                # Construction done, waiting to lease
                units_in_relet += 1
                months_remaining_offline = unit_sched['relet_month'] - exit_month

                # Remaining vacancy = remaining months × inflated current_rent
                for m in range(exit_month + 1, unit_sched['relet_month'] + 1):
                    inflated_rent = current_rent * Decimal(str((1 + rent_growth) ** (m / 12.0)))
                    remaining_vacancy_loss += inflated_rent

                vacancy_relet_lag += remaining_vacancy_loss

            elif status == 'IN_PROGRESS':
                # Mid-renovation
                units_in_construction += 1

                # Under Option A (lump sum at start), if exit > start, cost already spent
                if exit_month == unit_sched['reno_start_month']:
                    remaining_reno_cost = Decimal(str(unit_sched['reno_cost_inflated']))
                    # Note: relocation is also incurred at start, but we don't include it
                    # in remaining costs since it's being paid this month (not future)
                    reno_cost_in_progress += remaining_reno_cost
                # else: cost already incurred, remaining_reno_cost = 0

                # Remaining vacancy = (complete - exit + relet_lag) months × inflated rent
                months_remaining_offline = unit_sched['relet_month'] - exit_month
                for m in range(exit_month + 1, unit_sched['relet_month'] + 1):
                    inflated_rent = current_rent * Decimal(str((1 + rent_growth) ** (m / 12.0)))
                    remaining_vacancy_loss += inflated_rent

                vacancy_in_progress += remaining_vacancy_loss

            elif status == 'ORIGINAL':
                # Not yet started
                units_not_started += 1

                # Full reno cost (already inflated to start month in schedule)
                remaining_reno_cost = Decimal(str(unit_sched['reno_cost_inflated']))
                remaining_relocation = Decimal(str(unit_sched['relocation_inflated']))

                # Full vacancy loss for all offline months
                months_remaining_offline = unit_sched['relet_month'] - unit_sched['reno_start_month']
                for m in range(unit_sched['reno_start_month'], unit_sched['relet_month'] + 1):
                    inflated_rent = current_rent * Decimal(str((1 + rent_growth) ** (m / 12.0)))
                    remaining_vacancy_loss += inflated_rent

                reno_cost_not_started += remaining_reno_cost
                relocation_not_started += remaining_relocation
                vacancy_not_started += remaining_vacancy_loss

            total_remaining = remaining_reno_cost + remaining_relocation + remaining_vacancy_loss

            if total_remaining > 0:
                unit_detail.append({
                    'unit_id': unit_sched['unit_id'],
                    'unit_number': unit_sched['unit_number'],
                    'unit_type': unit_sched['unit_type'],
                    'square_feet': square_feet,
                    'current_rent': float(current_rent),
                    'market_rent': float(market_rent),
                    'status_at_exit': status,
                    'reno_start_month': unit_sched['reno_start_month'],
                    'reno_complete_month': unit_sched['reno_complete_month'],
                    'relet_month': unit_sched['relet_month'],
                    'months_remaining_offline': months_remaining_offline,
                    'remaining_reno_cost': float(remaining_reno_cost),
                    'remaining_vacancy_loss': float(remaining_vacancy_loss),
                    'remaining_relocation': float(remaining_relocation),
                    'total_remaining': float(total_remaining),
                })

        # Build summary
        total_remaining_reno = reno_cost_not_started + reno_cost_in_progress
        total_remaining_relocation = relocation_not_started
        total_remaining_vacancy = vacancy_not_started + vacancy_in_progress + vacancy_relet_lag
        total_pending_offset = total_remaining_reno + total_remaining_relocation + total_remaining_vacancy

        summary = {
            'units_completed': units_completed,
            'units_in_relet': units_in_relet,
            'units_in_construction': units_in_construction,
            'units_not_started': units_not_started,
            'total_units_in_program': len(unit_schedule),
            'remaining_reno_cost': float(total_remaining_reno),
            'remaining_relocation_cost': float(total_remaining_relocation),
            'remaining_vacancy_loss': float(total_remaining_vacancy),
            'total_pending_offset': float(total_pending_offset),
        }

        # Build by_category
        by_category = []

        if reno_cost_not_started > 0:
            by_category.append({
                'category': 'Renovation Costs – Not Started',
                'units': units_not_started,
                'detail': 'Full reno cost per unit, inflated to incurrence date',
                'amount': float(reno_cost_not_started),
            })

        if reno_cost_in_progress > 0:
            by_category.append({
                'category': 'Renovation Costs – In Progress',
                'units': units_in_construction,
                'detail': 'Remaining reno cost for partially completed units',
                'amount': float(reno_cost_in_progress),
            })

        if vacancy_not_started > 0:
            by_category.append({
                'category': 'Vacancy Loss – Not Started',
                'units': units_not_started,
                'detail': 'Full offline period (construction + relet lag) × inflated current rent',
                'amount': float(vacancy_not_started),
            })

        if vacancy_in_progress > 0:
            by_category.append({
                'category': 'Vacancy Loss – In Progress',
                'units': units_in_construction,
                'detail': 'Remaining construction + relet lag × inflated current rent',
                'amount': float(vacancy_in_progress),
            })

        if vacancy_relet_lag > 0:
            by_category.append({
                'category': 'Vacancy Loss – Relet Lag',
                'units': units_in_relet,
                'detail': 'Remaining relet months × inflated current rent',
                'amount': float(vacancy_relet_lag),
            })

        if relocation_not_started > 0:
            by_category.append({
                'category': 'Relocation Incentives – Not Started',
                'units': units_not_started,
                'detail': 'Incentive per unit, inflated to incurrence date',
                'amount': float(relocation_not_started),
            })

        # Sort unit_detail by reno_start_month
        unit_detail.sort(key=lambda u: u['reno_start_month'])

        return {
            'exit_month': exit_month,
            'summary': summary,
            'by_category': by_category,
            'unit_detail': unit_detail,
        }
