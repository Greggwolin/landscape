"""
Query builder for Landscaper database access.

Provides safe, parameterized queries against project data tables.
Uses template-based approach to prevent SQL injection.
"""
from typing import Optional, Dict, Any, List, Tuple
from django.db import connection
import re


# Safe, read-only query templates
# All queries are parameterized with project_id as first parameter
#
# NOTE: The actual Landscape schema uses:
# - tbl_area (not tbl_container level 1)
# - tbl_phase (not tbl_container level 2)
# - tbl_parcel (land parcels with units)
# - core_fin_fact_budget (budget line items, no is_active column)
QUERY_TEMPLATES = {
    'parcel_count': {
        'query': """
            SELECT COUNT(*) as count
            FROM landscape.tbl_parcel
            WHERE project_id = %s
        """,
        'description': 'Count of parcels in the project'
    },

    'parcel_summary': {
        'query': """
            SELECT
                COUNT(*) as parcel_count,
                SUM(units_total) as total_units,
                SUM(acres_gross) as total_acres,
                MIN(units_total) as min_units,
                MAX(units_total) as max_units
            FROM landscape.tbl_parcel
            WHERE project_id = %s
        """,
        'description': 'Summary statistics for parcels'
    },

    'parcel_by_type': {
        'query': """
            SELECT
                COALESCE(type_code, 'Unassigned') as type_code,
                COUNT(*) as count,
                SUM(units_total) as total_units,
                SUM(acres_gross) as total_acres
            FROM landscape.tbl_parcel
            WHERE project_id = %s
            GROUP BY type_code
            ORDER BY total_units DESC NULLS LAST
        """,
        'description': 'Parcel breakdown by product type'
    },

    'container_summary': {
        'query': """
            SELECT
                'Areas' as level_name,
                1 as level,
                (SELECT COUNT(*) FROM landscape.tbl_area WHERE project_id = %s) as count
            UNION ALL
            SELECT
                'Phases' as level_name,
                2 as level,
                (SELECT COUNT(*) FROM landscape.tbl_phase WHERE project_id = %s) as count
            UNION ALL
            SELECT
                'Parcels' as level_name,
                3 as level,
                (SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = %s) as count
            ORDER BY level
        """,
        'description': 'Project hierarchy summary (Areas, Phases, Parcels)'
    },

    'area_list': {
        'query': """
            SELECT
                area_id,
                area_alias,
                area_no,
                (SELECT COUNT(*) FROM landscape.tbl_phase p WHERE p.area_id = a.area_id) as phase_count,
                (SELECT COUNT(*) FROM landscape.tbl_parcel p WHERE p.area_id = a.area_id) as parcel_count
            FROM landscape.tbl_area a
            WHERE project_id = %s
            ORDER BY area_no, area_id
            LIMIT 50
        """,
        'description': 'List of areas in the project'
    },

    'phase_list': {
        'query': """
            SELECT
                ph.phase_id,
                ph.phase_name,
                ph.phase_no,
                a.area_alias as area_name,
                ph.phase_status,
                (SELECT COUNT(*) FROM landscape.tbl_parcel p WHERE p.phase_id = ph.phase_id) as parcel_count
            FROM landscape.tbl_phase ph
            LEFT JOIN landscape.tbl_area a ON ph.area_id = a.area_id
            WHERE ph.project_id = %s
            ORDER BY a.area_no, ph.phase_no, ph.phase_id
            LIMIT 50
        """,
        'description': 'List of phases in the project'
    },

    'budget_total': {
        'query': """
            SELECT
                SUM(amount) as total_budget,
                COUNT(*) as line_items
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
        """,
        'description': 'Total budget amount'
    },

    'budget_by_category': {
        'query': """
            SELECT
                COALESCE(c.name, 'Uncategorized') as category,
                SUM(b.amount) as total,
                COUNT(*) as items
            FROM landscape.core_fin_fact_budget b
            LEFT JOIN landscape.core_lookup_item c ON b.category_l1_id = c.item_id
            WHERE b.project_id = %s
            GROUP BY c.name
            ORDER BY total DESC NULLS LAST
        """,
        'description': 'Budget breakdown by category'
    },

    'budget_by_activity': {
        'query': """
            SELECT
                COALESCE(activity, 'Unassigned') as activity,
                SUM(amount) as total,
                COUNT(*) as items
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
            GROUP BY activity
            ORDER BY total DESC NULLS LAST
        """,
        'description': 'Budget breakdown by activity phase'
    },

    'land_use_pricing': {
        'query': """
            SELECT
                lu_type_code,
                product_code,
                price_per_unit,
                unit_of_measure,
                growth_rate
            FROM landscape.land_use_pricing
            WHERE project_id = %s
            ORDER BY lu_type_code, product_code
        """,
        'description': 'Land use pricing assumptions'
    },

    'project_details': {
        'query': """
            SELECT
                project_name,
                project_type_code,
                analysis_type,
                acres_gross,
                project_address,
                jurisdiction_city,
                jurisdiction_county,
                jurisdiction_state,
                target_units,
                price_range_low,
                price_range_high,
                discount_rate_pct,
                market_velocity_annual,
                analysis_mode
            FROM landscape.tbl_project
            WHERE project_id = %s
        """,
        'description': 'Full project details'
    },
}


