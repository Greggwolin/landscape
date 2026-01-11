"""Zonda subdivision data ingestion for unified market intelligence schema.

Supports both:
- 87-column full format (December 2025+)
- 20-column simplified format (legacy exports)

All data flows into mkt_new_home_project table.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import pandas as pd

from .land_use_linkage import infer_land_use_taxonomy

logger = logging.getLogger(__name__)


# Column mapping: Zonda column name -> database field name
ZONDA_FULL_COLUMN_MAP = {
    'Universal ID': 'source_project_id',
    'Project Name': 'project_name',
    'Builders': 'builder_name',
    'Parent Builder': 'parent_builder',
    'Status': 'status',
    'Master Plan Name': 'master_plan_name',
    'Master Plan Developer Name': 'master_plan_developer',
    'Master Plan Key': 'master_plan_id',
    'Subdivision Universal ID': 'source_subdivision_id',
    'Product Type': 'product_type',
    'Product Style': 'product_style',
    'Active Adult': 'is_active_adult',
    'Project Characteristics': 'characteristics',
    'Lot Size': 'lot_size_sf',
    'Lot Width': 'lot_width_ft',
    'Lot Dimensions': 'lot_dimensions',
    'Min. Unit Size': 'unit_size_min_sf',
    'Max. Unit Size': 'unit_size_max_sf',
    'Avg. Unit Size': 'unit_size_avg_sf',
    'Min. List Price': 'price_min',
    'Max. List Price': 'price_max',
    'Avg. List Price': 'price_avg',
    'Price Change Date': 'price_change_date',
    'Total Units Planned': 'units_planned',
    'Total Units Sold': 'units_sold',
    'Total Units Remaining': 'units_remaining',
    'Total QMIs': 'qmi_count',
    'Open Date': 'open_date',
    'Sold Out Date': 'sold_out_date',
    'Sales Rate': 'sales_rate_monthly',
    'Last 3M Avg. Sales': 'sales_rate_3m_avg',
    'Last 6M Avg. Sales': 'sales_rate_6m_avg',
    'Last 12M Avg. Sales': 'sales_rate_12m_avg',
    'Sales Change Date': 'sales_change_date',
    'Annual Starts': 'annual_starts',
    'Annual Closings': 'annual_closings',
    'Quarterly Starts': 'quarterly_starts',
    'Quarterly Closings': 'quarterly_closings',
    'Excavation Count': 'pipeline_excavation',
    'Survey Stakes Count': 'pipeline_survey_stakes',
    'Street Paving Count': 'pipeline_street_paving',
    'Streets In Count': 'pipeline_streets_in',
    'Vacant Developed Lot Count': 'pipeline_vdl',
    'Vacant Land Count': 'pipeline_vacant_land',
    'Under Construction Count': 'pipeline_under_construction',
    'Finished Vacant Count': 'pipeline_finished_vacant',
    'Models Count': 'models_count',
    'Occupied Count': 'occupied_count',
    'Future Inventory Count': 'future_inventory_count',
    'VDL Months of Supply': 'mos_vdl',
    'Inventory Months of Supply': 'mos_inventory',
    'Finished Vacant Months of Supply': 'mos_finished_vacant',
    'QMI Incentive %age': 'incentive_qmi_pct',
    'QMI Incentive Amt.': 'incentive_qmi_amt',
    'QMI Incentive Type': 'incentive_qmi_type',
    'To Be Built Incentive %age': 'incentive_tbb_pct',
    'To Be Built Incentive Amt.': 'incentive_tbb_amt',
    'To Be Built Incentive Type': 'incentive_tbb_type',
    'Broker Incentive %age': 'incentive_broker_pct',
    'Broker Incentive Amt.': 'incentive_broker_amt',
    'Broker Incentive Type': 'incentive_broker_type',
    'HOA Fee 1': 'hoa_fee_monthly',
    'HOA Fee 2': 'hoa_fee_2_monthly',
    'HOA Fee per Sqft': 'hoa_fee_per_sqft',
    'Assessments': 'assessment_rate',
    'Assessments Description': 'assessment_description',
    'Latitude': 'latitude',
    'Longitude': 'longitude',
    'City': 'city',
    'Zip Code': 'zip_code',
    'County': 'county',
    'County Code': 'county_fips',
    'CBSA': 'cbsa_name',
    'CBSA Code': 'cbsa_code',
    'State': 'state',
    'Boundary Names': 'boundary_names',
    'School District': 'school_district',
    'School Attendance Zone (Elementary)': 'school_elementary',
    'School Ratings (Elementary)': 'school_rating_elementary',
    'School Attendance Zone (Middle)': 'school_middle',
    'School Ratings (Middle)': 'school_rating_middle',
    'School Attendance Zone (High)': 'school_high',
    'School Ratings (High)': 'school_rating_high',
    'Survey Quarter': 'survey_period',
    'Website': 'website_url',
    'Office Phone No.': 'office_phone',
}

# Simplified 20-column format mapping (legacy)
ZONDA_SIMPLE_COLUMN_MAP = {
    'Project': 'project_name',
    'Builder': 'builder_name',
    'MPC': 'master_plan_name',
    'Type': 'product_type',
    'Style': 'product_style',
    'LotSize': 'lot_size_sf',
    'LotWidth': 'lot_width_ft',
    'Product': 'lot_dimensions',  # Contains "45x115" format
    'Units Sold': 'units_sold',
    'Units Remaining': 'units_remaining',
    'SizeMin': 'unit_size_min_sf',
    'SizeMax': 'unit_size_max_sf',
    'SizeAvg': 'unit_size_avg_sf',
    'PriceMin': 'price_min',
    'PriceMax': 'price_max',
    'PriceAvg': 'price_avg',
    'latitude': 'latitude',
    'longitude': 'longitude',
    'Special': 'characteristics',
}


def parse_survey_quarter(survey_quarter: str) -> date:
    """Parse Zonda survey quarter string to effective date.

    Args:
        survey_quarter: Quarter string like "2025Q4", "2025 Q4", "Q4 2025".

    Returns:
        Last day of the quarter as date.

    Raises:
        ValueError: If quarter string cannot be parsed.
    """
    if not survey_quarter:
        raise ValueError("survey_quarter is required")

    # Normalize string
    sq = str(survey_quarter).strip().upper()

    # Try various formats
    patterns = [
        r'(\d{4})\s*Q(\d)',      # "2025Q4", "2025 Q4"
        r'Q(\d)\s*(\d{4})',      # "Q4 2025"
        r'(\d{4})-Q(\d)',        # "2025-Q4"
    ]

    for pattern in patterns:
        match = re.match(pattern, sq)
        if match:
            groups = match.groups()
            if pattern == r'Q(\d)\s*(\d{4})':
                quarter, year = int(groups[0]), int(groups[1])
            else:
                year, quarter = int(groups[0]), int(groups[1])

            # Calculate last day of quarter
            quarter_end_months = {1: 3, 2: 6, 3: 9, 4: 12}
            month = quarter_end_months.get(quarter)
            if month is None:
                raise ValueError(f"Invalid quarter number: {quarter}")

            # Last day of month
            if month in [4, 6, 9, 11]:
                day = 30
            elif month == 2:
                day = 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28
            else:
                day = 31

            return date(year, month, day)

    raise ValueError(f"Cannot parse survey quarter: {survey_quarter}")


def safe_int(value) -> Optional[int]:
    """Safely convert value to int."""
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def safe_float(value) -> Optional[float]:
    """Safely convert value to float."""
    if pd.isna(value):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_str(value) -> Optional[str]:
    """Safely convert value to stripped string."""
    if pd.isna(value):
        return None
    s = str(value).strip()
    return s if s else None


def safe_date(value) -> Optional[date]:
    """Safely convert value to date."""
    if pd.isna(value):
        return None
    try:
        if isinstance(value, date):
            return value
        return pd.to_datetime(value).date()
    except (ValueError, TypeError):
        return None


def detect_file_format(df: pd.DataFrame) -> str:
    """Detect whether file is full or simplified format.

    Args:
        df: Pandas DataFrame with Zonda data.

    Returns:
        'full' for 87-column format, 'simple' for 20-column format.
    """
    full_indicators = ['Universal ID', 'Survey Quarter', 'Annual Starts']
    simple_indicators = ['Project', 'Product', 'LotWidth']

    full_matches = sum(1 for col in full_indicators if col in df.columns)
    simple_matches = sum(1 for col in simple_indicators if col in df.columns)

    if full_matches >= 2:
        return 'full'
    elif simple_matches >= 2:
        return 'simple'
    else:
        # Default to full if we have many columns
        return 'full' if len(df.columns) > 30 else 'simple'


def parse_lot_dimensions(dimensions: str) -> Tuple[Optional[int], Optional[int]]:
    """Parse lot dimensions string like '45x115' into (width, depth).

    Args:
        dimensions: Lot dimensions string.

    Returns:
        Tuple of (width, depth) or (None, None).
    """
    if not dimensions or pd.isna(dimensions):
        return None, None
    match = re.match(r'(\d+)\s*[xX]\s*(\d+)', str(dimensions))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def parse_zonda_file(
    filepath: str,
    effective_date: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Parse Zonda Excel file into record dictionaries.

    Args:
        filepath: Path to Excel file.
        effective_date: Override effective date (otherwise parsed from Survey Quarter).

    Returns:
        Tuple of (list of record dicts, metadata dict).
    """
    filepath = Path(filepath)
    logger.info("Parsing Zonda file: %s", filepath)

    # Read Excel file
    try:
        df = pd.read_excel(filepath, sheet_name=0)
    except Exception as e:
        logger.error("Failed to read Excel file: %s", e)
        raise

    logger.info("Found %d rows, %d columns", len(df), len(df.columns))

    # Detect format
    file_format = detect_file_format(df)
    logger.info("Detected file format: %s", file_format)

    column_map = ZONDA_FULL_COLUMN_MAP if file_format == 'full' else ZONDA_SIMPLE_COLUMN_MAP

    # Determine effective date
    survey_period = None
    if file_format == 'full' and 'Survey Quarter' in df.columns:
        # Get survey quarter from first non-null value
        sq_values = df['Survey Quarter'].dropna()
        if len(sq_values) > 0:
            survey_period = safe_str(sq_values.iloc[0])
            if survey_period and effective_date is None:
                try:
                    effective_date = parse_survey_quarter(survey_period)
                    logger.info("Parsed effective_date from Survey Quarter: %s -> %s",
                                survey_period, effective_date)
                except ValueError as e:
                    logger.warning("Could not parse Survey Quarter '%s': %s", survey_period, e)

    if effective_date is None:
        effective_date = date.today()
        logger.warning("No effective_date provided or parsed, using today: %s", effective_date)

    records = []
    skipped_no_name = 0

    for idx, row in df.iterrows():
        # Get project name - required field
        project_name_col = 'Project Name' if file_format == 'full' else 'Project'
        project_name = safe_str(row.get(project_name_col))
        if not project_name:
            skipped_no_name += 1
            continue

        # Build record dict
        record = {
            'effective_date': effective_date,
            'source_file': filepath.name,
            'survey_period': survey_period,
        }

        # Map columns
        for zonda_col, db_field in column_map.items():
            if zonda_col in df.columns:
                raw_value = row.get(zonda_col)

                # Type conversion based on field name
                if db_field in ['lot_size_sf', 'lot_width_ft', 'lot_depth_ft',
                                'unit_size_min_sf', 'unit_size_max_sf', 'unit_size_avg_sf',
                                'units_planned', 'units_sold', 'units_remaining', 'qmi_count',
                                'annual_starts', 'annual_closings', 'quarterly_starts', 'quarterly_closings',
                                'pipeline_excavation', 'pipeline_survey_stakes', 'pipeline_street_paving',
                                'pipeline_streets_in', 'pipeline_vdl', 'pipeline_vacant_land',
                                'pipeline_under_construction', 'pipeline_finished_vacant',
                                'models_count', 'occupied_count', 'future_inventory_count',
                                'county_fips', 'cbsa_code']:
                    record[db_field] = safe_int(raw_value)
                elif db_field in ['price_min', 'price_max', 'price_avg', 'price_per_sf_avg',
                                  'sales_rate_monthly', 'sales_rate_3m_avg', 'sales_rate_6m_avg',
                                  'sales_rate_12m_avg', 'mos_vdl', 'mos_inventory', 'mos_finished_vacant',
                                  'incentive_qmi_pct', 'incentive_qmi_amt', 'incentive_tbb_pct',
                                  'incentive_tbb_amt', 'incentive_broker_pct', 'incentive_broker_amt',
                                  'hoa_fee_monthly', 'hoa_fee_2_monthly', 'hoa_fee_per_sqft',
                                  'assessment_rate', 'latitude', 'longitude']:
                    record[db_field] = safe_float(raw_value)
                elif db_field in ['open_date', 'sold_out_date', 'price_change_date', 'sales_change_date']:
                    record[db_field] = safe_date(raw_value)
                elif db_field == 'is_active_adult':
                    val = safe_str(raw_value)
                    record[db_field] = val is not None and 'active adult' in val.lower()
                elif db_field == 'lot_dimensions':
                    # Truncate to 20 chars - take first dimension only if multiple
                    val = safe_str(raw_value)
                    if val and len(val) > 20:
                        # Try to get just the first dimension (e.g., "50x115" from "50x115; 60x120")
                        first_dim = val.split(';')[0].split(',')[0].strip()
                        record[db_field] = first_dim[:20]
                    else:
                        record[db_field] = val
                else:
                    record[db_field] = safe_str(raw_value)

        # For simplified format, parse lot dimensions
        if file_format == 'simple':
            lot_dims = safe_str(row.get('Product'))
            if lot_dims:
                width, depth = parse_lot_dimensions(lot_dims)
                if width and record.get('lot_width_ft') is None:
                    record['lot_width_ft'] = width
                if depth:
                    record['lot_depth_ft'] = depth

        # Calculate price_per_sf_avg if we have the data
        if (record.get('price_avg') and record.get('unit_size_avg_sf')
            and record.get('unit_size_avg_sf') > 0):
            record['price_per_sf_avg'] = round(
                record['price_avg'] / record['unit_size_avg_sf'], 2
            )

        # Infer land use taxonomy
        linkage = infer_land_use_taxonomy(
            product_type=record.get('product_type'),
            product_style=record.get('product_style'),
            lot_size_sf=record.get('lot_size_sf'),
            lot_width_ft=record.get('lot_width_ft'),
            is_active_adult=record.get('is_active_adult', False),
        )
        record['lu_family_id'] = linkage.lu_family_id
        record['lu_density_id'] = linkage.lu_density_id
        record['lu_type_id'] = linkage.lu_type_id
        record['lu_product_id'] = linkage.lu_product_id
        record['lu_linkage_method'] = linkage.linkage_method
        record['lu_linkage_confidence'] = linkage.confidence

        records.append(record)

    logger.info("Parsed %d records (skipped %d without project name)", len(records), skipped_no_name)

    # Build metadata
    metadata = {
        'filepath': str(filepath),
        'file_format': file_format,
        'effective_date': effective_date.isoformat(),
        'survey_period': survey_period,
        'total_rows': len(df),
        'records_parsed': len(records),
        'skipped_no_name': skipped_no_name,
        'columns_found': list(df.columns),
    }

    return records, metadata


