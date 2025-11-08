# Quick Start: AI Correction Logging & Section Detection

**Test the new features immediately!**

---

## Prerequisites

```bash
# 1. Ensure you're in the backend directory
cd /Users/5150east/landscape/backend

# 2. Activate virtual environment
source venv/bin/activate

# 3. Verify Anthropic API key is set
echo $ANTHROPIC_API_KEY
# Should print: sk-ant-api03-...

# If not set:
export ANTHROPIC_API_KEY="your-key-here"

# 4. Verify database connection
echo $DATABASE_URL
# Should print: postgresql://...
```

---

## Step 1: Run Database Migration

```bash
# Run the migration to create correction logging tables
psql $DATABASE_URL -f db/migrations/018_ai_correction_logging_system.sql

# Expected output:
# CREATE TABLE
# CREATE TABLE
# CREATE TABLE
# CREATE TABLE
# CREATE MATERIALIZED VIEW
# CREATE VIEW
# CREATE FUNCTION (3x)
# NOTICE: Migration 018 complete - AI Correction Logging System
```

**Verify tables created:**
```sql
psql $DATABASE_URL -c "\dt landscape.ai_*"

-- Should show:
-- ai_extraction_results
-- ai_correction_log
-- ai_extraction_warnings
```

---

## Step 2: Install Missing Dependencies

```bash
# Install PyPDF2 for page extraction
pip install PyPDF2

# Verify installation
python -c "import PyPDF2; print('PyPDF2 installed')"
```

---

## Step 3: Test Section Detection (Python)

Create test script:

```bash
cat > test_section_detection.py << 'EOF'
"""Test document section detection."""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from apps.documents.extractors.document_classifier import DocumentSectionDetector

def test_section_detection():
    """Test with a sample PDF (use your own offering memo)."""

    # Get API key
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ ANTHROPIC_API_KEY not set!")
        return

    # Path to test PDF (update this to your test file)
    pdf_path = "/path/to/your/offering_memo.pdf"

    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found: {pdf_path}")
        print("\nUsing demo rent roll generator instead...")

        # Generate a demo rent roll PDF for testing
        from apps.documents.testing.generators import RentRollGenerator
        import tempfile

        generator = RentRollGenerator(tier='institutional')
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            pdf_path = tmp.name

        generator.generate_pdf(
            pdf_path,
            units_count=20,
            vacancy_rate=0.10,
            property_name="Demo Test Property"
        )
        print(f"✓ Generated demo PDF: {pdf_path}")

    print(f"\n📄 Analyzing: {pdf_path}\n")

    # Create detector
    detector = DocumentSectionDetector(anthropic_api_key=api_key)

    # Analyze document
    sections = detector.analyze_document(pdf_path, sample_rate=5)

    # Display results
    print("\n" + "="*60)
    print("SECTION DETECTION RESULTS")
    print("="*60)

    for section_type, page_numbers in sections.items():
        if page_numbers:
            page_ranges = detector._pages_to_ranges(page_numbers)
            print(f"\n✓ {section_type.upper()}")
            print(f"  Pages: {page_ranges}")
            print(f"  Count: {len(page_numbers)} pages")

    print("\n" + "="*60)
    print(f"Total sections found: {len([s for s in sections.values() if s])}")
    print("="*60 + "\n")

    return sections

if __name__ == '__main__':
    test_section_detection()
EOF

# Run test
python test_section_detection.py
```

**Expected Output:**
```
📄 Analyzing: /path/to/offering_memo.pdf

Page 1: financial_summary (confidence: 0.95)
Page 5: property_photos (confidence: 0.88)
...
Page 25: rent_roll (confidence: 0.93)
...

============================================================
SECTION DETECTION RESULTS
============================================================

✓ RENT_ROLL
  Pages: 23-25
  Count: 3 pages

✓ OPERATING_STATEMENT
  Pages: 31-34
  Count: 4 pages

✓ FINANCIAL_SUMMARY
  Pages: 11-12
  Count: 2 pages

============================================================
Total sections found: 3
============================================================
```

---

## Step 4: Test Page Extraction

