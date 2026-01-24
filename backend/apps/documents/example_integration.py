"""
Example integration showing how DMS extraction connects to Django models.

This demonstrates the complete workflow:
1. Document upload
2. Queue extraction job
3. Process extraction
4. Save results to database
5. Track user corrections
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Django setup (if running as standalone script)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.documents.models import Document, DMSExtractQueue, DMSAssertion, AICorrectionLog
from apps.projects.models import Project
from apps.documents.extractors.rentroll import RentRollExtractor
from apps.documents.extractors.operating import OperatingExtractor
from apps.documents.extractors.parcel_table import ParcelTableExtractor


def example_rent_roll_workflow(project_id, file_path):
    """
    Complete rent roll extraction workflow

    Args:
        project_id: Project ID
        file_path: Path to rent roll PDF/Excel
    """
    print("="*80)
    print("RENT ROLL EXTRACTION WORKFLOW")
    print("="*80)

    # Step 1: Create Document record
    print("\n1. Creating document record...")

    # Calculate file metadata
    file_size = os.path.getsize(file_path)
    file_name = os.path.basename(file_path)

    # Determine mime type
    ext = Path(file_path).suffix.lower()
    mime_types = {
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.csv': 'text/csv'
    }
    mime_type = mime_types.get(ext, 'application/octet-stream')

    # Check for duplicates
    existing = Document.objects.filter(
        project_id=project_id,
        doc_name=file_name
    ).first()

    if existing:
        print(f"   ⚠️  Document already exists (uploaded {existing.created_at})")
        response = input("   Re-import and replace? (y/n): ")
        if response.lower() != 'y':
            print("   Aborted.")
            return

        # Mark old document as archived
        existing.status = 'archived'
        existing.save()

    # Create new document
    doc = Document.objects.create(
        project_id=project_id,
        doc_name=file_name,
        doc_type='rent_roll',
        mime_type=mime_type,
        file_size_bytes=file_size,
        sha256_hash='placeholder_hash',  # Would compute actual hash in production
        storage_uri=file_path,
        status='draft',
        created_by=1,  # Would use request.user.id in production
        profile_json={}
    )

    print(f"   ✓ Document created: doc_id={doc.doc_id}")

    # Step 2: Queue extraction
    print("\n2. Queueing extraction job...")

    queue_item = DMSExtractQueue.objects.create(
        doc_id=doc.doc_id,
        extract_type='rent_roll',
        priority=5,
        status='pending'
    )

    print(f"   ✓ Queue item created: queue_id={queue_item.queue_id}")

    # Step 3: Process extraction
    print("\n3. Processing extraction...")

    queue_item.status = 'processing'
    queue_item.save()

    try:
        extractor = RentRollExtractor()
        result = extractor.extract(file_path)

        print(f"   ✓ Extracted {result['metadata']['units_count']} units")
        print(f"   ✓ Method: {result['metadata']['extraction_method']}")

        # Calculate statistics
        avg_confidence = 0
        if result['confidence_scores']:
            confidences = [
                sum(scores.values()) / len(scores) if scores else 0
                for scores in result['confidence_scores']
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        print(f"   ✓ Avg confidence: {avg_confidence:.2%}")
        print(f"   ✓ Warnings: {len(result['validation_warnings'])}")

        # Step 4: Save to database
        print("\n4. Saving extraction results...")

        # Save to Document.profile_json (audit trail)
        doc.profile_json = result
        doc.status = 'indexed'
        doc.save()

        print(f"   ✓ Saved to Document.profile_json")

        # Save individual data points as assertions
        assertion_count = 0
        for unit in result['data']:
            # Create assertion for current rent
            if 'current_rent' in unit:
                DMSAssertion.objects.create(
                    project_id=project_id,
                    doc_id=str(doc.doc_id),
                    subject_type='unit',
                    subject_ref=unit.get('unit_id'),
                    metric_key='current_rent',
                    value_num=unit.get('current_rent'),
                    units='USD',
                    context='monthly',
                    confidence=result['confidence_scores'][assertion_count].get('current_rent', 0) if assertion_count < len(result['confidence_scores']) else 0,
                    source='ai_extraction',
                    as_of_date=datetime.now().date()
                )
                assertion_count += 1

        print(f"   ✓ Created {assertion_count} assertions")

        # Update queue item
        queue_item.status = 'completed'
        queue_item.extracted_data = result
        queue_item.processed_at = datetime.now()
        queue_item.save()

        print(f"   ✓ Queue item marked complete")

        # Step 5: Display results for review
        print("\n5. Extraction Results (first 5 units):")
        print(f"   {'Unit':<10} {'Type':<12} {'Market':<10} {'Current':<10} {'Status':<10} {'Confidence'}")
        print("   " + "-"*70)

        for i, unit in enumerate(result['data'][:5]):
            conf = ''
            if i < len(result['confidence_scores']):
                scores = result['confidence_scores'][i]
                if scores:
                    conf = f"{sum(scores.values())/len(scores):.0%}"

            print(f"   {unit.get('unit_id', 'N/A'):<10} "
                  f"{unit.get('bed_bath', 'N/A'):<12} "
                  f"${unit.get('market_rent', 0):<9,} "
                  f"${unit.get('current_rent', 0):<9,} "
                  f"{unit.get('status', 'N/A'):<10} "
                  f"{conf}")

        if len(result['data']) > 5:
            print(f"   ... and {len(result['data']) - 5} more units")

        # Display warnings
        if result['validation_warnings']:
            print("\n6. Validation Warnings:")
            for warning in result['validation_warnings'][:5]:
                print(f"   [{warning['severity'].upper()}] {warning['message']}")
            if len(result['validation_warnings']) > 5:
                print(f"   ... and {len(result['validation_warnings']) - 5} more warnings")

        print("\n✅ Extraction complete. Ready for user review.")
        print(f"\n   Next steps:")
        print(f"   - Review extracted data in Django admin")
        print(f"   - Correct any errors (tracked in AICorrectionLog)")
        print(f"   - Commit to normalized tables (tbl_unit, tbl_lease)")

        return doc, result

    except Exception as e:
        print(f"\n   ❌ Extraction failed: {str(e)}")

        queue_item.status = 'failed'
        queue_item.error_message = str(e)
        queue_item.attempts += 1
        queue_item.save()

        doc.status = 'failed'
        doc.save()

        return None, None


def example_user_correction(extraction_result_id, unit_id, field, ai_value, user_value):
    """
    Track user correction for AI learning

    Args:
        extraction_result_id: ID of the extraction result
        unit_id: Unit identifier
        field: Field that was corrected
        ai_value: What AI extracted
        user_value: User's correction
    """
    print("\n" + "="*80)
    print("TRACKING USER CORRECTION")
    print("="*80)

    correction = AICorrectionLog.objects.create(
        extraction_result_id=extraction_result_id,
        user_id=1,  # Would use request.user.id
        project_id=7,
        field_path=f"data[{unit_id}].{field}",
        ai_value=str(ai_value),
        user_value=str(user_value),
        correction_type='value_wrong' if ai_value != user_value else 'field_missing'
    )

    print(f"✓ Correction logged: correction_id={correction.correction_id}")
    print(f"  Field: {field}")
    print(f"  AI said: {ai_value}")
    print(f"  User corrected to: {user_value}")

    return correction


def main():
    """Demo the integration"""
    print("\n" + "="*80)
    print("DMS INTEGRATION EXAMPLE")
    print("="*80)
    print("\nThis example shows how DMS extraction integrates with Django models.")
    print("\nNOTE: This is a demonstration. In production, you would:")
    print("  - Compute actual SHA256 hashes")
    print("  - Use S3 storage URIs")
    print("  - Handle authentication properly")
    print("  - Implement full transaction rollback")
    print("  - Add Django admin review interface")

    # Generate a test document
    print("\n" + "="*80)
    print("GENERATING TEST DOCUMENT")
    print("="*80)

    from apps.documents.testing.generators import RentRollGenerator
    import tempfile

    generator = RentRollGenerator(tier='institutional', seed=42)

    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        test_file = tmp.name

    print(f"\nGenerating rent roll: {test_file}")
    generator.generate_excel(test_file, units_count=20, vacancy_rate=0.10)
    print("✓ Test document generated")

    # Run extraction workflow
    # NOTE: Using project_id=7 as an example
    doc, result = example_rent_roll_workflow(project_id=7, file_path=test_file)

    if doc and result:
        # Simulate user correction
        example_user_correction(
            extraction_result_id=doc.doc_id,
            unit_id='101',
            field='current_rent',
            ai_value=1795,
            user_value=1800
        )

    # Cleanup
    if os.path.exists(test_file):
        os.unlink(test_file)
        print(f"\n✓ Cleaned up test file")

    print("\n" + "="*80)
    print("INTEGRATION EXAMPLE COMPLETE")
    print("="*80)


if __name__ == '__main__':
    # Check if running with Django
    try:
        from apps.projects.models import Project
        main()
    except Exception as e:
        print(f"\nError: {e}")
        print("\nThis script requires Django to be configured.")
        print("Run from Django shell or ensure DJANGO_SETTINGS_MODULE is set.")
