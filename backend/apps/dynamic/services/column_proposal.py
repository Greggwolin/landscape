"""
Column Proposal Service

Analyzes extra_data across units and proposes dynamic columns.
Used by Landscaper to detect unrecognized data fields.
"""

from typing import Optional
from decimal import Decimal
import re
from datetime import datetime

from django.db import transaction

from apps.dynamic.models import DynamicColumnDefinition, DynamicColumnValue
from apps.multifamily.models import MultifamilyUnit


def propose_columns_from_extra_data(
    project_id: int,
    document_id: Optional[int] = None,
    table_name: str = 'multifamily_unit',
    min_coverage_percent: float = 10.0
) -> list[DynamicColumnDefinition]:
    """
    Analyze extra_data across units and propose dynamic columns.

    Args:
        project_id: Project to analyze
        document_id: Optional document that triggered extraction
        table_name: Target table name for column definitions
        min_coverage_percent: Minimum percentage of rows that must have
                            the field before proposing (default 10%)

    Returns:
        List of proposed column definitions
    """
    units = MultifamilyUnit.objects.filter(
        project_id=project_id,
        extra_data__isnull=False
    ).exclude(extra_data={})

    total_units = MultifamilyUnit.objects.filter(project_id=project_id).count()
    if total_units == 0:
        return []

    # Collect all keys from extra_data with statistics
    all_keys: dict[str, dict] = {}
    for unit in units:
        if unit.extra_data:
            for key, value in unit.extra_data.items():
                if key not in all_keys:
                    all_keys[key] = {
                        'count': 0,
                        'sample_values': [],
                        'data_types': [],
                    }
                all_keys[key]['count'] += 1
                if len(all_keys[key]['sample_values']) < 5 and value is not None:
                    all_keys[key]['sample_values'].append(value)
                    all_keys[key]['data_types'].append(infer_data_type(value))

    proposed = []

    with transaction.atomic():
        for key, info in all_keys.items():
            # Skip if already exists (active or proposed)
            if DynamicColumnDefinition.objects.filter(
                project_id=project_id,
                table_name=table_name,
                column_key=key
            ).exists():
                continue

            # Only propose if meets minimum coverage
            coverage = (info['count'] / total_units) * 100
            if coverage < min_coverage_percent:
                continue

            # Determine best data type from samples
            data_type = consensus_data_type(info['data_types'])

            column_def = DynamicColumnDefinition.objects.create(
                project_id=project_id,
                table_name=table_name,
                column_key=key,
                display_label=key_to_label(key),
                data_type=data_type,
                source='landscaper',
                is_proposed=True,
                proposed_from_document_id=document_id
            )

            # Pre-populate values from extra_data
            for unit in units:
                if unit.extra_data and key in unit.extra_data:
                    value = unit.extra_data[key]
                    if value is not None:
                        value_fields = value_to_fields(value, data_type)
                        DynamicColumnValue.objects.create(
                            column_definition=column_def,
                            row_id=unit.unit_id,
                            **value_fields
                        )

            proposed.append(column_def)

    return proposed


def infer_data_type(value) -> str:
    """
    Infer data type from a sample value.

    Returns one of: text, number, currency, percent, boolean, date
    """
    if value is None:
        return 'text'

    if isinstance(value, bool):
        return 'boolean'

    if isinstance(value, (int, float, Decimal)):
        # Check if it looks like currency (typically larger values)
        if abs(value) >= 100 or (isinstance(value, float) and '.' in str(value)):
            return 'currency'
        return 'number'

    if isinstance(value, str):
        value_lower = value.lower().strip()

        # Check for boolean strings
        if value_lower in ('true', 'false', 'yes', 'no', 'y', 'n', '1', '0'):
            return 'boolean'

        # Check for percentage patterns
        if re.match(r'^-?\d+\.?\d*\s*%$', value):
            return 'percent'

        # Check for currency patterns
        if re.match(r'^\$?\d{1,3}(,\d{3})*(\.\d{2})?$', value):
            return 'currency'

        # Check for numeric values
        try:
            float(value.replace(',', '').replace('$', ''))
            return 'number'
        except (ValueError, TypeError):
            pass

        # Check for date patterns
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',  # ISO format
            r'^\d{1,2}/\d{1,2}/\d{2,4}$',  # US format
            r'^\d{1,2}-\d{1,2}-\d{2,4}$',  # Dash format
        ]
        for pattern in date_patterns:
            if re.match(pattern, value):
                return 'date'

    return 'text'


