"""HBACA permit file parsers.

Supports two file formats:
- Master file: Full history (HBACA_Permits_Master_Through_YYYY-MM.xlsx)
- Monthly update: Rolling 2-year window (2025_SF_Permits_-_MM_Mon.xlsx)
"""

from __future__ import annotations

import logging
import re
from calendar import monthrange
from datetime import date
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd

from .schemas import MarketActivityRecord


logger = logging.getLogger(__name__)


def normalize_jurisdiction_name(name: str) -> str:
    """Normalize jurisdiction names for consistency.

    - Strips whitespace
    - Removes asterisks (e.g., 'Maricopa*' -> 'Maricopa')
    """
    if not name:
        return name
    # Remove asterisks and strip whitespace
    normalized = name.replace('*', '').strip()
    return normalized


def month_start_to_end(month_start: date) -> date:
    """Convert first-of-month date to end-of-month date.

    Args:
        month_start: Date representing first day of month (or any day in month).

    Returns:
        Date representing last day of that month.
    """
    last_day = monthrange(month_start.year, month_start.month)[1]
    return date(month_start.year, month_start.month, last_day)


def recognize_hbaca_file(filepath: str) -> Optional[str]:
    """Identify HBACA file type from filename or content.

    Args:
        filepath: Path to the Excel file.

    Returns:
        'master' for master files, 'monthly' for monthly updates, None if unrecognized.
    """
    filename = Path(filepath).name.lower()

    # Master file pattern: HBACA_Permits_Master_Through_YYYY-MM.xlsx
    if 'hbaca' in filename and 'master' in filename:
        return 'master'

    # Monthly update pattern: 2025_SF_Permits_-_08_Aug.xlsx
    if 'sf_permits' in filename and filename.endswith('.xlsx'):
        return 'monthly'

    # Check content if filename doesn't match
    try:
        xl = pd.ExcelFile(filepath)
        if 'Permits' in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name='Permits')
            if 'Month' in df.columns and 'HBACA TOTAL' in df.columns:
                return 'master'
        if 'Current Month' in xl.sheet_names:
            return 'monthly'
    except Exception as exc:
        logger.warning("Failed to inspect file %s: %s", filepath, exc)

    return None


def parse_master_file(
    filepath: str,
    msa_code: str = '38060',
) -> Tuple[List[MarketActivityRecord], dict]:
    """Parse HBACA master file (full permit history).

    Args:
        filepath: Path to the master Excel file.
        msa_code: MSA code to assign (default: '38060' for Phoenix).

    Returns:
        Tuple of (list of MarketActivityRecord, metadata dict).

    Raises:
        ValueError: If file format is invalid.
    """
    logger.info("Parsing HBACA master file: %s", filepath)

    df = pd.read_excel(filepath, sheet_name='Permits')

    # Validate expected structure
    if 'Month' not in df.columns:
        raise ValueError("Master file missing 'Month' column")
    if 'HBACA TOTAL' not in df.columns:
        raise ValueError("Master file missing 'HBACA TOTAL' column")

    # Get jurisdiction columns (exclude Month and HBACA TOTAL)
    jurisdictions = [
        c for c in df.columns
        if c not in ['Month', 'HBACA TOTAL']
    ]
    logger.info("Found %d jurisdictions: %s", len(jurisdictions), jurisdictions)

    records: List[MarketActivityRecord] = []
    skipped_zero = 0
    skipped_nan = 0

    for _, row in df.iterrows():
        # Parse month (source has first-of-month dates)
        month_val = row['Month']
        if pd.isna(month_val):
            continue

        month_start = pd.to_datetime(month_val).date()
        period_end = month_start_to_end(month_start)

        for jurisdiction in jurisdictions:
            count = row[jurisdiction]

            # Skip NaN values (month not yet reported)
            if pd.isna(count):
                skipped_nan += 1
                continue

            # Handle non-numeric placeholders like '-' or 'c'
            try:
                count_int = int(count)
            except (ValueError, TypeError):
                # Non-numeric value (e.g., '-', 'c') - treat as no data
                skipped_nan += 1
                continue

            # Include zero values (0 permits is valid data, different from missing)
            # But log for awareness
            if count_int == 0:
                skipped_zero += 1
                # Still create record for zero - it's meaningful data
                # Continue to next if we want to skip zeros (uncomment below)
                # continue

            normalized_name = normalize_jurisdiction_name(jurisdiction)

            records.append(MarketActivityRecord(
                msa_code=msa_code,
                source='HBACA',
                metric_type='permits',
                geography_type='jurisdiction',
                geography_name=normalized_name,
                period_type='monthly',
                period_end_date=period_end,
                value=count_int,
            ))

    # Calculate metadata
    dates = df['Month'].dropna()
    min_date = pd.to_datetime(dates.min()).date()
    max_date = pd.to_datetime(dates.max()).date()

    metadata = {
        'file_type': 'master',
        'filepath': str(filepath),
        'msa_code': msa_code,
        'jurisdiction_count': len(jurisdictions),
        'jurisdictions': [normalize_jurisdiction_name(j) for j in jurisdictions],
        'month_count': len(df),
        'date_range_start': min_date.isoformat(),
        'date_range_end': month_start_to_end(max_date).isoformat(),
        'record_count': len(records),
        'skipped_nan': skipped_nan,
        'zero_value_count': skipped_zero,
    }

    logger.info(
        "Parsed %d records from %d months × %d jurisdictions (skipped %d NaN, %d zeros included)",
        len(records),
        len(df),
        len(jurisdictions),
        skipped_nan,
        skipped_zero,
    )

    return records, metadata


