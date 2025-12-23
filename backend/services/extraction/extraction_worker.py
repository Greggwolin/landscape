"""
Background worker for processing document extraction queue.
"""

from typing import Dict, List, Any, Optional
from apps.documents.models import Document, DMSExtractQueue, DMSAssertion
from .document_classifier import DocumentClassifier
from .rent_roll_extractor import RentRollExtractor
from .pdf_rent_roll_extractor import PDFRentRollExtractor
import json
from datetime import datetime
from django.utils import timezone
import tempfile
import requests
import os


def _download_remote_file(url: str, doc_name: str) -> Optional[str]:
    """
    Download a remote file to a temporary location.
    Returns the local file path or None if download fails.
    """
    try:
        # Determine file extension from doc_name
        ext = os.path.splitext(doc_name)[1] if doc_name else ''
        if not ext:
            # Try to guess from URL or default to .tmp
            ext = '.tmp'

        # Create temp file with appropriate extension
        temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
        os.close(temp_fd)

        print(f"Downloading {url} to {temp_path}")

        response = requests.get(url, timeout=60)
        response.raise_for_status()

        with open(temp_path, 'wb') as f:
            f.write(response.content)

        print(f"Downloaded {len(response.content)} bytes")
        return temp_path

    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return None


def _is_pdf_document(doc: Document) -> bool:
    """
    Determine if document is a PDF based on mime_type or doc_name.
    """
    # Check mime_type first
    if doc.mime_type and 'pdf' in doc.mime_type.lower():
        return True

    # Check doc_name extension
    if doc.doc_name and doc.doc_name.lower().endswith('.pdf'):
        return True

    # Check storage_uri extension (fallback)
    if doc.storage_uri and doc.storage_uri.lower().endswith('.pdf'):
        return True

    return False


def _is_excel_document(doc: Document) -> bool:
    """
    Determine if document is an Excel file based on mime_type or doc_name.
    """
    excel_mimes = ['spreadsheet', 'excel', 'xlsx', 'xls']
    excel_exts = ['.xlsx', '.xls', '.csv']

    # Check mime_type
    if doc.mime_type:
        for mime in excel_mimes:
            if mime in doc.mime_type.lower():
                return True

    # Check doc_name extension
    if doc.doc_name:
        for ext in excel_exts:
            if doc.doc_name.lower().endswith(ext):
                return True

    return False


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
        temp_file_path = None
        try:
            # Update status
            job.status = 'processing'
            job.processed_at = timezone.now()
            job.save()

            # Get document
            doc = Document.objects.get(doc_id=int(job.doc_id))
            storage_uri = doc.storage_uri

            print(f"Processing job {job.queue_id}: {doc.doc_name} ({doc.mime_type})")
            print(f"  Storage URI: {storage_uri}")

            # Determine if file is remote (HTTP/HTTPS URL)
            is_remote = storage_uri.startswith('http://') or storage_uri.startswith('https://')

            if is_remote:
                # Download remote file to temp location
                temp_file_path = _download_remote_file(storage_uri, doc.doc_name)
                if not temp_file_path:
                    raise Exception(f"Failed to download file from {storage_uri}")
                file_path = temp_file_path
            else:
                # Use local file path directly
                file_path = storage_uri

            # Determine file type using mime_type/doc_name (not URL extension)
            if _is_pdf_document(doc):
                print(f"  Detected PDF document, using PDF extractor")
                extraction_result = pdf_extractor.extract(file_path)
                doc_type = 'rent_roll'
            elif _is_excel_document(doc):
                print(f"  Detected Excel/CSV document, using Excel extractor")
                extraction_result = excel_extractor.extract(file_path, {})
                doc_type = 'rent_roll'
                doc.doc_type = doc_type
                doc.save()
            else:
                # Default to PDF extractor for unknown types
                print(f"  Unknown document type, trying PDF extractor")
                extraction_result = pdf_extractor.extract(file_path)
                doc_type = 'general'

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

            # Extract raw_text before cleaning (it's not in extracted_data JSONB)
            raw_text = extraction_result.pop('raw_text', None)

            job.extracted_data = clean_nan(extraction_result)

            # Store raw text separately in the extracted_text column
            if raw_text:
                job.extracted_text = raw_text

            job.save()

            # Update document status
            doc.status = 'indexed'
            doc.save()

            print(f"Successfully processed job {job.queue_id}")

        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.processed_at = timezone.now()
            job.save()

            if 'doc' in locals():
                doc.status = 'failed'
                doc.save()

            print(f"Error processing job {job.queue_id}: {e}")

        finally:
            # Clean up temp file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                    print(f"Cleaned up temp file: {temp_file_path}")
                except Exception as cleanup_error:
                    print(f"Failed to clean up temp file: {cleanup_error}")


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
