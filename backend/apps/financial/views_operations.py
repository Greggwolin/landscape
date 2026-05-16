"""
Operations endpoints — migrated from legacy Next.js routes.

GET  /api/projects/{project_id}/operations/          — unified P&L view
PUT  /api/projects/{project_id}/operations/inputs/   — batch upsert user inputs
PUT  /api/projects/{project_id}/operations/settings/  — toggle value-add, vacancy override, mgmt fee

Tables touched:
  - tbl_project, tbl_project_assumption
  - tbl_multifamily_unit, tbl_multifamily_unit_type
  - tbl_operating_expenses, core_unit_cost_category
  - tbl_operations_user_inputs

Phase 4 / Finding #4 — after a successful operations input save we run the
artifact dependency cascade hook (see apps.artifacts.cascade). The hook is
fail-safe; it never blocks the primary save response.
"""

import logging
import re
from decimal import Decimal
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _build_changed_rows_from_operations_updates(updates):
    """Translate `operations_inputs` PUT body into cascade `changed_rows`.

    Each row is keyed on `tbl_operations_user_inputs` with a composite
    row_id of the form ``"<section>:<line_item_key>"``. Operating-statement
    artifacts whose source_pointers reference that table+row_id will match
    the dependency check.
    """
    rows = []
    if not isinstance(updates, list):
        return rows
    for update in updates:
        if not isinstance(update, dict):
            continue
        section = update.get('section')
        line_item_key = update.get('line_item_key')
        if not section or not line_item_key:
            continue
        rows.append({
            'table': 'tbl_operations_user_inputs',
            'row_id': f'{section}:{line_item_key}',
        })
    return rows


# =============================================================================
# Helpers
# =============================================================================

