# DMS AI Document Extraction System

## Overview

The Document Management System (DMS) is an AI-powered extraction pipeline that parses real estate documents (rent rolls, operating statements, parcel tables) and populates normalized database tables with confidence scoring.

**Key Innovation**: Uses confidence scoring to identify data gaps and intelligently prompt users, rather than hallucinating missing data.

## Architecture

```
backend/apps/documents/
├── testing/
│   └── generators/          # Synthetic document generators
│       ├── base.py          # BaseDocumentGenerator
│       ├── rentroll.py      # RentRollGenerator
│       ├── operating.py     # OperatingStatementGenerator
│       └── parcel_table.py  # ParcelTableGenerator
├── extractors/              # AI extraction engines
│   ├── base.py              # BaseExtractor
│   ├── rentroll.py          # RentRollExtractor
│   ├── operating.py         # OperatingExtractor
│   └── parcel_table.py      # ParcelTableExtractor
├── specs/
│   ├── headers/             # YAML header mappings
│   │   ├── rentroll_headers.yaml
│   │   ├── operating_headers.yaml
│   │   └── parcel_headers.yaml
│   └── validators/          # YAML validation rules
│       ├── rentroll_v1.yaml
│       ├── operating_v1.yaml
│       └── parcel_v1.yaml
├── models.py                # Django ORM models
├── admin.py                 # Django Admin interface
└── views.py                 # API endpoints
```

## Quick Start

### 1. Generate Synthetic Test Documents

```python
from apps.documents.testing.generators import RentRollGenerator, OperatingStatementGenerator, ParcelTableGenerator

# Generate rent roll
generator = RentRollGenerator(tier='institutional', seed=42)
units_data = generator.generate_pdf(
    output_path='/tmp/test_rentroll.pdf',
    units_count=200,
    vacancy_rate=0.05,
    property_name="Test Property",
    address="123 Main St, Phoenix, AZ"
)

# Generate answer key for validation
generator.generate_answer_key(
    output_path='/tmp/test_rentroll_answers.csv',
    units_data=units_data
)

# Generate Excel version
generator.generate_excel(
    output_path='/tmp/test_rentroll.xlsx',
    units_count=200,
    vacancy_rate=0.05
)

# Generate operating statement
op_generator = OperatingStatementGenerator(tier='institutional', seed=42)
op_data = op_generator.generate_pdf(
    output_path='/tmp/test_operating.pdf',
    units=200,
    property_name="Test Property"
)

# Generate parcel table
parcel_generator = ParcelTableGenerator(tier='institutional', seed=42)
parcel_data = parcel_generator.generate_pdf(
    output_path='/tmp/test_parcels.pdf',
    parcel_count=20,
    property_name="Test MPC"
)
```

### 2. Extract Data from Documents

```python
from apps.documents.extractors import RentRollExtractor, OperatingExtractor, ParcelTableExtractor

# Extract rent roll
extractor = RentRollExtractor()
result = extractor.extract('/tmp/test_rentroll.pdf')

print(f"Extracted {result['metadata']['units_count']} units")
print(f"Confidence scores: {result['confidence_scores']}")
print(f"Validation warnings: {result['validation_warnings']}")

# Access extracted data
for unit in result['data']:
    print(f"Unit {unit['unit_id']}: {unit['bed_bath']}, ${unit['current_rent']}/mo")
```

### 3. Document Tiers

Three tiers of document quality simulate real-world scenarios:

#### Institutional Tier
- **Confidence**: 95%+
- **Formatting**: Professional, borders, alternating rows
- **Data Quality**: Complete, itemized, minimal typos (1%)
- **Example**: CBRE, JLL, Cushman rent rolls

#### Regional Tier
- **Confidence**: 85%+
- **Formatting**: Mixed quality, inconsistent borders
- **Data Quality**: Mostly complete, some missing fields (10%), moderate typos (3%)
- **Example**: Local property management firms

#### Owner-Generated Tier
- **Confidence**: 75%+
- **Formatting**: Basic, no borders, courier fonts
- **Data Quality**: Lumped categories, missing data (20%), frequent typos (5%)
- **Example**: Small landlord Excel spreadsheets

## Generator API Reference

### BaseDocumentGenerator

All generators inherit from this base class.

```python
class BaseDocumentGenerator:
    def __init__(self, tier='institutional', seed=None):
        """
        Args:
            tier: 'institutional', 'regional', or 'owner_generated'
            seed: Random seed for reproducibility
        """

    def add_typos(self, text, typo_rate=0.02):
        """Add realistic typos by transposing adjacent letters"""

    def get_formatting_quirks(self):
        """Return tier-appropriate formatting parameters"""
```

### RentRollGenerator

```python
from apps.documents.testing.generators import RentRollGenerator

generator = RentRollGenerator(tier='institutional', seed=42)

# Generate PDF
units_data = generator.generate_pdf(
    output_path='/path/to/output.pdf',
    units_count=200,                  # Number of units
    vacancy_rate=0.05,                # 5% vacancy
    property_name="Property Name",
    address="Address Line"
)

# Generate Excel
units_data = generator.generate_excel(
    output_path='/path/to/output.xlsx',
    units_count=200,
    vacancy_rate=0.05
)

# Generate answer key
generator.generate_answer_key(
    output_path='/path/to/answers.csv',
    units_data=units_data
)
```

