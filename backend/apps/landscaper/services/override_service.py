"""
Override Service — Red dot governance for calculated field overrides.

Manages the tbl_model_override table:
- Toggle override on: stores calculated + override value, creates mutation
- Toggle override off: reverts to calculated value, creates revert mutation
- List overrides: returns active overrides for a project
"""

import logging
from typing import Dict, Any, Optional, List

from django.db import connection

from apps.landscaper.models import ModelOverride
from apps.landscaper.services.mutation_service import MutationService

logger = logging.getLogger(__name__)


def toggle_override(
    project_id: int,
    field_key: str,
    override_value: str,
    calculated_value: Optional[str] = None,
    division_id: Optional[int] = None,
    unit_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create or reactivate an override for a calculated field.

    Returns dict with override_id and mutation proposal.
    """
    # Check for existing override on this field + scope
    existing = ModelOverride.objects.filter(
        project_id=project_id,
        field_key=field_key,
        division_id=division_id,
        unit_id=unit_id,
    ).first()

    if existing:
        # Reactivate or update existing override
        existing.calculated_value = calculated_value
        existing.override_value = override_value
        existing.is_active = True
        existing.toggled_by_id = user_id
        existing.save()
        override = existing
    else:
        # Create new override
        override = ModelOverride.objects.create(
            project_id=project_id,
            field_key=field_key,
            calculated_value=calculated_value,
            override_value=override_value,
            division_id=division_id,
            unit_id=unit_id,
            is_active=True,
            toggled_by_id=user_id,
        )

    # Create mutation proposal for the override
    proposal = MutationService.create_proposal(
        project_id=project_id,
        mutation_type='override_toggle',
        table_name='tbl_model_override',
        field_name=field_key,
        proposed_value=override_value,
        current_value=calculated_value,
        reason=f'User override of calculated field: {field_key}',
        record_id=str(override.override_id),
        source_type='override_toggle',
    )

    return {
        'override_id': override.override_id,
        'field_key': field_key,
        'is_active': True,
        'proposal': proposal,
    }


def revert_override(
    override_id: int,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Revert an override back to the calculated value.

    Sets is_active=False and creates a revert mutation.
    """
    try:
        override = ModelOverride.objects.get(override_id=override_id)
    except ModelOverride.DoesNotExist:
        return {'error': 'Override not found', 'override_id': override_id}

    override.is_active = False
    override.toggled_by_id = user_id
    override.save()

    # Create revert mutation
    proposal = MutationService.create_proposal(
        project_id=override.project_id,
        mutation_type='revert',
        table_name='tbl_model_override',
        field_name=override.field_key,
        proposed_value=override.calculated_value,
        current_value=override.override_value,
        reason=f'Reverted override on calculated field: {override.field_key}',
        record_id=str(override.override_id),
        source_type='revert',
    )

    return {
        'override_id': override.override_id,
        'field_key': override.field_key,
        'is_active': False,
        'proposal': proposal,
    }


def list_overrides(
    project_id: int,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    """Return overrides for a project."""
    qs = ModelOverride.objects.filter(project_id=project_id)
    if active_only:
        qs = qs.filter(is_active=True)

    return [
        {
            'overrideId': o.override_id,
            'fieldKey': o.field_key,
            'calculatedValue': o.calculated_value,
            'overrideValue': o.override_value,
            'isActive': o.is_active,
            'divisionId': o.division_id,
            'unitId': o.unit_id,
            'toggledAt': o.toggled_at.isoformat() if o.toggled_at else None,
            'toggledBy': o.toggled_by_id,
        }
        for o in qs
    ]


def get_override_field_keys(project_id: int) -> List[str]:
    """Return list of field_keys that have active overrides (for red dot UI)."""
    return list(
        ModelOverride.objects.filter(
            project_id=project_id,
            is_active=True,
        ).values_list('field_key', flat=True).distinct()
    )
