"""Rent roll extractor."""

from .base import BaseExtractor
import pandas as pd
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class RentRollExtractor(BaseExtractor):
    """Extract rent roll data from PDFs and Excel files"""

    def __init__(self):
        # Get the path to the specs directory
        base_dir = Path(__file__).parent.parent
        header_spec_path = base_dir / 'specs' / 'headers' / 'rentroll_headers.yaml'
        validator_spec_path = base_dir / 'specs' / 'validators' / 'rentroll_v1.yaml'

        super().__init__(
            header_spec_path=str(header_spec_path),
            validator_spec_path=str(validator_spec_path)
        )

    def extract_from_pdf(self, file_path):
        """Extract rent roll from PDF"""
        logger.info(f"Extracting rent roll from PDF: {file_path}")

        # Try pdfplumber first (better for text-based PDFs)
        try:
            with pdfplumber.open(file_path) as pdf:
                all_units = []

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
                                self.header_mappings['rent_roll_headers']
                            )
                            canonical_headers.append(canonical)

                        # Parse data rows
                        for row in table[1:]:
                            if len(row) != len(canonical_headers):
                                continue

                            unit_data = {}
                            for i, canonical_field in enumerate(canonical_headers):
                                if canonical_field:
                                    unit_data[canonical_field] = row[i]

                            # Skip empty rows
                            if not any(unit_data.values()):
                                continue

                            all_units.append(unit_data)

                # Calculate confidence scores
                confidence_scores = self._calculate_unit_confidence(all_units)

                # Validate
                warnings = []
                for unit in all_units:
                    unit_warnings = self.validate_data(unit)
                    warnings.extend(unit_warnings)

                return {
                    'data': all_units,
                    'confidence_scores': confidence_scores,
                    'validation_warnings': warnings,
                    'metadata': {
                        'units_count': len(all_units),
                        'extraction_method': 'pdfplumber'
                    }
                }

        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            raise ValueError(f"Unable to extract rent roll from PDF: {file_path}")

    def extract_from_excel(self, file_path):
        """Extract rent roll from Excel"""
        logger.info(f"Extracting rent roll from Excel: {file_path}")

        try:
            # Read all sheets
            xls = pd.ExcelFile(file_path)

            # Try to find rent roll sheet
            rent_roll_sheet = None
            for sheet_name in xls.sheet_names:
                if any(keyword in sheet_name.lower() for keyword in ['rent', 'roll', 'unit']):
                    rent_roll_sheet = sheet_name
                    break

            if not rent_roll_sheet:
                rent_roll_sheet = xls.sheet_names[0]  # Default to first sheet

            df = pd.read_excel(file_path, sheet_name=rent_roll_sheet)

            # Canonicalize headers
            df.columns = [
                self.canonicalize_header(col, self.header_mappings['rent_roll_headers']) or col
                for col in df.columns
            ]

            # Convert to dict
            all_units = df.to_dict('records')

            # Calculate confidence
            confidence_scores = self._calculate_unit_confidence(all_units)

            # Validate
            warnings = []
            for unit in all_units:
                unit_warnings = self.validate_data(unit)
                warnings.extend(unit_warnings)

            return {
                'data': all_units,
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'units_count': len(all_units),
                    'extraction_method': 'pandas',
                    'sheet_name': rent_roll_sheet
                }
            }

        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Unable to extract rent roll from Excel: {file_path}")

    def extract_from_csv(self, file_path):
        """Extract rent roll from CSV"""
        logger.info(f"Extracting rent roll from CSV: {file_path}")

        try:
            df = pd.read_csv(file_path)

            # Canonicalize headers
            df.columns = [
                self.canonicalize_header(col, self.header_mappings['rent_roll_headers']) or col
                for col in df.columns
            ]

            all_units = df.to_dict('records')
            confidence_scores = self._calculate_unit_confidence(all_units)

            warnings = []
            for unit in all_units:
                unit_warnings = self.validate_data(unit)
                warnings.extend(unit_warnings)

            return {
                'data': all_units,
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'units_count': len(all_units),
                    'extraction_method': 'pandas'
                }
            }

        except Exception as e:
            logger.error(f"CSV extraction failed: {e}")
            raise ValueError(f"Unable to extract rent roll from CSV: {file_path}")

    def _calculate_unit_confidence(self, units):
        """Calculate confidence scores for each unit"""
        scores = []

        for unit in units:
            unit_scores = {}

            for field, config in self.validation_rules.get('fields', {}).items():
                if field in unit:
                    confidence = self.calculate_confidence(unit[field], config)
                    unit_scores[field] = confidence

            scores.append(unit_scores)

        return scores
