"""The STANDARD REPORTS catalogue — what this project type can produce.

Gregg, 2026-09-11: *"in the artifacts panel, it might make sense to have the base
artifacts listed (not just the pinned or recent artifacts). the user can then have
LS make their own versions (like with quickbooks reports that allow you to change
column headings, periods, groupings, etc)."* Chosen as 5a on 2026-09-13.

It is the saved-views pattern — built-in views that cannot be deleted, plus the
user's own beside them — which Linear, Notion, Airtable, Salesforce and QuickBooks
all ship. Two things it fixes:

  * A surface you have never opened is invisible. Pinned and Recent can only show
    what already exists, so the panel could never tell you what the app is able
    to produce. On 2026-09-14 Gregg logged in, saw three-week-old cards and
    reasonably concluded nothing had been built.
  * There was nowhere for a variant to belong. The cash-flow work already saves a
    filtered run beside the standard one rather than over it; this is where that
    pairing becomes visible.

The catalogue is NOT a second list of tools. Each entry names a tool that already
exists and is already gated by project type in ``tool_registry``; this module adds
only the human labels and the order a person would look for them in.
"""

from __future__ import annotations

from typing import Any, Dict, List

# One entry per standard surface. ``kind`` is the vocabulary from
# D-2026-09-13-SURFACES: a register is where numbers are set, a report is what
# the model produced, and a workspace is neither.
CATALOG: List[Dict[str, str]] = [
    {
        'tool': 'get_pricing_register',
        'label': 'Pricing',
        'kind': 'register',
        'blurb': 'Set prices per product, how they escalate, and the date they are stated in.',
    },
    {
        'tool': 'get_budget_schedule',
        'label': 'Development Budget',
        'kind': 'register',
        'blurb': 'Cost lines, their quantities and rates, and when each one spends.',
    },
    {
        'tool': 'open_parcels',
        'label': 'Parcels',
        'kind': 'workspace',
        'blurb': 'The parcel table — areas, phases, products, units and acres.',
    },
    {
        'tool': 'get_sales_schedule',
        'label': 'Sales Schedule',
        'kind': 'report',
        'blurb': 'What each parcel is expected to bring and when.',
    },
    {
        'tool': 'get_cashflow_schedule',
        'label': 'Cash Flow',
        'kind': 'report',
        'blurb': 'Money in and out by period, with NPV and IRR. Can be run for one area or phase.',
    },
    {
        'tool': 'get_capitalization_schedule',
        'label': 'Equity',
        'kind': 'report',
        'blurb': 'The capital stack and how distributions divide between LP and GP.',
    },
    {
        'tool': 'get_rent_roll_schedule',
        'label': 'Rent Roll',
        'kind': 'register',
        'blurb': 'Unit-by-unit rents, occupancy and renovation status.',
    },
    {
        'tool': 'get_operating_statement',
        'label': 'Operating Statement',
        'kind': 'report',
        'blurb': 'Revenue, operating expenses and net operating income.',
    },
    {
        'tool': 'review_budget_variance',
        'label': 'Budget Variance',
        'kind': 'report',
        'blurb': 'Where the budget has moved against itself.',
    },
]


def catalog_for_project(project_id: int) -> List[Dict[str, Any]]:
    """The standard surfaces this project can produce, each with the artifact
    that already exists for it, if any.

    Gating is NOT decided here. ``tool_registry`` already knows which tools a
    project type may use — a land deal has no rent roll, a multifamily deal has no
    lot rate card — and a second copy of that judgement is exactly the drift this
    codebase keeps paying for. This asks it.
    """
    from django.db import connection

    from apps.landscaper.tool_registry import (
        PROPERTY_TYPE_TOOL_MAP,
        _normalize_project_type,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT project_type_code FROM landscape.tbl_project WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
    type_key = _normalize_project_type(row[0] if row else None)
    # An unrecognised or missing type shows the whole catalogue rather than an
    # empty panel: a person can see what exists and ask, which is recoverable.
    # Silently showing nothing is not.
    allowed = set(PROPERTY_TYPE_TOOL_MAP.get(type_key) or []) or None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT tool_name, MAX(artifact_id)
            FROM landscape.tbl_artifact
            WHERE project_id = %s AND tool_name IS NOT NULL
            GROUP BY tool_name
            """,
            [project_id],
        )
        existing = {row[0]: row[1] for row in cursor.fetchall()}

    out: List[Dict[str, Any]] = []
    for entry in CATALOG:
        if allowed is not None and entry['tool'] not in allowed:
            continue
        out.append({
            **entry,
            # Present means there is a card to open; absent means asking for it
            # builds one. Both are useful and the panel says which.
            'artifact_id': existing.get(entry['tool']),
        })
    return out
