"""
Column Discovery Service for Rent Roll Extraction

Analyzes uploaded Excel/CSV files and proposes column mappings.
Does NOT extract data - just analyzes structure for user confirmation.
"""

import re
import tempfile
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from decimal import Decimal
from datetime import datetime

import requests

try:
    from openpyxl import load_workbook
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    import csv
    HAS_CSV = True
except ImportError:
    HAS_CSV = False


class MappingConfidence(Enum):
    """Confidence level for column mapping."""
    HIGH = "high"      # 90%+ certain (exact header match)
    MEDIUM = "medium"  # 60-89% (fuzzy match or pattern)
    LOW = "low"        # <60% (guess based on data)
    NONE = "none"      # No match found


class MappingAction(Enum):
    """Suggested action for column mapping."""
    AUTO = "auto"           # High confidence, will map automatically
    SUGGEST = "suggest"     # Medium confidence, user should confirm
    NEEDS_INPUT = "needs_input"  # Low/no confidence, user must decide
    SKIP = "skip"           # User chose to skip


@dataclass
class ColumnMapping:
    """Column mapping proposal."""
    source_column: str           # Original column name from file
    source_index: int            # Column position in source (0-based)
    sample_values: List[str]     # First 5 non-empty values
    proposed_target: Optional[str]  # Suggested Landscape field
    confidence: str              # MappingConfidence value
    action: str                  # MappingAction value
    data_type_hint: str          # text, number, currency, date, boolean, percent
    notes: Optional[str]         # AI explanation of mapping decision


@dataclass
class DiscoveryResult:
    """Result of column discovery."""
    file_name: str
    total_rows: int
    total_columns: int
    columns: List[ColumnMapping]
    parse_warnings: List[str]    # Any issues during parsing
    is_structured: bool          # True for Excel/CSV, False for PDF


# Standard Landscape rent roll fields with aliases
# Based on tbl_multifamily_unit schema
STANDARD_FIELDS = {
    # Unit identification
    "unit_number": {
        "aliases": ["unit", "unit #", "unit no", "unit number", "apt", "apt #", "apartment", "unit no."],
        "data_type": "text",
        "required": True,
    },
    "building_name": {
        "aliases": ["building", "bldg", "building name", "property", "address"],
        "data_type": "text",
        "required": False,
    },
    "unit_type": {
        "aliases": ["type", "unit type", "floor plan", "floorplan", "plan", "style"],
        "data_type": "text",
        "required": False,
    },

    # Physical attributes
    "bedrooms": {
        "aliases": ["beds", "bed", "br", "bedrooms", "bd", "bedroom", "# beds"],
        "data_type": "number",
        "required": False,
    },
    "bathrooms": {
        "aliases": ["baths", "bath", "ba", "bathrooms", "bathroom", "# baths"],
        "data_type": "number",
        "required": False,
    },
    "square_feet": {
        "aliases": ["sqft", "sf", "sq ft", "square feet", "size", "area", "sq. ft.", "square footage"],
        "data_type": "number",
        "required": False,
    },

    # Occupancy
    "occupancy_status": {
        "aliases": ["status", "occupancy", "occ status", "lease status", "occ", "occupied"],
        "data_type": "text",
        "required": False,
    },

    # Tenant
    "tenant_name": {
        "aliases": ["tenant", "tenant name", "resident", "resident name", "lessee", "occupant", "name"],
        "data_type": "text",
        "required": False,
    },

    # Lease dates
    "lease_start": {
        "aliases": ["lease start", "lease from", "lease begin", "start date", "move in", "move-in", "movein", "commencement", "lease start date"],
        "data_type": "date",
        "required": False,
    },
    "lease_end": {
        "aliases": ["lease end", "lease to", "lease expiration", "expiration", "expiry", "end date", "lease end date", "expires", "lease exp"],
        "data_type": "date",
        "required": False,
    },
    "move_in_date": {
        "aliases": ["move in date", "move-in date", "movein date", "original move in"],
        "data_type": "date",
        "required": False,
    },

    # Financial
    "current_rent": {
        "aliases": ["rent", "contract rent", "actual rent", "current rent", "monthly rent", "base rent", "gross rent"],
        "data_type": "currency",
        "required": False,
    },
    "market_rent": {
        "aliases": ["market", "market rent", "asking rent", "asking", "mkt rent", "pro forma rent"],
        "data_type": "currency",
        "required": False,
    },

    # Renovation
    "renovation_status": {
        "aliases": ["reno status", "renovation", "renovated", "upgraded", "classic", "premium"],
        "data_type": "text",
        "required": False,
    },
    "renovation_date": {
        "aliases": ["reno date", "renovation date", "upgrade date", "renovated date"],
        "data_type": "date",
        "required": False,
    },
    "renovation_cost": {
        "aliases": ["reno cost", "renovation cost", "upgrade cost"],
        "data_type": "currency",
        "required": False,
    },
}


