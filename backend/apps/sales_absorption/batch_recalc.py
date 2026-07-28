"""Batch recalculation endpoint for parcel sale assumptions.

The per-parcel recalc (``recalculate_one_assumption``) is factored out of the
batch endpoint so a single-parcel write (the CB9 sales-cell editing spine) can
reuse the EXACT same maths — assemble parcel + pricing + overrides, run
``SaleCalculationService.calculate_sale_proceeds``, and persist the stored
derived columns. No parallel writer: the endpoint and the editing spine call the
same function.
"""

import json

from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response


def get_project_cost_inflation_rate(project_id: int):
    """First-step cost-inflation rate for the project (or ``None``).

    Drives improvement-offset escalation in ``calculate_sale_proceeds``. Kept
    as a helper so the batch endpoint reads it once for the whole set and the
    single-parcel path reads it on demand."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                CASE
                    WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                    ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                END AS cost_inflation_rate
            FROM landscape.tbl_project_settings ps
            LEFT JOIN landscape.core_fin_growth_rate_sets s ON s.set_id = ps.cost_inflation_set_id
            LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
            WHERE ps.project_id = %s
            GROUP BY ps.project_id
        """, [project_id])
        inflation_row = cursor.fetchone()
    return float(inflation_row[0]) if inflation_row and inflation_row[0] else None


def recalculate_one_assumption(project_id: int, parcel_id, cost_inflation_rate=None):
    """Recalculate + persist the stored derived columns for ONE parcel.

    Assembles ``parcel_data`` (from ``tbl_parcel`` + the row's ``psa.sale_date``),
    ``pricing_data`` (from ``land_use_pricing``) and ``overrides`` (the saved
    override columns, gated by their ``*_override`` flags — so a user-set
    commission_pct with ``commission_override = true`` is honored), runs
    ``SaleCalculationService.calculate_sale_proceeds`` and writes the result
    back to ``tbl_parcel_sale_assumptions``.

    ``sale_date`` is READ as the calc input and is NOT overwritten — the editing
    spine's sale-date write is the source of that value.

    Returns the calculation dict. Raises ``ValueError`` when the parcel has no
    dated assumption row or no pricing (the batch loop turns that into a
    per-parcel error string; the single-write path surfaces it as a writer
    error)."""
    from .services import SaleCalculationService

    if cost_inflation_rate is None:
        cost_inflation_rate = get_project_cost_inflation_rate(project_id)

    # Parcel dimensions + the current (possibly just-written) sale_date.
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT p.type_code, p.product_code, p.lot_width, p.units_total,
                   p.acres_gross, psa.sale_date, p.sale_period
            FROM landscape.tbl_parcel p
            JOIN landscape.tbl_parcel_sale_assumptions psa
                ON psa.parcel_id = p.parcel_id
            WHERE p.parcel_id = %s AND p.project_id = %s
        """, [parcel_id, project_id])
        prow = cursor.fetchone()

    if not prow:
        raise ValueError(f"No sale assumption row for parcel {parcel_id}")
    if prow[5] is None:
        raise ValueError(f"Parcel {parcel_id} has no sale_date to recalculate against")
    # sale_period drives the improvement-offset cost-escalation inside
    # calculate_sale_proceeds. Without it the offset flattens to the benchmark
    # ($1,300/FF), understating it and overstating gross ~6% (CB11/CB12). A dated
    # sale row with no sale_period should not exist; refuse loudly rather than
    # write the flat basis. _write_sale_cell surfaces this as a writer error.
    if prow[6] is None:
        raise ValueError(
            f"Parcel {parcel_id} has no sale_period — refusing to recalculate "
            "(would produce the un-escalated flat $1,300/FF basis)"
        )

    parcel_data = {
        'parcel_id': parcel_id,
        'project_id': project_id,
        'type_code': prow[0],
        'product_code': prow[1] or '',
        'lot_width': float(prow[2]) if prow[2] else 0,
        'units_total': int(prow[3]) if prow[3] else 0,
        'acres_gross': float(prow[4]) if prow[4] else 0,
        # Pass sale_period so the improvement offset escalates per period
        # (matches recalculate_sfd_parcels — the path that produced the stored basis).
        'sale_period': int(prow[6]),
    }
    sale_date = prow[5].isoformat() if hasattr(prow[5], 'isoformat') else str(prow[5])

    # Pricing data (the basis for the inflated price).
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                price_per_unit,
                unit_of_measure,
                growth_rate,
                COALESCE(created_at::date, CURRENT_DATE) as pricing_effective_date
            FROM landscape.land_use_pricing
            WHERE project_id = %s
              AND lu_type_code = %s
              AND (product_code = %s OR product_code IS NULL)
            ORDER BY product_code NULLS LAST
            LIMIT 1
        """, [project_id, parcel_data['type_code'], parcel_data['product_code']])
        pricing_row = cursor.fetchone()

    if not pricing_row:
        raise ValueError("No pricing found")

    pricing_data = {
        'price_per_unit': float(pricing_row[0]),
        'unit_of_measure': pricing_row[1],
        'growth_rate': float(pricing_row[2]),
        'pricing_effective_date': pricing_row[3].isoformat() if hasattr(pricing_row[3], 'isoformat') else str(pricing_row[3]),
    }

    # Saved overrides — each honored only when its companion *_override flag is
    # set. This is how a user-typed commission survives the recalc: the editing
    # spine writes commission_pct + commission_override = true, and the calc
    # reproduces commission_amount = gross × commission_pct.
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                improvement_offset_per_uom,
                improvement_offset_override,
                legal_pct,
                legal_override,
                commission_pct,
                commission_override,
                closing_cost_pct,
                closing_cost_override,
                title_insurance_pct,
                title_insurance_override,
                custom_transaction_costs,
                commission_amount
            FROM landscape.tbl_parcel_sale_assumptions
            WHERE parcel_id = %s
        """, [parcel_id])
        overrides_row = cursor.fetchone()

    overrides = {}
    if overrides_row:
        if overrides_row[1]:  # improvement_offset_override
            overrides['improvement_offset_per_uom'] = float(overrides_row[0]) if overrides_row[0] else 0
        if overrides_row[3]:  # legal_override
            overrides['legal_pct'] = float(overrides_row[2]) if overrides_row[2] else 0
        if overrides_row[5]:  # commission_override
            overrides['commission_pct'] = float(overrides_row[4]) if overrides_row[4] else 0
            # CB9: honor the typed dollar amount to the cent (fixed override).
            # The stored commission_amount is the source of truth; the calc
            # reproduces it exactly instead of rounding through commission_pct.
            if overrides_row[11] is not None:  # commission_amount
                overrides['commission_amount'] = float(overrides_row[11])
        if overrides_row[7]:  # closing_cost_override
            overrides['closing_cost_pct'] = float(overrides_row[6]) if overrides_row[6] else 0
        if overrides_row[9]:  # title_insurance_override
            overrides['title_insurance_pct'] = float(overrides_row[8]) if overrides_row[8] else 0
        if overrides_row[10]:  # custom_transaction_costs
            overrides['custom_transaction_costs'] = (
                json.loads(overrides_row[10]) if isinstance(overrides_row[10], str) else overrides_row[10]
            )

    calculation = SaleCalculationService.calculate_sale_proceeds(
        parcel_data=parcel_data,
        pricing_data=pricing_data,
        sale_date=sale_date,
        overrides=overrides if overrides else None,
        cost_inflation_rate=cost_inflation_rate,
    )

    # Persist the stored derived columns. sale_date is intentionally NOT written
    # (the editing spine owns it).
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.tbl_parcel_sale_assumptions
            SET
                base_price_per_unit = %s,
                price_uom = %s,
                inflation_rate = %s,
                inflated_price_per_unit = %s,
                gross_parcel_price = %s,
                improvement_offset_per_uom = %s,
                improvement_offset_total = %s,
                improvement_offset_source = %s,
                gross_sale_proceeds = %s,
                legal_pct = %s,
                legal_amount = %s,
                commission_pct = %s,
                commission_amount = %s,
                closing_cost_pct = %s,
                closing_cost_amount = %s,
                title_insurance_pct = %s,
                title_insurance_amount = %s,
                custom_transaction_costs = %s::jsonb,
                total_transaction_costs = %s,
                net_sale_proceeds = %s,
                net_proceeds_per_uom = %s,
                updated_at = NOW()
            WHERE parcel_id = %s
        """, [
            calculation['base_price_per_unit'],
            calculation['price_uom'],
            calculation['inflation_rate'],
            calculation['inflated_price_per_unit'],
            calculation['gross_parcel_price'],
            calculation['improvement_offset_per_uom'],
            calculation['improvement_offset_total'],
            calculation['improvement_offset_source'],
            calculation['gross_sale_proceeds'],
            calculation['legal_pct'],
            calculation['legal_amount'],
            calculation['commission_pct'],
            calculation['commission_amount'],
            calculation['closing_cost_pct'],
            calculation['closing_cost_amount'],
            calculation['title_insurance_pct'],
            calculation['title_insurance_amount'],
            json.dumps(calculation['custom_transaction_costs']),
            calculation['total_transaction_costs'],
            calculation['net_sale_proceeds'],
            calculation['net_proceeds_per_uom'],
            parcel_id,
        ])

    return calculation


