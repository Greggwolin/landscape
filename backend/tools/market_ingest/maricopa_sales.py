"""Maricopa County recorded-sales ingestion for the market intelligence schema.

Pulls the county's free bulk data (Sales Affidavits + Residential characteristics
+ Parcels GIS centroids), keeps arm's-length market sales, tags the rest, and
upserts into landscape.mkt_recorded_sales. This corpus is queried by radius
alongside the live Redfin feed so that new-construction / builder closings that
never hit the MLS still appear in the map's "Recent Sales" layer.

Session: SM10-COUNTY-SALES-CONNECTOR-0706

Inputs (all local paths — download step is the caller's responsibility; see the
CC handoff). County sales files are pipe-delimited (.txt) or CSV depending on
channel; the reader auto-detects the delimiter.

    sales_path           Sales Affidavits (R102): APN, grantor, grantee, sale
                         date, sale price, deed type, recording date.
    characteristics_path Residential Master (R116): APN, year built, living SF,
                         lot SF, land use, address, subdivision.
    parcel_geo_path      Parcels GIS export (CSV/GeoJSON attributes): APN +
                         centroid latitude/longitude. Optional — rows without a
                         geo match are stored with null coordinates and simply
                         won't appear in radius queries until geocoded.

    >>> IMPORTANT <<<  The header names in COLUMN_MAP below are the county's
    documented field names, but exact spellings vary by dataset version and by
    channel (free bulk vs. paid FTP layout). Run with dry_run=True first: the
    reader validates that every mapped source column exists and raises a clear
    error naming any that don't, so header drift fails loudly instead of
    silently importing nulls (see AWARENESS CONTEXT §15 — no silent failures).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Column mapping — CONFIRM AGAINST THE LIVE FILE HEADERS (see module docstring).
# Keys are our normalized field names; values are the expected source headers.
# ---------------------------------------------------------------------------
SALES_COLUMN_MAP: Dict[str, str] = {
    "apn": "APN",
    "sale_date": "SALE_DATE",
    "recording_date": "RECORDING_DATE",
    "sale_price": "SALE_PRICE",
    "grantor": "GRANTOR",
    "grantee": "GRANTEE",
    "deed_type": "DEED_TYPE",
}

CHARACTERISTICS_COLUMN_MAP: Dict[str, str] = {
    "apn": "APN",
    "address": "SITUS_ADDRESS",
    "city": "SITUS_CITY",
    "zip": "SITUS_ZIP",
    "year_built": "CONSTRUCTION_YEAR",
    "living_area_sf": "LIVABLE_SPACE",
    "lot_size_sf": "LOT_SIZE",
    "land_use": "LAND_USE_CODE",
    "subdivision": "SUBDIVISION",
}

PARCEL_GEO_COLUMN_MAP: Dict[str, str] = {
    "apn": "APN",
    "latitude": "LATITUDE",
    "longitude": "LONGITUDE",
}

COUNTY = "Maricopa"
STATE = "AZ"
DATA_SOURCE = "Maricopa County Records"
LINEAGE_PACKAGE = "maricopa_sales_ingest_v1"


# ---------------------------------------------------------------------------
# Non-market transfer classification.
# A recorded transfer is only a usable pricing signal if it is arm's-length.
# We KEEP everything (auditability) but flag non-market rows with a reason so
# the pricing query can exclude them. We never delete — see AWARENESS CONTEXT.
# ---------------------------------------------------------------------------
NON_MARKET_DEED_PATTERNS = [
    (re.compile(r"quit\s*claim", re.I), "quitclaim_deed"),
    (re.compile(r"\bgift\b", re.I), "gift_deed"),
    (re.compile(r"\btrust(ee)?\b", re.I), "trust_transfer"),
    (re.compile(r"\btax\b", re.I), "tax_deed"),
    (re.compile(r"beneficiary|\bdeath\b|affidavit of succession", re.I), "death_transfer"),
    (re.compile(r"foreclosure|trustee.?s sale|sheriff", re.I), "foreclosure"),
]

# Entity tokens that suggest a non-arms-length or bulk builder/land transfer
# when they appear on BOTH sides, or a builder takedown on the grantor side.
ENTITY_TOKENS = re.compile(
    r"\b(llc|l\.l\.c|inc|incorporated|corp|company|co\.|holdings|"
    r"homes|communities|development|builders?|partners|lp|l\.p|trust|"
    r"properties|group|ventures|capital|investments)\b",
    re.I,
)

NOMINAL_PRICE_CEILING = 1000.0  # $ — at/below this a "sale" is a nominal transfer


def _clean_name(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def classify_transfer(
    sale_price: Optional[float],
    grantor: str,
    grantee: str,
    deed_type: str,
) -> Dict[str, Any]:
    """Return {is_arms_length, exclusion_reason}.

    Order matters: nominal price first (cheapest signal), then deed type, then
    entity-to-entity heuristics for bulk builder / intra-company transfers.
    """
    grantor = _clean_name(grantor)
    grantee = _clean_name(grantee)
    deed_type = _clean_name(deed_type)

    # 1. Nominal / zero-dollar transfers are never market sales.
    if sale_price is None or sale_price <= NOMINAL_PRICE_CEILING:
        return {"is_arms_length": False, "exclusion_reason": "nominal_or_zero_price"}

    # 2. Deed types that are structurally non-market.
    for pattern, reason in NON_MARKET_DEED_PATTERNS:
        if pattern.search(deed_type):
            return {"is_arms_length": False, "exclusion_reason": reason}

    # 3. Entity on BOTH sides → likely intra-company / bulk / land takedown,
    #    not a retail arm's-length sale. (A builder selling to a household is
    #    entity->person and stays IN — that's exactly the new-home sale we want.)
    if ENTITY_TOKENS.search(grantor) and ENTITY_TOKENS.search(grantee):
        return {"is_arms_length": False, "exclusion_reason": "entity_to_entity_transfer"}

    return {"is_arms_length": True, "exclusion_reason": None}


# ---------------------------------------------------------------------------
# Land-use → property_type discriminator (aligns with tbl_sales_comparables
# property_type values). County land-use codes vary; extend as encountered.
# ---------------------------------------------------------------------------
def normalize_property_type(land_use: str) -> str:
    lu = _clean_name(land_use).lower()
    if not lu:
        return "Single Family"
    if any(k in lu for k in ("vacant", "unimproved", "raw land", "0000")):
        return "LAND"
    if any(k in lu for k in ("condo", "townhouse", "patio")):
        return "Condo"
    if any(k in lu for k in ("apartment", "multi", "duplex", "triplex", "fourplex")):
        return "Multifamily"
    if "single" in lu or "sfr" in lu or lu.startswith("01"):
        return "Single Family"
    return "Single Family"


# ---------------------------------------------------------------------------
# Reading + parsing
# ---------------------------------------------------------------------------
def _read_delimited(filepath: str) -> pd.DataFrame:
    """Read a county data file, auto-detecting pipe vs comma delimiter."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"County data file not found: {filepath}")
    sample = path.read_text(errors="replace")[:4096]
    delimiter = "|" if sample.count("|") > sample.count(",") else ","
    logger.info("Reading %s (delimiter=%r)", path.name, delimiter)
    return pd.read_csv(
        filepath,
        delimiter=delimiter,
        dtype=str,
        keep_default_na=False,
        on_bad_lines="skip",
    )


