"""Parcel table extractor."""

from .base import BaseExtractor
import pandas as pd
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ParcelTableExtractor(BaseExtractor):
    """Extract parcel table data from PDFs and Excel files"""

    def __init__(self):
        base_dir = Path(__file__).parent.parent
        header_spec_path = base_dir / 'specs' / 'headers' / 'parcel_headers.yaml'
        validator_spec_path = base_dir / 'specs' / 'validators' / 'parcel_v1.yaml'

        super().__init__(
            header_spec_path=str(header_spec_path),
            validator_spec_path=str(validator_spec_path)
        )

    def extract_from_pdf(self, file_path):
        """Extract parcel table from PDF"""
        import pdfplumber
        logger.info(f"Extracting parcel table from PDF: {file_path}")

        try:
            with pdfplumber.open(file_path) as pdf:
                all_parcels = []

                for page in pdf.pages:
                    tables = page.extract_tables()

                    for table in tables:
                        if not table or len(table) < 2:
                            continue

                        header_row = table[0]
                        canonical_headers = []

                        for header in header_row:
                            canonical = self.canonicalize_header(
                                header,
                                self.header_mappings['parcel_headers']
                            )
                            canonical_headers.append(canonical)

                        for row in table[1:]:
                            if len(row) != len(canonical_headers):
                                continue

                            parcel_data = {}
                            for i, canonical_field in enumerate(canonical_headers):
                                if canonical_field:
                                    parcel_data[canonical_field] = row[i]

                            if not any(parcel_data.values()):
                                continue

                            all_parcels.append(parcel_data)

                confidence_scores = self._calculate_confidence(all_parcels)
                warnings = []
                for parcel in all_parcels:
                    warnings.extend(self.validate_data(parcel))

                return {
                    'data': all_parcels,
                    'confidence_scores': confidence_scores,
                    'validation_warnings': warnings,
                    'metadata': {
                        'parcels_count': len(all_parcels),
                        'extraction_method': 'pdfplumber'
                    }
                }

        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Unable to extract parcel table from PDF: {file_path}")

    def extract_from_excel(self, file_path):
        """Extract parcel table from Excel"""
        logger.info(f"Extracting parcel table from Excel: {file_path}")

        try:
            df = pd.read_excel(file_path)

            df.columns = [
                self.canonicalize_header(col, self.header_mappings['parcel_headers']) or col
                for col in df.columns
            ]

            all_parcels = df.to_dict('records')
            confidence_scores = self._calculate_confidence(all_parcels)
            warnings = []
            for parcel in all_parcels:
                warnings.extend(self.validate_data(parcel))

            return {
                'data': all_parcels,
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'parcels_count': len(all_parcels),
                    'extraction_method': 'pandas'
                }
            }

        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Unable to extract parcel table from Excel: {file_path}")

    def extract_from_csv(self, file_path):
        """Extract parcel table from CSV"""
        return self.extract_from_excel(file_path)

    def _calculate_confidence(self, parcels):
        """Calculate confidence scores for each parcel"""
        scores = []

        for parcel in parcels:
            parcel_scores = {}

            for field, config in self.validation_rules.get('fields', {}).items():
                if field in parcel:
                    confidence = self.calculate_confidence(parcel[field], config)
                    parcel_scores[field] = confidence

            scores.append(parcel_scores)

        return scores
