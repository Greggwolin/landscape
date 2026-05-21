"""
Document-profile tools — the project's per-project profile (basket) list.

Profiles live in landscape.dms_project_doc_types, seeded at project creation
from landscape.dms_templates.doc_type_options. Each row maps a project to one
allowed profile name (Offering, Operations, Market Data, etc.). The set of
valid names for a project is resolved by get_valid_doc_types_for_project()
in apps.knowledge.services.document_classifier.

This file pairs with the profile-validation guard in
handle_update_document_profile (tool_executor.py): the guard refuses any
doc_type that isn't in the project's allowed list, and these tools provide
the explicit-consent path for adding a new profile (LSCMD-DOCPROF-FIX-0518-Zq,
closes FB-281 / FB-291).
"""

import logging
from typing import Any, Dict, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('list_project_profiles', is_mutation=False)
def handle_list_project_profiles(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Return the project's allowed document-profile (basket) list. Read-only."""
    from apps.knowledge.services.document_classifier import get_active_profiles_for_project
    profiles = get_active_profiles_for_project(project_id)
    return {'success': True, 'profiles': profiles, 'project_id': project_id}


@register_tool('add_project_profile', is_mutation=True)
def handle_add_project_profile(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add a new document profile (basket) to this project's allowed list. Explicit-consent gate."""
    profile_name = (tool_input.get('profile_name') or '').strip()
    if not profile_name:
        return {'success': False, 'error': 'profile_name is required'}

    if propose_only:
        from ..services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='add_project_profile',
            table_name='dms_project_doc_types',
            field_name='doc_type_name',
            proposed_value=profile_name,
            current_value=None,
            reason=f"Add new profile '{profile_name}' per explicit user request.",
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.dms_project_doc_types
                    (project_id, doc_type_name, display_order, is_from_template)
                VALUES (
                    %s, %s,
                    (SELECT COALESCE(MAX(display_order), 0) + 1
                     FROM landscape.dms_project_doc_types WHERE project_id = %s),
                    FALSE
                )
                ON CONFLICT (project_id, doc_type_name) DO NOTHING
                RETURNING id, doc_type_name
            """, [project_id, profile_name, project_id])
            row = cursor.fetchone()
            if row:
                return {
                    'success': True,
                    'profile_id': row[0],
                    'profile_name': row[1],
                    'added': True,
                }
            return {
                'success': True,
                'profile_name': profile_name,
                'added': False,
                'already_existed': True,
            }
    except Exception as e:
        logger.error(f"Error adding project profile: {e}")
        return {'success': False, 'error': str(e)}
