"""
Master Lease lookup tools for Landscaper.

Universal tools for discovering existing master leases by tenant, operator,
guarantor, property name, or property address. Used by the three-trigger
awareness flow defined in BASE_INSTRUCTIONS:

  Trigger 1 — User explicitly mentions an existing master lease
              ("the master lease that includes A, B, and C")
  Trigger 2 — Tenant / operator / guarantor entity already in DB
  Trigger 3 — Property address or parcel matches existing record

When matches are found, the model surfaces them and asks the three-branch
question (amendment / new replaces old / standalone) before any writes.
"""

import logging
from typing import Any, Dict, List, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


_MAX_RESULTS = 10


def _ml_summary_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Trim a master-lease record to chat-relevant fields."""
    return {
        'master_lease_id': row.get('master_lease_id'),
        'master_lease_name': row.get('master_lease_name'),
        'project_id': row.get('project_id'),
        'project_name': row.get('project_name'),
        'current_lessee_tenant_id': row.get('current_lessee_tenant_id'),
        'current_lessee_name': row.get('current_lessee_name'),
        'operator_id': row.get('operator_id'),
        'operator_name': row.get('operator_name'),
        'original_commencement_date': row.get('original_commencement_date'),
        'current_expiration_date': row.get('current_expiration_date'),
        'current_term_months': row.get('current_term_months'),
        'status': row.get('status'),
        'lineage_type': row.get('lineage_type'),
        'amendment_count': row.get('amendment_count'),
        'cross_default_flag': row.get('cross_default_flag'),
        'cross_collateralized_flag': row.get('cross_collateralized_flag'),
        'property_count': row.get('property_count'),
        'properties': row.get('properties') or [],
    }


def _properties_for_master_lease(ml_id: int) -> List[Dict[str, Any]]:
    """Return the property list for a master lease, with parcel + acquisition info."""
    sql = """
        SELECT
            mlp.master_lease_property_id,
            mlp.parcel_id,
            p.parcel_code,
            p.parcel_name,
            mlp.allocated_rent,
            mlp.allocated_purchase_price,
            mlp.allocated_cap_rate,
            mlp.joined_at,
            mlp.removed_at,
            mlp.snapshot_only,
            mlp.original_acquisition_date,
            mlp.original_acquisition_price
        FROM landscape.tbl_master_lease_property mlp
        LEFT JOIN landscape.tbl_parcel p ON p.parcel_id = mlp.parcel_id
        WHERE mlp.master_lease_id = %s
        ORDER BY mlp.joined_at NULLS LAST, mlp.master_lease_property_id
    """
    with connection.cursor() as cur:
        cur.execute(sql, [ml_id])
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def _run_ml_search(where_clause: str, params: List[Any], limit: int) -> List[Dict[str, Any]]:
    """Core search query — joins tenant + operator and returns ML rows + property counts."""
    sql = f"""
        SELECT
            ml.master_lease_id,
            ml.master_lease_name,
            ml.project_id,
            pr.project_name,
            ml.current_lessee_tenant_id,
            t.tenant_name AS current_lessee_name,
            t.operator_id,
            op.legal_name AS operator_name,
            ml.original_commencement_date,
            ml.current_expiration_date,
            ml.current_term_months,
            ml.status,
            ml.lineage_type,
            ml.amendment_count,
            ml.cross_default_flag,
            ml.cross_collateralized_flag,
            (
                SELECT COUNT(*) FROM landscape.tbl_master_lease_property mlp
                WHERE mlp.master_lease_id = ml.master_lease_id
                  AND mlp.removed_at IS NULL
            ) AS property_count
        FROM landscape.tbl_master_lease ml
        LEFT JOIN landscape.tbl_tenant t ON t.tenant_id = ml.current_lessee_tenant_id
        LEFT JOIN landscape.tbl_operator op ON op.operator_id = t.operator_id
        LEFT JOIN landscape.tbl_project pr ON pr.project_id = ml.project_id
        WHERE {where_clause}
        ORDER BY ml.original_commencement_date DESC NULLS LAST,
                 ml.master_lease_id DESC
        LIMIT %s
    """
    params_with_limit = list(params) + [limit]
    with connection.cursor() as cur:
        cur.execute(sql, params_with_limit)
        cols = [c[0] for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    # Attach property lists
    for row in rows:
        row['properties'] = _properties_for_master_lease(row['master_lease_id'])

    return rows


@register_tool('find_master_lease')
def find_master_lease_tool(
    tool_input: Optional[Dict[str, Any]] = None,
    project_id: Optional[int] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Search existing master leases by tenant, operator, guarantor, property
    name, or property address.

    Use this whenever the user mentions an existing master lease, names
    properties that may already be in the database, or describes a deal
    where the tenant/operator/guarantor entity is potentially already
    tracked. Always check before assuming the deal is brand new.

    Args:
        tool_input: {
            tenant_name: free-text — partial match against tenant_name /
                tenant_legal_name / dba_name
            operator_name: free-text — partial match against operator
                legal_name / dba_name
            guarantor_name: free-text — partial match against tenant
                guarantor_name field
            property_name: free-text — partial match against parcel
                parcel_name (e.g., "Lake City")
            property_address: free-text — partial match against parcel
                parcel_name (which holds the address in current schema)
            parcel_id: int — exact match
            tenant_id: int — exact match
            operator_id: int — exact match
            limit: int (default 10, max 25)
        }
        project_id: ignored — this tool spans projects by design.
        user_id: optional, reserved for future per-user scoping.

    Returns:
        {
            success: bool,
            results: [...],          # master lease summaries with property lists
            count: int,
            search_terms: { ... },   # echo-back of normalized inputs
        }

    Search semantics:
        - All provided filters are combined with AND.
        - Free-text fields use case-insensitive ILIKE with % on both sides.
        - If no filters are provided, returns the empty list (no fishing).
    """
    tool_input = tool_input or kwargs.get('tool_input', {}) or {}

    # Normalize inputs
    tenant_name = (tool_input.get('tenant_name') or '').strip()
    operator_name = (tool_input.get('operator_name') or '').strip()
    guarantor_name = (tool_input.get('guarantor_name') or '').strip()
    property_name = (tool_input.get('property_name') or '').strip()
    property_address = (tool_input.get('property_address') or '').strip()
    parcel_id = tool_input.get('parcel_id')
    tenant_id = tool_input.get('tenant_id')
    operator_id = tool_input.get('operator_id')

    try:
        limit = int(tool_input.get('limit') or _MAX_RESULTS)
    except (TypeError, ValueError):
        limit = _MAX_RESULTS
    limit = max(1, min(limit, 25))

    if not any([tenant_name, operator_name, guarantor_name,
                property_name, property_address,
                parcel_id, tenant_id, operator_id]):
        return {
            'success': True,
            'results': [],
            'count': 0,
            'search_terms': {},
            'note': (
                'No search criteria provided. Pass at least one of '
                'tenant_name, operator_name, guarantor_name, '
                'property_name, property_address, parcel_id, '
                'tenant_id, or operator_id.'
            ),
        }

    where_parts: List[str] = []
    params: List[Any] = []

    if tenant_name:
        where_parts.append(
            "(t.tenant_name ILIKE %s OR t.tenant_legal_name ILIKE %s OR t.dba_name ILIKE %s)"
        )
        like = f"%{tenant_name}%"
        params.extend([like, like, like])

    if operator_name:
        where_parts.append(
            "(op.legal_name ILIKE %s OR op.dba_name ILIKE %s)"
        )
        like = f"%{operator_name}%"
        params.extend([like, like])

    if guarantor_name:
        where_parts.append("t.guarantor_name ILIKE %s")
        params.append(f"%{guarantor_name}%")

    if property_name or property_address:
        # Both currently search the parcel_name column (which holds address-like
        # values in the current schema — e.g., "187 Baya Dr, Lake City FL").
        like = f"%{property_name or property_address}%"
        where_parts.append(
            "EXISTS (SELECT 1 FROM landscape.tbl_master_lease_property mlp2 "
            "JOIN landscape.tbl_parcel p2 ON p2.parcel_id = mlp2.parcel_id "
            "WHERE mlp2.master_lease_id = ml.master_lease_id "
            "AND (p2.parcel_name ILIKE %s OR p2.parcel_code ILIKE %s))"
        )
        params.extend([like, like])

    if parcel_id is not None:
        where_parts.append(
            "EXISTS (SELECT 1 FROM landscape.tbl_master_lease_property mlp3 "
            "WHERE mlp3.master_lease_id = ml.master_lease_id "
            "AND mlp3.parcel_id = %s)"
        )
        params.append(int(parcel_id))

    if tenant_id is not None:
        where_parts.append("ml.current_lessee_tenant_id = %s")
        params.append(int(tenant_id))

    if operator_id is not None:
        where_parts.append("t.operator_id = %s")
        params.append(int(operator_id))

    where_clause = " AND ".join(where_parts)

    try:
        results = _run_ml_search(where_clause, params, limit)
    except Exception as e:
        logger.exception(f"find_master_lease_tool failed: {e}")
        return {
            'success': False,
            'error': f"Master lease lookup failed: {str(e)}",
        }

    return {
        'success': True,
        'results': [_ml_summary_row(r) for r in results],
        'count': len(results),
        'search_terms': {
            'tenant_name': tenant_name or None,
            'operator_name': operator_name or None,
            'guarantor_name': guarantor_name or None,
            'property_name': property_name or None,
            'property_address': property_address or None,
            'parcel_id': parcel_id,
            'tenant_id': tenant_id,
            'operator_id': operator_id,
        },
    }


