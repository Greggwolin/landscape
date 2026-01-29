"""
Project Bar State API

Provides aggregated data for the Studio project bar:
- Project vitals (key metrics)
- Section completeness (mapped to UI tabs)

============================================================================
DOMAIN-TO-SECTION MAPPING
============================================================================

UI Section      | Data Sources                           | Scoring Logic
--------------- | -------------------------------------- | ---------------------------------
Project         | tbl_project core fields:               | % of key profile fields populated:
                |   - project_name                       |   project_name, project_address,
                |   - project_address                    |   city/state, project_type_code,
                |   - city, state                        |   analysis_type, description
                |   - project_type_code                  | 6 fields total
                |   - analysis_type                      | Score: (filled / 6) * 100
                |   - description                        |
                |                                        |
Property        | Depends on project_type_code:          | MF: unit types + rents defined
                | MF: tbl_multifamily_unit_type          | LAND: parcels with acres/type
                |   - unit_count, market_rent, sqft     | Score based on data completeness
                | LAND: tbl_parcel                       | Base 30 + data quality bonus
                |   - acres, type_code, units_total     |
                |                                        |
Operations      | tbl_operating_expenses                 | Has operating expenses?
                | tbl_multifamily_operating_assumptions  | Has assumptions (vacancy, etc)?
                | tbl_operations_user_inputs             | Score: 0 (none), 40 (partial),
                |                                        |        75 (good), 100 (complete)
                |                                        |
Valuation       | tbl_income_approach                    | Has cap rate?
                | tbl_sales_comparables                  | Has comparables?
                | tbl_valuation_reconciliation           | Has income approach setup?
                |                                        | Score based on approaches complete
                |                                        |
Capitalization  | core_fin_fact_budget                   | Has budget items?
                | tbl_finance_structure                  | Has finance structures?
                | Financing entries                      | Score based on capital defined

============================================================================
VITALS SOURCES
============================================================================

- total_units: tbl_project.total_units OR SUM(tbl_multifamily_unit_type.unit_count)
              OR COUNT(tbl_parcel) for land dev
- total_sf: tbl_project.gross_sf OR SUM(unit_type.sqft * count)
- total_acres: tbl_project.acres_gross OR tbl_project.lot_size_acres
              OR SUM(tbl_parcel.acres_gross)
- total_budget: SUM(core_fin_fact_budget.amount)
- year1_noi: tbl_project.proforma_noi OR calculated from operations
- target_irr: tbl_project.discount_rate_pct OR tbl_income_approach.discount_rate
- cap_rate: tbl_project.cap_rate_proforma OR tbl_income_approach.selected_cap_rate

============================================================================
LEVEL CLASSIFICATION
============================================================================

Level     | Score Range | Meaning
--------- | ----------- | -------------------------------------------
high      | 75-100      | Section substantially complete
medium    | 40-74       | Partial data, usable but incomplete
low       | 1-39        | Minimal data entered
pending   | 0           | No data, not blocking anything
blocked   | 0           | Cannot proceed without missing data (has deps)

============================================================================
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from typing import Dict, Any, List, Tuple, Optional
from decimal import Decimal


def _score_to_level(score: int, blocking_reasons: List[str] = None) -> str:
    """Convert numeric score to level classification."""
    if blocking_reasons:
        return 'blocked'
    if score >= 75:
        return 'high'
    elif score >= 40:
        return 'medium'
    elif score >= 1:
        return 'low'
    else:
        return 'pending'


def _decimal_to_float(value) -> Optional[float]:
    """Safely convert Decimal to float, handling None."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _get_project_basics(project_id: int) -> Dict[str, Any]:
    """Get basic project info including type code."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                project_id,
                project_name,
                project_type_code,
                analysis_type,
                project_address,
                city,
                state,
                description,
                total_units,
                gross_sf,
                acres_gross,
                lot_size_acres,
                proforma_noi,
                current_noi,
                cap_rate_proforma,
                cap_rate_current,
                discount_rate_pct,
                net_rentable_area
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])
        row = cursor.fetchone()

    if not row:
        return None

    return {
        'project_id': row[0],
        'project_name': row[1],
        'project_type_code': row[2],
        'analysis_type': row[3],
        'project_address': row[4],
        'city': row[5],
        'state': row[6],
        'description': row[7],
        'total_units': row[8],
        'gross_sf': _decimal_to_float(row[9]),
        'acres_gross': _decimal_to_float(row[10]),
        'lot_size_acres': _decimal_to_float(row[11]),
        'proforma_noi': _decimal_to_float(row[12]),
        'current_noi': _decimal_to_float(row[13]),
        'cap_rate_proforma': _decimal_to_float(row[14]),
        'cap_rate_current': _decimal_to_float(row[15]),
        'discount_rate_pct': _decimal_to_float(row[16]),
        'net_rentable_area': _decimal_to_float(row[17]),
    }


def _get_vitals(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Aggregate key project metrics for vitals display."""
    vitals = {
        'total_units': None,
        'total_sf': None,
        'total_acres': None,
        'total_budget': None,
        'year1_noi': None,
        'target_irr': None,
        'cap_rate': None,
    }

    project_type = project_basics.get('project_type_code', '').upper() if project_basics.get('project_type_code') else ''
    is_land_dev = project_type in ('LAND', 'MPC')
    is_multifamily = project_type in ('MF', 'MULTIFAMILY')

    # Total units
    if project_basics.get('total_units'):
        vitals['total_units'] = project_basics['total_units']
    else:
        with connection.cursor() as cursor:
            if is_multifamily or not is_land_dev:
                # Try multifamily unit types
                cursor.execute("""
                    SELECT COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0)
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                """, [project_id])
                row = cursor.fetchone()
                if row and row[0] and row[0] > 0:
                    vitals['total_units'] = int(row[0])

            if vitals['total_units'] is None and is_land_dev:
                # Try parcel count for land dev
                cursor.execute("""
                    SELECT COALESCE(SUM(COALESCE(units_total, 1)), 0)
                    FROM landscape.tbl_parcel
                    WHERE project_id = %s
                """, [project_id])
                row = cursor.fetchone()
                if row and row[0] and row[0] > 0:
                    vitals['total_units'] = int(row[0])

    # Total SF
    if project_basics.get('gross_sf'):
        vitals['total_sf'] = project_basics['gross_sf']
    elif project_basics.get('net_rentable_area'):
        vitals['total_sf'] = project_basics['net_rentable_area']
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(SUM(
                    COALESCE(unit_count, total_units, 0) * COALESCE(avg_square_feet, 0)
                ), 0)
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            if row and row[0] and row[0] > 0:
                vitals['total_sf'] = float(row[0])

    # Total acres
    if project_basics.get('acres_gross'):
        vitals['total_acres'] = project_basics['acres_gross']
    elif project_basics.get('lot_size_acres'):
        vitals['total_acres'] = project_basics['lot_size_acres']
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(SUM(acres_gross), 0)
                FROM landscape.tbl_parcel
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            if row and row[0] and row[0] > 0:
                vitals['total_acres'] = float(row[0])

    # Total budget (is_active column may not exist on all deployments)
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0)
                FROM landscape.core_fin_fact_budget
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            if row and row[0] and row[0] > 0:
                vitals['total_budget'] = float(row[0])
        except Exception:
            pass  # Budget table may not exist or have different schema

    # Year 1 NOI
    if project_basics.get('proforma_noi'):
        vitals['year1_noi'] = project_basics['proforma_noi']
    elif project_basics.get('current_noi'):
        vitals['year1_noi'] = project_basics['current_noi']

    # Target IRR / Discount Rate
    if project_basics.get('discount_rate_pct'):
        vitals['target_irr'] = project_basics['discount_rate_pct'] / 100 if project_basics['discount_rate_pct'] > 1 else project_basics['discount_rate_pct']
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT discount_rate
                FROM landscape.tbl_income_approach
                WHERE project_id = %s
                LIMIT 1
            """, [project_id])
            row = cursor.fetchone()
            if row and row[0]:
                vitals['target_irr'] = float(row[0])

    # Cap Rate
    if project_basics.get('cap_rate_proforma'):
        vitals['cap_rate'] = project_basics['cap_rate_proforma']
    elif project_basics.get('cap_rate_current'):
        vitals['cap_rate'] = project_basics['cap_rate_current']
    else:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT selected_cap_rate
                FROM landscape.tbl_income_approach
                WHERE project_id = %s
                LIMIT 1
            """, [project_id])
            row = cursor.fetchone()
            if row and row[0]:
                vitals['cap_rate'] = float(row[0])

    return vitals


