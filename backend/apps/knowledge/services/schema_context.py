"""
Schema context generator for Landscaper AI.

Generates a concise description of available project data to help
Landscaper understand what can be queried from the database.
"""
from typing import Dict, Any, Optional
from django.db import connection
from django.db.models import Sum, Count


def get_project_schema_context(project_id: int) -> str:
    """
    Generate a natural language description of available project data.

    This helps Landscaper understand what data exists in the database
    and can be queried for this specific project.

    Args:
        project_id: The project ID to generate context for

    Returns:
        A formatted string describing available project data
    """
    context_parts = []

    # Get project basic info
    project_info = _get_project_info(project_id)
    if project_info:
        context_parts.append(_format_project_info(project_info))

    # Get container hierarchy summary
    container_summary = _get_container_summary(project_id)
    if container_summary:
        context_parts.append(_format_container_summary(container_summary))

    # Get parcel summary
    parcel_summary = _get_parcel_summary(project_id)
    if parcel_summary:
        context_parts.append(_format_parcel_summary(parcel_summary))

    # Get budget summary
    budget_summary = _get_budget_summary(project_id)
    if budget_summary:
        context_parts.append(_format_budget_summary(budget_summary))

    # Get land use pricing summary
    pricing_summary = _get_pricing_summary(project_id)
    if pricing_summary:
        context_parts.append(_format_pricing_summary(pricing_summary))

    if not context_parts:
        return "No project data available in database."

    header = f"PROJECT DATABASE AVAILABLE FOR QUERY:"
    return f"{header}\n\n" + "\n\n".join(context_parts)


def _get_project_info(project_id: int) -> Optional[Dict[str, Any]]:
    """Fetch basic project information."""
    with connection.cursor() as cursor:
        cursor.execute("""
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
                analysis_mode
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if not row:
            return None

        return {
            'project_name': row[0],
            'project_type_code': row[1],
            'analysis_type': row[2],
            'acres_gross': row[3],
            'project_address': row[4],
            'city': row[5],
            'county': row[6],
            'state': row[7],
            'target_units': row[8],
            'price_range_low': row[9],
            'price_range_high': row[10],
            'analysis_mode': row[11],
        }


def _get_container_summary(project_id: int) -> Optional[Dict[str, Any]]:
    """Get summary of project hierarchy (areas, phases, parcels)."""
    with connection.cursor() as cursor:
        # Count areas
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_area WHERE project_id = %s
        """, [project_id])
        area_count = cursor.fetchone()[0] or 0

        # Count phases
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_phase WHERE project_id = %s
        """, [project_id])
        phase_count = cursor.fetchone()[0] or 0

        # Parcel count is handled separately
        if area_count == 0 and phase_count == 0:
            return None

        return {
            'by_level': {
                1: area_count,
                2: phase_count,
            },
            'total': area_count + phase_count
        }


def _get_parcel_summary(project_id: int) -> Optional[Dict[str, Any]]:
    """Get summary of parcels."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as parcel_count,
                SUM(units_total) as total_units,
                SUM(acres_gross) as total_acres,
                COUNT(DISTINCT type_code) as product_types
            FROM landscape.tbl_parcel
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if not row or row[0] == 0:
            return None

        return {
            'parcel_count': row[0],
            'total_units': row[1] or 0,
            'total_acres': float(row[2]) if row[2] else 0,
            'product_types': row[3] or 0
        }


def _get_budget_summary(project_id: int) -> Optional[Dict[str, Any]]:
    """Get summary of budget data."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as line_items,
                SUM(amount) as total_budget,
                COUNT(DISTINCT category_l1_id) as categories
            FROM landscape.core_fin_fact_budget
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if not row or row[0] == 0:
            return None

        return {
            'line_items': row[0],
            'total_budget': float(row[1]) if row[1] else 0,
            'categories': row[2] or 0
        }


def _get_pricing_summary(project_id: int) -> Optional[Dict[str, Any]]:
    """Get summary of land use pricing."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as pricing_entries,
                COUNT(DISTINCT lu_type_code) as land_use_types
            FROM landscape.land_use_pricing
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if not row or row[0] == 0:
            return None

        return {
            'pricing_entries': row[0],
            'land_use_types': row[1] or 0
        }


def _format_project_info(info: Dict[str, Any]) -> str:
    """Format project info for context."""
    lines = [f"Project: {info['project_name']}"]

    if info.get('project_type_code'):
        lines.append(f"  Type: {info['project_type_code']}")
    if info.get('analysis_type'):
        lines.append(f"  Analysis: {info['analysis_type']}")
    if info.get('analysis_mode'):
        lines.append(f"  Mode: {info['analysis_mode']}")

    # Location
    location_parts = []
    if info.get('city'):
        location_parts.append(info['city'])
    if info.get('county'):
        location_parts.append(f"{info['county']} County")
    if info.get('state'):
        location_parts.append(info['state'])
    if location_parts:
        lines.append(f"  Location: {', '.join(location_parts)}")

    if info.get('acres_gross'):
        lines.append(f"  Gross Acres: {info['acres_gross']:.1f}")
    if info.get('target_units'):
        lines.append(f"  Target Units: {info['target_units']:,}")

    if info.get('price_range_low') and info.get('price_range_high'):
        lines.append(f"  Price Range: ${info['price_range_low']:,.0f} - ${info['price_range_high']:,.0f}")

    return "\n".join(lines)


def _format_container_summary(summary: Dict[str, Any]) -> str:
    """Format container summary for context."""
    lines = ["Container Hierarchy:"]

    level_names = {1: 'Areas', 2: 'Phases', 3: 'Units'}
    for level, count in summary['by_level'].items():
        name = level_names.get(level, f'Level {level}')
        lines.append(f"  {name}: {count}")

    lines.append(f"  Total Containers: {summary['total']}")
    return "\n".join(lines)


def _format_parcel_summary(summary: Dict[str, Any]) -> str:
    """Format parcel summary for context."""
    lines = ["Parcels:"]
    lines.append(f"  Total Parcels: {summary['parcel_count']}")

    if summary['total_units']:
        lines.append(f"  Total Units/Lots: {int(summary['total_units']):,}")
    if summary['total_acres']:
        lines.append(f"  Total Acres: {summary['total_acres']:.1f}")
    if summary['product_types']:
        lines.append(f"  Product Types: {summary['product_types']}")

    return "\n".join(lines)


def _format_budget_summary(summary: Dict[str, Any]) -> str:
    """Format budget summary for context."""
    lines = ["Budget:"]

    if summary['total_budget']:
        lines.append(f"  Total Budget: ${summary['total_budget']:,.0f}")
    lines.append(f"  Line Items: {summary['line_items']}")
    lines.append(f"  Categories: {summary['categories']}")

    return "\n".join(lines)


def _format_pricing_summary(summary: Dict[str, Any]) -> str:
    """Format pricing summary for context."""
    lines = ["Land Use Pricing:"]
    lines.append(f"  Pricing Entries: {summary['pricing_entries']}")
    lines.append(f"  Land Use Types: {summary['land_use_types']}")
    return "\n".join(lines)