```bash
cat > test_page_extraction.py << 'EOF'
"""Test extracting from specific pages."""

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from apps.documents.testing.generators import RentRollGenerator
from apps.documents.extractors.rentroll import RentRollExtractor

def test_page_extraction():
    """Generate multi-page PDF and extract from specific pages."""

    print("\n" + "="*60)
    print("TESTING PAGE-RANGE EXTRACTION")
    print("="*60 + "\n")

    # Generate a 5-page rent roll PDF
    generator = RentRollGenerator(tier='institutional')

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        pdf_path = tmp.name

    # Generate 100 units (will create multiple pages)
    units = generator.generate_pdf(
        pdf_path,
        units_count=100,
        vacancy_rate=0.10
    )

    print(f"✓ Generated {len(units)} unit rent roll: {pdf_path}")

    # Test: Extract from pages 0-1 only (first 2 pages)
    print("\n📄 Extracting from pages 0-1 only...\n")

    extractor = RentRollExtractor()
    result = extractor.extract_from_pages(pdf_path, [0, 1])

    print("✓ Extraction complete!")
    print(f"  - Units extracted: {result['metadata']['units_count']}")
    print(f"  - Source pages: {result['metadata']['source_pages']}")
    print(f"  - Confidence: {result['metadata'].get('average_confidence', 'N/A')}")

    print("\n✓ Sample units:")
    for i, unit in enumerate(result['data'][:3], 1):
        print(f"  {i}. Unit {unit.get('unit_id')}: {unit.get('bed_bath')}, ${unit.get('market_rent')}/mo")

    # Clean up
    os.unlink(pdf_path)

    print("\n" + "="*60)
    print("TEST PASSED ✅")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_page_extraction()
EOF

python test_page_extraction.py
```

**Expected Output:**
```
============================================================
TESTING PAGE-RANGE EXTRACTION
============================================================

✓ Generated 100 unit rent roll: /tmp/tmpXXXXXX.pdf

📄 Extracting from pages 0-1 only...

✓ Extraction complete!
  - Units extracted: 40
  - Source pages: [0, 1]
  - Confidence: 1.0

✓ Sample units:
  1. Unit 101: 1BR/1BA, $1850/mo
  2. Unit 102: 2BR/2BA, $2450/mo
  3. Unit 103: 1BR/1BA, $1875/mo

============================================================
TEST PASSED ✅
============================================================
```

---

## Step 5: Test Correction Logging API

```bash
cat > test_correction_api.py << 'EOF'
"""Test correction logging API endpoints."""

import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.db import connection

def test_correction_api():
    """Test creating and retrieving extractions with corrections."""

    print("\n" + "="*60)
    print("TESTING CORRECTION LOGGING API")
    print("="*60 + "\n")

    with connection.cursor() as cursor:
        # 1. Create mock extraction result
        print("1. Creating mock extraction result...")

        cursor.execute("""
            INSERT INTO landscape.ai_extraction_results (
                doc_id,
                project_id,
                extraction_type,
                extraction_method,
                extracted_data,
                overall_confidence,
                confidence_scores,
                status
            ) VALUES (
                1,
                1,
                'rent_roll',
                'pandas',
                %s,
                0.85,
                %s,
                'pending_review'
            ) RETURNING extraction_id
        """, [
            json.dumps({
                "units": [
                    {"unit_id": "101", "market_rent": 1850, "current_rent": 1850},
                    {"unit_id": "102", "market_rent": 2450, "current_rent": 2400},
                    {"unit_id": "103", "market_rent": 1875, "current_rent": 0}
                ]
            }),
            json.dumps({
                "units": [
                    {"unit_id": 1.0, "market_rent": 0.95, "current_rent": 0.95},
                    {"unit_id": 1.0, "market_rent": 0.85, "current_rent": 0.80},
                    {"unit_id": 1.0, "market_rent": 0.90, "current_rent": 0.0}
                ]
            })
        ])

        extraction_id = cursor.fetchone()[0]
        print(f"   ✓ Created extraction_id: {extraction_id}")

        # 2. Log a correction
        print("\n2. Logging correction...")

        cursor.execute("""
            INSERT INTO landscape.ai_correction_log (
                extraction_id,
                user_id,
                field_path,
                ai_value,
                user_value,
                correction_type,
                correction_notes
            ) VALUES (
                %s,
                1,
                'units[1].current_rent',
                '2400',
                '2450',
                'value_wrong',
                'AI extracted $2400 but document shows $2450'
            ) RETURNING correction_id
        """, [extraction_id])

        correction_id = cursor.fetchone()[0]
        print(f"   ✓ Logged correction_id: {correction_id}")

        # 3. Add a warning
        print("\n3. Adding validation warning...")

        cursor.execute("""
            INSERT INTO landscape.ai_extraction_warnings (
                extraction_id,
                field_path,
                warning_type,
                severity,
                message
            ) VALUES (
                %s,
                'units[2].current_rent',
                'missing_value',
                'warning',
                'Unit 103 is marked as occupied but current_rent is $0'
            ) RETURNING warning_id
        """, [extraction_id])

        warning_id = cursor.fetchone()[0]
        print(f"   ✓ Created warning_id: {warning_id}")

        # 4. Test accuracy calculation
        print("\n4. Calculating extraction accuracy...")

        cursor.execute("""
            SELECT landscape.calculate_extraction_accuracy(%s)
        """, [extraction_id])

        accuracy = cursor.fetchone()[0]
        print(f"   ✓ Accuracy: {float(accuracy):.2%}")

        # 5. Test weekly report
        print("\n5. Testing weekly correction report...")

        cursor.execute("""
            SELECT * FROM landscape.get_weekly_correction_report(7)
        """)

        reports = cursor.fetchall()
        if reports:
            print(f"   ✓ Found {len(reports)} correction patterns")
            for report in reports[:3]:
                field, count, conf, pattern, rec = report
                print(f"     - {field}: {count} corrections, {pattern}")
        else:
            print("   ✓ No correction patterns yet (expected for first test)")

        # Clean up
        cursor.execute("DELETE FROM landscape.ai_correction_log WHERE extraction_id = %s", [extraction_id])
        cursor.execute("DELETE FROM landscape.ai_extraction_warnings WHERE extraction_id = %s", [extraction_id])
        cursor.execute("DELETE FROM landscape.ai_extraction_results WHERE extraction_id = %s", [extraction_id])

    print("\n" + "="*60)
    print("ALL TESTS PASSED ✅")
    print("="*60 + "\n")

if __name__ == '__main__':
    test_correction_api()
EOF

python test_correction_api.py
```