def ingest_zonda_file(
    filepath: str,
    effective_date: Optional[date] = None,
    dry_run: bool = False,
    connection=None,
) -> Dict[str, Any]:
    """Ingest Zonda file into mkt_new_home_project table.

    Args:
        filepath: Path to Excel file.
        effective_date: Override effective date.
        dry_run: If True, parse only without persisting.
        connection: Database connection (if None, uses Django's connection).

    Returns:
        Dict with ingestion results including counts and metadata.
    """
    from datetime import datetime

    # Parse file
    records, metadata = parse_zonda_file(filepath, effective_date)

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
        # Get ZONDA source_id
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT source_id FROM landscape.mkt_data_source_registry WHERE source_code = 'ZONDA'"
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("ZONDA source not found in mkt_data_source_registry. Run migration first.")
            source_id = row[0]

        # Upsert records
        inserted = 0
        updated = 0

        for record in records:
            record['source_id'] = source_id

            # Build field lists for upsert
            # Add timestamps for new inserts
            now = datetime.now()
            fields = [k for k in record.keys() if record[k] is not None]
            fields.extend(['ingestion_timestamp', 'updated_at'])
            record['ingestion_timestamp'] = now
            record['updated_at'] = now

            placeholders = ', '.join(['%s'] * len(fields))
            field_names = ', '.join(fields)
            values = [record[f] for f in fields]

            # Build update clause (exclude key fields, ingestion_timestamp, and updated_at)
            update_fields = [f for f in fields if f not in ['source_id', 'source_project_id', 'effective_date', 'ingestion_timestamp', 'updated_at']]
            update_clause = ', '.join([f"{f} = EXCLUDED.{f}" for f in update_fields])

            sql = f"""
                INSERT INTO landscape.mkt_new_home_project ({field_names})
                VALUES ({placeholders})
                ON CONFLICT (source_id, source_project_id, effective_date)
                DO UPDATE SET {update_clause}, updated_at = EXCLUDED.updated_at
                RETURNING (xmax = 0) AS was_inserted
            """

            with connection.cursor() as cursor:
                cursor.execute(sql, values)
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
