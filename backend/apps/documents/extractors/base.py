"""Base class for document extractors."""

from abc import ABC, abstractmethod
import pdfplumber
import camelot
import pandas as pd
from pathlib import Path
import yaml
import logging

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """Base class for document extractors"""

    def __init__(self, header_spec_path, validator_spec_path):
        """
        Args:
            header_spec_path: Path to YAML file with header mappings
            validator_spec_path: Path to YAML file with validation rules
        """
        self.header_mappings = self.load_yaml(header_spec_path)
        self.validation_rules = self.load_yaml(validator_spec_path)

    def load_yaml(self, path):
        """Load YAML specification file"""
        with open(path, 'r') as f:
            return yaml.safe_load(f)

    def extract(self, file_path):
        """
        Main extraction entry point

        Returns:
            dict: {
                'data': extracted_data,
                'confidence_scores': {...},
                'validation_warnings': [...],
                'metadata': {...}
            }
        """
        file_ext = Path(file_path).suffix.lower()

        if file_ext == '.pdf':
            return self.extract_from_pdf(file_path)
        elif file_ext in ['.xlsx', '.xls', '.xlsm']:
            return self.extract_from_excel(file_path)
        elif file_ext == '.csv':
            return self.extract_from_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

    @abstractmethod
    def extract_from_pdf(self, file_path):
        """Extract from PDF - override in subclass"""
        pass

    @abstractmethod
    def extract_from_excel(self, file_path):
        """Extract from Excel - override in subclass"""
        pass

    @abstractmethod
    def extract_from_csv(self, file_path):
        """Extract from CSV - override in subclass"""
        pass

    def canonicalize_header(self, header, expected_headers):
        """
        Map document header to canonical field name

        Args:
            header: str - header text from document
            expected_headers: dict - mapping from canonical to variations

        Returns:
            str: canonical field name or None
        """
        header_clean = str(header).strip().lower()

        for canonical, variations in expected_headers.items():
            for variant in variations:
                if variant.lower() in header_clean or header_clean in variant.lower():
                    return canonical

        logger.warning(f"Unmapped header: {header}")
        return None

    def calculate_confidence(self, value, field_config):
        """
        Calculate confidence score for extracted value

        Args:
            value: extracted value
            field_config: dict from validation rules

        Returns:
            float: confidence score 0.0-1.0
        """
        confidence = 1.0

        # Reduce confidence if value is null
        if value is None or value == '' or (isinstance(value, float) and pd.isna(value)):
            return 0.0

        # Reduce confidence for text-like numbers (OCR artifacts)
        if 'data_type' in field_config:
            expected_type = field_config['data_type']
            if expected_type == 'number':
                try:
                    float(str(value).replace('$', '').replace(',', ''))
                except ValueError:
                    confidence *= 0.5

        # Apply field-specific confidence rules
        if 'confidence_rules' in field_config:
            for rule in field_config['confidence_rules']:
                if rule['type'] == 'range_check':
                    try:
                        val = float(str(value).replace('$', '').replace(',', ''))
                        if not (rule['min'] <= val <= rule['max']):
                            confidence *= 0.7
                    except:
                        confidence *= 0.5

        return round(confidence, 2)

    def validate_data(self, data):
        """
        Run validation rules on extracted data

        Returns:
            list: validation warnings
        """
        warnings = []

        for rule in self.validation_rules.get('rules', []):
            if rule['type'] == 'required_field':
                field = rule['field']
                if field not in data or data[field] is None or data[field] == '':
                    warnings.append({
                        'field': field,
                        'severity': rule.get('severity', 'error'),
                        'message': rule.get('message', f"Required field '{field}' is missing")
                    })

            elif rule['type'] == 'logical_check':
                # Example: current_rent <= market_rent
                try:
                    if eval(rule['condition'], {}, data):
                        pass  # Validation passed
                    else:
                        warnings.append({
                            'field': rule['field'],
                            'severity': rule.get('severity', 'warning'),
                            'message': rule.get('message', f"Logical check failed: {rule['condition']}")
                        })
                except Exception as e:
                    logger.warning(f"Validation rule failed to execute: {rule['condition']}, error: {e}")

        return warnings

    def extract_from_pages(self, pdf_path, page_numbers):
        """
        Extract data from specific pages of a PDF.

        This is useful when a document section detector has identified
        which pages contain the relevant data (e.g., rent roll on pages 23-25
        of a 50-page offering memo).

        Args:
            pdf_path: Path to the full PDF file
            page_numbers: List of 0-indexed page numbers to extract from

        Returns:
            dict: Same format as extract() method with additional metadata
                {
                    'data': extracted_data,
                    'confidence_scores': {...},
                    'validation_warnings': [...],
                    'metadata': {
                        'source_pages': [23, 24, 25],
                        'page_count': 3,
                        ...
                    }
                }
        """
        import tempfile
        import os
        from PyPDF2 import PdfReader, PdfWriter

        # Create temporary PDF with just the selected pages
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            temp_pdf_path = tmp.name

        try:
            # Extract selected pages
            reader = PdfReader(pdf_path)
            writer = PdfWriter()

            for page_idx in page_numbers:
                if page_idx < len(reader.pages):
                    writer.add_page(reader.pages[page_idx])

            # Write temporary PDF
            with open(temp_pdf_path, 'wb') as f:
                writer.write(f)

            # Extract from the temporary PDF using standard method
            logger.info(f"Extracting from pages {page_numbers} of {pdf_path}")
            result = self.extract(temp_pdf_path)

            # Add page metadata
            if 'metadata' not in result:
                result['metadata'] = {}

            result['metadata']['source_pages'] = page_numbers
            result['metadata']['page_count'] = len(page_numbers)
            result['metadata']['source_document'] = pdf_path

            return result

        finally:
            # Clean up temporary file
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
