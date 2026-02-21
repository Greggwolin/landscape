"""
Delta Computation Service for Rent Roll Updates

Parses an Excel/CSV file directly using confirmed column mappings,
compares against existing DB data, and produces a field-level delta struct.

No AI tokens are burned — this is a deterministic parse + diff operation.
The delta is stored in ai_extraction_staging with status='pending_delta'
for the frontend grid to highlight and the user to accept/reject.
"""

import json
import logging
import re
import tempfile
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.db import connection

logger = logging.getLogger(__name__)


# Field label map for human-readable delta display
FIELD_LABELS = {
    'unit_number': 'Unit',
    'building_name': 'Building',
    'unit_type': 'Unit Type',
    'bedrooms': 'Beds',
    'bathrooms': 'Baths',
    'square_feet': 'Square Feet',
    'current_rent': 'Monthly Rent',
    'market_rent': 'Market Rent',
    'occupancy_status': 'Status',
    'tenant_name': 'Tenant',
    'lease_start': 'Lease Start',
    'lease_end': 'Lease End',
    'move_in_date': 'Move-In Date',
    'renovation_status': 'Renovation Status',
    'renovation_date': 'Renovation Date',
    'renovation_cost': 'Renovation Cost',
}

# Occupancy status normalization — same canonical map used by tool_executor.py (QL_20)
OCCUPANCY_STATUS_MAP = {
    'current': 'occupied',
    'occupied': 'occupied',
    'vacant': 'vacant',
    'vacant-unrented': 'vacant',
    'vacant-rented': 'vacant',
    'vacant unrented': 'vacant',
    'vacant rented': 'vacant',
    'notice': 'notice',
    'eviction': 'eviction',
    'model': 'model',
    'down': 'down',
    'employee': 'occupied',
    'office': 'occupied',
}