**Generated Fields**:
- `unit_id`: Unit number (e.g., "101", "102")
- `type`: Bed/bath configuration (e.g., "1BR/1BA")
- `sqft`: Square footage
- `market_rent`: Market rent amount
- `actual_rent`: Current rent (0 if vacant)
- `lease_start`: Lease start date (MM/DD/YYYY)
- `lease_end`: Lease end date (MM/DD/YYYY)
- `tenant_name`: Tenant name (Last, F. format)
- `deposit`: Security deposit amount
- `status`: "Occupied" or "Vacant"
- `notes`: Special notes (e.g., "MTM", "Concession: 1 month free")

### OperatingStatementGenerator

```python
from apps.documents.testing.generators import OperatingStatementGenerator

generator = OperatingStatementGenerator(tier='institutional', seed=42)

operating_data = generator.generate_pdf(
    output_path='/path/to/output.pdf',
    units=200,                        # Number of units
    property_name="Property Name"
)

# Excel version
operating_data = generator.generate_excel(
    output_path='/path/to/output.xlsx',
    units=200
)

# Answer key
generator.generate_answer_key(
    output_path='/path/to/answers.csv',
    operating_data=operating_data
)
```

**Generated Sections**:
- **Revenue**:
  - Gross Potential Rent
  - Vacancy & Credit Loss
  - Net Rental Income
  - Laundry Income (itemized for tier 1/2)
  - Parking Income
  - Pet Fees
  - Late Fees
  - Other Income
  - Effective Gross Income
- **Expenses**:
  - Real Estate Taxes
  - Property Insurance
  - Utilities (itemized for institutional)
  - Repairs & Maintenance
  - Contract Services
  - Administrative
  - Marketing & Leasing
  - Payroll
  - Management Fee
  - Reserves for Replacement
- **NOI**: Net Operating Income

### ParcelTableGenerator

```python
from apps.documents.testing.generators import ParcelTableGenerator

generator = ParcelTableGenerator(tier='institutional', seed=42)

parcel_data = generator.generate_pdf(
    output_path='/path/to/output.pdf',
    parcel_count=20,                  # Number of parcels
    property_name="MPC Name"
)

# Excel version
parcel_data = generator.generate_excel(
    output_path='/path/to/output.xlsx',
    parcel_count=20
)

# Answer key
generator.generate_answer_key(
    output_path='/path/to/answers.csv',
    parcels_data=parcel_data
)
```

**Generated Fields**:
- `parcel_id`: Parcel identifier (e.g., "1.101")
- `land_use_code`: Zoning code (VLDR, LDR, MDR, HDR, RET, OFF, MU, OS, PARK)
- `land_use_name`: Full land use name
- `acres_gross`: Gross acreage
- `acres_net`: Net developable acreage
- `max_units`: Maximum dwelling units
- `density`: Units per acre
- `phase`: Development phase (1, 2, 3)
- `notes`: Additional notes (e.g., "TBD - Subject to approval")

## Extractor API Reference

### RentRollExtractor

```python
from apps.documents.extractors import RentRollExtractor

extractor = RentRollExtractor()
result = extractor.extract('/path/to/rentroll.pdf')  # or .xlsx, .csv

# Result structure
{
    'data': [
        {
            'unit_id': '101',
            'bed_bath': '1BR/1BA',
            'sqft': 750,
            'market_rent': 1800,
            'current_rent': 1750,
            'lease_start': '01/15/2024',
            'lease_end': '01/14/2025',
            'tenant_name': 'Smith, J.',
            'status': 'Occupied',
            'notes': ''
        },
        # ... more units
    ],
    'confidence_scores': [
        {
            'unit_id': 1.0,
            'market_rent': 0.95,
            'current_rent': 0.95,
            'sqft': 0.90
        },
        # ... per unit
    ],
    'validation_warnings': [
        {
            'field': 'current_rent',
            'severity': 'warning',
            'message': 'Current rent exceeds market rent'
        }
    ],
    'metadata': {
        'units_count': 200,
        'extraction_method': 'pdfplumber'
    }
}
```

### OperatingExtractor

```python
from apps.documents.extractors import OperatingExtractor

extractor = OperatingExtractor()
result = extractor.extract('/path/to/operating.pdf')

# Result structure
{
    'data': [
        {
            'account_name': 'Gross Potential Rent',
            'amount': 2850000,
            'per_unit': 14250
        },
        # ... more line items
    ],
    'confidence_scores': [ ... ],
    'validation_warnings': [ ... ],
    'metadata': {
        'line_items_count': 25,
        'extraction_method': 'pdfplumber'
    }
}
```

### ParcelTableExtractor

