# Claude Code Implementation Prompt: Rent Roll AI Ingestion System

**Date:** October 24, 2025  
**Session ID:** GR08  
**Priority:** HIGH - Core MVP feature

---

## EXECUTIVE SUMMARY

Build a complete AI-powered rent roll ingestion system that extracts unit, lease, and tenant data from Excel/CSV files, presents results in a staging modal for user review, and populates the multifamily database tables. This is the "killer feature" that demonstrates Landscape's AI capabilities and saves users 2-4 hours of manual data entry per property.

**What This Delivers:**
- Upload rent roll (Excel, CSV, or PDF) → AI extracts data → User reviews → Database populated
- 95%+ extraction accuracy on Excel/CSV, 90%+ on PDFs
- Confidence scoring per field
- User correction tracking for learning
- Market validation & benchmarking
- 85-90% time savings vs manual entry

**Reference Files:**
- `/mnt/user-data/uploads/Chadron_-_Rent_Roll___Tenant_Income_Info_as_of_09_17_2025.xlsx` (sample rent roll)
- `/mnt/user-data/uploads/Chadron_-_Rent_Roll___Delinquency_as_of_09_30_2025_with_September_Rent_Received.xlsx` (sample delinquency data)
- `/tmp/chadron_rent_roll_ingestion_spec.md` (detailed workflow specification)

---

## PROJECT CONTEXT

**Repository:** https://github.com/Greggwolin/landscape  
**Database:** Neon PostgreSQL (landscape schema)  
**Tech Stack:** Django/Python backend, React/Next.js frontend, Material-UI

**Existing Infrastructure:**
- ✅ DMS tables (core_doc, dms_assertions, dms_extract_queue, ai_correction_log)
- ✅ Multifamily tables (tbl_multifamily_unit_type, tbl_multifamily_unit, tbl_multifamily_lease)
- ✅ Django models, serializers, viewsets for CRUD
- ✅ Document storage in blob storage
- ✅ Basic API endpoints at `/api/multifamily/*`

**What's Missing:**
- Document upload with classification
- AI extraction worker
- Staging/review endpoints
- Frontend staging modal UI
- Correction logging integration

---

## IMPLEMENTATION PHASES

### PHASE 1: Backend - Document Upload & Classification

#### 1.1 Create Document Upload Endpoint

**File:** `/backend/api/views/document_views.py`

```python
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from ..models import CoreDoc, DMSExtractQueue
import uuid
from datetime import datetime

@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_document(request):
    """
    Handle document upload for AI extraction
    
    Expected payload:
    - file: The uploaded file (Excel, CSV, PDF)
    - project_id: Associated project ID
    - doc_type: Optional hint (e.g., "rent_roll", "t12", "om")
    
    Supported formats:
    - Excel (.xlsx, .xls)
    - CSV (.csv)
    - PDF (.pdf) - including Offering Memorandums with embedded rent roll tables
    """
    try:
        file = request.FILES.get('file')
        project_id = request.data.get('project_id')
        doc_type_hint = request.data.get('doc_type', None)
        
        if not file or not project_id:
            return Response(
                {'error': 'file and project_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique filename
        ext = file.name.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = f"uploads/{project_id}/{unique_filename}"
        
        # Save to storage
        saved_path = default_storage.save(file_path, file)
        
        # Create CoreDoc record
        doc = CoreDoc.objects.create(
            project_id=project_id,
            workspace_id=request.user.workspace_id,
            filename=file.name,
            file_path=saved_path,
            file_size=file.size,
            mime_type=file.content_type,
            upload_date=datetime.now(),
            uploaded_by=request.user.id,
            doc_type=doc_type_hint or 'unknown',
            extraction_status='pending'
        )
        
        # Queue for extraction
        extract_job = DMSExtractQueue.objects.create(
            doc_id=doc.id,
            extract_type='rent_roll',
            priority=5,
            status='queued',
            queued_at=datetime.now()
        )
        
        return Response({
            'success': True,
            'doc_id': doc.id,
            'extract_job_id': extract_job.queue_id,
            'status': 'queued',
            'message': 'Document uploaded successfully. Extraction will begin shortly.'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

**Route:** Add to `/backend/api/urls.py`
```python
path('documents/upload/', document_views.upload_document, name='upload_document'),
```

#### 1.2 Create Document Classification Service

**File:** `/backend/services/extraction/document_classifier.py`

```python
import anthropic
import os
from typing import Dict, Tuple
import pandas as pd

class DocumentClassifier:
    """
    Classify uploaded documents to determine extraction strategy
    """
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
    
    def classify_excel(self, file_path: str) -> Tuple[str, float, Dict]:
        """
        Classify Excel/CSV file by examining structure
        
        Returns:
            (doc_type, confidence, metadata)
        """
        try:
            # Read first 10 rows to analyze structure
            df = pd.read_excel(file_path, nrows=10)
            
            # Build sample for Claude
            sample_text = f"Columns: {list(df.columns)}\n\n"
            sample_text += "First 5 rows:\n"
            sample_text += df.head(5).to_string()
            
            prompt = f"""Analyze this spreadsheet sample and classify the document type.

{sample_text}

Respond with ONLY a JSON object (no markdown, no explanation):
{{
    "doc_type": "rent_roll" | "t12_operating" | "market_study" | "budget" | "other",
    "confidence": 0.0-1.0,
    "property_type": "multifamily" | "office" | "retail" | "land" | "mixed" | "unknown",
    "reasoning": "brief explanation",
    "metadata": {{
        "has_unit_column": true/false,
        "has_tenant_column": true/false,
        "has_rent_column": true/false,
        "estimated_header_row": 0-10
    }}
}}"""

            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse response
            import json
            response_text = message.content[0].text.strip()
            # Strip markdown if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            result = json.loads(response_text)
            
            return (
                result['doc_type'],
                float(result['confidence']),
                result
            )
            
        except Exception as e:
            print(f"Classification error: {e}")
            return ('unknown', 0.0, {'error': str(e)})
```

---

### PHASE 2: Backend - Rent Roll Extraction Worker

#### 2.1 Create Main Extraction Service

**File:** `/backend/services/extraction/rent_roll_extractor.py`

```python
import pandas as pd
import anthropic
import os
from typing import Dict, List, Optional
from datetime import datetime
import re

