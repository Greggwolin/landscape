"""HBACA permit data ingestion for unified market intelligence schema.

Supports:
- Master file: Full history (HBACA_Permits_Master_Through_YYYY-MM.xlsx)
- Monthly update: Rolling 2-year window (YYYY_SF_Permits_-_MM_Mon.xlsx)

All data flows into mkt_permit_history table.
"""

from __future__ import annotations

import logging
import re
from calendar import monthrange
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import pandas as pd

logger = logging.getLogger(__name__)


# Known HBACA jurisdictions for Phoenix MSA
PHX_JURISDICTIONS = [
    'Apache Junction', 'Avondale', 'Buckeye', 'Casa Grande', 'Chandler',
    'Coolidge', 'El Mirage', 'Florence', 'Gilbert', 'Glendale', 'Goodyear',
    'Maricopa', 'Maricopa County', 'Mesa', 'Paradise Valley', 'Peoria',
    'Phoenix', 'Pinal County', 'Queen Creek', 'Scottsdale', 'Surprise', 'Tempe',
]

# Jurisdiction type mapping
JURISDICTION_TYPES = {
    'Maricopa County': 'County',
    'Pinal County': 'County',
    'Apache Junction': 'City',
    'Avondale': 'City',
    'Buckeye': 'City',
    'Casa Grande': 'City',
    'Chandler': 'City',
    'Coolidge': 'City',
    'El Mirage': 'City',
    'Florence': 'Town',
    'Gilbert': 'Town',
    'Glendale': 'City',
    'Goodyear': 'City',
    'Maricopa': 'City',
    'Mesa': 'City',
    'Paradise Valley': 'Town',
    'Peoria': 'City',
    'Phoenix': 'City',
    'Queen Creek': 'Town',
    'Scottsdale': 'City',
    'Surprise': 'City',
    'Tempe': 'City',
}

# County mapping for jurisdictions
JURISDICTION_COUNTY = {
    'Apache Junction': 'Maricopa',
    'Avondale': 'Maricopa',
    'Buckeye': 'Maricopa',
    'Casa Grande': 'Pinal',
    'Chandler': 'Maricopa',
    'Coolidge': 'Pinal',
    'El Mirage': 'Maricopa',
    'Florence': 'Pinal',
    'Gilbert': 'Maricopa',
    'Glendale': 'Maricopa',
    'Goodyear': 'Maricopa',
    'Maricopa': 'Pinal',
    'Maricopa County': 'Maricopa',
    'Mesa': 'Maricopa',
    'Paradise Valley': 'Maricopa',
    'Peoria': 'Maricopa',
    'Phoenix': 'Maricopa',
    'Pinal County': 'Pinal',
    'Queen Creek': 'Maricopa',
    'Scottsdale': 'Maricopa',
    'Surprise': 'Maricopa',
    'Tempe': 'Maricopa',
}


def normalize_jurisdiction(name: str) -> str:
    """Normalize jurisdiction name.

    Handles asterisks, whitespace, and common variations.
    """
    if not name:
        return name
    # Remove asterisks and strip whitespace
    normalized = name.replace('*', '').strip()
    return normalized


def detect_hbaca_format(filepath: str) -> Optional[str]:
    """Detect HBACA file format from filename or content.

    Args:
        filepath: Path to Excel file.

    Returns:
        'master' for master files, 'monthly' for monthly updates, None if unknown.
    """
    filename = Path(filepath).name.lower()

    # Master file pattern
    if 'hbaca' in filename and 'master' in filename:
        return 'master'

    # Monthly update pattern
    if 'sf_permits' in filename:
        return 'monthly'

    # Try to detect from content
    try:
        xl = pd.ExcelFile(filepath)
        if 'Permits' in xl.sheet_names:
            df = pd.read_excel(xl, sheet_name='Permits', nrows=5)
            if 'Month' in df.columns and 'HBACA TOTAL' in df.columns:
                return 'master'
        if 'Current Month' in xl.sheet_names:
            return 'monthly'
    except Exception as e:
        logger.warning("Could not detect format from content: %s", e)

    return None