def _score_project_section(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Score the Project section (basic profile completeness)."""
    fields_to_check = [
        ('project_name', project_basics.get('project_name')),
        ('project_address', project_basics.get('project_address')),
        ('location', project_basics.get('city') or project_basics.get('state')),
        ('project_type_code', project_basics.get('project_type_code')),
        ('analysis_type', project_basics.get('analysis_type')),
        ('description', project_basics.get('description')),
    ]

    filled = sum(1 for name, value in fields_to_check if value)
    total = len(fields_to_check)
    score = int((filled / total) * 100) if total > 0 else 0

    blocking_reasons = []
    if not project_basics.get('project_name'):
        blocking_reasons.append('Project name required')
    if not project_basics.get('project_type_code'):
        blocking_reasons.append('Project type not set')

    return {
        'level': _score_to_level(score, blocking_reasons if score < 40 else None),
        'score': score,
        'details': f"{filled}/{total} profile fields populated",
        'blocking_reasons': blocking_reasons,
    }


def _score_property_section(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Score the Property section (units, parcels, physical description)."""
    project_type = project_basics.get('project_type_code', '').upper() if project_basics.get('project_type_code') else ''
    is_land_dev = project_type in ('LAND', 'MPC')
    blocking_reasons = []

    with connection.cursor() as cursor:
        if is_land_dev:
            # Land development: check parcels
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN type_code IS NOT NULL THEN 1 END) as with_type,
                    COUNT(CASE WHEN acres_gross IS NOT NULL AND acres_gross > 0 THEN 1 END) as with_acres,
                    COUNT(CASE WHEN units_total IS NOT NULL AND units_total > 0 THEN 1 END) as with_units
                FROM landscape.tbl_parcel
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()

            if not row or row[0] == 0:
                return {
                    'level': 'pending',
                    'score': 0,
                    'details': 'No parcels defined',
                    'blocking_reasons': ['Define parcels to continue'],
                }

            total = row[0]
            with_type = row[1] or 0
            with_acres = row[2] or 0
            with_units = row[3] or 0

            # Base score for having parcels, bonus for completeness
            type_pct = with_type / total if total > 0 else 0
            acres_pct = with_acres / total if total > 0 else 0
            units_pct = with_units / total if total > 0 else 0

            score = int(30 + (type_pct * 25) + (acres_pct * 25) + (units_pct * 20))
            details = f"{total} parcels, {int(type_pct*100)}% typed, {int(acres_pct*100)}% with acres"

        else:
            # Multifamily/other: check unit types
            cursor.execute("""
                SELECT
                    COUNT(*) as type_count,
                    COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as total_units,
                    COUNT(CASE WHEN market_rent IS NOT NULL OR current_market_rent IS NOT NULL THEN 1 END) as with_rent,
                    COUNT(CASE WHEN avg_square_feet IS NOT NULL THEN 1 END) as with_sqft
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()

            if not row or row[0] == 0:
                # Check if project has total_units set at least
                if project_basics.get('total_units') and project_basics['total_units'] > 0:
                    return {
                        'level': 'low',
                        'score': 25,
                        'details': f"{project_basics['total_units']} units (no unit mix defined)",
                        'blocking_reasons': [],
                    }
                return {
                    'level': 'pending',
                    'score': 0,
                    'details': 'No unit types defined',
                    'blocking_reasons': ['Define unit mix to continue'],
                }

            type_count = row[0]
            total_units = int(row[1] or 0)
            with_rent = row[2] or 0
            with_sqft = row[3] or 0

            rent_pct = with_rent / type_count if type_count > 0 else 0
            sqft_pct = with_sqft / type_count if type_count > 0 else 0

            # Base 40 for having unit types, bonus for rent and sqft
            score = int(40 + (rent_pct * 35) + (sqft_pct * 25))
            details = f"{total_units} units across {type_count} types, {int(rent_pct*100)}% with rents"

    return {
        'level': _score_to_level(score, blocking_reasons if blocking_reasons else None),
        'score': score,
        'details': details,
        'blocking_reasons': blocking_reasons,
    }


def _score_operations_section(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Score the Operations section (OpEx, assumptions, income data)."""
    blocking_reasons = []
    score = 0
    details_parts = []

    has_opex = False
    opex_count = 0
    opex_total = 0
    has_assumptions = False
    has_inputs = False

    with connection.cursor() as cursor:
        # Check operating expenses
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as expense_count,
                    COALESCE(SUM(annual_amount), 0) as total_expenses
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s AND annual_amount > 0
            """, [project_id])
            opex_row = cursor.fetchone()
            has_opex = opex_row and opex_row[0] > 0
            opex_count = opex_row[0] if opex_row else 0
            opex_total = float(opex_row[1]) if opex_row and opex_row[1] else 0
        except Exception:
            pass

        # Check operating assumptions (table may not exist)
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM landscape.tbl_multifamily_operating_assumptions
                WHERE project_id = %s
            """, [project_id])
            assumptions_row = cursor.fetchone()
            has_assumptions = assumptions_row and assumptions_row[0] > 0
        except Exception:
            pass

        # Check operations user inputs (table may not exist)
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM landscape.tbl_operations_user_inputs
                WHERE project_id = %s
            """, [project_id])
            inputs_row = cursor.fetchone()
            has_inputs = inputs_row and inputs_row[0] > 0
        except Exception:
            pass

    # Calculate score based on data presence
    if has_opex:
        score += 50
        if opex_total > 0:
            details_parts.append(f"${opex_total:,.0f} OpEx ({opex_count} items)")
        else:
            details_parts.append(f"{opex_count} expense items")

    if has_assumptions:
        score += 30
        details_parts.append("assumptions set")

    if has_inputs:
        score += 20
        details_parts.append("user inputs defined")

    if score == 0:
        details = "No operating data entered"
        blocking_reasons = ['Add operating expenses or assumptions']
    else:
        details = ", ".join(details_parts) if details_parts else "Partial data"

    # Check for NOI availability for blocking
    if not has_opex and not project_basics.get('proforma_noi'):
        blocking_reasons.append('OpEx required for NOI calculation')

    return {
        'level': _score_to_level(score, blocking_reasons if score < 40 else None),
        'score': min(score, 100),
        'details': details,
        'blocking_reasons': blocking_reasons,
    }


def _score_valuation_section(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Score the Valuation section (3 approaches, cap rate, comparables)."""
    blocking_reasons = []
    score = 0
    details_parts = []

    with connection.cursor() as cursor:
        # Check income approach
        cursor.execute("""
            SELECT
                selected_cap_rate,
                direct_cap_value,
                dcf_value
            FROM landscape.tbl_income_approach
            WHERE project_id = %s
            LIMIT 1
        """, [project_id])
        income_row = cursor.fetchone()
        has_income_approach = income_row is not None
        has_cap_rate = income_row and income_row[0] is not None
        has_direct_cap_value = income_row and income_row[1] is not None
        has_dcf_value = income_row and income_row[2] is not None

        # Check sales comparables
        cursor.execute("""
            SELECT COUNT(*)
            FROM landscape.tbl_sales_comparables
            WHERE project_id = %s
        """, [project_id])
        comps_row = cursor.fetchone()
        comp_count = comps_row[0] if comps_row else 0
        has_comps = comp_count >= 3  # Need at least 3 for meaningful analysis

        # Check cost approach
        cursor.execute("""
            SELECT indicated_value
            FROM landscape.tbl_cost_approach
            WHERE project_id = %s
            LIMIT 1
        """, [project_id])
        cost_row = cursor.fetchone()
        has_cost_approach = cost_row and cost_row[0] is not None

        # Check reconciliation
        cursor.execute("""
            SELECT final_reconciled_value
            FROM landscape.tbl_valuation_reconciliation
            WHERE project_id = %s
            LIMIT 1
        """, [project_id])
        recon_row = cursor.fetchone()
        has_reconciliation = recon_row and recon_row[0] is not None

    # Score based on approaches and data
    if has_income_approach:
        score += 20
        if has_cap_rate:
            score += 15
            details_parts.append("cap rate set")
        if has_direct_cap_value or has_dcf_value:
            score += 10
            details_parts.append("income value calculated")

    if has_comps:
        score += 25
        details_parts.append(f"{comp_count} comparables")
    elif comp_count > 0:
        score += 10
        details_parts.append(f"{comp_count} comp (need 3+)")

    if has_cost_approach:
        score += 15
        details_parts.append("cost approach complete")

    if has_reconciliation:
        score += 15
        details_parts.append("reconciled")

    # Determine blocking reasons
    if score == 0:
        details = "No valuation data entered"
        blocking_reasons = ['Set cap rate assumption', 'Add comparable sales']
    else:
        details = ", ".join(details_parts) if details_parts else "Partial valuation data"
        if not has_cap_rate and not project_basics.get('cap_rate_proforma'):
            blocking_reasons.append('Cap rate required for income approach')

    return {
        'level': _score_to_level(score, blocking_reasons if score < 40 else None),
        'score': min(score, 100),
        'details': details,
        'blocking_reasons': blocking_reasons,
    }


