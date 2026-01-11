"""
Primary measure synchronization helpers.

Keeps tbl_project.primary_* aligned with legacy module-specific fields
without changing existing schema usage.
"""

from typing import Any, Dict, Optional

from django.db import connection


PRIMARY_COUNT_TYPES = {'units', 'lots', 'suites', 'keys', 'pads', 'rooms', 'other'}
PRIMARY_AREA_TYPES = {'rentable_sf', 'gross_sf', 'net_sf', 'gross_acres', 'net_acres', 'other'}


def sync_primary_measure_on_legacy_update(
    project_id: int,
    table: str,
    column: str,
    value: Any,
    cursor=None
) -> None:
    """
    Write-through sync from legacy fields to tbl_project.primary_*.

    This intentionally does NOT update legacy fields when primary_* changes.
    """
    if value is None:
        return

    def _get_project_type_code(cur) -> Optional[str]:
        cur.execute(
            "SELECT project_type_code FROM landscape.tbl_project WHERE project_id = %s",
            [project_id]
        )
        row = cur.fetchone()
        return row[0] if row else None

    def _apply_updates(cur, updates: Dict[str, Any]) -> None:
        if not updates:
            return
        set_clause = ", ".join([f"{key} = %s" for key in updates.keys()])
        params = list(updates.values()) + [project_id]
        cur.execute(
            f"UPDATE landscape.tbl_project SET {set_clause}, updated_at = NOW() WHERE project_id = %s",
            params
        )

    def _sync(cur) -> None:
        project_type_code = _get_project_type_code(cur)
        updates: Dict[str, Any] = {}

        if table == 'tbl_multifamily_property' and column == 'total_units':
            updates['primary_count'] = value
            updates['primary_count_type'] = 'units'

        if table == 'tbl_project':
            if column == 'total_units':
                updates['primary_count'] = value
                updates['primary_count_type'] = 'units'
            if column == 'acres_gross' and project_type_code == 'LAND':
                updates['primary_area'] = value
                updates['primary_area_type'] = 'gross_acres'

        if table == 'tbl_cre_property':
            if column == 'rentable_sf':
                updates['primary_area'] = value
                updates['primary_area_type'] = 'rentable_sf'
            if column == 'number_of_units':
                updates['primary_count'] = value
                updates['primary_count_type'] = 'suites'

        _apply_updates(cur, updates)

    if cursor is not None:
        _sync(cursor)
    else:
        with connection.cursor() as cur:
            _sync(cur)