# Patterns that suggest specific data types
TYPE_PATTERNS = {
    "currency": [r"^\$", r"rent", r"income", r"fee", r"charge", r"amount", r"balance", r"delinquent", r"cost", r"price"],
    "date": [r"date", r"from", r"to", r"start", r"end", r"expir", r"move.?in", r"move.?out", r"effective"],
    "boolean": [r"section\s*8", r"voucher", r"subsidized", r"y/n", r"yes/no", r"is_", r"has_"],
    "number": [r"sqft", r"sf", r"beds", r"baths", r"bd", r"ba", r"count", r"#", r"number", r"qty"],
    "percent": [r"percent", r"rate", r"%", r"occupancy.*rate"],
}


def discover_columns(
    storage_uri: str,
    mime_type: Optional[str] = None,
    file_name: Optional[str] = None,
    project_id: Optional[int] = None
) -> DiscoveryResult:
    """
    Analyze an uploaded rent roll file and discover all columns.
    Returns mapping proposals for each column.

    Args:
        storage_uri: URL to the uploaded file
        mime_type: MIME type (optional, will infer from URL)
        file_name: Original filename (optional)
        project_id: Project ID for context

    Returns:
        DiscoveryResult with all columns and proposed mappings
    """
    warnings: List[str] = []

    # Infer mime type from URL if not provided
    if not mime_type:
        mime_type = _infer_mime_type(storage_uri, file_name)

    # Check if file type is supported for column discovery
    is_structured = _is_structured_file(mime_type)
    if not is_structured:
        return DiscoveryResult(
            file_name=file_name or "unknown",
            total_rows=0,
            total_columns=0,
            columns=[],
            parse_warnings=["PDF detected—Landscaper will analyze this document and propose extracted data for your review."],
            is_structured=False,
        )

    # Download file to temp location
    try:
        response = requests.get(storage_uri, timeout=60)
        response.raise_for_status()
    except Exception as e:
        return DiscoveryResult(
            file_name=file_name or "unknown",
            total_rows=0,
            total_columns=0,
            columns=[],
            parse_warnings=[f"Failed to download file: {str(e)}"],
            is_structured=False,
        )

    # Save to temp file
    suffix = _get_extension(mime_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    try:
        # Parse based on file type
        if mime_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']:
            headers, data_rows, parse_warnings = _parse_xlsx(tmp_path)
        elif mime_type in ['text/csv', 'application/csv']:
            headers, data_rows, parse_warnings = _parse_csv(tmp_path)
        else:
            return DiscoveryResult(
                file_name=file_name or "unknown",
                total_rows=0,
                total_columns=0,
                columns=[],
                parse_warnings=[f"Unsupported file type: {mime_type}"],
                is_structured=False,
            )

        warnings.extend(parse_warnings)

        # Build column mappings
        columns = []
        for idx, header in enumerate(headers):
            sample_values = _get_sample_values(data_rows, idx, max_samples=5)
            proposed_target, confidence = _match_column_to_field(header, sample_values)
            data_type = _infer_data_type(header, sample_values)

            # Determine action based on confidence
            if confidence == MappingConfidence.HIGH:
                action = MappingAction.AUTO
            elif confidence == MappingConfidence.MEDIUM:
                action = MappingAction.SUGGEST
            else:
                action = MappingAction.NEEDS_INPUT

            # Generate notes
            notes = _generate_mapping_notes(header, proposed_target, confidence, data_type)

            columns.append(ColumnMapping(
                source_column=header,
                source_index=idx,
                sample_values=sample_values,
                proposed_target=proposed_target,
                confidence=confidence.value,
                action=action.value,
                data_type_hint=data_type,
                notes=notes,
            ))

        return DiscoveryResult(
            file_name=file_name or "unknown",
            total_rows=len(data_rows),
            total_columns=len(headers),
            columns=columns,
            parse_warnings=warnings,
            is_structured=True,
        )

    finally:
        # Clean up temp file
        import os
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def _parse_xlsx(file_path: str) -> Tuple[List[str], List[List[Any]], List[str]]:
    """
    Parse Excel file and extract headers and data rows.

    Returns:
        Tuple of (headers, data_rows, warnings)
    """
    if not HAS_OPENPYXL:
        raise ImportError("openpyxl not installed. Run: pip install openpyxl")

    warnings = []
    wb = load_workbook(file_path, read_only=True, data_only=True)

    # Use first sheet (most rent rolls are single-sheet)
    sheet_name = wb.sheetnames[0]
    if len(wb.sheetnames) > 1:
        warnings.append(f"Multiple sheets detected. Using first sheet: '{sheet_name}'")

    sheet = wb[sheet_name]

    # Read all rows
    all_rows = []
    for row in sheet.iter_rows(values_only=True):
        # Convert to list and handle None
        row_data = [str(cell) if cell is not None else "" for cell in row]
        all_rows.append(row_data)

    wb.close()

    if not all_rows:
        return [], [], ["File appears to be empty"]

    # Detect header row (first row with multiple non-empty cells)
    header_row_idx = _find_header_row(all_rows)
    if header_row_idx == -1:
        warnings.append("Could not detect header row. Using first row.")
        header_row_idx = 0

    headers = all_rows[header_row_idx]
    data_rows = all_rows[header_row_idx + 1:]

    # Clean headers
    headers = [h.strip() if h else f"Column_{i+1}" for i, h in enumerate(headers)]

    # Remove completely empty rows
    data_rows = [row for row in data_rows if any(cell.strip() for cell in row)]

    return headers, data_rows, warnings


def _parse_csv(file_path: str) -> Tuple[List[str], List[List[Any]], List[str]]:
    """
    Parse CSV file and extract headers and data rows.

    Returns:
        Tuple of (headers, data_rows, warnings)
    """
    warnings = []

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        # Detect dialect
        sample = f.read(8192)
        f.seek(0)

        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel

        reader = csv.reader(f, dialect)
        all_rows = [row for row in reader]

    if not all_rows:
        return [], [], ["File appears to be empty"]

    # Detect header row
    header_row_idx = _find_header_row(all_rows)
    if header_row_idx == -1:
        warnings.append("Could not detect header row. Using first row.")
        header_row_idx = 0

    headers = all_rows[header_row_idx]
    data_rows = all_rows[header_row_idx + 1:]

    # Clean headers
    headers = [h.strip() if h else f"Column_{i+1}" for i, h in enumerate(headers)]

    # Remove completely empty rows
    data_rows = [row for row in data_rows if any(cell.strip() for cell in row if cell)]

    return headers, data_rows, warnings


def _find_header_row(rows: List[List[str]], max_check: int = 10) -> int:
    """
    Find the header row in the data.
    Headers typically have multiple non-empty text cells without numbers.
    """
    for idx, row in enumerate(rows[:max_check]):
        non_empty = [cell for cell in row if cell and cell.strip()]
        if len(non_empty) >= 3:
            # Check if this looks like headers (mostly text, not numbers)
            text_count = sum(1 for cell in non_empty if not _is_numeric(cell))
            if text_count >= len(non_empty) * 0.7:
                return idx
    return 0


def _get_sample_values(data_rows: List[List[Any]], col_idx: int, max_samples: int = 5) -> List[str]:
    """Get sample non-empty values from a column."""
    samples = []
    for row in data_rows:
        if col_idx < len(row):
            val = str(row[col_idx]).strip()
            if val and val not in samples:
                samples.append(val)
                if len(samples) >= max_samples:
                    break
    return samples


def _match_column_to_field(
    column_name: str,
    sample_values: List[str]
) -> Tuple[Optional[str], MappingConfidence]:
    """
    Attempt to match a source column to a standard Landscape field.
    Returns (field_name, confidence) or (None, NONE).
    """
    if not column_name:
        return None, MappingConfidence.NONE

    normalized = column_name.lower().strip()

    # Check exact matches first (HIGH confidence)
    for field, config in STANDARD_FIELDS.items():
        for alias in config["aliases"]:
            if normalized == alias:
                return field, MappingConfidence.HIGH

    # Check partial matches (MEDIUM confidence)
    for field, config in STANDARD_FIELDS.items():
        for alias in config["aliases"]:
            # Check if alias is contained in column name or vice versa
            if alias in normalized or normalized in alias:
                return field, MappingConfidence.MEDIUM

    # Check word boundaries (MEDIUM confidence)
    words = set(re.split(r'\W+', normalized))
    for field, config in STANDARD_FIELDS.items():
        for alias in config["aliases"]:
            alias_words = set(re.split(r'\W+', alias))
            if alias_words & words:  # Any overlap
                return field, MappingConfidence.MEDIUM

    # No match found
    return None, MappingConfidence.NONE


def _infer_data_type(column_name: str, sample_values: List[str]) -> str:
    """
    Infer the data type from column name and sample values.
    Returns: text, number, currency, date, boolean, percent
    """
    col_lower = column_name.lower()

    # Check column name patterns
    for dtype, patterns in TYPE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, col_lower, re.IGNORECASE):
                return dtype

    # Analyze sample values
    if sample_values:
        # Check for currency
        if any(v.startswith('$') or v.startswith('-$') or v.startswith('($') for v in sample_values if v):
            return "currency"

        # Check for dates
        date_patterns = [r'\d{1,2}/\d{1,2}/\d{2,4}', r'\d{4}-\d{2}-\d{2}', r'\d{1,2}-\d{1,2}-\d{2,4}']
        if any(re.match(p, v) for v in sample_values for p in date_patterns if v):
            return "date"

        # Check for percentages
        if any('%' in v for v in sample_values if v):
            return "percent"

        # Check for boolean-like
        bool_vals = {'yes', 'no', 'y', 'n', 'true', 'false', '1', '0', 'x', ''}
        cleaned_vals = [v.lower().strip() for v in sample_values if v]
        if cleaned_vals and all(v in bool_vals for v in cleaned_vals):
            return "boolean"

        # Check for numbers
        try:
            for v in sample_values:
                if v:
                    clean = v.replace(',', '').replace('$', '').replace('(', '-').replace(')', '').strip()
                    if clean and clean != '-':
                        float(clean)
            return "number"
        except ValueError:
            pass

    return "text"