class RentRollExtractor:
    """
    Extract structured data from rent roll Excel/CSV files
    """
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
    
    def extract(self, file_path: str, classification_metadata: Dict) -> Dict:
        """
        Main extraction method
        
        Returns:
            {
                'unit_types': [...],
                'units': [...],
                'leases': [...],
                'property_info': {...},
                'quality_score': 0.0-1.0
            }
        """
        # Step 1: Load and preprocess file
        df = self._load_rent_roll(file_path, classification_metadata)
        
        # Step 2: Extract property context from headers
        property_info = self._extract_property_info(file_path)
        
        # Step 3: Parse unit types (BD/BA aggregation)
        unit_types = self._extract_unit_types(df)
        
        # Step 4: Extract individual units
        units = self._extract_units(df)
        
        # Step 5: Extract lease data for occupied units
        leases = self._extract_leases(df)
        
        # Step 6: Validate and score
        validation = self._validate_extraction(unit_types, units, leases)
        
        return {
            'unit_types': unit_types,
            'units': units,
            'leases': leases,
            'property_info': property_info,
            'quality_score': validation['overall_score'],
            'validation_warnings': validation['warnings'],
            'extraction_metadata': {
                'total_units': len(units),
                'occupied_units': len(leases),
                'vacancy_rate': 1 - (len(leases) / len(units)) if len(units) > 0 else 0,
                'extracted_at': datetime.now().isoformat()
            }
        }
    
    def _load_rent_roll(self, file_path: str, metadata: Dict) -> pd.DataFrame:
        """
        Load Excel/CSV with intelligent header detection
        """
        estimated_header = metadata.get('metadata', {}).get('estimated_header_row', 0)
        
        # Try loading with estimated skip rows
        for skip in range(estimated_header, min(estimated_header + 5, 12)):
            try:
                df = pd.read_excel(file_path, skiprows=skip)
                
                # Check if we found the header
                cols_lower = [str(c).lower() for c in df.columns]
                if 'unit' in cols_lower or 'tenant' in cols_lower:
                    # Clean up
                    df.columns = df.columns.str.strip()
                    
                    # Remove summary rows at bottom
                    df = df[df[df.columns[0]].notna()]
                    df = df[~df[df.columns[0]].astype(str).str.contains(
                        'total|summary|TOTAL', case=False, na=False
                    )]
                    
                    return df
            except:
                continue
        
        # Fallback: no skip
        return pd.read_excel(file_path)
    
    def _extract_property_info(self, file_path: str) -> Dict:
        """
        Extract property name, address, report date from header rows
        """
        # Read first 10 rows without skipping
        df_header = pd.read_excel(file_path, nrows=10, header=None)
        
        header_text = ""
        for idx, row in df_header.iterrows():
            header_text += " ".join([str(x) for x in row if pd.notna(x)]) + "\n"
        
        # Use Claude to parse header
        prompt = f"""Extract property information from this rent roll header:

{header_text}

Respond with ONLY a JSON object:
{{
    "property_name": "...",
    "property_address": "...",
    "report_date": "YYYY-MM-DD" or null,
    "confidence": 0.0-1.0
}}"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            import json
            response_text = message.content[0].text.strip()
            if '```' in response_text:
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            return json.loads(response_text)
        except:
            return {'property_name': None, 'property_address': None, 'report_date': None, 'confidence': 0.5}
    
    def _extract_unit_types(self, df: pd.DataFrame) -> List[Dict]:
        """
        Aggregate unit types from BD/BA column
        """
        unit_types = []
        
        # Find BD/BA column (may have different names)
        bdba_col = None
        for col in df.columns:
            if 'bd' in str(col).lower() and 'ba' in str(col).lower():
                bdba_col = col
                break
        
        if not bdba_col:
            return unit_types
        
        # Find sqft and rent columns
        sqft_col = next((c for c in df.columns if 'sqft' in str(c).lower() or 'sf' in str(c).lower()), None)
        rent_col = next((c for c in df.columns if 'rent' in str(c).lower()), None)
        status_col = next((c for c in df.columns if 'status' in str(c).lower()), None)
        
        # Group by BD/BA
        for bdba_value in df[bdba_col].unique():
            if pd.isna(bdba_value) or bdba_value == '--/--':
                continue
            
            # Parse BD/BA
            match = re.match(r'(\d+)[/\s]+(\d+(?:\.\d+)?)', str(bdba_value))
            if not match:
                continue
            
            bedrooms = int(match.group(1))
            bathrooms = float(match.group(2))
            
            # Filter to this type
            type_df = df[df[bdba_col] == bdba_value]
            
            # Calculate average sqft
            avg_sqft = None
            if sqft_col:
                sqft_values = pd.to_numeric(type_df[sqft_col], errors='coerce')
                avg_sqft = sqft_values.mean()
            
            # Calculate market rent from occupied units
            market_rent = None
            if rent_col and status_col:
                occupied = type_df[type_df[status_col].str.contains('current', case=False, na=False)]
                rent_values = pd.to_numeric(
                    occupied[rent_col].astype(str).str.replace(r'[^\d.]', '', regex=True),
                    errors='coerce'
                )
                rent_values = rent_values[(rent_values > 0) & (rent_values < 50000)]  # Filter outliers
                market_rent = rent_values.mean() if len(rent_values) > 0 else None
            
            unit_types.append({
                'bedroom_count': bedrooms,
                'bathroom_count': bathrooms,
                'unit_count': len(type_df),
                'typical_sqft': round(avg_sqft, 0) if avg_sqft else None,
                'market_rent_monthly': round(market_rent, 2) if market_rent else None,
                'confidence': 0.92,
                'sample_size': len(type_df)
            })
        
        return unit_types
    
    def _extract_units(self, df: pd.DataFrame) -> List[Dict]:
        """
        Extract individual unit records
        """
        units = []
        
        # Find key columns
        unit_col = next((c for c in df.columns if 'unit' in str(c).lower()), None)
        bdba_col = next((c for c in df.columns if 'bd' in str(c).lower() and 'ba' in str(c).lower()), None)
        sqft_col = next((c for c in df.columns if 'sqft' in str(c).lower() or 'sf' in str(c).lower()), None)
        status_col = next((c for c in df.columns if 'status' in str(c).lower()), None)
        tags_col = next((c for c in df.columns if 'tag' in str(c).lower()), None)
        
        if not unit_col:
            return units
        
        for idx, row in df.iterrows():
            unit_number = str(row[unit_col])
            
            # Skip header rows that might have slipped through
            if unit_number.lower() in ['unit', 'nan', '']:
                continue
            
            # Parse BD/BA
            bedrooms, bathrooms = None, None
            if bdba_col and pd.notna(row[bdba_col]):
                match = re.match(r'(\d+)[/\s]+(\d+(?:\.\d+)?)', str(row[bdba_col]))
                if match:
                    bedrooms = int(match.group(1))
                    bathrooms = float(match.group(2))
            
            # Parse sqft
            sqft = None
            if sqft_col:
                sqft = pd.to_numeric(row[sqft_col], errors='coerce')
            
            # Determine status
            status = 'unknown'
            if status_col and pd.notna(row[status_col]):
                status_text = str(row[status_col]).lower()
                if 'current' in status_text or 'occupied' in status_text:
                    status = 'occupied'
                elif 'vacant' in status_text:
                    status = 'vacant'
            
            # Check for special tags
            is_commercial = False
            if tags_col and pd.notna(row[tags_col]):
                tags = str(row[tags_col]).lower()
                if 'retail' in tags or 'office' in tags or 'commercial' in tags:
                    is_commercial = True
            
            units.append({
                'unit_number': unit_number,
                'bedroom_count': bedrooms,
                'bathroom_count': bathrooms,
                'square_feet': round(sqft, 0) if sqft else None,
                'status': status,
                'is_commercial': is_commercial,
                'confidence': 0.95
            })
        
        return units
    
    def _extract_leases(self, df: pd.DataFrame) -> List[Dict]:
        """
        Extract lease data for occupied units
        """
        leases = []
        
        # Find columns
        unit_col = next((c for c in df.columns if 'unit' in str(c).lower()), None)
        tenant_col = next((c for c in df.columns if 'tenant' in str(c).lower()), None)
        rent_col = next((c for c in df.columns if 'rent' in str(c).lower() and 'market' not in str(c).lower()), None)
        status_col = next((c for c in df.columns if 'status' in str(c).lower()), None)
        lease_from_col = next((c for c in df.columns if 'lease from' in str(c).lower() or 'start' in str(c).lower()), None)
        lease_to_col = next((c for c in df.columns if 'lease to' in str(c).lower() or 'end' in str(c).lower() or 'expir' in str(c).lower()), None)
        tags_col = next((c for c in df.columns if 'tag' in str(c).lower()), None)
        
        if not (unit_col and tenant_col and rent_col and status_col):
            return leases
        
        # Filter to occupied units
        occupied_df = df[df[status_col].str.contains('current', case=False, na=False)]
        
        for idx, row in occupied_df.iterrows():
            tenant_name = str(row[tenant_col]) if pd.notna(row[tenant_col]) else None
            
            # Skip if no tenant name
            if not tenant_name or tenant_name.lower() in ['nan', 'vacant', '']:
                continue
            
            # Parse rent
            rent = None
            if pd.notna(row[rent_col]):
                rent_str = str(row[rent_col]).replace(',', '').replace('$', '')
                rent = pd.to_numeric(rent_str, errors='coerce')
                
                # Validate rent (flag outliers)
                if rent and (rent < 0 or rent > 50000):
                    rent = None  # Will be flagged for review
            
            # Parse dates
            lease_start = None
            lease_end = None
            if lease_from_col and pd.notna(row[lease_from_col]):
                lease_start = pd.to_datetime(row[lease_from_col], errors='coerce')
            if lease_to_col and pd.notna(row[lease_to_col]):
                lease_end = pd.to_datetime(row[lease_to_col], errors='coerce')
            
            # Check for Section 8
            is_section_8 = False
            if tags_col and pd.notna(row[tags_col]):
                if 'sec' in str(row[tags_col]).lower() and '8' in str(row[tags_col]):
                    is_section_8 = True
            
            leases.append({
                'unit_number': str(row[unit_col]),
                'tenant_name': tenant_name,
                'monthly_rent': round(rent, 2) if rent else None,
                'lease_start_date': lease_start.isoformat() if lease_start else None,
                'lease_end_date': lease_end.isoformat() if lease_end else None,
                'is_section_8': is_section_8,
                'lease_type': 'month_to_month' if not lease_end else 'fixed_term',
                'confidence': 0.88
            })
        
        return leases
    
    def _validate_extraction(self, unit_types: List, units: List, leases: List) -> Dict:
        """
        Validate extracted data and calculate quality score
        """
        warnings = []
        scores = []
        
        # Check unit count consistency
        if len(units) == 0:
            warnings.append({
                'severity': 'error',
                'message': 'No units extracted',
                'field': 'units'
            })
            scores.append(0.0)
        else:
            scores.append(1.0)
        
        # Check occupancy math
        occupied_count = sum(1 for u in units if u['status'] == 'occupied')
        lease_count = len(leases)
        
        if occupied_count != lease_count:
            warnings.append({
                'severity': 'warning',
                'message': f'Occupied units ({occupied_count}) != Lease count ({lease_count})',
                'field': 'leases'
            })
            scores.append(0.8)
        else:
            scores.append(1.0)
        
        # Check rent ranges
        rents = [l['monthly_rent'] for l in leases if l['monthly_rent']]
        if rents:
            if any(r > 10000 for r in rents):
                warnings.append({
                    'severity': 'high',
                    'message': f'Suspicious high rent detected: ${max(rents):,.2f}',
                    'field': 'rents',
                    'suggestion': 'Check for data entry errors or annual amounts'
                })
                scores.append(0.5)
            else:
                scores.append(1.0)
        
        # Check missing data
        units_missing_sqft = sum(1 for u in units if not u['square_feet'])
        if units_missing_sqft > 0:
            warnings.append({
                'severity': 'info',
                'message': f'{units_missing_sqft} units missing square footage',
                'field': 'square_feet'
            })
        
        leases_missing_dates = sum(1 for l in leases if not l['lease_end_date'])
        if leases_missing_dates > 0:
            warnings.append({
                'severity': 'medium',
                'message': f'{leases_missing_dates} leases missing end date (assumed MTM)',
                'field': 'lease_dates',
                'suggestion': 'Review and confirm month-to-month status'
            })
            scores.append(0.85)
        else:
            scores.append(1.0)
        
        overall_score = sum(scores) / len(scores) if scores else 0.5
        
        return {
            'overall_score': round(overall_score, 2),
            'warnings': warnings
        }
```

#### 2.2 Create PDF Rent Roll Extractor

**File:** `/backend/services/extraction/pdf_rent_roll_extractor.py`

```python
import anthropic
import os
from typing import Dict, List
from pypdf import PdfReader
from datetime import datetime
import json
import re

class PDFRentRollExtractor:
    """
    Extract structured data from PDF rent roll documents
    Handles both text-based PDFs (like Offering Memorandums) and Excel-exported PDFs
    """
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
    
    def extract(self, file_path: str) -> Dict:
        """
        Main extraction method for PDF rent rolls
        
        Returns same structure as RentRollExtractor for consistency
        """
        
        # Step 1: Extract text from PDF
        pages_text = self._extract_pdf_text(file_path)
        
        # Step 2: Identify rent roll pages
        rent_roll_pages = self._identify_rent_roll_pages(pages_text)
        
        if not rent_roll_pages:
            return {
                'error': 'No rent roll tables found in PDF',
                'quality_score': 0.0
            }
        
        # Step 3: Extract tables using Claude
        extracted_data = self._extract_tables_with_claude(rent_roll_pages)
        
        # Step 4: Parse to standard format
        result = self._parse_to_standard_format(extracted_data)
        
        # Step 5: Validate
        validation = self._validate_extraction(result)
        result['quality_score'] = validation['overall_score']
        result['validation_warnings'] = validation['warnings']
        
        return result
    
    def _extract_pdf_text(self, file_path: str) -> List[Dict]:
        """
        Extract text from all PDF pages
        """
        reader = PdfReader(file_path)
        pages_text = []
        
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            pages_text.append({
                'page_num': page_num + 1,
                'text': text
            })
        
        return pages_text
    
    def _identify_rent_roll_pages(self, pages: List[Dict]) -> List[Dict]:
        """
        Identify which pages contain rent roll tables
        """
        rent_roll_keywords = ['unit', 'tenant', 'rent', 'lease', 'bd/ba', 'sqft', 'bedroom', 'bathroom']
        
        identified_pages = []
        for page in pages:
            text_lower = page['text'].lower()
            
            # Count keyword matches
            matches = sum(1 for kw in rent_roll_keywords if kw in text_lower)
            
            # Threshold: page must have at least 4 rent roll keywords
            if matches >= 4:
                identified_pages.append(page)
        
        return identified_pages
    
    def _extract_tables_with_claude(self, pages: List[Dict]) -> Dict:
        """
        Use Claude to parse rent roll tables from PDF text
        """
        
        # Combine all rent roll page text
        combined_text = "\n\n--- PAGE BREAK ---\n\n".join([
            f"PAGE {p['page_num']}:\n{p['text']}" 
            for p in pages
        ])
        
        prompt = f"""Extract ALL rent roll data from this PDF text. This is from an Offering Memorandum.

