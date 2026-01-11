"""
Calculate confidence levels based on actual data completeness.

Confidence reflects how much structured data is available for a project,
helping users understand the reliability of Landscaper's responses.

Confidence Levels:
- high (70-100%): Most key data populated, can give reliable answers
- medium (40-69%): Partial data, may need to rely on documents/assumptions
- low (0-39%): Limited data, responses will be mostly from documents or general knowledge
"""

from django.db import connection
from typing import Dict, Tuple, Any


def calculate_project_confidence(project_id: int) -> Dict[str, Dict[str, Any]]:
    """
    Calculate confidence by domain.

    Returns dict of {domain: {level, score, details}}
    where level is 'high', 'medium', or 'low' and score is 0-100
    """

    results = {}

    # Profile completeness
    profile_score, profile_details = _calculate_profile_completeness(project_id)
    results['profile'] = {
        **_score_to_level(profile_score),
        'details': profile_details
    }

    # Unit/rent data completeness
    unit_score, unit_details = _calculate_unit_completeness(project_id)
    results['units'] = {
        **_score_to_level(unit_score),
        'details': unit_details
    }

    # Parcel/land data completeness
    parcel_score, parcel_details = _calculate_parcel_completeness(project_id)
    results['parcels'] = {
        **_score_to_level(parcel_score),
        'details': parcel_details
    }

    # Budget completeness
    budget_score, budget_details = _calculate_budget_completeness(project_id)
    results['budget'] = {
        **_score_to_level(budget_score),
        'details': budget_details
    }

    # Document coverage
    doc_score, doc_details = _calculate_document_coverage(project_id)
    results['documents'] = {
        **_score_to_level(doc_score),
        'details': doc_details
    }

    # Calculate overall score (weighted average)
    weights = {
        'profile': 0.25,
        'units': 0.20,
        'parcels': 0.15,
        'budget': 0.20,
        'documents': 0.20,
    }

    weighted_sum = sum(
        results[domain]['score'] * weights.get(domain, 0.1)
        for domain in results
    )
    overall_score = int(weighted_sum)

    results['overall'] = {
        **_score_to_level(overall_score),
        'details': f"Weighted average across {len(results) - 1} domains"
    }

    return results


def _calculate_profile_completeness(project_id: int) -> Tuple[int, str]:
    """Score 0-100 for profile fields filled."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                CASE WHEN project_name IS NOT NULL AND project_name != '' THEN 1 ELSE 0 END +
                CASE WHEN project_address IS NOT NULL AND project_address != '' THEN 1 ELSE 0 END +
                CASE WHEN jurisdiction_city IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN jurisdiction_state IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN project_type_code IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN target_units IS NOT NULL AND target_units > 0 THEN 1 ELSE 0 END +
                CASE WHEN acres_gross IS NOT NULL AND acres_gross > 0 THEN 1 ELSE 0 END +
                CASE WHEN price_range_low IS NOT NULL THEN 1 ELSE 0 END
            as filled_count
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if not row:
            return 0, "Project not found"

        filled = row[0] or 0
        total_fields = 8
        score = int((filled / total_fields) * 100)
        return score, f"{filled}/{total_fields} profile fields populated"


def _calculate_unit_completeness(project_id: int) -> Tuple[int, str]:
    """Score 0-100 for unit/rent data."""
    with connection.cursor() as cursor:
        # Check multifamily units first (individual unit records)
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN market_rent IS NOT NULL THEN 1 END) as with_market_rent,
                    COUNT(CASE WHEN current_rent IS NOT NULL THEN 1 END) as with_current_rent,
                    COUNT(CASE WHEN sq_ft IS NOT NULL THEN 1 END) as with_sqft
                FROM landscape.tbl_mf_unit
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0] > 0:
                total = row[0]
                with_market = row[1] or 0
                with_current = row[2] or 0
                with_sqft = row[3] or 0

                # Score: base 40% for having units, up to 100% for complete data
                base_score = 40
                rent_coverage = max(with_market, with_current) / total
                sqft_coverage = with_sqft / total

                score = int(base_score + (rent_coverage * 40) + (sqft_coverage * 20))
                return score, f"{total} units, {int(rent_coverage*100)}% with rents"
        except Exception:
            pass

        # Check unit types (aggregated unit type data from extraction)
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(COALESCE(unit_count, 0)) as total_units,
                    COUNT(CASE WHEN market_rent IS NOT NULL THEN 1 END) as with_market_rent,
                    COUNT(CASE WHEN avg_square_feet IS NOT NULL THEN 1 END) as with_sqft
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
                AND unit_type_code NOT IN ('Commercial', 'Leasing Office')
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0] > 0:
                type_count = row[0]
                total_units = row[1] or 0
                with_market = row[2] or 0
                with_sqft = row[3] or 0

                # Score: base 50% for having unit types with data
                rent_coverage = with_market / type_count if type_count > 0 else 0
                sqft_coverage = with_sqft / type_count if type_count > 0 else 0

                score = int(50 + (rent_coverage * 30) + (sqft_coverage * 20))
                return score, f"{type_count} unit types, {total_units} total units, {int(rent_coverage*100)}% with rents"
        except Exception:
            pass

        # Check container-based units
        try:
            cursor.execute("""
                SELECT COUNT(*)
                FROM landscape.tbl_container
                WHERE project_id = %s AND container_level = 3 AND is_active = true
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0] > 0:
                return 30, f"{row[0]} container-based units (limited data)"
        except Exception:
            pass

        return 0, "No unit data found"