def consensus_data_type(types: list[str]) -> str:
    """
    Determine the consensus data type from a list of inferred types.

    Prioritizes: boolean > date > currency > percent > number > text
    """
    if not types:
        return 'text'

    # Count occurrences
    type_counts = {}
    for t in types:
        type_counts[t] = type_counts.get(t, 0) + 1

    # If all the same type, use it
    if len(type_counts) == 1:
        return types[0]

    # Priority order (higher priority wins if enough samples)
    priority = ['boolean', 'date', 'currency', 'percent', 'number', 'text']

    # Require majority for non-text types
    total = len(types)
    for dtype in priority:
        if dtype in type_counts and type_counts[dtype] > total / 2:
            return dtype

    # Default to the most common, falling back to text
    most_common = max(type_counts.items(), key=lambda x: x[1])
    return most_common[0]


def key_to_label(key: str) -> str:
    """
    Convert snake_case or camelCase key to Title Case label.

    Examples:
        'delinquent_rent' -> 'Delinquent Rent'
        'section8' -> 'Section 8'
        'move_in_date' -> 'Move In Date'
    """
    # Handle camelCase
    key = re.sub(r'([a-z])([A-Z])', r'\1 \2', key)
    # Handle snake_case
    key = key.replace('_', ' ')
    # Handle numbers attached to words
    key = re.sub(r'(\d+)', r' \1 ', key)
    # Clean up multiple spaces and trim
    key = ' '.join(key.split())
    return key.title()


def value_to_fields(value, data_type: str) -> dict:
    """
    Convert value to appropriate model field dict.

    Returns dict with value_text, value_number, value_boolean, value_date
    """
    fields = {
        'value_text': None,
        'value_number': None,
        'value_boolean': None,
        'value_date': None,
    }

    if value is None:
        return fields

    if data_type == 'boolean':
        if isinstance(value, bool):
            fields['value_boolean'] = value
        else:
            fields['value_boolean'] = str(value).lower().strip() in ('true', 'yes', 'y', '1')

    elif data_type in ('number', 'currency', 'percent'):
        try:
            # Clean up string values
            if isinstance(value, str):
                clean_value = value.replace('$', '').replace(',', '').replace('%', '').strip()
                fields['value_number'] = Decimal(clean_value)
            else:
                fields['value_number'] = Decimal(str(value))
        except (ValueError, TypeError):
            fields['value_text'] = str(value)

    elif data_type == 'date':
        if isinstance(value, datetime):
            fields['value_date'] = value.date()
        elif isinstance(value, str):
            # Try parsing common date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y']:
                try:
                    fields['value_date'] = datetime.strptime(value, fmt).date()
                    break
                except ValueError:
                    continue
            if fields['value_date'] is None:
                fields['value_text'] = value

    else:
        fields['value_text'] = str(value) if value else None

    return fields


def get_proposed_column_summary(project_id: int, table_name: str = 'multifamily_unit') -> dict:
    """
    Get summary of proposed columns for a project.

    Returns:
        {
            'proposed_count': int,
            'columns': [
                {
                    'id': int,
                    'column_key': str,
                    'display_label': str,
                    'data_type': str,
                    'value_count': int,
                    'sample_values': list
                }
            ]
        }
    """
    proposed = DynamicColumnDefinition.objects.filter(
        project_id=project_id,
        table_name=table_name,
        is_proposed=True
    )

    columns = []
    for col in proposed:
        values = DynamicColumnValue.objects.filter(column_definition=col)
        sample_values = []
        for v in values[:5]:
            val = v.value
            if isinstance(val, Decimal):
                val = float(val)
            sample_values.append(val)

        columns.append({
            'id': col.id,
            'column_key': col.column_key,
            'display_label': col.display_label,
            'data_type': col.data_type,
            'value_count': values.count(),
            'sample_values': sample_values,
        })

    return {
        'proposed_count': len(columns),
        'columns': columns,
    }
