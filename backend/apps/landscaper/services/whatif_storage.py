"""
What-If Shadow Context Storage Service.

Persists shadow contexts (active what-if sessions) as JSON in tbl_scenario_log.
Each chat thread has at most one active_shadow row at a time.
"""
import json
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from PostgreSQL."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def save_shadow_to_db(
    thread_id: str,
    project_id: int,
    scenario_data: Dict[str, Any],
    user_id: Optional[int] = None,
) -> int:
    """
    Upsert the active shadow for a thread.

    If an active_shadow already exists for this thread, update it.
    Otherwise, create a new row.

    Returns the scenario_log_id.
    """
    data_json = json.dumps(scenario_data, cls=DecimalEncoder)
    now = timezone.now()

    with connection.cursor() as cursor:
        # Check for existing active shadow
        cursor.execute("""
            SELECT scenario_log_id
            FROM landscape.tbl_scenario_log
            WHERE thread_id = %s AND status = 'active_shadow'
            LIMIT 1
        """, [thread_id])
        row = cursor.fetchone()

        if row:
            # Update existing
            cursor.execute("""
                UPDATE landscape.tbl_scenario_log
                SET scenario_data = %s::jsonb,
                    updated_at = %s
                WHERE scenario_log_id = %s
            """, [data_json, now, row[0]])
            return row[0]
        else:
            # Insert new
            cursor.execute("""
                INSERT INTO landscape.tbl_scenario_log
                    (project_id, thread_id, user_id, status, scenario_data,
                     source, created_at, updated_at)
                VALUES (%s, %s, %s, 'active_shadow', %s::jsonb,
                        'landscaper_chat', %s, %s)
                RETURNING scenario_log_id
            """, [project_id, thread_id, user_id, data_json, now, now])
            return cursor.fetchone()[0]


def load_shadow_from_db(thread_id: str) -> Optional[Dict[str, Any]]:
    """
    Load the active shadow context for a thread.

    Returns the scenario_data dict, or None if no active shadow exists.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT scenario_log_id, scenario_data, project_id
            FROM landscape.tbl_scenario_log
            WHERE thread_id = %s AND status = 'active_shadow'
            ORDER BY updated_at DESC
            LIMIT 1
        """, [thread_id])
        row = cursor.fetchone()

    if not row:
        return None

    data = row[1] if isinstance(row[1], dict) else json.loads(row[1])
    data['_scenario_log_id'] = row[0]
    data['_project_id'] = row[2]
    return data


def clear_shadow(thread_id: str, new_status: str = 'explored') -> bool:
    """
    Mark the active shadow as explored (or another terminal status).

    Returns True if a shadow was found and updated.
    """
    if new_status not in ('explored', 'archived'):
        raise ValueError(f"Invalid terminal status: {new_status}")

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.tbl_scenario_log
            SET status = %s, updated_at = %s
            WHERE thread_id = %s AND status = 'active_shadow'
        """, [new_status, timezone.now(), thread_id])
        return cursor.rowcount > 0


def mark_saved(
    scenario_log_id: int,
    scenario_name: str,
    description: Optional[str] = None,
    tags: Optional[list] = None,
) -> bool:
    """
    Promote an active shadow to a saved named scenario.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.tbl_scenario_log
            SET status = 'saved',
                scenario_name = %s,
                description = %s,
                tags = %s,
                updated_at = %s
            WHERE scenario_log_id = %s
        """, [scenario_name, description, tags, timezone.now(), scenario_log_id])
        return cursor.rowcount > 0


def mark_committed(
    scenario_log_id: int,
    committed_by: Optional[int] = None,
) -> bool:
    """
    Mark a scenario as committed (overrides written to DB).
    """
    now = timezone.now()
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.tbl_scenario_log
            SET status = 'committed',
                committed_at = %s,
                committed_by = %s,
                updated_at = %s
            WHERE scenario_log_id = %s
        """, [now, committed_by, now, scenario_log_id])
        return cursor.rowcount > 0
