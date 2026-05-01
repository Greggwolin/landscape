"""
F-12 Proforma — server-derived from T-12 + project growth assumptions.

Why this tool exists
--------------------
Live-test session 2026-04-30 (Cowork chat hx) on Chadron Terrace produced an
LLM-composed F-12 with five composition bugs:
  1. Expense detail collapsed (Electricity/Gas/Water/Trash → single "Utilities")
  2. Phantom "Pest Control" line that doesn't exist in T-12
  3. Unit-mix bucket counts re-aggregated wrong
  4. Blank commercial annual line
  5. Phase 5 OS guard's structural rules pass (single table, 3-col shape, no
     property metadata) but composition fidelity to T-12 is not enforced.

User directive: "format should be exactly the same, only the numbers should
change." This tool implements that contract by composing the F-12 server-side
from operations data + growth rates, so the LLM never touches the table body.

Architecture
------------
1. Pull T-12 operations data via the same view that powers `get_operating_statement`
   (apps.financial.views_operations.operations_data).
2. Pull income/expense growth rates from `core_fin_growth_rate_sets` /
   `_steps` (the same source the income approach uses; see
   apps.financial.services.income_approach_service.IncomeApproachService.get_growth_rates).
   Defaults to 3.0% / 3.0% if no project-level set is on file.
3. Apply growth per line:
     - GPR & other income            → × (1 + income_growth_rate)
     - Physical Vacancy / Credit Loss / Concessions
                                     → percentages held constant; values
                                       recompute from grown GPR.
     - Base operating expenses       → × (1 + expense_growth_rate)
     - Management Fee (% of EGI)     → percentage held constant; recomputes
                                       from grown EGI.
     - Replacement Reserves per-unit → × (1 + expense_growth_rate)
                                       (decision recorded in chat hx; reserves
                                       escalate with other expenses.)
4. Compose a single-table artifact schema that mirrors the canonical T-12
   layout: section dividers as label-only rows, line/annual/per_unit columns,
   subtotals (EGI, Total OpEx) and grand total (NOI). No top-level section
   blocks (Phase 5 guard rejects those). No property-metadata kv_grid pairs.
5. Persist via `apps.artifacts.services.create_artifact_record` with
   `artifact_subtype='f12_proforma'`. The Phase 5 OS guard's existing
   structural rules still validate the output.

Tool advertised as `get_proforma`. The model calls it instead of composing
F-12 with `create_artifact`. BASE_INSTRUCTIONS and the `artifact_subtype`
schema description point the model at this tool for any F-12 request.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Dict, List

from django.db import connection
from django.test import RequestFactory

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Defaults (mirror IncomeApproachService.DEFAULTS so behavior is consistent)
# ──────────────────────────────────────────────────────────────────────────────

DEFAULT_INCOME_GROWTH = 0.03
DEFAULT_EXPENSE_GROWTH = 0.03


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────


def _to_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    if isinstance(v, Decimal):
        return float(v)
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _round_currency(v: float) -> int:
    """Round to whole dollars. Operating statements never show cents."""
    return int(round(v))


def _per_unit(v: float, unit_count: int) -> int:
    if unit_count <= 0:
        return 0
    return int(round(v / unit_count))


def _fmt_pct(rate: float) -> str:
    """Format a rate like 0.097 → '9.7%'. Single-decimal precision matches
    the inline label style on existing T-12 artifacts."""
    return f'{rate * 100:.1f}%'


def _fetch_growth_rates(project_id: int) -> Dict[str, float]:
    """Pull income (revenue) and expense (cost) growth from the project's
    default rate set. Falls back to 3% / 3% defaults.

    Source: `core_fin_growth_rate_sets` joined to `core_fin_growth_rate_steps`,
    same query shape used by IncomeApproachService.get_growth_rates() — kept
    inline here to avoid importing the broader IncomeApproachService (which
    initializes more state than we need).
    """
    income = DEFAULT_INCOME_GROWTH
    expense = DEFAULT_EXPENSE_GROWTH
    income_source = 'default'
    expense_source = 'default'

    with connection.cursor() as cur:
        try:
            cur.execute(
                """
                SELECT s.rate
                FROM landscape.core_fin_growth_rate_steps s
                JOIN landscape.core_fin_growth_rate_sets gs
                  ON gs.set_id = s.set_id
                WHERE gs.project_id = %s
                  AND gs.card_type = 'revenue'
                  AND gs.is_default = TRUE
                ORDER BY s.step_number
                LIMIT 1
                """,
                [project_id],
            )
            row = cur.fetchone()
            if row and row[0] is not None:
                income = _to_float(row[0], DEFAULT_INCOME_GROWTH)
                income_source = 'project'
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('proforma growth: revenue probe failed: %s', exc)

        try:
            cur.execute(
                """
                SELECT s.rate
                FROM landscape.core_fin_growth_rate_steps s
                JOIN landscape.core_fin_growth_rate_sets gs
                  ON gs.set_id = s.set_id
                WHERE gs.project_id = %s
                  AND gs.card_type = 'cost'
                  AND gs.is_default = TRUE
                ORDER BY s.step_number
                LIMIT 1
                """,
                [project_id],
            )
            row = cur.fetchone()
            if row and row[0] is not None:
                expense = _to_float(row[0], DEFAULT_EXPENSE_GROWTH)
                expense_source = 'project'
        except Exception as exc:  # pragma: no cover — defensive
            logger.debug('proforma growth: cost probe failed: %s', exc)

    return {
        'income_growth_rate': income,
        'expense_growth_rate': expense,
        'income_source': income_source,
        'expense_source': expense_source,
    }


def _fetch_project_name(project_id: int) -> str:
    """Project name for the artifact title. Falls back to 'Project {id}'."""
    try:
        with connection.cursor() as cur:
            cur.execute(
                'SELECT project_name FROM landscape.tbl_project WHERE project_id = %s',
                [project_id],
            )
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0])
    except Exception as exc:  # pragma: no cover — defensive
        logger.debug('proforma project_name probe failed: %s', exc)
    return f'Project {project_id}'


def _fetch_operations_data(project_id: int) -> Dict[str, Any]:
    """Call the same view that powers `get_operating_statement`. Returns the
    DRF Response data dict, or a {'error': ...} envelope on failure."""
    try:
        from apps.financial.views_operations import operations_data
    except Exception as exc:  # noqa: BLE001
        logger.exception('proforma: import operations_data failed')
        return {'error': f'failed to import operations view: {exc}'}

    try:
        factory = RequestFactory()
        req = factory.get(f'/api/projects/{int(project_id)}/operations/')
        resp = operations_data(req, int(project_id))
    except Exception as exc:  # noqa: BLE001
        logger.exception('proforma: operations view raised')
        return {'error': f'operations view raised: {exc}'}

    status_code = getattr(resp, 'status_code', 500)
    payload = getattr(resp, 'data', None)
    if status_code != 200 or not isinstance(payload, dict):
        return {'error': f'operations endpoint returned HTTP {status_code}', 'detail': payload}
    return payload


# ──────────────────────────────────────────────────────────────────────────────
# Schema composition
# ──────────────────────────────────────────────────────────────────────────────


def _section_divider_row(row_id: str, label: str) -> Dict[str, Any]:
    """Section divider row — only the `line` cell is populated. Renderer
    detects label-only rows and merges the column header (Annual / $/Unit)
    into the FIRST section divider, leaves subsequent dividers blank."""
    return {
        'id': row_id,
        'cells': {'line': label},
    }


def _line_row(
    row_id: str,
    label: str,
    annual: float,
    unit_count: int,
) -> Dict[str, Any]:
    return {
        'id': row_id,
        'cells': {
            'line': label,
            'annual': _round_currency(annual),
            'per_unit': _per_unit(annual, unit_count),
        },
    }


def _compose_proforma_schema(
    *,
    operations: Dict[str, Any],
    growth: Dict[str, float],
    unit_count: int,
) -> Dict[str, Any]:
    """Build the single-table schema. Mirrors T-12 structure with grown values.

    Row order:
        1. Section divider: "Income"
        2. Gross Potential Rent (income_growth applied)
        3. Less: Physical Vacancy (X.X%)        ← rate held constant, recomputed from grown GPR
        4. Less: Credit Loss (X.X%)             ← rate held constant, recomputed
        5. Less: Concessions (X.X%)             ← rate held constant, recomputed
        6. (Optional) Other Income lines        ← income_growth applied
        7. Effective Gross Income (subtotal)
        8. Section divider: "Operating Expenses"
        9. For each non-mgmt expense parent category:
             - Subsection row (label only)
             - Children, each with expense_growth applied
        10. Subsection: "Management & Reserves"
        11. Management Fee (X.X%)               ← rate held constant, recomputed from grown EGI
        12. Replacement Reserves                 ← reserves_per_unit × expense_growth × unit_count
        13. Total Operating Expenses (subtotal)
        14. Net Operating Income (grand total)

    Subtotal/grand-total status is detected by the renderer from the row
    label (no explicit flag needed — see ArtifactRenderer.detectRowRole).
    """
    income_growth = growth['income_growth_rate']
    expense_growth = growth['expense_growth_rate']

    rental_income = operations.get('rental_income') or {}
    vacancy_deductions = operations.get('vacancy_deductions') or {}
    other_income = operations.get('other_income') or {}
    operating_expenses = operations.get('operating_expenses') or {}
    assumptions = operations.get('assumptions') or {}

    gpr_t12 = _to_float((rental_income.get('section_total') or {}).get('as_is'))
    gpr_grown = gpr_t12 * (1.0 + income_growth)

    physical_vac_pct = _to_float(assumptions.get('physical_vacancy_pct'))
    credit_loss_pct = _to_float(assumptions.get('credit_loss_pct'))
    concessions_pct = _to_float(assumptions.get('concessions_pct'))
    mgmt_fee_pct = _to_float(assumptions.get('management_fee_pct'))
    reserves_per_unit_t12 = _to_float(assumptions.get('reserves_per_unit'))
    reserves_per_unit_grown = reserves_per_unit_t12 * (1.0 + expense_growth)

    rows: List[Dict[str, Any]] = []

    # 1. Income section divider
    rows.append(_section_divider_row('hdr_income', 'Income'))

    # 2. Gross Potential Rent
    rows.append(_line_row('gpr', 'Gross Potential Rent', gpr_grown, unit_count))

    # 3-5. Vacancy deductions — % held constant, values recomputed from grown GPR
    physical_vac_amt = -gpr_grown * physical_vac_pct
    credit_loss_amt = -gpr_grown * credit_loss_pct
    concessions_amt = -gpr_grown * concessions_pct
    rows.append(_line_row(
        'phys_vac',
        f'Less: Physical Vacancy ({_fmt_pct(physical_vac_pct)})',
        physical_vac_amt, unit_count,
    ))
    rows.append(_line_row(
        'credit_loss',
        f'Less: Credit Loss ({_fmt_pct(credit_loss_pct)})',
        credit_loss_amt, unit_count,
    ))
    rows.append(_line_row(
        'concessions',
        f'Less: Concessions ({_fmt_pct(concessions_pct)})',
        concessions_amt, unit_count,
    ))

    # 6. Other income (grown by income rate)
    other_total_grown = 0.0
    for idx, r in enumerate(other_income.get('rows') or []):
        amount_t12 = _to_float((r.get('as_is') or {}).get('total'))
        if amount_t12 == 0:
            continue
        amount_grown = amount_t12 * (1.0 + income_growth)
        other_total_grown += amount_grown
        rows.append(_line_row(
            f"oi_{idx}_{r.get('line_item_key') or 'other'}",
            r.get('label') or 'Other Income',
            amount_grown, unit_count,
        ))

    # 7. EGI subtotal
    egi_grown = gpr_grown + physical_vac_amt + credit_loss_amt + concessions_amt + other_total_grown
    rows.append(_line_row('egi', 'Effective Gross Income', egi_grown, unit_count))

    # 8. Operating Expenses section divider
    rows.append(_section_divider_row('hdr_opex', 'Operating Expenses'))

    # 9. Base expense parents + children. Skip the "Management & Reserves"
    #    parent here — it gets composed explicitly in step 10/11/12 so the
    #    management fee and reserves are recomputed against grown EGI rather
    #    than blindly scaled by expense_growth (which would double-count for
    #    the management-fee % case).
    base_opex_grown_total = 0.0
    for p_idx, parent in enumerate(operating_expenses.get('rows') or []):
        parent_cat = parent.get('parent_category')
        if parent_cat == 'management_reserves':
            continue
        children = parent.get('children') or []
        if not children:
            continue
        # Subsection row (label only). Indexing guards against duplicate
        # parent_category values (rare, but possible if upstream taxonomy drifts).
        rows.append(_section_divider_row(
            f"sub_{p_idx}_{parent_cat or 'misc'}",
            parent.get('label') or 'Other Expenses',
        ))
        for c_idx, child in enumerate(children):
            amount_t12 = _to_float((child.get('as_is') or {}).get('total'))
            amount_grown = amount_t12 * (1.0 + expense_growth)
            base_opex_grown_total += amount_grown
            rows.append(_line_row(
                f"opex_{p_idx}_{c_idx}_{child.get('line_item_key') or 'item'}",
                child.get('label') or 'Expense',
                amount_grown, unit_count,
            ))

    # 10-12. Management & Reserves subsection
    rows.append(_section_divider_row('sub_mgmt_reserves', 'Management & Reserves'))
    mgmt_fee_grown = egi_grown * mgmt_fee_pct
    rows.append(_line_row(
        'mgmt_fee',
        f'Management Fee ({_fmt_pct(mgmt_fee_pct)})',
        mgmt_fee_grown, unit_count,
    ))
    reserves_grown_total = reserves_per_unit_grown * unit_count
    rows.append(_line_row(
        'reserves',
        'Replacement Reserves',
        reserves_grown_total, unit_count,
    ))

    # 13. Total Operating Expenses (subtotal)
    total_opex_grown = base_opex_grown_total + mgmt_fee_grown + reserves_grown_total
    rows.append(_line_row(
        'total_opex', 'Total Operating Expenses', total_opex_grown, unit_count,
    ))

    # 14. Net Operating Income (grand total)
    noi_grown = egi_grown - total_opex_grown
    rows.append(_line_row('noi', 'Net Operating Income', noi_grown, unit_count))

    table_block = {
        'type': 'table',
        'id': 'proforma_tbl',
        'columns': [
            {'key': 'line', 'label': '', 'align': 'left'},
            {'key': 'annual', 'label': 'Annual', 'align': 'right'},
            {'key': 'per_unit', 'label': '$/Unit', 'align': 'right'},
        ],
        'rows': rows,
    }

    return {'blocks': [table_block]}


# ──────────────────────────────────────────────────────────────────────────────
# Tool entry point
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('get_proforma', is_mutation=True)
def handle_get_proforma(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    **kwargs,
) -> Dict[str, Any]:
    """Server-derive an F-12 proforma artifact from T-12 + growth assumptions.

    The model calls this tool for any F-12 / proforma request instead of
    composing the artifact body itself. Composition fidelity to T-12 is
    structural — we use the same line-item set and rebuild values per the
    growth rules described at module top.

    Tool input is optional. Recognized keys:
        - project_id        (int, falls back to dispatcher-injected kwarg)
        - subtype           (str, must be 'f12_proforma' if provided)
        - income_growth     (float, override; default = project's set rate)
        - expense_growth    (float, override; default = project's set rate)

    Returns the standard create_artifact envelope (success, action, artifact_id,
    schema, title, edit_target). Auto-open dispatch fires the same way as for
    create_artifact tool calls.
    """
    from apps.artifacts.services import create_artifact_record

    params: Dict[str, Any] = tool_input if isinstance(tool_input, dict) else {}

    # Resolve project_id (dispatcher kwarg wins, params is fallback)
    pid = project_id or params.get('project_id')
    try:
        pid_int = int(pid)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': 'project_id is required for get_proforma',
            'guidance': (
                "F-12 proforma requires a project context. If you're in a "
                "pre-project (unassigned) thread, ask the user which project "
                "to run the proforma against, or guide them through project "
                "creation first."
            ),
        }

    # Validate subtype if explicitly provided. Default = f12_proforma.
    subtype = (params.get('subtype') or 'f12_proforma').strip().lower()
    if subtype != 'f12_proforma':
        return {
            'success': False,
            'error': f'get_proforma supports subtype=f12_proforma only, got {subtype!r}',
            'guidance': (
                'For T-12 (pure historical) call get_operating_statement. '
                'For current_proforma (asking/market rents) the equivalent '
                'server-derived tool has not been built yet — ask the user '
                'whether F-12 proforma satisfies the request.'
            ),
        }

    # 1. Pull T-12 data
    operations = _fetch_operations_data(pid_int)
    if 'error' in operations:
        return {
            'success': False,
            'error': operations['error'],
            'detail': operations.get('detail'),
        }

    unit_count = int(_to_float(
        ((operations.get('property_summary') or {}).get('unit_count')) or 0
    ))
    if unit_count <= 0:
        return {
            'success': False,
            'error': 'project has no unit count on file; cannot compute $/Unit',
            'guidance': (
                'F-12 proforma requires a unit count. Ask the user to set up '
                'the unit mix or upload a rent roll first.'
            ),
        }

    # 2. Growth rates (override > project-level > defaults)
    growth = _fetch_growth_rates(pid_int)
    if isinstance(params.get('income_growth'), (int, float)):
        growth['income_growth_rate'] = float(params['income_growth'])
        growth['income_source'] = 'override'
    if isinstance(params.get('expense_growth'), (int, float)):
        growth['expense_growth_rate'] = float(params['expense_growth'])
        growth['expense_source'] = 'override'

    # 3. Compose schema
    schema = _compose_proforma_schema(
        operations=operations,
        growth=growth,
        unit_count=unit_count,
    )

    # 4. Title — surface growth rates so assumptions are visible on the artifact face
    project_name = _fetch_project_name(pid_int)
    title = (
        f"{project_name} — F-12 Proforma · "
        f"Income +{growth['income_growth_rate'] * 100:.1f}%, "
        f"Expenses +{growth['expense_growth_rate'] * 100:.1f}%"
    )

    # 5. Persist via the artifact service (Phase 5 OS guard runs here)
    try:
        result = create_artifact_record(
            title=title,
            schema=schema,
            edit_target={'modal_name': 'operating_statement'},
            source_pointers=[
                {
                    'path': 'blocks[0]',
                    'table': 'derived',
                    'row_id': f'f12_proforma:{pid_int}',
                },
            ],
            project_id=pid_int,
            thread_id=kwargs.get('thread_id') or (
                (kwargs.get('thread_context') or {}).get('thread_id')
                if isinstance(kwargs.get('thread_context'), dict) else None
            ),
            user_id=kwargs.get('user_id') or kwargs.get('user_email'),
            tool_name='get_proforma',
            params_json={
                'subtype': 'f12_proforma',
                'income_growth_rate': growth['income_growth_rate'],
                'expense_growth_rate': growth['expense_growth_rate'],
                'income_growth_source': growth['income_source'],
                'expense_growth_source': growth['expense_source'],
            },
            artifact_subtype='f12_proforma',
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('get_proforma: create_artifact_record failed')
        return {'success': False, 'error': f'create artifact failed: {exc}'}

    # Pass-through: include growth metadata so the model can reference it in
    # the brief chat reply if it wants ("Used your project's 3% income / 3%
    # expense growth assumptions").
    if isinstance(result, dict) and result.get('success'):
        result['growth_assumptions'] = {
            'income_growth_rate': growth['income_growth_rate'],
            'expense_growth_rate': growth['expense_growth_rate'],
            'income_source': growth['income_source'],
            'expense_source': growth['expense_source'],
        }

    return result
