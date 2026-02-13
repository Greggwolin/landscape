"""Market research document extractor.

Extracts tabular data from market research reports, presentations, and analyst
documents (Newmark, CBRE, JLL, Cushman, Marcus & Millichap, CoStar, etc.).

Unlike rent roll or operating statement extractors which expect specific table
structures, market research tables are heterogeneous. This extractor captures
ALL tables found, canonicalizing headers where possible and keeping the rest as-is.
"""

from .base import BaseExtractor
import pandas as pd
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class MarketResearchExtractor(BaseExtractor):
    """Extract tabular data from market research PDFs and Excel files"""

    def __init__(self):
        base_dir = Path(__file__).parent.parent
        header_spec_path = base_dir / 'specs' / 'headers' / 'market_research_headers.yaml'
        validator_spec_path = base_dir / 'specs' / 'validators' / 'market_research_v1.yaml'

        super().__init__(
            header_spec_path=str(header_spec_path),
            validator_spec_path=str(validator_spec_path)
        )

    def extract_from_pdf(self, file_path):
        """Extract all tables from a market research PDF."""
        import pdfplumber
        logger.info(f"Extracting market research tables from PDF: {file_path}")

        try:
            with pdfplumber.open(file_path) as pdf:
                all_tables = []
                all_rows = []

                for page_idx, page in enumerate(pdf.pages):
                    tables = page.extract_tables()

                    for table_idx, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue

                        # Filter empty rows
                        filtered = [
                            row for row in table
                            if row and any(cell and str(cell).strip() for cell in row)
                        ]
                        if len(filtered) < 2:
                            continue

                        header_row = filtered[0]
                        canonical_headers = []
                        raw_headers = []

                        for header in header_row:
                            raw = str(header).strip() if header else ''
                            raw_headers.append(raw)
                            canonical = self.canonicalize_header(
                                header,
                                self.header_mappings['market_research_headers']
                            )
                            canonical_headers.append(canonical or raw)

                        # Parse data rows
                        table_rows = []
                        for row in filtered[1:]:
                            if len(row) != len(canonical_headers):
                                continue

                            row_data = {}
                            for i, field in enumerate(canonical_headers):
                                if field:
                                    row_data[field] = row[i]

                            if not any(row_data.values()):
                                continue

                            table_rows.append(row_data)
                            all_rows.append(row_data)

                        if table_rows:
                            all_tables.append({
                                'page': page_idx + 1,
                                'table_index': table_idx,
                                'headers': raw_headers,
                                'canonical_headers': canonical_headers,
                                'rows': table_rows,
                                'row_count': len(table_rows),
                            })

                confidence_scores = self._calculate_table_confidence(all_rows)

                warnings = []
                for row in all_rows:
                    row_warnings = self.validate_data(row)
                    warnings.extend(row_warnings)

                return {
                    'data': all_rows,
                    'tables': all_tables,
                    'confidence_scores': confidence_scores,
                    'validation_warnings': warnings,
                    'metadata': {
                        'tables_count': len(all_tables),
                        'rows_count': len(all_rows),
                        'extraction_method': 'pdfplumber'
                    }
                }

        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Unable to extract market research from PDF: {file_path}")

    def extract_from_excel(self, file_path):
        """Extract market research data from Excel."""
        logger.info(f"Extracting market research from Excel: {file_path}")

        try:
            xls = pd.ExcelFile(file_path)
            all_rows = []
            all_tables = []

            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                if df.empty:
                    continue

                # Canonicalize headers
                raw_headers = list(df.columns)
                df.columns = [
                    self.canonicalize_header(
                        col, self.header_mappings['market_research_headers']
                    ) or str(col)
                    for col in df.columns
                ]

                rows = df.to_dict('records')
                all_rows.extend(rows)
                all_tables.append({
                    'sheet': sheet_name,
                    'headers': raw_headers,
                    'canonical_headers': list(df.columns),
                    'rows': rows,
                    'row_count': len(rows),
                })

            confidence_scores = self._calculate_table_confidence(all_rows)

            warnings = []
            for row in all_rows:
                warnings.extend(self.validate_data(row))

            return {
                'data': all_rows,
                'tables': all_tables,
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'tables_count': len(all_tables),
                    'rows_count': len(all_rows),
                    'extraction_method': 'pandas'
                }
            }

        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Unable to extract market research from Excel: {file_path}")

    def extract_from_csv(self, file_path):
        """Extract market research data from CSV."""
        logger.info(f"Extracting market research from CSV: {file_path}")

        try:
            df = pd.read_csv(file_path)

            raw_headers = list(df.columns)
            df.columns = [
                self.canonicalize_header(
                    col, self.header_mappings['market_research_headers']
                ) or str(col)
                for col in df.columns
            ]

            all_rows = df.to_dict('records')
            confidence_scores = self._calculate_table_confidence(all_rows)

            warnings = []
            for row in all_rows:
                warnings.extend(self.validate_data(row))

            return {
                'data': all_rows,
                'tables': [{
                    'headers': raw_headers,
                    'canonical_headers': list(df.columns),
                    'rows': all_rows,
                    'row_count': len(all_rows),
                }],
                'confidence_scores': confidence_scores,
                'validation_warnings': warnings,
                'metadata': {
                    'tables_count': 1,
                    'rows_count': len(all_rows),
                    'extraction_method': 'pandas'
                }
            }

        except Exception as e:
            logger.error(f"CSV extraction failed: {e}")
            raise ValueError(f"Unable to extract market research from CSV: {file_path}")

    def _calculate_table_confidence(self, rows):
        """Calculate confidence scores for each extracted row."""
        scores = []

        for row in rows:
            row_scores = {}

            for field, config in self.validation_rules.get('fields', {}).items():
                if field in row:
                    confidence = self.calculate_confidence(row[field], config)
                    row_scores[field] = confidence

            scores.append(row_scores)

        return scores