def parse_master_file(
    filepath: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Parse HBACA master file (full permit history).

    Args:
        filepath: Path to master Excel file.

    Returns:
        Tuple of (list of record dicts, metadata dict).
    """
    logger.info("Parsing HBACA master file: %s", filepath)

    df = pd.read_excel(filepath, sheet_name='Permits')

    # Validate structure
    if 'Month' not in df.columns:
        raise ValueError("Master file missing 'Month' column")
    if 'HBACA TOTAL' not in df.columns:
        raise ValueError("Master file missing 'HBACA TOTAL' column")

    # Get jurisdiction columns
    jurisdictions = [
        c for c in df.columns
        if c not in ['Month', 'HBACA TOTAL']
    ]
    logger.info("Found %d jurisdictions", len(jurisdictions))

    records = []
    skipped_nan = 0
    zero_count = 0

    for _, row in df.iterrows():
        month_val = row['Month']
        if pd.isna(month_val):
            continue

        # Parse month to first day of month
        month_start = pd.to_datetime(month_val).date()
        permit_month = date(month_start.year, month_start.month, 1)

        for jurisdiction in jurisdictions:
            count = row[jurisdiction]

            # Skip NaN
            if pd.isna(count):
                skipped_nan += 1
                continue

            # Handle non-numeric placeholders
            try:
                count_int = int(count)
            except (ValueError, TypeError):
                skipped_nan += 1
                continue

            if count_int == 0:
                zero_count += 1

            normalized_name = normalize_jurisdiction(jurisdiction)

            records.append({
                'permit_month': permit_month,
                'jurisdiction_name': normalized_name,
                'jurisdiction_type': JURISDICTION_TYPES.get(normalized_name),
                'county': JURISDICTION_COUNTY.get(normalized_name),
                'state': 'AZ',
                'cbsa_code': 38060,  # Phoenix MSA
                'permits_sf': count_int,
                'permits_total': count_int,  # HBACA is SF only
            })

    # Calculate date range
    dates = df['Month'].dropna()
    min_date = pd.to_datetime(dates.min()).date()
    max_date = pd.to_datetime(dates.max()).date()

    metadata = {
        'file_type': 'master',
        'filepath': str(filepath),
        'jurisdiction_count': len(jurisdictions),
        'jurisdictions': [normalize_jurisdiction(j) for j in jurisdictions],
        'month_count': len(df),
        'date_range_start': min_date.isoformat(),
        'date_range_end': max_date.isoformat(),
        'records_parsed': len(records),
        'skipped_nan': skipped_nan,
        'zero_count': zero_count,
    }

    logger.info("Parsed %d records from %d months x %d jurisdictions",
                len(records), len(df), len(jurisdictions))

    return records, metadata


def parse_monthly_update(
    filepath: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Parse HBACA monthly update file (rolling 2-year window).

    The format has:
    - Row 0: Year markers
    - Row 1: Month names
    - Rows 2-21: Jurisdiction data
    - Row 22: Total row (skip)

    Args:
        filepath: Path to monthly update file.

    Returns:
        Tuple of (list of record dicts, metadata dict).
    """
    logger.info("Parsing HBACA monthly update file: %s", filepath)

    df = pd.read_excel(filepath, sheet_name='Current Month', header=None)

    # Find year markers in row 0
    year_positions: Dict[int, int] = {}
    for col in range(df.shape[1]):
        val = df.iloc[0, col]
        if pd.notna(val):
            val_str = str(val).strip()
            if val_str.isdigit() and len(val_str) == 4:
                year_positions[int(val_str)] = col

    logger.info("Found year positions: %s", year_positions)

    records = []
    jurisdictions_found = set()
    skipped_nan = 0

    # Process jurisdiction rows (typically rows 2-21)
    for row_idx in range(2, min(24, df.shape[0])):
        jurisdiction = df.iloc[row_idx, 0]
        if pd.isna(jurisdiction):
            continue

        jurisdiction_str = str(jurisdiction).strip()
        if jurisdiction_str.lower() in ['total', 'nan', '']:
            continue

        normalized_name = normalize_jurisdiction(jurisdiction_str)
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

                try:
                    count_int = int(count)
                except (ValueError, TypeError):
                    skipped_nan += 1
                    continue

                month_num = month_offset + 1
                permit_month = date(year, month_num, 1)

                records.append({
                    'permit_month': permit_month,
                    'jurisdiction_name': normalized_name,
                    'jurisdiction_type': JURISDICTION_TYPES.get(normalized_name),
                    'county': JURISDICTION_COUNTY.get(normalized_name),
                    'state': 'AZ',
                    'cbsa_code': 38060,
                    'permits_sf': count_int,
                    'permits_total': count_int,
                })

    # Calculate date range
    if records:
        dates = [r['permit_month'] for r in records]
        min_date = min(dates)
        max_date = max(dates)
    else:
        min_date = max_date = None

    metadata = {
        'file_type': 'monthly',
        'filepath': str(filepath),
        'jurisdiction_count': len(jurisdictions_found),
        'jurisdictions': sorted(jurisdictions_found),
        'years_found': sorted(year_positions.keys()),
        'date_range_start': min_date.isoformat() if min_date else None,
        'date_range_end': max_date.isoformat() if max_date else None,
        'records_parsed': len(records),
        'skipped_nan': skipped_nan,
    }

    logger.info("Parsed %d records from %d jurisdictions", len(records), len(jurisdictions_found))

    return records, metadata


def parse_hbaca_file(
    filepath: str,
    file_type: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Parse an HBACA file, auto-detecting type if not specified.

    Args:
        filepath: Path to Excel file.
        file_type: 'master' or 'monthly', or None to auto-detect.

    Returns:
        Tuple of (list of record dicts, metadata dict).
    """
    if file_type is None:
        file_type = detect_hbaca_format(filepath)

    if file_type is None:
        raise ValueError(
            f"Could not recognize HBACA file type for: {filepath}. "
            "Expected master file (HBACA_Permits_Master_*.xlsx) or "
            "monthly update (YYYY_SF_Permits_*.xlsx)."
        )

    if file_type == 'master':
        return parse_master_file(filepath)
    elif file_type == 'monthly':
        return parse_monthly_update(filepath)
    else:
        raise ValueError(f"Unknown file type: {file_type}")


def ingest_hbaca_file(
    filepath: str,
    file_type: Optional[str] = None,
    dry_run: bool = False,
    connection=None,
) -> Dict[str, Any]:
    """Ingest HBACA file into mkt_permit_history table.

    Args:
        filepath: Path to Excel file.
        file_type: 'master' or 'monthly', or None to auto-detect.
        dry_run: If True, parse only without persisting.
        connection: Database connection (if None, creates one).

    Returns:
        Dict with ingestion results.
    """
    # Parse file
    records, metadata = parse_hbaca_file(filepath, file_type)
    source_file = Path(filepath).name

    if dry_run:
        return {
            'success': True,
            'dry_run': True,
            'records_parsed': len(records),
            'metadata': metadata,
        }

    # Get connection if not provided
    close_connection = False
    if connection is None:
        # Use Django's database connection
        from django.db import connection as django_connection
        connection = django_connection.connection
        close_connection = False  # Django manages the connection

    try:
        # Get HBACA source_id
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT source_id FROM landscape.mkt_data_source_registry WHERE source_code = 'HBACA'"
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("HBACA source not found in mkt_data_source_registry. Run migration first.")
            source_id = row[0]

        # Upsert records
        inserted = 0
        updated = 0
        now = datetime.now()

        sql = """
            INSERT INTO landscape.mkt_permit_history (
                source_id, source_file, permit_month, jurisdiction_name,
                jurisdiction_type, county, state, cbsa_code,
                permits_sf, permits_total, ingestion_timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_id, permit_month, jurisdiction_name)
            DO UPDATE SET
                permits_sf = EXCLUDED.permits_sf,
                permits_total = EXCLUDED.permits_total,
                source_file = EXCLUDED.source_file,
                ingestion_timestamp = EXCLUDED.ingestion_timestamp
            RETURNING (xmax = 0) AS was_inserted
        """

        with connection.cursor() as cursor:
            for record in records:
                cursor.execute(sql, (
                    source_id,
                    source_file,
                    record['permit_month'],
                    record['jurisdiction_name'],
                    record.get('jurisdiction_type'),
                    record.get('county'),
                    record.get('state', 'AZ'),
                    record.get('cbsa_code', 38060),
                    record['permits_sf'],
                    record['permits_total'],
                    now,
                ))
                result = cursor.fetchone()
                if result and result[0]:
                    inserted += 1
                else:
                    updated += 1

        connection.commit()
        logger.info("Ingested %d records: %d inserted, %d updated", len(records), inserted, updated)

        return {
            'success': True,
            'dry_run': False,
            'records_parsed': len(records),
            'records_inserted': inserted,
            'records_updated': updated,
            'metadata': metadata,
        }

    except Exception as e:
        connection.rollback()
        logger.exception("Ingestion failed, transaction rolled back")
        raise
    finally:
        if close_connection:
            connection.close()
