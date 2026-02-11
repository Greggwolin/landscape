"""
Excel/CSV rent roll extraction service using pandas and Claude API.
"""

import pandas as pd
import anthropic
import os
from typing import Dict, List, Optional
from datetime import datetime
import re
import json


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

        Args:
            file_path: Path to the Excel/CSV file
            classification_metadata: Metadata from classification step

        Returns:
            {
                'unit_types': [...],
                'units': [...],
                'leases': [...],
                'property_info': {...},
                'quality_score': 0.0-1.0,
                'validation_warnings': [...]
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

        # Step 7: Generate raw_text so Landscaper can see full document content
        raw_text = self._generate_raw_text(df, property_info)

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
            },
            'raw_text': raw_text,
        }

    def _load_rent_roll(self, file_path: str, metadata: Dict) -> pd.DataFrame:
        """
        Load Excel/CSV with intelligent header detection
        """
        import traceback
        print(f"\n=== DEBUG: _load_rent_roll ===")
        print(f"File path: {file_path}")
        print(f"Metadata: {metadata}")

        estimated_header = metadata.get('metadata', {}).get('estimated_header_row', 0)
        print(f"Estimated header row: {estimated_header}")

        # Try loading with estimated skip rows (try up to 12 rows)
        for skip in range(0, 12):
            try:
                print(f"\nTrying skiprows={skip}")
                df = pd.read_excel(file_path, skiprows=skip)

                print(f"Columns found: {list(df.columns)}")
                print(f"DataFrame shape: {df.shape}")
                print(f"First 5 rows:\n{df.head()}")

                # Check if we found the header
                cols_lower = [str(c).lower() for c in df.columns]
                print(f"Lowercase columns: {cols_lower}")

                if 'unit' in cols_lower or 'tenant' in cols_lower:
                    print(f"✓ Found header at skiprows={skip}")
                    # Clean up
                    df.columns = df.columns.str.strip()

                    # Remove summary rows at bottom
                    df = df[df[df.columns[0]].notna()]
                    df = df[~df[df.columns[0]].astype(str).str.contains(
                        'total|summary|TOTAL', case=False, na=False
                    )]

                    print(f"After cleanup - shape: {df.shape}")
                    return df
                else:
                    print(f"✗ No 'unit' or 'tenant' column found")
            except Exception as e:
                print(f"✗ Error at skiprows={skip}: {e}")
                traceback.print_exc()
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
        print(f"\n=== DEBUG: _extract_units ===")
        print(f"DataFrame shape: {df.shape}")
        print(f"Available columns: {list(df.columns)}")

        units = []

        # Find key columns
        unit_col = next((c for c in df.columns if 'unit' in str(c).lower()), None)
        bdba_col = next((c for c in df.columns if 'bd' in str(c).lower() and 'ba' in str(c).lower()), None)
        sqft_col = next((c for c in df.columns if 'sqft' in str(c).lower() or 'sf' in str(c).lower()), None)
        status_col = next((c for c in df.columns if 'status' in str(c).lower()), None)
        tags_col = next((c for c in df.columns if 'tag' in str(c).lower()), None)

        print(f"Found columns - unit: {unit_col}, bdba: {bdba_col}, sqft: {sqft_col}, status: {status_col}")

        if not unit_col:
            print(f"✗ No unit column found! Cannot extract units.")
            return units

        print(f"Processing {len(df)} rows...")

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

    def _generate_raw_text(self, df: pd.DataFrame, property_info: Dict) -> str:
        """
        Generate a tab-separated text representation of the full DataFrame
        so Landscaper can read the complete rent roll (not just first N rows).
        """
        lines = []

        # Property header
        prop_name = property_info.get('property_name') or 'Unknown Property'
        prop_addr = property_info.get('property_address') or ''
        report_date = property_info.get('report_date') or ''
        lines.append(f"RENT ROLL: {prop_name}")
        if prop_addr:
            lines.append(f"Address: {prop_addr}")
        if report_date:
            lines.append(f"Report Date: {report_date}")
        lines.append("")

        # Column headers
        cols = list(df.columns)
        lines.append("\t".join(str(c) for c in cols))
        lines.append("-" * 80)

        # All data rows
        for _, row in df.iterrows():
            values = []
            for col in cols:
                val = row[col]
                if pd.isna(val):
                    values.append("")
                else:
                    values.append(str(val))
            lines.append("\t".join(values))

        lines.append("")
        lines.append(f"Total rows: {len(df)}")

        return "\n".join(lines)

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
