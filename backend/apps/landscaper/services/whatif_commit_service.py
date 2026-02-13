"""
What-If Commit Service.

Promotes shadow overrides to actual DB values (commit) and restores
original values (undo). Both operations use transaction.atomic() for
all-or-nothing semantics.

Key safety features:
- COMMIT_ALLOWED_TABLES whitelist restricts which tables can be written to
- ASSUMPTION_TABLE_MAP routes assumption fields to the correct table/column
- Undo guard: before restoring, verifies the current DB value matches the
  committed override value. If someone changed it manually, undo is blocked.
"""
import logging
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from django.db import connection, transaction
from django.utils import timezone

from . import whatif_storage
from .whatif_engine import ShadowContext, Override

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Table routing for commits
# ---------------------------------------------------------------------------

# Tables that can be written to by the commit service.
# Maps table_name → { pk_field, fk_field (optional), schema }
COMMIT_ALLOWED_TABLES = {
    'tbl_project': {
        'pk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_parcel': {
        'pk_field': 'parcel_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_phase': {
        'pk_field': 'phase_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_operating_expenses': {
        'pk_field': 'opex_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_dcf_analysis': {
        'pk_field': 'dcf_analysis_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_vacancy_assumption': {
        'pk_field': 'vacancy_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_revenue_rent': {
        'pk_field': 'rent_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_revenue_other': {
        'pk_field': 'other_income_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
    'tbl_property_acquisition': {
        'pk_field': 'acquisition_id',
        'fk_field': 'project_id',
        'schema': 'landscape',
    },
}

# Assumption fields that live on tbl_dcf_analysis (not on tbl_project)
DCF_FIELDS = {
    'discount_rate', 'selling_costs_pct', 'hold_period_years',
    'exit_cap_rate', 'bulk_sale_period', 'bulk_sale_discount_pct',
    'sensitivity_interval', 'going_in_cap_rate', 'vacancy_rate',
    'stabilized_vacancy', 'credit_loss', 'management_fee_pct',
    'reserves_per_unit',
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def commit_overrides(
    shadow: ShadowContext,
    fields: Optional[List[str]] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Write override values to the actual database.

    Args:
        shadow: The active ShadowContext with overrides and baseline.
        fields: Optional list of override keys to commit. If None, commits all.
        user_id: Optional user ID for audit trail.

    Returns:
        Dict with success, committed fields, and any remaining shadow state.
    """
    if not shadow.overrides:
        return {'success': False, 'error': 'No overrides to commit.'}

    # Determine which overrides to commit
    if fields:
        to_commit = {k: v for k, v in shadow.overrides.items() if k in fields}
        remaining = {k: v for k, v in shadow.overrides.items() if k not in fields}
    else:
        to_commit = dict(shadow.overrides)
        remaining = {}

    if not to_commit:
        return {'success': False, 'error': f'None of the specified fields found in overrides: {fields}'}

    committed_fields = []
    errors = []

    try:
        with transaction.atomic():
            for key, override in to_commit.items():
                result = _write_single_override(shadow.project_id, override)
                if result['success']:
                    committed_fields.append({
                        'key': key,
                        'field': override.field,
                        'table': override.table,
                        'old_value': override.original_value,
                        'new_value': override.override_value,
                    })
                else:
                    errors.append({
                        'key': key,
                        'field': override.field,
                        'error': result['error'],
                    })

            # If any errors, the whole transaction rolls back
            if errors:
                raise _CommitRollbackError(errors)

    except _CommitRollbackError:
        return {
            'success': False,
            'error': 'Some overrides could not be committed. All changes rolled back.',
            'errors': errors,
        }
    except Exception as e:
        logger.error(f"commit_overrides failed: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}

    # Mark scenario as committed (or update shadow if partial)
    scenario_log_id = shadow.scenario_log_id
    if remaining:
        # Partial commit: update shadow to only contain remaining overrides
        shadow.overrides = remaining
        whatif_storage.save_shadow_to_db(
            thread_id=shadow.thread_id,
            project_id=shadow.project_id,
            scenario_data=shadow.to_scenario_data(),
        )
    else:
        # Full commit: mark the scenario as committed
        if scenario_log_id:
            whatif_storage.mark_committed(scenario_log_id, committed_by=user_id)

    return {
        'success': True,
        'committed': committed_fields,
        'committed_count': len(committed_fields),
        'remaining_overrides': len(remaining),
        'message': (
            f'Committed {len(committed_fields)} override{"s" if len(committed_fields) != 1 else ""} to database.'
            + (f' {len(remaining)} override{"s" if len(remaining) != 1 else ""} still in shadow.' if remaining else '')
        ),
    }


def undo_commit(
    scenario_log_id: int,
    project_id: int,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Undo a previously committed scenario by restoring original values.

    Before restoring each field, verifies the current DB value matches the
    committed override value. If someone changed it manually since the commit,
    undo is blocked for that field with an explanation.

    Args:
        scenario_log_id: The scenario to undo.
        project_id: Project scope.
        user_id: Optional user ID for audit.

    Returns:
        Dict with success, restored fields, and any blocked fields.
    """
    from ..tools.scenario_tools import _load_scenario_by_id

    scenario = _load_scenario_by_id(scenario_log_id, project_id)
    if not scenario:
        return {'success': False, 'error': f'Scenario {scenario_log_id} not found.'}

    if scenario['status'] != 'committed':
        return {
            'success': False,
            'error': f'Cannot undo scenario with status "{scenario["status"]}". Only committed scenarios can be undone.',
        }

    overrides = scenario['scenario_data'].get('overrides', {})
    if not overrides:
        return {'success': False, 'error': 'Scenario has no overrides to undo.'}

    restored = []
    blocked = []

    try:
        with transaction.atomic():
            for key, ov_data in overrides.items():
                field = ov_data.get('field', '')
                table = ov_data.get('table', '')
                record_id = ov_data.get('record_id')
                original_value = ov_data.get('original_value')
                override_value = ov_data.get('override_value')

                # Guard check: verify current DB value matches what we committed
                current_value = _read_current_value(project_id, table, field, record_id)

                if not _values_match(current_value, override_value):
                    blocked.append({
                        'key': key,
                        'field': field,
                        'table': table,
                        'expected': override_value,
                        'actual': current_value,
                        'reason': 'Value was modified after commit. Manual intervention required.',
                    })
                    continue

                # Restore original value
                result = _write_value_to_db(project_id, table, field, original_value, record_id)
                if result['success']:
                    restored.append({
                        'key': key,
                        'field': field,
                        'restored_to': original_value,
                    })
                else:
                    blocked.append({
                        'key': key,
                        'field': field,
                        'reason': result.get('error', 'Write failed'),
                    })

            # If nothing was restored, don't change status
            if not restored:
                raise _CommitRollbackError(blocked)

    except _CommitRollbackError:
        if not restored:
            return {
                'success': False,
                'error': 'No fields could be restored. All blocked by guard checks.',
                'blocked': blocked,
            }

    # Mark scenario as undone
    now = timezone.now()
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.tbl_scenario_log
            SET status = 'undone', updated_at = %s
            WHERE scenario_log_id = %s
        """, [now, scenario_log_id])

    return {
        'success': True,
        'restored': restored,
        'restored_count': len(restored),
        'blocked': blocked,
        'blocked_count': len(blocked),
        'message': (
            f'Restored {len(restored)} field{"s" if len(restored) != 1 else ""}.'
            + (f' {len(blocked)} field{"s" if len(blocked) != 1 else ""} blocked by guard check.' if blocked else '')
        ),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

class _CommitRollbackError(Exception):
    """Raised to trigger transaction rollback during commit/undo."""
    def __init__(self, details):
        self.details = details
        super().__init__(str(details))


def _write_single_override(project_id: int, override: Override) -> Dict[str, Any]:
    """Write a single override value to the database."""
    table = override.table
    field = override.field
    new_value = override.override_value
    record_id = override.record_id

    return _write_value_to_db(project_id, table, field, new_value, record_id)


def _write_value_to_db(
    project_id: int,
    table: str,
    field: str,
    value: Any,
    record_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Write a single field value to the database."""
    # Validate table
    table_config = COMMIT_ALLOWED_TABLES.get(table)
    if not table_config:
        return {'success': False, 'error': f'Table "{table}" not in commit whitelist.'}

    schema = table_config['schema']
    pk_field = table_config['pk_field']
    fk_field = table_config.get('fk_field')

    # Cast value
    typed_value = _cast_value(field, value)

    try:
        with connection.cursor() as cursor:
            if record_id and fk_field:
                # Row-scoped update (e.g., specific parcel)
                cursor.execute(f"""
                    UPDATE {schema}.{table}
                    SET {field} = %s, updated_at = NOW()
                    WHERE {pk_field} = %s AND {fk_field} = %s
                """, [typed_value, record_id, project_id])
            elif fk_field:
                # Project-scoped update on FK table (e.g., vacancy assumption for project)
                cursor.execute(f"""
                    UPDATE {schema}.{table}
                    SET {field} = %s, updated_at = NOW()
                    WHERE {fk_field} = %s
                """, [typed_value, project_id])
            else:
                # Direct PK update (tbl_project)
                cursor.execute(f"""
                    UPDATE {schema}.{table}
                    SET {field} = %s, updated_at = NOW()
                    WHERE {pk_field} = %s
                """, [typed_value, project_id])

            if cursor.rowcount == 0:
                return {'success': False, 'error': f'No row found in {table} for project {project_id}'}

        return {'success': True}

    except Exception as e:
        logger.error(f"_write_value_to_db failed: {table}.{field}: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


def _read_current_value(
    project_id: int,
    table: str,
    field: str,
    record_id: Optional[str] = None,
) -> Any:
    """Read the current value of a field from the database."""
    table_config = COMMIT_ALLOWED_TABLES.get(table)
    if not table_config:
        return None

    schema = table_config['schema']
    pk_field = table_config['pk_field']
    fk_field = table_config.get('fk_field')

    try:
        with connection.cursor() as cursor:
            if record_id and fk_field:
                cursor.execute(f"""
                    SELECT {field} FROM {schema}.{table}
                    WHERE {pk_field} = %s AND {fk_field} = %s
                    LIMIT 1
                """, [record_id, project_id])
            elif fk_field:
                cursor.execute(f"""
                    SELECT {field} FROM {schema}.{table}
                    WHERE {fk_field} = %s
                    LIMIT 1
                """, [project_id])
            else:
                cursor.execute(f"""
                    SELECT {field} FROM {schema}.{table}
                    WHERE {pk_field} = %s
                    LIMIT 1
                """, [project_id])

            row = cursor.fetchone()
            return row[0] if row else None

    except Exception as e:
        logger.warning(f"_read_current_value failed: {table}.{field}: {e}")
        return None


def _values_match(current: Any, expected: Any) -> bool:
    """
    Compare two values for equality, handling type coercion.

    Needed because DB may return Decimal while override stores float,
    or vice versa.
    """
    if current is None and expected is None:
        return True
    if current is None or expected is None:
        return False

    # Normalize both to float for numeric comparison
    try:
        c = float(current)
        e = float(expected)
        return abs(c - e) < 1e-8
    except (ValueError, TypeError):
        pass

    # String comparison
    return str(current).strip() == str(expected).strip()


def _cast_value(field: str, value: Any) -> Any:
    """Cast a value to the appropriate database type."""
    if value is None:
        return None

    # Try to infer from field name
    if any(field.endswith(suffix) for suffix in ('_pct', '_rate', '_psf', '_amount', '_price', '_value')):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            pass

    if any(field.endswith(suffix) for suffix in ('_years', '_count', '_period', '_months')):
        try:
            return int(float(value))
        except (ValueError, TypeError):
            pass

    if isinstance(value, (int, float, Decimal)):
        return value

    if isinstance(value, str):
        # Try numeric
        try:
            if '.' in value:
                return Decimal(value)
            return int(value)
        except (ValueError, InvalidOperation):
            pass
        return value

    return value