# Intent detection patterns: (pattern, template_key, priority)
# Higher priority = checked first
INTENT_PATTERNS: List[Tuple[str, str, int]] = [
    # Parcel/lot questions - high priority for specific counts
    (r'how many\s+(parcels?|lots?)', 'parcel_count', 100),
    (r'(number|count)\s+of\s+(parcels?|lots?)', 'parcel_count', 100),
    (r'(parcel|lot)\s+count', 'parcel_count', 100),
    (r'total\s+(parcels?|lots?)', 'parcel_count', 95),

    # Parcel summary/breakdown
    (r'(parcels?|lots?)\s+by\s+(type|product)', 'parcel_by_type', 90),
    (r'(parcel|lot)\s+(breakdown|summary|details)', 'parcel_summary', 85),
    (r'(parcels?|lots?)\s+.*\s+(units?|acres?)', 'parcel_summary', 80),

    # Container/hierarchy questions
    (r'how many\s+(areas?|phases?|villages?)', 'container_summary', 100),
    (r'what\s+(areas?|phases?)\s+(are|is)\s+there', 'container_summary', 100),
    (r'(project|container)\s+(structure|hierarchy)', 'container_summary', 90),
    (r'(areas?|phases?)\s+(list|count|summary)', 'container_summary', 85),
    (r'list\s+(containers?|areas?|phases?)', 'container_list', 80),

    # Budget questions
    (r'total\s+(budget|cost|development cost)', 'budget_total', 100),
    (r'how much\s+.*\s+(budget|cost)', 'budget_total', 95),
    (r'budget\s+(breakdown|by category)', 'budget_by_category', 90),
    (r'(cost|budget)\s+by\s+(category|type)', 'budget_by_category', 90),
    (r'budget\s+by\s+activity', 'budget_by_activity', 90),
    (r'(acquisition|planning|development|operations)\s+costs?', 'budget_by_activity', 85),

    # Pricing questions - comprehensive patterns
    (r'(price|pricing)\s+(per|assumptions?)', 'land_use_pricing', 90),
    (r'(land use|product)\s+pric', 'land_use_pricing', 90),
    (r'lot\s+prices?', 'land_use_pricing', 85),
    (r'price\s+per\s+(lot|unit|acre|sf)', 'land_use_pricing', 85),
    # "show me pricing by land use", "pricing by land use", "pricing for land use"
    (r'pricing\s+(by|for|per)\s+land\s*use', 'land_use_pricing', 95),
    # "show me the pricing", "what is the pricing", "what are the prices"
    (r'(show|what).*(pricing|prices)', 'land_use_pricing', 80),
    # "land use prices", "land use pricing data"
    (r'land\s*use\s+(pricing|prices?)', 'land_use_pricing', 90),
    # "pricing assumptions", "price assumptions"
    (r'(pricing|price)\s+assumptions?', 'land_use_pricing', 90),

    # Project overview
    (r'(project|overview|summary)\s+(details?|info)', 'project_details', 70),
    (r'tell me about\s+(this|the)\s+project', 'project_details', 70),
    (r'what is\s+(this|the)\s+project', 'project_details', 70),
]


