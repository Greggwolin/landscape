"""
API views for Income Approach valuation UI.

Provides a comprehensive endpoint for the Income Approach valuation page that
calculates three NOI bases (F-12 Current, F-12 Market, Stabilized) and
returns detailed P&L data.

NOI Bases:
- F-12 Current: Forward 12 months using current (in-place) rents
- F-12 Market: Forward 12 months using market rents
- Stabilized: Market rent at stabilized occupancy

Data is aggregated from multiple existing tables:
- tbl_income_approach: Going-in cap rate, cap rate method
- tbl_cre_dcf_analysis: Hold period, discount rate, terminal cap, selling costs
- tbl_project_assumption: Vacancy, credit loss, management fee, reserves
- core_fin_growth_rate_sets/steps: Income and expense growth rates

Session: QK-11 (original), QK-16 (refactor), QK-30 (3-basis consolidation)
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.shortcuts import get_object_or_404
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, Any

from apps.projects.models import Project
from .models_valuation import IncomeApproach
from .services.income_approach_service import IncomeApproachDataService


def decimal_or_zero(value: Any) -> Decimal:
    """Convert value to Decimal, defaulting to 0 if None or invalid."""
    if value is None:
        return Decimal('0')
    try:
        return Decimal(str(value))
    except:
        return Decimal('0')


def calculate_direct_cap_value(noi: Decimal, cap_rate: Decimal) -> Optional[Decimal]:
    """Calculate direct capitalization value: NOI / Cap Rate."""
    if not cap_rate or cap_rate <= 0:
        return None
    return (noi / cap_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _get_income_approach_data(project_id: int) -> dict:
    """
    Internal helper that returns income approach data as a dict.
    Used by both GET and PUT/PATCH endpoints.
    QK-22: Extracted to avoid decorator conflicts when calling from PUT handler.
    """
    project = get_object_or_404(Project, project_id=project_id)

    # Use the data service to aggregate assumptions from multiple tables
    data_service = IncomeApproachDataService(project_id)

    # Ensure an income_approach record exists (for storing cap rate)
    income_approach, created = IncomeApproach.objects.get_or_create(
        project_id=project_id,
        defaults={
            'selected_cap_rate': Decimal('0.0525'),
            'market_cap_rate_method': 'comp_sales',
        }
    )

    with connection.cursor() as cursor:
        # =====================================================================
        # PROPERTY SUMMARY
        # =====================================================================
        cursor.execute("""
            SELECT
                COALESCE(total_units, 0) as unit_count,
                COALESCE(gross_sf, 0) as total_sf
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])
        project_row = cursor.fetchone()
        unit_count = int(project_row[0]) if project_row else 0
        total_sf = float(project_row[1]) if project_row else 0

        # If unit_count not in project, try multifamily_unit table
        if unit_count == 0:
            cursor.execute("""
                SELECT
                    COUNT(*)::int as unit_count,
                    COALESCE(SUM(square_feet), 0)::numeric as total_sf
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
            """, [project_id])
            mf_row = cursor.fetchone()
            if mf_row and mf_row[0] > 0:
                unit_count = int(mf_row[0])
                total_sf = float(mf_row[1])

        # Fallback to unit types
        if unit_count == 0:
            cursor.execute("""
                SELECT
                    COALESCE(SUM(unit_count), 0)::int as unit_count,
                    COALESCE(SUM(unit_count * avg_square_feet), 0)::numeric as total_sf
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [project_id])
            ut_row = cursor.fetchone()
            if ut_row:
                unit_count = int(ut_row[0])
                total_sf = float(ut_row[1])

        avg_unit_sf = total_sf / unit_count if unit_count > 0 else 0

        # =====================================================================
        # RENT ROLL DATA
        # =====================================================================
        cursor.execute("""
            SELECT
                COALESCE(SUM(u.current_rent), 0) * 12 as t12_gpr,
                COALESCE(SUM(
                    CASE
                        WHEN COALESCE(u.market_rent, 0) > 0 THEN u.market_rent
                        ELSE COALESCE(ut.current_market_rent, u.current_rent, 0)
                    END
                ), 0) * 12 as forward_gpr,
                COUNT(*) as unit_count
            FROM landscape.tbl_multifamily_unit u
            LEFT JOIN landscape.tbl_multifamily_unit_type ut
                ON ut.project_id = u.project_id
                AND ut.unit_type_code = u.unit_type
            WHERE u.project_id = %s
        """, [project_id])
        rent_row = cursor.fetchone()

        t12_gpr = decimal_or_zero(rent_row[0]) if rent_row else Decimal('0')
        forward_gpr = decimal_or_zero(rent_row[1]) if rent_row else Decimal('0')

        # If no units, try unit types table
        if t12_gpr == 0 and forward_gpr == 0:
            cursor.execute("""
                SELECT
                    COALESCE(SUM(unit_count * current_market_rent), 0) * 12 as forward_gpr,
                    COALESCE(SUM(unit_count), 0) as unit_count
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [project_id])
            ut_rent_row = cursor.fetchone()
            if ut_rent_row:
                forward_gpr = decimal_or_zero(ut_rent_row[0])
                t12_gpr = forward_gpr
                if ut_rent_row[1] and unit_count == 0:
                    unit_count = int(ut_rent_row[1])

        # Get rent roll line items for display
        cursor.execute("""
            SELECT
                unit_type_code as line_item_key,
                unit_type_name as label,
                unit_count,
                avg_square_feet,
                current_market_rent as market_rent,
                (unit_count * current_market_rent * 12) as annual_total
            FROM landscape.tbl_multifamily_unit_type
            WHERE project_id = %s
            ORDER BY unit_type_code
        """, [project_id])
        rent_roll_rows = cursor.fetchall()

        rent_roll_items = []
        for row in rent_roll_rows:
            rent_roll_items.append({
                'line_item_key': row[0],
                'label': row[1] or row[0],
                'unit_count': int(row[2]) if row[2] else 0,
                'avg_sf': float(row[3]) if row[3] else 0,
                'monthly_rent': float(row[4]) if row[4] else 0,
                'annual_total': float(row[5]) if row[5] else 0,
            })

        # =====================================================================
        # OPERATING EXPENSES
        # =====================================================================
        cursor.execute("""
            SELECT
                oe.expense_category,
                oe.expense_type,
                COALESCE(SUM(oe.annual_amount), 0) as annual_amount
            FROM landscape.tbl_operating_expenses oe
            WHERE oe.project_id = %s
            GROUP BY oe.expense_category, oe.expense_type
            ORDER BY oe.expense_category, oe.expense_type
        """, [project_id])
        opex_rows = cursor.fetchall()

        opex_items = []
        total_opex = Decimal('0')
        for row in opex_rows:
            amount = decimal_or_zero(row[2])
            total_opex += amount
            opex_items.append({
                'category': row[0],
                'expense_type': row[1],
                'annual_amount': float(amount),
                'per_unit': float(amount / unit_count) if unit_count > 0 else 0,
                'per_sf': float(amount / Decimal(str(total_sf))) if total_sf > 0 else 0,
            })

        # If no opex data, try the hierarchical chart of accounts
        # Gracefully handle missing tables
        if not opex_items:
            try:
                cursor.execute("""
                    SELECT
                        cc.category_name as category,
                        cc.account_number,
                        COALESCE(f.annual_amount, 0) +
                        COALESCE(f.unit_amount * %s, 0) +
                        COALESCE(f.amount_per_sf * %s, 0) as annual_amount
                    FROM landscape.core_unit_cost_category cc
                    LEFT JOIN landscape.tbl_operating_expense_fact f
                        ON f.category_id = cc.category_id AND f.project_id = %s
                    WHERE cc.account_number >= '5100' AND cc.account_number < '5900'
                    ORDER BY cc.account_number
                """, [unit_count, total_sf, project_id])
                coa_rows = cursor.fetchall()

                for row in coa_rows:
                    amount = decimal_or_zero(row[2])
                    if amount > 0:
                        total_opex += amount
                        opex_items.append({
                            'category': row[0],
                            'expense_type': row[1],
                            'annual_amount': float(amount),
                            'per_unit': float(amount / unit_count) if unit_count > 0 else 0,
                            'per_sf': float(amount / Decimal(str(total_sf))) if total_sf > 0 else 0,
                        })
            except Exception:
                # Table doesn't exist - continue without opex data
                pass

    # =========================================================================
    # ASSUMPTIONS - Aggregated from multiple tables via service
    # =========================================================================
    assumptions = data_service.get_all_assumptions()

    # =========================================================================
    # CALCULATE 3 NOI BASES (F-12 Current, F-12 Market, Stabilized)
    # =========================================================================
    vacancy_rate = decimal_or_zero(assumptions['vacancy_rate'])
    stabilized_vacancy_rate = decimal_or_zero(assumptions['stabilized_vacancy_rate'])
    credit_loss_rate = decimal_or_zero(assumptions['credit_loss_rate'])
    other_income = decimal_or_zero(assumptions.get('other_income', 0))
    management_fee_pct = decimal_or_zero(assumptions['management_fee_pct'])
    replacement_reserves = decimal_or_zero(assumptions['replacement_reserves_per_unit']) * unit_count
    selected_cap_rate = decimal_or_zero(assumptions['selected_cap_rate'])

    def calculate_noi(gpr: Decimal, vac_rate: Decimal) -> Dict:
        """Calculate NOI components for a given GPR and vacancy rate."""
        vacancy_loss = gpr * vac_rate
        credit_loss = gpr * credit_loss_rate
        egi = gpr - vacancy_loss - credit_loss + other_income

        # Operating expenses (excluding management and reserves)
        base_opex = total_opex
        mgmt_fee = egi * management_fee_pct
        total_expenses = base_opex + mgmt_fee + replacement_reserves

        noi = egi - total_expenses

        return {
            'gpr': float(gpr),
            'vacancy_loss': float(vacancy_loss),
            'vacancy_rate': float(vac_rate),
            'credit_loss': float(credit_loss),
            'credit_loss_rate': float(credit_loss_rate),
            'other_income': float(other_income),
            'egi': float(egi),
            'base_opex': float(base_opex),
            'management_fee': float(mgmt_fee),
            'management_fee_pct': float(management_fee_pct),
            'replacement_reserves': float(replacement_reserves),
            'total_opex': float(total_expenses),
            'noi': float(noi),
            'expense_ratio': float(total_expenses / egi) if egi > 0 else 0,
        }

    # F-12 Current (uses current_rent / in-place rents)
    f12_current_calc = calculate_noi(t12_gpr, vacancy_rate)
    f12_current_value = calculate_direct_cap_value(Decimal(str(f12_current_calc['noi'])), selected_cap_rate)

    # F-12 Market (uses market_rent)
    f12_market_calc = calculate_noi(forward_gpr, vacancy_rate)
    f12_market_value = calculate_direct_cap_value(Decimal(str(f12_market_calc['noi'])), selected_cap_rate)

    # Stabilized (uses market_rent with market-standard vacancy)
    stab_calc = calculate_noi(forward_gpr, stabilized_vacancy_rate)
    stab_value = calculate_direct_cap_value(Decimal(str(stab_calc['noi'])), selected_cap_rate)

    # =========================================================================
    # VALUE TILES DATA (3 Direct Cap + placeholder for DCF)
    # =========================================================================
    value_tiles = [
        {
            'id': 'f12_current',
            'label': 'F-12 Current',
            'value': float(f12_current_value) if f12_current_value else None,
            'noi': f12_current_calc['noi'],
            'cap_rate': float(selected_cap_rate),
            'price_per_unit': float(f12_current_value / unit_count) if f12_current_value and unit_count > 0 else None,
            'price_per_sf': float(f12_current_value / Decimal(str(total_sf))) if f12_current_value and total_sf > 0 else None,
            'calculation': f12_current_calc,
        },
        {
            'id': 'f12_market',
            'label': 'F-12 Market',
            'value': float(f12_market_value) if f12_market_value else None,
            'noi': f12_market_calc['noi'],
            'cap_rate': float(selected_cap_rate),
            'price_per_unit': float(f12_market_value / unit_count) if f12_market_value and unit_count > 0 else None,
            'price_per_sf': float(f12_market_value / Decimal(str(total_sf))) if f12_market_value and total_sf > 0 else None,
            'calculation': f12_market_calc,
        },
        {
            'id': 'stabilized',
            'label': 'Stabilized',
            'value': float(stab_value) if stab_value else None,
            'noi': stab_calc['noi'],
            'cap_rate': float(selected_cap_rate),
            'price_per_unit': float(stab_value / unit_count) if stab_value and unit_count > 0 else None,
            'price_per_sf': float(stab_value / Decimal(str(total_sf))) if stab_value and total_sf > 0 else None,
            'calculation': stab_calc,
            'uses_stabilized_vacancy': True,
        },
    ]

    # =========================================================================
    # SENSITIVITY MATRIX
    # =========================================================================
    cap_interval = decimal_or_zero(assumptions.get('cap_rate_interval', 0.005))
    base_cap = selected_cap_rate

    # Use the selected NOI basis for sensitivity
    # Map legacy basis names to new ones for backwards compatibility
    raw_basis = assumptions.get('noi_capitalization_basis', 'f12_market')
    basis_mapping = {
        'trailing_12': 'f12_current',
        'forward_12': 'f12_market',
        'avg_straddle': 'f12_market',  # Map average to market as fallback
    }
    selected_basis = basis_mapping.get(raw_basis, raw_basis)

    if selected_basis == 'f12_current':
        sensitivity_noi = Decimal(str(f12_current_calc['noi']))
    elif selected_basis == 'stabilized':
        sensitivity_noi = Decimal(str(stab_calc['noi']))
    else:  # f12_market (default)
        sensitivity_noi = Decimal(str(f12_market_calc['noi']))

    sensitivity_matrix = []
    for i in range(-2, 3):  # 5 data points
        cap = base_cap + (cap_interval * i)
        if cap > 0:
            val = calculate_direct_cap_value(sensitivity_noi, cap)
            sensitivity_matrix.append({
                'cap_rate': float(cap),
                'value': float(val) if val else None,
                'price_per_unit': float(val / unit_count) if val and unit_count > 0 else None,
                'is_selected': i == 0,
            })

    # =========================================================================
    # KEY METRICS
    # =========================================================================
    if selected_basis == 'f12_current':
        selected_calc = f12_current_calc
        selected_value = f12_current_value
    elif selected_basis == 'stabilized':
        selected_calc = stab_calc
        selected_value = stab_value
    else:  # f12_market (default)
        selected_calc = f12_market_calc
        selected_value = f12_market_value

    grm = float(selected_value / Decimal(str(selected_calc['gpr']))) if selected_value and selected_calc['gpr'] > 0 else None

    key_metrics = {
        'price_per_unit': float(selected_value / unit_count) if selected_value and unit_count > 0 else None,
        'price_per_sf': float(selected_value / Decimal(str(total_sf))) if selected_value and total_sf > 0 else None,
        'grm': grm,
        'expense_ratio': selected_calc['expense_ratio'],
        'opex_per_unit': float(total_opex / unit_count) if unit_count > 0 else None,
        'opex_per_sf': float(total_opex / Decimal(str(total_sf))) if total_sf > 0 else None,
        'break_even_occupancy': float(selected_calc['total_opex'] / selected_calc['gpr']) if selected_calc['gpr'] > 0 else None,
    }

    # =========================================================================
    # RETURN DATA DICT
    # =========================================================================
    return {
        'project_id': project_id,
        'project_name': project.project_name,
        'project_type_code': project.project_type_code,

        'property_summary': {
            'unit_count': unit_count,
            'total_sf': total_sf,
            'avg_unit_sf': avg_unit_sf,
        },

        'rent_roll': {
            't12_gpr': float(t12_gpr),
            'forward_gpr': float(forward_gpr),
            'items': rent_roll_items,
        },

        'operating_expenses': {
            'total': float(total_opex),
            'items': opex_items,
        },

        'assumptions': assumptions,

        'value_tiles': value_tiles,

        'selected_basis': selected_basis,
        'selected_calculation': selected_calc,
        'selected_value': float(selected_value) if selected_value else None,

        'sensitivity_matrix': sensitivity_matrix,
        'key_metrics': key_metrics,

        'income_approach_id': income_approach.income_approach_id,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def income_approach_data(request, project_id: int):
    """
    GET /api/valuation/income-approach-data/{project_id}/

    Returns comprehensive income approach data including:
    - Property summary (unit count, SF)
    - Rent roll data (GPR from current_rent and market_rent)
    - Operating expenses by category
    - Assumptions (aggregated from multiple tables)
    - Calculated values for all 4 NOI bases
    - Sensitivity matrix data
    """
    return Response(_get_income_approach_data(project_id))


@api_view(['PUT', 'PATCH'])
@permission_classes([AllowAny])
def update_income_approach_assumptions(request, project_id: int):
    """
    PUT/PATCH /api/valuation/income-approach-data/{project_id}/update/

    Updates income approach assumptions and returns recalculated values.
    Routes updates to the appropriate source tables:
    - DCF params -> tbl_cre_dcf_analysis
    - Cap rate -> tbl_income_approach
    - Vacancy/expenses -> tbl_project_assumption
    - Growth rates -> core_fin_growth_rate_sets
    """
    project = get_object_or_404(Project, project_id=project_id)

    # Use data service to route updates to correct tables
    data_service = IncomeApproachDataService(project_id)

    # Process each field in the request
    for field, value in request.data.items():
        # Convert percentage strings if needed
        if isinstance(value, str) and '%' in value:
            value = float(value.replace('%', '')) / 100

        # Route to appropriate table via service
        data_service.save_assumption(field, value)

    # Return the full recalculated data by calling the internal function
    # QK-22: Can't call income_approach_data directly as it's decorated with @api_view(['GET'])
    return Response(_get_income_approach_data(project_id))


@api_view(['GET'])
@permission_classes([AllowAny])
def income_approach_dcf(request, project_id: int):
    """
    GET /api/valuation/income-approach-data/{project_id}/dcf/

    Returns DCF analysis with:
    - Annual cash flow projections (NOI by year)
    - Terminal value calculation
    - Key metrics (IRR, NPV, Present Value)
    - 2D sensitivity matrix (discount rate × exit cap rate)

    Cash flows start from current (in-place) rents and grow by
    income_growth_rate annually. Expenses grow by expense_growth_rate.
    """
    from .services.dcf_calculation_service import DCFCalculationService

    # Verify project exists
    project = get_object_or_404(Project, project_id=project_id)

    # Calculate DCF
    dcf_service = DCFCalculationService(project_id)
    result = dcf_service.calculate()

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def income_approach_dcf_monthly(request, project_id: int):
    """
    GET /api/valuation/income-approach-data/{project_id}/dcf/monthly/

    Returns DCF analysis with monthly cash flow projections.
    Frontend aggregates to quarterly/annual as needed for display.

    Uses calendar dates (Jan 2026, Feb 2026...) based on project's
    analysis_start_date rather than abstract periods.

    Returns:
    - Monthly cash flow projections (GPR, EGI, NOI per month)
    - Exit analysis (terminal value, reversion)
    - Key metrics (IRR, NPV, Present Value)
    - 2D sensitivity matrix (discount rate × exit cap rate)
    """
    from .services.dcf_calculation_service import DCFCalculationService

    # Verify project exists
    project = get_object_or_404(Project, project_id=project_id)

    # Calculate monthly DCF
    dcf_service = DCFCalculationService(project_id)
    result = dcf_service.calculate_monthly()

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def income_approach_unit_rent_schedule(request, project_id: int):
    """
    GET /api/valuation/income-approach-data/{project_id}/unit-rent-schedule/

    Returns per-unit monthly rent projections that reconcile to the DCF's GPR row.
    Used for the audit-grade "Rent Schedule" subtab within Income Approach.

    Query parameters:
    - period: 'monthly' (default). Frontend aggregates to quarterly/annual.

    Returns:
    - periods: list of {period_id, period_label}
    - units: list of unit records with per-period rent array
    - gpr_by_period: sum of unit rents per period (must match DCF GPR)
    - dcf_summary_rows: vacancy, credit loss, other income, NRI from DCF
    - reconciliation: {ok: bool, mismatches: [...]}
    """
    from .services.unit_rent_schedule_service import UnitRentScheduleService

    # Verify project exists
    project = get_object_or_404(Project, project_id=project_id)

    period = request.query_params.get('period', 'monthly')

    service = UnitRentScheduleService(project_id)
    result = service.generate(period=period)

    return Response(result)
