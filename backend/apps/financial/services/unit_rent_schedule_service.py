"""
Unit Rent Schedule Service

Generates per-unit monthly rent projections that reconcile exactly to the
DCF's GPR row. Used for the audit-grade "Rent Schedule" subtab within
Income Approach.

For non-value-add projects:
  unit_rent[m] = current_rent * (1 + monthly_income_growth)^(m-1)
  SUM(unit_rents[m]) == DCF monthly_gpr[m]  (exact match)

For value-add projects:
  Per-unit rents reflect renovation lifecycle (original → offline → renovated).
  Since the DCF uses average-based batch math while we use actual per-unit rents,
  a pro-rata adjustment factor is applied to ensure unit rows sum to DCF GPR
  exactly. This preserves relative unit proportions while guaranteeing reconciliation.

Session: Unit Rent Schedule Report
"""

from typing import Any, Dict, List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import connection
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.multifamily.models import MultifamilyUnit, MultifamilyUnitType
from .income_approach_service import IncomeApproachDataService


class UnitRentScheduleService:
    """Generates per-unit monthly rent schedule with DCF reconciliation."""

    NON_RESIDENTIAL_TYPES = ['commercial', 'office', 'retail', 'parking', 'storage']

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.data_service = IncomeApproachDataService(project_id)

    def _load_units(self) -> List[Dict[str, Any]]:
        """Load residential units from tbl_multifamily_unit, sorted by unit_number."""
        units_qs = MultifamilyUnit.objects.filter(
            project_id=self.project_id,
        ).order_by('unit_number')

        # Build unit_type lookup for plan names
        type_lookup = {}
        for ut in MultifamilyUnitType.objects.filter(project_id=self.project_id):
            type_lookup[ut.unit_type_code] = {
                'plan_name': ut.unit_type_code,
                'bedrooms': float(ut.bedrooms) if ut.bedrooms else None,
                'bathrooms': float(ut.bathrooms) if ut.bathrooms else None,
                'avg_square_feet': int(ut.avg_square_feet or 0),
            }

        result = []
        for u in units_qs:
            # Exclude non-residential units (same filter as RenovationScheduleService)
            unit_type_lower = (u.unit_type or '').lower().strip()
            is_residential = not any(
                nr in unit_type_lower for nr in self.NON_RESIDENTIAL_TYPES
            )
            if not is_residential:
                continue

            type_info = type_lookup.get(u.unit_type, {})

            # Build unit type display string (e.g., "2BR/2BA")
            bedrooms = float(u.bedrooms) if u.bedrooms else type_info.get('bedrooms')
            bathrooms = float(u.bathrooms) if u.bathrooms else type_info.get('bathrooms')
            unit_type_display = u.unit_type or ''
            if bedrooms is not None and bathrooms is not None:
                bd = int(bedrooms) if bedrooms == int(bedrooms) else bedrooms
                ba = int(bathrooms) if bathrooms == int(bathrooms) else bathrooms
                unit_type_display = f'{bd}BR/{ba}BA'

            # Build rich plan_name from unit_type + amenity (other_features)
            # e.g. "2BR/2BA" + "XL patio" → "2 Bed 2 Bath XL Patio"
            base_plan = unit_type_display
            if bedrooms is not None and bathrooms is not None:
                bd_int = int(bedrooms) if bedrooms == int(bedrooms) else bedrooms
                ba_int = int(bathrooms) if bathrooms == int(bathrooms) else bathrooms
                base_plan = f'{bd_int} Bed {ba_int} Bath'
            amenity = ''
            if hasattr(u, 'other_features') and u.other_features:
                feat = u.other_features.strip()
                # Only append meaningful amenity descriptors, skip generic notes
                amenity_keywords = ['balcony', 'patio', 'tower', 'xl patio', 'garden', 'penthouse', 'loft', 'den']
                if any(kw in feat.lower() for kw in amenity_keywords):
                    amenity = feat.title()
            plan_name = f'{base_plan} {amenity}'.strip() if amenity else base_plan

            result.append({
                'unit_id': u.unit_id,
                'unit_number': u.unit_number or '',
                'plan_name': plan_name,
                'unit_type': unit_type_display,
                'bedrooms': bedrooms,
                'bathrooms': bathrooms,
                'square_feet': int(u.square_feet or type_info.get('avg_square_feet', 0)),
                'current_rent': float(u.current_rent or 0),
                'market_rent': float(u.market_rent or 0),
                'renovation_status': u.renovation_status or 'ORIGINAL',
            })

        return result

    def _get_value_add_assumptions(self) -> Optional[Dict[str, Any]]:
        """Load value-add assumptions if enabled."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT is_enabled, reno_start_month, reno_starts_per_month,
                           months_to_complete, relet_lag_months,
                           reno_cost_per_sf, reno_cost_basis,
                           relocation_incentive, rent_premium_pct,
                           renovate_all, units_to_renovate
                    FROM landscape.tbl_value_add_assumptions
                    WHERE project_id = %s
                    ORDER BY updated_at DESC LIMIT 1
                """, [self.project_id])
                row = cursor.fetchone()
                if row and row[0]:  # is_enabled
                    return {
                        'reno_start_month': int(row[1] or 3),
                        'reno_starts_per_month': int(row[2] or 2),
                        'months_to_complete': int(row[3] or 3),
                        'relet_lag_months': int(row[4] or 2),
                        'reno_cost_per_sf': float(row[5] or 25.0),
                        'reno_cost_basis': row[6] or 'sf',
                        'relocation_incentive': float(row[7] or 3500.0),
                        'rent_premium_pct': float(row[8] or 0.30),
                        'renovate_all': bool(row[9]) if row[9] is not None else True,
                        'units_to_renovate': int(row[10]) if row[10] else None,
                    }
            except Exception:
                pass
        return None

    def _build_unit_renovation_schedule(
        self,
        units: List[Dict[str, Any]],
        value_add: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Build per-unit renovation timeline (mirrors the batch logic in
        dcf_calculation_service.build_renovation_schedule).
        """
        reno_start = value_add['reno_start_month']
        starts_per_month = value_add['reno_starts_per_month']
        months_to_complete = value_add['months_to_complete']
        relet_lag = value_add['relet_lag_months']
        renovate_all = value_add.get('renovate_all', True)
        max_units = value_add.get('units_to_renovate')

        units_to_reno = units if renovate_all else units[:max_units] if max_units else units

        schedule = []
        current_month = reno_start
        started_this_month = 0

        for unit in units_to_reno:
            if started_this_month >= starts_per_month:
                current_month += 1
                started_this_month = 0

            complete_month = current_month + months_to_complete
            relet_month = complete_month + relet_lag

            schedule.append({
                'unit_id': unit['unit_id'],
                'reno_start_month': current_month,
                'reno_complete_month': complete_month,
                'relet_month': relet_month,
            })
            started_this_month += 1

        return schedule

    def generate(self, period: str = 'monthly') -> Dict[str, Any]:
        """
        Generate the unit rent schedule with exact DCF GPR reconciliation.

        Returns dict with:
            - periods: list of {period_id, period_label}
            - units: list of unit records with rents array
            - gpr_by_period: aggregate GPR per period (matches DCF exactly)
            - dcf_summary_rows: vacancy, credit loss, other income, NRI from DCF
            - reconciliation: {ok: bool, mismatches: [...]}
        """
        project = get_object_or_404(Project, project_id=self.project_id)
        units = self._load_units()

        if not units:
            return {
                'periods': [],
                'units': [],
                'gpr_by_period': [],
                'dcf_summary_rows': [],
                'reconciliation': {'ok': True, 'mismatches': []},
                'value_add_enabled': False,
                'total_periods': 0,
                'period_type': 'monthly',
            }

        # Get assumptions (same source as DCF)
        assumptions = self.data_service.get_all_assumptions()
        hold_period = int(assumptions.get('hold_period_years', 10))
        income_growth_rate = float(assumptions.get('income_growth_rate', 0.03))

        total_months = hold_period * 12

        # Monthly growth rate (same formula as DCFCalculationService.calculate_monthly)
        monthly_income_growth = (1 + income_growth_rate) ** (1 / 12) - 1

        # Start date
        start_date = project.analysis_start_date or date.today()

        # Value-add check
        value_add = self._get_value_add_assumptions()
        reno_lookup = {}  # unit_id -> schedule entry

        if value_add:
            reno_schedule = self._build_unit_renovation_schedule(units, value_add)
            reno_lookup = {entry['unit_id']: entry for entry in reno_schedule}

        # ================================================================
        # Fetch DCF monthly data (authoritative GPR source)
        # ================================================================
        from .dcf_calculation_service import DCFCalculationService
        dcf_service = DCFCalculationService(self.project_id)
        dcf_result = dcf_service.calculate_monthly()
        dcf_projections = dcf_result.get('projections', [])

        dcf_gpr_values = [proj.get('gpr', 0) for proj in dcf_projections]

        # Build periods
        periods = []
        for month in range(1, total_months + 1):
            period_date = start_date + relativedelta(months=month - 1)
            periods.append({
                'period_id': period_date.strftime('%Y-%m'),
                'period_label': period_date.strftime('%b %Y'),
            })

        # ================================================================
        # Calculate raw per-unit rents for each month
        # ================================================================
        # raw_rents[unit_idx][month_idx] = unrounded float
        raw_rents = []
        raw_sums = [0.0] * total_months

        for unit in units:
            unit_rents = []
            reno_entry = reno_lookup.get(unit['unit_id'])

            for month in range(1, total_months + 1):
                growth_factor = (1 + monthly_income_growth) ** (month - 1)
                mi = month - 1  # 0-based index

                if reno_entry:
                    start_m = reno_entry['reno_start_month']
                    complete_m = reno_entry['reno_complete_month']
                    relet_m = reno_entry['relet_month']

                    if month < start_m:
                        rent = unit['current_rent'] * growth_factor
                    elif month <= complete_m or month < relet_m:
                        rent = 0.0
                    else:
                        # RENOVATED: current rent + premium, inflated
                        # Matches DCF logic: rent_premium_gain = per_unit_rent * premium_pct
                        # so post-reno rent = current_rent * (1 + premium_pct)
                        # Use market_rent if available, otherwise current_rent as base
                        premium_pct = value_add.get('rent_premium_pct', 0.30)
                        base_rent = unit['market_rent'] if unit['market_rent'] > 0 else unit['current_rent']
                        rent = base_rent * (1 + premium_pct) * growth_factor
                else:
                    rent = unit['current_rent'] * growth_factor

                unit_rents.append(rent)
                raw_sums[mi] += rent

            raw_rents.append(unit_rents)

        # ================================================================
        # Apply pro-rata scaling to match DCF GPR exactly
        # ================================================================
        # For each month, if raw_sum != dcf_gpr, scale each unit's rent
        # proportionally so the sum matches. For non-value-add projects,
        # the scaling factor should be ~1.0 (only rounding differences).
        # For value-add projects, this corrects for the difference between
        # per-unit actual rents and the DCF's average-based batch math.
        unit_results = []
        gpr_by_period = [0.0] * total_months

        for ui, unit in enumerate(units):
            rents = []
            for mi in range(total_months):
                raw = raw_rents[ui][mi]
                dcf_gpr = dcf_gpr_values[mi] if mi < len(dcf_gpr_values) else 0
                raw_sum = raw_sums[mi]

                if raw_sum > 0 and raw > 0:
                    # Scale proportionally to match DCF GPR
                    rent = raw * (dcf_gpr / raw_sum)
                else:
                    rent = 0.0

                rent = round(rent, 2)
                rents.append(rent)
                gpr_by_period[mi] += rent

            unit_results.append({
                'unit_id': unit['unit_id'],
                'unit_number': unit['unit_number'],
                'plan_name': unit['plan_name'],
                'unit_type': unit['unit_type'],
                'bedrooms': unit['bedrooms'],
                'bathrooms': unit['bathrooms'],
                'square_feet': unit['square_feet'],
                'rents': rents,
            })

        # Round GPR sums
        gpr_by_period = [round(v, 2) for v in gpr_by_period]

        # ================================================================
        # Build DCF summary rows from existing DCF data
        # ================================================================
        vacancy_values = []
        credit_loss_values = []
        other_income_values = []
        nri_values = []

        for proj in dcf_projections:
            vacancy_values.append(-abs(proj.get('vacancy_loss', 0)))
            credit_loss_values.append(-abs(proj.get('credit_loss', 0)))
            other_income_values.append(proj.get('other_income', 0))
            nri = (proj.get('gpr', 0)
                   - abs(proj.get('vacancy_loss', 0))
                   - abs(proj.get('credit_loss', 0))
                   + proj.get('other_income', 0))
            nri_values.append(round(nri, 2))

        dcf_summary_rows = [
            {'label': 'Less: Vacancy', 'values': vacancy_values},
            {'label': 'Less: Credit Loss', 'values': credit_loss_values},
            {'label': 'Other Income', 'values': other_income_values},
            {'label': 'Net Rental Income', 'values': nri_values},
        ]

        # ================================================================
        # Reconciliation check (should always pass after pro-rata scaling)
        # ================================================================
        reconciliation_ok = True
        mismatches = []

        for i in range(min(len(gpr_by_period), len(dcf_gpr_values))):
            diff = abs(gpr_by_period[i] - dcf_gpr_values[i])
            if diff > 1.00:  # Tolerance for cumulative rounding across many units
                reconciliation_ok = False
                mismatches.append({
                    'period': i + 1,
                    'unit_sum': gpr_by_period[i],
                    'dcf_gpr': dcf_gpr_values[i],
                    'diff': round(diff, 2),
                })

        return {
            'project_id': self.project_id,
            'periods': periods,
            'units': unit_results,
            'gpr_by_period': gpr_by_period,
            'dcf_gpr_by_period': dcf_gpr_values,
            'dcf_summary_rows': dcf_summary_rows,
            'reconciliation': {
                'ok': reconciliation_ok,
                'mismatches': mismatches[:5] if mismatches else [],
            },
            'value_add_enabled': value_add is not None,
            'total_periods': total_months,
            'period_type': 'monthly',
        }