def compute_rent_roll_delta(
    project_id: int,
    document_id: int,
    mappings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Parse Excel/CSV with confirmed mappings, diff against existing DB data.

    Args:
        project_id: Project ID
        document_id: Document ID of the uploaded rent roll file
        mappings: Confirmed column mappings from confirm_column_mapping

    Returns:
        Structured delta for Landscaper narration and grid highlighting.
    """
    from apps.documents.models import Document
    from apps.multifamily.models import MultifamilyUnit, MultifamilyLease
    from apps.dynamic.models import DynamicColumnDefinition, DynamicColumnValue

    # Fetch document
    try:
        document = Document.objects.get(doc_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return {'success': False, 'error': f'Document {document_id} not found'}

    if not document.storage_uri:
        return {'success': False, 'error': 'Document has no storage URI'}

    # Parse file with mappings
    file_units = _parse_file_with_mappings(
        storage_uri=document.storage_uri,
        mime_type=document.mime_type,
        file_name=document.doc_name,
        mappings=mappings,
    )

    if not file_units:
        return {'success': False, 'error': 'No units parsed from file'}

    # Normalize file values to match DB conventions before comparison
    for fu in file_units:
        _normalize_file_unit(fu)

    # Load existing DB data
    db_units_qs = MultifamilyUnit.objects.filter(project_id=project_id)
    db_units_by_number: Dict[str, Dict[str, Any]] = {}

    for unit in db_units_qs:
        unit_num = str(unit.unit_number).strip()
        db_unit = {
            'unit_id': unit.unit_id,
            'unit_number': unit_num,
            'building_name': unit.building_name,
            'unit_type': unit.unit_type,
            'bedrooms': float(unit.bedrooms) if unit.bedrooms is not None else None,
            'bathrooms': float(unit.bathrooms) if unit.bathrooms is not None else None,
            'square_feet': unit.square_feet,
            'current_rent': float(unit.current_rent) if unit.current_rent is not None else None,
            'market_rent': float(unit.market_rent) if unit.market_rent is not None else None,
            'occupancy_status': unit.occupancy_status,
            'renovation_status': unit.renovation_status,
        }

        # Get latest lease data
        latest_lease = MultifamilyLease.objects.filter(unit=unit).order_by('-lease_start_date').first()
        if latest_lease:
            db_unit['tenant_name'] = latest_lease.resident_name
            db_unit['lease_start'] = str(latest_lease.lease_start_date) if latest_lease.lease_start_date else None
            db_unit['lease_end'] = str(latest_lease.lease_end_date) if latest_lease.lease_end_date else None
            db_unit['base_rent_monthly'] = float(latest_lease.base_rent_monthly) if latest_lease.base_rent_monthly else None

        db_units_by_number[unit_num] = db_unit

    # Load dynamic column values for existing units
    dynamic_cols = DynamicColumnDefinition.objects.filter(
        project_id=project_id,
        table_name='multifamily_unit',
        is_active=True,
        is_proposed=False,
    )
    dynamic_col_keys = {dc.column_key: dc for dc in dynamic_cols}

    if dynamic_col_keys:
        unit_ids = [u['unit_id'] for u in db_units_by_number.values()]
        dynamic_values = DynamicColumnValue.objects.filter(
            column_definition__in=dynamic_cols,
            row_id__in=unit_ids,
        ).select_related('column_definition')

        # Build lookup: unit_id -> {column_key: value}
        dyn_vals_by_unit: Dict[int, Dict[str, Any]] = {}
        for dv in dynamic_values:
            uid = dv.row_id
            if uid not in dyn_vals_by_unit:
                dyn_vals_by_unit[uid] = {}
            dyn_vals_by_unit[uid][dv.column_definition.column_key] = dv.value

        # Merge dynamic values into db_units
        for unit_data in db_units_by_number.values():
            uid = unit_data['unit_id']
            if uid in dyn_vals_by_unit:
                for col_key, val in dyn_vals_by_unit[uid].items():
                    unit_data[col_key] = _normalize_for_compare(val)

    # Compute delta
    deltas = []
    change_categories: Dict[str, int] = {}
    units_with_changes = 0
    total_field_changes = 0
    new_units = []

    for file_unit in file_units:
        file_unit_num = str(file_unit.get('unit_number', '')).strip()
        if not file_unit_num:
            continue

        db_unit = db_units_by_number.get(file_unit_num)
        if not db_unit:
            new_units.append(file_unit_num)
            continue

        # Field-level comparison
        changes = []
        for field, file_value in file_unit.items():
            if field == 'unit_number':
                continue  # Skip the join key

            db_value = db_unit.get(field)
            norm_file = _normalize_for_compare(file_value)
            norm_db = _normalize_for_compare(db_value)

            if norm_file == norm_db:
                continue  # No change
            if norm_file is None:
                continue  # File doesn't have this value — don't blank out DB

            label = FIELD_LABELS.get(field, field.replace('_', ' ').title())
            changes.append({
                'field': field,
                'field_label': label,
                'current_value': _serialize_value(db_value),
                'new_value': _serialize_value(file_value),
            })

            # Categorize the change
            category = _categorize_change(field)
            change_categories[category] = change_categories.get(category, 0) + 1
            total_field_changes += 1

        if changes:
            units_with_changes += 1
            deltas.append({
                'unit_number': file_unit_num,
                'unit_id': db_unit['unit_id'],
                'changes': changes,
            })

    # Store deltas in staging for frontend consumption
    extraction_ids = _store_deltas_in_staging(
        project_id=project_id,
        document_id=document_id,
        deltas=deltas,
    )

    return {
        'success': True,
        'document_id': document_id,
        'document_name': document.doc_name,
        'summary': {
            'total_units_in_file': len(file_units),
            'matching_units': len(file_units) - len(new_units),
            'new_units': len(new_units),
            'new_unit_numbers': new_units[:20],
            'units_with_changes': units_with_changes,
            'total_field_changes': total_field_changes,
            'change_breakdown': change_categories,
        },
        'deltas': deltas,
        'extraction_ids': extraction_ids,
    }


def _parse_file_with_mappings(
    storage_uri: str,
    mime_type: Optional[str],
    file_name: Optional[str],
    mappings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Parse file rows into unit dicts using confirmed column mappings.
    Reuses parsing functions from column_discovery.
    """
    from .column_discovery import (
        _parse_xlsx, _parse_csv, _infer_mime_type, _get_extension,
        _find_header_row, is_valid_unit_row,
    )

    if not mime_type:
        mime_type = _infer_mime_type(storage_uri, file_name)

    # Download file
    try:
        response = requests.get(storage_uri, timeout=60)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        return []

    suffix = _get_extension(mime_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    try:
        if mime_type in [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ]:
            headers, data_rows, _ = _parse_xlsx(tmp_path)
        elif mime_type in ['text/csv', 'application/csv']:
            headers, data_rows, _ = _parse_csv(tmp_path)
        else:
            logger.error(f"Unsupported file type: {mime_type}")
            return []
    finally:
        import os
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    if not headers or not data_rows:
        return []

    # Build header-to-index lookup (case-insensitive)
    header_index: Dict[str, int] = {}
    for idx, h in enumerate(headers):
        header_index[h.strip().lower()] = idx
        header_index[h.strip()] = idx  # Also keep original case

    # Determine unit column index for row filtering
    unit_col_idx = None
    for m in mappings:
        if m.get('target_field') == 'unit_number':
            src = m.get('source_column', '')
            unit_col_idx = header_index.get(src) or header_index.get(src.lower())
            break
    if unit_col_idx is None:
        # Fallback: check header names
        for h_lower, idx in header_index.items():
            if h_lower in ('unit', 'unit #', 'unit no', 'unit number', 'apt', 'apt #'):
                unit_col_idx = idx
                break

    # Filter to valid unit rows only
    if unit_col_idx is not None:
        filtered_rows = [row for row in data_rows if is_valid_unit_row(row, unit_col_idx)]
        excluded = len(data_rows) - len(filtered_rows)
        if excluded > 0:
            logger.info(f"[_parse_file_with_mappings] Filtered {excluded} non-unit rows, {len(filtered_rows)} valid")
    else:
        filtered_rows = data_rows

    # Build mapping instructions: source_column -> (target_field, action)
    mapping_instructions: Dict[str, Dict[str, Any]] = {}
    for m in mappings:
        source_col = m.get('source_column', '')
        if not source_col:
            continue
        mapping_instructions[source_col] = m
        mapping_instructions[source_col.lower()] = m

    # Parse each data row into a unit dict
    units = []
    for row in filtered_rows:
        unit: Dict[str, Any] = {}

        for source_col, mapping in mapping_instructions.items():
            # Find column index
            col_idx = header_index.get(source_col) or header_index.get(source_col.lower())
            if col_idx is None:
                continue
            if col_idx >= len(row):
                continue

            raw_value = str(row[col_idx]).strip() if row[col_idx] else ''
            if not raw_value or raw_value.lower() in ('none', 'nan', ''):
                continue

            target_field = mapping.get('target_field')
            is_dynamic = mapping.get('create_dynamic', False)

            # Handle split columns (BD/BA)
            if mapping.get('split_into'):
                split_fields = mapping['split_into']
                parts = re.split(r'[/\\]', raw_value)
                for i, sf in enumerate(split_fields):
                    if i < len(parts):
                        val = _parse_typed_value(parts[i].strip(), sf.get('data_type', 'number'))
                        if val is not None:
                            unit[sf['target_field']] = val
            elif target_field:
                # Standard or dynamic field mapping
                field_type = mapping.get('data_type', 'text')
                val = _parse_typed_value(raw_value, field_type)
                if val is not None:
                    unit[target_field] = val
            elif is_dynamic:
                dyn_key = mapping.get('dynamic_column_name', source_col)
                dyn_key = dyn_key.lower().replace(' ', '_').replace('-', '_')
                field_type = mapping.get('data_type', 'text')
                val = _parse_typed_value(raw_value, field_type)
                if val is not None:
                    unit[dyn_key] = val

        # Only include rows that have a unit_number
        if 'unit_number' in unit:
            unit['unit_number'] = str(unit['unit_number']).strip()
            units.append(unit)

    return units


def _parse_typed_value(raw: str, data_type: str) -> Any:
    """Parse a raw string value into the appropriate type."""
    if not raw:
        return None

    try:
        if data_type in ('number', 'currency'):
            cleaned = raw.replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
            if not cleaned or cleaned == '-':
                return None
            val = float(cleaned)
            return round(val, 2)

        elif data_type == 'date':
            # Try common date formats
            for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%m-%d-%Y', '%m-%d-%y'):
                try:
                    return datetime.strptime(raw.strip(), fmt).strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return raw  # Return as-is if no format matches

        elif data_type == 'boolean':
            lower = raw.lower().strip()
            if lower in ('yes', 'y', 'true', '1', 'x'):
                return True
            elif lower in ('no', 'n', 'false', '0', ''):
                return False
            return None

        elif data_type == 'percent':
            cleaned = raw.replace('%', '').strip()
            return round(float(cleaned), 2)

        else:
            return raw.strip()

    except (ValueError, InvalidOperation):
        return raw.strip() if raw else None


def _normalize_file_unit(unit: Dict[str, Any]) -> None:
    """
    Normalize parsed file values to match DB conventions in-place.
    Handles occupancy status mapping, BD/BA string splitting,
    and numeric type coercion so the diff only reports real changes.
    """
    # 1. Occupancy status: "Current" → "occupied", "Vacant-Unrented" → "vacant"
    status = unit.get('occupancy_status')
    if status and isinstance(status, str):
        canonical = OCCUPANCY_STATUS_MAP.get(status.strip().lower())
        if canonical:
            unit['occupancy_status'] = canonical

    # 2. Bedrooms: if it's a BD/BA string like "3/2.00", extract the integer part
    beds = unit.get('bedrooms')
    if beds is not None and isinstance(beds, str) and '/' in beds:
        parts = beds.split('/')
        try:
            unit['bedrooms'] = float(int(float(parts[0].strip())))
        except (ValueError, IndexError):
            pass
        # Also extract bathrooms if not already set
        if len(parts) > 1 and 'bathrooms' not in unit:
            try:
                unit['bathrooms'] = round(float(parts[1].strip()), 1)
            except (ValueError, IndexError):
                pass
    elif beds is not None:
        try:
            unit['bedrooms'] = float(int(float(beds)))
        except (ValueError, TypeError):
            pass

    # 3. Bathrooms: ensure float
    baths = unit.get('bathrooms')
    if baths is not None:
        try:
            unit['bathrooms'] = round(float(baths), 1)
        except (ValueError, TypeError):
            pass

    # 4. Square feet: ensure int
    sqft = unit.get('square_feet')
    if sqft is not None:
        try:
            unit['square_feet'] = int(float(str(sqft).replace(',', '')))
        except (ValueError, TypeError):
            pass

    # 5. Current rent: ensure float rounded to 2 decimals
    rent = unit.get('current_rent')
    if rent is not None:
        try:
            unit['current_rent'] = round(float(str(rent).replace('$', '').replace(',', '')), 2)
        except (ValueError, TypeError):
            pass

    # 6. Market rent: ensure float rounded to 2 decimals
    mrent = unit.get('market_rent')
    if mrent is not None:
        try:
            unit['market_rent'] = round(float(str(mrent).replace('$', '').replace(',', '')), 2)
        except (ValueError, TypeError):
            pass


def _normalize_for_compare(value: Any) -> Any:
    """Normalize a value for comparison (handles Decimal, date, None, numeric coercion)."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return round(float(value), 2)
    if isinstance(value, (date, datetime)):
        return str(value)
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.lower() in ('', 'none', 'null', 'n/a', '-', '--/--'):
            return None
        # Normalize currency strings
        if cleaned.startswith('$'):
            try:
                return round(float(cleaned.replace('$', '').replace(',', '')), 2)
            except ValueError:
                pass
        # Try numeric coercion for string numbers (e.g., "850" → 850.0)
        try:
            num = float(cleaned.replace(',', ''))
            return round(num, 2)
        except ValueError:
            pass
        return cleaned
    if isinstance(value, float):
        return round(value, 2)
    return value


def _serialize_value(value: Any) -> Any:
    """Convert value to JSON-safe representation."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return str(value)
    return value


def _categorize_change(field: str) -> str:
    """Categorize a field change for summary grouping."""
    rent_fields = {'current_rent', 'market_rent', 'base_rent_monthly'}
    lease_date_fields = {'lease_start', 'lease_end', 'move_in_date'}
    status_fields = {'occupancy_status', 'lease_status', 'renovation_status'}

    if field in rent_fields:
        return 'rent_changes'
    elif field in lease_date_fields:
        return 'lease_date_changes'
    elif field in status_fields:
        return 'status_changes'
    elif field == 'tenant_name':
        return 'tenant_changes'
    elif field in ('bedrooms', 'bathrooms', 'square_feet', 'unit_type'):
        return 'unit_attribute_changes'
    else:
        return 'other_changes'


def _store_deltas_in_staging(
    project_id: int,
    document_id: int,
    deltas: List[Dict[str, Any]],
) -> List[int]:
    """
    Store computed deltas in ai_extraction_staging with status='pending_delta'.
    Returns list of extraction_ids created.
    """
    extraction_ids = []

    # Clear any previous pending deltas for this project
    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.ai_extraction_staging
            WHERE project_id = %s
            AND scope = 'unit_delta'
            AND status = 'pending_delta'
        """, [project_id])
        deleted = cursor.rowcount
        if deleted > 0:
            logger.info(f"Cleared {deleted} previous pending deltas for project {project_id}")

    # Clear orphaned pending/unit rows from prior confirm_column_mapping runs
    # These were staged by extraction but never committed or reviewed
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE landscape.ai_extraction_staging
            SET status = 'superseded'
            WHERE project_id = %s
            AND scope = 'unit'
            AND status = 'pending'
        """, [project_id])
        superseded = cursor.rowcount
        if superseded > 0:
            logger.info(f"Marked {superseded} orphaned pending/unit rows as superseded for project {project_id}")

    # Insert one row per unit with changes
    with connection.cursor() as cursor:
        for idx, delta in enumerate(deltas):
            cursor.execute("""
                INSERT INTO landscape.ai_extraction_staging (
                    project_id, doc_id, field_key, extracted_value,
                    confidence_score, source_snippet, status, scope,
                    scope_label, array_index, target_table, target_field,
                    db_write_type, property_type, extraction_type, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'pending_delta', 'unit_delta', %s, %s,
                    'tbl_mf_unit', 'unit_number', 'update', 'multifamily', 'rent_roll_delta', NOW()
                )
                RETURNING extraction_id
            """, [
                project_id,
                document_id,
                'unit_delta',
                json.dumps(delta),
                1.0,  # Deterministic parse = full confidence
                f"Delta for unit {delta.get('unit_number', '?')}",
                str(delta.get('unit_number', '')),
                idx,
            ])
            row = cursor.fetchone()
            if row:
                extraction_ids.append(row[0])

    logger.info(f"Stored {len(extraction_ids)} delta rows for project {project_id}")
    return extraction_ids


def get_pending_rent_roll_changes(project_id: int) -> Dict[str, Any]:
    """
    Fetch any pending rent roll deltas for a project.
    Used by the frontend hook to determine if highlights should be shown.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT extraction_id, doc_id, extracted_value, scope_label, created_at
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
            AND scope = 'unit_delta'
            AND status = 'pending_delta'
            ORDER BY array_index
        """, [project_id])
        rows = cursor.fetchall()

    if not rows:
        return {
            'has_pending': False,
            'document_id': None,
            'delta': None,
        }

    deltas = []
    doc_id = None
    for row in rows:
        extraction_id, d_id, extracted_value, scope_label, created_at = row
        doc_id = d_id
        try:
            delta_data = json.loads(extracted_value) if isinstance(extracted_value, str) else extracted_value
        except (json.JSONDecodeError, TypeError):
            continue

        delta_data['extraction_id'] = extraction_id
        deltas.append(delta_data)

    # Get document name
    doc_name = None
    if doc_id:
        from apps.documents.models import Document
        doc = Document.objects.filter(doc_id=doc_id).first()
        doc_name = doc.doc_name if doc else None

    # Build summary
    total_changes = sum(len(d.get('changes', [])) for d in deltas)
    change_breakdown: Dict[str, int] = {}
    for d in deltas:
        for change in d.get('changes', []):
            cat = _categorize_change(change.get('field', ''))
            change_breakdown[cat] = change_breakdown.get(cat, 0) + 1

    return {
        'has_pending': True,
        'document_id': doc_id,
        'document_name': doc_name,
        'summary': {
            'units_with_changes': len(deltas),
            'total_field_changes': total_changes,
            'change_breakdown': change_breakdown,
        },
        'deltas': deltas,
    }


