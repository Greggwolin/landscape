"""
Completeness calculation service for projects.

Calculates analysis readiness scores across 6 categories:
1. Property Data - Basic project fields (location, size, type)
2. Sources - Capital structure (debt, equity)
3. Uses - Budget/cost inputs
4. Structure - Container hierarchy (areas, phases, parcels)
5. Valuation - Pricing and absorption scenarios
6. Documents - Uploaded files and processing status
"""
from typing import Dict, List, Any, Optional
from django.db import connection


def calculate_project_completeness(project_id: int) -> Dict[str, Any]:
    """
    Calculate completeness scores for a project across 6 categories.

    Returns:
        Dict with overall_percentage and categories breakdown
    """
    scores = {
        'property_data': _calculate_property_data_score(project_id),
        'sources': _calculate_sources_score(project_id),
        'uses': _calculate_uses_score(project_id),
        'structure': _calculate_structure_score(project_id),
        'valuation': _calculate_valuation_score(project_id),
        'documents': _calculate_documents_score(project_id),
    }

    # Calculate overall as weighted average
    weights = {
        'property_data': 0.10,
        'sources': 0.20,
        'uses': 0.20,
        'structure': 0.15,
        'valuation': 0.25,
        'documents': 0.10,
    }

    overall = sum(scores[k]['percentage'] * weights[k] for k in scores)

    return {
        'overall_percentage': round(overall),
        'categories': [
            {
                'name': 'Property Data',
                'percentage': scores['property_data']['percentage'],
                'status': _get_status(scores['property_data']['percentage']),
                'details': scores['property_data']['details'],
            },
            {
                'name': 'Sources',
                'percentage': scores['sources']['percentage'],
                'status': _get_status(scores['sources']['percentage']),
                'details': scores['sources']['details'],
            },
            {
                'name': 'Uses',
                'percentage': scores['uses']['percentage'],
                'status': _get_status(scores['uses']['percentage']),
                'details': scores['uses']['details'],
            },
            {
                'name': 'Structure',
                'percentage': scores['structure']['percentage'],
                'status': _get_status(scores['structure']['percentage']),
                'details': scores['structure']['details'],
            },
            {
                'name': 'Valuation',
                'percentage': scores['valuation']['percentage'],
                'status': _get_status(scores['valuation']['percentage']),
                'details': scores['valuation']['details'],
            },
            {
                'name': 'Documents',
                'percentage': scores['documents']['percentage'],
                'status': _get_status(scores['documents']['percentage']),
                'details': scores['documents']['details'],
            },
        ]
    }


def _get_status(percentage: int) -> str:
    """Get status label based on percentage."""
    if percentage >= 90:
        return 'complete'
    elif percentage > 0:
        return 'partial'
    return 'missing'


def _calculate_property_data_score(project_id: int) -> Dict[str, Any]:
    """Check basic project fields are populated."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                project_name,
                project_type_code,
                analysis_type,
                acres_gross,
                project_address,
                jurisdiction_city,
                jurisdiction_state,
                location_lat,
                location_lon
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()

        if not row:
            return {'percentage': 0, 'details': 'Project not found'}

        # Check each field
        fields = {
            'project_name': row[0],
            'project_type_code': row[1],
            'analysis_type': row[2],
            'acres_gross': row[3],
            'project_address': row[4],
            'jurisdiction_city': row[5],
            'jurisdiction_state': row[6],
            'location': row[7] is not None and row[8] is not None,
        }

        filled = sum(1 for v in fields.values() if v)
        percentage = round((filled / len(fields)) * 100)

        missing = [k for k, v in fields.items() if not v]

        if not missing:
            details = "Location, size, type complete"
        elif len(missing) <= 3:
            details = f"Missing: {', '.join(missing[:3])}"
        else:
            details = f"Missing {len(missing)} fields"

        return {'percentage': percentage, 'details': details}


def _calculate_sources_score(project_id: int) -> Dict[str, Any]:
    """Check capital structure / financing inputs."""
    with connection.cursor() as cursor:
        # Check for debt facilities
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_debt_facility
            WHERE project_id = %s
        """, [project_id])
        debt_count = cursor.fetchone()[0] or 0

        # Check for equity partners
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_equity_partner
            WHERE project_id = %s
        """, [project_id])
        equity_count = cursor.fetchone()[0] or 0

        score = 0
        missing = []

        if debt_count > 0:
            score += 50
        else:
            missing.append('debt terms')

        if equity_count > 0:
            score += 50
        else:
            missing.append('equity structure')

        if not missing:
            details = f"Capital structure complete ({debt_count} debt, {equity_count} equity)"
        else:
            details = f"Missing: {', '.join(missing)}"

        return {'percentage': score, 'details': details}


def _calculate_uses_score(project_id: int) -> Dict[str, Any]:
    """Check budget/cost inputs."""
    with connection.cursor() as cursor:
        # Count budget line items
        cursor.execute("""
            SELECT
                COUNT(*) as line_count,
                COUNT(DISTINCT category_l1_id) as category_count,
                SUM(amount) as total_amount
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        line_count = row[0] or 0
        category_count = row[1] or 0
        total_amount = row[2] or 0

        # Expected minimums for a complete budget
        expected_categories = 5  # Land, Hard, Soft, Financing, Contingency

        if line_count == 0:
            percentage = 0
            details = "No budget items entered"
        elif category_count >= expected_categories:
            percentage = min(100, 50 + (line_count * 2))
            details = f"{line_count} items across {category_count} categories"
        else:
            percentage = round((category_count / expected_categories) * 70)
            missing_cats = expected_categories - category_count
            details = f"{line_count} items, missing {missing_cats} budget categories"

        return {'percentage': min(100, percentage), 'details': details}