def _score_capitalization_section(project_id: int, project_basics: Dict[str, Any]) -> Dict[str, Any]:
    """Score the Capitalization section (budget, financing, capital stack)."""
    blocking_reasons = []
    score = 0
    details_parts = []

    with connection.cursor() as cursor:
        # Check budget items (is_active column may not exist)
        cursor.execute("""
            SELECT
                COUNT(*) as line_items,
                COUNT(DISTINCT category_l1_id) as categories,
                COALESCE(SUM(amount), 0) as total_budget
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
        """, [project_id])
        budget_row = cursor.fetchone()
        line_items = budget_row[0] if budget_row else 0
        categories = budget_row[1] if budget_row else 0
        total_budget = float(budget_row[2]) if budget_row and budget_row[2] else 0

        # Check finance structures
        cursor.execute("""
            SELECT COUNT(*)
            FROM landscape.tbl_finance_structure
            WHERE project_id = %s AND is_active = true
        """, [project_id])
        structure_row = cursor.fetchone()
        structure_count = structure_row[0] if structure_row else 0

    # Score based on budget depth
    if line_items > 0:
        if line_items >= 50 and categories >= 10:
            score = 100
            details_parts.append(f"comprehensive budget ({line_items} items)")
        elif line_items >= 20 and categories >= 5:
            score = 75
            details_parts.append(f"good budget ({line_items} items)")
        elif line_items >= 5:
            score = 50
            details_parts.append(f"partial budget ({line_items} items)")
        else:
            score = 25
            details_parts.append(f"minimal budget ({line_items} items)")

        if total_budget > 0:
            details_parts.append(f"${total_budget:,.0f} total")

    if structure_count > 0:
        score = min(score + 15, 100)
        details_parts.append(f"{structure_count} finance structures")

    if score == 0:
        details = "No capital stack defined"
        blocking_reasons = ['Add budget items', 'Define financing structure']
    else:
        details = ", ".join(details_parts) if details_parts else "Capital data entered"

    return {
        'level': _score_to_level(score, blocking_reasons if score < 40 else None),
        'score': score,
        'details': details,
        'blocking_reasons': blocking_reasons,
    }


