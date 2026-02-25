"""
Field Registry Service - Authoritative write contract for AI extraction.

The registries define:
- field_key: The conceptual input name
- db_target: The exact table.column to write to
- db_write_type: column | row_assumption | row_opex | row_allocation | row_budget | row_milestone
- selector_json: For row-based writes, the discriminator (category, type, key)
- extract_policy: propose_for_validation | user_only | auto_write
- scope: project | unit_type | lot_or_product | phase | parcel | lease
"""

import csv
import json
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


@dataclass
class FieldMapping:
    """Single field mapping from registry."""
    property_type: str
    field_key: str
    label: str
    field_type: str
    required: bool
    default: Optional[str]
    extractability: str  # high, medium, low
    extract_policy: str  # propose_for_validation, user_only, auto_write
    source_priority: str  # doc>user>benchmark, user>doc>benchmark, etc.
    scope: str  # project, unit_type, lot_or_product, phase, parcel, lease
    evidence_types: List[str]
    db_write_type: str  # column, row_assumption, row_opex, row_allocation, row_budget
    resolved: bool
    resolved_table: str
    resolved_column: str
    selector_json: Optional[Dict]
    db_target: str  # Full target: table.column
    field_role: str  # input, output
    analytical_tier_default: str  # critical, important, supporting, descriptive

    @property
    def is_row_based(self) -> bool:
        return self.db_write_type in ('row_assumption', 'row_opex', 'row_allocation', 'row_budget', 'row_milestone', 'upsert')

    @property
    def table_name(self) -> str:
        if '.' in self.db_target:
            return self.db_target.split('.')[0]
        return self.resolved_table

    @property
    def column_name(self) -> str:
        if '.' in self.db_target:
            return self.db_target.split('.')[1]
        return self.resolved_column