def _generate_mapping_notes(
    header: str,
    proposed_target: Optional[str],
    confidence: MappingConfidence,
    data_type: str
) -> Optional[str]:
    """Generate human-readable notes about the mapping decision."""
    if confidence == MappingConfidence.HIGH:
        return f"Exact match to '{proposed_target}' field"
    elif confidence == MappingConfidence.MEDIUM:
        return f"Likely matches '{proposed_target}' - please confirm"
    elif proposed_target:
        return f"Possible match to '{proposed_target}' - review recommended"
    else:
        if data_type == "currency":
            return "Contains currency values - may be a financial field"
        elif data_type == "date":
            return "Contains date values"
        elif data_type == "boolean":
            return "Contains yes/no or flag values"
        return "No automatic mapping found - choose a field or create new column"


def _is_structured_file(mime_type: str) -> bool:
    """Check if file type supports column discovery."""
    structured_types = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
    ]
    return mime_type in structured_types


def _infer_mime_type(url: str, file_name: Optional[str] = None) -> str:
    """Infer MIME type from URL or filename."""
    check_str = (file_name or url).lower()

    if check_str.endswith('.xlsx'):
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif check_str.endswith('.xls'):
        return 'application/vnd.ms-excel'
    elif check_str.endswith('.csv'):
        return 'text/csv'
    elif check_str.endswith('.pdf'):
        return 'application/pdf'

    return 'application/octet-stream'