@register_tool('get_master_lease_detail')
def get_master_lease_detail_tool(
    tool_input: Optional[Dict[str, Any]] = None,
    project_id: Optional[int] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Return the full record for a single master lease, including all
    properties (with snapshot/original-acquisition flags), amendment
    history, and lineage links to prior or replaced master leases.

    Use this after `find_master_lease` returns a hit and the user wants
    to confirm "yes, that one" before deciding amendment vs. new vs.
    standalone. The detail call gives the full context for that decision.

    Args:
        tool_input: { master_lease_id: int (required) }
        project_id: ignored.
        user_id: optional.

    Returns:
        {
            success: bool,
            master_lease: { ... full record incl. properties, amendments, lineage },
        }
    """
    tool_input = tool_input or kwargs.get('tool_input', {}) or {}
    ml_id = tool_input.get('master_lease_id')
    if ml_id is None:
        return {
            'success': False,
            'error': 'master_lease_id is required.',
        }

    try:
        ml_id = int(ml_id)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': 'master_lease_id must be an integer.',
        }

    try:
        with connection.cursor() as cur:
            # Master lease record
            cur.execute("""
                SELECT
                    ml.master_lease_id, ml.master_lease_name,
                    ml.project_id, pr.project_name,
                    ml.lease_id,
                    ml.current_lessee_tenant_id, t.tenant_name AS current_lessee_name,
                    t.operator_id, op.legal_name AS operator_name,
                    ml.original_commencement_date, ml.current_expiration_date,
                    ml.current_term_months,
                    ml.cross_default_flag, ml.cross_collateralized_flag,
                    ml.recovery_structure, ml.status,
                    ml.amendment_count, ml.last_amended_at,
                    ml.lineage_type, ml.replaces_master_lease_id,
                    ml.created_from_doc_ids
                FROM landscape.tbl_master_lease ml
                LEFT JOIN landscape.tbl_tenant t ON t.tenant_id = ml.current_lessee_tenant_id
                LEFT JOIN landscape.tbl_operator op ON op.operator_id = t.operator_id
                LEFT JOIN landscape.tbl_project pr ON pr.project_id = ml.project_id
                WHERE ml.master_lease_id = %s
            """, [ml_id])
            ml_row = cur.fetchone()
            if not ml_row:
                return {
                    'success': False,
                    'error': f'Master lease {ml_id} not found.',
                }
            ml_cols = [c[0] for c in cur.description]
            ml = dict(zip(ml_cols, ml_row))

            # Amendments
            cur.execute("""
                SELECT amendment_id, amendment_number, amendment_date,
                       amendment_type, description,
                       term_change_months, new_expiration_date,
                       recovery_pct
                FROM landscape.tbl_master_lease_amendment
                WHERE master_lease_id = %s
                ORDER BY amendment_number
            """, [ml_id])
            amendment_cols = [c[0] for c in cur.description]
            amendments = [dict(zip(amendment_cols, r)) for r in cur.fetchall()]

            # Single-property leases this ML absorbed
            cur.execute("""
                SELECT lease_id, tenant_name, lease_commencement_date,
                       lease_expiration_date, terminated_at, termination_reason
                FROM landscape.tbl_lease
                WHERE terminated_by_master_lease_id = %s
                ORDER BY lease_id
            """, [ml_id])
            absorbed_cols = [c[0] for c in cur.description]
            absorbed_leases = [dict(zip(absorbed_cols, r)) for r in cur.fetchall()]

        ml['properties'] = _properties_for_master_lease(ml_id)
        ml['amendments'] = amendments
        ml['absorbed_single_property_leases'] = absorbed_leases

        return {
            'success': True,
            'master_lease': ml,
        }

    except Exception as e:
        logger.exception(f"get_master_lease_detail_tool failed: {e}")
        return {
            'success': False,
            'error': f"Master lease detail lookup failed: {str(e)}",
        }