def _calculate_overall(sections: Dict[str, Dict]) -> Dict[str, Any]:
    """Calculate overall completeness from section scores."""
    section_scores = [s['score'] for s in sections.values()]
    avg_score = int(sum(section_scores) / len(section_scores)) if section_scores else 0

    # Count sections needing attention
    needs_attention = sum(1 for s in sections.values() if s['level'] in ('low', 'pending', 'blocked'))
    total_sections = len(sections)

    if needs_attention == 0:
        details = "All sections complete"
    elif needs_attention == total_sections:
        details = "All sections need data"
    else:
        details = f"{needs_attention} of {total_sections} sections need attention"

    return {
        'level': _score_to_level(avg_score),
        'score': avg_score,
        'details': details,
    }


@csrf_exempt
@require_http_methods(["GET"])
def get_project_bar_state(request, project_id):
    """
    GET /api/knowledge/projects/{project_id}/project-bar-state/

    Returns aggregated project state for the Studio project bar:
    - vitals: key metrics (units, SF, acres, budget, NOI, IRR, cap rate)
    - sections: completeness status for each UI tab
    - overall: weighted average completeness

    Response time target: < 500ms
    """
    try:
        # Get basic project info
        project_basics = _get_project_basics(project_id)
        if not project_basics:
            return JsonResponse({
                'success': False,
                'error': 'Project not found'
            }, status=404)

        # Get vitals
        vitals = _get_vitals(project_id, project_basics)

        # Score each section
        sections = {
            'project': _score_project_section(project_id, project_basics),
            'property': _score_property_section(project_id, project_basics),
            'operations': _score_operations_section(project_id, project_basics),
            'valuation': _score_valuation_section(project_id, project_basics),
            'capitalization': _score_capitalization_section(project_id, project_basics),
        }

        # Calculate overall
        overall = _calculate_overall(sections)

        return JsonResponse({
            'success': True,
            'project_id': int(project_id),
            'vitals': vitals,
            'sections': sections,
            'overall': overall,
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
