# DMS Quick Start Guide

## 5-Minute Demo

### 1. Run the Demo Script
```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
python apps/documents/demo_extraction.py
```

This will:
- Generate synthetic rent rolls (3 tiers)
- Generate operating statements
- Generate parcel tables
- Extract and display results
- Show confidence scores and warnings

### 2. Run Tests
```bash
pytest apps/documents/tests/test_basic_extraction.py -v
```

### 3. Try It Yourself

```python
# In Django shell or Python script
from apps.documents.testing.generators import RentRollGenerator
from apps.documents.extractors.rentroll import RentRollExtractor
import tempfile

# Generate a rent roll
generator = RentRollGenerator(tier='institutional', seed=42)
pdf_path = '/tmp/my_rentroll.pdf'
units = generator.generate_pdf(pdf_path, units_count=50, vacancy_rate=0.05)

# Extract the data
extractor = RentRollExtractor()
result = extractor.extract(pdf_path)

# View results
print(f"Extracted {result['metadata']['units_count']} units")
for unit in result['data'][:5]:
    print(f"Unit {unit['unit_id']}: ${unit['current_rent']}/mo")
```

## File Locations

- **Documentation**: [DMS_README.md](./DMS_README.md) - Complete API reference
- **Implementation Summary**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What was built
- **Demo Script**: [demo_extraction.py](./demo_extraction.py) - Working examples
- **Tests**: [tests/test_basic_extraction.py](./tests/test_basic_extraction.py) - Test suite

## Common Tasks

### Generate Documents

```python
from apps.documents.testing.generators import (
    RentRollGenerator,
    OperatingStatementGenerator,
    ParcelTableGenerator
)

# Rent Roll
gen = RentRollGenerator(tier='institutional')
gen.generate_pdf('/tmp/rentroll.pdf', units_count=200)
gen.generate_excel('/tmp/rentroll.xlsx', units_count=200)

# Operating Statement
gen = OperatingStatementGenerator(tier='institutional')
gen.generate_pdf('/tmp/operating.pdf', units=200)
gen.generate_excel('/tmp/operating.xlsx', units=200)

# Parcel Table
gen = ParcelTableGenerator(tier='institutional')
gen.generate_pdf('/tmp/parcels.pdf', parcel_count=20)
gen.generate_excel('/tmp/parcels.xlsx', parcel_count=20)
```

### Extract Data

```python
from apps.documents.extractors.rentroll import RentRollExtractor
from apps.documents.extractors.operating import OperatingExtractor
from apps.documents.extractors.parcel_table import ParcelTableExtractor

# Rent Roll
extractor = RentRollExtractor()
result = extractor.extract('/path/to/rentroll.pdf')  # or .xlsx, .csv

# Operating Statement
extractor = OperatingExtractor()
result = extractor.extract('/path/to/operating.pdf')

# Parcel Table
extractor = ParcelTableExtractor()
result = extractor.extract('/path/to/parcels.pdf')
```

### Work with Results

```python
# Result structure
{
    'data': [...],                    # List of extracted records
    'confidence_scores': [...],       # Per-record confidence
    'validation_warnings': [...],     # Validation issues
    'metadata': {...}                 # Extraction metadata
}

# Access data
for unit in result['data']:
    print(unit['unit_id'], unit['current_rent'])

# Check confidence
for scores in result['confidence_scores']:
    avg = sum(scores.values()) / len(scores)
    print(f"Confidence: {avg:.2%}")

# Review warnings
for warning in result['validation_warnings']:
    print(f"[{warning['severity']}] {warning['message']}")
```

## Need Help?

1. **Full API docs**: See [DMS_README.md](./DMS_README.md)
2. **Implementation details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
3. **Working examples**: Run `python demo_extraction.py`
4. **Test examples**: See `tests/test_basic_extraction.py`

## What's Next?

- [ ] Build Django admin review interface
- [ ] Implement commit logic to database
- [ ] Add duplicate detection
- [ ] Integrate Claude API for complex PDFs
- [ ] Add more test cases

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for detailed next steps.
