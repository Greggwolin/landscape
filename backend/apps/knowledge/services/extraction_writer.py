"""
Extraction Writer Service - Writes validated extractions to production tables.

This service:
1. Consults the Field Registry for write targets
2. Handles column writes vs row-based writes
3. Manages conflicts and provenance
4. Creates audit trail
"""

import json
import logging
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Optional, List, Tuple
from django.db import connection, transaction
from datetime import datetime

from .field_registry import get_registry, FieldMapping
from apps.landscaper.opex_mapping import OPEX_ACCOUNT_MAPPING
from apps.projects.primary_measure import sync_primary_measure_on_legacy_update
from .opex_utils import upsert_opex_entry, resolve_opex_category

logger = logging.getLogger(__name__)

# Field patterns that should create Entity-Fact records
FACTABLE_FIELD_PATTERNS = [
    'cap_rate', 'vacancy', 'rent', 'price', 'rate', 'pct',
    'noi', 'expense', 'income', 'growth', 'absorption',
    'discount', 'ltv', 'dscr', 'yield', 'margin'
]


def _should_create_fact(field_key: str) -> bool:
    """Determine if this field should create a knowledge fact."""
    field_lower = field_key.lower()
    return any(pattern in field_lower for pattern in FACTABLE_FIELD_PATTERNS)