def _get_extension(mime_type: str) -> str:
    """Get file extension for MIME type."""
    extensions = {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-excel': '.xls',
        'text/csv': '.csv',
        'application/csv': '.csv',
    }
    return extensions.get(mime_type, '.tmp')


def _is_numeric(value: str) -> bool:
    """Check if a string value is numeric."""
    if not value:
        return False
    try:
        clean = value.replace(',', '').replace('$', '').replace('(', '').replace(')', '').replace('%', '').strip()
        if clean:
            float(clean)
            return True
    except (ValueError, TypeError):
        pass
    return False


def analyze_complex_column(column_name: str, sample_values: List[str]) -> Dict[str, Any]:
    """
    Analyze columns that might contain multiple data types or need splitting.
    Example: "Tags" column with "Residential Unit, Sec. 8, UD Mirage"

    Returns suggestions for splitting or parsing.
    """
    suggestions = []

    # Check for delimiter-separated values
    delimiters = [',', ';', '|', '/']
    for delim in delimiters:
        if any(delim in v for v in sample_values if v):
            # This column might need splitting
            all_parts = set()
            for v in sample_values:
                if v:
                    parts = [p.strip() for p in v.split(delim)]
                    all_parts.update(p for p in parts if p)

            if len(all_parts) > 1:
                suggestions.append({
                    "type": "split",
                    "delimiter": delim,
                    "unique_values": sorted(list(all_parts))[:20],  # Cap at 20
                    "suggestion": f"Contains {len(all_parts)} unique values separated by '{delim}'. Consider splitting into separate columns."
                })

    # Check for Section 8 indicators
    sec8_indicators = ['sec 8', 'sec. 8', 'section 8', 'section8', 'hcv', 'voucher']
    if any(any(ind in v.lower() for ind in sec8_indicators) for v in sample_values if v):
        suggestions.append({
            "type": "extract_boolean",
            "field": "is_section_8",
            "suggestion": "Contains Section 8/voucher indicators. Extract as a Yes/No column?"
        })

    # Check for delinquency patterns
    delinquent_patterns = [r'delinquent', r'past.?due', r'balance', r'owing']
    col_lower = column_name.lower()
    if any(re.search(p, col_lower) for p in delinquent_patterns):
        suggestions.append({
            "type": "extract_currency",
            "field": "delinquent_balance",
            "suggestion": "Contains delinquency/balance data. Extract as currency column?"
        })

    return {
        "column": column_name,
        "suggestions": suggestions,
        "sample_values": sample_values[:10]
    }


def discovery_result_to_dict(result: DiscoveryResult) -> Dict[str, Any]:
    """Convert DiscoveryResult to JSON-serializable dict."""
    return {
        "file_name": result.file_name,
        "total_rows": result.total_rows,
        "total_columns": result.total_columns,
        "columns": [asdict(col) for col in result.columns],
        "parse_warnings": result.parse_warnings,
        "is_structured": result.is_structured,
    }