@api_view(['POST'])
def batch_recalculate_assumptions(request: Request, project_id: int) -> Response:
    """
    Batch recalculate and update all saved parcel sale assumptions for a project.

    This endpoint recalculates net_sale_proceeds for all parcels that have saved
    assumptions, using the current pricing formulas. Useful after fixing calculation
    bugs to update stale saved values.

    POST /api/projects/{project_id}/batch-recalculate-assumptions/
    """
    try:
        cost_inflation_rate = get_project_cost_inflation_rate(project_id)

        # Fetch all parcels with saved assumptions
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT p.parcel_id
                FROM landscape.tbl_parcel p
                INNER JOIN landscape.tbl_parcel_sale_assumptions psa
                    ON psa.parcel_id = p.parcel_id
                WHERE p.project_id = %s
                    AND psa.sale_date IS NOT NULL
                ORDER BY p.parcel_id
            """, [project_id])
            rows = cursor.fetchall()

        if not rows:
            return Response({
                'message': 'No parcels with saved assumptions found',
                'updated_count': 0
            }, status=status.HTTP_200_OK)

        updated_count = 0
        errors = []

        for row in rows:
            parcel_id = row[0]
            try:
                recalculate_one_assumption(
                    project_id, parcel_id, cost_inflation_rate=cost_inflation_rate
                )
                updated_count += 1
            except Exception as parcel_error:
                errors.append(f"Parcel {parcel_id}: {str(parcel_error)}")
                continue

        return Response({
            'message': f'Successfully recalculated {updated_count} parcel assumptions',
            'updated_count': updated_count,
            'total_parcels': len(rows),
            'errors': errors if errors else None
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Error in batch_recalculate_assumptions: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