def detect_query_intent(question: str) -> Optional[str]:
    """
    Map natural language question to query template using pattern matching.

    Args:
        question: User's question

    Returns:
        Template key or None if no match
    """
    question_lower = question.lower().strip()

    # Sort patterns by priority (highest first)
    sorted_patterns = sorted(INTENT_PATTERNS, key=lambda x: x[2], reverse=True)

    for pattern, template_key, _ in sorted_patterns:
        if re.search(pattern, question_lower):
            return template_key

    return None


def execute_project_query(project_id: int, template_key: str) -> Dict[str, Any]:
    """
    Execute a safe, parameterized query and return results.

    Args:
        project_id: Project ID to query
        template_key: Key from QUERY_TEMPLATES

    Returns:
        Dict with query_type, columns, rows, row_count, description
    """
    if template_key not in QUERY_TEMPLATES:
        return {
            'error': f'Unknown query type: {template_key}',
            'query_type': template_key,
            'rows': [],
            'row_count': 0
        }

    template = QUERY_TEMPLATES[template_key]
    query = template['query']

    # Count number of %s placeholders to handle queries with multiple subqueries
    placeholder_count = query.count('%s')
    params = [project_id] * placeholder_count

    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        return {
            'query_type': template_key,
            'description': template['description'],
            'columns': columns,
            'rows': [dict(zip(columns, row)) for row in rows],
            'row_count': len(rows)
        }

    except Exception as e:
        return {
            'error': str(e),
            'query_type': template_key,
            'rows': [],
            'row_count': 0
        }


def format_query_results(results: Dict[str, Any]) -> str:
    """
    Format query results as natural language for Landscaper context.

    Args:
        results: Results from execute_project_query

    Returns:
        Formatted string describing the results
    """
    if results.get('error'):
        return f"Database query error: {results['error']}"

    query_type = results['query_type']
    rows = results['rows']

    if not rows:
        return f"No data found for {results.get('description', query_type)}."

    # Format based on query type
    formatter = RESULT_FORMATTERS.get(query_type, _format_generic)
    return formatter(results)


def _format_parcel_count(results: Dict[str, Any]) -> str:
    """Format parcel count results."""
    count = results['rows'][0].get('count', 0)
    return f"The project has {count:,} parcels defined in the database."


def _format_parcel_summary(results: Dict[str, Any]) -> str:
    """Format parcel summary results."""
    row = results['rows'][0]
    lines = ["Parcel Summary:"]

    count = row.get('parcel_count', 0)
    lines.append(f"- Total Parcels: {count:,}")

    total_units = row.get('total_units')
    if total_units:
        lines.append(f"- Total Units/Lots: {int(total_units):,}")

    total_acres = row.get('total_acres')
    if total_acres:
        lines.append(f"- Total Acres: {float(total_acres):.1f}")

    min_units = row.get('min_units')
    max_units = row.get('max_units')
    if min_units and max_units:
        lines.append(f"- Units per Parcel: {int(min_units)} to {int(max_units)}")

    return "\n".join(lines)


def _format_parcel_by_type(results: Dict[str, Any]) -> str:
    """Format parcel by type results."""
    lines = ["Parcels by Product Type:"]

    for row in results['rows']:
        type_code = row.get('type_code') or 'Unassigned'
        count = row.get('count', 0)
        units = row.get('total_units')
        acres = row.get('total_acres')

        line = f"- {type_code}: {count} parcels"
        if units:
            line += f", {int(units):,} units"
        if acres:
            line += f", {float(acres):.1f} acres"
        lines.append(line)

    return "\n".join(lines)


