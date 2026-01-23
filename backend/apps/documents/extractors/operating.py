"""Operating statement extractor."""

from .base import BaseExtractor
import pandas as pd
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class OperatingExtractor(BaseExtractor):
    """Extract operating statement data from PDFs and Excel files"""

    def __init__(self):
        base_dir = Path(__file__).parent.parent
        header_spec_path = base_dir / 'specs' / 'headers' / 'operating_headers.yaml'
        validator_spec_path = base_dir / 'specs' / 'validators' / 'operating_v1.yaml'

        super().__init__(
            header_spec_path=str(header_spec_path),
            validator_spec_path=str(validator_spec_path)
        )

    def extract_from_pdf(self, file_path):
        """Extract operating statement from PDF"""
        logger.info(f"Extracting operating statement from PDF: {file_path}")

        try:
            with pdfplumber.open(file_path) as pdf:
                all_line_items = []

                for page in pdf.pages:
                    tables = page.extract_tables()

                    for table in tables:
                        if not table or len(table) < 2:
                            continue

                        # Detect header row
                        header_row = table[0]
                        canonical_headers = []

                        for header in header_row:
                            canonical = self.canonicalize_header(
                                header,
                                self.header_mappings['operating_headers']
                            )
                            canonical_headers.append(canonical)

                        # Parse data rows
                        for row in table[1:]:
                            if len(row) != len(canonical_headers):
                                continue

                            line_item = {}
                            for i, canonical_field in enumerate(canonical_headers):
                                if canonical_field:
                                    line_item[canonical_field] = row[i]

                            if not any(line_item.values()):
                                continue

                            all_line_items.append(line_item)

                confidence_scores = self._calculate_confidence(all_line_items)
                warnings = []
                for item in all_line_items:
                    warnings.extend(self.validate_data(item))

                return {
                    'data': all_line_items,
                    'confidence_scores': confidence_scores,
                    'validation_warnings': warnings,
                    'metadata': {
                        'line_items_count': len(all_line_items),
                        'extraction_method': 'pdfplumber'
                    }
                }

        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Unable to extract operating statement from PDF: {file_path}")

    def extract_from_excel(self, file_path):
        """Extract operating statement from Excel"""
        logger.info(f"Extracting operating statement from Excel: {file_path}")

        try:
            df = pd.read_excel(file_path)

            df.columns = [
                self.canonicalize_header(col, self.header_mappings['operating_headers']) or col
                for col in df.columns
            ]

            all_line_items = df.to_dict('records')
            confidence_scores = self._calculate_confidence(all_line_items)
            warnings = []
            for item in all_line_items:
                warnings.extend(self.validate_data(item))

            return {
                'data': all_line_items,
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'line_items_count': len(all_line_items),
                    'extraction_method': 'pandas'
                }
            }

        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Unable to extract operating statement from Excel: {file_path}")

    def extract_from_csv(self, file_path):
        """Extract operating statement from CSV"""
        return self.extract_from_excel(file_path)  # Same logic

    def _calculate_confidence(self, items):
        """Calculate confidence scores for each line item"""
        scores = []

        for item in items:
            item_scores = {}

            for field, config in self.validation_rules.get('fields', {}).items():
                if field in item:
                    confidence = self.calculate_confidence(item[field], config)
                    item_scores[field] = confidence

            scores.append(item_scores)

        return scores