def parse_monthly_update(
    filepath: str,
    msa_code: str = '38060',
) -> Tuple[List[MarketActivityRecord], dict]:
    """Parse HBACA monthly update file (rolling 2-year window).

    The monthly update file has a funky format:
    - Row 0: Year markers (e.g., "2024" at col 1, "2025" at col 13)
    - Row 1: Month names (Jan-Dec repeated for each year)
    - Rows 2-21: Jurisdiction data (jurisdiction name in col 0)
    - Row 22: "Total" row (skip)
    - Rows 23+: Footer/disclaimers (skip)

    Args:
        filepath: Path to the monthly update Excel file.
        msa_code: MSA code to assign (default: '38060' for Phoenix).

    Returns:
        Tuple of (list of MarketActivityRecord, metadata dict).
    """
    logger.info("Parsing HBACA monthly update file: %s", filepath)

    df = pd.read_excel(filepath, sheet_name='Current Month', header=None)

    # Find year markers in row 0
    year_positions: dict[int, int] = {}
    for col in range(df.shape[1]):
        val = df.iloc[0, col]
        if pd.notna(val):
            val_str = str(val).strip()
            if val_str.isdigit() and len(val_str) == 4:
                year_positions[int(val_str)] = col

    logger.info("Found year positions: %s", year_positions)

    # Month mapping
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    month_to_num = {m: i + 1 for i, m in enumerate(months)}

    records: List[MarketActivityRecord] = []
    jurisdictions_found: set[str] = set()
    skipped_nan = 0

    # Process jurisdiction rows (2-21, skip Total and footer)
    for row_idx in range(2, min(22, df.shape[0])):
        jurisdiction = df.iloc[row_idx, 0]
        if pd.isna(jurisdiction):
            continue

        jurisdiction_str = str(jurisdiction).strip()
        if jurisdiction_str.lower() in ['total', 'nan', '']:
            continue

        normalized_name = normalize_jurisdiction_name(jurisdiction_str)
        jurisdictions_found.add(normalized_name)

        for year, start_col in year_positions.items():
            for month_offset in range(12):
                col = start_col + month_offset
                if col >= df.shape[1]:
                    break

                count = df.iloc[row_idx, col]
                if pd.isna(count):
                    skipped_nan += 1
                    continue

                if not isinstance(count, (int, float)):
                    continue

                count_int = int(count)
                month_num = month_offset + 1
                last_day = monthrange(year, month_num)[1]
                period_end = date(year, month_num, last_day)

                records.append(MarketActivityRecord(
                    msa_code=msa_code,
                    source='HBACA',
                    metric_type='permits',
                    geography_type='jurisdiction',
                    geography_name=normalized_name,
                    period_type='monthly',
                    period_end_date=period_end,
                    value=count_int,
                ))

    # Calculate date range from records
    if records:
        dates = [r.period_end_date for r in records]
        min_date = min(dates)
        max_date = max(dates)
    else:
        min_date = max_date = None

    metadata = {
        'file_type': 'monthly',
        'filepath': str(filepath),
        'msa_code': msa_code,
        'jurisdiction_count': len(jurisdictions_found),
        'jurisdictions': sorted(jurisdictions_found),
        'years_found': sorted(year_positions.keys()),
        'date_range_start': min_date.isoformat() if min_date else None,
        'date_range_end': max_date.isoformat() if max_date else None,
        'record_count': len(records),
        'skipped_nan': skipped_nan,
    }

    logger.info(
        "Parsed %d records from %d jurisdictions (skipped %d NaN)",
        len(records),
        len(jurisdictions_found),
        skipped_nan,
    )

    return records, metadata


def parse_hbaca_file(
    filepath: str,
    msa_code: str = '38060',
    file_type: Optional[str] = None,
) -> Tuple[List[MarketActivityRecord], dict]:
    """Parse an HBACA file, auto-detecting type if not specified.

    Args:
        filepath: Path to the Excel file.
        msa_code: MSA code to assign (default: '38060' for Phoenix).
        file_type: 'master' or 'monthly', or None to auto-detect.

    Returns:
        Tuple of (list of MarketActivityRecord, metadata dict).

    Raises:
        ValueError: If file type cannot be determined or is invalid.
    """
    if file_type is None:
        file_type = recognize_hbaca_file(filepath)

    if file_type is None:
        raise ValueError(
            f"Could not recognize HBACA file type for: {filepath}. "
            "Expected master file (HBACA_Permits_Master_*.xlsx) or "
            "monthly update (YYYY_SF_Permits_*.xlsx)."
        )

    if file_type == 'master':
        return parse_master_file(filepath, msa_code)
    elif file_type == 'monthly':
        return parse_monthly_update(filepath, msa_code)
    else:
        raise ValueError(f"Unknown file type: {file_type}")