def _format_container_summary(results: Dict[str, Any]) -> str:
    """Format container/hierarchy summary results."""
    lines = ["Project Hierarchy:"]

    total = 0
    for row in results['rows']:
        level_name = row.get('level_name', f"Level {row.get('level', '?')}")
        count = row.get('count', 0)
        total += count
        lines.append(f"- {level_name}: {count}")

    lines.append(f"- Total: {total}")
    return "\n".join(lines)


def _format_container_list(results: Dict[str, Any]) -> str:
    """Format container list results (deprecated, use area_list/phase_list)."""
    lines = ["Project Containers:"]

    for row in results['rows']:
        lines.append(f"- {row}")

    if len(results['rows']) == 50:
        lines.append("(showing first 50)")

    return "\n".join(lines)


def _format_area_list(results: Dict[str, Any]) -> str:
    """Format area list results."""
    lines = ["Project Areas:"]

    for row in results['rows']:
        alias = row.get('area_alias') or f"Area {row.get('area_no', '?')}"
        phase_count = row.get('phase_count', 0)
        parcel_count = row.get('parcel_count', 0)
        lines.append(f"- {alias}: {phase_count} phases, {parcel_count} parcels")

    if len(results['rows']) == 50:
        lines.append("(showing first 50 areas)")

    return "\n".join(lines)


def _format_phase_list(results: Dict[str, Any]) -> str:
    """Format phase list results."""
    lines = ["Project Phases:"]

    for row in results['rows']:
        name = row.get('phase_name') or f"Phase {row.get('phase_no', '?')}"
        area = row.get('area_name') or ''
        status = row.get('phase_status') or ''
        parcel_count = row.get('parcel_count', 0)

        line = f"- {name}"
        if area:
            line += f" ({area})"
        line += f": {parcel_count} parcels"
        if status:
            line += f" [{status}]"
        lines.append(line)

    if len(results['rows']) == 50:
        lines.append("(showing first 50 phases)")

    return "\n".join(lines)


def _format_budget_total(results: Dict[str, Any]) -> str:
    """Format budget total results."""
    row = results['rows'][0]
    total = row.get('total_budget')
    items = row.get('line_items', 0)

    if total:
        return f"Total project budget: ${float(total):,.0f} across {items:,} line items."
    return f"Project has {items:,} budget line items (no total amount calculated)."


def _format_budget_by_category(results: Dict[str, Any]) -> str:
    """Format budget by category results."""
    lines = ["Budget by Category:"]
    grand_total = 0

    for row in results['rows']:
        category = row.get('category') or 'Uncategorized'
        total = row.get('total')
        items = row.get('items', 0)

        if total:
            grand_total += float(total)
            lines.append(f"- {category}: ${float(total):,.0f} ({items} items)")
        else:
            lines.append(f"- {category}: {items} items")

    if grand_total > 0:
        lines.append(f"Total: ${grand_total:,.0f}")

    return "\n".join(lines)


def _format_budget_by_activity(results: Dict[str, Any]) -> str:
    """Format budget by activity results."""
    lines = ["Budget by Activity Phase:"]
    grand_total = 0

    for row in results['rows']:
        activity = row.get('activity', 'Unassigned')
        total = row.get('total')
        items = row.get('items', 0)

        if total:
            grand_total += float(total)
            lines.append(f"- {activity}: ${float(total):,.0f} ({items} items)")
        else:
            lines.append(f"- {activity}: {items} items")

    if grand_total > 0:
        lines.append(f"Total: ${grand_total:,.0f}")

    return "\n".join(lines)


def _format_land_use_pricing(results: Dict[str, Any]) -> str:
    """Format land use pricing results."""
    lines = ["Land Use Pricing:"]

    for row in results['rows']:
        lu_type = row.get('lu_type_code', 'Unknown')
        product = row.get('product_code')
        price = row.get('price_per_unit')
        uom = row.get('unit_of_measure', 'unit')
        growth = row.get('growth_rate')

        label = f"{lu_type}"
        if product:
            label += f" - {product}"

        if price:
            line = f"- {label}: ${float(price):,.0f} per {uom}"
            if growth:
                line += f" ({float(growth)*100:.1f}% growth)"
            lines.append(line)
        else:
            lines.append(f"- {label}: (no price set)")

    return "\n".join(lines)


