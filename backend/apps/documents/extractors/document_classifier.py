"""
Multi-Page Document Section Detector - RULE-BASED IMPLEMENTATION

Analyzes offering memos and other multi-page PDFs to identify and extract:
- Rent rolls
- Operating statements
- Parcel tables
- Site plans
- Financial summaries
- Market analyses

Uses RULE-BASED detection (keyword matching + table analysis) - NO API calls required.
"""

from typing import List, Dict, Tuple, Optional
import re
import logging
from collections import Counter

logger = logging.getLogger(__name__)


class DocumentSectionDetector:
    """
    Analyzes multi-page PDFs to identify sections using rule-based detection.

    NO API CALLS - Uses keyword matching, table density analysis, and pattern recognition.

    Example usage:
    ```python
    detector = DocumentSectionDetector()
    sections = detector.analyze_document('offering_memo.pdf')

    # Returns:
    # {
    #     "rent_roll": [23, 24, 25],
    #     "operating_statement": [31, 32, 33, 34],
    #     "site_plan": [8],
    #     ...
    # }
    ```
    """

    # Keyword patterns for each document type
    KEYWORDS = {
        'rent_roll': [
            'rent roll', 'unit mix', 'lease abstract', 'tenant schedule',
            'market rent', 'current rent', 'lease expiration', 'tenant name',
            'unit number', 'square feet', 'lease term', 'occupancy',
            'lease status', 'move-in date', 'unit type', 'bedrooms'
        ],
        'operating_statement': [
            'operating statement', 'income statement', 'operating expenses',
            'net operating income', 'noi', 'rental income', 'property tax',
            'insurance', 'repairs and maintenance', 'utilities', 'management fee',
            'gross potential income', 'effective gross income', 'vacancy loss',
            'collection loss', 'bad debt', 'property management', 'payroll'
        ],
        'parcel_table': [
            'parcel', 'lot', 'acreage', 'land use', 'density', 'dwelling units',
            'gross acres', 'net acres', 'buildable', 'development', 'phase',
            'zoning', 'land plan', 'du/acre', 'gross sf', 'units per acre'
        ],
        'site_plan': [
            'site plan', 'site layout', 'master plan', 'plat', 'survey',
            'north arrow', 'scale', 'legend', 'property line', 'boundary',
            'building footprint', 'parking layout'
        ],
        'financial_summary': [
            'executive summary', 'investment highlights', 'property overview',
            'cap rate', 'price per unit', 'price per sf', 'purchase price',
            'asking price', 'irr', 'cash on cash', 'equity multiple',
            'investment summary', 'deal highlights', 'return metrics'
        ],
        'market_analysis': [
            'market analysis', 'demographic', 'employment', 'population',
            'comparable sales', 'rent comparables', 'absorption', 'vacancy rate',
            'market trends', 'submarket', 'market overview', 'competitive set',
            'rent survey', 'market rent', 'comparable properties'
        ]
    }

    def __init__(self):
        """Initialize rule-based document classifier - NO API KEY NEEDED."""
        pass

    def analyze_document(
        self,
        pdf_path: str,
        min_confidence: float = 0.6,
        sample_rate: int = 1,
        max_pages: Optional[int] = None
    ) -> Dict[str, List[int]]:
        """
        Scan entire PDF and identify document sections using rule-based detection.

        Args:
            pdf_path: Path to multi-page PDF
            min_confidence: Minimum confidence score (0-1) to classify a page
            sample_rate: Analyze every Nth page (1 = all pages, recommended)
            max_pages: Maximum number of pages to analyze (None = all)

        Returns:
            Dictionary mapping section types to page numbers (0-indexed):
            {
                "rent_roll": [23, 24, 25],
                "operating_statement": [31, 32, 33, 34],
                "parcel_table": [12],
                "site_plan": [8],
                "financial_summary": [4, 5],
                "market_analysis": [16, 17, 18],
                "unclassified": [1, 2, 3, 6, 7, 9, 10, 11, ...]
            }
        """

        import pdfplumber
        logger.info(f"Analyzing document sections for {pdf_path} (rule-based, no API calls)")

        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            if max_pages:
                total_pages = min(total_pages, max_pages)

            page_classifications = {}

            # Classify each page
            for page_num in range(total_pages):
                # Skip pages based on sample rate
                if page_num % sample_rate != 0:
                    page_classifications[page_num] = 'unclassified'
                    continue

                page = pdf.pages[page_num]
                classification, confidence = self._classify_page(page, page_num)

                if confidence >= min_confidence:
                    page_classifications[page_num] = classification
                    logger.debug(f"Page {page_num+1}: {classification} (confidence: {confidence:.2f})")
                else:
                    page_classifications[page_num] = 'unclassified'

            # Group consecutive pages of same type
            sections = self._group_sections(page_classifications, total_pages)

            # Log results
            section_counts = {k: len(v) for k, v in sections.items() if v}
            logger.info(f"Section detection complete: {section_counts}")

        return sections

    def _classify_page(self, page, page_num: int) -> Tuple[str, float]:
        """
        Classify a single page using rule-based detection.

        Returns:
            (classification: str, confidence: float)
        """

        # Extract text
        text = page.extract_text() or ""
        text_lower = text.lower()

        # Extract tables
        tables = page.extract_tables()

        # Calculate scores for each document type
        scores = {}

        for doc_type, keywords in self.KEYWORDS.items():
            score = 0.0
            matches = 0

            # Keyword matching (weighted by position in document)
            for keyword in keywords:
                if keyword in text_lower:
                    matches += 1
                    # Higher weight if in first 500 chars (likely title/header)
                    if keyword in text_lower[:500]:
                        score += 2.0
                    else:
                        score += 1.0

            # Table presence bonus for table-heavy document types
            if tables:
                if doc_type in ['rent_roll', 'operating_statement', 'parcel_table']:
                    score += 3.0 * len(tables)

            # Pattern-specific bonuses
            if doc_type == 'rent_roll':
                # Look for unit numbers (101, 102, A-101, etc.)
                unit_pattern = r'\b[A-Z]?-?\d{3,4}\b'
                unit_matches = len(re.findall(unit_pattern, text))
                if unit_matches > 10:
                    score += 5.0

                # Look for dollar amounts (rent values)
                dollar_pattern = r'\$[\d,]+(?:\.\d{2})?'
                dollar_matches = len(re.findall(dollar_pattern, text))
                if dollar_matches > 10:
                    score += 3.0

            elif doc_type == 'operating_statement':
                # Look for financial line items
                if 'total income' in text_lower or 'total expenses' in text_lower:
                    score += 5.0

                # Multiple dollar amounts in structured format
                if text.count('$') > 15:
                    score += 3.0

            elif doc_type == 'parcel_table':
                # Look for acreage notation
                ac_pattern = r'\d+\.?\d*\s*(?:ac|acres)'
                ac_matches = len(re.findall(ac_pattern, text_lower))
                if ac_matches > 3:
                    score += 5.0

            elif doc_type == 'site_plan':
                # Site plans typically have very little text
                if len(text) < 200 and len(tables) == 0:
                    # Check for site plan indicators
                    if any(kw in text_lower for kw in ['north', 'scale', 'legend']):
                        score += 10.0

            elif doc_type == 'financial_summary':
                # Usually early in document
                if page_num < 10:
                    score += 2.0

                # Look for key metrics
                metric_pattern = r'(\d+\.?\d*%|cap rate|irr)'
                if re.search(metric_pattern, text_lower):
                    score += 3.0

            # Normalize score to 0-1 range
            max_possible_score = len(keywords) * 2.0 + 10.0  # Rough estimate
            normalized_score = min(score / max_possible_score, 1.0)

            scores[doc_type] = normalized_score

        # Get highest scoring classification
        if scores:
            best_type = max(scores, key=scores.get)
            confidence = scores[best_type]
            return (best_type, confidence)

        return ('unclassified', 0.0)

    def _group_sections(self, page_classifications: Dict[int, str], total_pages: int) -> Dict[str, List[int]]:
        """
        Group consecutive pages of same type into sections.

        Also handles interpolation: if pages 10 and 12 are both "rent_roll",
        assume page 11 is also "rent_roll" if it's unclassified.
        """

        sections = {
            'rent_roll': [],
            'operating_statement': [],
            'parcel_table': [],
            'site_plan': [],
            'financial_summary': [],
            'market_analysis': [],
            'unclassified': []
        }

        # First pass: collect all classified pages
        for page_num, classification in page_classifications.items():
            sections[classification].append(page_num)

        # Second pass: interpolate gaps in multi-page sections
        for doc_type in ['rent_roll', 'operating_statement', 'parcel_table']:
            pages = sections[doc_type]
            if len(pages) < 2:
                continue

            pages_sorted = sorted(pages)
            filled_pages = []

            for i in range(len(pages_sorted)):
                filled_pages.append(pages_sorted[i])

                # Check gap to next page
                if i < len(pages_sorted) - 1:
                    current = pages_sorted[i]
                    next_page = pages_sorted[i + 1]
                    gap = next_page - current

                    # If gap is small (1-2 pages) and those pages are unclassified,
                    # assume they're part of this section
                    if gap <= 3:
                        for gap_page in range(current + 1, next_page):
                            if page_classifications.get(gap_page) == 'unclassified':
                                filled_pages.append(gap_page)
                                # Remove from unclassified
                                if gap_page in sections['unclassified']:
                                    sections['unclassified'].remove(gap_page)

            sections[doc_type] = sorted(list(set(filled_pages)))

        return sections

    def _DEPRECATED_call_claude_classifier(
        self,
        text: str,
        image_base64: str,
        page_number: int
    ) -> Dict:
        """
        DEPRECATED - Old Claude API classifier (replaced with rule-based detection).

        Returns parsed JSON classification.
        """
        raise NotImplementedError("Claude API classifier is deprecated. Use rule-based detection instead.")

        prompt = f"""You are analyzing page {page_number} of a commercial real estate document.

**TASK:** Classify this page into ONE of these categories:

**Document Types:**

1. **rent_roll** - Table showing units, tenants, leases, and rents
   - Headers: Unit, Tenant, Lease Start/End, Market Rent, Current Rent, SF, Status
   - May be titled: "Rent Roll", "Unit Mix", "Lease Abstract"
   - Contains: Multiple rows of unit data

2. **operating_statement** - Financial statement with income and expenses
   - Headers: Account, Current Year, Prior Year, Budget, Variance, Notes
   - Sections: Income, Operating Expenses, Net Operating Income (NOI)
   - Line items: Rent Revenue, Property Tax, Insurance, Repairs, Management, Utilities
   - Shows: Dollar amounts with totals and subtotals

3. **parcel_table** - Table of land parcels with development details
   - Headers: Parcel, Gross AC, Net AC, Land Use, Units, Density, Phase
   - May be titled: "Development Summary", "Parcel Breakdown", "Lot Table", "Land Plan"
   - Contains: Parcel IDs, acreage, residential/commercial use types

4. **site_plan** - Visual map showing property layout
   - Contains: Property boundaries, parcel labels, north arrow, scale, legend
   - Shows: Buildings, lots, roads, infrastructure, landscaping
   - Minimal text, mostly visual

5. **financial_summary** - Executive summary of property financials
   - Contains: List Price, Cap Rate, NOI, Price/Unit, Price/SF, IRR, Cash Flow
   - Usually: Early in document (pages 1-5 or 10-15)
   - Format: Key metrics with values, often in table or bullet format

6. **market_analysis** - Demographics, comparables, market trends
   - Contains: Population, employment, income demographics
   - Shows: Comparable properties, rent comps, sale comps
   - Includes: Charts, graphs, maps of market area

7. **property_photos** - Photos of buildings, amenities, units
   - Mostly: High-quality photographs
   - Minimal text: Captions only

8. **legal_disclosures** - Legal disclaimers, terms, disclosures
   - Contains: Dense legal text, disclaimers, terms and conditions
   - Keywords: "Confidentiality", "Terms", "Disclaimer", "Legal Notice"

9. **unclassified** - Cover page, table of contents, misc content
   - Anything that doesn't fit above categories

**Page {page_number} Text Sample:**
```
{text}
```

**Visual Analysis:** Image provided shows page layout and structure.

**IMPORTANT:**
- Choose the SINGLE BEST category (no multiple classifications)
- Base decision on BOTH text content AND visual layout
- Tables are key indicators (rent roll, operating statement, parcel table)
- If uncertain between two types, choose based on dominant content

**Response Format (JSON only):**
{{
  "type": "rent_roll",
  "confidence": 0.92,
  "reasoning": "Page contains table with columns: Unit, Tenant Name, Lease End, Market Rent, Current Rent, SF. Clear rent roll format with 50+ unit rows.",
  "key_indicators": ["unit numbers", "tenant names", "rent amounts", "lease dates", "tabular format"]
}}

Respond with ONLY valid JSON, no other text."""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )

        # Parse response
        response_text = response.content[0].text.strip()

        # Handle markdown code blocks
        if response_text.startswith('```'):
            # Extract JSON from code block
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])  # Remove first and last lines

        try:
            result = json.loads(response_text)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response: {response_text}")
            raise ValueError(f"Invalid JSON response from Claude: {e}")

    def _interpolate_sections(
        self,
        sample_classifications: Dict[int, Dict],
        total_pages: int
    ) -> Dict[str, List[int]]:
        """
        Fill in gaps between sampled pages using interpolation.

        Logic:
        - If consecutive samples have same type, assign all pages between them
        - If consecutive samples differ, find boundary by checking middle page
        - Single-page sections (like site_plan) don't extend

        Args:
            sample_classifications: {page_idx: classification_dict}
            total_pages: Total number of pages in document

        Returns:
            {section_type: [page_indices]}
        """
        sections = {doc_type: [] for doc_type in self.DOCUMENT_TYPES}

        # Sort sample pages
        sample_pages = sorted(sample_classifications.keys())

        for i in range(len(sample_pages)):
            current_page = sample_pages[i]
            current_type = sample_classifications[current_page]['type']
            current_conf = sample_classifications[current_page]['confidence']

            # Add current page to its section
            if current_conf > 0.5:  # Only include if confident
                sections[current_type].append(current_page)

            # Fill gap to next sample
            if i < len(sample_pages) - 1:
                next_page = sample_pages[i + 1]
                next_type = sample_classifications[next_page]['type']

                # If same type and high confidence, fill all pages between
                if current_type == next_type and current_conf > 0.7:
                    for page_idx in range(current_page + 1, next_page):
                        sections[current_type].append(page_idx)

                # If different types, be conservative and don't fill
                # (could add boundary detection here)

        # Sort page lists
        for section_type in sections:
            sections[section_type] = sorted(sections[section_type])

        # Remove empty sections
        sections = {k: v for k, v in sections.items() if v}

        return sections

    def _format_sections_summary(self, sections: Dict[str, List[int]]) -> str:
        """Format sections dict as readable summary."""
        parts = []
        for section_type, pages in sections.items():
            if pages:
                page_ranges = self._pages_to_ranges(pages)
                parts.append(f"{section_type}={page_ranges}")
        return ", ".join(parts)

    def _pages_to_ranges(self, pages: List[int]) -> str:
        """Convert page list to range string: [1,2,3,5,6,7] => "1-3, 5-7" """
        if not pages:
            return ""

        pages = sorted(pages)
        ranges = []
        start = pages[0]
        end = pages[0]

        for page in pages[1:]:
            if page == end + 1:
                end = page
            else:
                ranges.append(f"{start+1}-{end+1}" if start != end else f"{start+1}")
                start = page
                end = page

        ranges.append(f"{start+1}-{end+1}" if start != end else f"{start+1}")
        return ", ".join(ranges)

    def extract_sections(
        self,
        pdf_path: str,
        sections: Dict[str, List[int]]
    ) -> Dict[str, Dict]:
        """
        After identifying sections, extract data from each using appropriate extractor.

        Args:
            pdf_path: Path to source PDF
            sections: Output from analyze_document()

        Returns:
        {
            "rent_roll": {
                "pages": [23, 24, 25],
                "extracted_data": {...}
            },
            "operating_statement": {
                "pages": [31, 32, 33, 34],
                "extracted_data": {...}
            }
        }
        """
        from .rentroll import RentRollExtractor
        from .operating import OperatingExtractor
        from .parcel_table import ParcelTableExtractor

        results = {}

        # Extract rent rolls
        if sections.get('rent_roll'):
            logger.info(f"Extracting rent roll from pages {sections['rent_roll']}")
            extractor = RentRollExtractor()
            try:
                data = extractor.extract_from_pages(pdf_path, sections['rent_roll'])
                results['rent_roll'] = {
                    "pages": sections['rent_roll'],
                    "extracted_data": data
                }
            except Exception as e:
                logger.error(f"Rent roll extraction failed: {e}", exc_info=True)
                results['rent_roll'] = {
                    "pages": sections['rent_roll'],
                    "error": str(e)
                }

        # Extract operating statements
        if sections.get('operating_statement'):
            logger.info(f"Extracting operating statement from pages {sections['operating_statement']}")
            extractor = OperatingExtractor()
            try:
                data = extractor.extract_from_pages(pdf_path, sections['operating_statement'])
                results['operating_statement'] = {
                    "pages": sections['operating_statement'],
                    "extracted_data": data
                }
            except Exception as e:
                logger.error(f"Operating statement extraction failed: {e}", exc_info=True)
                results['operating_statement'] = {
                    "pages": sections['operating_statement'],
                    "error": str(e)
                }

        # Extract parcel tables
        if sections.get('parcel_table'):
            logger.info(f"Extracting parcel table from pages {sections['parcel_table']}")
            extractor = ParcelTableExtractor()
            try:
                data = extractor.extract_from_pages(pdf_path, sections['parcel_table'])
                results['parcel_table'] = {
                    "pages": sections['parcel_table'],
                    "extracted_data": data
                }
            except Exception as e:
                logger.error(f"Parcel table extraction failed: {e}", exc_info=True)
                results['parcel_table'] = {
                    "pages": sections['parcel_table'],
                    "error": str(e)
                }

        return results

    def save_section_pages(
        self,
        pdf_path: str,
        sections: Dict[str, List[int]],
        output_dir: str
    ) -> Dict[str, str]:
        """
        Save each section as a separate PDF file.

        Args:
            pdf_path: Source PDF path
            sections: Output from analyze_document()
            output_dir: Directory to save section PDFs

        Returns:
            {section_type: output_pdf_path}
        """
        from PyPDF2 import PdfReader, PdfWriter
        import os

        os.makedirs(output_dir, exist_ok=True)
        output_paths = {}

        reader = PdfReader(pdf_path)

        for section_type, page_indices in sections.items():
            if not page_indices:
                continue

            writer = PdfWriter()

            # Add pages to writer
            for page_idx in page_indices:
                if page_idx < len(reader.pages):
                    writer.add_page(reader.pages[page_idx])

            # Save section PDF
            base_name = Path(pdf_path).stem
            output_path = os.path.join(
                output_dir,
                f"{base_name}_{section_type}.pdf"
            )

            with open(output_path, 'wb') as f:
                writer.write(f)

            output_paths[section_type] = output_path
            logger.info(f"Saved {section_type} section to {output_path}")

        return output_paths
