"""
PDF rent roll extraction service for Offering Memorandums and other PDF documents.
"""

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

        Returns same structure as RentRollExtractor for consistency,
        plus raw_text field containing the full document text.
        """

        # Step 1: Extract text from PDF
        pages_text = self._extract_pdf_text(file_path)

        # Store full raw text for Landscaper access
        full_text = "\n\n--- PAGE BREAK ---\n\n".join([
            f"PAGE {p['page_num']}:\n{p['text']}"
            for p in pages_text
        ])

        # Step 2: Identify rent roll pages
        rent_roll_pages = self._identify_rent_roll_pages(pages_text)

        if not rent_roll_pages:
            # Still return raw text even if no rent roll found
            return {
                'error': 'No rent roll tables found in PDF',
                'quality_score': 0.0,
                'raw_text': full_text
            }

        # Step 3: Extract tables using Claude
        extracted_data = self._extract_tables_with_claude(rent_roll_pages)

        # Step 4: Parse to standard format
        result = self._parse_to_standard_format(extracted_data)

        # Step 5: Validate
        validation = self._validate_extraction(result)
        result['quality_score'] = validation['overall_score']
        result['validation_warnings'] = validation['warnings']

        # Add raw text to result
        result['raw_text'] = full_text

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
   - Count total units carefully
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
