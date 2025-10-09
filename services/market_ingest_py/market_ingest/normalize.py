"""
Helpers for normalizing provider payloads into the shared market_data schema.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional


@dataclass(frozen=True)
class NormalizedObservation:
    series_code: str
    geo_id: str
    geo_level: str
    date: date
    value: Optional[Decimal]
    units: Optional[str]
    seasonal: Optional[str]
    source: str
    revision_tag: Optional[str]
    coverage_note: Optional[str] = None


def parse_decimal(value: str) -> Optional[Decimal]:
    """
    Convert a textual numeric value from providers into Decimal.
    Provider APIs typically use '.' as the decimal separator and 'nan'
    for missing values.
    """

    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed or trimmed.lower() in {"nan", "na", "null", "."}:
        return None
    try:
        return Decimal(trimmed)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"Unable to parse numeric value '{value}'") from exc


def parse_date(value: str) -> date:
    """
    Provider payloads use ISO-formatted date strings. Some (ACS) may
    send year-only values; we coerce those to January 1st of that year.
    """

    value = value.strip()
    if len(value) == 4 and value.isdigit():
        return date(int(value), 1, 1)
    try:
        return datetime.fromisoformat(value).date()
    except ValueError as exc:
        raise ValueError(f"Unable to parse date '{value}'") from exc


def build_revision_tag(record: Dict[str, Any], keys: Iterable[str]) -> Optional[str]:
    """
    Compose a deterministic revision tag from provider-specific fields
    such as realtime_start/end for FRED or release identifiers for other sources.
    """

    parts: List[str] = []
    for key in keys:
        value = record.get(key)
        if value is None or value == "":
            continue
        parts.append(f"{key}={value}")
    return "|".join(parts) if parts else None
