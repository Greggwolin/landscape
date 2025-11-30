"""Batch recalculation endpoint for parcel sale assumptions."""

from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(['POST'])
@permission_classes([AllowAny])
def batch_recalculate_assumptions(request: Request, project_id: int) -> Response:
    """
    Batch recalculate and update all saved parcel sale assumptions for a project.

    This endpoint recalculates net_sale_proceeds for all parcels that have saved
    assumptions, using the current pricing formulas. Useful after fixing calculation
    bugs to update stale saved values.

    POST /api/projects/{project_id}/batch-recalculate-assumptions/
    """
    from .services import SaleCalculationService

    try:
        # Fetch cost inflation rate from project settings
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
            cost_inflation_rate = float(inflation_row[0]) if inflation_row and inflation_row[0] else None

        # Fetch all parcels with saved assumptions
        with connection.cursor() as cursor:
            sql = """
                SELECT DISTINCT
                    p.parcel_id,
                    p.project_id,
                    p.type_code,
                    p.product_code,
                    p.lot_width,
                    p.units_total,
                    p.acres_gross,
                    psa.sale_date
                FROM landscape.tbl_parcel p
                INNER JOIN landscape.tbl_parcel_sale_assumptions psa
                    ON psa.parcel_id = p.parcel_id
                WHERE p.project_id = %s
                    AND psa.sale_date IS NOT NULL
                ORDER BY p.parcel_id
            """
            cursor.execute(sql, [project_id])
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
                parcel_data = {
                    'parcel_id': row[0],
                    'project_id': row[1],
                    'type_code': row[2],
                    'product_code': row[3] or '',
                    'lot_width': float(row[4]) if row[4] else 0,
                    'units_total': int(row[5]) if row[5] else 0,
                    'acres_gross': float(row[6]) if row[6] else 0
                }
                sale_date = row[7].isoformat() if hasattr(row[7], 'isoformat') else str(row[7])

                # Fetch pricing data
                with connection.cursor() as cursor:
                    pricing_sql = """
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
                    """
                    cursor.execute(pricing_sql, [project_id, parcel_data['type_code'], parcel_data['product_code']])
                    pricing_row = cursor.fetchone()

                if not pricing_row:
                    errors.append(f"Parcel {parcel_id}: No pricing found")
                    continue

                pricing_data = {
                    'price_per_unit': float(pricing_row[0]),
                    'unit_of_measure': pricing_row[1],
                    'growth_rate': float(pricing_row[2]),
                    'pricing_effective_date': pricing_row[3].isoformat() if hasattr(pricing_row[3], 'isoformat') else str(pricing_row[3])
                }

                # Fetch saved overrides from existing assumptions
                with connection.cursor() as cursor:
                    overrides_sql = """
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
                            custom_transaction_costs
                        FROM landscape.tbl_parcel_sale_assumptions
                        WHERE parcel_id = %s
                    """
                    cursor.execute(overrides_sql, [parcel_id])
                    overrides_row = cursor.fetchone()

                # Build overrides dict if user had manual overrides
                overrides = {}
                if overrides_row:
                    if overrides_row[1]:  # improvement_offset_override
                        overrides['improvement_offset_per_uom'] = float(overrides_row[0]) if overrides_row[0] else 0
                    if overrides_row[3]:  # legal_override
                        overrides['legal_pct'] = float(overrides_row[2]) if overrides_row[2] else 0
                    if overrides_row[5]:  # commission_override
                        overrides['commission_pct'] = float(overrides_row[4]) if overrides_row[4] else 0
                    if overrides_row[7]:  # closing_cost_override
                        overrides['closing_cost_pct'] = float(overrides_row[6]) if overrides_row[6] else 0
                    if overrides_row[9]:  # title_insurance_override
                        overrides['title_insurance_pct'] = float(overrides_row[8]) if overrides_row[8] else 0
                    if overrides_row[10]:  # custom_transaction_costs
                        import json
                        overrides['custom_transaction_costs'] = json.loads(overrides_row[10]) if isinstance(overrides_row[10], str) else overrides_row[10]

                # Recalculate with current formulas (including cost inflation for improvement offset)
                calculation = SaleCalculationService.calculate_sale_proceeds(
                    parcel_data=parcel_data,
                    pricing_data=pricing_data,
                    sale_date=sale_date,
                    overrides=overrides if overrides else None,
                    cost_inflation_rate=cost_inflation_rate
                )

                # Update database
                with connection.cursor() as cursor:
                    import json
                    update_sql = """
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
                    """
                    cursor.execute(update_sql, [
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
                        parcel_id
                    ])

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