class ExtractionWriter:
    """Writes validated extractions to production tables per registry contract."""

    def __init__(self, project_id: int, property_type: str = 'multifamily'):
        self.project_id = project_id
        self.property_type = property_type
        self.registry = get_registry()

    @transaction.atomic
    def write_extraction(
        self,
        extraction_id: int,
        field_key: str,
        value: Any,
        scope_id: Optional[int] = None,
        source_doc_id: Optional[int] = None,
        source_page: Optional[int] = None,
        created_by: str = 'landscaper',
        value_source: str = 'ai_extraction',
    ) -> Tuple[bool, str]:
        """
        Write a validated extraction to the production table.

        Returns: (success: bool, message: str)
        """
        mapping = self.registry.get_mapping(field_key, self.property_type)

        if not mapping:
            return False, f"No mapping found for field: {field_key}"

        if not mapping.resolved:
            return False, f"Field {field_key} is not resolved (no write target)"

        try:
            if mapping.is_row_based:
                success, message = self._write_row_based(mapping, value, scope_id, source_doc_id, source_page)
            else:
                success, message = self._write_column(mapping, value, scope_id, source_doc_id, value_source=value_source)

            # Create Entity-Fact record after successful write
            if success and _should_create_fact(field_key):
                self._create_fact_from_extraction(
                    field_key=field_key,
                    value=value,
                    source_doc_id=source_doc_id,
                )

            return success, message
        except Exception as e:
            logger.error(f"Write failed for {field_key}: {e}")
            return False, f"Write failed: {str(e)}"

    def _create_fact_from_extraction(
        self,
        field_key: str,
        value: Any,
        source_doc_id: Optional[int] = None,
        confidence_score: float = 0.85,
    ) -> None:
        """
        Create Entity-Fact record from successful extraction.

        This is called after a successful write to production tables.
        Failures here are logged but don't fail the extraction.
        """
        try:
            from .fact_service import FactService
            from decimal import Decimal

            fact_service = FactService()
            fact_service.create_assumption_fact(
                project_id=self.project_id,
                assumption_key=field_key,
                value=value,
                source_type='document_extract',
                source_id=source_doc_id,
                confidence_score=Decimal(str(confidence_score)),
            )
            self._link_document_entity(source_doc_id)
        except Exception as e:
            # Log but don't fail - fact creation is non-critical
            logger.warning(f"Entity-Fact creation failed for {field_key} (non-fatal): {e}")

    def _link_document_entity(self, source_doc_id: Optional[int]) -> None:
        """Ensure document entities exist and link them to the project."""
        if not source_doc_id:
            return

        try:
            from apps.documents.models import Document
            from .entity_sync_service import EntitySyncService
            from .fact_service import FactService
        except Exception as e:
            logger.warning(f"Document entity linking unavailable: {e}")
            return

        doc = Document.objects.filter(doc_id=source_doc_id).first()
        if not doc:
            return

        sync_service = EntitySyncService()
        doc_entity = sync_service.ensure_document_entity(
            document_id=doc.doc_id,
            document_name=doc.doc_name,
            document_type=doc.doc_type,
            project_id=doc.project_id,
            doc_date=str(doc.doc_date) if doc.doc_date else None,
        )

        project_entity = sync_service.get_project_entity(self.project_id)
        if not project_entity:
            project_name = doc.project.project_name if doc.project else f"Project {self.project_id}"
            project_entity = sync_service.get_or_create_project_entity(
                project_id=self.project_id,
                project_name=project_name,
            )

        FactService().create_relationship_fact(
            subject_entity=project_entity,
            predicate='extracted_from',
            object_entity=doc_entity,
            source_type='document_extract',
            source_id=doc.doc_id,
        )

    # Tables that have a value_source column (added by Intelligence v1 migration)
    VALUE_SOURCE_TABLES = {
        'tbl_project', 'core_fin_fact_budget', 'tbl_project_assumption',
        'tbl_operating_expenses', 'tbl_multifamily_unit',
        'tbl_multifamily_unit_type', 'tbl_acreage_allocation',
    }

    def _write_column(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None,
        source_doc_id: Optional[int] = None,
        value_source: str = 'ai_extraction',
    ) -> Tuple[bool, str]:
        """Write to a direct column on a table."""

        table = mapping.table_name
        column = mapping.column_name
        converted_value = self._convert_value(value, mapping.field_type)
        # Build value_source SET clause for tables that support it
        vs_clause = ", value_source = %s" if table in self.VALUE_SOURCE_TABLES else ""
        vs_params = [value_source] if table in self.VALUE_SOURCE_TABLES else []

        # Determine the row to update based on scope
        if mapping.scope == 'project':
            if table == 'tbl_project':
                # Update tbl_project directly
                sql = f"""
                    UPDATE landscape.{table}
                    SET {column} = %s, updated_at = NOW(){vs_clause}
                    WHERE project_id = %s
                """
                params = [converted_value] + vs_params + [self.project_id]
            elif table == 'tbl_multifamily_property':
                # Insert or update the property record
                sql = f"""
                    INSERT INTO landscape.{table} (project_id, {column}, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    ON CONFLICT (project_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
                """
                params = [self.project_id, converted_value]
            elif table == 'tbl_loan':
                # Loan - need to handle upsert
                sql = f"""
                    INSERT INTO landscape.{table} (project_id, {column}, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    ON CONFLICT (project_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
                """
                params = [self.project_id, converted_value]
            elif table == 'tbl_equity':
                # Equity - need to handle upsert
                sql = f"""
                    INSERT INTO landscape.{table} (project_id, {column}, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    ON CONFLICT (project_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
                """
                params = [self.project_id, converted_value]
            else:
                # Generic project-scoped table update
                sql = f"""
                    UPDATE landscape.{table}
                    SET {column} = %s, updated_at = NOW(){vs_clause}
                    WHERE project_id = %s
                """
                params = [converted_value] + vs_params + [self.project_id]

        elif mapping.scope == 'unit_type' and scope_id:
            sql = f"""
                UPDATE landscape.{table}
                SET {column} = %s, updated_at = NOW(){vs_clause}
                WHERE unit_type_id = %s AND project_id = %s
            """
            params = [converted_value] + vs_params + [scope_id, self.project_id]

        elif mapping.scope == 'lot_or_product' and scope_id:
            sql = f"""
                UPDATE landscape.{table}
                SET {column} = %s, updated_at = NOW(){vs_clause}
                WHERE lot_id = %s AND project_id = %s
            """
            params = [converted_value] + vs_params + [scope_id, self.project_id]

        elif mapping.scope == 'phase' and scope_id:
            sql = f"""
                UPDATE landscape.{table}
                SET {column} = %s, updated_at = NOW(){vs_clause}
                WHERE phase_id = %s AND project_id = %s
            """
            params = [converted_value] + vs_params + [scope_id, self.project_id]

        elif mapping.scope == 'mf_property':
            # Multifamily property - upsert to tbl_multifamily_property
            sql = f"""
                INSERT INTO landscape.{table} (project_id, {column}, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (project_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
            """
            params = [self.project_id, converted_value]

        elif mapping.scope == 'acquisition':
            # Property acquisition - update existing row (seeded on project creation)
            sql = f"""
                UPDATE landscape.{table}
                SET {column} = %s, updated_at = NOW(){vs_clause}
                WHERE project_id = %s
            """
            params = [converted_value] + vs_params + [self.project_id]

        elif mapping.scope == 'market':
            # Market rate analysis - update existing row (seeded on project creation)
            sql = f"""
                UPDATE landscape.{table}
                SET {column} = %s, updated_at = NOW(){vs_clause}
                WHERE project_id = %s
            """
            params = [converted_value] + vs_params + [self.project_id]

        elif mapping.scope == 'unit':
            # Individual unit - upsert from chunked rent roll extraction
            # Use raw value if it's a dict (full unit data from extraction)
            unit_value = value if isinstance(value, dict) else converted_value
            return self._write_unit_upsert(mapping, unit_value, scope_id)

        elif mapping.scope == 'sales_comp':
            # Sales comparable - handled separately via _insert_comp_row
            # Use raw value (not converted) if it's a dict - conversion would stringify it
            comp_value = value if isinstance(value, dict) else converted_value
            return self._insert_comp_row(mapping, comp_value, 'sales', scope_id, source_doc_id)

        elif mapping.scope == 'rent_comp':
            # Rent comparable - handled separately via _insert_comp_row
            # Use raw value (not converted) if it's a dict - conversion would stringify it
            comp_value = value if isinstance(value, dict) else converted_value
            return self._insert_comp_row(mapping, comp_value, 'rent', scope_id, source_doc_id)

        elif mapping.scope == 'assumption':
            # Project assumption - upsert with assumption_key selector
            return self._write_assumption_upsert(mapping, converted_value)

        elif mapping.scope == 'opex':
            # Operating expense - upsert with expense_category selector
            return self._write_opex_upsert(mapping, converted_value)

        elif mapping.scope == 'income':
            # Other income - upsert with income_category selector
            return self._write_income_upsert(mapping, converted_value)

        elif mapping.scope == 'unit_type':
            # Unit type - upsert with unit_type_name matching
            # Use raw value if it's a dict (array extraction)
            ut_value = value if isinstance(value, dict) else converted_value
            return self._write_unit_type_upsert(mapping, ut_value, scope_id)

        else:
            return False, f"Unsupported scope: {mapping.scope} (scope_id={scope_id})"

        with connection.cursor() as cursor:
            try:
                cursor.execute(sql, params)
                if cursor.rowcount == 0:
                    # For upserts, 0 rows affected might mean insert happened
                    # Check if we used ON CONFLICT
                    if 'ON CONFLICT' not in sql:
                        return False, f"No rows updated for {table}.{column}"
                if table in ('tbl_project', 'tbl_multifamily_property', 'tbl_cre_property'):
                    sync_primary_measure_on_legacy_update(
                        project_id=self.project_id,
                        table=table,
                        column=column,
                        value=converted_value,
                        cursor=cursor
                    )
            except Exception as e:
                logger.error(f"SQL error: {e}")
                return False, f"Database error: {str(e)}"

        return True, f"Updated {table}.{column}"

    def _write_row_based(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None,
        source_doc_id: Optional[int] = None,
        source_page: Optional[int] = None
    ) -> Tuple[bool, str]:
        """Write to a row-based table (assumptions, opex, allocations, budget)."""

        selector = mapping.selector_json or {}

        if mapping.db_write_type == 'row_assumption':
            return self._write_assumption(mapping, value, selector)

        elif mapping.db_write_type == 'row_opex':
            return self._write_opex(mapping, value, selector)

        elif mapping.db_write_type == 'row_allocation':
            return self._write_allocation(mapping, value, selector, source_doc_id, source_page)

        elif mapping.db_write_type == 'row_budget':
            return self._write_budget(mapping, value, selector)

        elif mapping.db_write_type == 'row_milestone':
            return self._write_milestone(mapping, value)

        elif mapping.db_write_type == 'upsert':
            # Handle upserts based on target table
            target_table = mapping.table_name or ''
            if 'unit_type' in target_table:
                return self._write_unit_type_upsert(mapping, value, scope_id)
            elif 'unit' in target_table:
                print(f"=== UNIT UPSERT DISPATCHED ===", flush=True)
                print(f"VALUE TYPE: {type(value)}, VALUE: {value}", flush=True)
                return self._write_unit_upsert(mapping, value, scope_id)
            elif 'operating_expense' in target_table:
                return self._write_opex(mapping, value, selector)
            elif 'revenue_other' in target_table:
                return self._write_income_upsert(mapping, value)
            return False, f"Unknown upsert target table: {target_table}"

        # ── Land Development write types ─────────────────────────────────────
        elif mapping.db_write_type == 'row_lot_inventory':
            return self._write_lot_inventory(mapping, value, scope_id)

        elif mapping.db_write_type == 'row_absorption':
            return self._write_absorption(mapping, value, scope_id)

        elif mapping.db_write_type == 'row_land_use_budget':
            return self._write_land_use_budget(mapping, value, scope_id)

        return False, f"Unknown row-based write type: {mapping.db_write_type}"

    def _write_assumption(
        self,
        mapping: FieldMapping,
        value: Any,
        selector: Dict
    ) -> Tuple[bool, str]:
        """Write to tbl_project_assumption."""

        assumption_key = selector.get('assumption_key', mapping.field_key)
        scope = selector.get('scope', 'project')

        sql = """
            INSERT INTO landscape.tbl_project_assumption
                (project_id, assumption_key, assumption_value, assumption_type, scope, created_at, updated_at)
            VALUES (%s, %s, %s, 'extracted', %s, NOW(), NOW())
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = EXCLUDED.assumption_value,
                          assumption_type = 'extracted',
                          updated_at = NOW()
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [self.project_id, assumption_key, str(value), scope])

        return True, f"Wrote assumption: {assumption_key}"

    def _write_opex(
        self,
        mapping: FieldMapping,
        value: Any,
        selector: Dict
    ) -> Tuple[bool, str]:
        """
        Write operating expenses to the canonical tbl_operating_expenses table.

        Mapping resolver precedence:
        1) selector-provided category/category_name
        2) mapping.label
        3) alias match via OPEX_ACCOUNT_MAPPING
        """

        category_label = selector.get('category') or selector.get('category_name') or mapping.label
        selector = dict(selector or {})
        result = upsert_opex_entry(
            connection,
            self.project_id,
            category_label,
            value,
            selector
        )
        if result.get('success'):
            action = result.get('action', 'updated')
            return True, f"{action.title()} OpEx: {category_label}"
        return False, result.get('error', 'Unknown error')


    def write_opex_entry(
        self,
        category_label: str,
        amount: Any,
        selector: Optional[Dict] = None
    ) -> Tuple[bool, str]:
        """
        Convenience entry point to write an OpEx row without a full FieldMapping.
        Used by replay/validation scripts.
        """
        fake_mapping = FieldMapping(
            property_type=self.property_type,
            field_key='opex_manual',
            label=category_label,
            field_type='currency',
            required=False,
            default=None,
            extractability='medium',
            extract_policy='propose_for_validation',
            source_priority='doc>user>benchmark',
            scope='project',
            evidence_types=[],
            db_write_type='row_opex',
            resolved=True,
            resolved_table='tbl_operating_expenses',
            resolved_column='annual_amount',
            selector_json=selector or {},
            db_target='tbl_operating_expenses.annual_amount',
            field_role='input',
            analytical_tier_default='supporting'
        )
        return self._write_opex(fake_mapping, amount, selector or {})

    def _write_allocation(
        self,
        mapping: FieldMapping,
        value: Any,
        selector: Dict,
        source_doc_id: Optional[int] = None,
        source_page: Optional[int] = None
    ) -> Tuple[bool, str]:
        """Write to tbl_acreage_allocation."""

        allocation_type_code = selector.get('allocation_type_code', 'other')

        # Look up allocation_type_id
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT allocation_type_id FROM landscape.lu_acreage_allocation_type
                WHERE allocation_type_code = %s LIMIT 1
            """, [allocation_type_code])
            row = cursor.fetchone()
            allocation_type_id = row[0] if row else None

        # Convert value to decimal
        try:
            acres = Decimal(str(value).replace(',', ''))
        except (InvalidOperation, ValueError):
            return False, f"Invalid acres value: {value}"

        with connection.cursor() as cursor:
            # Check if exists
            cursor.execute("""
                SELECT allocation_id FROM landscape.tbl_acreage_allocation
                WHERE project_id = %s AND allocation_type_code = %s
            """, [self.project_id, allocation_type_code])
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE landscape.tbl_acreage_allocation
                    SET acres = %s, allocation_type_id = %s, source_doc_id = %s,
                        source_page = %s, updated_at = NOW()
                    WHERE allocation_id = %s
                """, [acres, allocation_type_id, source_doc_id, source_page, existing[0]])
            else:
                cursor.execute("""
                    INSERT INTO landscape.tbl_acreage_allocation
                        (project_id, allocation_type_id, allocation_type_code, acres,
                         source_doc_id, source_page, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [self.project_id, allocation_type_id, allocation_type_code,
                      acres, source_doc_id, source_page])

        return True, f"Wrote allocation: {allocation_type_code}"

    def _write_budget(
        self,
        mapping: FieldMapping,
        value: Any,
        selector: Dict
    ) -> Tuple[bool, str]:
        """Write to tbl_budget_fact."""

        category_name = selector.get('category_name', mapping.label)

        # Look up category_id
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT category_id FROM landscape.core_unit_cost_category
                WHERE category_name = %s LIMIT 1
            """, [category_name])
            row = cursor.fetchone()
            category_id = row[0] if row else None

        # Convert value to decimal
        try:
            total_cost = Decimal(str(value).replace(',', '').replace('$', ''))
        except (InvalidOperation, ValueError):
            return False, f"Invalid budget value: {value}"

        # Use upsert with unique constraint on (project_id, category_name)
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_budget_fact
                    (project_id, category_id, category_name, total_cost, created_at, updated_at)
                VALUES (%s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (project_id, category_name)
                DO UPDATE SET
                    total_cost = EXCLUDED.total_cost,
                    category_id = EXCLUDED.category_id,
                    updated_at = NOW()
            """, [self.project_id, category_id, category_name, total_cost])

        return True, f"Wrote budget: {category_name}"

    def _write_milestone(
        self,
        mapping: FieldMapping,
        value: Any
    ) -> Tuple[bool, str]:
        """Write to tbl_milestone."""

        # Value should be dict with milestone_name, target_date, etc.
        if isinstance(value, dict):
            name = value.get('name', value.get('milestone_name', 'Milestone'))
            target_date = value.get('date', value.get('target_date'))
        elif isinstance(value, str):
            # Assume it's just a date string
            name = mapping.label
            target_date = value
        else:
            return False, "Milestone value must be dict with name and date, or a date string"

        sql = """
            INSERT INTO landscape.tbl_milestone
                (project_id, milestone_name, target_date, created_at)
            VALUES (%s, %s, %s, NOW())
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [self.project_id, name, target_date])

        return True, f"Wrote milestone: {name}"

    # ── Land Development Writers ────────────────────────────────────────────

    def _write_lot_inventory(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """Write lot inventory to tbl_parcel (one row per lot type)."""
        if not isinstance(value, list):
            value = [value]

        count = 0
        for lot in value:
            if not isinstance(lot, dict):
                continue

            phase_id = lot.get('phase_id', scope_id)
            parcel_name = lot.get('parcel_name', lot.get('name', 'Unknown'))
            units_total = lot.get('units_total', lot.get('count', 0))

            cols = ['project_id', 'phase_id', 'parcel_name', 'units_total']
            vals = [self.project_id, phase_id, parcel_name, units_total]

            for field in ['parcel_code', 'lot_product', 'product_code', 'lot_width',
                          'lot_depth', 'lot_area', 'acres_gross', 'landuse_code',
                          'landuse_type', 'saleprice']:
                if field in lot:
                    cols.append(field)
                    vals.append(lot[field])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_parcel ({', '.join(cols)})
                    VALUES ({', '.join(['%s'] * len(cols))})
                    RETURNING parcel_id
                """, vals)
                count += 1

        return True, f"Wrote {count} lot inventory rows"

    def _write_absorption(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """Write absorption schedule entries to tbl_absorption_schedule."""
        if not isinstance(value, list):
            value = [value]

        count = 0
        for entry in value:
            if not isinstance(entry, dict):
                continue

            cols = ['project_id']
            vals = [self.project_id]

            allowed = [
                'area_id', 'phase_id', 'parcel_id', 'revenue_stream_name',
                'revenue_category', 'lu_family_name', 'lu_type_code', 'product_code',
                'start_period', 'periods_to_complete', 'timing_method', 'units_per_period',
                'total_units', 'base_price_per_unit', 'price_escalation_pct',
                'scenario_name', 'probability_weight', 'notes',
                'confidence', 'data_source',
            ]

            for field in allowed:
                if field in entry:
                    cols.append(field)
                    vals.append(entry[field])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_absorption_schedule
                    ({', '.join(cols)}, created_at, updated_at)
                    VALUES ({', '.join(['%s'] * len(cols))}, NOW(), NOW())
                    RETURNING absorption_id
                """, vals)
                count += 1

        return True, f"Wrote {count} absorption schedule entries"

    def _write_land_use_budget(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Write land use allocations to tbl_acreage_allocation.

        Target table: landscape.tbl_acreage_allocation
        Lookup table: landscape.lu_acreage_allocation_type (11 categories)
        View:         landscape.vw_acreage_allocation (enriched read)

        Each item in the value array should have:
          - land_use / allocation_type_code: category label or code
          - acres: acreage value
          - notes: optional description
        scope_id is used as phase_id (optional).
        """
        if not isinstance(value, list):
            value = [value]

        phase_id = scope_id  # scope_id maps to phase_id for land dev
        wrote = 0

        with connection.cursor() as cursor:
            for item in value:
                # Accept either dict-style items or plain values
                if isinstance(item, dict):
                    land_use = item.get('land_use', item.get('allocation_type_code', 'other'))
                    try:
                        acres = Decimal(str(item.get('acres', 0)).replace(',', ''))
                    except (InvalidOperation, ValueError):
                        logger.warning(f"Invalid acres value in land use budget: {item.get('acres')}")
                        continue
                    notes = item.get('notes')
                else:
                    # Plain value — skip, need structured data
                    logger.warning(f"Skipping non-dict land use budget item: {item}")
                    continue

                # Resolve allocation_type_code via keyword matching
                alloc_type_code = self._resolve_alloc_type_code(cursor, land_use)

                # Resolve allocation_type_id from code
                allocation_type_id = None
                cursor.execute("""
                    SELECT allocation_type_id FROM landscape.lu_acreage_allocation_type
                    WHERE allocation_type_code = %s LIMIT 1
                """, [alloc_type_code])
                row = cursor.fetchone()
                if row:
                    allocation_type_id = row[0]

                # Upsert: match on project_id + allocation_type_code + phase_id
                cursor.execute("""
                    SELECT allocation_id FROM landscape.tbl_acreage_allocation
                    WHERE project_id = %s
                    AND allocation_type_code = %s
                    AND COALESCE(phase_id, 0) = COALESCE(%s, 0)
                """, [self.project_id, alloc_type_code, phase_id])
                existing = cursor.fetchone()

                if existing:
                    cursor.execute("""
                        UPDATE landscape.tbl_acreage_allocation
                        SET acres = %s, allocation_type_id = %s, notes = %s,
                            updated_at = NOW()
                        WHERE allocation_id = %s
                    """, [acres, allocation_type_id, notes, existing[0]])
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_acreage_allocation
                        (project_id, phase_id, allocation_type_id, allocation_type_code,
                         acres, notes, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, [self.project_id, phase_id, allocation_type_id,
                          alloc_type_code, acres, notes])
                wrote += 1

        return True, f"Wrote {wrote} land use allocation entries to tbl_acreage_allocation"

    @staticmethod
    def _resolve_alloc_type_code(cursor, land_use: str) -> str:
        """Map a free-text land use label to an allocation_type_code."""
        if not land_use:
            return 'other'
        label = land_use.lower().strip()

        # Direct keyword map
        keyword_map = {
            'gross': 'gross', 'total': 'gross', 'gross acres': 'gross',
            'net developable': 'net_developable', 'net': 'net_developable', 'developable': 'net_developable',
            'open space': 'open_space', 'park': 'open_space', 'greenbelt': 'open_space',
            'drainage': 'drainage', 'detention': 'drainage', 'floodplain': 'drainage',
            'road': 'roads_row', 'row': 'roads_row', 'right of way': 'roads_row', 'street': 'roads_row',
            'amenity': 'amenity', 'clubhouse': 'amenity', 'recreation': 'amenity', 'pool': 'amenity',
            'commercial': 'commercial', 'retail': 'commercial', 'office': 'commercial',
            'multifamily': 'multifamily', 'apartment': 'multifamily', 'mf': 'multifamily',
            'single family': 'single_family', 'sfd': 'single_family', 'sfr': 'single_family', 'sf': 'single_family',
            'school': 'school', 'education': 'school',
        }
        for keyword, code in keyword_map.items():
            if keyword in label:
                return code

        # DB fallback: exact match on code or label
        cursor.execute("""
            SELECT allocation_type_code FROM landscape.lu_acreage_allocation_type
            WHERE allocation_type_code = %s OR LOWER(allocation_type_name) = %s
            LIMIT 1
        """, [label, label])
        row = cursor.fetchone()
        if row:
            return row[0]

        return 'other'

    def _write_assumption_upsert(
        self,
        mapping: FieldMapping,
        value: Any
    ) -> Tuple[bool, str]:
        """
        Upsert a project assumption row.

        Uses assumption_key from selector_json for matching.
        """
        selector = mapping.selector_json or {}
        assumption_key = selector.get('key', mapping.field_key)

        # Convert value appropriately
        converted = self._convert_value(value, mapping.field_type)

        sql = """
            INSERT INTO landscape.tbl_project_assumption
                (project_id, assumption_key, assumption_value, assumption_type, created_at, updated_at)
            VALUES (%s, %s, %s, 'extracted', NOW(), NOW())
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = EXCLUDED.assumption_value,
                          assumption_type = 'extracted',
                          updated_at = NOW()
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [self.project_id, assumption_key, str(converted)])

        return True, f"Upserted assumption: {assumption_key}"

    def _write_opex_upsert(
        self,
        mapping: FieldMapping,
        value: Any
    ) -> Tuple[bool, str]:
        """
        Upsert an operating expense row.

        Uses expense_category from selector_json for matching.
        """
        selector = mapping.selector_json or {}
        category_label = mapping.label or selector.get('category') or mapping.field_key.replace('opex_', '')

        result = upsert_opex_entry(connection, self.project_id, category_label, value, selector)
        if result.get('success'):
            action = result.get('action', 'updated')
            return True, f"{action.title()} OpEx: {category_label}"

        return False, result.get('error', f"Failed to upsert OpEx: {category_label}")

    def _write_income_upsert(
        self,
        mapping: FieldMapping,
        value: Any
    ) -> Tuple[bool, str]:
        """
        Upsert an other income row.

        tbl_revenue_other has one row per project with specific columns for each income type.
        """
        column = mapping.column_name
        table = 'tbl_revenue_other'

        # Convert value to decimal
        try:
            amount = Decimal(str(value).replace(',', '').replace('$', ''))
        except (InvalidOperation, ValueError):
            return False, f"Invalid amount value: {value}"

        # Use upsert on project_id
        sql = f"""
            INSERT INTO landscape.{table}
                (project_id, {column}, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON CONFLICT (project_id)
            DO UPDATE SET
                {column} = EXCLUDED.{column},
                updated_at = NOW()
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [self.project_id, amount])

        return True, f"Upserted Income: {column}"

    def _write_unit_type_upsert(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Upsert unit type row by unit_type_name.

        For array extractions, value is a dict with all unit type fields.
        We match on unit_type_name (from scope_label in staging).
        """
        table = 'tbl_multifamily_unit_type'

        # If value is a dict (full unit type data from array extraction)
        if isinstance(value, dict):
            return self._insert_full_unit_type(value)

        # Single column update - need scope_id or unit_type_name
        if scope_id:
            column = mapping.column_name
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE landscape.{table}
                    SET {column} = %s, updated_at = NOW()
                    WHERE unit_type_id = %s AND project_id = %s
                """, [value, scope_id, self.project_id])
                if cursor.rowcount > 0:
                    return True, f"Updated {table}.{column}"
                return False, f"No unit_type found with id {scope_id}"

        return False, "Cannot update unit_type without scope_id or full data dict"

    def _insert_full_unit_type(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """Insert or update a unit type row from extracted dict."""
        # Extract unit type name for matching
        unit_type_name = data.get('unit_type_name') or data.get('unit_type')
        if not unit_type_name:
            # Try to construct from bed/bath
            beds = data.get('bedrooms', data.get('beds', ''))
            baths = data.get('bathrooms', data.get('baths', ''))
            if beds and baths:
                unit_type_name = f"{beds}BR/{baths}BA"

        if not unit_type_name:
            return False, "No unit_type_name found in data"

        # Check if exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT unit_type_id FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s AND (
                    unit_type_name = %s
                    OR LOWER(REPLACE(unit_type_name, ' ', '')) = LOWER(REPLACE(%s, ' ', ''))
                )
            """, [self.project_id, unit_type_name, unit_type_name])
            row = cursor.fetchone()

        # Map extracted field names to column names
        field_mapping = {
            'bedrooms': 'bedrooms', 'beds': 'bedrooms',
            'bathrooms': 'bathrooms', 'baths': 'bathrooms',
            'unit_count': 'unit_count', 'count': 'unit_count',
            'avg_sqft': 'avg_sqft', 'square_feet': 'avg_sqft', 'sf': 'avg_sqft',
            'market_rent': 'market_rent', 'rent': 'market_rent',
            'current_rent': 'current_rent', 'in_place_rent': 'current_rent',
        }

        # Build update dict
        columns = {}
        for key, col in field_mapping.items():
            if key in data and data[key] is not None:
                columns[col] = data[key]

        if row:
            # Update existing
            unit_type_id = row[0]
            if columns:
                set_clause = ', '.join([f"{k} = %s" for k in columns.keys()])
                values = list(columns.values()) + [unit_type_id, self.project_id]
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        UPDATE landscape.tbl_multifamily_unit_type
                        SET {set_clause}, updated_at = NOW()
                        WHERE unit_type_id = %s AND project_id = %s
                    """, values)
            return True, f"Updated unit_type: {unit_type_name}"
        else:
            # Insert new
            columns['unit_type_name'] = unit_type_name
            col_names = ', '.join(columns.keys())
            placeholders = ', '.join(['%s'] * len(columns))
            values = list(columns.values()) + [self.project_id]

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_multifamily_unit_type
                    (project_id, {col_names}, created_at, updated_at)
                    VALUES (%s, {placeholders}, NOW(), NOW())
                """, [self.project_id] + list(columns.values()))
            return True, f"Inserted unit_type: {unit_type_name}"

    def _write_unit_upsert(
        self,
        mapping: FieldMapping,
        value: Any,
        scope_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Upsert rent roll unit row by unit_number.

        For array extractions from chunked rent roll, value is a dict with all unit fields.
        We match on unit_number for upsert.
        """
        print(f"=== _WRITE_UNIT_UPSERT CALLED ===", flush=True)
        print(f"PROJECT: {self.project_id}, VALUE TYPE: {type(value)}, SCOPE_ID: {scope_id}", flush=True)
        print(f"VALUE: {value}", flush=True)

        table = 'tbl_multifamily_unit'

        # If value is a dict (full unit data from chunked extraction)
        if isinstance(value, dict):
            print(f"=== CALLING _insert_full_unit ===")
            return self._insert_full_unit(value)

        # Single column update - need scope_id (unit_id)
        if scope_id:
            column = mapping.column_name
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE landscape.{table}
                    SET {column} = %s, updated_at = NOW()
                    WHERE unit_id = %s AND project_id = %s
                """, [value, scope_id, self.project_id])
                if cursor.rowcount > 0:
                    return True, f"Updated {table}.{column}"
                return False, f"No unit found with id {scope_id}"

        return False, "Cannot update unit without scope_id or full data dict"

    def _insert_full_unit(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """Insert or update a rent roll unit row from extracted dict."""
        print(f"=== _INSERT_FULL_UNIT CALLED ===", flush=True)
        print(f"DATA KEYS: {list(data.keys())}", flush=True)
        print(f"UNIT NUMBER: {data.get('unit_number')}, RENT: {data.get('current_rent')}, STATUS: {data.get('occupancy_status')}", flush=True)
        print(f"FULL DATA: {data}", flush=True)

        # Extract unit number for matching
        unit_number = data.get('unit_number')
        if not unit_number:
            return False, "No unit_number found in data"

        # Check if unit exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT unit_id FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s AND unit_number = %s
            """, [self.project_id, str(unit_number)])
            row = cursor.fetchone()

        # Map extracted field names to column names
        # Support both prefixed (unit_bedrooms) and non-prefixed (bedrooms) field names
        field_mapping = {
            'unit_number': 'unit_number',
            'unit_type': 'unit_type',
            'unit_unit_type': 'unit_type',  # Prefixed version
            'bedrooms': 'bedrooms',
            'unit_bedrooms': 'bedrooms',  # Prefixed version
            'bathrooms': 'bathrooms',
            'unit_bathrooms': 'bathrooms',  # Prefixed version
            'square_feet': 'square_feet',
            'unit_square_feet': 'square_feet',  # Prefixed version
            'current_rent': 'current_rent',
            'unit_current_rent': 'current_rent',  # Prefixed version
            'market_rent': 'market_rent',
            'unit_market_rent': 'market_rent',  # Prefixed version
            'lease_start': 'lease_start_date',
            'unit_lease_start': 'lease_start_date',  # Prefixed version
            'lease_end': 'lease_end_date',
            'unit_lease_end': 'lease_end_date',  # Prefixed version
            'occupancy_status': 'occupancy_status',
            'unit_occupancy_status': 'occupancy_status',  # Prefixed version
            'tenant_name': None,  # Not in table
            'unit_tenant_name': None,  # Not in table
            'move_in_date': None,  # Not in table
            'unit_move_in_date': None,  # Not in table
            'rent_effective_date': None,  # Not in table
            'is_section8': 'is_section8',
            'is_manager_unit': 'is_manager',
        }

        # Build update dict
        columns = {}
        for key, col in field_mapping.items():
            if col and key in data and data[key] is not None:
                val = data[key]
                # Handle Section 8 status from occupancy_status
                if key == 'occupancy_status' and 'section 8' in str(val).lower():
                    columns['is_section8'] = True
                    # Clean the occupancy status
                    val = 'Occupied'
                # Handle date conversion
                if col in ('lease_start_date', 'lease_end_date') and val:
                    try:
                        # Parse if string
                        if isinstance(val, str):
                            from datetime import datetime
                            val = datetime.strptime(val, '%Y-%m-%d').date()
                    except (ValueError, TypeError):
                        val = None
                if val is not None:
                    columns[col] = val

        # Derive floor_number from unit_number
        try:
            floor_num = int(str(unit_number)[0]) if len(str(unit_number)) == 3 else None
            if floor_num:
                columns['floor_number'] = floor_num
        except (ValueError, IndexError):
            pass

        if row:
            # Update existing unit
            unit_id = row[0]
            if columns:
                set_clause = ', '.join([f"{k} = %s" for k in columns.keys()])
                values = list(columns.values()) + [unit_id, self.project_id]
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        UPDATE landscape.tbl_multifamily_unit
                        SET {set_clause}, updated_at = NOW()
                        WHERE unit_id = %s AND project_id = %s
                    """, values)
            return True, f"Updated unit: {unit_number}"
        else:
            # Insert new unit
            # Required fields for insert
            if 'unit_number' not in columns:
                columns['unit_number'] = str(unit_number)
            if 'unit_type' not in columns:
                columns['unit_type'] = 'Unknown'
            if 'square_feet' not in columns:
                columns['square_feet'] = 0

            col_names = ', '.join(columns.keys())
            placeholders = ', '.join(['%s'] * len(columns))

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_multifamily_unit
                    (project_id, {col_names}, created_at, updated_at)
                    VALUES (%s, {placeholders}, NOW(), NOW())
                """, [self.project_id] + list(columns.values()))
            return True, f"Inserted unit: {unit_number}"

    def _insert_comp_row(
        self,
        mapping: FieldMapping,
        value: Any,
        comp_type: str,  # 'sales' or 'rent'
        scope_id: Optional[int] = None,
        source_doc_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Insert a comparable property row.

        For array extractions, value will be a dict with all comp fields.
        We insert a new row for each comparable.
        """
        table = 'tbl_sales_comparables' if comp_type == 'sales' else 'tbl_rent_comparable'

        # If value is a dict (full comp data), extract all fields
        if isinstance(value, dict):
            return self._insert_full_comp(table, value, comp_type, source_doc_id)

        # Otherwise, single column update if scope_id provided
        if scope_id:
            column = mapping.column_name
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE landscape.{table}
                    SET {column} = %s, updated_at = NOW()
                    WHERE comp_id = %s AND project_id = %s
                """, [value, scope_id, self.project_id])
            return True, f"Updated {table}.{column}"

        return False, f"Cannot insert {comp_type} comp without full data or scope_id"

    def _insert_full_comp(
        self,
        table: str,
        data: Dict[str, Any],
        comp_type: str,
        source_doc_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """Insert a full comparable row from extracted dict."""

        if comp_type == 'sales':
            # Map extracted fields to table columns
            columns = []
            values = []
            params = [self.project_id]

            field_map = {
                'property_name': 'property_name',
                'address': 'address',
                'city': 'city',
                'state': 'state',
                'sale_date': 'sale_date',
                'sale_price': 'sale_price',
                'price_per_unit': 'price_per_unit',
                'price_per_sf': 'price_per_sf',
                'cap_rate': 'cap_rate',
                'units': 'unit_count',
                'unit_count': 'unit_count',
                'year_built': 'year_built',
                'building_sf': 'building_sf',
                'distance_miles': 'distance_miles',
                'buyer': 'buyer',
                'seller': 'seller',
            }

            for ext_key, col in field_map.items():
                if ext_key in data and data[ext_key] is not None:
                    columns.append(col)
                    values.append('%s')
                    params.append(self._convert_value(data[ext_key], self._infer_type(col)))

            if not columns:
                return False, "No valid fields in comp data"

            columns_str = ', '.join(['project_id'] + columns + ['created_at', 'updated_at'])
            values_str = ', '.join(['%s'] + values + ['NOW()', 'NOW()'])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.{table} ({columns_str})
                    VALUES ({values_str})
                """, params)

            name = data.get('property_name', 'Unknown')
            self._create_comp_facts(data, comp_type, source_doc_id)
            return True, f"Inserted sales comp: {name}"

        else:  # rent comp
            columns = []
            values = []
            params = [self.project_id]

            field_map = {
                'property_name': 'property_name',
                'address': 'address',
                'city': 'city',
                'state': 'state',
                'distance_miles': 'distance_miles',
                'year_built': 'year_built',
                'unit_count': 'unit_count',
                'units': 'unit_count',
                'occupancy': 'occupancy',
                'avg_rent': 'avg_rent',
                'avg_rent_psf': 'avg_rent_psf',
                'concessions': 'concessions',
            }

            for ext_key, col in field_map.items():
                if ext_key in data and data[ext_key] is not None:
                    columns.append(col)
                    values.append('%s')
                    params.append(self._convert_value(data[ext_key], self._infer_type(col)))

            if not columns:
                return False, "No valid fields in rent comp data"

            columns_str = ', '.join(['project_id'] + columns + ['created_at', 'updated_at'])
            values_str = ', '.join(['%s'] + values + ['NOW()', 'NOW()'])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    INSERT INTO landscape.{table} ({columns_str})
                    VALUES ({values_str})
                """, params)

            name = data.get('property_name', 'Unknown')
            self._create_comp_facts(data, comp_type, source_doc_id)
            return True, f"Inserted rent comp: {name}"

    def _create_comp_facts(
        self,
        data: Dict[str, Any],
        comp_type: str,
        source_doc_id: Optional[int] = None,
    ) -> None:
        """Create knowledge facts for a comparable property."""
        try:
            from .entity_sync_service import EntitySyncService
            from .fact_service import FactService
        except Exception as e:
            logger.warning(f"Comparable fact creation unavailable: {e}")
            return

        name = data.get('property_name') or data.get('name') or 'Comparable'
        address = data.get('address') or ''
        city = data.get('city') or ''
        state = data.get('state') or ''
        property_type = self.property_type or 'unknown'

        sync_service = EntitySyncService()
        comp_entity = sync_service.ensure_property_entity(
            name=name,
            address=address,
            city=city,
            state=state,
            property_type=property_type,
            unit_count=data.get('unit_count') or data.get('units'),
            year_built=data.get('year_built'),
        )

        fact_service = FactService()
        normalized_type = 'sale' if comp_type == 'sales' else 'rent'
        fact_service.create_comparable_facts(
            comp_entity=comp_entity,
            comp_type=normalized_type,
            values=data,
            source_document_id=source_doc_id,
        )

    def _upsert_unit_row(
        self,
        data: Dict[str, Any],
        source_doc_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Upsert an individual unit row from rent roll extraction.

        Uses unit_number as the match key for upsert.
        """
        print(f"=== UNIT UPSERT TRACE ===")
        print(f"WRITING UNIT: {data.get('unit_number')}, rent={data.get('current_rent')}, status={data.get('occupancy_status')}")
        print(f"FULL UNIT DATA: {data}")

        unit_number = data.get('unit_number')
        if not unit_number:
            return False, "Unit number required for unit upsert"

        # Map extracted fields to table columns
        # Support both prefixed (unit_bedrooms) and non-prefixed (bedrooms) field names
        field_map = {
            'unit_number': 'unit_number',
            'unit_type': 'unit_type_code',
            'unit_unit_type': 'unit_type_code',  # Prefixed version
            'bedrooms': 'bedrooms',
            'unit_bedrooms': 'bedrooms',  # Prefixed version
            'bathrooms': 'bathrooms',
            'unit_bathrooms': 'bathrooms',  # Prefixed version
            'square_feet': 'square_feet',
            'unit_square_feet': 'square_feet',  # Prefixed version
            'current_rent': 'current_rent',
            'unit_current_rent': 'current_rent',  # Prefixed version
            'market_rent': 'market_rent',
            'unit_market_rent': 'market_rent',  # Prefixed version
            'move_in_date': 'move_in_date',
            'unit_move_in_date': 'move_in_date',  # Prefixed version
            'lease_start': 'lease_start_date',
            'unit_lease_start': 'lease_start_date',  # Prefixed version
            'lease_end': 'lease_end_date',
            'unit_lease_end': 'lease_end_date',  # Prefixed version
            'tenant_name': 'tenant_name',
            'unit_tenant_name': 'tenant_name',  # Prefixed version
            'occupancy_status': 'occupancy_status',
            'unit_occupancy_status': 'occupancy_status',  # Prefixed version
            'is_vacant': 'is_vacant',
            'floor_number': 'floor_number',
        }

        update_cols = []
        insert_cols = ['project_id', 'unit_number']
        insert_vals = ['%s', '%s']
        params = [self.project_id, unit_number]

        for ext_key, col in field_map.items():
            if ext_key in data and data[ext_key] is not None and ext_key != 'unit_number':
                val = self._convert_value(data[ext_key], self._infer_type(col))
                insert_cols.append(col)
                insert_vals.append('%s')
                update_cols.append(f"{col} = EXCLUDED.{col}")
                params.append(val)

        insert_cols.extend(['created_at', 'updated_at'])
        insert_vals.extend(['NOW()', 'NOW()'])
        update_cols.append('updated_at = NOW()')

        sql = f"""
            INSERT INTO landscape.tbl_multifamily_unit ({', '.join(insert_cols)})
            VALUES ({', '.join(insert_vals)})
            ON CONFLICT (project_id, unit_number)
            DO UPDATE SET {', '.join(update_cols)}
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)

        return True, f"Upserted unit: {unit_number}"

    def _infer_type(self, column_name: str) -> str:
        """Infer field type from column name for conversion."""
        if column_name in ('sale_price', 'price_per_unit', 'price_per_sf', 'avg_rent',
                           'avg_rent_psf', 'current_rent', 'market_rent', 'concessions'):
            return 'currency'
        elif column_name in ('cap_rate', 'occupancy'):
            return 'percent'
        elif column_name in ('unit_count', 'units', 'year_built', 'bedrooms', 'bathrooms',
                             'square_feet', 'building_sf', 'floor_number'):
            return 'integer'
        elif column_name in ('sale_date', 'move_in_date', 'lease_start_date', 'lease_end_date'):
            return 'date'
        elif column_name in ('is_vacant',):
            return 'boolean'
        elif column_name in ('distance_miles',):
            return 'decimal'
        return 'text'

    def write_unit_array(
        self,
        units: List[Dict[str, Any]],
        source_doc_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Write an array of unit data from rent roll extraction.

        Returns summary of successes and failures.
        """
        print(f"=== WRITE_UNIT_ARRAY CALLED ===")
        print(f"PROJECT: {self.project_id}, NUM UNITS: {len(units)}, SOURCE_DOC: {source_doc_id}")

        results = {'success': 0, 'failed': 0, 'errors': []}

        for unit in units:
            try:
                success, msg = self._upsert_unit_row(unit, source_doc_id)
                if success:
                    results['success'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({'unit': unit.get('unit_number'), 'error': msg})
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({'unit': unit.get('unit_number'), 'error': str(e)})

        return results

    def write_comp_array(
        self,
        comps: List[Dict[str, Any]],
        comp_type: str,  # 'sales' or 'rent'
        source_doc_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Write an array of comparable property data.

        Returns summary of successes and failures.
        """
        table = 'tbl_sales_comparables' if comp_type == 'sales' else 'tbl_rent_comparable'
        results = {'success': 0, 'failed': 0, 'errors': []}

        for comp in comps:
            try:
                success, msg = self._insert_full_comp(table, comp, comp_type, source_doc_id)
                if success:
                    results['success'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({'comp': comp.get('property_name'), 'error': msg})
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({'comp': comp.get('property_name'), 'error': str(e)})

        return results

    def _convert_value(self, value: Any, field_type: str) -> Any:
        """Convert value to appropriate database type."""
        if value is None:
            return None

        try:
            if field_type == 'integer':
                # Remove commas, dollar signs, etc.
                clean = str(value).replace(',', '').replace('$', '').strip()
                return int(float(clean))
            elif field_type in ('decimal', 'currency'):
                clean = str(value).replace(',', '').replace('$', '').strip()
                return Decimal(clean)
            elif field_type == 'percent':
                # Handle both 0.05 and 5% formats
                v = str(value).replace('%', '').strip()
                d = Decimal(v)
                if d > 1:  # Assume it's already in percentage form
                    d = d / 100
                return d
            elif field_type == 'boolean':
                return str(value).lower() in ('true', 'yes', '1', 't')
            elif field_type == 'date':
                return value  # Assume already in proper format
            elif field_type == 'json':
                if isinstance(value, str):
                    return json.loads(value)
                return value
            else:
                return str(value)
        except Exception as e:
            logger.warning(f"Value conversion failed for {field_type}: {e}")
            return str(value)


def write_validated_extraction(
    project_id: int,
    property_type: str,
    extraction_id: int,
    field_key: str,
    value: Any,
    **kwargs
) -> Tuple[bool, str]:
    """Convenience function to write a single extraction."""
    writer = ExtractionWriter(project_id, property_type)
    return writer.write_extraction(extraction_id, field_key, value, **kwargs)


def write_multiple_extractions(
    project_id: int,
    property_type: str,
    extractions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Write multiple extractions in a single transaction.

    Args:
        project_id: The project ID
        property_type: 'multifamily' or 'land_development'
        extractions: List of dicts with keys: field_key, value, scope_id, source_doc_id, source_page

    Returns:
        Dict with 'success', 'failed', 'results' keys
    """
    writer = ExtractionWriter(project_id, property_type)
    results = {'success': [], 'failed': [], 'total': len(extractions)}

    for i, ext in enumerate(extractions):
        field_key = ext.get('field_key')
        value = ext.get('value')

        if not field_key or value is None:
            results['failed'].append({
                'index': i,
                'field_key': field_key,
                'error': 'Missing field_key or value'
            })
            continue

        success, message = writer.write_extraction(
            extraction_id=ext.get('extraction_id', 0),
            field_key=field_key,
            value=value,
            scope_id=ext.get('scope_id'),
            source_doc_id=ext.get('source_doc_id'),
            source_page=ext.get('source_page')
        )

        if success:
            results['success'].append({
                'index': i,
                'field_key': field_key,
                'message': message
            })
        else:
            results['failed'].append({
                'index': i,
                'field_key': field_key,
                'error': message
            })

    return results


def aggregate_unit_types(project_id: int) -> Dict[str, Any]:
    """
    Aggregate individual units into unit types for the floorplan matrix.

    Groups units by bedroom count and calculates:
    - Unit count per type
    - Average current rent
    - Average square feet
    - Average market rent

    Inserts/updates rows in tbl_multifamily_unit_type.

    Should be called after unit extraction/persistence completes.

    Returns:
        Dict with 'created', 'updated', and 'unit_types' counts
    """
    print("=== AGGREGATE_UNIT_TYPES CALLED ===")
    print(f"=== Project ID: {project_id} ===")
    logger.info(f"[aggregate_unit_types] Starting aggregation for project {project_id}")

    results = {
        'created': 0,
        'updated': 0,
        'unit_types': [],
        'errors': []
    }

    try:
        with connection.cursor() as cursor:
            # Get unit aggregates grouped by bedroom count
            cursor.execute("""
                SELECT
                    COALESCE(bedrooms, 0) as bedrooms,
                    COALESCE(bathrooms, 1) as bathrooms,
                    COUNT(*) as unit_count,
                    ROUND(AVG(NULLIF(current_rent, 0))::numeric, 2) as avg_current_rent,
                    ROUND(AVG(NULLIF(market_rent, 0))::numeric, 2) as avg_market_rent,
                    ROUND(AVG(NULLIF(square_feet, 0))::numeric, 0) as avg_square_feet
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
                GROUP BY COALESCE(bedrooms, 0), COALESCE(bathrooms, 1)
                ORDER BY bedrooms, bathrooms
            """, [project_id])

            aggregates = cursor.fetchall()

            if not aggregates:
                logger.warning(f"[aggregate_unit_types] No units found for project {project_id}")
                return results

            for row in aggregates:
                bedrooms, bathrooms, unit_count, avg_rent, avg_market_rent, avg_sf = row

                # Generate unit type code (e.g., "1BR/1BA", "2BR/2BA")
                br_int = int(bedrooms) if bedrooms else 0
                ba_int = int(bathrooms) if bathrooms else 1
                unit_type_code = f"{br_int}BR/{ba_int}BA"
                unit_type_name = f"{br_int} Bedroom / {ba_int} Bath"

                # Use avg_rent for market rent if market_rent not available
                market_rent_value = avg_market_rent if avg_market_rent else avg_rent or 0

                logger.info(f"[aggregate_unit_types] Processing {unit_type_code}: {unit_count} units, avg rent ${avg_rent}")

                # Check if unit type exists
                cursor.execute("""
                    SELECT unit_type_id
                    FROM landscape.tbl_multifamily_unit_type
                    WHERE project_id = %s AND unit_type_code = %s
                """, [project_id, unit_type_code])

                existing = cursor.fetchone()

                # Handle square feet - constraint requires > 0, use 1 as placeholder if unknown
                avg_sf_value = int(avg_sf) if avg_sf and avg_sf > 0 else 1

                if existing:
                    # Update existing
                    cursor.execute("""
                        UPDATE landscape.tbl_multifamily_unit_type
                        SET
                            bedrooms = %s,
                            bathrooms = %s,
                            total_units = %s,
                            unit_count = %s,
                            current_market_rent = %s,
                            market_rent = %s,
                            current_rent_avg = %s,
                            avg_square_feet = %s,
                            unit_type_name = %s,
                            updated_at = NOW()
                        WHERE project_id = %s AND unit_type_code = %s
                    """, [
                        br_int, ba_int, unit_count, unit_count,
                        market_rent_value, market_rent_value, avg_rent or 0,
                        avg_sf_value, unit_type_name,
                        project_id, unit_type_code
                    ])
                    results['updated'] += 1
                else:
                    # Insert new
                    cursor.execute("""
                        INSERT INTO landscape.tbl_multifamily_unit_type (
                            project_id, unit_type_code, unit_type_name,
                            bedrooms, bathrooms, total_units, unit_count,
                            current_market_rent, market_rent, current_rent_avg,
                            avg_square_feet, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                        )
                    """, [
                        project_id, unit_type_code, unit_type_name,
                        br_int, ba_int, unit_count, unit_count,
                        market_rent_value, market_rent_value, avg_rent or 0,
                        avg_sf_value
                    ])
                    results['created'] += 1

                results['unit_types'].append({
                    'unit_type_code': unit_type_code,
                    'bedrooms': br_int,
                    'bathrooms': ba_int,
                    'unit_count': unit_count,
                    'avg_rent': float(avg_rent) if avg_rent else 0
                })

        logger.info(f"[aggregate_unit_types] Completed: {results['created']} created, {results['updated']} updated")
        return results

    except Exception as e:
        logger.error(f"[aggregate_unit_types] Error: {e}")
        results['errors'].append(str(e))
        return results