```python
from apps.documents.extractors import ParcelTableExtractor

extractor = ParcelTableExtractor()
result = extractor.extract('/path/to/parcels.pdf')

# Result structure
{
    'data': [
        {
            'parcel_id': '1.101',
            'land_use': 'MDR - Medium Density Residential',
            'acres_gross': 15.5,
            'acres_net': 14.2,
            'max_units': 120,
            'density': 8.5,
            'phase': '1'
        },
        # ... more parcels
    ],
    'confidence_scores': [ ... ],
    'validation_warnings': [ ... ],
    'metadata': {
        'parcels_count': 20,
        'extraction_method': 'pdfplumber'
    }
}
```

## Confidence Scoring

Confidence scores range from 0.0 to 1.0:

| Score | Meaning | Action |
|-------|---------|--------|
| 1.0 | Perfect extraction | Auto-approve |
| 0.85-0.99 | High confidence | Quick review |
| 0.70-0.84 | Medium confidence | Careful review |
| 0.50-0.69 | Low confidence | Flag for user |
| < 0.50 | Very low/missing | Prompt user |

**Confidence reduction factors**:
- Missing value: 0.0
- Out of range: ×0.7
- Non-numeric text in number field: ×0.5
- MTM lease dates: ×0.9
- Vacant unit rent: 0.0 (expected)

## Validation Rules

### Rent Roll

**Required Fields**:
- `unit_id` (error)

**Logical Checks**:
- `current_rent <= market_rent` (warning)
- `(current_rent > 0 and status == 'Occupied') or (current_rent == 0 and status == 'Vacant')` (error)

**Range Checks**:
- `sqft`: 300-5,000
- `market_rent`: $500-$10,000
- `current_rent`: $0-$10,000

### Operating Statement

**Required Fields**:
- `account_name` (error)
- `amount` (error)

**Range Checks**:
- `amount`: $0-$100,000,000

### Parcel Table

**Required Fields**:
- `parcel_id` (error)
- `acres_gross` (error)

**Logical Checks**:
- `acres_net <= acres_gross` (error)

**Range Checks**:
- `acres_gross`: 0.1-10,000
- `acres_net`: 0.1-10,000
- `density`: 0-100 DU/ac

## Testing

Run the comprehensive test suite:

```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
pytest apps/documents/tests/ -v
```

### Basic Test

```python
import tempfile
from apps.documents.testing.generators import RentRollGenerator
from apps.documents.extractors import RentRollExtractor

# Generate test document
generator = RentRollGenerator(tier='institutional', seed=42)
with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
    pdf_path = tmp.name
    units_data = generator.generate_pdf(pdf_path, units_count=50, vacancy_rate=0.05)

# Extract
extractor = RentRollExtractor()
result = extractor.extract(pdf_path)

# Validate
assert result['metadata']['units_count'] == 50
assert len(result['data']) == 50

# Check confidence
avg_confidence = sum(
    sum(scores.values()) / len(scores)
    for scores in result['confidence_scores']
) / len(result['confidence_scores'])

assert avg_confidence >= 0.90  # Institutional tier should be >90%
```

## Database Integration

The existing models in `apps/documents/models.py` support the DMS workflow:

- **Document**: Main document record (maps to `core_doc`)
- **DMSExtractQueue**: Extraction job queue
- **DMSAssertion**: Individual extracted data points
- **AICorrectionLog**: User corrections for AI learning

### Example Workflow

```python
from apps.documents.models import Document, DMSExtractQueue
from apps.documents.extractors import RentRollExtractor

# 1. Upload document
doc = Document.objects.create(
    project_id=7,
    doc_name='rent_roll_oct_2024.pdf',
    doc_type='rent_roll',
    mime_type='application/pdf',
    file_size_bytes=245000,
    storage_uri='s3://bucket/path/to/file.pdf',
    status='draft'
)

# 2. Queue extraction
queue_item = DMSExtractQueue.objects.create(
    doc_id=doc.doc_id,
    extract_type='rent_roll',
    priority=5,
    status='pending'
)

# 3. Process extraction
extractor = RentRollExtractor()
result = extractor.extract(doc.storage_uri)

# 4. Save extracted data
doc.profile_json = result
doc.status = 'indexed'
doc.save()

queue_item.status = 'completed'
queue_item.extracted_data = result
queue_item.save()
```

## Next Steps

1. **Django Admin Interface**: Build review UI for extracted data
2. **Commit Logic**: Implement transaction-safe write to normalized tables
3. **Duplicate Detection**: Check for existing documents before import
4. **Anthropic Claude Integration**: Use Claude API for AI-assisted extraction of complex layouts
5. **User Feedback Loop**: Track corrections via `AICorrectionLog` to improve extraction

## File Locations

All code is located in:
```
/Users/5150east/landscape/backend/apps/documents/
```

## Dependencies

All required packages are installed:
- pdfplumber>=0.11.0
- camelot-py>=0.11.0
- reportlab>=4.0.0
- Faker>=20.0.0
- PyYAML>=6.0.0
- pandas>=2.3.0
- openpyxl>=3.1.0

## Support

For issues or questions, see:
- Main project: `/Users/5150east/landscape/`
- Backend: `/Users/5150east/landscape/backend/`
- Documentation: `/Users/5150east/landscape/docs/`
