"""
Landscaper Tool Executor

Executes tool calls from Claude AI to update project fields in the database.
All changes are logged to the activity feed.
"""

import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal, InvalidOperation
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Allowed Tables and Fields (Whitelist for Security)
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_UPDATES = {
    'tbl_project': {
        'fields': [
            # Core identifiers
            'project_name', 'description', 'project_type', 'financial_model_type',
            # Location - note actual column names
            'project_address', 'jurisdiction_city', 'jurisdiction_state',
            'jurisdiction_county', 'county', 'location_lat', 'location_lon',
            'location_description',
            # Sizing
            'acres_gross', 'target_units',
            # Pricing
            'price_range_low', 'price_range_high',
            # Financial
            'discount_rate_pct', 'cost_of_capital_pct',
            # Analysis
            'analysis_start_date', 'analysis_end_date', 'calculation_frequency',
            # Ownership
            'legal_owner', 'developer_owner',
            # Status
            'is_active',
        ],
        # Map friendly names to actual column names
        'field_aliases': {
            'city': 'jurisdiction_city',
            'state': 'jurisdiction_state',
            'address': 'project_address',
            'latitude': 'location_lat',
            'longitude': 'location_lon',
            'total_acres': 'acres_gross',
            'total_units': 'target_units',
            'discount_rate': 'discount_rate_pct',
        },
        'pk_field': 'project_id',
        'schema': 'landscape'
    },
    'tbl_parcel': {
        'fields': [
            'parcel_name', 'parcel_type', 'lot_count', 'net_acres', 'gross_acres',
            'avg_lot_size_sf', 'avg_lot_price', 'total_revenue', 'absorption_rate',
            'status', 'notes', 'is_active'
        ],
        'pk_field': 'parcel_id',
        'fk_field': 'project_id',
        'schema': 'landscape'
    },
    'tbl_phase': {
        'fields': [
            'phase_name', 'phase_number', 'lot_count', 'start_date', 'end_date',
            'budget_amount', 'status', 'notes', 'is_active'
        ],
        'pk_field': 'phase_id',
        'fk_field': 'project_id',
        'schema': 'landscape'
    }
}

# Fields that should be cast to specific types
FIELD_TYPES = {
    # tbl_project numeric fields
    'acres_gross': 'decimal',
    'target_units': 'integer',
    'location_lat': 'decimal',
    'location_lon': 'decimal',
    'price_range_low': 'decimal',
    'price_range_high': 'decimal',
    'discount_rate_pct': 'decimal',
    'cost_of_capital_pct': 'decimal',
    'assessed_value': 'decimal',
    # tbl_parcel numeric fields
    'lot_count': 'integer',
    'net_acres': 'decimal',
    'gross_acres': 'decimal',
    'avg_lot_size_sf': 'decimal',
    'avg_lot_price': 'decimal',
    'total_revenue': 'decimal',
    'absorption_rate': 'decimal',
    # tbl_phase numeric fields
    'phase_number': 'integer',
    'budget_amount': 'decimal',
    # Boolean fields
    'is_active': 'boolean',
}


def cast_value(field: str, value: str) -> Any:
    """Cast a string value to the appropriate type for the field."""
    field_type = FIELD_TYPES.get(field, 'string')

    if value is None or value == '' or value.lower() == 'null':
        return None

    try:
        if field_type == 'integer':
            return int(float(value))
        elif field_type == 'decimal':
            return Decimal(str(value))
        elif field_type == 'boolean':
            return value.lower() in ('true', '1', 'yes')
        else:
            return str(value)
    except (ValueError, InvalidOperation) as e:
        logger.warning(f"Could not cast value '{value}' for field '{field}': {e}")
        return str(value)


def get_current_value(table: str, field: str, project_id: int) -> Optional[Any]:
    """Get the current value of a field for a project."""
    table_config = ALLOWED_UPDATES.get(table)
    if not table_config:
        return None

    # Check for field aliases
    field_aliases = table_config.get('field_aliases', {})
    db_field = field_aliases.get(field, field)

    schema = table_config.get('schema', 'landscape')
    pk_field = table_config.get('pk_field')
    fk_field = table_config.get('fk_field')

    # Use the appropriate field for lookup
    lookup_field = fk_field if fk_field else pk_field

    try:
        with connection.cursor() as cursor:
            query = f"""
                SELECT {db_field}
                FROM {schema}.{table}
                WHERE {lookup_field} = %s
                LIMIT 1
            """
            cursor.execute(query, [project_id])
            row = cursor.fetchone()
            return row[0] if row else None
    except Exception as e:
        logger.warning(f"Could not get current value for {table}.{db_field}: {e}")
        return None


