"""Parser for Zonda subdivision Excel exports."""

from __future__ import annotations

import logging
import re
from datetime import date
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd

from .schemas import ZondaSubdivision


logger = logging.getLogger(__name__)


def parse_product_code(product: str) -> Tuple[Optional[int], Optional[int]]:
    """Parse product code like '45x115' into (width=45, depth=115).

    Args:
        product: Product code string.

    Returns:
        Tuple of (width, depth) or (None, None) if parsing fails.
    """
    if not product or pd.isna(product):
        return None, None
    match = re.match(r"(\d+)x(\d+)", str(product))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def safe_int(value) -> Optional[int]:
    """Safely convert value to int, returning None on failure."""
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def safe_float(value) -> Optional[float]:
    """Safely convert value to float, returning None on failure."""
    if pd.isna(value):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_str(value) -> Optional[str]:
    """Safely convert value to stripped string, returning None if empty/NaN."""
    if pd.isna(value):
        return None
    s = str(value).strip()
    return s if s else None


def parse_zonda_file(
    filepath: str,
    msa_code: str = "38060",
    source_date: Optional[date] = None,
) -> List[ZondaSubdivision]:
    """Parse Zonda Excel export into subdivision records.

    Args:
        filepath: Path to Excel file.
        msa_code: MSA code (default Phoenix 38060).
        source_date: Date the Zonda data was collected (defaults to today).

    Returns:
        List of ZondaSubdivision records.
    """
    if source_date is None:
        source_date = date.today()

    filepath = Path(filepath)
    logger.info("Parsing Zonda file: %s", filepath)

    # Read Excel file - try common sheet names
    try:
        df = pd.read_excel(filepath, sheet_name="Zonda-Macro")
    except ValueError:
        # Try first sheet if Zonda-Macro doesn't exist
        df = pd.read_excel(filepath, sheet_name=0)

    logger.info("Found %d rows, %d columns", len(df), len(df.columns))

    records = []
    skipped_no_project = 0

    for _, row in df.iterrows():
        # Skip rows without project name
        project = safe_str(row.get("Project"))
        if not project:
            skipped_no_project += 1
            continue

        # Parse product code for lot dimensions
        product_code = safe_str(row.get("Product"))
        lot_width_parsed, lot_depth = parse_product_code(product_code)

        # Use LotWidth column if available, else parsed value
        lot_width = safe_int(row.get("LotWidth"))
        if lot_width is None or lot_width == 0:
            lot_width = lot_width_parsed

        record = ZondaSubdivision(
            msa_code=msa_code,
            project_name=project,
            builder=safe_str(row.get("Builder")),
            mpc=safe_str(row.get("MPC")),
            property_type=safe_str(row.get("Type")),
            style=safe_str(row.get("Style")),
            lot_size_sf=safe_int(row.get("LotSize")),
            lot_width=lot_width,
            lot_depth=lot_depth,
            product_code=product_code,
            units_sold=safe_int(row.get("Units Sold")),
            units_remaining=safe_int(row.get("Units Remaining")),
            size_min_sf=safe_int(row.get("SizeMin")),
            size_max_sf=safe_int(row.get("SizeMax")),
            size_avg_sf=safe_int(row.get("SizeAvg")),
            price_min=safe_float(row.get("PriceMin")),
            price_max=safe_float(row.get("PriceMax")),
            price_avg=safe_float(row.get("PriceAvg")),
            latitude=safe_float(row.get("latitude")),
            longitude=safe_float(row.get("longitude")),
            special_features=safe_str(row.get("Special")),
            source_file=str(filepath.name),
            source_date=source_date,
        )
        records.append(record)

    logger.info(
        "Parsed %d records (skipped %d rows without project name)",
        len(records),
        skipped_no_project,
    )

    return records