{combined_text}

Parse into JSON with this exact structure:
{{
    "unit_types": [
        {{
            "bedroom_count": 1,
            "bathroom_count": 1.0,
            "amenity": "XL patio" or null,
            "unit_count": 16,
            "typical_sqft": 750,
            "current_rent_range": "$1,384-$2,100",
            "proforma_rent_range": "$2,350-$2,450",
            "monthly_income_current": 27367,
            "monthly_income_proforma": 38400,
            "confidence": 0.92
        }}
    ],
    "units": [
        {{
            "unit_number": "100",
            "type": "commercial/vacant",
            "bedroom_count": null,
            "bathroom_count": null,
            "amenity": null,
            "square_feet": 1101,
            "current_rent": 3303.00,
            "lease_start": "2023-09-01",
            "lease_end": "2026-08-31",
            "proforma_rent_average": 3578.00,
            "current_rpsf": 3.00,
            "proforma_rpsf": 3.25,
            "is_section_8": false,
            "is_vacant": true,
            "is_commercial": true,
            "is_manager_unit": false,
            "confidence": 0.95
        }}
    ]
}}

CRITICAL EXTRACTION RULES:

1. **Unit Types Section** - Look for summary tables showing bedroom/bathroom configurations:
   - Aggregate by BD/BA + amenity type (e.g., "2 Bed 2 Bath XL Patio" is separate from "2 Bed 2 Bath")
   - Parse rent ranges like "$3,100-$3,200" 
   - Extract monthly income totals for both current and proforma