def _to_float(value, default=0.0):
    """Safely convert a DB value to float."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default=0):
    """Safely convert a DB value to int."""
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_number(value):
    """Return float or None (mirrors TypeScript parseNumber)."""
    if value is None:
        return None
    try:
        num = float(value)
        if not (num == num):  # NaN check
            return None
        return num
    except (TypeError, ValueError):
        return None


def _format_expense_label(label):
    """Convert snake_case expense labels to Title Case."""
    if not label:
        return 'Operating Expense'
    return ' '.join(word.capitalize() for word in label.split('_'))


PARENT_CATEGORY_LABELS = {
    'taxes_insurance': 'Taxes & Insurance',
    'utilities': 'Utilities',
    'repairs_maintenance': 'Repairs & Maintenance',
    'payroll_personnel': 'Payroll & Personnel',
    'administrative': 'Administrative',
    'management': 'Management',
    'other': 'Other Expenses',
    'unclassified': 'Unclassified',
}

CATEGORY_ORDER = [
    'taxes_insurance', 'utilities', 'repairs_maintenance',
    'payroll_personnel', 'administrative', 'management',
    'other', 'unclassified',
]

SCENARIO_PRIORITY_MAP = {
    'T3_ANNUALIZED': 1,
    'T12': 2,
    'T-12': 3,
    'CURRENT_PRO_FORMA': 4,
    'BROKER_PRO_FORMA': 5,
    'MARKET_PRO_FORMA': 6,    # added PU60 — most prescriptive / least directly observable
}


def _derive_parent_category(expense_type, label):
    """Derive parent category from expense type/label text."""
    etype = (expense_type or '').strip().lower()
    text = (label or '').strip().lower()

    if 'tax' in etype or 'tax' in text or 'insurance' in text:
        return 'taxes_insurance'
    if 'utilit' in etype or re.search(r'\b(water|gas|electric|trash|sewer)\b', text):
        return 'utilities'
    if 'repair' in etype or re.search(r'\b(maintenance|turnover|landscap|pest|pool|contract)\b', text):
        return 'repairs_maintenance'
    if 'management' in etype or re.search(r'\b(management|manager)\b', text):
        if re.search(r'\b(payroll|salary|wage|benefit)\b', text):
            return 'payroll_personnel'
        if re.search(r'\b(admin|office|telephone|legal|accounting|professional)\b', text):
            return 'administrative'
        return 'management'
    return 'other'


# =============================================================================
# GET /api/projects/{project_id}/operations/
# =============================================================================

@api_view(['GET'])
def operations_data(request, project_id):
    """
    Unified P&L view — migrated from Next.js legacy route.
    Returns rental income, vacancy deductions, other income, operating expenses,
    and calculated totals.
    """
    try:
        with connection.cursor() as cursor:
            # ── 1. Project metadata ──────────────────────────────────────
            cursor.execute("""
                SELECT project_id, project_name, project_type_code,
                       analysis_type, value_add_enabled, active_opex_discriminator
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            if not row:
                return Response({'error': 'Project not found'}, status=404)

            project = {
                'project_id': row[0],
                'project_name': row[1],
                'project_type_code': row[2],
                'analysis_type': row[3] or 'INVESTMENT',
                'value_add_enabled': bool(row[4]) if row[4] is not None else False,
                'active_opex_discriminator': row[5],
            }

            # ── 2. Vacancy & expense assumptions ─────────────────────────
            cursor.execute("""
                SELECT assumption_key, assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s
                  AND assumption_key IN (
                      'physical_vacancy_pct', 'bad_debt_pct', 'concessions_pct',
                      'management_fee_pct', 'replacement_reserve_pct',
                      'vacancy_override_pct', 'management_fee_source'
                  )
            """, [project_id])

            assumptions = {
                'physical_vacancy_pct': 0.05,
                'bad_debt_pct': 0.02,
                'concessions_pct': 0.01,
                'management_fee_pct': 0.03,
                'replacement_reserve_pct': 300.0,
            }
            management_fee_source_override = None

            for arow in cursor.fetchall():
                key, val = arow[0], arow[1]
                if key == 'management_fee_source':
                    management_fee_source_override = val
                    continue
                try:
                    assumptions[key] = float(val)
                except (TypeError, ValueError):
                    pass

            # ── 3. Unit count & total SF (3-priority fallback) ───────────
            cursor.execute("""
                SELECT total_units, gross_sf
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [project_id])
            prow = cursor.fetchone()
            unit_count = _to_int(prow[0]) if prow else 0
            total_sf = _to_float(prow[1]) if prow else 0.0

            if not unit_count:
                cursor.execute("""
                    SELECT COUNT(*)::int, COALESCE(SUM(square_feet), 0)::numeric
                    FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s
                """, [project_id])
                urow = cursor.fetchone()
                unit_count = _to_int(urow[0])
                if not total_sf:
                    total_sf = _to_float(urow[1])

            if not unit_count:
                cursor.execute("""
                    SELECT
                        COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0),
                        COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(avg_square_feet, 0)), 0)
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                """, [project_id])
                trow = cursor.fetchone()
                unit_count = _to_int(trow[0])
                if not total_sf:
                    total_sf = _to_float(trow[1])

            # ── 4. Available scenarios ───────────────────────────────────
            cursor.execute("""
                SELECT DISTINCT statement_discriminator
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s AND statement_discriminator IS NOT NULL
            """, [project_id])
            available_scenarios = sorted(
                [r[0] for r in cursor.fetchall()],
                key=lambda s: SCENARIO_PRIORITY_MAP.get(s, 10)
            )

            active_disc = project['active_opex_discriminator']
            if active_disc and active_disc in available_scenarios:
                preferred_scenario = active_disc
            else:
                preferred_scenario = available_scenarios[0] if available_scenarios else 'T3_ANNUALIZED'

            # ── 5. Rental income ─────────────────────────────────────────
            cursor.execute("""
                SELECT
                    COALESCE(u.unit_type, 'Unknown') as unit_type,
                    COUNT(*) as unit_count,
                    COALESCE(AVG(u.square_feet), 0) as avg_unit_sf,
                    COALESCE(AVG(u.current_rent), 0) as avg_current_rent,
                    COALESCE(AVG(u.market_rent), 0) as avg_market_rent,
                    SUM(COALESCE(u.current_rent, 0)) * 12 as current_annual_total,
                    SUM(COALESCE(u.market_rent, 0)) * 12 as market_annual_total
                FROM landscape.tbl_multifamily_unit u
                WHERE u.project_id = %s
                GROUP BY u.unit_type
                ORDER BY u.unit_type
            """, [project_id])
            detailed_rows = cursor.fetchall()
            has_detailed_rent_roll = len(detailed_rows) > 0

            calculated_physical_vacancy = None

            if has_detailed_rent_roll:
                rental_income_rows = []
                for r in detailed_rows:
                    ut, uc, avg_sf, avg_cr, avg_mr, cur_ann, mkt_ann = r
                    rental_income_rows.append({
                        'line_item_key': f'rental_{ut}',
                        'label': ut or 'Unit',
                        'unit_count': int(uc),
                        'avg_unit_sf': float(avg_sf),
                        'current_rent': float(avg_cr),
                        'market_rent': float(avg_mr),
                        'current_annual_total': float(cur_ann),
                        'market_annual_total': float(mkt_ann),
                    })

                # Physical vacancy from occupancy_status
                cursor.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE LOWER(occupancy_status) != 'occupied' OR occupancy_status IS NULL),
                        COUNT(*)
                    FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s
                """, [project_id])
                vrow = cursor.fetchone()
                vacant = _to_int(vrow[0])
                total = _to_int(vrow[1])
                calculated_physical_vacancy = vacant / total if total > 0 else 0.0
            else:
                # Fallback: floor plan matrix
                cursor.execute("""
                    SELECT
                        COALESCE(unit_type_code, unit_type_name, 'Unit') as unit_type,
                        COALESCE(unit_count, total_units, 0) as unit_count,
                        COALESCE(avg_square_feet, 0) as avg_unit_sf,
                        COALESCE(market_rent, current_market_rent, 0) as market_rent
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s
                    ORDER BY unit_type_code, unit_type_name
                """, [project_id])
                rental_income_rows = []
                for r in cursor.fetchall():
                    ut, uc, avg_sf, mr = r
                    uc_int = _to_int(uc)
                    mr_float = _to_float(mr)
                    annual = uc_int * mr_float * 12
                    rental_income_rows.append({
                        'line_item_key': f'rental_{ut}',
                        'label': ut or 'Unit',
                        'unit_count': uc_int,
                        'avg_unit_sf': _to_float(avg_sf),
                        'current_rent': mr_float,
                        'market_rent': mr_float,
                        'current_annual_total': annual,
                        'market_annual_total': annual,
                    })

            # Build rental_income section
            current_gpr = sum(r['current_annual_total'] for r in rental_income_rows)
            market_gpr = sum(r['market_annual_total'] for r in rental_income_rows)

            rental_income = {
                'section_type': 'flat',
                'is_readonly': True,
                'has_detailed_rent_roll': has_detailed_rent_roll,
                'rows': [],
                'section_total': {
                    'as_is': current_gpr,
                    'as_is_market': market_gpr,
                    'post_reno': market_gpr,
                },
            }
            for r in rental_income_rows:
                avg_sf = r['avg_unit_sf']
                row_obj = {
                    'line_item_key': r['line_item_key'],
                    'label': r['label'],
                    'level': 0,
                    'is_calculated': False,
                    'is_readonly': True,
                    'as_is': {
                        'count': r['unit_count'],
                        'rate': r['current_rent'],
                        'market_rate': r['market_rent'],
                        'per_sf': r['current_rent'] / avg_sf if avg_sf > 100 else None,
                        'market_per_sf': r['market_rent'] / avg_sf if avg_sf > 100 else None,
                        'total': r['current_annual_total'],
                        'market_total': r['market_annual_total'],
                    },
                    'post_reno': {
                        'count': r['unit_count'],
                        'rate': r['market_rent'],
                        'total': r['market_annual_total'],
                    },
                    'evidence': {},
                }
                rental_income['rows'].append(row_obj)

            # ── 6. Vacancy deductions ────────────────────────────────────
            has_vacancy_override = 'vacancy_override_pct' in assumptions
            physical_vacancy_rate = (
                assumptions.get('vacancy_override_pct', assumptions['physical_vacancy_pct'])
                if has_vacancy_override
                else (calculated_physical_vacancy
                      if calculated_physical_vacancy is not None
                      else assumptions['physical_vacancy_pct'])
            )
            credit_loss_rate = assumptions['bad_debt_pct']
            concessions_rate = assumptions['concessions_pct']

            vacancy_deductions = {
                'section_type': 'flat',
                'has_detailed_rent_roll': has_detailed_rent_roll,
                'calculated_physical_vacancy': calculated_physical_vacancy,
                'rows': [
                    {
                        'line_item_key': 'physical_vacancy',
                        'label': 'Physical Vacancy',
                        'level': 0,
                        'is_calculated': has_detailed_rent_roll and not has_vacancy_override,
                        'is_readonly': has_detailed_rent_roll and not has_vacancy_override,
                        'is_percentage': True,
                        'source': ('user_modified' if has_vacancy_override else 'ingestion') if has_detailed_rent_roll else None,
                        'as_is': {
                            'rate': physical_vacancy_rate,
                            'total': -(current_gpr * physical_vacancy_rate),
                            'market_total': -(market_gpr * physical_vacancy_rate),
                        },
                        'post_reno': {
                            'rate': 0.03,
                            'total': -(market_gpr * 0.03),
                        },
                        'evidence': {},
                    },
                    {
                        'line_item_key': 'credit_loss',
                        'label': 'Credit Loss',
                        'level': 0,
                        'is_calculated': False,
                        'is_readonly': False,
                        'is_percentage': True,
                        'as_is': {
                            'rate': credit_loss_rate,
                            'total': -(current_gpr * credit_loss_rate),
                            'market_total': -(market_gpr * credit_loss_rate),
                        },
                        'post_reno': {
                            'rate': 0.01,
                            'total': -(market_gpr * 0.01),
                        },
                        'evidence': {},
                    },
                    {
                        'line_item_key': 'concessions',
                        'label': 'Concessions',
                        'level': 0,
                        'is_calculated': False,
                        'is_readonly': False,
                        'is_percentage': True,
                        'as_is': {
                            'rate': concessions_rate,
                            'total': -(current_gpr * concessions_rate),
                            'market_total': -(market_gpr * concessions_rate),
                        },
                        'post_reno': {
                            'rate': 0.005,
                            'total': -(market_gpr * 0.005),
                        },
                        'evidence': {},
                    },
                ],
                'section_total': {
                    'as_is': -(current_gpr * (physical_vacancy_rate + credit_loss_rate + concessions_rate)),
                    'as_is_market': -(market_gpr * (physical_vacancy_rate + credit_loss_rate + concessions_rate)),
                    'post_reno': -(market_gpr * 0.045),
                },
            }

            # ── 7. Other income (placeholder) ───────────────────────────
            other_income = {
                'section_type': 'hierarchical',
                'rows': [],
                'section_total': {'as_is': 0, 'post_reno': 0},
            }

            # ── 8. Operating expenses ────────────────────────────────────
            # Helper to compute annual total from a row
            def _get_annual_total(unit_amt, per_sf_amt, annual_amt):
                if unit_amt is not None and unit_amt != 0 and unit_count > 0:
                    return unit_amt * unit_count
                if per_sf_amt is not None and per_sf_amt != 0 and total_sf > 0:
                    return per_sf_amt * total_sf
                if annual_amt is not None and annual_amt != 0:
                    return annual_amt
                return 0.0

            # 8a. CoA-based hierarchy (used when no legacy rows exist)
            cursor.execute("""
                SELECT
                    c.category_id, c.account_number, c.category_name,
                    c.parent_id, c.is_calculated, c.sort_order,
                    oe.opex_id, oe.annual_amount, oe.unit_amount,
                    oe.amount_per_sf, oe.escalation_rate,
                    oe.statement_discriminator, oe.source
                FROM landscape.core_unit_cost_category c
                LEFT JOIN landscape.tbl_operating_expenses oe
                    ON c.category_id = oe.category_id
                    AND oe.project_id = %s
                WHERE c.account_number LIKE '5%%'
                  AND c.is_active = true
                ORDER BY c.account_number
            """, [project_id])
            coa_rows = cursor.fetchall()

            category_map = {}
            for crow in coa_rows:
                cat_id = crow[0]
                unit_amt = _parse_number(crow[8])
                per_sf_amt = _parse_number(crow[9])
                annual_amt = _parse_number(crow[7])
                annual_total = _get_annual_total(unit_amt, per_sf_amt, annual_amt)
                disc = crow[11]

                if cat_id in category_map:
                    existing = category_map[cat_id]
                    if disc and (annual_total or unit_amt or per_sf_amt):
                        existing['evidence'][disc] = {
                            'per_unit': unit_amt,
                            'per_sf': per_sf_amt,
                            'total': annual_total or None,
                        }
                    if existing['as_is']['total'] == 0 and annual_total > 0:
                        existing['as_is']['total'] = annual_total
                        existing['post_reno']['total'] = annual_total
                        existing['as_is']['rate'] = unit_amt
                        existing['post_reno']['rate'] = unit_amt
                    continue

                evidence = {}
                if disc and (annual_total or unit_amt or per_sf_amt):
                    evidence[disc] = {
                        'per_unit': unit_amt,
                        'per_sf': per_sf_amt,
                        'total': annual_total or None,
                    }

                category_map[cat_id] = {
                    'line_item_key': f'opex_{cat_id}',
                    'label': crow[2],
                    'category_id': cat_id,
                    'parent_id': crow[3],
                    'level': 0,
                    'is_calculated': bool(crow[4]),
                    'source': crow[12] or None,
                    'opex_id': int(crow[6]) if crow[6] else None,
                    'as_is': {'rate': unit_amt, 'total': annual_total},
                    'post_reno': {'rate': unit_amt, 'total': annual_total},
                    'evidence': evidence,
                    'children': [],
                    'is_expanded': True,
                }

            # Build parent-child tree
            root_categories = []
            for cat in category_map.values():
                pid = cat.pop('parent_id')
                if not pid:
                    cat['level'] = 0
                    root_categories.append(cat)
                else:
                    parent = category_map.get(pid)
                    if parent:
                        parent['children'].append(cat)

            # Set levels
            def _set_levels(cats, level):
                for c in cats:
                    c['level'] = level
                    if c['children']:
                        _set_levels(c['children'], level + 1)
            _set_levels(root_categories, 0)

            # Flatten to 2 levels
            def _collect_leaves(cat):
                if not cat['children']:
                    return [cat]
                leaves = []
                for child in cat['children']:
                    leaves.extend(_collect_leaves(child))
                return leaves

            def _flatten_to_two_levels(cats):
                result = []
                for root_cat in cats:
                    leaves = [dict(leaf, level=1) for leaf in _collect_leaves(root_cat)]
                    parent_as_is = sum(c['as_is'].get('total', 0) or 0 for c in leaves)
                    parent_post_reno = sum(c['post_reno'].get('total', 0) or 0 for c in leaves)
                    flat_parent = dict(root_cat)
                    flat_parent['level'] = 0
                    flat_parent['as_is'] = {
                        **root_cat['as_is'],
                        'total': parent_as_is,
                        'rate': parent_as_is / unit_count / 12 if unit_count > 0 else None,
                    }
                    flat_parent['post_reno'] = {
                        **root_cat['post_reno'],
                        'total': parent_post_reno,
                        'rate': parent_post_reno / unit_count / 12 if unit_count > 0 else None,
                    }
                    flat_parent['children'] = leaves
                    result.append(flat_parent)
                return result

            flattened_categories = _flatten_to_two_levels(root_categories)

            # Filter empty
            def _filter_empty(cats):
                result = []
                for cat in cats:
                    if cat.get('children'):
                        cat['children'] = _filter_empty(cat['children'])
                        if cat['children']:
                            result.append(cat)
                    elif (cat['as_is'].get('total', 0) or 0) > 0 or cat['as_is'].get('rate') or cat.get('evidence'):
                        result.append(cat)
                return result

            filtered_categories = _filter_empty(flattened_categories)

            # 8b. Legacy opex rows (with parent_category grouping)
            cursor.execute("""
                SELECT
                    opex_id, expense_category, expense_type,
                    annual_amount, unit_amount, amount_per_sf,
                    escalation_rate, statement_discriminator, source,
                    updated_at, category_id,
                    COALESCE(parent_category, 'unclassified') as parent_category
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                  AND NOT (
                      expense_category ILIKE '%%management_fee%%'
                      OR expense_category ILIKE '%%management fee%%'
                      OR COALESCE(category_id, 0) = 310
                  )
                ORDER BY parent_category, expense_category, updated_at DESC
            """, [project_id])
            legacy_opex_rows = cursor.fetchall()

            legacy_rows = []  # Will be populated if legacy data exists
            if legacy_opex_rows:
                # Group rows by key
                groups = {}  # key -> {label, parent_category, rows_by_scenario}
                for lrow in legacy_opex_rows:
                    opex_id, exp_cat, exp_type, ann_amt, unit_amt, per_sf, \
                        esc_rate, disc, source, updated_at, cat_id, parent_cat = lrow

                    raw_parent = (parent_cat or '').strip().lower()
                    derived = raw_parent if (raw_parent and raw_parent != 'unclassified') else _derive_parent_category(exp_type, exp_cat)
                    parent_category = derived or 'unclassified'

                    label = _format_expense_label(exp_cat or exp_type or '')
                    if cat_id:
                        key = f'cat_{cat_id}|{parent_category}'
                    else:
                        key = f'{(exp_cat or "").strip().lower()}|{(exp_type or "").strip().lower()}|{parent_category}'

                    scenario = disc or 'default'
                    ts = updated_at.timestamp() if updated_at else 0

                    if key not in groups:
                        groups[key] = {
                            'label': label,
                            'parent_category': parent_category,
                            'rows_by_scenario': {},
                        }

                    existing_scenario = groups[key]['rows_by_scenario'].get(scenario)
                    if not existing_scenario or ts >= existing_scenario['ts']:
                        groups[key]['rows_by_scenario'][scenario] = {
                            'row': lrow,
                            'ts': ts,
                        }

                scenario_fallback = [preferred_scenario] + available_scenarios + ['default']

                grouped_by_parent = {}
                for gkey, group in groups.items():
                    parent_cat = group['parent_category']
                    if parent_cat not in grouped_by_parent:
                        grouped_by_parent[parent_cat] = []

                    # Pick best scenario
                    selected = None
                    for sc in scenario_fallback:
                        if sc in group['rows_by_scenario']:
                            selected = group['rows_by_scenario'][sc]
                            break
                    if not selected:
                        selected = next(iter(group['rows_by_scenario'].values()), None)
                    if not selected:
                        continue

                    sel_row = selected['row']
                    s_opex_id, s_exp_cat, s_exp_type, s_ann_amt, s_unit_amt, s_per_sf, \
                        s_esc, s_disc, s_source, s_updated, s_cat_id, s_parent = sel_row

                    s_unit_amt_f = _parse_number(s_unit_amt)
                    s_per_sf_f = _parse_number(s_per_sf)
                    s_ann_amt_f = _parse_number(s_ann_amt)
                    annual_amount = _get_annual_total(s_unit_amt_f, s_per_sf_f, s_ann_amt_f)
                    per_unit_amount = s_unit_amt_f if s_unit_amt_f is not None else (annual_amount / unit_count if unit_count > 0 else None)

                    # Build evidence
                    evidence = {}
                    for sc_name, sc_data in group['rows_by_scenario'].items():
                        sc_row = sc_data['row']
                        sc_u = _parse_number(sc_row[4])
                        sc_p = _parse_number(sc_row[5])
                        sc_a = _parse_number(sc_row[3])
                        sc_total = _get_annual_total(sc_u, sc_p, sc_a)
                        sc_per_unit = sc_u if sc_u is not None else (sc_total / unit_count if unit_count > 0 else None)
                        evidence[sc_name] = {
                            'per_unit': sc_per_unit,
                            'per_sf': sc_p,
                            'total': sc_total or None,
                        }

                    grouped_by_parent[parent_cat].append({
                        'opex_id': int(s_opex_id),
                        'line_item_key': f'legacy_opex_{s_opex_id}',
                        'label': group['label'],
                        'level': 1,
                        'is_calculated': False,
                        'source': s_source or 'user',
                        'parent_category': parent_cat,
                        'is_draggable': True,
                        'as_is': {'rate': per_unit_amount, 'total': annual_amount},
                        'post_reno': {'rate': per_unit_amount, 'total': annual_amount},
                        'evidence': evidence,
                        'children': [],
                    })

                # Build hierarchical structure
                for parent_cat in CATEGORY_ORDER:
                    children = grouped_by_parent.get(parent_cat, [])
                    if not children:
                        continue
                    p_as_is = sum(c['as_is'].get('total', 0) or 0 for c in children)
                    p_post_reno = sum(c['post_reno'].get('total', 0) or 0 for c in children)
                    legacy_rows.append({
                        'line_item_key': f'opex_parent_{parent_cat}',
                        'label': PARENT_CATEGORY_LABELS.get(parent_cat, parent_cat),
                        'parent_category': parent_cat,
                        'level': 0,
                        'is_calculated': True,
                        'is_expanded': True,
                        'is_unclassified_section': parent_cat == 'unclassified',
                        'as_is': {
                            'rate': p_as_is / unit_count / 12 if unit_count > 0 else None,
                            'total': p_as_is,
                        },
                        'post_reno': {
                            'rate': p_post_reno / unit_count / 12 if unit_count > 0 else None,
                            'total': p_post_reno,
                        },
                        'evidence': {},
                        'children': children,
                    })

            # 8c. Merge user input overrides
            cursor.execute("""
                SELECT line_item_key, as_is_rate, as_is_value, as_is_count,
                       post_reno_rate, post_reno_value, post_reno_per_sf
                FROM landscape.tbl_operations_user_inputs
                WHERE project_id = %s AND section = 'operating_expenses'
            """, [project_id])
            user_inputs = {r[0]: r for r in cursor.fetchall()}

            if user_inputs:
                opex_rows_to_patch = legacy_rows if legacy_rows else filtered_categories
                for parent_row in opex_rows_to_patch:
                    children = parent_row.get('children', [])
                    if not children:
                        continue
                    for child in children:
                        override = user_inputs.get(child['line_item_key'])
                        if not override:
                            continue
                        override_rate = _parse_number(override[1])  # as_is_rate
                        if override_rate is not None:
                            child['as_is']['rate'] = override_rate
                            child['as_is']['total'] = override_rate * unit_count
                        post_reno_rate = _parse_number(override[4])  # post_reno_rate
                        if post_reno_rate is not None:
                            child['post_reno']['rate'] = post_reno_rate
                            child['post_reno']['total'] = post_reno_rate * unit_count

                    # Recalculate parent totals
                    p_as_is = sum(c['as_is'].get('total', 0) or 0 for c in children)
                    p_post_reno = sum(c['post_reno'].get('total', 0) or 0 for c in children)
                    parent_row['as_is']['total'] = p_as_is
                    parent_row['as_is']['rate'] = p_as_is / unit_count / 12 if unit_count > 0 else None
                    parent_row['post_reno']['total'] = p_post_reno
                    parent_row['post_reno']['rate'] = p_post_reno / unit_count / 12 if unit_count > 0 else None

            # ── 9. Calculate EGI (needed for management fee) ─────────────
            gpr = rental_income['section_total']['as_is']
            gpr_market = rental_income['section_total'].get('as_is_market', gpr)
            nri = gpr + vacancy_deductions['section_total']['as_is']
            nri_market = gpr_market + vacancy_deductions['section_total'].get('as_is_market', vacancy_deductions['section_total']['as_is'])
            total_other = other_income['section_total']['as_is']
            egi = nri + total_other
            egi_market = nri_market + total_other

            post_reno_gpr = rental_income['section_total']['post_reno']
            post_reno_nri = post_reno_gpr + vacancy_deductions['section_total']['post_reno']
            post_reno_egi = post_reno_nri + other_income['section_total']['post_reno']

            # ── 10. Management fee ───────────────────────────────────────
            cursor.execute("""
                SELECT annual_amount, source, value_source
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                  AND (expense_category ILIKE '%%management_fee%%'
                       OR expense_category ILIKE '%%management fee%%'
                       OR category_id = 310)
                LIMIT 1
            """, [project_id])
            mgmt_row = cursor.fetchone()
            extracted_mgmt_fee = _to_float(mgmt_row[0]) if mgmt_row else 0.0

            mgmt_fee_pct = assumptions['management_fee_pct']
            user_overrode = management_fee_source_override == 'user_modified'
            derived_mgmt_fee_pct = None
            mgmt_fee_source = None

            if extracted_mgmt_fee > 0 and not user_overrode:
                mgmt_fee_as_is = extracted_mgmt_fee
                derived_mgmt_fee_pct = extracted_mgmt_fee / egi if egi > 0 else 0
                mgmt_fee_tooltip = f'Extracted: ${round(extracted_mgmt_fee):,} — {derived_mgmt_fee_pct * 100:.1f}% of EGI'
                mgmt_fee_readonly = False
                mgmt_fee_source = (mgmt_row[1] if mgmt_row else None) or 'ingestion'
            elif extracted_mgmt_fee > 0 and user_overrode:
                derived_mgmt_fee_pct = extracted_mgmt_fee / egi if egi > 0 else 0
                mgmt_fee_as_is = egi * mgmt_fee_pct
                mgmt_fee_tooltip = f'User override: {mgmt_fee_pct * 100:.1f}% of EGI (was {derived_mgmt_fee_pct * 100:.1f}% extracted)'
                mgmt_fee_readonly = False
                mgmt_fee_source = 'user_modified'
            else:
                mgmt_fee_as_is = egi * mgmt_fee_pct
                mgmt_fee_tooltip = f'Calculated: {mgmt_fee_pct * 100:.1f}% of EGI'
                mgmt_fee_readonly = True
                mgmt_fee_source = 'user'

            effective_mgmt_pct = mgmt_fee_pct if user_overrode else (derived_mgmt_fee_pct if derived_mgmt_fee_pct is not None else mgmt_fee_pct)
            mgmt_fee_market = egi_market * mgmt_fee_pct
            mgmt_fee_post_reno = post_reno_egi * effective_mgmt_pct

            # Replacement reserves
            reserves_per_unit = assumptions['replacement_reserve_pct']
            replacement_reserves = reserves_per_unit * unit_count

            # Build calculated expense rows
            calculated_expense_rows = [
                {
                    'line_item_key': 'calculated_management_fee',
                    'label': 'Management Fee',
                    'tooltip': mgmt_fee_tooltip,
                    'level': 1,
                    'is_calculated': False,
                    'is_readonly': mgmt_fee_readonly,
                    'is_percentage': True,
                    'is_management_fee': True,
                    'parent_category': 'management_reserves',
                    'calculation_base': 'egi',
                    'source': mgmt_fee_source,
                    'management_fee_pct': effective_mgmt_pct,
                    'derived_management_fee_pct': derived_mgmt_fee_pct,
                    'as_is': {
                        'rate': (mgmt_fee_as_is / unit_count if unit_count > 0 else 0) if mgmt_fee_source == 'ingestion' else (mgmt_fee_pct if user_overrode else mgmt_fee_pct),
                        'total': mgmt_fee_as_is,
                    },
                    'post_reno': {
                        'rate': effective_mgmt_pct,
                        'total': mgmt_fee_post_reno,
                    },
                    'evidence': {'source': (mgmt_row[1] if mgmt_row else None) or 'extraction'} if extracted_mgmt_fee > 0 else {},
                    'children': [],
                },
                {
                    'line_item_key': 'calculated_replacement_reserves',
                    'label': f'Replacement Reserves (${reserves_per_unit:.0f}/unit)',
                    'level': 1,
                    'is_calculated': False,
                    'is_readonly': True,
                    'parent_category': 'management_reserves',
                    'as_is': {'rate': reserves_per_unit, 'total': replacement_reserves},
                    'post_reno': {'rate': reserves_per_unit, 'total': replacement_reserves},
                    'evidence': {},
                    'children': [],
                },
            ]

            # ── 11. Build final operating expenses + totals ──────────────
            use_legacy = bool(legacy_rows)
            opex_base_rows = legacy_rows if use_legacy else filtered_categories

            base_total = sum(r['as_is'].get('total', 0) or 0 for r in opex_base_rows)
            base_post_reno_total = sum(r['post_reno'].get('total', 0) or 0 for r in opex_base_rows)

            # Management & Reserves parent category
            mgmt_reserves_parent = {
                'line_item_key': 'opex_parent_management_reserves',
                'label': 'Management & Reserves',
                'parent_category': 'management_reserves',
                'level': 0,
                'is_calculated': True,
                'is_expanded': True,
                'as_is': {
                    'rate': (mgmt_fee_as_is + replacement_reserves) / unit_count / 12 if unit_count > 0 else None,
                    'total': mgmt_fee_as_is + replacement_reserves,
                },
                'post_reno': {
                    'rate': (mgmt_fee_post_reno + replacement_reserves) / unit_count / 12 if unit_count > 0 else None,
                    'total': mgmt_fee_post_reno + replacement_reserves,
                },
                'evidence': {},
                'children': list(calculated_expense_rows),
            }

            # Merge management legacy rows into the calculated section
            if use_legacy:
                mgmt_legacy = [r for r in opex_base_rows if r.get('parent_category') == 'management']
                non_mgmt = [r for r in opex_base_rows if r.get('parent_category') != 'management']
                for mgmt_row_item in mgmt_legacy:
                    if mgmt_row_item.get('children'):
                        mgmt_reserves_parent['children'].extend(mgmt_row_item['children'])
                if mgmt_legacy:
                    mgmt_children_total = sum(c['as_is'].get('total', 0) or 0 for c in mgmt_reserves_parent['children'])
                    mgmt_reserves_parent['as_is'] = {
                        'rate': mgmt_children_total / unit_count if unit_count > 0 else 0,
                        'total': mgmt_children_total,
                    }
                all_opex_rows = non_mgmt + [mgmt_reserves_parent]
            else:
                all_opex_rows = list(filtered_categories) + [mgmt_reserves_parent]

            calc_total = mgmt_fee_as_is + replacement_reserves
            total_opex = base_total + calc_total
            calc_post_reno_total = mgmt_fee_post_reno + replacement_reserves
            total_opex_post_reno = base_post_reno_total + calc_post_reno_total

            operating_expenses = {
                'section_type': 'hierarchical',
                'rows': all_opex_rows,
                'section_total': {
                    'as_is': total_opex,
                    'post_reno': total_opex_post_reno,
                },
                'calculated': {
                    'management_fee': mgmt_fee_as_is,
                    'management_fee_pct': mgmt_fee_pct,
                    'replacement_reserves': replacement_reserves,
                    'reserves_per_unit': reserves_per_unit,
                },
            }

            # ── 12. Final totals ─────────────────────────────────────────
            as_is_noi = egi - total_opex
            market_noi = egi_market - total_opex
            post_reno_noi = post_reno_egi - total_opex_post_reno
            noi_uplift = post_reno_noi - as_is_noi
            noi_uplift_pct = noi_uplift / as_is_noi if as_is_noi != 0 else 0

            return Response({
                'project_id': project_id,
                'project_type_code': project['project_type_code'],
                'analysis_type': project['analysis_type'],
                'property_summary': {
                    'unit_count': unit_count,
                    'total_sf': total_sf,
                    'avg_unit_sf': total_sf / unit_count if unit_count > 0 else 0,
                },
                'value_add_enabled': project['value_add_enabled'],
                'has_detailed_rent_roll': has_detailed_rent_roll,
                'calculated_physical_vacancy': calculated_physical_vacancy,
                'assumptions': {
                    'physical_vacancy_pct': physical_vacancy_rate,
                    'credit_loss_pct': credit_loss_rate,
                    'concessions_pct': concessions_rate,
                    'management_fee_pct': mgmt_fee_pct,
                    'reserves_per_unit': reserves_per_unit,
                },
                'rental_income': rental_income,
                'vacancy_deductions': vacancy_deductions,
                'other_income': other_income,
                'operating_expenses': operating_expenses,
                'totals': {
                    'gross_potential_rent': gpr,
                    'gross_potential_rent_market': gpr_market,
                    'net_rental_income': nri,
                    'net_rental_income_market': nri_market,
                    'total_other_income': total_other,
                    'effective_gross_income': egi,
                    'effective_gross_income_market': egi_market,
                    'total_operating_expenses': total_opex,
                    'base_operating_expenses': base_total,
                    'management_fee': mgmt_fee_as_is,
                    'replacement_reserves': replacement_reserves,
                    'as_is_noi': as_is_noi,
                    'market_noi': market_noi,
                    'post_reno_noi': post_reno_noi,
                    'noi_uplift': noi_uplift,
                    'noi_uplift_percent': noi_uplift_pct,
                },
                'available_scenarios': available_scenarios,
                'preferred_scenario': preferred_scenario,
            })

    except Exception as e:
        logger.exception('Error fetching operations data')
        return Response(
            {'error': 'Failed to fetch operations data', 'details': str(e)},
            status=500,
        )


