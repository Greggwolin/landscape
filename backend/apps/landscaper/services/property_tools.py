"""
Property Attribute Tools for Landscaper AI

Provides AI tools for reading and updating property attributes:
- Site characteristics (physical, utilities, flood, environmental)
- Improvement characteristics (construction, mechanical, amenities, obsolescence)

Implements the Core + Configurable pattern:
- Core fields: Discrete columns on tbl_project (ratings, counts, etc.)
- JSONB columns: Flexible storage for configurable attributes
- Attribute definitions: Drive dynamic form rendering and extraction targeting
"""

import json
import logging
from typing import Dict, List, Any, Optional
from decimal import Decimal
from django.db import connection

logger = logging.getLogger(__name__)


# =============================================================================
# Property Attribute Tool Definitions (for LANDSCAPER_TOOLS)
# =============================================================================

PROPERTY_ATTRIBUTE_TOOLS = [
    {
        "name": "get_property_attributes",
        "description": """Get all property attributes for this project.

Returns both core fields and configurable attributes:

Core Fields:
- Site: site_shape, site_utility_rating, location_rating, access_rating, visibility_rating
- Improvement: building_count, net_rentable_area, construction_class, construction_type,
  condition_rating, quality_rating, land_to_building_ratio
- Parking: parking_spaces, parking_ratio, parking_type
- Economic Life: effective_age, total_economic_life, remaining_economic_life

Configurable Attributes (JSONB):
- site_attributes: Frontage, utilities, flood info, environmental
- improvement_attributes: Mechanical systems, amenities, obsolescence

Use this to understand the current property description state before updating.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["site", "improvement", "all"],
                    "description": "Which category of attributes to return (default: all)"
                }
            },
            "required": []
        }
    },
    {
        "name": "update_property_attributes",
        "description": """Update property attributes for this project.

Can update both core fields and configurable JSONB attributes.

Core Fields (use field names directly):
- site_shape: Text description (e.g., "Rectangular", "Irregular")
- site_utility_rating: 1-5 scale
- location_rating: 1-5 scale
- access_rating: 1-5 scale
- visibility_rating: 1-5 scale
- building_count: Integer
- net_rentable_area: Numeric (SF)
- land_to_building_ratio: Decimal (e.g., 3.5)
- construction_class: A, B, C, D, or S
- construction_type: Text (e.g., "wood_frame", "steel", "concrete", "masonry")
- condition_rating: 1-5 scale
- quality_rating: 1-5 scale
- parking_spaces: Integer
- parking_ratio: Decimal (spaces per unit or per 1000 SF)
- parking_type: Text (e.g., "surface", "covered", "garage", "subterranean")
- effective_age: Integer (years)
- total_economic_life: Integer (years)
- remaining_economic_life: Integer (years)

Configurable Attributes (use site_attributes or improvement_attributes):
Pass as nested object with attribute_code as keys.

Example: Update site frontage and HVAC type
{
    "site_attributes": {"frontage": "Main St: 200 ft, Oak Ave: 150 ft"},
    "improvement_attributes": {"hvac_type": "central"}
}
""",
        "input_schema": {
            "type": "object",
            "properties": {
                # Core site fields
                "site_shape": {"type": "string", "description": "Site shape (Rectangular, Irregular, etc.)"},
                "site_utility_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                "location_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                "access_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                "visibility_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                # Core improvement fields
                "building_count": {"type": "integer"},
                "net_rentable_area": {"type": "number"},
                "land_to_building_ratio": {"type": "number"},
                "construction_class": {"type": "string", "enum": ["A", "B", "C", "D", "S"]},
                "construction_type": {"type": "string"},
                "condition_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                "quality_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                # Parking
                "parking_spaces": {"type": "integer"},
                "parking_ratio": {"type": "number"},
                "parking_type": {"type": "string"},
                # Economic life
                "effective_age": {"type": "integer"},
                "total_economic_life": {"type": "integer"},
                "remaining_economic_life": {"type": "integer"},
                # Configurable JSONB attributes
                "site_attributes": {
                    "type": "object",
                    "description": "Site attributes keyed by attribute_code",
                    "additionalProperties": True
                },
                "improvement_attributes": {
                    "type": "object",
                    "description": "Improvement attributes keyed by attribute_code",
                    "additionalProperties": True
                }
            },
            "required": []
        }
    },
    {
        "name": "get_attribute_definitions",
        "description": """Get the available property attribute definitions.

Returns the configurable attribute definitions that drive form rendering.
Use this to understand what attributes can be set and their valid values.

Each definition includes:
- attribute_code: Key for storing the value
- attribute_label: Display name
- data_type: text, number, boolean, date, select, multiselect, rating, narrative
- options: For select/multiselect, the valid choices
- help_text: Guidance on what to enter

Filter by category (site or improvement) and optionally by subcategory.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["site", "improvement"],
                    "description": "Category to get definitions for"
                },
                "subcategory": {
                    "type": "string",
                    "description": "Optional subcategory filter (e.g., 'utilities', 'construction')"
                }
            },
            "required": ["category"]
        }
    },
    {
        "name": "update_site_attribute",
        "description": """Update a single site attribute.

Use this to set a specific site attribute value.
The attribute_code must match a defined attribute in tbl_property_attribute_def.

Common site attributes:
- Physical: frontage, corner_lot, topography_detail, soil_type
- Utilities: water_provider, water_status, sewer_provider, sewer_status, electric_provider, gas_provider
- Flood: fema_map_number, fema_map_date, flood_zone_narrative
- Environmental: wetlands_present, wetlands_narrative, hazmat_concern, hazmat_narrative, esa_phase

Example: Set FEMA map info
{
    "attribute_code": "fema_map_number",
    "value": "12345C0100J"
}
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "attribute_code": {
                    "type": "string",
                    "description": "The attribute code to update"
                },
                "value": {
                    "description": "The value to set (type depends on attribute definition)"
                }
            },
            "required": ["attribute_code", "value"]
        }
    },
    {
        "name": "update_improvement_attribute",
        "description": """Update a single improvement attribute.

Use this to set a specific improvement attribute value.
The attribute_code must match a defined attribute in tbl_property_attribute_def.

Common improvement attributes:
- Construction: frame_type, foundation_type, exterior_walls, roof_type, roof_cover, windows
- Mechanical: hvac_type, hvac_age, water_heater_type, metering, fire_protection, security, elevator_count
- Amenities: project_amenities (multiselect), unit_amenities (multiselect)
- Obsolescence: physical_deterioration, functional_obsolescence, external_obsolescence

Example: Set HVAC type
{
    "attribute_code": "hvac_type",
    "value": "central"
}

Example: Set project amenities (multiselect)
{
    "attribute_code": "project_amenities",
    "value": ["pool", "fitness", "clubhouse", "covered_parking"]
}
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "attribute_code": {
                    "type": "string",
                    "description": "The attribute code to update"
                },
                "value": {
                    "description": "The value to set (type depends on attribute definition)"
                }
            },
            "required": ["attribute_code", "value"]
        }
    },
    {
        "name": "calculate_remaining_economic_life",
        "description": """Calculate remaining economic life based on effective age and total life.

If effective_age and total_economic_life are set, calculates:
remaining_economic_life = total_economic_life - effective_age

Also calculates depreciation percentage for cost approach:
depreciation_pct = effective_age / total_economic_life

Returns calculated values without saving - use update_property_attributes to persist.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "effective_age": {
                    "type": "integer",
                    "description": "Effective age in years (optional - uses current project value if not provided)"
                },
                "total_economic_life": {
                    "type": "integer",
                    "description": "Total economic life in years (optional - uses current project value if not provided)"
                }
            },
            "required": []
        }
    }
]


# =============================================================================
# Tool Handler Functions
# =============================================================================

def handle_get_property_attributes(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get property attributes for a project."""
    category = tool_input.get('category', 'all')

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    site_shape, site_utility_rating, location_rating, access_rating, visibility_rating,
                    building_count, net_rentable_area, land_to_building_ratio,
                    construction_class, construction_type, condition_rating, quality_rating,
                    parking_spaces, parking_ratio, parking_type,
                    effective_age, total_economic_life, remaining_economic_life,
                    site_attributes, improvement_attributes
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Project {project_id} not found'}

            core_site = {
                'site_shape': row[0],
                'site_utility_rating': row[1],
                'location_rating': row[2],
                'access_rating': row[3],
                'visibility_rating': row[4],
            }

            core_improvement = {
                'building_count': row[5],
                'net_rentable_area': float(row[6]) if row[6] else None,
                'land_to_building_ratio': float(row[7]) if row[7] else None,
                'construction_class': row[8],
                'construction_type': row[9],
                'condition_rating': row[10],
                'quality_rating': row[11],
            }

            core_parking = {
                'parking_spaces': row[12],
                'parking_ratio': float(row[13]) if row[13] else None,
                'parking_type': row[14],
            }

            core_economic_life = {
                'effective_age': row[15],
                'total_economic_life': row[16],
                'remaining_economic_life': row[17],
            }

            site_attributes = row[18] or {}
            improvement_attributes = row[19] or {}

        result = {'success': True, 'project_id': project_id}

        if category in ('site', 'all'):
            result['site'] = {
                'core': core_site,
                'attributes': site_attributes
            }

        if category in ('improvement', 'all'):
            result['improvement'] = {
                'core': core_improvement,
                'parking': core_parking,
                'economic_life': core_economic_life,
                'attributes': improvement_attributes
            }

        return result

    except Exception as e:
        logger.error(f"Error getting property attributes: {e}")
        return {'success': False, 'error': str(e)}


def handle_update_property_attributes(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Update property attributes for a project."""
    try:
        updates = []
        values = []

        # Core fields that can be updated directly
        core_fields = [
            'site_shape', 'site_utility_rating', 'location_rating', 'access_rating', 'visibility_rating',
            'building_count', 'net_rentable_area', 'land_to_building_ratio',
            'construction_class', 'construction_type', 'condition_rating', 'quality_rating',
            'parking_spaces', 'parking_ratio', 'parking_type',
            'effective_age', 'total_economic_life', 'remaining_economic_life',
        ]

        for field in core_fields:
            if field in tool_input and tool_input[field] is not None:
                updates.append(f"{field} = %s")
                values.append(tool_input[field])

        # Handle JSONB attributes - merge with existing
        with connection.cursor() as cursor:
            if 'site_attributes' in tool_input:
                # Get existing site_attributes
                cursor.execute(
                    "SELECT COALESCE(site_attributes, '{}'::jsonb) FROM landscape.tbl_project WHERE project_id = %s",
                    [project_id]
                )
                existing = cursor.fetchone()[0] or {}
                existing.update(tool_input['site_attributes'])
                updates.append("site_attributes = %s")
                values.append(json.dumps(existing))

            if 'improvement_attributes' in tool_input:
                # Get existing improvement_attributes
                cursor.execute(
                    "SELECT COALESCE(improvement_attributes, '{}'::jsonb) FROM landscape.tbl_project WHERE project_id = %s",
                    [project_id]
                )
                existing = cursor.fetchone()[0] or {}
                existing.update(tool_input['improvement_attributes'])
                updates.append("improvement_attributes = %s")
                values.append(json.dumps(existing))

            if not updates:
                return {'success': False, 'error': 'No fields provided to update'}

            updates.append("updated_at = CURRENT_TIMESTAMP")

            sql = f"""
                UPDATE landscape.tbl_project
                SET {', '.join(updates)}
                WHERE project_id = %s
            """
            values.append(project_id)

            cursor.execute(sql, values)

        return {
            'success': True,
            'message': f'Updated property attributes for project {project_id}',
            'fields_updated': len(values) - 1  # Exclude project_id
        }

    except Exception as e:
        logger.error(f"Error updating property attributes: {e}")
        return {'success': False, 'error': str(e)}


def handle_get_attribute_definitions(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get property attribute definitions."""
    category = tool_input.get('category')
    subcategory = tool_input.get('subcategory')

    if not category:
        return {'success': False, 'error': 'category is required'}

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT
                    attribute_id, category, subcategory,
                    attribute_code, attribute_label, description,
                    data_type, options, default_value, is_required,
                    sort_order, display_width, help_text,
                    property_types, is_system
                FROM landscape.tbl_property_attribute_def
                WHERE category = %s AND is_active = true
            """
            params = [category]

            if subcategory:
                sql += " AND subcategory = %s"
                params.append(subcategory)

            sql += " ORDER BY subcategory, sort_order"

            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            definitions = []

            for row in cursor.fetchall():
                defn = dict(zip(columns, row))
                # Parse options JSON if present
                if defn.get('options') and isinstance(defn['options'], str):
                    defn['options'] = json.loads(defn['options'])
                definitions.append(defn)

        # Group by subcategory
        grouped = {}
        for defn in definitions:
            subcat = defn.get('subcategory') or 'general'
            if subcat not in grouped:
                grouped[subcat] = []
            grouped[subcat].append(defn)

        return {
            'success': True,
            'category': category,
            'subcategory_filter': subcategory,
            'definitions': definitions,
            'grouped': grouped,
            'count': len(definitions)
        }

    except Exception as e:
        logger.error(f"Error getting attribute definitions: {e}")
        return {'success': False, 'error': str(e)}


def handle_update_site_attribute(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Update a single site attribute."""
    attribute_code = tool_input.get('attribute_code')
    value = tool_input.get('value')

    if not attribute_code:
        return {'success': False, 'error': 'attribute_code is required'}

    try:
        with connection.cursor() as cursor:
            # Verify attribute exists
            cursor.execute("""
                SELECT data_type, options FROM landscape.tbl_property_attribute_def
                WHERE category = 'site' AND attribute_code = %s AND is_active = true
            """, [attribute_code])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Site attribute "{attribute_code}" not found'}

            data_type, options = row

            # Validate value for select types
            if data_type == 'select' and options:
                if isinstance(options, str):
                    options = json.loads(options)
                valid_values = [opt.get('value') for opt in options]
                if value not in valid_values:
                    return {
                        'success': False,
                        'error': f'Invalid value "{value}". Must be one of: {", ".join(valid_values)}'
                    }

            # Get existing site_attributes and merge
            cursor.execute(
                "SELECT COALESCE(site_attributes, '{}'::jsonb) FROM landscape.tbl_project WHERE project_id = %s",
                [project_id]
            )
            existing = cursor.fetchone()[0] or {}
            existing[attribute_code] = value

            cursor.execute("""
                UPDATE landscape.tbl_project
                SET site_attributes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE project_id = %s
            """, [json.dumps(existing), project_id])

        return {
            'success': True,
            'attribute_code': attribute_code,
            'value': value,
            'message': f'Updated site attribute "{attribute_code}"'
        }

    except Exception as e:
        logger.error(f"Error updating site attribute: {e}")
        return {'success': False, 'error': str(e)}


def handle_update_improvement_attribute(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Update a single improvement attribute."""
    attribute_code = tool_input.get('attribute_code')
    value = tool_input.get('value')

    if not attribute_code:
        return {'success': False, 'error': 'attribute_code is required'}

    try:
        with connection.cursor() as cursor:
            # Verify attribute exists
            cursor.execute("""
                SELECT data_type, options FROM landscape.tbl_property_attribute_def
                WHERE category = 'improvement' AND attribute_code = %s AND is_active = true
            """, [attribute_code])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Improvement attribute "{attribute_code}" not found'}

            data_type, options = row

            # Validate value for select types
            if data_type == 'select' and options:
                if isinstance(options, str):
                    options = json.loads(options)
                valid_values = [opt.get('value') for opt in options]
                if value not in valid_values:
                    return {
                        'success': False,
                        'error': f'Invalid value "{value}". Must be one of: {", ".join(valid_values)}'
                    }

            # Validate multiselect values
            if data_type == 'multiselect' and options:
                if isinstance(options, str):
                    options = json.loads(options)
                valid_values = [opt.get('value') for opt in options]
                if isinstance(value, list):
                    invalid = [v for v in value if v not in valid_values]
                    if invalid:
                        return {
                            'success': False,
                            'error': f'Invalid values: {invalid}. Valid options: {", ".join(valid_values)}'
                        }

            # Get existing improvement_attributes and merge
            cursor.execute(
                "SELECT COALESCE(improvement_attributes, '{}'::jsonb) FROM landscape.tbl_project WHERE project_id = %s",
                [project_id]
            )
            existing = cursor.fetchone()[0] or {}
            existing[attribute_code] = value

            cursor.execute("""
                UPDATE landscape.tbl_project
                SET improvement_attributes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE project_id = %s
            """, [json.dumps(existing), project_id])

        return {
            'success': True,
            'attribute_code': attribute_code,
            'value': value,
            'message': f'Updated improvement attribute "{attribute_code}"'
        }

    except Exception as e:
        logger.error(f"Error updating improvement attribute: {e}")
        return {'success': False, 'error': str(e)}


def handle_calculate_remaining_economic_life(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Calculate remaining economic life and depreciation."""
    effective_age = tool_input.get('effective_age')
    total_economic_life = tool_input.get('total_economic_life')

    try:
        # If not provided, get from project
        if effective_age is None or total_economic_life is None:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT effective_age, total_economic_life
                    FROM landscape.tbl_project
                    WHERE project_id = %s
                """, [project_id])
                row = cursor.fetchone()
                if row:
                    if effective_age is None:
                        effective_age = row[0]
                    if total_economic_life is None:
                        total_economic_life = row[1]

        if effective_age is None:
            return {'success': False, 'error': 'effective_age not provided and not set on project'}
        if total_economic_life is None:
            return {'success': False, 'error': 'total_economic_life not provided and not set on project'}
        if total_economic_life <= 0:
            return {'success': False, 'error': 'total_economic_life must be greater than 0'}

        remaining_economic_life = max(0, total_economic_life - effective_age)
        depreciation_pct = min(1.0, effective_age / total_economic_life) if total_economic_life > 0 else 0
        depreciation_pct_display = round(depreciation_pct * 100, 2)

        return {
            'success': True,
            'effective_age': effective_age,
            'total_economic_life': total_economic_life,
            'remaining_economic_life': remaining_economic_life,
            'depreciation_pct': depreciation_pct,
            'depreciation_pct_display': f'{depreciation_pct_display}%',
            'message': f'Remaining life: {remaining_economic_life} years. Depreciation: {depreciation_pct_display}%'
        }

    except Exception as e:
        logger.error(f"Error calculating remaining economic life: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# Tool Registry
# =============================================================================

PROPERTY_ATTRIBUTE_TOOL_HANDLERS = {
    'get_property_attributes': handle_get_property_attributes,
    'update_property_attributes': handle_update_property_attributes,
    'get_attribute_definitions': handle_get_attribute_definitions,
    'update_site_attribute': handle_update_site_attribute,
    'update_improvement_attribute': handle_update_improvement_attribute,
    'calculate_remaining_economic_life': handle_calculate_remaining_economic_life,
}