2. **Individual Units Section** - Extract EVERY unit row:
   - Unit numbers (100, 101, 201, etc.)
   - Type field contains status: "residential", "residential/section 8", "residential/vacant", "residential/manager", "commercial"
   - BD/BA (may be "3+2" format meaning 3 bed 2 bath)
   - Amenity (balcony, XL patio, tower, etc.)
   - Square footage
   - Current rent amount
   - Lease dates (format: MM/DD/YYYY or blank for vacant)
   - Proforma rent (may be a range like "$3,775 - $3,875")

3. **Status Detection**:
   - is_section_8 = true if Type contains "section 8"
   - is_vacant = true if Type contains "vacant"
   - is_commercial = true if Type contains "commercial"
   - is_manager_unit = true if Type contains "manager"

4. **Date Formatting**:
   - Convert all dates to YYYY-MM-DD format
   - Blank/missing dates = null
   - "-" in lease dates = null

5. **Rent Parsing**:
   - Remove $ and commas from rent amounts
   - Convert to float
   - For ranges like "$3,100-$3,200", use midpoint or extract both values

6. **Handle Missing Data**:
   - Missing sqft = null
   - Missing dates for occupied units = assume month-to-month
   - Vacant units have no lease dates

7. **Extract ALL Units**:
   - Count total units carefully (example: 113 total)
   - Don't stop partway through
   - Include commercial units

