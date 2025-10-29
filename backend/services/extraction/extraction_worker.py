"""
Background worker for processing document extraction queue.
"""

from typing import Dict, List, Any
from apps.documents.models import Document, DMSExtractQueue, DMSAssertion
from .document_classifier import DocumentClassifier
from .rent_roll_extractor import RentRollExtractor
from .pdf_rent_roll_extractor import PDFRentRollExtractor
import json
from datetime import datetime
from django.utils import timezone


def process_extraction_queue():
    """
    Background worker to process queued extractions
    Can be called via cron job or Celery task
    """

    # Get pending jobs
    pending_jobs = DMSExtractQueue.objects.filter(
        status='pending'
    ).order_by('-priority', 'created_at')[:5]

    classifier = DocumentClassifier()
    excel_extractor = RentRollExtractor()
    pdf_extractor = PDFRentRollExtractor()

    for job in pending_jobs:
        try:
            # Update status
            job.status = 'processing'
            job.processed_at = timezone.now()
            job.save()

            # Get document
            doc = Document.objects.get(doc_id=int(job.doc_id))
            file_path = doc.storage_uri

            # Determine file type and extract
            print(f"Processing job {job.queue_id}: {file_path}")

            if file_path.lower().endswith('.pdf'):
                # PDF extraction
                extraction_result = pdf_extractor.extract(file_path)
                doc_type = 'rent_roll'
            else:
                # Excel/CSV extraction
                extraction_result = excel_extractor.extract(file_path, {})
                doc_type = 'rent_roll'

                # Update document type
                doc.doc_type = doc_type
                doc.save()

            # Check for extraction errors
            if 'error' in extraction_result:
                job.status = 'failed'
                job.error_message = extraction_result['error']
                job.save()

                doc.status = 'failed'
                doc.save()
                continue

            # Store assertions
            _store_assertions(doc.doc_id, doc.project_id, extraction_result)

            # Update job - Clean NaN values before saving as JSON
            import math
            def clean_nan(obj):
                if isinstance(obj, dict):
                    return {k: clean_nan(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_nan(v) for v in obj]
                elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                    return None
                return obj

            job.status = 'completed'
            job.processed_at = timezone.now()
            job.extracted_data = clean_nan(extraction_result)
            job.save()

            # Update document status
            doc.status = 'indexed'
            doc.save()

        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.processed_at = timezone.now()
            job.save()

            if 'doc' in locals():
                doc.status = 'failed'
                doc.save()

            print(f"Error processing job {job.queue_id}: {e}")


def _store_assertions(doc_id: int, project_id: int, extraction_result: Dict):
    """
    Store extraction results as assertions for review
    """
    from apps.projects.models import Project
    assertions_to_create = []

    # Get project instance
    project = Project.objects.get(project_id=project_id)

    # Store unit types
    for idx, unit_type in enumerate(extraction_result['unit_types']):
        assertions_to_create.append(DMSAssertion(
            project=project,
            doc_id=str(doc_id),
            subject_type='unit_type',
            metric_key=f'unit_type_{idx}',
            value_text=json.dumps(unit_type),
            confidence=unit_type.get('confidence', 0.9),
            source='rent_roll_extractor',
            created_at=timezone.now()
        ))

    # Store units
    for idx, unit in enumerate(extraction_result['units']):
        assertions_to_create.append(DMSAssertion(
            project=project,
            doc_id=str(doc_id),
            subject_type='unit',
            metric_key=f'unit_{unit["unit_number"]}',
            value_text=json.dumps(unit),
            confidence=unit.get('confidence', 0.9),
            source='rent_roll_extractor',
            created_at=timezone.now()
        ))

    # Store leases
    for idx, lease in enumerate(extraction_result['leases']):
        assertions_to_create.append(DMSAssertion(
            project=project,
            doc_id=str(doc_id),
            subject_type='lease',
            metric_key=f'lease_{lease["unit_number"]}',
            value_text=json.dumps(lease),
            confidence=lease.get('confidence', 0.9),
            source='rent_roll_extractor',
            created_at=timezone.now()
        ))

    # Bulk create
    DMSAssertion.objects.bulk_create(assertions_to_create)


def _get_mock_extraction_data():
    """Return mock rent roll data for testing without API key"""
    return {
        'unit_types': [
            {'unit_type_code': '1BR-A', 'bedrooms': 1, 'bathrooms': 1, 'avg_square_feet': 650, 'current_market_rent': 1250, 'total_units': 10},
            {'unit_type_code': '2BR-B', 'bedrooms': 2, 'bathrooms': 2, 'avg_square_feet': 950, 'current_market_rent': 1650, 'total_units': 8},
            {'unit_type_code': '3BR-C', 'bedrooms': 3, 'bathrooms': 2, 'avg_square_feet': 1200, 'current_market_rent': 2100, 'total_units': 5},
        ],
        'units': [
            {'unit_number': '101', 'unit_type': '1BR-A', 'square_feet': 650, 'market_rent': 1250},
            {'unit_number': '102', 'unit_type': '1BR-A', 'square_feet': 650, 'market_rent': 1250},
            {'unit_number': '201', 'unit_type': '2BR-B', 'square_feet': 950, 'market_rent': 1650},
            {'unit_number': '202', 'unit_type': '2BR-B', 'square_feet': 950, 'market_rent': 1650},
            {'unit_number': '301', 'unit_type': '3BR-C', 'square_feet': 1200, 'market_rent': 2100},
        ],
        'leases': [
            {'unit_id': None, 'unit_number': '101', 'resident_name': 'John Doe', 'lease_status': 'ACTIVE', 'base_rent_monthly': 1250, 'lease_start_date': '2024-01-01', 'lease_end_date': '2024-12-31'},
            {'unit_id': None, 'unit_number': '102', 'resident_name': 'Jane Smith', 'lease_status': 'ACTIVE', 'base_rent_monthly': 1250, 'lease_start_date': '2024-02-01', 'lease_end_date': '2025-01-31'},
            {'unit_id': None, 'unit_number': '201', 'resident_name': 'Bob Johnson', 'lease_status': 'ACTIVE', 'base_rent_monthly': 1650, 'lease_start_date': '2024-03-01', 'lease_end_date': '2025-02-28'},
        ],
        'quality_score': 0.95,
        'extraction_metadata': {
            'source_type': 'mock_data',
            'processing_time_seconds': 0.1
        }
    }