def update_single_field(
    table: str,
    field: str,
    value: str,
    reason: str,
    project_id: int
) -> Dict[str, Any]:
    """
    Update a single field in the database.

    Returns:
        Dict with success status, old_value, new_value, and any error message
    """
    # Validate table is allowed
    table_config = ALLOWED_UPDATES.get(table)
    if not table_config:
        return {
            'success': False,
            'error': f"Table '{table}' is not allowed for updates",
            'table': table,
            'field': field
        }

    # Check for field aliases (friendly name -> actual column name)
    field_aliases = table_config.get('field_aliases', {})
    actual_field = field_aliases.get(field, field)

    # Validate field is allowed (check both original and aliased)
    if actual_field not in table_config['fields'] and field not in table_config['fields']:
        return {
            'success': False,
            'error': f"Field '{field}' is not allowed for updates in table '{table}'",
            'table': table,
            'field': field
        }

    # Use the actual field name for database operations
    db_field = actual_field

    schema = table_config.get('schema', 'landscape')
    pk_field = table_config.get('pk_field')
    fk_field = table_config.get('fk_field')

    # Use the appropriate field for lookup
    lookup_field = fk_field if fk_field else pk_field

    # Get current value before update (use db_field for actual query)
    old_value = get_current_value(table, db_field, project_id)

    # Cast the new value
    typed_value = cast_value(db_field, value)

    try:
        with connection.cursor() as cursor:
            # Check if record exists
            check_query = f"""
                SELECT COUNT(*)
                FROM {schema}.{table}
                WHERE {lookup_field} = %s
            """
            cursor.execute(check_query, [project_id])
            exists = cursor.fetchone()[0] > 0

            if not exists and fk_field:
                # Need to create a new record for related tables
                insert_query = f"""
                    INSERT INTO {schema}.{table} ({fk_field}, {db_field}, updated_at)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(insert_query, [project_id, typed_value, timezone.now()])
                logger.info(f"Created new {table} record for project {project_id}")
            elif exists:
                # Update existing record
                update_query = f"""
                    UPDATE {schema}.{table}
                    SET {db_field} = %s, updated_at = %s
                    WHERE {lookup_field} = %s
                """
                cursor.execute(update_query, [typed_value, timezone.now(), project_id])
            else:
                return {
                    'success': False,
                    'error': f"No record found for project_id {project_id} in table {table}",
                    'table': table,
                    'field': field
                }

        # Log to activity feed
        _log_field_update_activity(
            project_id=project_id,
            table=table,
            field=field,
            old_value=old_value,
            new_value=typed_value,
            reason=reason
        )

        return {
            'success': True,
            'table': table,
            'field': field,
            'old_value': str(old_value) if old_value is not None else None,
            'new_value': str(typed_value) if typed_value is not None else None,
            'reason': reason
        }

    except Exception as e:
        logger.error(f"Database error updating {table}.{field}: {e}")
        return {
            'success': False,
            'error': str(e),
            'table': table,
            'field': field
        }


def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    project_id: int
) -> Dict[str, Any]:
    """
    Execute a tool call from Claude.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        project_id: The project ID to operate on

    Returns:
        Dict with execution results
    """
    if tool_name == 'update_project_field':
        result = update_single_field(
            table=tool_input.get('table', ''),
            field=tool_input.get('field', ''),
            value=tool_input.get('value', ''),
            reason=tool_input.get('reason', ''),
            project_id=project_id
        )
        # Wrap single update in updates list for consistency
        if result.get('success'):
            result['updates'] = [result.copy()]
        return result

    elif tool_name == 'bulk_update_fields':
        updates_input = tool_input.get('updates', [])
        results = []
        all_success = True

        for update in updates_input:
            result = update_single_field(
                table=update.get('table', ''),
                field=update.get('field', ''),
                value=update.get('value', ''),
                reason=update.get('reason', ''),
                project_id=project_id
            )
            results.append(result)
            if not result.get('success'):
                all_success = False

        return {
            'success': all_success,
            'updates': [r for r in results if r.get('success')],
            'errors': [r for r in results if not r.get('success')]
        }

    elif tool_name == 'get_project_fields':
        fields_input = tool_input.get('fields', [])
        values = {}

        for field_spec in fields_input:
            table = field_spec.get('table', '')
            field = field_spec.get('field', '')
            key = f"{table}.{field}"

            # Validate access
            table_config = ALLOWED_UPDATES.get(table)
            if table_config and field in table_config['fields']:
                value = get_current_value(table, field, project_id)
                values[key] = str(value) if value is not None else None
            else:
                values[key] = f"Access denied for {key}"

        return {
            'success': True,
            'values': values
        }

    else:
        return {
            'success': False,
            'error': f"Unknown tool: {tool_name}"
        }


def _log_field_update_activity(
    project_id: int,
    table: str,
    field: str,
    old_value: Any,
    new_value: Any,
    reason: str
) -> None:
    """Log a field update to the activity feed."""
    try:
        from .models import ActivityItem

        # Format the title
        field_display = field.replace('_', ' ').title()

        # Determine status based on whether this is setting or changing
        if old_value is None:
            title = f"Set {field_display}"
            summary = f"Set {field_display} to {new_value}"
        else:
            title = f"Updated {field_display}"
            summary = f"Changed {field_display} from {old_value} to {new_value}"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=title,
            summary=summary,
            status='complete',
            confidence='high',
            details={
                'table': table,
                'field': field,
                'old_value': str(old_value) if old_value is not None else None,
                'new_value': str(new_value) if new_value is not None else None,
                'reason': reason
            },
            highlight_fields=[field],
            source_type='landscaper_ai',
            source_id=f"tool_update_{table}_{field}"
        )
        logger.info(f"Logged activity for {table}.{field} update")

    except Exception as e:
        logger.error(f"Failed to log activity for field update: {e}")


# Convenience wrapper for use in ai_handler
def create_tool_executor(project_id: int):
    """Create a tool executor function bound to a specific project."""
    def executor(tool_name: str, tool_input: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        # Use project_id from kwargs if provided, otherwise use bound value
        pid = kwargs.get('project_id', project_id)
        return execute_tool(tool_name, tool_input, pid)
    return executor