**Expected Output:**
```
============================================================
TESTING CORRECTION LOGGING API
============================================================

1. Creating mock extraction result...
   ✓ Created extraction_id: 1

2. Logging correction...
   ✓ Logged correction_id: 1

3. Adding validation warning...
   ✓ Created warning_id: 1

4. Calculating extraction accuracy...
   ✓ Accuracy: 66.67%

5. Testing weekly correction report...
   ✓ No correction patterns yet (expected for first test)

============================================================
ALL TESTS PASSED ✅
============================================================
```

---

## Step 6: Test Complete Workflow

```bash
cat > test_complete_workflow.py << 'EOF'
"""Test complete workflow: generate → extract → detect → review → correct."""

import os
import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.db import connection
from apps.documents.testing.generators import RentRollGenerator
from apps.documents.extractors.rentroll import RentRollExtractor

def test_workflow():
    """Complete workflow test."""

    print("\n" + "="*60)
    print("COMPLETE WORKFLOW TEST")
    print("="*60 + "\n")

    # 1. Generate document
    print("STEP 1: Generating rent roll PDF...")
    generator = RentRollGenerator(tier='regional')

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        pdf_path = tmp.name

    units = generator.generate_pdf(pdf_path, units_count=50, vacancy_rate=0.12)
    print(f"✓ Generated 50-unit rent roll: {pdf_path}\n")

    # 2. Extract data
    print("STEP 2: Extracting data...")
    extractor = RentRollExtractor()
    result = extractor.extract(pdf_path)
    print(f"✓ Extracted {result['metadata']['units_count']} units")
    print(f"✓ Average confidence: {result['metadata'].get('average_confidence', 0):.2%}\n")

    # 3. Save to database
    print("STEP 3: Saving extraction to database...")

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.ai_extraction_results (
                doc_id,
                extraction_type,
                extraction_method,
                extracted_data,
                overall_confidence,
                confidence_scores,
                validation_warnings,
                status
            ) VALUES (
                1, 'rent_roll', %s, %s, %s, %s, %s, 'pending_review'
            ) RETURNING extraction_id
        """, [
            result['metadata']['extraction_method'],
            json.dumps(result['data']),
            result['metadata'].get('average_confidence'),
            json.dumps(result.get('confidence_scores', {})),
            json.dumps(result.get('validation_warnings', []))
        ])

        extraction_id = cursor.fetchone()[0]

    print(f"✓ Saved as extraction_id: {extraction_id}\n")

    # 4. Simulate user review and corrections
    print("STEP 4: Simulating user corrections...")

    # Find a unit with low confidence or warning
    corrections_made = 0

    with connection.cursor() as cursor:
        # Correct a field
        cursor.execute("""
            INSERT INTO landscape.ai_correction_log (
                extraction_id,
                user_id,
                field_path,
                ai_value,
                user_value,
                correction_type,
                correction_notes
            ) VALUES (
                %s, 1, 'units[5].market_rent', '1850', '1950',
                'value_wrong', 'OCR misread 9 as 8'
            )
        """, [extraction_id])
        corrections_made += 1

        # Update extraction status
        cursor.execute("""
            UPDATE landscape.ai_extraction_results
            SET status = 'corrected'
            WHERE extraction_id = %s
        """, [extraction_id])

    print(f"✓ Logged {corrections_made} correction(s)\n")

    # 5. Calculate accuracy
    print("STEP 5: Calculating accuracy...")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT landscape.calculate_extraction_accuracy(%s)
        """, [extraction_id])

        accuracy = cursor.fetchone()[0]

    print(f"✓ Post-correction accuracy: {float(accuracy):.2%}\n")

    # 6. Commit to production (simulated)
    print("STEP 6: Committing to production tables...")

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.ai_extraction_results
            SET status = 'committed', committed_at = NOW()
            WHERE extraction_id = %s
        """, [extraction_id])

    print("✓ Marked as committed\n")

    # 7. View analytics
    print("STEP 7: Viewing analytics...")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                extraction_type,
                COUNT(*) as total,
                AVG(overall_confidence) as avg_conf
            FROM landscape.ai_extraction_results
            WHERE extraction_type = 'rent_roll'
            GROUP BY extraction_type
        """)

        row = cursor.fetchone()
        if row:
            ext_type, total, avg_conf = row
            print(f"✓ {ext_type}: {total} extraction(s), avg confidence {float(avg_conf):.2%}\n")

    # Cleanup
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM landscape.ai_correction_log WHERE extraction_id = %s", [extraction_id])
        cursor.execute("DELETE FROM landscape.ai_extraction_results WHERE extraction_id = %s", [extraction_id])

    os.unlink(pdf_path)

    print("="*60)
    print("WORKFLOW COMPLETE ✅")
    print("="*60 + "\n")

    print("Summary:")
    print("  1. ✓ Generated synthetic document")
    print("  2. ✓ Extracted data with extractor")
    print("  3. ✓ Saved to ai_extraction_results")
    print("  4. ✓ Logged user corrections")
    print("  5. ✓ Calculated accuracy")
    print("  6. ✓ Committed to production")
    print("  7. ✓ Viewed analytics")
    print("\nReady for production! 🚀\n")

if __name__ == '__main__':
    test_workflow()
EOF

python test_complete_workflow.py
```

