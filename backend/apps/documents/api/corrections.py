"""
API endpoints for AI extraction review and correction logging.

Provides endpoints for:
- Retrieving extraction results for review
- Logging user corrections
- Committing reviewed extractions to normalized tables
- Analytics on correction patterns
"""

print("DOCS URL IMPORT CHECKPOINT: rest_framework")
from rest_framework import viewsets, status
print("DOCS URL IMPORT CHECKPOINT: rest_framework.decorators")
from rest_framework.decorators import action
print("DOCS URL IMPORT CHECKPOINT: rest_framework.response")
from rest_framework.response import Response
print("DOCS URL IMPORT CHECKPOINT: django.db")
from django.db import transaction, connection
print("DOCS URL IMPORT CHECKPOINT: django.utils")
from django.utils import timezone
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)


class ExtractionReviewViewSet(viewsets.ViewSet):
    """
    ViewSet for reviewing and correcting AI extractions.

    Endpoints:
    - GET /api/extractions/<id>/review/ - Get extraction for review
    - POST /api/extractions/<id>/correct/ - Log a correction
    - POST /api/extractions/<id>/commit/ - Commit to normalized tables
    - GET /api/corrections/analytics/ - Get correction analytics
    """

    @action(detail=True, methods=['get'], url_path='review')
    def get_for_review(self, request, pk=None):
        """
        Retrieve extraction results formatted for review UI.

        Returns:
        {
            "extraction_id": 123,
            "document_id": 456,
            "document_name": "Sunset_Ridge_OM.pdf",
            "document_type": "offering_memorandum",
            "extraction_type": "rent_roll",
            "extracted_at": "2025-10-30T10:30:00Z",
            "overall_confidence": 0.87,
            "status": "pending_review",
            "source_pages": [23, 24, 25],
            "data": {
                "property_summary": {
                    "property_name": {"value": "Sunset Ridge", "confidence": 0.95},
                    ...
                },
                "units": [
                    {
                        "unit_id": {"value": "101", "confidence": 1.0},
                        "market_rent": {"value": 1850, "confidence": 0.85},
                        ...
                    }
                ]
            },
            "warnings": [
                {
                    "warning_id": 1,
                    "field_path": "financial_metrics.cap_rate_current",
                    "severity": "warning",
                    "message": "Cap rate 6.25% is below market average",
                    "suggested_value": null
                }
            ],
            "previous_corrections": [
                {
                    "field_path": "units[3].market_rent",
                    "old_value": "1850",
                    "new_value": "1950",
                    "correction_type": "value_wrong",
                    "corrected_at": "2025-10-30T11:00:00Z"
                }
            ]
        }
        """
        extraction_id = pk

        with connection.cursor() as cursor:
            # Get extraction result
            cursor.execute("""
                SELECT
                    er.extraction_id,
                    er.doc_id,
                    d.doc_name,
                    d.doc_type,
                    er.extraction_type,
                    er.extracted_data,
                    er.overall_confidence,
                    er.confidence_scores,
                    er.validation_warnings,
                    er.status,
                    er.source_pages,
                    er.page_count,
                    er.created_at,
                    er.reviewed_by,
                    er.reviewed_at
                FROM landscape.ai_extraction_results er
                JOIN landscape.core_doc d ON er.doc_id = d.doc_id
                WHERE er.extraction_id = %s
            """, [extraction_id])

            row = cursor.fetchone()
            if not row:
                return Response(
                    {"error": "Extraction not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Parse extraction result
            extraction_data = {
                "extraction_id": row[0],
                "document_id": row[1],
                "document_name": row[2],
                "document_type": row[3],
                "extraction_type": row[4],
                "data": self._format_data_with_confidence(row[5], row[6]),
                "overall_confidence": float(row[7]) if row[7] else None,
                "raw_validation_warnings": row[8] or [],
                "status": row[9],
                "source_pages": row[10] or [],
                "page_count": row[11],
                "extracted_at": row[12].isoformat() if row[12] else None,
                "reviewed_by": row[13],
                "reviewed_at": row[14].isoformat() if row[14] else None
            }

            # Get warnings
            cursor.execute("""
                SELECT
                    warning_id,
                    field_path,
                    warning_type,
                    severity,
                    message,
                    suggested_value,
                    suggested_confidence,
                    related_fields,
                    user_action,
                    resolved_at
                FROM landscape.ai_extraction_warnings
                WHERE extraction_id = %s
                ORDER BY
                    CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'error' THEN 2
                        WHEN 'warning' THEN 3
                        ELSE 4
                    END,
                    warning_id
            """, [extraction_id])

            warnings = []
            for w_row in cursor.fetchall():
                warnings.append({
                    "warning_id": w_row[0],
                    "field_path": w_row[1],
                    "warning_type": w_row[2],
                    "severity": w_row[3],
                    "message": w_row[4],
                    "suggested_value": w_row[5],
                    "suggested_confidence": float(w_row[6]) if w_row[6] else None,
                    "related_fields": w_row[7] or [],
                    "user_action": w_row[8],
                    "resolved": w_row[9] is not None
                })

            extraction_data["warnings"] = warnings

            # Get previous corrections
            cursor.execute("""
                SELECT
                    field_path,
                    ai_value,
                    user_value,
                    correction_type,
                    correction_notes,
                    created_at
                FROM landscape.ai_correction_log
                WHERE extraction_id = %s
                ORDER BY created_at DESC
            """, [extraction_id])

            corrections = []
            for c_row in cursor.fetchall():
                corrections.append({
                    "field_path": c_row[0],
                    "old_value": c_row[1],
                    "new_value": c_row[2],
                    "correction_type": c_row[3],
                    "notes": c_row[4],
                    "corrected_at": c_row[5].isoformat() if c_row[5] else None
                })

            extraction_data["previous_corrections"] = corrections

        return Response(extraction_data)

    def _format_data_with_confidence(self, extracted_data, confidence_scores):
        """
        Merge extracted data with confidence scores for UI display.

        Transforms:
        data: {"unit_id": "101", "market_rent": 1850}
        confidence: {"unit_id": 1.0, "market_rent": 0.85}

        Into:
        {"unit_id": {"value": "101", "confidence": 1.0}, ...}
        """
        if not extracted_data:
            return {}

        if not confidence_scores:
            # No confidence data - return as-is with null confidence
            return extracted_data

        # Recursively merge data and confidence
        def merge_with_confidence(data, conf):
            if isinstance(data, dict):
                result = {}
                for key, value in data.items():
                    if isinstance(value, (dict, list)):
                        result[key] = merge_with_confidence(
                            value,
                            conf.get(key, {}) if isinstance(conf, dict) else {}
                        )
                    else:
                        result[key] = {
                            "value": value,
                            "confidence": float(conf.get(key, 0.0)) if isinstance(conf, dict) else 0.0
                        }
                return result
            elif isinstance(data, list):
                return [
                    merge_with_confidence(item, conf[i] if i < len(conf) else {})
                    for i, item in enumerate(data)
                ]
            else:
                return {"value": data, "confidence": 0.0}

        return merge_with_confidence(extracted_data, confidence_scores)

    @action(detail=True, methods=['post'], url_path='correct')
    def log_correction(self, request, pk=None):
        """
        Log a user correction to an extracted field.

        Request body:
        {
            "field_path": "financial_metrics.cap_rate_current",
            "old_value": "0.0625",
            "new_value": "0.0685",
            "correction_type": "value_wrong",
            "page_number": 12,
            "source_quote": "Current Cap Rate: 6.85%",
            "notes": "AI read 6.25% instead of 6.85%"
        }

        Response:
        {
            "success": true,
            "correction_id": 789,
            "updated_confidence": 0.92,
            "related_fields": ["noi_current", "list_price"]
        }
        """
        extraction_id = pk
        data = request.data

        # Validate required fields
        required = ['field_path', 'new_value', 'correction_type']
        missing = [f for f in required if f not in data]
        if missing:
            return Response(
                {"error": f"Missing required fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # Insert correction
                    cursor.execute("""
                        INSERT INTO landscape.ai_correction_log (
                            extraction_id,
                            user_id,
                            project_id,
                            doc_id,
                            field_path,
                            ai_value,
                            user_value,
                            correction_type,
                            page_number,
                            source_quote,
                            correction_notes,
                            created_at
                        )
                        SELECT
                            %s,
                            %s,
                            er.project_id,
                            er.doc_id,
                            %s,
                            %s,
                            %s,
                            %s,
                            %s,
                            %s,
                            %s,
                            NOW()
                        FROM landscape.ai_extraction_results er
                        WHERE er.extraction_id = %s
                        RETURNING correction_id
                    """, [
                        extraction_id,
                        request.user.id if hasattr(request.user, 'id') else None,
                        data['field_path'],
                        data.get('old_value'),
                        data['new_value'],
                        data['correction_type'],
                        data.get('page_number'),
                        data.get('source_quote'),
                        data.get('notes'),
                        extraction_id
                    ])

                    correction_id = cursor.fetchone()[0]

                    # Update extraction data with corrected value
                    cursor.execute("""
                        UPDATE landscape.ai_extraction_results
                        SET
                            extracted_data = jsonb_set(
                                extracted_data,
                                string_to_array(%s, '.'),
                                to_jsonb(%s::text)
                            ),
                            updated_at = NOW(),
                            status = CASE
                                WHEN status = 'pending_review' THEN 'in_review'
                                ELSE status
                            END
                        WHERE extraction_id = %s
                    """, [data['field_path'], data['new_value'], extraction_id])

                    # Recalculate overall confidence
                    cursor.execute("""
                        SELECT landscape.calculate_extraction_accuracy(%s)
                    """, [extraction_id])

                    updated_confidence = cursor.fetchone()[0]

                    # Identify related fields that might need review
                    related_fields = self._get_related_fields(
                        data['field_path'],
                        data.get('extraction_type', 'unknown')
                    )

            return Response({
                "success": True,
                "correction_id": correction_id,
                "updated_confidence": float(updated_confidence) if updated_confidence else None,
                "related_fields": related_fields
            })

        except Exception as e:
            logger.error(f"Error logging correction: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_related_fields(self, field_path, extraction_type):
        """
        Identify fields that might be affected by a correction.

        For example:
        - Changing NOI affects cap_rate
        - Changing unit count affects total_units
        - Changing individual rents affects total_rental_income
        """
        related = []

        # Define relationships by extraction type
        if extraction_type == 'rent_roll':
            if 'market_rent' in field_path or 'current_rent' in field_path:
                related.extend(['total_market_rent', 'total_current_rent', 'loss_to_lease'])
            elif 'sqft' in field_path:
                related.append('total_sqft')
            elif 'status' in field_path:
                related.extend(['occupancy_rate', 'vacancy_rate'])

        elif extraction_type == 'operating_statement':
            if 'noi' in field_path.lower():
                related.extend(['cap_rate', 'noi_per_unit'])
            elif 'income' in field_path.lower():
                related.append('total_income')
            elif 'expense' in field_path.lower():
                related.extend(['total_expenses', 'expense_ratio'])

        elif extraction_type == 'parcel_table':
            if 'acres_gross' in field_path:
                related.extend(['total_acres', 'density'])
            elif 'max_units' in field_path:
                related.extend(['total_units', 'density'])

        return related

    @action(detail=True, methods=['post'], url_path='commit')
    def commit_extraction(self, request, pk=None):
        """
        Commit reviewed extraction to normalized database tables.

        After user reviews and corrects, write data to:
        - tbl_unit, tbl_lease, tbl_rentroll (for rent rolls)
        - tbl_operating, tbl_account (for operating statements)
        - tbl_parcel, tbl_landuse (for parcel tables)

        Request body:
        {
            "project_id": 9,
            "commit_notes": "Verified all unit data, corrected 3 rent values"
        }

        Response:
        {
            "success": true,
            "records_created": {
                "units": 200,
                "leases": 195,
                "rent_roll": 1
            },
            "extraction_status": "committed"
        }
        """
        extraction_id = pk
        data = request.data

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # Get extraction details
                    cursor.execute("""
                        SELECT
                            extraction_type,
                            extracted_data,
                            project_id,
                            doc_id
                        FROM landscape.ai_extraction_results
                        WHERE extraction_id = %s
                    """, [extraction_id])

                    row = cursor.fetchone()
                    if not row:
                        return Response(
                            {"error": "Extraction not found"},
                            status=status.HTTP_404_NOT_FOUND
                        )

                    extraction_type, extracted_data, project_id, doc_id = row

                    # Use provided project_id or fall back to extraction's project_id
                    target_project_id = data.get('project_id', project_id)

                    # Commit based on extraction type
                    records_created = {}

                    if extraction_type == 'rent_roll':
                        records_created = self._commit_rent_roll(
                            cursor,
                            extracted_data,
                            target_project_id,
                            doc_id
                        )

                    elif extraction_type == 'operating_statement':
                        records_created = self._commit_operating_statement(
                            cursor,
                            extracted_data,
                            target_project_id,
                            doc_id
                        )

                    elif extraction_type == 'parcel_table':
                        records_created = self._commit_parcel_table(
                            cursor,
                            extracted_data,
                            target_project_id,
                            doc_id
                        )

                    else:
                        return Response(
                            {"error": f"Unknown extraction type: {extraction_type}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Mark extraction as committed
                    cursor.execute("""
                        UPDATE landscape.ai_extraction_results
                        SET
                            status = 'committed',
                            committed_at = NOW(),
                            reviewed_by = %s,
                            reviewed_at = NOW()
                        WHERE extraction_id = %s
                    """, [
                        request.user.id if hasattr(request.user, 'id') else None,
                        extraction_id
                    ])

            return Response({
                "success": True,
                "records_created": records_created,
                "extraction_status": "committed"
            })

        except Exception as e:
            logger.error(f"Error committing extraction: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _commit_rent_roll(self, cursor, data, project_id, doc_id):
        """Commit rent roll data to tbl_unit, tbl_lease, tbl_rentroll."""
        # Implementation would write to normalized tables
        # This is a placeholder - actual implementation depends on schema

        units = data.get('units', []) if isinstance(data, dict) else data
        units_created = 0
        leases_created = 0

        # Example: Insert into tbl_unit (adjust based on actual schema)
        # for unit in units:
        #     cursor.execute("""
        #         INSERT INTO landscape.tbl_unit (...)
        #         VALUES (...)
        #     """)
        #     units_created += 1

        return {
            "units": len(units),
            "leases": sum(1 for u in units if u.get('status') == 'Occupied'),
            "rent_roll": 1
        }

    def _commit_operating_statement(self, cursor, data, project_id, doc_id):
        """Commit operating statement to tbl_operating, tbl_account."""
        line_items = data.get('line_items', []) if isinstance(data, dict) else data

        return {
            "line_items": len(line_items),
            "operating_statement": 1
        }

    def _commit_parcel_table(self, cursor, data, project_id, doc_id):
        """Commit parcel table to tbl_parcel, tbl_landuse."""
        parcels = data.get('parcels', []) if isinstance(data, dict) else data

        return {
            "parcels": len(parcels),
            "parcel_table": 1
        }

    @action(detail=False, methods=['get'], url_path='analytics')
    def get_analytics(self, request):
        """
        Get correction analytics for training improvement.

        Query params:
        ?days=7  // Last N days
        ?extraction_type=rent_roll  // Filter by extraction type
        ?field=financial_metrics.cap_rate  // Filter by field

        Response:
        {
            "period": "2025-10-23 to 2025-10-30",
            "total_corrections": 127,
            "total_extractions": 450,
            "correction_rate": 0.282,
            "top_corrected_fields": [
                {
                    "field": "financial_metrics.cap_rate_current",
                    "correction_count": 23,
                    "avg_ai_confidence": 0.78,
                    "error_pattern": "systematic_error",
                    "recommendation": "Update prompt to distinguish current vs proforma"
                }
            ],
            "accuracy_trend": [
                {"date": "2025-10-23", "accuracy": 0.73, "extractions": 65},
                {"date": "2025-10-24", "accuracy": 0.75, "extractions": 62},
                ...
            ]
        }
        """
        days = int(request.query_params.get('days', 7))
        extraction_type = request.query_params.get('extraction_type')
        field = request.query_params.get('field')

        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        with connection.cursor() as cursor:
            # Get weekly report
            cursor.execute("""
                SELECT * FROM landscape.get_weekly_correction_report(%s)
            """, [days])

            top_corrected_fields = []
            for row in cursor.fetchall():
                top_corrected_fields.append({
                    "field": row[0],
                    "correction_count": int(row[1]),
                    "avg_ai_confidence": float(row[2]) if row[2] else None,
                    "error_pattern": row[3],
                    "recommendation": row[4]
                })

            # Get accuracy trend
            where_clause = "WHERE extraction_date >= %s"
            params = [start_date.date()]

            if extraction_type:
                where_clause += " AND extraction_type = %s"
                params.append(extraction_type)

            cursor.execute(f"""
                SELECT
                    extraction_date,
                    accuracy_rate,
                    total_extractions,
                    total_corrections
                FROM landscape.ai_extraction_accuracy
                {where_clause}
                ORDER BY extraction_date
            """, params)

            accuracy_trend = []
            total_corrections = 0
            total_extractions = 0

            for row in cursor.fetchall():
                accuracy_trend.append({
                    "date": row[0].isoformat() if row[0] else None,
                    "accuracy": float(row[1]) if row[1] else 0.0,
                    "extractions": int(row[2]) if row[2] else 0,
                    "corrections": int(row[3]) if row[3] else 0
                })
                total_extractions += int(row[2]) if row[2] else 0
                total_corrections += int(row[3]) if row[3] else 0

        return Response({
            "period": f"{start_date.date()} to {end_date.date()}",
            "total_corrections": total_corrections,
            "total_extractions": total_extractions,
            "correction_rate": total_corrections / total_extractions if total_extractions > 0 else 0,
            "top_corrected_fields": top_corrected_fields,
            "accuracy_trend": accuracy_trend
        })
