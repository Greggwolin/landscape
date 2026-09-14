"""Which standard surface a report is a second rendering OF.

D-2026-09-14-SURFACE-ARCH settled option 2a: the view specification becomes the
single definition of a surface, and the report generators become a second
renderer of it (PDF / Excel) rather than a parallel builder. That decision named
nine surfaces and twenty-odd reports and did NOT say which was which, so this
module is the first step of the work: the mapping, written down once, in code,
where a drift shows up as a failing test rather than as two documents disagreeing.

Read `catalog.py` for what a surface IS; this module only says what renders it.

WHAT WAS FOUND WHEN THE MAPPING WAS ACTUALLY DRAWN
--------------------------------------------------
Two things the decision assumed are not true of the code as it stands, and both
are recorded here rather than worked around silently:

* **Seven of the nine surfaces have a view specification. Two do not.**
  Operating Statement and Budget Variance were built with an artifact SCHEMA and
  no specification — see ``os_artifact_builder`` and ``variance_artifact_builder``.
  Their definition is therefore the schema until they earn a specification, and
  ``definition`` below says which one each surface carries. The renderer accepts
  both shapes; that is a bridge, not an endorsement.

* **One surface has no report at all.** Pricing is a register — nobody has ever
  asked for a PDF of it — so its ``reports`` list is empty. Eight surfaces carry
  twelve report codes between them; the remaining nine report codes have no
  surface and keep their own generators, which is what 2a said would happen.
"""

from __future__ import annotations

from typing import Dict, List

# tool name (the key used by catalog.py and tbl_artifact.tool_name)
#   -> which report codes are a second rendering of that same surface
#      and which artefact the surface is DEFINED by.
#
# 'definition' is 'view_spec' where a *_view_spec module builds the surface, and
# 'schema' where the surface has only an artifact schema. Never guess this from
# the surface's name — check the builder.
SURFACES: Dict[str, Dict[str, object]] = {
    'get_pricing_register': {
        'label': 'Pricing',
        'definition': 'view_spec',
        # No report renders the pricing register. A register is where numbers are
        # set; there has never been a PDF of it and inventing one here would be
        # scope, not consolidation.
        'reports': [],
    },
    'get_budget_schedule': {
        'label': 'Development Budget',
        'definition': 'view_spec',
        'reports': ['RPT_15'],
    },
    'open_parcels': {
        'label': 'Parcels',
        'definition': 'view_spec',
        'reports': ['RPT_14'],
    },
    'get_sales_schedule': {
        'label': 'Sales Schedule',
        'definition': 'view_spec',
        'reports': ['RPT_16'],
    },
    'get_cashflow_schedule': {
        'label': 'Cash Flow',
        'definition': 'view_spec',
        # Four report codes over one engine run. RPT_12/17/18/19 all descend from
        # proforma_base and all four carried the IRR defect together, which is
        # the plainest evidence they are one surface rendered four ways.
        'reports': ['RPT_12', 'RPT_17', 'RPT_18', 'RPT_19'],
    },
    'get_capitalization_schedule': {
        'label': 'Equity',
        'definition': 'view_spec',
        'reports': ['RPT_04'],
    },
    'get_rent_roll_schedule': {
        'label': 'Rent Roll',
        'definition': 'view_spec',
        # RPT_07 is a legacy alias the router still answers; it points at the
        # same generator as RPT_07b.
        'reports': ['RPT_07', 'RPT_07a', 'RPT_07b'],
    },
    'get_operating_statement': {
        'label': 'Operating Statement',
        'definition': 'schema',
        'reports': ['RPT_09'],
    },
    'review_budget_variance': {
        'label': 'Budget Variance',
        'definition': 'schema',
        'reports': ['RPT_20'],
    },
}

# Reports with no surface. They keep their own generators until one of them
# earns a specification — 2a's own wording. Listed explicitly rather than
# derived by subtraction so that a new report code added to the router without a
# decision about it fails the test in test_surface_map.py instead of silently
# joining this set.
UNMAPPED_REPORTS: List[str] = [
    'RPT_01',  # Sources & Uses
    'RPT_02',  # Debt Summary
    'RPT_03',  # Loan Budget
    'RPT_05',  # Assumptions Summary
    'RPT_06',  # Project Summary
    'RPT_08',  # Unit Mix Summary
    'RPT_10',  # Direct Cap Summary
    'RPT_11',  # Sales Comparison Grid
    'RPT_13',  # DCF Returns Summary — repointed at the calculation engine
               # separately; it is a results report, not a surface.
]


def surface_for_report(report_code: str) -> str | None:
    """The tool name of the surface this report renders, or None if it has none."""
    for tool, entry in SURFACES.items():
        if report_code in entry['reports']:  # type: ignore[operator]
            return tool
    return None


def reports_for_surface(tool_name: str) -> List[str]:
    """The report codes that are second renderings of this surface."""
    entry = SURFACES.get(tool_name)
    return list(entry['reports']) if entry else []  # type: ignore[arg-type]


def mapped_reports() -> List[str]:
    """Every report code that has a surface, in catalogue order."""
    out: List[str] = []
    for entry in SURFACES.values():
        out.extend(entry['reports'])  # type: ignore[arg-type]
    return out
