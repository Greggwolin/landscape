# DMS AI Document Extraction System - File Index

**Quick Navigation**: This index helps you find what you need quickly.

---

## 📚 Start Here

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [QUICK_START.md](./QUICK_START.md) | 5-minute getting started guide | First time using the system |
| [DMS_README.md](./DMS_README.md) | Complete API reference | Looking up how to use a specific feature |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | What was built and why | Understanding the architecture and design decisions |

---

## 🎯 Common Tasks

### I want to...

**Generate synthetic documents for testing**
→ See [DMS_README.md - Generator API Reference](./DMS_README.md#generator-api-reference)
→ Example: `python demo_extraction.py`

**Extract data from a document**
→ See [DMS_README.md - Extractor API Reference](./DMS_README.md#extractor-api-reference)
→ Example code in [QUICK_START.md](./QUICK_START.md#3-try-it-yourself)

**Understand confidence scores**
→ See [DMS_README.md - Confidence Scoring](./DMS_README.md#confidence-scoring)

**Integrate with Django models**
→ See [example_integration.py](./example_integration.py)
→ See [DMS_README.md - Database Integration](./DMS_README.md#database-integration)

**Run tests**
→ `pytest apps/documents/tests/ -v`
→ See [tests/test_basic_extraction.py](./tests/test_basic_extraction.py)

**Add a new document type**
→ See [IMPLEMENTATION_SUMMARY.md - Architecture](./IMPLEMENTATION_SUMMARY.md#file-structure)
→ Copy existing generator/extractor as template

**Customize header mappings**
→ Edit YAML files in [specs/headers/](./specs/headers/)
→ See [DMS_README.md - Validation Rules](./DMS_README.md#validation-rules)

**Add validation rules**
→ Edit YAML files in [specs/validators/](./specs/validators/)
→ See [DMS_README.md - Validation Rules](./DMS_README.md#validation-rules)

---

## 📁 File Organization

### Documentation
```
backend/apps/documents/
├── INDEX.md                          ← You are here
├── QUICK_START.md                    ← 5-minute guide
├── DMS_README.md                     ← Complete API docs (520 lines)
├── IMPLEMENTATION_SUMMARY.md         ← Architecture & design (450 lines)
└── example_integration.py            ← Django integration example
```

### Core Code
```
backend/apps/documents/
├── testing/generators/               ← Document generators
│   ├── base.py                      ← Base class
│   ├── rentroll.py                  ← Rent roll generator
│   ├── operating.py                 ← Operating statement generator
│   └── parcel_table.py              ← Parcel table generator
├── extractors/                       ← Extraction engines
│   ├── base.py                      ← Base class
│   ├── rentroll.py                  ← Rent roll extractor
│   ├── operating.py                 ← Operating extractor
│   └── parcel_table.py              ← Parcel extractor
├── specs/                            ← YAML configurations
│   ├── headers/                     ← Header mappings
│   └── validators/                  ← Validation rules
└── tests/                            ← Test suite
    └── test_basic_extraction.py     ← 15+ test cases
```

### Utilities
```
backend/apps/documents/
├── demo_extraction.py                ← Demo script
├── example_integration.py            ← Integration example
├── models.py                         ← Django models (existing)
├── admin.py                          ← Django admin (existing)
└── views.py                          ← API views (existing)
```

---

## 🔍 By Document Type

### Rent Roll
- **Generator**: [testing/generators/rentroll.py](./testing/generators/rentroll.py)
- **Extractor**: [extractors/rentroll.py](./extractors/rentroll.py)
- **Headers**: [specs/headers/rentroll_headers.yaml](./specs/headers/rentroll_headers.yaml)
- **Validation**: [specs/validators/rentroll_v1.yaml](./specs/validators/rentroll_v1.yaml)
- **API Docs**: [DMS_README.md - RentRollGenerator](./DMS_README.md#rentrollgenerator)

### Operating Statement
- **Generator**: [testing/generators/operating.py](./testing/generators/operating.py)
- **Extractor**: [extractors/operating.py](./extractors/operating.py)
- **Headers**: [specs/headers/operating_headers.yaml](./specs/headers/operating_headers.yaml)
- **Validation**: [specs/validators/operating_v1.yaml](./specs/validators/operating_v1.yaml)
- **API Docs**: [DMS_README.md - OperatingStatementGenerator](./DMS_README.md#operatingstatementgenerator)

### Parcel Table
- **Generator**: [testing/generators/parcel_table.py](./testing/generators/parcel_table.py)
- **Extractor**: [extractors/parcel_table.py](./extractors/parcel_table.py)
- **Headers**: [specs/headers/parcel_headers.yaml](./specs/headers/parcel_headers.yaml)
- **Validation**: [specs/validators/parcel_v1.yaml](./specs/validators/parcel_v1.yaml)
- **API Docs**: [DMS_README.md - ParcelTableGenerator](./DMS_README.md#parceltablegenerator)

---

## 🧪 Testing

### Run All Tests
```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
pytest apps/documents/tests/ -v
```

### Run Specific Tests
```bash
# Rent roll tests only
pytest apps/documents/tests/test_basic_extraction.py::TestRentRollExtraction -v

# Tier-specific tests
pytest apps/documents/tests/test_basic_extraction.py::TestMultipleTiers -v
```

### Run Demo
```bash
python apps/documents/demo_extraction.py
```

### Test Files
- [tests/test_basic_extraction.py](./tests/test_basic_extraction.py) - Main test suite
- [demo_extraction.py](./demo_extraction.py) - Interactive demo

---

## 🏗️ Architecture

### Component Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    DMS AI Extraction System                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼───────┐
        │   Generators   │          │  Extractors  │
        │   (Testing)    │          │   (AI/ML)    │
        └───────┬────────┘          └──────┬───────┘
                │                           │
        ┌───────▼────────┐          ┌──────▼───────┐
        │  PDF/Excel/CSV │          │ pdfplumber   │
        │   Documents    │◄─────────┤   camelot    │
        └────────────────┘          │   pandas     │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ Confidence   │
                                    │  Scoring     │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ YAML-driven  │
                                    │ Validation   │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │   Django     │
                                    │   Models     │
                                    └──────────────┘
```

### Data Flow
```
1. Upload Document
   └─> Document record created (core_doc)

2. Queue Extraction
   └─> DMSExtractQueue record created

3. Process Extraction
   ├─> Extractor parses PDF/Excel/CSV
   ├─> Headers canonicalized via YAML
   ├─> Confidence scores calculated
   └─> Validation rules applied

4. Save Results
   ├─> Document.profile_json (audit trail)
   └─> DMSAssertion records (normalized)

5. User Review (future)
   ├─> Admin grid shows extracted data
   ├─> User corrects errors
   └─> AICorrectionLog tracks changes

6. Commit (future)
   └─> Write to normalized tables
       ├─> tbl_unit, tbl_lease (rent roll)
       ├─> tbl_operating, tbl_account (operating)
       └─> tbl_parcel, tbl_landuse (parcels)
```

---

## 🎓 Learning Path

### Beginner (First Day)
1. Read [QUICK_START.md](./QUICK_START.md)
2. Run `python demo_extraction.py`
3. Try the usage examples in QUICK_START

### Intermediate (First Week)
1. Read [DMS_README.md](./DMS_README.md) - API Reference section
2. Run `pytest apps/documents/tests/ -v`
3. Generate your own test documents
4. Extract and review results

### Advanced (First Month)
1. Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
2. Study [example_integration.py](./example_integration.py)
3. Customize YAML specs for your use case
4. Add validation rules
5. Extend generators for new document types

---

## 🔗 External Documentation

### Project Documentation
- [Project-level DMS README](../../../docs/02-features/dms/README.md)
- [Session Notes](../../../docs/09_session_notes/2025-10-30-dms-ai-extraction-implementation.md)

### Django Models
- [models.py](./models.py) - Document, DMSExtractQueue, DMSAssertion, AICorrectionLog

### Database Schema
- [Database Schema Docs](../../../docs/05-database/DATABASE_SCHEMA.md)

---

## 🆘 Troubleshooting

### Common Issues

**"Unmapped header" warnings**
→ Add header variations to [specs/headers/](./specs/headers/) YAML files

**Low confidence scores**
→ Check [DMS_README.md - Confidence Scoring](./DMS_README.md#confidence-scoring)
→ Review validation warnings in extraction result

**PDF extraction fails**
→ Check if image-based PDF (needs camelot)
→ See [IMPLEMENTATION_SUMMARY.md - Known Issues](./IMPLEMENTATION_SUMMARY.md#known-issues--resolutions)

**Tests failing**
→ Ensure dependencies installed: `pip install -r requirements.txt`
→ Check virtual environment is activated

**Import errors**
→ Run from backend directory: `cd /Users/5150east/landscape/backend`
→ Check Python path includes parent directory

---

## 📊 Quick Reference

### Key Concepts

| Concept | Description | Document |
|---------|-------------|----------|
| **Confidence Score** | 0.0-1.0 score per field indicating extraction certainty | [DMS_README.md](./DMS_README.md#confidence-scoring) |
| **Document Tier** | Quality level (Institutional/Regional/Owner-Generated) | [DMS_README.md](./DMS_README.md#document-tiers) |
| **Header Canonicalization** | Mapping document headers to standard field names | [DMS_README.md](./DMS_README.md#extractor-api-reference) |
| **Validation Rules** | YAML-defined checks for data quality | [DMS_README.md](./DMS_README.md#validation-rules) |
| **Answer Key** | Ground truth CSV for accuracy measurement | [DMS_README.md](./DMS_README.md#generate-documents) |

### File Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*_generator.py` | Document generation | `rentroll.py` |
| `*_extractor.py` | Data extraction | `rentroll.py` |
| `*_headers.yaml` | Header mappings | `rentroll_headers.yaml` |
| `*_v1.yaml` | Validation rules | `rentroll_v1.yaml` |
| `test_*.py` | Test files | `test_basic_extraction.py` |

---

## 🚀 Quick Commands

```bash
# Activate environment
cd /Users/5150east/landscape/backend && source venv/bin/activate

# Run demo
python apps/documents/demo_extraction.py

# Run tests
pytest apps/documents/tests/ -v

# Generate rent roll
python -c "from apps.documents.testing.generators import RentRollGenerator; \
  RentRollGenerator(tier='institutional').generate_pdf('/tmp/test.pdf', units_count=50)"

# Extract data
python -c "from apps.documents.extractors import RentRollExtractor; \
  result = RentRollExtractor().extract('/tmp/test.pdf'); \
  print(f\"Extracted {result['metadata']['units_count']} units\")"
```

---

**Last Updated**: 2025-10-30
**Version**: 1.0.0
**Status**: Core Implementation Complete ✅