def _calculate_parcel_completeness(project_id: int) -> Tuple[int, str]:
    """Score 0-100 for parcel/land data."""
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN type_code IS NOT NULL THEN 1 END) as with_type,
                    COUNT(CASE WHEN units_total IS NOT NULL AND units_total > 0 THEN 1 END) as with_units,
                    COUNT(CASE WHEN acres_gross IS NOT NULL THEN 1 END) as with_acres,
                    COUNT(CASE WHEN price_per_unit IS NOT NULL THEN 1 END) as with_price
                FROM landscape.tbl_parcel
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if not row or row[0] == 0:
                return 0, "No parcel data found"

            total = row[0]
            with_type = row[1] or 0
            with_units = row[2] or 0
            with_acres = row[3] or 0
            with_price = row[4] or 0

            # Score based on data completeness
            type_pct = with_type / total
            units_pct = with_units / total
            acres_pct = with_acres / total
            price_pct = with_price / total

            # Base 25 for having parcels, add up to 75 more for complete data
            score = int(25 + (type_pct * 20) + (units_pct * 20) + (acres_pct * 15) + (price_pct * 20))

            return score, f"{total} parcels, {int(type_pct*100)}% typed, {int(price_pct*100)}% priced"
        except Exception:
            return 0, "Parcel query failed"


def _calculate_budget_completeness(project_id: int) -> Tuple[int, str]:
    """Score 0-100 for budget data."""
    with connection.cursor() as cursor:
        # Try core_fin_fact_budget first
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as line_items,
                    COUNT(DISTINCT category_l1_id) as categories,
                    SUM(amount) as total_budget
                FROM landscape.core_fin_fact_budget
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0] > 0:
                line_items = row[0]
                categories = row[1] or 0
                total = row[2]

                # Score based on depth of budget
                if line_items >= 50 and categories >= 10:
                    score = 100
                    detail = f"Comprehensive: {line_items} items, {categories} categories"
                elif line_items >= 20 and categories >= 5:
                    score = 75
                    detail = f"Good: {line_items} items, {categories} categories"
                elif line_items >= 5:
                    score = 50
                    detail = f"Partial: {line_items} items"
                else:
                    score = 25
                    detail = f"Minimal: {line_items} items"

                if total:
                    detail += f", ${float(total):,.0f} total"

                return score, detail
        except Exception:
            pass

        # Try tbl_budget_fact
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as line_items,
                    COUNT(DISTINCT category_id) as categories,
                    SUM(total_cost) as total_budget
                FROM landscape.tbl_budget_fact
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0] > 0:
                line_items = row[0]
                categories = row[1] or 0

                if line_items >= 50:
                    return 100, f"Comprehensive: {line_items} items"
                elif line_items >= 20:
                    return 75, f"Good: {line_items} items"
                elif line_items >= 5:
                    return 50, f"Partial: {line_items} items"
                else:
                    return 25, f"Minimal: {line_items} items"
        except Exception:
            pass

        return 0, "No budget data found"


def _calculate_document_coverage(project_id: int) -> Tuple[int, str]:
    """Score 0-100 for document processing."""
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_docs,
                    COUNT(CASE WHEN e.chunk_count > 0 THEN 1 END) as processed
                FROM landscape.core_doc d
                LEFT JOIN (
                    SELECT source_id, COUNT(*) as chunk_count
                    FROM landscape.knowledge_embeddings
                    WHERE source_type = 'document_chunk'
                    GROUP BY source_id
                ) e ON d.doc_id = e.source_id
                WHERE d.project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if not row or row[0] == 0:
                return 0, "No documents uploaded"

            total = row[0]
            processed = row[1] or 0
            pct = int((processed / total) * 100)

            return pct, f"{processed}/{total} documents processed for search"
        except Exception:
            return 0, "Document query failed"


def _score_to_level(score: int) -> Dict[str, Any]:
    """Convert numeric score to level + score dict."""
    if score >= 70:
        level = 'high'
    elif score >= 40:
        level = 'medium'
    else:
        level = 'low'

    return {'level': level, 'score': score}


def get_overall_confidence(project_id: int) -> Dict[str, Any]:
    """
    Get just the overall confidence for quick checks.

    Returns: {level: 'high'|'medium'|'low', score: 0-100}
    """
    results = calculate_project_confidence(project_id)
    return {
        'level': results['overall']['level'],
        'score': results['overall']['score']
    }