def _format_project_details(results: Dict[str, Any]) -> str:
    """Format project details results."""
    row = results['rows'][0]
    lines = [f"Project: {row.get('project_name', 'Unknown')}"]

    if row.get('project_type_code'):
        lines.append(f"- Type: {row['project_type_code']}")
    if row.get('analysis_type'):
        lines.append(f"- Analysis: {row['analysis_type']}")
    if row.get('analysis_mode'):
        lines.append(f"- Mode: {row['analysis_mode']}")

    # Location
    city = row.get('jurisdiction_city')
    county = row.get('jurisdiction_county')
    state = row.get('jurisdiction_state')
    if city or county or state:
        loc_parts = [p for p in [city, f"{county} County" if county else None, state] if p]
        lines.append(f"- Location: {', '.join(loc_parts)}")

    if row.get('project_address'):
        lines.append(f"- Address: {row['project_address']}")

    acres = row.get('acres_gross')
    if acres:
        lines.append(f"- Gross Acres: {float(acres):.1f}")

    units = row.get('target_units')
    if units:
        lines.append(f"- Target Units: {int(units):,}")

    price_low = row.get('price_range_low')
    price_high = row.get('price_range_high')
    if price_low and price_high:
        lines.append(f"- Price Range: ${float(price_low):,.0f} - ${float(price_high):,.0f}")

    discount = row.get('discount_rate_pct')
    if discount:
        lines.append(f"- Discount Rate: {float(discount)*100:.1f}%")

    velocity = row.get('market_velocity_annual')
    if velocity:
        lines.append(f"- Market Velocity: {velocity} units/year")

    return "\n".join(lines)


def _format_generic(results: Dict[str, Any]) -> str:
    """Generic formatter for unspecified query types."""
    desc = results.get('description', results['query_type'])
    count = results['row_count']

    if count == 0:
        return f"No results for: {desc}"

    lines = [f"{desc} ({count} records):"]
    for row in results['rows'][:10]:
        # Format first few key-value pairs
        pairs = [f"{k}: {v}" for k, v in list(row.items())[:4] if v is not None]
        lines.append(f"- {', '.join(pairs)}")

    if count > 10:
        lines.append(f"... and {count - 10} more")

    return "\n".join(lines)


# Map query types to formatters
RESULT_FORMATTERS = {
    'parcel_count': _format_parcel_count,
    'parcel_summary': _format_parcel_summary,
    'parcel_by_type': _format_parcel_by_type,
    'container_summary': _format_container_summary,
    'container_list': _format_container_list,
    'area_list': _format_area_list,
    'phase_list': _format_phase_list,
    'budget_total': _format_budget_total,
    'budget_by_category': _format_budget_by_category,
    'budget_by_activity': _format_budget_by_activity,
    'land_use_pricing': _format_land_use_pricing,
    'project_details': _format_project_details,
}


def get_available_queries() -> List[Dict[str, str]]:
    """Return list of available query types and descriptions."""
    return [
        {'key': key, 'description': template['description']}
        for key, template in QUERY_TEMPLATES.items()
    ]


class QueryBuilder:
    """Convenience wrapper for DB-first query matching and execution."""

    def __init__(self, project_id: int):
        self.project_id = project_id

    def build_context(self, user_message: str) -> Optional[Dict[str, Any]]:
        """Match intent and return query context for prompt building."""
        query_type = detect_query_intent(user_message)
        if not query_type:
            return None

        results = execute_project_query(self.project_id, query_type)
        formatted = None
        if not results.get('error') and results.get('row_count', 0) > 0:
            formatted = format_query_results(results)

        return {
            'query_type': query_type,
            'query_results': results,
            'query_result_text': formatted,
            'row_count': results.get('row_count', 0)
        }