def apply_rent_roll_delta(
    project_id: int,
    extraction_ids: List[int],
    decisions: Dict[str, str],
) -> Dict[str, Any]:
    """
    Apply accepted delta changes to production data.
    Reuses commit_staging_data_internal for consistent snapshot/rollback.

    For delta rows, the extracted_value contains:
    {unit_number, unit_id, changes: [{field, current_value, new_value}]}

    We convert accepted changes into direct DB updates rather than going
    through the full commit pipeline (which expects full unit JSON blobs).
    """
    from apps.multifamily.models import MultifamilyUnit, MultifamilyLease
    from apps.dynamic.models import DynamicColumnDefinition, DynamicColumnValue
    from apps.documents.models import ExtractionCommitSnapshot

    # Load delta rows
    if not extraction_ids:
        return {'success': False, 'error': 'No extraction_ids provided'}

    placeholders = ','.join(['%s'] * len(extraction_ids))
    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT extraction_id, doc_id, extracted_value
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
            AND extraction_id IN ({placeholders})
            AND scope = 'unit_delta'
            AND status = 'pending_delta'
        """, [project_id] + [int(eid) for eid in extraction_ids])
        rows = cursor.fetchall()

    if not rows:
        return {'success': False, 'error': 'No pending delta rows found'}

    # Create pre-commit snapshot
    units_qs = MultifamilyUnit.objects.filter(project_id=project_id)
    snapshot_units = list(units_qs.values())
    lease_data = []
    for unit in units_qs:
        for lease in unit.leases.all():
            ld = {
                'lease_id': lease.lease_id,
                'unit_id': lease.unit_id,
                'unit_number': unit.unit_number,
                'resident_name': lease.resident_name,
                'lease_start_date': str(lease.lease_start_date) if lease.lease_start_date else None,
                'lease_end_date': str(lease.lease_end_date) if lease.lease_end_date else None,
                'base_rent_monthly': float(lease.base_rent_monthly) if lease.base_rent_monthly else None,
                'lease_status': lease.lease_status,
            }
            lease_data.append(ld)

    # Serialize snapshot units (handle Decimal/date)
    for su in snapshot_units:
        for k, v in su.items():
            if isinstance(v, Decimal):
                su[k] = float(v)
            elif isinstance(v, (date, datetime)):
                su[k] = str(v)

    doc_id = rows[0][1] if rows else None
    snapshot = ExtractionCommitSnapshot.objects.create(
        project_id=project_id,
        document_id=doc_id,
        scope='rent_roll_delta',
        snapshot_data={'units': snapshot_units, 'leases': lease_data},
        changes_applied={'extraction_ids': extraction_ids, 'decisions': decisions},
        is_active=True,
    )

    # Deactivate previous snapshots
    ExtractionCommitSnapshot.objects.filter(
        project_id=project_id,
        scope__in=['rent_roll', 'rent_roll_delta'],
        is_active=True,
    ).exclude(snapshot_id=snapshot.snapshot_id).update(is_active=False)

    # Apply accepted changes
    units_affected = 0
    errors = []

    # Load dynamic column definitions for this project
    dynamic_col_defs = {
        dc.column_key: dc
        for dc in DynamicColumnDefinition.objects.filter(
            project_id=project_id,
            table_name='multifamily_unit',
            is_active=True,
        )
    }

    # Standard unit fields
    UNIT_FIELDS = {
        'building_name', 'unit_type', 'bedrooms', 'bathrooms',
        'square_feet', 'current_rent', 'market_rent',
        'occupancy_status', 'renovation_status', 'renovation_date',
        'renovation_cost',
    }
    # Lease fields
    LEASE_FIELDS = {'tenant_name', 'lease_start', 'lease_end', 'base_rent_monthly'}

    for extraction_id, d_id, extracted_value in rows:
        decision = decisions.get(str(extraction_id), 'accept')
        if decision == 'reject':
            # Mark as rejected
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'rejected'
                    WHERE extraction_id = %s
                """, [extraction_id])
            continue

        try:
            delta = json.loads(extracted_value) if isinstance(extracted_value, str) else extracted_value
        except (json.JSONDecodeError, TypeError):
            errors.append(f"Failed to parse delta for extraction {extraction_id}")
            continue

        unit_id = delta.get('unit_id')
        if not unit_id:
            errors.append(f"No unit_id in delta for extraction {extraction_id}")
            continue

        try:
            unit = MultifamilyUnit.objects.get(unit_id=unit_id, project_id=project_id)
        except MultifamilyUnit.DoesNotExist:
            errors.append(f"Unit {unit_id} not found")
            continue

        unit_updated = False
        lease_updates = {}

        for change in delta.get('changes', []):
            field = change.get('field')
            new_value = change.get('new_value')

            if field in UNIT_FIELDS:
                setattr(unit, field, new_value)
                unit_updated = True
            elif field in LEASE_FIELDS:
                lease_updates[field] = new_value
            elif field in dynamic_col_defs:
                # Dynamic column update
                col_def = dynamic_col_defs[field]
                DynamicColumnValue.objects.update_or_create(
                    column_definition=col_def,
                    row_id=unit_id,
                    defaults={'value_text': str(new_value) if new_value is not None else None},
                )

        if unit_updated:
            unit.save()

        if lease_updates:
            latest_lease = MultifamilyLease.objects.filter(unit=unit).order_by('-lease_start_date').first()
            if latest_lease:
                if 'tenant_name' in lease_updates:
                    latest_lease.resident_name = lease_updates['tenant_name']
                if 'lease_start' in lease_updates:
                    latest_lease.lease_start_date = lease_updates['lease_start']
                if 'lease_end' in lease_updates:
                    latest_lease.lease_end_date = lease_updates['lease_end']
                if 'base_rent_monthly' in lease_updates:
                    latest_lease.base_rent_monthly = lease_updates['base_rent_monthly']
                latest_lease.save()

        units_affected += 1

        # Mark staging row as committed
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.ai_extraction_staging
                SET status = 'committed'
                WHERE extraction_id = %s
            """, [extraction_id])

    return {
        'success': True,
        'units_affected': units_affected,
        'snapshot_id': snapshot.snapshot_id,
        'rollback_available': True,
        'errors': errors,
    }
