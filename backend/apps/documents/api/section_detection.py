"""
API endpoints for multi-page document section detection.

Analyzes offering memos and multi-page PDFs to identify:
- Rent rolls
- Operating statements
- Parcel tables
- Site plans
- Financial summaries
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db import transaction, connection
from django.conf import settings
import os
import logging

from ..extractors.document_classifier import DocumentSectionDetector

logger = logging.getLogger(__name__)


class DocumentSectionViewSet(viewsets.ViewSet):
    """
    ViewSet for document section detection and management.

    Endpoints:
    - POST /api/documents/<id>/analyze-sections/ - Analyze document sections
    - GET /api/documents/<id>/sections/ - Get detected sections
    - POST /api/documents/<id>/sections/<section_id>/extract/ - Extract specific section
    """

    @action(detail=True, methods=['post'], url_path='analyze-sections')
    def analyze_sections(self, request, pk=None):
        """
        Analyze a multi-page document to identify sections.

        Request body:
        {
            "sample_rate": 5,  // Optional: analyze every Nth page
            "max_pages": 100   // Optional: limit analysis to first N pages
        }

        Response:
        {
            "document_id": 456,
            "document_name": "Sunset_Ridge_OM.pdf",
            "total_pages": 52,
            "sections_found": {
                "rent_roll": [22, 23, 24],
                "operating_statement": [30, 31, 32, 33],
                "site_plan": [7],
                "financial_summary": [11, 12]
            },
            "section_count": 4,
            "analysis_time_seconds": 12.5
        }
        """
        doc_id = pk
        sample_rate = request.data.get('sample_rate', 5)
        max_pages = request.data.get('max_pages')

        # Get document from database
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT doc_id, doc_name, storage_uri, mime_type
                FROM landscape.core_doc
                WHERE doc_id = %s
            """, [doc_id])

            row = cursor.fetchone()
            if not row:
                return Response(
                    {"error": "Document not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            doc_id, doc_name, storage_uri, mime_type = row

        # Verify it's a PDF
        if mime_type != 'application/pdf':
            return Response(
                {"error": "Only PDF documents can be analyzed for sections"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get file path from storage_uri
        pdf_path = self._resolve_storage_path(storage_uri)

        if not os.path.exists(pdf_path):
            return Response(
                {"error": f"Document file not found: {pdf_path}"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Analyze document
        try:
            import time
            start_time = time.time()

            # Use rule-based detector (NO API KEY REQUIRED)
            detector = DocumentSectionDetector()

            sections = detector.analyze_document(
                pdf_path,
                min_confidence=0.6,  # Confidence threshold for rule-based detection
                sample_rate=1,  # Analyze all pages for better accuracy
                max_pages=max_pages
            )

            analysis_time = time.time() - start_time

            # Save sections to database
            with transaction.atomic():
                with connection.cursor() as cursor:
                    for section_type, page_numbers in sections.items():
                        if not page_numbers:
                            continue

                        start_page = min(page_numbers)
                        end_page = max(page_numbers)

                        cursor.execute("""
                            INSERT INTO landscape.document_sections (
                                doc_id,
                                section_type,
                                start_page,
                                end_page,
                                page_numbers,
                                classification_confidence,
                                classification_method,
                                created_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """, [
                            doc_id,
                            section_type,
                            start_page,
                            end_page,
                            page_numbers,
                            0.75,  # Average confidence for rule-based detection
                            'rule_based'  # Changed from 'claude_vision'
                        ])

            # Get total pages
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)

            return Response({
                "document_id": doc_id,
                "document_name": doc_name,
                "total_pages": total_pages,
                "sections_found": sections,
                "section_count": len([s for s in sections.values() if s]),
                "analysis_time_seconds": round(analysis_time, 2)
            })

        except Exception as e:
            logger.error(f"Section analysis failed for doc {doc_id}: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='sections')
    def get_sections(self, request, pk=None):
        """
        Get previously detected sections for a document.

        Response:
        {
            "document_id": 456,
            "sections": [
                {
                    "section_id": 1,
                    "section_type": "rent_roll",
                    "start_page": 22,
                    "end_page": 24,
                    "page_numbers": [22, 23, 24],
                    "page_count": 3,
                    "confidence": 0.92,
                    "extraction_id": 123,  // If already extracted
                    "created_at": "2025-10-30T10:00:00Z"
                }
            ]
        }
        """
        doc_id = pk

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    section_id,
                    section_type,
                    start_page,
                    end_page,
                    page_numbers,
                    classification_confidence,
                    classification_method,
                    extraction_id,
                    created_at
                FROM landscape.document_sections
                WHERE doc_id = %s
                ORDER BY start_page
            """, [doc_id])

            sections = []
            for row in cursor.fetchall():
                sections.append({
                    "section_id": row[0],
                    "section_type": row[1],
                    "start_page": row[2],
                    "end_page": row[3],
                    "page_numbers": row[4] or [],
                    "page_count": len(row[4]) if row[4] else 0,
                    "confidence": float(row[5]) if row[5] else None,
                    "classification_method": row[6],
                    "extraction_id": row[7],
                    "created_at": row[8].isoformat() if row[8] else None
                })

        return Response({
            "document_id": doc_id,
            "sections": sections
        })

    @action(detail=True, methods=['post'], url_path='sections/(?P<section_id>[0-9]+)/extract')
    def extract_section(self, request, pk=None, section_id=None):
        """
        Extract data from a specific detected section.

        Response:
        {
            "success": true,
            "extraction_id": 123,
            "section_id": 1,
            "extraction_type": "rent_roll",
            "data_preview": {...}
        }
        """
        doc_id = pk

        # Get section details
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    ds.section_type,
                    ds.page_numbers,
                    d.storage_uri,
                    d.project_id
                FROM landscape.document_sections ds
                JOIN landscape.core_doc d ON ds.doc_id = d.doc_id
                WHERE ds.section_id = %s AND ds.doc_id = %s
            """, [section_id, doc_id])

            row = cursor.fetchone()
            if not row:
                return Response(
                    {"error": "Section not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            section_type, page_numbers, storage_uri, project_id = row

        # Get PDF path
        pdf_path = self._resolve_storage_path(storage_uri)

        # Extract based on section type
        try:
            from ..extractors.rentroll import RentRollExtractor
            from ..extractors.operating import OperatingExtractor
            from ..extractors.parcel_table import ParcelTableExtractor

            if section_type == 'rent_roll':
                extractor = RentRollExtractor()
            elif section_type == 'operating_statement':
                extractor = OperatingExtractor()
            elif section_type == 'parcel_table':
                extractor = ParcelTableExtractor()
            else:
                return Response(
                    {"error": f"Cannot extract section type: {section_type}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Extract from pages
            result = extractor.extract_from_pages(pdf_path, page_numbers)

            # Save extraction result
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO landscape.ai_extraction_results (
                            doc_id,
                            project_id,
                            extraction_type,
                            extraction_method,
                            extracted_data,
                            overall_confidence,
                            confidence_scores,
                            validation_warnings,
                            source_pages,
                            page_count,
                            status,
                            created_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                        ) RETURNING extraction_id
                    """, [
                        doc_id,
                        project_id,
                        section_type,
                        result['metadata'].get('extraction_method', 'unknown'),
                        json.dumps(result['data']),
                        result.get('overall_confidence'),
                        json.dumps(result.get('confidence_scores', {})),
                        json.dumps(result.get('validation_warnings', [])),
                        page_numbers,
                        len(page_numbers),
                        'pending_review'
                    ])

                    extraction_id = cursor.fetchone()[0]

                    # Link section to extraction
                    cursor.execute("""
                        UPDATE landscape.document_sections
                        SET extraction_id = %s
                        WHERE section_id = %s
                    """, [extraction_id, section_id])

            return Response({
                "success": True,
                "extraction_id": extraction_id,
                "section_id": section_id,
                "extraction_type": section_type,
                "data_preview": self._create_preview(result['data'], section_type)
            })

        except Exception as e:
            logger.error(f"Extraction failed for section {section_id}: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _resolve_storage_path(self, storage_uri):
        """Convert storage URI to absolute file path."""
        # Handle different storage schemes
        if storage_uri.startswith('file://'):
            return storage_uri[7:]  # Remove 'file://'
        elif storage_uri.startswith('/'):
            return storage_uri  # Already absolute path
        else:
            # Assume relative to media root
            media_root = getattr(settings, 'MEDIA_ROOT', '/tmp')
            return os.path.join(media_root, storage_uri)

    def _create_preview(self, data, extraction_type):
        """Create a preview of extracted data for response."""
        if extraction_type == 'rent_roll':
            units = data if isinstance(data, list) else data.get('units', [])
            return {
                "unit_count": len(units),
                "sample_units": units[:3] if units else []
            }
        elif extraction_type == 'operating_statement':
            line_items = data if isinstance(data, list) else data.get('line_items', [])
            return {
                "line_item_count": len(line_items),
                "sample_items": line_items[:5] if line_items else []
            }
        elif extraction_type == 'parcel_table':
            parcels = data if isinstance(data, list) else data.get('parcels', [])
            return {
                "parcel_count": len(parcels),
                "sample_parcels": parcels[:3] if parcels else []
            }
        else:
            return data


import json