# =============================================================================
# PUT /api/projects/{project_id}/operations/inputs/
# =============================================================================

@api_view(['PUT'])
def operations_inputs(request, project_id):
    """
    Batch upsert operations line-item inputs.

    Request body:
    {
        "updates": [
            {
                "section": "rental_income" | "vacancy_deductions" | "other_income" | "operating_expenses",
                "line_item_key": str,
                "category_id": int | null,
                "as_is_value": float | null,
                "as_is_count": float | null,
                "as_is_rate": float | null,
                "as_is_growth_rate": float | null,
                "post_reno_value": float | null,
                "post_reno_count": float | null,
                "post_reno_rate": float | null,
                "post_reno_per_sf": float | null,
                "post_reno_growth_rate": float | null
            }
        ]
    }
    """
    updates = request.data.get('updates')
    if not updates or not isinstance(updates, list):
        return Response({'error': 'Missing updates array'}, status=400)

    try:
        with connection.cursor() as cursor:
            for update in updates:
                section = update.get('section')
                line_item_key = update.get('line_item_key')

                if not section or not line_item_key:
                    continue

                # Special handling: management fee percentage also updates assumption
                if line_item_key == 'calculated_management_fee':
                    _upsert_management_fee(cursor, project_id, update)
                    continue

                # Generic user_inputs upsert
                cursor.execute("""
                    INSERT INTO landscape.tbl_operations_user_inputs (
                        project_id, section, line_item_key, category_id,
                        as_is_value, as_is_count, as_is_rate, as_is_growth_rate,
                        post_reno_value, post_reno_count, post_reno_rate,
                        post_reno_per_sf, post_reno_growth_rate,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        NOW()
                    )
                    ON CONFLICT (project_id, section, line_item_key)
                    DO UPDATE SET
                        as_is_value = COALESCE(EXCLUDED.as_is_value, tbl_operations_user_inputs.as_is_value),
                        as_is_count = COALESCE(EXCLUDED.as_is_count, tbl_operations_user_inputs.as_is_count),
                        as_is_rate = COALESCE(EXCLUDED.as_is_rate, tbl_operations_user_inputs.as_is_rate),
                        as_is_growth_rate = COALESCE(EXCLUDED.as_is_growth_rate, tbl_operations_user_inputs.as_is_growth_rate),
                        post_reno_value = COALESCE(EXCLUDED.post_reno_value, tbl_operations_user_inputs.post_reno_value),
                        post_reno_count = COALESCE(EXCLUDED.post_reno_count, tbl_operations_user_inputs.post_reno_count),
                        post_reno_rate = COALESCE(EXCLUDED.post_reno_rate, tbl_operations_user_inputs.post_reno_rate),
                        post_reno_per_sf = COALESCE(EXCLUDED.post_reno_per_sf, tbl_operations_user_inputs.post_reno_per_sf),
                        post_reno_growth_rate = COALESCE(EXCLUDED.post_reno_growth_rate, tbl_operations_user_inputs.post_reno_growth_rate),
                        updated_at = NOW()
                """, [
                    project_id,
                    section,
                    line_item_key,
                    update.get('category_id'),
                    update.get('as_is_value'),
                    update.get('as_is_count'),
                    update.get('as_is_rate'),
                    update.get('as_is_growth_rate'),
                    update.get('post_reno_value'),
                    update.get('post_reno_count'),
                    update.get('post_reno_rate'),
                    update.get('post_reno_per_sf'),
                    update.get('post_reno_growth_rate'),
                ])

        # Phase 4 — artifact dependency cascade hook (fail-safe).
        dependency_notification = None
        try:
            from apps.artifacts.cascade import process_dependency_cascade
            dependency_notification = process_dependency_cascade(
                project_id=int(project_id),
                changed_rows=_build_changed_rows_from_operations_updates(updates),
                user_id=getattr(getattr(request, 'user', None), 'id', None),
            )
        except Exception:
            logger.warning(
                'operations_inputs: cascade hook failed (non-blocking)',
                exc_info=True,
            )

        response_body = {
            'success': True,
            'updated_count': len(updates),
        }
        if dependency_notification:
            response_body['dependency_notification'] = dependency_notification
        return Response(response_body)

    except Exception as e:
        logger.exception('Error saving operations inputs')
        return Response({'error': 'Failed to save operations inputs'}, status=500)


