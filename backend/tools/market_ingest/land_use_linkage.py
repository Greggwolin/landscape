"""Land use taxonomy auto-linkage for market data.

Provides automatic inference of land use taxonomy codes from market data fields.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class LandUseLinkage:
    """Result of land use taxonomy inference."""
    lu_family_id: Optional[int] = None
    lu_density_id: Optional[int] = None
    lu_type_id: Optional[int] = None
    lu_product_id: Optional[int] = None
    linkage_method: str = 'auto'
    confidence: float = 0.0


# Density classification thresholds (lot size in SF)
DENSITY_THRESHOLDS = [
    (20000, 'VLDR'),  # Very Low Density Residential
    (8000, 'LDR'),    # Low Density Residential
    (5000, 'MDR'),    # Medium Density Residential
    (3000, 'HDR'),    # High Density Residential
    (0, 'VHDR'),      # Very High Density Residential
]

# Product type to lu_type mapping
PRODUCT_TYPE_MAP = {
    'Detached': 'SF-DET',
    'Single-Family': 'SF-DET',
    'Attached': 'SF-ATT',
    'Townhome': 'TH',
    'Duet': 'DU',
    'Condo': 'MF',
}


def infer_density_code(lot_size_sf: Optional[int]) -> Optional[str]:
    """Infer density classification code from lot size.

    Args:
        lot_size_sf: Lot size in square feet.

    Returns:
        Density code or None if lot size not provided.
    """
    if not lot_size_sf or lot_size_sf <= 0:
        return None

    for threshold, code in DENSITY_THRESHOLDS:
        if lot_size_sf >= threshold:
            return code

    return 'VHDR'


def infer_type_code(product_type: Optional[str], product_style: Optional[str]) -> Optional[str]:
    """Infer land use type code from product type and style.

    Args:
        product_type: Product type from market data (Detached, Attached, etc.).
        product_style: Product style from market data (Single-Family, Townhome, etc.).

    Returns:
        Land use type code or None if cannot be determined.
    """
    # Try product_type first
    if product_type:
        if product_type in PRODUCT_TYPE_MAP:
            return PRODUCT_TYPE_MAP[product_type]

    # Try product_style
    if product_style:
        style_lower = product_style.lower()
        if 'townhome' in style_lower or 'townhouse' in style_lower:
            return 'TH'
        if 'duet' in style_lower or 'duplex' in style_lower:
            return 'DU'
        if 'single' in style_lower or 'detached' in style_lower:
            return 'SF-DET'
        if 'attached' in style_lower:
            return 'SF-ATT'
        if 'condo' in style_lower:
            return 'MF'

    return None


def infer_product_code(lot_width_ft: Optional[int], product_type: Optional[str]) -> Optional[str]:
    """Infer lot product code from lot width.

    Args:
        lot_width_ft: Lot width in feet.
        product_type: Product type to determine prefix.

    Returns:
        Product code like 'SF45', 'SF50', etc., or None.
    """
    if not lot_width_ft or lot_width_ft <= 0:
        return None

    # Round to nearest standard width
    standard_widths = [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120]
    closest = min(standard_widths, key=lambda x: abs(x - lot_width_ft))

    # Determine prefix based on product type
    if product_type == 'Attached' or product_type == 'Townhome':
        prefix = 'TH'
    else:
        prefix = 'SF'

    return f"{prefix}{closest}"


def infer_land_use_taxonomy(
    product_type: Optional[str] = None,
    product_style: Optional[str] = None,
    lot_size_sf: Optional[int] = None,
    lot_width_ft: Optional[int] = None,
    is_active_adult: bool = False,
    db_lookup: bool = False,
    connection=None,
) -> LandUseLinkage:
    """Infer land use taxonomy from market data fields.

    Args:
        product_type: Product type (Detached, Attached, etc.).
        product_style: Product style (Single-Family, Townhome, etc.).
        lot_size_sf: Lot size in square feet.
        lot_width_ft: Lot width in feet.
        is_active_adult: Whether this is an active adult community.
        db_lookup: Whether to look up IDs from database.
        connection: Database connection for lookups.

    Returns:
        LandUseLinkage with inferred codes and confidence score.
    """
    result = LandUseLinkage(linkage_method='auto', confidence=0.0)

    # Family: Almost always Residential for new home data
    if product_type in ['Detached', 'Attached', 'Condo'] or product_style:
        result.lu_family_id = 1  # Residential family ID (verify in DB)
        result.confidence += 0.2

    # Density: Infer from lot size
    density_code = infer_density_code(lot_size_sf)
    if density_code:
        result.confidence += 0.2
        logger.debug("Inferred density code: %s from lot_size_sf: %s", density_code, lot_size_sf)

    # Type: From product_type/product_style
    type_code = infer_type_code(product_type, product_style)
    if type_code:
        result.confidence += 0.2
        logger.debug("Inferred type code: %s from product_type: %s, product_style: %s",
                     type_code, product_type, product_style)

    # Product: From lot width
    product_code = infer_product_code(lot_width_ft, product_type)
    if product_code:
        result.confidence += 0.3
        logger.debug("Inferred product code: %s from lot_width_ft: %s", product_code, lot_width_ft)

    # Adjust confidence for active adult (harder to classify)
    if is_active_adult:
        result.confidence *= 0.9

    # Database lookups to get actual IDs
    if db_lookup and connection:
        result = _lookup_ids(result, density_code, type_code, product_code, connection)

    return result


def _lookup_ids(
    result: LandUseLinkage,
    density_code: Optional[str],
    type_code: Optional[str],
    product_code: Optional[str],
    connection,
) -> LandUseLinkage:
    """Look up actual database IDs for inferred codes.

    Args:
        result: Current linkage result to update.
        density_code: Inferred density classification code.
        type_code: Inferred land use type code.
        product_code: Inferred lot product code.
        connection: Database connection.

    Returns:
        Updated LandUseLinkage with database IDs.
    """
    with connection.cursor() as cursor:
        # Look up density_id
        if density_code:
            cursor.execute(
                "SELECT density_id FROM landscape.density_classification WHERE code = %s",
                (density_code,)
            )
            row = cursor.fetchone()
            if row:
                result.lu_density_id = row[0]

        # Look up type_id
        if type_code:
            cursor.execute(
                "SELECT type_id FROM landscape.lu_type WHERE code = %s",
                (type_code,)
            )
            row = cursor.fetchone()
            if row:
                result.lu_type_id = row[0]

        # Look up product_id
        if product_code:
            cursor.execute(
                "SELECT product_id FROM landscape.res_lot_product WHERE code = %s",
                (product_code,)
            )
            row = cursor.fetchone()
            if row:
                result.lu_product_id = row[0]

    return result