class FieldRegistry:
    """
    Loads and provides access to field registries.
    This is the authoritative contract for all extraction writes.
    """

    def __init__(self):
        self._mf_registry: Dict[str, FieldMapping] = {}
        self._landdev_registry: Dict[str, FieldMapping] = {}
        # Tier overrides: {(field_key, property_type): tier}
        self._tier_overrides: Dict[tuple, str] = {}
        self._loaded = False

    def load(self, mf_csv_path: str, landdev_csv_path: str, tier_overrides_path: Optional[str] = None):
        """Load registries from CSV files."""
        if os.path.exists(mf_csv_path):
            self._mf_registry = self._load_csv(mf_csv_path, 'multifamily')
            logger.info(f"Loaded {len(self._mf_registry)} multifamily field mappings")
        else:
            logger.warning(f"MF registry file not found: {mf_csv_path}")

        if os.path.exists(landdev_csv_path):
            self._landdev_registry = self._load_csv(landdev_csv_path, 'land_development')
            logger.info(f"Loaded {len(self._landdev_registry)} land development field mappings")
        else:
            logger.warning(f"LandDev registry file not found: {landdev_csv_path}")

        # Load tier overrides if provided
        if tier_overrides_path and os.path.exists(tier_overrides_path):
            self._tier_overrides = self._load_tier_overrides(tier_overrides_path)
            logger.info(f"Loaded {len(self._tier_overrides)} tier overrides")
        elif tier_overrides_path:
            logger.warning(f"Tier overrides file not found: {tier_overrides_path}")

        self._loaded = True

    def _load_csv(self, path: str, property_type: str) -> Dict[str, FieldMapping]:
        """Parse CSV into FieldMapping objects."""
        registry = {}

        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Skip comment lines
                field_key = row.get('field_key', '').strip()
                if not field_key or field_key.startswith('#'):
                    continue

                # Parse selector_json
                selector = None
                selector_str = row.get('selector_json', '').strip()
                if selector_str and selector_str != '':
                    try:
                        selector = json.loads(selector_str)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse selector_json for {field_key}: {e}")

                # Parse evidence_types (v4 uses pipe-separated, v3 uses comma)
                evidence_str = row.get('evidence_types', '')
                if '|' in evidence_str:
                    evidence = evidence_str.split('|')
                else:
                    evidence = evidence_str.split(',')
                evidence = [e.strip() for e in evidence if e.strip()]

                # Parse required - handle various formats (v4 doesn't have Required column)
                required_val = row.get('Required', row.get('required', '')).strip()
                is_required = required_val in ('✓', 'True', 'true', '1', 'yes', 'Yes')

                # Parse resolved - v4 doesn't have this, default to True if target_table exists
                resolved_val = row.get('resolved', '').strip()
                if resolved_val:
                    is_resolved = resolved_val.lower() in ('true', '1', 'yes')
                else:
                    # V4 format: resolved if target_table is provided
                    is_resolved = bool(row.get('target_table', '').strip())

                # Build db_target from target_table.target_column (v4 format)
                target_table = row.get('target_table', row.get('resolved_table', '')).strip()
                target_column = row.get('target_column', row.get('resolved_column', '')).strip()
                db_target = row.get('db_target', '')
                if not db_target and target_table and target_column:
                    db_target = f"{target_table}.{target_column}"

                # Get label (v4 uses 'label' lowercase, v3 uses 'Label')
                label = row.get('label', row.get('Label', field_key))

                # Get field_type (v4 uses 'data_type', v3 uses 'Type')
                field_type = row.get('data_type', row.get('Type', 'text'))

                # Get extract_policy (default based on data_type)
                extract_policy = row.get('extract_policy', 'validate')
                if extract_policy == 'validate':
                    extract_policy = 'propose_for_validation'
                elif extract_policy == 'auto':
                    extract_policy = 'auto_write'

                # Get field_role (v5 has 'field_role' column, default to 'input')
                field_role = row.get('field_role', 'input').strip() or 'input'

                # Get analytical_tier_default (v5 has 'analytical_tier_default' column)
                analytical_tier_default = row.get('analytical_tier_default', 'supporting').strip() or 'supporting'

                mapping = FieldMapping(
                    property_type=row.get('property_type', property_type),
                    field_key=field_key,
                    label=label,
                    field_type=field_type,
                    required=is_required,
                    default=row.get('Default', row.get('default')) if row.get('Default', row.get('default')) not in ('—', '', None) else None,
                    extractability=row.get('extractability', 'medium'),
                    extract_policy=extract_policy,
                    source_priority=row.get('source_priority', 'doc>user>benchmark'),
                    scope=row.get('scope', 'project'),
                    evidence_types=evidence,
                    db_write_type=row.get('db_write_type', 'update'),
                    resolved=is_resolved,
                    resolved_table=target_table,
                    resolved_column=target_column,
                    selector_json=selector,
                    db_target=db_target,
                    field_role=field_role,
                    analytical_tier_default=analytical_tier_default
                )

                registry[field_key] = mapping

        return registry

    def _load_tier_overrides(self, path: str) -> Dict[tuple, str]:
        """
        Load tier overrides from CSV.

        Returns:
            Dict mapping (field_key, property_type) -> analytical_tier
        """
        overrides = {}

        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                field_key = row.get('field_key', '').strip()
                # Skip comment lines and empty rows
                if not field_key or field_key.startswith('#'):
                    continue

                property_type = row.get('property_type', '').strip()
                tier = row.get('analytical_tier', '').strip()

                if field_key and property_type and tier:
                    overrides[(field_key, property_type)] = tier

        return overrides

    def get_analytical_tier(self, field_key: str, property_type: str) -> Optional[str]:
        """
        Get the analytical tier for a field, checking overrides first.

        Args:
            field_key: The field key to look up
            property_type: The property type (e.g., 'retail', 'office', 'multifamily_urban')

        Returns:
            The analytical tier ('critical', 'important', 'supporting', 'descriptive')
            or None if field not found
        """
        self._ensure_loaded()

        # Check for override first
        override_key = (field_key, property_type)
        if override_key in self._tier_overrides:
            return self._tier_overrides[override_key]

        # Fall back to default from field mapping
        # Try multifamily registry first (where most fields live)
        mapping = self._mf_registry.get(field_key)
        if mapping:
            return mapping.analytical_tier_default

        # Try land dev registry
        mapping = self._landdev_registry.get(field_key)
        if mapping:
            return mapping.analytical_tier_default

        return None

    def get_mapping(self, field_key: str, property_type: str = 'multifamily') -> Optional[FieldMapping]:
        """Get mapping for a specific field."""
        self._ensure_loaded()
        if property_type == 'multifamily':
            return self._mf_registry.get(field_key)
        elif property_type in ('land_development', 'land', 'landdev'):
            return self._landdev_registry.get(field_key)
        return None

    def resolve_field_key(
        self,
        field_key: Optional[str],
        property_type: str = 'multifamily',
        target_table: Optional[str] = None,
        target_field: Optional[str] = None,
    ) -> Optional[str]:
        """
        Resolve a field_key (possibly an alias, label, or None) to a canonical registry key.

        Resolution order:
          1. Direct key lookup
          2. Lowercased + underscored label match
          3. target_table + target_field reverse lookup
          4. Alias map from mapping_suggestion_service

        Returns the canonical field_key or None if unresolvable.
        """
        registry = self.get_all_mappings(property_type)

        # 1. Direct
        if field_key and field_key in registry:
            return field_key

        # 2. Normalize: lowercase, replace spaces/hyphens with underscores
        if field_key:
            normalized = field_key.strip().lower().replace(' ', '_').replace('-', '_')
            if normalized in registry:
                return normalized
            # Try matching by label
            for key, mapping in registry.items():
                if mapping.label and mapping.label.strip().lower().replace(' ', '_').replace('-', '_') == normalized:
                    return key

        # 3. Reverse lookup by target_table + target_field
        if target_table and target_field:
            for key, mapping in registry.items():
                if mapping.db_target:
                    # db_target format: "table.column"
                    parts = mapping.db_target.split('.')
                    if len(parts) == 2:
                        tbl, col = parts
                        if tbl == target_table and col == target_field:
                            return key

        # 4. Alias map from mapping suggestion service
        if field_key:
            try:
                from apps.landscaper.services.mapping_suggestion_service import _ALIAS_MAP
                normalized = field_key.strip().lower().replace(' ', '_').replace('-', '_')
                alias_key = _ALIAS_MAP.get(normalized)
                if alias_key and alias_key in registry:
                    return alias_key
            except ImportError:
                pass

        return None

    def get_all_mappings(self, property_type: str = 'multifamily') -> Dict[str, FieldMapping]:
        """Get all mappings for a property type."""
        self._ensure_loaded()
        if property_type == 'multifamily':
            return self._mf_registry
        elif property_type in ('land_development', 'land', 'landdev'):
            return self._landdev_registry
        return {}

    def get_extractable_fields(self, property_type: str = 'multifamily') -> List[FieldMapping]:
        """Get fields that can be extracted (not user_only, not output fields)."""
        mappings = self.get_all_mappings(property_type)
        return [
            m for m in mappings.values()
            if m.resolved and m.extract_policy != 'user_only' and m.field_role != 'output'
        ]

    def get_fields_by_scope(self, scope: str, property_type: str = 'multifamily', extractable_only: bool = True) -> List[FieldMapping]:
        """Get all fields for a specific scope (project, unit_type, etc.).

        Args:
            scope: Field scope (project, mf_property, opex, etc.)
            property_type: 'multifamily' or 'land_development'
            extractable_only: If True (default), exclude field_role='output' fields
                              which are calculated, not extracted from documents.
        """
        mappings = self.get_all_mappings(property_type)
        results = [m for m in mappings.values() if m.scope == scope and m.resolved]

        if extractable_only:
            # Filter out calculated/output fields - these should be computed, not extracted
            results = [m for m in results if m.field_role != 'output']

        return results

    def get_fields_by_table(self, table_name: str, property_type: str = 'multifamily') -> List[FieldMapping]:
        """Get all fields that write to a specific table."""
        mappings = self.get_all_mappings(property_type)
        return [m for m in mappings.values() if m.table_name == table_name and m.resolved]

    def get_fields_by_write_type(self, write_type: str, property_type: str = 'multifamily') -> List[FieldMapping]:
        """Get all fields with a specific write type."""
        mappings = self.get_all_mappings(property_type)
        return [m for m in mappings.values() if m.db_write_type == write_type and m.resolved]

    def get_fields_by_evidence_type(self, evidence_type: str, property_type: str = 'multifamily') -> List[FieldMapping]:
        """
        Get all fields that can be extracted from a given evidence type (document type).

        Args:
            evidence_type: Document type (e.g., 'offering_memorandum', 'rent_roll', 't12')
            property_type: 'multifamily' or 'land_development'

        Returns:
            List of FieldMapping objects whose evidence_types include this evidence_type
            (excludes output fields which are calculated, not extracted)
        """
        mappings = self.get_all_mappings(property_type)
        results = []
        for m in mappings.values():
            # Exclude output fields - they are calculated, not extracted from documents
            if m.resolved and m.extract_policy != 'user_only' and m.field_role != 'output':
                # Check if evidence_type is in the field's evidence_types list
                if evidence_type in m.evidence_types:
                    results.append(m)
        return results

    def get_fields_by_keys(self, field_keys: List[str], property_type: str = 'multifamily') -> List[FieldMapping]:
        """
        Get field mappings for a list of specific field keys.

        Args:
            field_keys: List of field_key values to retrieve
            property_type: 'multifamily' or 'land_development'

        Returns:
            List of FieldMapping objects (only those found and resolved)
        """
        mappings = self.get_all_mappings(property_type)
        results = []
        for key in field_keys:
            if key in mappings and mappings[key].resolved:
                results.append(mappings[key])
        return results

    def get_registry_map(self, property_type: str = 'multifamily') -> Dict[str, Dict[str, Any]]:
        """
        Get a dictionary map of all field registries for JSON serialization.

        Args:
            property_type: 'multifamily' or 'land_development'

        Returns:
            Dict with field_key as key and field attributes as values
        """
        mappings = self.get_all_mappings(property_type)
        result = {}
        for key, m in mappings.items():
            if m.resolved:
                result[key] = {
                    'field_key': m.field_key,
                    'label': m.label,
                    'field_type': m.field_type,
                    'required': m.required,
                    'default': m.default,
                    'extractability': m.extractability,
                    'extract_policy': m.extract_policy,
                    'scope': m.scope,
                    'evidence_types': m.evidence_types,
                    'db_write_type': m.db_write_type,
                    'db_target': m.db_target,
                    'table_name': m.table_name,
                    'column_name': m.column_name,
                    'selector_json': m.selector_json,
                }
        return result

    def get_extraction_fields_for_doc_type(
        self,
        doc_type: str,
        property_type: str = 'multifamily',
        high_extractability_only: bool = False
    ) -> List[FieldMapping]:
        """
        Get fields suitable for extraction from a document type.

        Args:
            doc_type: Document type (offering_memorandum, rent_roll, t12, etc.)
            property_type: Property type for registry lookup
            high_extractability_only: If True, only return fields with extractability='high'

        Returns:
            List of FieldMapping objects sorted by extractability (high first).
            Excludes output fields (field_role='output') which are calculated, not extracted.
        """
        # get_fields_by_evidence_type already filters out output fields
        fields = self.get_fields_by_evidence_type(doc_type, property_type)

        if high_extractability_only:
            fields = [f for f in fields if f.extractability == 'high']

        # Sort by extractability: high > medium > low
        priority = {'high': 0, 'medium': 1, 'low': 2}
        fields.sort(key=lambda f: priority.get(f.extractability, 3))

        return fields

    def _ensure_loaded(self):
        """Ensure registries are loaded."""
        if not self._loaded:
            self._load_default()

    def _load_default(self):
        """Load from default paths."""
        # Compute paths relative to this file
        # This file is at: backend/apps/knowledge/services/field_registry.py
        # We want: backend/data/
        # So we need to go up 4 levels from this file to backend/
        this_file = os.path.abspath(__file__)
        # backend/apps/knowledge/services/field_registry.py -> backend/
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(this_file))))

        mf_path = os.path.join(backend_dir, 'data', 'MF_Input_FieldRegistry_v5.csv')
        landdev_path = os.path.join(backend_dir, 'data', 'LandDev_Input_FieldRegistry_v3.csv')
        tier_overrides_path = os.path.join(backend_dir, 'data', 'MF_FieldTier_Overrides.csv')

        logger.info(f"Loading field registries from: {backend_dir}/data/")
        self.load(mf_path, landdev_path, tier_overrides_path)