def _calculate_structure_score(project_id: int) -> Dict[str, Any]:
    """Check container hierarchy (areas, phases, parcels)."""
    with connection.cursor() as cursor:
        # Count areas
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_area
            WHERE project_id = %s
        """, [project_id])
        area_count = cursor.fetchone()[0] or 0

        # Count phases
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_phase
            WHERE project_id = %s
        """, [project_id])
        phase_count = cursor.fetchone()[0] or 0

        # Count parcels
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_parcel
            WHERE project_id = %s
        """, [project_id])
        parcel_count = cursor.fetchone()[0] or 0

        if parcel_count > 0:
            percentage = 90
            details = f"{area_count} areas, {phase_count} phases, {parcel_count} parcels"
        elif phase_count > 0:
            percentage = 60
            details = f"{area_count} areas, {phase_count} phases defined"
        elif area_count > 0:
            percentage = 30
            details = f"{area_count} areas defined, no phases"
        else:
            percentage = 0
            details = "No structure defined"

        return {'percentage': percentage, 'details': details}


def _calculate_valuation_score(project_id: int) -> Dict[str, Any]:
    """Check pricing and absorption inputs."""
    with connection.cursor() as cursor:
        # Count land use pricing
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.land_use_pricing
            WHERE project_id = %s
        """, [project_id])
        pricing_count = cursor.fetchone()[0] or 0

        # Count with actual prices set
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.land_use_pricing
            WHERE project_id = %s AND price_per_unit > 0
        """, [project_id])
        priced_count = cursor.fetchone()[0] or 0

        # Check for absorption schedules
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_absorption_schedule
            WHERE project_id = %s
        """, [project_id])
        absorption_count = cursor.fetchone()[0] or 0

        score = 0
        details_parts = []

        if pricing_count > 0:
            pricing_pct = (priced_count / pricing_count) * 50 if pricing_count > 0 else 0
            score += pricing_pct
            details_parts.append(f"{priced_count} of {pricing_count} land uses priced")
        else:
            details_parts.append("No land uses defined")

        if absorption_count > 0:
            score += 50
            details_parts.append(f"{absorption_count} absorption scenarios")
        else:
            details_parts.append("no absorption scenarios")

        return {'percentage': round(score), 'details': ', '.join(details_parts)}


def _calculate_documents_score(project_id: int) -> Dict[str, Any]:
    """Check document uploads and processing status."""
    with connection.cursor() as cursor:
        # Count total documents
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.core_doc
            WHERE project_id = %s
        """, [project_id])
        total = cursor.fetchone()[0] or 0

        # Count processed documents
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.core_doc
            WHERE project_id = %s AND processing_status = 'complete'
        """, [project_id])
        processed = cursor.fetchone()[0] or 0

        # Count pending/processing
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.core_doc
            WHERE project_id = %s AND processing_status IN ('pending', 'processing', 'queued')
        """, [project_id])
        pending = cursor.fetchone()[0] or 0

        if total == 0:
            return {'percentage': 0, 'details': 'No documents uploaded'}

        percentage = round((processed / total) * 100) if total > 0 else 0

        if pending > 0:
            details = f"{total} files uploaded, {pending} pending extraction"
        else:
            details = f"{total} files uploaded and processed"

        return {'percentage': percentage, 'details': details}


def get_all_projects_completeness() -> List[Dict[str, Any]]:
    """
    Get completeness scores for all active projects.
    Useful for dashboard overview.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT project_id, project_name
            FROM landscape.tbl_project
            WHERE is_active = true
            ORDER BY updated_at DESC
        """)

        projects = cursor.fetchall()

    results = []
    for project_id, project_name in projects:
        completeness = calculate_project_completeness(project_id)
        results.append({
            'project_id': project_id,
            'project_name': project_name,
            'overall_percentage': completeness['overall_percentage'],
            'categories': completeness['categories'],
        })

    return results
