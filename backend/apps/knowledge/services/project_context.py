"""
Assembles complete project context for Landscaper prompts.
Queries all relevant tables and formats data for LLM consumption.

This service provides comprehensive project data to Landscaper including:
- Project profile (basic info, property type, location)
- Container hierarchy (buildings, units, phases, parcels)
- Unit/Rent roll data (for multifamily)
- Operating expenses
- Budget summary
- Sales/absorption data
- Financial assumptions
- Document inventory

The context is formatted as natural language for Claude's system prompt.
"""

from django.db import connection
from typing import Dict, Any, Optional, List
import json


class ProjectContextService:
    """Builds comprehensive project context for Landscaper."""

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._cache: Dict[str, Any] = {}

    def get_full_context(self) -> str:
        """
        Assemble complete project context as formatted string.

        Returns a multi-section context document covering all available
        project data from the database.
        """
        sections = []

        # 1. Project Profile
        profile = self.get_project_profile()
        if profile:
            sections.append(self._format_section("Project Profile", profile))

        # 2. Container Hierarchy (generic structure)
        hierarchy = self.get_container_hierarchy()
        if hierarchy:
            sections.append(self._format_section("Property Structure", hierarchy))

        # 3. Unit/Rent Data (multifamily specific)
        units = self.get_unit_data()
        if units:
            sections.append(self._format_section("Unit Mix & Rents", units))

        # 4. Land Use / Parcel Data (land development specific)
        parcels = self.get_parcel_data()
        if parcels:
            sections.append(self._format_section("Parcels & Land Use", parcels))

        # 5. Operating Expenses
        opex = self.get_operating_expenses()
        if opex:
            sections.append(self._format_section("Operating Expenses", opex))

        # 6. Budget Summary
        budget = self.get_budget_summary()
        if budget:
            sections.append(self._format_section("Budget Summary", budget))

        # 7. Sales Data
        sales = self.get_sales_data()
        if sales:
            sections.append(self._format_section("Sales & Absorption", sales))

        # 8. Market / Competitive Data
        market = self.get_competitive_data()
        if market:
            sections.append(self._format_section("Market Competitive Data (Zonda)", market))

        # 9. Financial Assumptions
        assumptions = self.get_financial_assumptions()
        if assumptions:
            sections.append(self._format_section("Financial Assumptions", assumptions))

        # 9. Document Inventory
        docs = self.get_document_inventory()
        if docs:
            sections.append(self._format_section("Uploaded Documents", docs))

        if not sections:
            return "No structured project data available in database."

        return "\n\n".join(sections)

    def get_project_profile(self) -> Optional[str]:
        """Get basic project information."""
        with connection.cursor() as cursor:
            # Query uses actual column names from tbl_project
            cursor.execute("""
                SELECT
                    p.project_name,
                    p.project_address as address,
                    p.jurisdiction_city as city,
                    p.jurisdiction_state as state,
                    p.jurisdiction_county as county,
                    p.analysis_type,
                    p.project_type_code,
                    p.acres_gross as gross_acres,
                    p.target_units,
                    p.price_range_low,
                    p.price_range_high,
                    p.analysis_mode,
                    p.discount_rate_pct,
                    p.market_velocity_annual
                FROM landscape.tbl_project p
                WHERE p.project_id = %s
            """, [self.project_id])

            row = cursor.fetchone()
            if not row:
                return None

            columns = [col[0] for col in cursor.description]
            data = dict(zip(columns, row))

        lines = []
        if data.get('project_name'):
            lines.append(f"Name: {data['project_name']}")

        # Address
        addr_parts = [data.get('address'), data.get('city'), data.get('state')]
        addr = ", ".join(filter(None, addr_parts))
        if addr:
            lines.append(f"Address: {addr}")

        if data.get('county'):
            lines.append(f"County: {data['county']}")

        # Property type
        prop_type = data.get('project_type_code') or data.get('analysis_type')
        if prop_type:
            lines.append(f"Property Type: {prop_type}")
        if data.get('analysis_mode'):
            lines.append(f"Analysis Mode: {data['analysis_mode']}")

        # Size metrics
        if data.get('target_units'):
            lines.append(f"Target Units: {data['target_units']:,}")
        if data.get('gross_acres'):
            lines.append(f"Gross Acres: {float(data['gross_acres']):.2f}")

        # Pricing
        if data.get('price_range_low') and data.get('price_range_high'):
            lines.append(f"Price Range: ${float(data['price_range_low']):,.0f} - ${float(data['price_range_high']):,.0f}")

        # Financial assumptions
        if data.get('discount_rate_pct'):
            lines.append(f"Discount Rate: {float(data['discount_rate_pct'])*100:.1f}%")
        if data.get('market_velocity_annual'):
            lines.append(f"Market Velocity: {data['market_velocity_annual']} units/year")

        return "\n".join(lines) if lines else None

    def get_container_hierarchy(self) -> Optional[str]:
        """Get property structure (buildings, units, phases, parcels)."""
        with connection.cursor() as cursor:
            # Try tbl_container first (generic hierarchy) - may not exist
            try:
                cursor.execute("""
                    SELECT
                        container_id,
                        parent_container_id,
                        container_level,
                        container_code,
                        display_name,
                        container_type
                    FROM landscape.tbl_container
                    WHERE project_id = %s
                      AND is_active = true
                    ORDER BY container_level, sort_order, container_code
                    LIMIT 100
                """, [self.project_id])

                rows = cursor.fetchall()

                if rows:
                    columns = [col[0] for col in cursor.description]
                    containers = [dict(zip(columns, row)) for row in rows]

                    # Build hierarchy summary
                    level_counts = {}
                    for c in containers:
                        level = c['container_level']
                        level_counts[level] = level_counts.get(level, 0) + 1

                    lines = ["Hierarchy Summary:"]
                    level_names = {1: 'Buildings/Areas', 2: 'Floors/Phases', 3: 'Units'}
                    for level in sorted(level_counts.keys()):
                        name = level_names.get(level, f'Level {level}')
                        lines.append(f"  {name}: {level_counts[level]}")

                    # Show some details
                    lines.append("\nTop-Level Items:")
                    top_level = [c for c in containers if c['container_level'] == 1][:10]
                    for c in top_level:
                        name = c['display_name'] or c['container_code']
                        lines.append(f"  - {name}")

                    if len([c for c in containers if c['container_level'] == 1]) > 10:
                        lines.append("  ... and more")

                    return "\n".join(lines)
            except Exception:
                pass  # Table doesn't exist, try fallback

            # Fallback to area/phase structure
            try:
                cursor.execute("""
                    SELECT
                        'Areas' as level_name,
                        (SELECT COUNT(*) FROM landscape.tbl_area WHERE project_id = %s) as count
                    UNION ALL
                    SELECT
                        'Phases' as level_name,
                        (SELECT COUNT(*) FROM landscape.tbl_phase WHERE project_id = %s) as count
                    UNION ALL
                    SELECT
                        'Parcels' as level_name,
                        (SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = %s) as count
                """, [self.project_id, self.project_id, self.project_id])

                rows = cursor.fetchall()
                if not rows or all(r[1] == 0 for r in rows):
                    return None

                lines = ["Project Structure:"]
                for row in rows:
                    if row[1] > 0:
                        lines.append(f"  {row[0]}: {row[1]}")

                return "\n".join(lines)
            except Exception:
                return None

    def get_unit_data(self) -> Optional[str]:
        """Get unit mix and rent data (multifamily specific)."""
        with connection.cursor() as cursor:
            # Try multifamily unit table
            try:
                cursor.execute("""
                    SELECT
                        unit_type,
                        bedrooms,
                        bathrooms,
                        sq_ft,
                        COUNT(*) as unit_count,
                        AVG(market_rent) as avg_market_rent,
                        AVG(current_rent) as avg_current_rent,
                        MIN(current_rent) as min_rent,
                        MAX(current_rent) as max_rent
                    FROM landscape.tbl_mf_unit
                    WHERE project_id = %s
                    GROUP BY unit_type, bedrooms, bathrooms, sq_ft
                    ORDER BY bedrooms, sq_ft
                """, [self.project_id])

                rows = cursor.fetchall()

                if rows:
                    columns = [col[0] for col in cursor.description]
                    units = [dict(zip(columns, row)) for row in rows]

                    lines = ["Unit Mix:"]
                    total_units = 0

                    for u in units:
                        count = int(u.get('unit_count') or 0)
                        total_units += count

                        # Build unit description
                        unit_desc = u.get('unit_type') or ''
                        if u.get('bedrooms') is not None:
                            unit_desc = f"{int(u['bedrooms'])}BR"
                        if u.get('bathrooms') is not None:
                            unit_desc += f"/{int(u['bathrooms'])}BA"
                        if u.get('sq_ft'):
                            unit_desc += f" ({int(u['sq_ft'])} SF)"

                        rent_info = ""
                        if u.get('avg_current_rent'):
                            avg_rent = float(u['avg_current_rent'])
                            rent_info = f" - Avg Rent: ${avg_rent:,.0f}"
                            if u.get('min_rent') and u.get('max_rent'):
                                rent_info += f" (${float(u['min_rent']):,.0f}-${float(u['max_rent']):,.0f})"
                        elif u.get('avg_market_rent'):
                            rent_info = f" - Market Rent: ${float(u['avg_market_rent']):,.0f}"

                        lines.append(f"  {unit_desc}: {count} units{rent_info}")

                    lines.insert(1, f"Total Units: {total_units}")

                    # Add occupancy if available
                    cursor.execute("""
                        SELECT
                            COUNT(*) as total,
                            COUNT(CASE WHEN is_occupied = true THEN 1 END) as occupied
                        FROM landscape.tbl_mf_unit
                        WHERE project_id = %s
                    """, [self.project_id])
                    occ_row = cursor.fetchone()
                    if occ_row and occ_row[0] > 0:
                        occ_rate = (occ_row[1] / occ_row[0]) * 100
                        lines.append(f"\nOccupancy: {occ_rate:.1f}% ({occ_row[1]}/{occ_row[0]} units)")

                    return "\n".join(lines)
            except Exception:
                pass  # Table may not exist

            # Try container-based units (Level 3)
            try:
                cursor.execute("""
                    SELECT
                        c.display_name as unit_type,
                        c.attributes->>'bedrooms' as bedrooms,
                        c.attributes->>'bathrooms' as bathrooms,
                        c.attributes->>'sq_ft' as sq_ft,
                        c.attributes->>'rent' as rent,
                        COUNT(*) as unit_count
                    FROM landscape.tbl_container c
                    WHERE c.project_id = %s
                      AND c.container_level = 3
                      AND c.is_active = true
                    GROUP BY c.display_name,
                             c.attributes->>'bedrooms',
                             c.attributes->>'bathrooms',
                             c.attributes->>'sq_ft',
                             c.attributes->>'rent'
                    ORDER BY c.attributes->>'bedrooms', c.attributes->>'sq_ft'
                """, [self.project_id])

                rows = cursor.fetchall()
                if rows:
                    columns = [col[0] for col in cursor.description]
                    units = [dict(zip(columns, row)) for row in rows]

                    lines = ["Unit Mix (from containers):"]
                    total_units = 0

                    for u in units:
                        count = int(u.get('unit_count') or 0)
                        total_units += count

                        unit_desc = u.get('unit_type') or 'Unit'
                        if u.get('bedrooms'):
                            unit_desc = f"{u['bedrooms']}BR"
                        if u.get('bathrooms'):
                            unit_desc += f"/{u['bathrooms']}BA"
                        if u.get('sq_ft'):
                            unit_desc += f" ({u['sq_ft']} SF)"

                        rent_info = ""
                        if u.get('rent'):
                            rent_info = f" - Rent: ${float(u['rent']):,.0f}"

                        lines.append(f"  {unit_desc}: {count} units{rent_info}")

                    lines.insert(1, f"Total Units: {total_units}")
                    return "\n".join(lines)
            except Exception:
                pass

            return None

    def get_parcel_data(self) -> Optional[str]:
        """Get parcel and land use data (land development specific)."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        COALESCE(type_code, 'Unassigned') as product_type,
                        COUNT(*) as parcel_count,
                        SUM(units_total) as total_units,
                        SUM(acres_gross) as total_acres,
                        AVG(price_per_unit) as avg_price
                    FROM landscape.tbl_parcel
                    WHERE project_id = %s
                    GROUP BY type_code
                    ORDER BY total_units DESC NULLS LAST
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows:
                    return None

                columns = [col[0] for col in cursor.description]
                parcels = [dict(zip(columns, row)) for row in rows]

                lines = ["Parcels by Product Type:"]
                total_parcels = 0
                total_units = 0
                total_acres = 0

                for p in parcels:
                    count = int(p.get('parcel_count') or 0)
                    units = int(p.get('total_units') or 0)
                    acres = float(p.get('total_acres') or 0)

                    total_parcels += count
                    total_units += units
                    total_acres += acres

                    line = f"  {p['product_type']}: {count} parcels"
                    if units:
                        line += f", {units:,} units"
                    if acres:
                        line += f", {acres:.1f} acres"
                    if p.get('avg_price'):
                        line += f" (avg ${float(p['avg_price']):,.0f}/unit)"
                    lines.append(line)

                lines.insert(1, f"Summary: {total_parcels} parcels, {total_units:,} units, {total_acres:.1f} acres")

                return "\n".join(lines)
            except Exception:
                return None

    def get_operating_expenses(self) -> Optional[str]:
        """Get operating expense summary."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        COALESCE(c.name, oe.expense_category, 'Other') as category_name,
                        SUM(oe.annual_amount) as total_amount
                    FROM landscape.tbl_operating_expenses oe
                    LEFT JOIN landscape.core_lookup_item c ON oe.category_id = c.item_id
                    WHERE oe.project_id = %s
                    GROUP BY COALESCE(c.name, oe.expense_category, 'Other')
                    ORDER BY SUM(oe.annual_amount) DESC
                    LIMIT 15
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows:
                    return None

                lines = ["Operating Expenses (Annual):"]
                total = 0

                for row in rows:
                    amount = float(row[1] or 0)
                    total += amount
                    name = row[0] or 'Other'
                    lines.append(f"  {name}: ${amount:,.0f}")

                lines.append(f"\nTotal Operating Expenses: ${total:,.0f}")

                return "\n".join(lines)
            except Exception:
                return None

    def get_budget_summary(self) -> Optional[str]:
        """Get budget summary by category."""
        with connection.cursor() as cursor:
            try:
                # Try core_fin_fact_budget first
                cursor.execute("""
                    SELECT
                        COALESCE(c.name, 'Uncategorized') as category,
                        SUM(b.amount) as total_cost
                    FROM landscape.core_fin_fact_budget b
                    LEFT JOIN landscape.core_lookup_item c ON b.category_l1_id = c.item_id
                    WHERE b.project_id = %s
                    GROUP BY c.name
                    ORDER BY SUM(b.amount) DESC NULLS LAST
                    LIMIT 15
                """, [self.project_id])

                rows = cursor.fetchall()

                if rows and any(r[1] for r in rows):
                    lines = ["Budget Summary (Top Categories):"]
                    total = 0

                    for row in rows:
                        amount = float(row[1] or 0)
                        total += amount
                        lines.append(f"  {row[0]}: ${amount:,.0f}")

                    lines.append(f"\nTotal Budget: ${total:,.0f}")
                    return "\n".join(lines)
            except Exception:
                pass

            # Try tbl_budget_fact as fallback
            try:
                cursor.execute("""
                    SELECT
                        COALESCE(c.category_name, 'Uncategorized') as category,
                        SUM(bf.total_cost) as total_cost
                    FROM landscape.tbl_budget_fact bf
                    LEFT JOIN landscape.core_unit_cost_category c ON bf.category_id = c.category_id
                    WHERE bf.project_id = %s
                    GROUP BY c.category_name
                    ORDER BY SUM(bf.total_cost) DESC NULLS LAST
                    LIMIT 15
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows or not any(r[1] for r in rows):
                    return None

                lines = ["Budget Summary (Top Categories):"]
                total = 0

                for row in rows:
                    amount = float(row[1] or 0)
                    total += amount
                    lines.append(f"  {row[0]}: ${amount:,.0f}")

                lines.append(f"\nTotal Budget: ${total:,.0f}")
                return "\n".join(lines)
            except Exception:
                return None

    def get_sales_data(self) -> Optional[str]:
        """Get sales and absorption data."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        COUNT(*) as total_sales,
                        SUM(sale_price) as total_revenue,
                        AVG(sale_price) as avg_price,
                        MIN(sale_date) as first_sale,
                        MAX(sale_date) as last_sale
                    FROM landscape.tbl_parcel_sale
                    WHERE project_id = %s
                """, [self.project_id])

                row = cursor.fetchone()
                if not row or not row[0]:
                    return None

                total_sales, total_revenue, avg_price, first_sale, last_sale = row

                lines = ["Sales Summary:"]
                lines.append(f"  Total Sales: {total_sales}")
                if total_revenue:
                    lines.append(f"  Total Revenue: ${float(total_revenue):,.0f}")
                if avg_price:
                    lines.append(f"  Average Price: ${float(avg_price):,.0f}")
                if first_sale and last_sale:
                    lines.append(f"  Sales Period: {first_sale} to {last_sale}")

                # Calculate absorption rate if we have dates
                if first_sale and last_sale and total_sales > 1:
                    from datetime import datetime
                    if isinstance(first_sale, str):
                        first_sale = datetime.fromisoformat(first_sale)
                    if isinstance(last_sale, str):
                        last_sale = datetime.fromisoformat(last_sale)

                    months = max(1, (last_sale - first_sale).days / 30)
                    monthly_rate = total_sales / months
                    lines.append(f"  Absorption Rate: {monthly_rate:.1f} units/month")

                return "\n".join(lines)
            except Exception:
                return None

    def get_competitive_data(self) -> Optional[str]:
        """Get competitive market data (Zonda-sourced comps)."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        cp.id as comp_id,
                        cp.comp_name,
                        cp.builder_name,
                        cp.total_units,
                        cp.price_min,
                        cp.price_max,
                        cp.absorption_rate_monthly,
                        cp.data_source,
                        cpp.unit_size_avg_sf,
                        cpp.price_avg,
                        cpp.price_per_sf_avg,
                        cpp.units_planned,
                        cpp.units_remaining,
                        cpp.sales_rate_monthly,
                        cpp.lot_width_ft
                    FROM landscape.market_competitive_projects cp
                    LEFT JOIN landscape.market_competitive_project_products cpp
                        ON cp.id = cpp.competitive_project_id
                    WHERE cp.project_id = %s
                    ORDER BY cp.absorption_rate_monthly DESC NULLS LAST, cp.comp_name
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows:
                    return None

                columns = [col[0] for col in cursor.description]
                records = [dict(zip(columns, row)) for row in rows]

                # Group by comp
                comps = {}
                for r in records:
                    name = r['comp_name']
                    if name not in comps:
                        comps[name] = {
                            'builder': r['builder_name'],
                            'total_units': r['total_units'],
                            'price_min': r['price_min'],
                            'price_max': r['price_max'],
                            'absorption': r['absorption_rate_monthly'],
                            'source': r['data_source'],
                            'products': []
                        }
                    if r.get('price_avg') or r.get('unit_size_avg_sf'):
                        comps[name]['products'].append({
                            'avg_price': r['price_avg'],
                            'avg_sqft': r['unit_size_avg_sf'],
                            'price_per_sqft': r['price_per_sf_avg'],
                            'units_planned': r['units_planned'],
                            'remaining': r['units_remaining'],
                            'monthly_rate': r['sales_rate_monthly'],
                            'lot_width': r['lot_width_ft'],
                        })

                lines = [f"Competitive Projects ({len(comps)} comps, source: Zonda):"]

                for name, comp in comps.items():
                    builder = comp['builder'] or 'Unknown'
                    units = comp['total_units'] or '?'
                    line = f"  {name} ({builder}) - {units} units"
                    if comp['price_min'] and comp['price_max']:
                        line += f", ${float(comp['price_min']):,.0f}-${float(comp['price_max']):,.0f}"
                    if comp['absorption']:
                        line += f", {float(comp['absorption']):.1f}/mo absorption"
                    lines.append(line)

                    for p in comp['products']:
                        parts = []
                        if p['avg_price']:
                            parts.append(f"avg ${float(p['avg_price']):,.0f}")
                        if p['avg_sqft']:
                            parts.append(f"{int(p['avg_sqft'])} SF")
                        if p['price_per_sqft']:
                            parts.append(f"${float(p['price_per_sqft']):,.0f}/SF")
                        if p['remaining'] is not None and p['units_planned'] is not None:
                            parts.append(f"{int(p['remaining'])}/{int(p['units_planned'])} remaining")
                        if p['monthly_rate']:
                            parts.append(f"{float(p['monthly_rate']):.1f}/mo")
                        if p['lot_width']:
                            parts.append(f"{int(p['lot_width'])}' lot")
                        if parts:
                            lines.append(f"    Product: {', '.join(parts)}")

                return "\n".join(lines)
            except Exception:
                return None

    def get_financial_assumptions(self) -> Optional[str]:
        """Get key financial assumptions."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        assumption_key,
                        assumption_value,
                        assumption_type
                    FROM landscape.tbl_project_assumption
                    WHERE project_id = %s
                    ORDER BY assumption_key
                    LIMIT 30
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows:
                    return None

                lines = ["Financial Assumptions:"]

                for row in rows:
                    key = row[0].replace('_', ' ').title()
                    value = row[1]

                    # Format percentages
                    if 'rate' in row[0].lower() or 'cap' in row[0].lower() or 'pct' in row[0].lower():
                        try:
                            val = float(value)
                            value = f"{val * 100:.2f}%" if val < 1 else f"{val}%"
                        except:
                            pass

                    lines.append(f"  {key}: {value}")

                return "\n".join(lines)
            except Exception:
                return None

    def get_document_inventory(self) -> Optional[str]:
        """Get list of uploaded documents with their processing status."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT
                        d.doc_name,
                        d.doc_type,
                        d.status,
                        d.created_at,
                        COALESCE(e.chunk_count, 0) as chunk_count
                    FROM landscape.core_doc d
                    LEFT JOIN (
                        SELECT source_id, COUNT(*) as chunk_count
                        FROM landscape.knowledge_embeddings
                        WHERE source_type = 'document_chunk'
                        GROUP BY source_id
                    ) e ON d.doc_id = e.source_id
                    WHERE d.project_id = %s
                    ORDER BY d.created_at DESC
                    LIMIT 20
                """, [self.project_id])

                rows = cursor.fetchall()
                if not rows:
                    return None

                columns = [col[0] for col in cursor.description]
                docs = [dict(zip(columns, row)) for row in rows]

                lines = [f"Uploaded Documents ({len(docs)} files):"]
                processed_count = 0

                for doc in docs:
                    name = doc['doc_name']
                    doc_type = doc['doc_type'] or 'general'
                    chunks = doc['chunk_count'] or 0

                    status_icon = "✓" if chunks > 0 else "○"
                    if chunks > 0:
                        processed_count += 1

                    lines.append(f"  {status_icon} {name} [{doc_type}]")

                lines.insert(1, f"Processed: {processed_count}/{len(docs)} files have searchable content")

                return "\n".join(lines)
            except Exception:
                return None

    def _format_section(self, title: str, content: str) -> str:
        """Format a section with header."""
        return f"## {title}\n{content}"


def get_project_context(project_id: int) -> str:
    """Convenience function to get full project context."""
    service = ProjectContextService(project_id)
    return service.get_full_context()


def get_project_context_summary(project_id: int) -> Dict[str, Any]:
    """
    Get a summary of what data is available for a project.
    Used for confidence calculations and data availability checks.
    """
    service = ProjectContextService(project_id)

    summary = {
        'has_profile': False,
        'has_hierarchy': False,
        'has_units': False,
        'has_parcels': False,
        'has_opex': False,
        'has_budget': False,
        'has_sales': False,
        'has_assumptions': False,
        'has_documents': False,
        'processed_docs': 0,
        'total_docs': 0,
    }

    if service.get_project_profile():
        summary['has_profile'] = True
    if service.get_container_hierarchy():
        summary['has_hierarchy'] = True
    if service.get_unit_data():
        summary['has_units'] = True
    if service.get_parcel_data():
        summary['has_parcels'] = True
    if service.get_operating_expenses():
        summary['has_opex'] = True
    if service.get_budget_summary():
        summary['has_budget'] = True
    if service.get_sales_data():
        summary['has_sales'] = True
    if service.get_financial_assumptions():
        summary['has_assumptions'] = True

    # Document stats
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
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
            if row:
                summary['total_docs'] = row[0] or 0
                summary['processed_docs'] = row[1] or 0
                summary['has_documents'] = row[0] > 0
        except Exception:
            pass

    return summary