Respond with ONLY the JSON object. No markdown, no explanation, no code blocks."""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=16000,  # Large limit for complete extraction
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse response
        response_text = message.content[0].text.strip()
        
        # Strip markdown if present
        if '```' in response_text:
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        try:
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Response text: {response_text[:500]}")
            raise
    
    def _parse_to_standard_format(self, claude_response: Dict) -> Dict:
        """
        Convert Claude's response to match Excel extractor format
        """
        
        # Unit types - convert from PDF format
        unit_types = []
        for ut in claude_response.get('unit_types', []):
            # Parse proforma rent range to get average
            proforma_rent = ut.get('proforma_rent_average')
            if not proforma_rent and ut.get('proforma_rent_range'):
                # Extract average from range like "$2,350-$2,450"
                range_str = ut['proforma_rent_range']
                numbers = re.findall(r'[\d,]+', range_str)
                if len(numbers) >= 2:
                    vals = [float(n.replace(',', '')) for n in numbers]
                    proforma_rent = sum(vals) / len(vals)
            
            unit_types.append({
                'bedroom_count': ut['bedroom_count'],
                'bathroom_count': ut['bathroom_count'],
                'unit_count': ut['unit_count'],
                'typical_sqft': ut.get('typical_sqft'),
                'market_rent_monthly': proforma_rent,
                'confidence': ut.get('confidence', 0.90)
            })
        
        # Parse units and leases
        units = []
        leases = []
        
        for unit in claude_response.get('units', []):
            # Add to units list
            status = 'vacant' if unit.get('is_vacant') else 'occupied'
            
            units.append({
                'unit_number': str(unit['unit_number']),
                'bedroom_count': unit.get('bedroom_count'),
                'bathroom_count': unit.get('bathroom_count'),
                'square_feet': unit.get('square_feet'),
                'status': status,
                'is_commercial': unit.get('is_commercial', False),
                'confidence': unit.get('confidence', 0.92)
            })
            
            # If occupied, add lease (skip manager units and vacant)
            if not unit.get('is_vacant') and not unit.get('is_manager_unit') and unit.get('current_rent'):
                leases.append({
                    'unit_number': str(unit['unit_number']),
                    'tenant_name': None,  # PDFs typically don't have tenant names
                    'monthly_rent': float(unit['current_rent']) if unit['current_rent'] else None,
                    'lease_start_date': unit.get('lease_start'),
                    'lease_end_date': unit.get('lease_end'),
                    'is_section_8': unit.get('is_section_8', False),
                    'lease_type': 'fixed_term' if unit.get('lease_end') else 'month_to_month',
                    'confidence': unit.get('confidence', 0.88)
                })
        
        # Property info (could extract from PDF headers if needed)
        property_info = {
            'property_name': None,
            'property_address': None,
            'report_date': None,
            'confidence': 0.85
        }
        
        return {
            'unit_types': unit_types,
            'units': units,
            'leases': leases,
            'property_info': property_info,
            'extraction_metadata': {
                'total_units': len(units),
                'occupied_units': len(leases),
                'vacancy_rate': 1 - (len(leases) / len(units)) if len(units) > 0 else 0,
                'source_type': 'pdf',
                'extracted_at': datetime.now().isoformat()
            }
        }
    
    def _validate_extraction(self, result: Dict) -> Dict:
        """
        Validate PDF extraction results
        """
        warnings = []
        scores = []
        
        units = result['units']
        leases = result['leases']
        unit_types = result['unit_types']
        
        # Check unit count
        if len(units) == 0:
            warnings.append({
                'severity': 'error',
                'message': 'No units extracted from PDF',
                'field': 'units'
            })
            scores.append(0.0)
        else:
            scores.append(1.0)
        
        # Check if extraction seems incomplete (suspiciously low count)
        if len(units) < 50 and len(units) > 0:
            warnings.append({
                'severity': 'warning',
                'message': f'Only {len(units)} units found - verify PDF contains complete rent roll',
                'field': 'units'
            })
            scores.append(0.7)
        else:
            scores.append(1.0)
        
        # Check occupancy math
        occupied_count = sum(1 for u in units if u['status'] == 'occupied')
        lease_count = len(leases)
        
        if abs(occupied_count - lease_count) > 5:  # Allow some variance for manager units
            warnings.append({
                'severity': 'warning',
                'message': f'Occupied units ({occupied_count}) != Lease count ({lease_count})',
                'field': 'leases',
                'suggestion': 'Check for manager units or extraction errors'
            })
            scores.append(0.8)
        else:
            scores.append(1.0)
        
        # Check for suspicious rents
        rents = [l['monthly_rent'] for l in leases if l['monthly_rent']]
        if rents:
            if any(r > 10000 for r in rents):
                warnings.append({
                    'severity': 'high',
                    'message': f'Suspicious high rent: ${max(rents):,.2f}',
                    'field': 'rents',
                    'suggestion': 'Verify not annual rent or data error'
                })
                scores.append(0.6)
            else:
                scores.append(1.0)
        
        # Check missing sqft
        missing_sqft = sum(1 for u in units if not u['square_feet'])
        if missing_sqft > len(units) * 0.1:  # >10% missing
            warnings.append({
                'severity': 'info',
                'message': f'{missing_sqft} units missing square footage',
                'field': 'square_feet'
            })
        
        # Check missing lease dates
        missing_dates = sum(1 for l in leases if not l['lease_end_date'])
        if missing_dates > 0:
            warnings.append({
                'severity': 'medium',
                'message': f'{missing_dates} leases missing end date (assumed MTM)',
                'field': 'lease_dates'
            })
            scores.append(0.85)
        else:
            scores.append(1.0)
        
        overall_score = sum(scores) / len(scores) if scores else 0.5
        
        return {
            'overall_score': round(overall_score, 2),
            'warnings': warnings
        }
```

#### 2.3 Create Extraction Worker/Task

**File:** `/backend/services/extraction/extraction_worker.py`

```python
from ..models import CoreDoc, DMSExtractQueue, DMSAssertion
from .document_classifier import DocumentClassifier
from .rent_roll_extractor import RentRollExtractor
from .pdf_rent_roll_extractor import PDFRentRollExtractor
import json
from datetime import datetime

def process_extraction_queue():
    """
    Background worker to process queued extractions
    Can be called via cron job or Celery task
    """
    
    # Get pending jobs
    pending_jobs = DMSExtractQueue.objects.filter(
        status='queued'
    ).order_by('-priority', 'queued_at')[:5]
    
    classifier = DocumentClassifier()
    excel_extractor = RentRollExtractor()
    pdf_extractor = PDFRentRollExtractor()
    
    for job in pending_jobs:
        try:
            # Update status
            job.status = 'processing'
            job.started_at = datetime.now()
            job.save()
            
            # Get document
            doc = CoreDoc.objects.get(id=job.doc_id)
            file_path = doc.file_path
            
            # Determine file type and extract
            if file_path.lower().endswith('.pdf'):
                # PDF extraction
                extraction_result = pdf_extractor.extract(file_path)
                doc_type = 'rent_roll'
                confidence = extraction_result.get('quality_score', 0.85)
            else:
                # Excel/CSV extraction
                # Classify first
                doc_type, confidence, metadata = classifier.classify_excel(file_path)
                
                # Update document
                doc.doc_type = doc_type
                doc.save()
                
                # Extract if rent roll
                if doc_type == 'rent_roll' and confidence > 0.7:
                    extraction_result = excel_extractor.extract(file_path, {'metadata': metadata})
                else:
                    job.status = 'failed'
                    job.error_message = f'Document type {doc_type} not supported or low confidence ({confidence})'
                    job.save()
                    
                    doc.extraction_status = 'failed'
                    doc.save()
                    continue
            
            # Check for extraction errors
            if 'error' in extraction_result:
                job.status = 'failed'
                job.error_message = extraction_result['error']
                job.save()
                
                doc.extraction_status = 'failed'
                doc.save()
                continue
            
            # Store assertions
            _store_assertions(doc.id, extraction_result)
            
            # Update job
            job.status = 'completed'
            job.completed_at = datetime.now()
            job.result_summary = json.dumps({
                'unit_types_found': len(extraction_result['unit_types']),
                'units_found': len(extraction_result['units']),
                'leases_found': len(extraction_result['leases']),
                'quality_score': extraction_result['quality_score'],
                'source_type': extraction_result.get('extraction_metadata', {}).get('source_type', 'unknown')
            })
            job.save()
            
            # Update document status
            doc.extraction_status = 'completed'
            doc.save()
                
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = datetime.now()
            job.save()
            
            doc.extraction_status = 'failed'
            doc.save()

def _store_assertions(doc_id: int, extraction_result: Dict):
    """
    Store extraction results as assertions for review
    """
    assertions_to_create = []
    
    # Store unit types
    for idx, unit_type in enumerate(extraction_result['unit_types']):
        assertions_to_create.append(DMSAssertion(
            doc_id=doc_id,
            field_name=f'unit_type_{idx}',
            extracted_value=json.dumps(unit_type),
            confidence_score=unit_type['confidence'],
            source_section='Unit Types Aggregation'
        ))
    
    # Store units
    for idx, unit in enumerate(extraction_result['units']):
        assertions_to_create.append(DMSAssertion(
            doc_id=doc_id,
            field_name=f'unit_{unit["unit_number"]}',
            extracted_value=json.dumps(unit),
            confidence_score=unit['confidence'],
            source_section='Individual Units'
        ))
    
    # Store leases
    for idx, lease in enumerate(extraction_result['leases']):
        assertions_to_create.append(DMSAssertion(
            doc_id=doc_id,
            field_name=f'lease_{lease["unit_number"]}',
            extracted_value=json.dumps(lease),
            confidence_score=lease['confidence'],
            source_section='Lease Data'
        ))
    
    # Bulk create
    DMSAssertion.objects.bulk_create(assertions_to_create)
```

---

### PHASE 3: Backend - Staging & Review Endpoints

#### 3.1 Create Staging Data Endpoint

**File:** `/backend/api/views/staging_views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import CoreDoc, DMSAssertion
import json

@api_view(['GET'])
def get_staging_data(request, doc_id):
    """
    Retrieve extracted data for user review
    
    Returns structured data with confidence scores
    """
    try:
        doc = CoreDoc.objects.get(id=doc_id)
        
        if doc.extraction_status != 'completed':
            return Response({
                'status': doc.extraction_status,
                'message': 'Extraction not yet complete'
            }, status=status.HTTP_202_ACCEPTED)
        
        # Get all assertions for this document
        assertions = DMSAssertion.objects.filter(doc_id=doc_id)
        
        # Group by type
        unit_types = []
        units = []
        leases = []
        
        for assertion in assertions:
            data = json.loads(assertion.extracted_value)
            
            if assertion.field_name.startswith('unit_type_'):
                unit_types.append({
                    'assertion_id': assertion.id,
                    'data': data,
                    'confidence': assertion.confidence_score
                })
            elif assertion.field_name.startswith('unit_'):
                units.append({
                    'assertion_id': assertion.id,
                    'data': data,
                    'confidence': assertion.confidence_score
                })
            elif assertion.field_name.startswith('lease_'):
                leases.append({
                    'assertion_id': assertion.id,
                    'data': data,
                    'confidence': assertion.confidence_score
                })
        
        # Calculate summary stats
        total_units = len(units)
        occupied_units = len(leases)
        vacancy_rate = 1 - (occupied_units / total_units) if total_units > 0 else 0
        
        total_income = sum(
            l['data']['monthly_rent'] 
            for l in leases 
            if l['data'].get('monthly_rent')
        )
        
        # Flag items needing review (low confidence or validation issues)
        needs_review = []
        
        # Check for high rents
        high_rent_leases = [
            l for l in leases 
            if l['data'].get('monthly_rent', 0) > 10000
        ]
        if high_rent_leases:
            needs_review.append({
                'severity': 'high',
                'category': 'suspicious_rent',
                'message': f'{len(high_rent_leases)} unit(s) with rent > $10,000',
                'items': high_rent_leases,
                'suggestion': 'Review for data entry errors or annual amounts'
            })
        
        # Check for missing lease dates
        missing_dates = [
            l for l in leases 
            if not l['data'].get('lease_end_date')
        ]
        if missing_dates:
            needs_review.append({
                'severity': 'medium',
                'category': 'missing_lease_dates',
                'message': f'{len(missing_dates)} lease(s) missing end date',
                'items': missing_dates,
                'suggestion': 'Assume month-to-month or set default term'
            })
        
        # Check for low confidence items
        low_confidence_items = [
            {'type': 'unit_type', 'item': ut} for ut in unit_types if ut['confidence'] < 0.8
        ] + [
            {'type': 'unit', 'item': u} for u in units if u['confidence'] < 0.8
        ] + [
            {'type': 'lease', 'item': l} for l in leases if l['confidence'] < 0.8
        ]
        
        if low_confidence_items:
            needs_review.append({
                'severity': 'info',
                'category': 'low_confidence',
                'message': f'{len(low_confidence_items)} item(s) with confidence < 80%',
                'items': low_confidence_items
            })
        
        return Response({
            'doc_id': doc_id,
            'filename': doc.filename,
            'extraction_date': doc.updated_at,
            'summary': {
                'total_units': total_units,
                'occupied_units': occupied_units,
                'vacant_units': total_units - occupied_units,
                'vacancy_rate': round(vacancy_rate * 100, 1),
                'monthly_income': round(total_income, 2)
            },
            'unit_types': unit_types,
            'units': units,
            'leases': leases,
            'needs_review': needs_review
        })
        
    except CoreDoc.DoesNotExist:
        return Response(
            {'error': 'Document not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def commit_staging_data(request, doc_id):
    """
    Commit reviewed data to database tables
    
    Expected payload:
    {
        "approved_assertions": [assertion_id, ...],
        "corrections": [
            {
                "assertion_id": 123,
                "field_path": "monthly_rent",
                "corrected_value": 2244.00,
                "correction_reason": "decimal_error"
            }
        ]
    }
    """
    from ..models import MultifamilyUnitType, MultifamilyUnit, MultifamilyLease, AICorrectionLog
    
    try:
        approved_ids = request.data.get('approved_assertions', [])
        corrections = request.data.get('corrections', [])
        project_id = request.data.get('project_id')
        
        # Apply corrections first
        for correction in corrections:
            assertion = DMSAssertion.objects.get(id=correction['assertion_id'])
            
            # Parse existing data
            data = json.loads(assertion.extracted_value)
            
            # Update field
            field_path = correction['field_path']
            old_value = data.get(field_path)
            new_value = correction['corrected_value']
            data[field_path] = new_value
            
            # Save updated assertion
            assertion.extracted_value = json.dumps(data)
            assertion.corrected_by_user = True
            assertion.save()
            
            # Log correction
            AICorrectionLog.objects.create(
                extraction_result_id=doc_id,
                user_id=request.user.id,
                project_id=project_id,
                doc_id=doc_id,
                field_path=field_path,
                ai_value=str(old_value),
                user_value=str(new_value),
                correction_type=correction.get('correction_reason', 'value_wrong')
            )
        
        # Create unit types
        unit_type_assertions = DMSAssertion.objects.filter(
            doc_id=doc_id,
            field_name__startswith='unit_type_',
            id__in=approved_ids
        )
        
        unit_type_map = {}  # Maps (bedrooms, bathrooms) -> unit_type_id
        
        for assertion in unit_type_assertions:
            data = json.loads(assertion.extracted_value)
            
            unit_type = MultifamilyUnitType.objects.create(
                project_id=project_id,
                bedroom_count=data['bedroom_count'],
                bathroom_count=data['bathroom_count'],
                typical_sqft=data.get('typical_sqft'),
                market_rent_monthly=data.get('market_rent_monthly'),
                unit_count=data['unit_count']
            )
            
            key = (data['bedroom_count'], data['bathroom_count'])
            unit_type_map[key] = unit_type.id
        
        # Create units
        unit_assertions = DMSAssertion.objects.filter(
            doc_id=doc_id,
            field_name__startswith='unit_',
            field_name__regex=r'^unit_[^t]',  # Exclude unit_type_
            id__in=approved_ids
        )
        
        unit_id_map = {}  # Maps unit_number -> unit_id
        
        for assertion in unit_assertions:
            data = json.loads(assertion.extracted_value)
            
            # Find matching unit type
            key = (data.get('bedroom_count'), data.get('bathroom_count'))
            unit_type_id = unit_type_map.get(key)
            
            unit = MultifamilyUnit.objects.create(
                project_id=project_id,
                unit_type_id=unit_type_id,
                unit_number=data['unit_number'],
                square_feet=data.get('square_feet'),
                status=data.get('status', 'unknown')
            )
            
            unit_id_map[data['unit_number']] = unit.id
        
        # Create leases
        lease_assertions = DMSAssertion.objects.filter(
            doc_id=doc_id,
            field_name__startswith='lease_',
            id__in=approved_ids
        )
        
        for assertion in lease_assertions:
            data = json.loads(assertion.extracted_value)
            
            unit_id = unit_id_map.get(data['unit_number'])
            if not unit_id:
                continue
            
            MultifamilyLease.objects.create(
                unit_id=unit_id,
                tenant_name=data.get('tenant_name'),
                lease_start_date=data.get('lease_start_date'),
                lease_end_date=data.get('lease_end_date'),
                monthly_rent=data.get('monthly_rent'),
                is_section_8=data.get('is_section_8', False),
                lease_type=data.get('lease_type', 'fixed_term'),
                status='active'
            )
        
        return Response({
            'success': True,
            'message': 'Data committed successfully',
            'records_created': {
                'unit_types': len(unit_type_map),
                'units': len(unit_id_map),
                'leases': len(lease_assertions)
            }
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

**Routes:** Add to `/backend/api/urls.py`
```python
path('multifamily/staging/<int:doc_id>/', staging_views.get_staging_data, name='get_staging'),
path('multifamily/staging/<int:doc_id>/commit/', staging_views.commit_staging_data, name='commit_staging'),
```

---

### PHASE 4: Frontend - Staging Modal UI

#### 4.1 Create Staging Modal Component

**File:** `/src/components/extraction/StagingModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface StagingModalProps {
  open: boolean;
  docId: number;
  projectId: number;
  onClose: () => void;
  onCommit: () => void;
}

interface StagingData {
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    vacancy_rate: number;
    monthly_income: number;
  };
  unit_types: any[];
  units: any[];
  leases: any[];
  needs_review: any[];
}

export const StagingModal: React.FC<StagingModalProps> = ({
  open,
  docId,
  projectId,
  onClose,
  onCommit
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StagingData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    if (open && docId) {
      fetchStagingData();
    }
  }, [open, docId]);

  const fetchStagingData = async () => {
    try {
      const response = await fetch(`/api/multifamily/staging/${docId}/`);
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch staging data:', error);
      setLoading(false);
    }
  };

  const handleCorrection = (assertionId: number, field: string, value: any, reason: string) => {
    setCorrections([
      ...corrections,
      { assertion_id: assertionId, field_path: field, corrected_value: value, correction_reason: reason }
    ]);
  };

  const handleCommit = async () => {
    try {
      // Get all approved assertion IDs (all high-confidence items + corrected items)
      const approvedIds = [
        ...data!.unit_types.map(ut => ut.assertion_id),
        ...data!.units.map(u => u.assertion_id),
        ...data!.leases.map(l => l.assertion_id)
      ];

      const response = await fetch(`/api/multifamily/staging/${docId}/commit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          approved_assertions: approvedIds,
          corrections: corrections
        })
      });

      if (response.ok) {
        onCommit();
        onClose();
      }
    } catch (error) {
      console.error('Failed to commit staging data:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography ml={2}>Extracting rent roll data...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) {
    return null;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircleIcon color="success" fontSize="small" />;
    return <WarningIcon color="warning" fontSize="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Rent Roll Extraction Review</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary Section */}
        <Box mb={3}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Summary
            </Typography>
            <Box display="flex" gap={3}>
              <Typography>
                <strong>Total Units:</strong> {data.summary.total_units}
              </Typography>
              <Typography>
                <strong>Occupied:</strong> {data.summary.occupied_units} ({(100 - data.summary.vacancy_rate).toFixed(1)}%)
              </Typography>
              <Typography>
                <strong>Vacant:</strong> {data.summary.vacant_units}
              </Typography>
              <Typography>
                <strong>Monthly Income:</strong> ${data.summary.monthly_income.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Needs Review Alerts */}
        {data.needs_review.length > 0 && (
          <Box mb={3}>
            {data.needs_review.map((item, idx) => (
              <Alert 
                key={idx} 
                severity={item.severity === 'high' ? 'error' : item.severity === 'medium' ? 'warning' : 'info'}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  <strong>{item.message}</strong>
                  {item.suggestion && ` - ${item.suggestion}`}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label={`Unit Types (${data.unit_types.length})`} />
            <Tab label={`Individual Units (${data.units.length})`} />
            <Tab label={`Leases (${data.leases.length})`} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box mt={2}>
          {/* Unit Types Tab */}
          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Avg SF</TableCell>
                    <TableCell align="right">Market Rent</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.unit_types.map((ut, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {ut.data.bedroom_count}BR / {ut.data.bathroom_count}BA
                      </TableCell>
                      <TableCell align="right">{ut.data.unit_count}</TableCell>
                      <TableCell align="right">
                        {ut.data.typical_sqft ? ut.data.typical_sqft.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {ut.data.market_rent_monthly ? `$${ut.data.market_rent_monthly.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          icon={getConfidenceIcon(ut.confidence)}
                          label={`${(ut.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(ut.confidence)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Individual Units Tab */}
          {activeTab === 1 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Unit #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">SF</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.units.slice(0, 50).map((unit, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{unit.data.unit_number}</TableCell>
                      <TableCell>
                        {unit.data.bedroom_count && unit.data.bathroom_count
                          ? `${unit.data.bedroom_count}/${unit.data.bathroom_count}`
                          : unit.data.is_commercial ? 'Commercial' : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {unit.data.square_feet || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={unit.data.status} 
                          size="small"
                          color={unit.data.status === 'occupied' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          icon={getConfidenceIcon(unit.confidence)}
                          label={`${(unit.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(unit.confidence)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Leases Tab */}
          {activeTab === 2 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Unit #</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell align="right">Rent</TableCell>
                    <TableCell>Lease End</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.leases.map((lease, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{lease.data.unit_number}</TableCell>
                      <TableCell>{lease.data.tenant_name}</TableCell>
                      <TableCell align="right">
                        {lease.data.monthly_rent 
                          ? `$${lease.data.monthly_rent.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {lease.data.lease_end_date 
                          ? new Date(lease.data.lease_end_date).toLocaleDateString()
                          : 'MTM'}
                      </TableCell>
                      <TableCell>
                        {lease.data.is_section_8 && (
                          <Chip label="Sec 8" size="small" color="info" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          icon={getConfidenceIcon(lease.confidence)}
                          label={`${(lease.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(lease.confidence)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEditingItem(`lease_${idx}`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {corrections.length > 0 && `${corrections.length} correction(s) pending`}
        </Typography>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleCommit} 
          variant="contained" 
          color="primary"
          startIcon={<CheckCircleIcon />}
        >
          Approve & Commit to Database
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

#### 4.2 Integrate Upload & Modal into Rent Roll Page

**File:** `/src/pages/project/[id]/rent-roll.tsx` (or similar)

```typescript
import { useState } from 'react';
import { Button, Box, Input } from '@mui/material';
import { StagingModal } from '@/components/extraction/StagingModal';
import UploadIcon from '@mui/icons-material/Upload';

export default function RentRollPage({ projectId }) {
  const [stagingDocId, setStagingDocId] = useState<number | null>(null);
  const [showStaging, setShowStaging] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId.toString());
    formData.append('doc_type', 'rent_roll');

    try {
      const response = await fetch('/api/documents/upload/', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Show staging modal after brief delay for extraction
        setStagingDocId(result.doc_id);
        
        // Poll for extraction completion
        const checkInterval = setInterval(async () => {
          const statusResponse = await fetch(`/api/multifamily/staging/${result.doc_id}/`);
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'completed' || statusData.summary) {
            clearInterval(checkInterval);
            setShowStaging(true);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleCommit = () => {
    // Refresh rent roll data
    window.location.reload();
  };

  return (
    <Box>
      <Box mb={3}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
        >
          Upload Rent Roll
          <Input
            type="file"
            hidden
            onChange={handleFileUpload}
            inputProps={{ accept: '.xlsx,.xls,.csv,.pdf' }}
          />
        </Button>
      </Box>

      {/* Existing rent roll display components */}
      
      {/* Staging Modal */}
      {stagingDocId && (
        <StagingModal
          open={showStaging}
          docId={stagingDocId}
          projectId={projectId}
          onClose={() => setShowStaging(false)}
          onCommit={handleCommit}
        />
      )}
    </Box>
  );
}
```

---

### PHASE 5: Background Worker Setup

#### 5.1 Create Management Command for Worker

**File:** `/backend/management/commands/process_extractions.py`

```python
from django.core.management.base import BaseCommand
from services.extraction.extraction_worker import process_extraction_queue

class Command(BaseCommand):
    help = 'Process queued document extractions'

    def handle(self, *args, **options):
        self.stdout.write('Processing extraction queue...')
        process_extraction_queue()
        self.stdout.write(self.style.SUCCESS('Queue processing complete'))
```

**Usage:**
```bash
# Run manually
python manage.py process_extractions

# Or set up cron job
*/2 * * * * cd /path/to/backend && python manage.py process_extractions
```

#### 5.2 Environment Variables & Dependencies

**Add to `.env`:**
```
ANTHROPIC_API_KEY=your_api_key_here
```

**Add to `requirements.txt` (if not already present):**
```
pypdf>=3.0.0
anthropic>=0.18.0
pandas>=2.0.0
openpyxl>=3.0.0
```

**Install dependencies:**
```bash
pip install pypdf anthropic pandas openpyxl --break-system-packages
```

---

## TESTING & VALIDATION

### Test with Sample Files

**Excel Test:**
```bash
# 1. Upload Chadron rent roll (Excel)
curl -X POST http://localhost:8000/api/documents/upload/ \
  -F "file=@/mnt/user-data/uploads/Chadron_-_Rent_Roll___Tenant_Income_Info_as_of_09_17_2025.xlsx" \
  -F "project_id=11" \
  -F "doc_type=rent_roll"

# 2. Process extraction queue
python manage.py process_extractions

# 3. Check staging data
curl http://localhost:8000/api/multifamily/staging/<doc_id>/

# 4. Test frontend
# Navigate to rent roll page, upload file, review in staging modal
```

**PDF Test:**
```bash
# 1. Upload Chadron OM (PDF with embedded rent roll tables)
curl -X POST http://localhost:8000/api/documents/upload/ \
  -F "file=@/mnt/project/14105_Chadron_Ave_OM_2025nopics.pdf" \
  -F "project_id=11" \
  -F "doc_type=rent_roll"

# 2. Process extraction (same as Excel)
python manage.py process_extractions

# 3. Verify PDF-specific extraction
curl http://localhost:8000/api/multifamily/staging/<doc_id>/
```

### Expected Results

**From Chadron Excel:**
- **Unit Types:** 3 extracted (1BR/1BA, 2BR/2BA, 3BR/2BA)
- **Individual Units:** 115 extracted
- **Leases:** 102 extracted (occupied units)
- **Quality Score:** ~0.95
- **Warnings:** 1-3 items flagged (high rent, missing dates)

**From Chadron PDF:**
- **Unit Types:** 13 extracted (includes amenity variants like "2BR/2BA XL Patio")
- **Individual Units:** 113 extracted (108 residential + 5 commercial)
- **Leases:** ~105 extracted (excludes vacant and manager units)
- **Quality Score:** ~0.90 (slightly lower due to PDF parsing)
- **Warnings:** Section 8 units flagged, missing tenant names (expected for PDF)

---

## NEXT STEPS & ENHANCEMENTS

### Immediate (Include in this implementation)
- ✅ Document upload endpoint (Excel, CSV, PDF)
- ✅ Classification service
- ✅ Excel/CSV rent roll extraction
- ✅ PDF rent roll extraction (Offering Memorandums)
- ✅ Staging data endpoint
- ✅ Commit endpoint
- ✅ Basic staging modal UI
- ✅ Correction logging

### Phase 2 (Future iterations)
- Scanned/image-based PDF support (OCR integration)
- Delinquency file merging (handle multiple files per property)
- Market benchmarking API calls
- Cross-document validation (T-12 vs rent roll reconciliation)
- Advanced correction UI (inline editing, bulk actions)
- Export staging data to CSV
- Batch processing (multiple properties at once)
- Tenant name extraction from PDFs (when available)

---

## TROUBLESHOOTING

### Common Issues

**1. Extraction fails / low confidence**
- **Excel/CSV:** Check header row detection (may need to adjust skip_rows logic)
- **Excel/CSV:** Verify column name matching (case-insensitive search)
- **PDF:** Check if rent roll pages are being identified (look for keyword matches)
- **PDF:** Verify text is extractable (not scanned image)
- Review Claude API response for classification errors

**2. PDF extraction incomplete**
- Check page identification threshold (may need to lower keyword count)
- Verify all rent roll pages have consistent formatting
- Check Claude token limit - very large rent rolls may need chunking
- Review extracted page text for parsing issues

**3. Database errors on commit**
- Ensure foreign key relationships (unit_type_id, unit_id) are valid
- Check for duplicate unit numbers
- Verify project_id exists

**3. Frontend not showing staging modal**
- Check network tab for API errors
- Verify CORS settings if running separate frontend/backend
- Console.log extraction status polling

**4. Performance issues with large files**
- Consider pagination for units > 200
- Implement lazy loading in staging modal
- Add progress indicators for extraction

---

## DEPLOYMENT CHECKLIST

- [ ] Set `ANTHROPIC_API_KEY` in environment
- [ ] Run database migrations (if new tables added)
- [ ] Deploy Django changes to backend
- [ ] Deploy React changes to frontend
- [ ] Set up cron job or Celery worker for extraction queue
- [ ] Test with sample files in production
- [ ] Monitor API logs for errors
- [ ] Set up error alerting (Sentry, etc.)

---

## SUCCESS METRICS

**After implementation, this system should achieve:**
- ✅ 95%+ extraction accuracy on standard Excel/CSV rent roll formats
- ✅ 90%+ extraction accuracy on text-based PDF rent rolls
- ✅ 85-90% time savings vs manual entry (2-4 hours → 10-15 minutes)
- ✅ User can upload (Excel or PDF) → review → commit in under 15 minutes
- ✅ All extractions logged with confidence scores
- ✅ User corrections tracked for learning
- ✅ Graceful handling of edge cases (missing data, outliers)
- ✅ Support for both property management exports (Excel) and offering memorandums (PDF)

---

## REFERENCES

- **Specification:** `/tmp/chadron_rent_roll_ingestion_spec.md` (47-page detailed workflow)
- **Sample Excel Files:** `/mnt/user-data/uploads/Chadron_-_Rent_Roll_*.xlsx`
- **Sample PDF File:** `/mnt/project/14105_Chadron_Ave_OM_2025nopics.pdf` (Offering Memorandum with embedded rent roll tables on pages 29-34)
- **Database Schema:** Neon landscape.tbl_multifamily_* tables
- **API Documentation:** Django REST Framework auto-generated docs

---

**END OF IMPLEMENTATION PROMPT**

*This prompt provides everything needed to build the complete rent roll ingestion system from backend extraction to frontend review UI. Start with Phase 1 and progress sequentially.*

**GR09**