def _validate_columns(df: pd.DataFrame, column_map: Dict[str, str], label: str) -> None:
    missing = [src for src in column_map.values() if src not in df.columns]
    if missing:
        raise ValueError(
            f"{label}: expected source columns not found: {missing}. "
            f"Available columns: {list(df.columns)[:40]}. "
            f"Update the COLUMN_MAP in maricopa_sales.py to match the live file headers."
        )


def _to_float(value: Any) -> Optional[float]:
    s = re.sub(r"[^0-9.\-]", "", str(value or ""))
    if s in ("", "-", "."):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _to_int(value: Any) -> Optional[int]:
    f = _to_float(value)
    return int(f) if f is not None else None


def _to_date(value: Any) -> Optional[date]:
    s = _clean_name(value)
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _index_by_apn(df: pd.DataFrame, column_map: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
    """Return {apn: {field: value}} using the column map."""
    apn_src = column_map["apn"]
    out: Dict[str, Dict[str, Any]] = {}
    for _, row in df.iterrows():
        apn = _clean_name(row.get(apn_src)).replace("-", "")
        if not apn:
            continue
        out[apn] = {field: row.get(src) for field, src in column_map.items()}
    return out


def build_records(
    sales_path: str,
    characteristics_path: Optional[str],
    parcel_geo_path: Optional[str],
) -> List[Dict[str, Any]]:
    """Parse + join the three inputs into normalized recorded-sale records."""
    sales_df = _read_delimited(sales_path)
    _validate_columns(sales_df, SALES_COLUMN_MAP, "Sales Affidavits")

    chars = {}
    if characteristics_path:
        chars_df = _read_delimited(characteristics_path)
        _validate_columns(chars_df, CHARACTERISTICS_COLUMN_MAP, "Residential characteristics")
        chars = _index_by_apn(chars_df, CHARACTERISTICS_COLUMN_MAP)

    geo = {}
    if parcel_geo_path:
        geo_df = _read_delimited(parcel_geo_path)
        _validate_columns(geo_df, PARCEL_GEO_COLUMN_MAP, "Parcels GIS")
        geo = _index_by_apn(geo_df, PARCEL_GEO_COLUMN_MAP)

    s = SALES_COLUMN_MAP
    records: List[Dict[str, Any]] = []
    for _, row in sales_df.iterrows():
        apn = _clean_name(row.get(s["apn"])).replace("-", "")
        if not apn:
            continue

        sale_price = _to_float(row.get(s["sale_price"]))
        grantor = _clean_name(row.get(s["grantor"]))
        grantee = _clean_name(row.get(s["grantee"]))
        deed_type = _clean_name(row.get(s["deed_type"]))
        market = classify_transfer(sale_price, grantor, grantee, deed_type)

        c = chars.get(apn, {})
        g = geo.get(apn, {})

        record = {
            "county": COUNTY,
            "apn": apn,
            "data_source": DATA_SOURCE,
            "sale_date": _to_date(row.get(s["sale_date"])),
            "recording_date": _to_date(row.get(s["recording_date"])),
            "sale_price": sale_price,
            "grantor": grantor or None,
            "grantee": grantee or None,
            "deed_type": deed_type or None,
            "is_arms_length": market["is_arms_length"],
            "exclusion_reason": market["exclusion_reason"],
            "address": _clean_name(c.get("address")) or None,
            "city": _clean_name(c.get("city")) or None,
            "state": STATE,
            "zip": _clean_name(c.get("zip"))[:10] or None,
            "year_built": _to_int(c.get("year_built")),
            "living_area_sf": _to_int(c.get("living_area_sf")),
            "lot_size_sf": _to_int(c.get("lot_size_sf")),
            "land_use": _clean_name(c.get("land_use")) or None,
            "property_type": normalize_property_type(c.get("land_use", "")),
            "subdivision": _clean_name(c.get("subdivision")) or None,
            "latitude": _to_float(g.get("latitude")),
            "longitude": _to_float(g.get("longitude")),
            "raw_data": json.dumps({k: str(row.get(v)) for k, v in s.items()}),
        }
        records.append(record)

    logger.info("Built %d recorded-sale records from %s", len(records), Path(sales_path).name)
    return records


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------
UPSERT_SQL = """
    INSERT INTO landscape.mkt_recorded_sales (
        county, apn, data_source, sale_date, recording_date, sale_price,
        grantor, grantee, deed_type, is_arms_length, exclusion_reason,
        address, city, state, zip, year_built, living_area_sf, lot_size_sf,
        land_use, property_type, subdivision, latitude, longitude, raw_data,
        updated_at
    ) VALUES (
        %(county)s, %(apn)s, %(data_source)s, %(sale_date)s, %(recording_date)s, %(sale_price)s,
        %(grantor)s, %(grantee)s, %(deed_type)s, %(is_arms_length)s, %(exclusion_reason)s,
        %(address)s, %(city)s, %(state)s, %(zip)s, %(year_built)s, %(living_area_sf)s, %(lot_size_sf)s,
        %(land_use)s, %(property_type)s, %(subdivision)s, %(latitude)s, %(longitude)s,
        %(raw_data)s::jsonb, NOW()
    )
    ON CONFLICT (county, apn, sale_date, sale_price) DO UPDATE SET
        recording_date  = EXCLUDED.recording_date,
        grantor         = EXCLUDED.grantor,
        grantee         = EXCLUDED.grantee,
        deed_type       = EXCLUDED.deed_type,
        is_arms_length  = EXCLUDED.is_arms_length,
        exclusion_reason= EXCLUDED.exclusion_reason,
        address         = COALESCE(EXCLUDED.address, landscape.mkt_recorded_sales.address),
        year_built      = COALESCE(EXCLUDED.year_built, landscape.mkt_recorded_sales.year_built),
        living_area_sf  = COALESCE(EXCLUDED.living_area_sf, landscape.mkt_recorded_sales.living_area_sf),
        lot_size_sf     = COALESCE(EXCLUDED.lot_size_sf, landscape.mkt_recorded_sales.lot_size_sf),
        land_use        = COALESCE(EXCLUDED.land_use, landscape.mkt_recorded_sales.land_use),
        property_type   = EXCLUDED.property_type,
        subdivision     = COALESCE(EXCLUDED.subdivision, landscape.mkt_recorded_sales.subdivision),
        latitude        = COALESCE(EXCLUDED.latitude, landscape.mkt_recorded_sales.latitude),
        longitude       = COALESCE(EXCLUDED.longitude, landscape.mkt_recorded_sales.longitude),
        raw_data        = EXCLUDED.raw_data,
        updated_at      = NOW()
    RETURNING (xmax = 0) AS inserted;
"""


def upsert_records(records: List[Dict[str, Any]], connection) -> Dict[str, int]:
    """Upsert records; skip rows lacking the natural key (apn+date+price)."""
    inserted = updated = skipped = 0
    with connection.cursor() as cur:
        for rec in records:
            if not rec["apn"] or rec["sale_date"] is None or rec["sale_price"] is None:
                skipped += 1
                continue
            cur.execute(UPSERT_SQL, rec)
            was_inserted = cur.fetchone()[0]
            if was_inserted:
                inserted += 1
            else:
                updated += 1
    connection.commit()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def _write_lineage(connection, result: Dict[str, Any]) -> None:
    """Record an ingestion-history row for auditability (best-effort)."""
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO landscape.ai_ingestion_history (package_name, metadata, created_at)
                VALUES (%s, %s::jsonb, NOW())
                """,
                (LINEAGE_PACKAGE, json.dumps(result)),
            )
        connection.commit()
    except Exception as exc:  # lineage table shape varies; never block the ingest
        logger.warning("Could not write ingestion lineage: %s", exc)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def ingest_maricopa_sales(
    sales_path: str,
    characteristics_path: Optional[str] = None,
    parcel_geo_path: Optional[str] = None,
    dry_run: bool = False,
    connection=None,
) -> Dict[str, Any]:
    """Parse, classify, join, and (unless dry_run) upsert county recorded sales."""
    records = build_records(sales_path, characteristics_path, parcel_geo_path)

    arms_length = sum(1 for r in records if r["is_arms_length"])
    with_geo = sum(1 for r in records if r["latitude"] is not None)
    with_year = sum(1 for r in records if r["year_built"] is not None)

    result: Dict[str, Any] = {
        "county": COUNTY,
        "records_parsed": len(records),
        "arms_length": arms_length,
        "non_market_flagged": len(records) - arms_length,
        "with_coordinates": with_geo,
        "with_year_built": with_year,
        "dry_run": dry_run,
    }

    if dry_run or connection is None:
        result.update({"inserted": 0, "updated": 0, "skipped": 0})
        return result

    upsert_stats = upsert_records(records, connection)
    result.update(upsert_stats)
    _write_lineage(connection, result)
    return result