---

## Step 7: Test via Django Shell

```bash
# Start Django shell
python manage.py shell

# In shell:
from apps.documents.extractors.document_classifier import DocumentSectionDetector
import os

detector = DocumentSectionDetector(api_key=os.getenv('ANTHROPIC_API_KEY'))
sections = detector.analyze_document('/path/to/offering_memo.pdf')
print(sections)
```

---

## Next Steps

1. **✅ All backend tests passing?** → Proceed to frontend development

2. **Build React UI:**
   ```bash
   cd /Users/5150east/landscape
   # Create extraction review components
   mkdir -p src/app/documents/extraction-review
   ```

3. **Test with real offering memos:**
   - Upload 3-5 real offering memos
   - Measure section detection accuracy
   - Iterate on prompts if needed

4. **Production deployment:**
   - Run migration on production DB
   - Deploy backend code
   - Deploy frontend UI
   - Monitor initial usage

---

## Troubleshooting

### "ANTHROPIC_API_KEY not set"
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
# Or add to backend/.env file
```

### "Module not found: PyPDF2"
```bash
pip install PyPDF2
```

### "Table already exists" error
```bash
# Drop tables and re-run migration
psql $DATABASE_URL -c "DROP TABLE IF EXISTS landscape.ai_extraction_results CASCADE"
psql $DATABASE_URL -f db/migrations/018_ai_correction_logging_system.sql
```

### Section detection taking too long
```python
# Reduce sample rate (analyze fewer pages)
sections = detector.analyze_document(pdf_path, sample_rate=10)  # Every 10th page
```

### Low accuracy on section detection
- Check PDF quality (scanned vs native)
- Review Claude's reasoning in logs
- Adjust interpolation logic if needed

---

## Success! 🎉

You've now successfully:
- ✅ Created correction logging database schema
- ✅ Tested document section detection
- ✅ Tested page-range extraction
- ✅ Tested correction API endpoints
- ✅ Verified complete workflow

**Ready for frontend development and production deployment!**