# Singleton instance
_registry: Optional[FieldRegistry] = None


def get_registry() -> FieldRegistry:
    """Get or create the singleton registry instance."""
    global _registry
    if _registry is None:
        _registry = FieldRegistry()
    return _registry


def reset_registry():
    """Reset the singleton registry (useful for testing)."""
    global _registry
    _registry = None


# Convenience functions
def get_field_mapping(field_key: str, property_type: str = 'multifamily') -> Optional[FieldMapping]:
    """Get a specific field mapping."""
    return get_registry().get_mapping(field_key, property_type)


def get_extractable_fields(property_type: str = 'multifamily') -> List[FieldMapping]:
    """Get all extractable fields for a property type."""
    return get_registry().get_extractable_fields(property_type)


def get_fields_for_extraction_prompt(property_type: str = 'multifamily') -> str:
    """Generate a field list suitable for an extraction prompt."""
    fields = get_extractable_fields(property_type)
    lines = []
    for f in fields:
        req = "(required)" if f.required else "(optional)"
        lines.append(f"- {f.field_key}: {f.label} [{f.field_type}] {req}")
    return "\n".join(lines)


def merge_dynamic_fields(project_id: int, property_type: str = 'multifamily') -> Dict[str, FieldMapping]:
    """
    Merge static registry fields with project-specific dynamic columns.

    Queries DynamicColumnDefinition for active, accepted columns and converts
    them to FieldMapping objects so the extraction pipeline treats them
    identically to static registry fields.

    Args:
        project_id: The project to load dynamic columns for
        property_type: Property type for the static registry base

    Returns:
        Merged dict of {field_key: FieldMapping} with dynamic columns overlaid
    """
    from django.apps import apps

    # Start with a copy of the static registry
    static = dict(get_registry().get_all_mappings(property_type))

    # Data type mapping from DynamicColumnDefinition choices to registry types
    dtype_map = {
        'text': 'text',
        'number': 'number',
        'currency': 'currency',
        'percent': 'percent',
        'boolean': 'boolean',
        'date': 'date',
    }

    try:
        DynamicColumnDefinition = apps.get_model('dynamic', 'DynamicColumnDefinition')
        dyn_cols = DynamicColumnDefinition.objects.filter(
            project_id=project_id,
            is_active=True,
            is_proposed=False,
        )

        for dc in dyn_cols:
            field_key = f"dyn_{dc.column_key}"
            mapping = FieldMapping(
                property_type=property_type,
                field_key=field_key,
                label=dc.display_label,
                field_type=dtype_map.get(dc.data_type, 'text'),
                required=False,
                default=None,
                extractability='medium',
                extract_policy='propose_for_validation',
                source_priority='doc>user>benchmark',
                scope=dc.scope if hasattr(dc, 'scope') and dc.scope else 'project',
                evidence_types=[],
                db_write_type='dynamic',
                resolved=True,
                resolved_table='tbl_dynamic_column_value',
                resolved_column=dc.column_key,
                selector_json={'column_definition_id': dc.pk, 'table_name': dc.table_name},
                db_target=f'tbl_dynamic_column_value.{dc.column_key}',
                field_role='input',
                analytical_tier_default='supporting',
            )
            static[field_key] = mapping

        logger.info(
            f"Merged {dyn_cols.count()} dynamic columns for project {project_id} "
            f"into {len(static)} total fields"
        )
    except Exception as e:
        logger.warning(f"Failed to merge dynamic fields for project {project_id}: {e}")

    return static