def _upsert_management_fee(cursor, project_id, update):
    """Handle management fee special case: update tbl_project_assumption."""
    as_is_rate = update.get('as_is_rate')
    post_reno_rate = update.get('post_reno_rate')

    # Use whichever rate is provided (post_reno takes precedence if both sent)
    rate = post_reno_rate if post_reno_rate is not None else as_is_rate
    if rate is not None:
        cursor.execute("""
            INSERT INTO landscape.tbl_project_assumption
                (project_id, assumption_key, assumption_value)
            VALUES (%s, 'management_fee_pct', %s)
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = %s, updated_at = NOW()
        """, [project_id, str(rate), str(rate)])


# =============================================================================
# PUT /api/projects/{project_id}/operations/settings/
# =============================================================================

@api_view(['PUT'])
def operations_settings(request, project_id):
    """
    Update operations settings.

    Request body (all fields optional):
    {
        "value_add_enabled": bool,
        "vacancy_override_pct": float | null,   // null = clear override
        "management_fee_pct": float,
        "management_fee_source": "ingestion" | "user_modified"
    }
    """
    data = request.data
    result = {}

    try:
        with connection.cursor() as cursor:

            # ── value_add_enabled toggle on tbl_project ──
            if 'value_add_enabled' in data and isinstance(data['value_add_enabled'], bool):
                try:
                    cursor.execute("""
                        UPDATE landscape.tbl_project
                        SET value_add_enabled = %s
                        WHERE project_id = %s
                    """, [data['value_add_enabled'], project_id])
                    result['value_add_enabled'] = data['value_add_enabled']
                except Exception:
                    logger.warning(
                        'value_add_enabled column not found — migration 043 may not have run'
                    )

            # ── vacancy_override_pct ──
            if 'vacancy_override_pct' in data:
                val = data['vacancy_override_pct']
                if val is None:
                    # Clear override → revert to rent-roll-calculated vacancy
                    cursor.execute("""
                        DELETE FROM landscape.tbl_project_assumption
                        WHERE project_id = %s AND assumption_key = 'vacancy_override_pct'
                    """, [project_id])
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_project_assumption
                            (project_id, assumption_key, assumption_value)
                        VALUES (%s, 'vacancy_override_pct', %s)
                        ON CONFLICT (project_id, assumption_key)
                        DO UPDATE SET assumption_value = %s, updated_at = NOW()
                    """, [project_id, str(val), str(val)])
                result['vacancy_override_pct'] = val

            # ── management_fee_pct ──
            if 'management_fee_pct' in data and isinstance(data['management_fee_pct'], (int, float)):
                val = data['management_fee_pct']
                cursor.execute("""
                    INSERT INTO landscape.tbl_project_assumption
                        (project_id, assumption_key, assumption_value)
                    VALUES (%s, 'management_fee_pct', %s)
                    ON CONFLICT (project_id, assumption_key)
                    DO UPDATE SET assumption_value = %s, updated_at = NOW()
                """, [project_id, str(val), str(val)])
                result['management_fee_pct'] = val

            # ── management_fee_source ──
            if 'management_fee_source' in data:
                source = data['management_fee_source']
                if source == 'ingestion':
                    # Revert: remove user override
                    cursor.execute("""
                        DELETE FROM landscape.tbl_project_assumption
                        WHERE project_id = %s AND assumption_key = 'management_fee_source'
                    """, [project_id])
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_project_assumption
                            (project_id, assumption_key, assumption_value)
                        VALUES (%s, 'management_fee_source', %s)
                        ON CONFLICT (project_id, assumption_key)
                        DO UPDATE SET assumption_value = %s, updated_at = NOW()
                    """, [project_id, source, source])
                result['management_fee_source'] = source

        return Response({'success': True, **result})

    except Exception as e:
        logger.exception('Error updating operations settings')
        return Response({'error': 'Failed to update operations settings'}, status=500)
