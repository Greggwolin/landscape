"""
Library-fetch resolution algorithm per Phase 1 design §5.

Resolves "what fires when user U asks for report R in project P?" by walking
the personal-default scopes in priority order and returning the canonical base
when nothing matches.

RP-CFRPT-2605 Phase 2.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

from ..models import (
    ReportDefinition,
    UserReportPersonalDefault,
    UserSavedReport,
)

logger = logging.getLogger(__name__)


@dataclass
class ResolvedReport:
    """The outcome of resolveReport() — canonical metadata + applied spec."""
    report_code: str
    report_name: str
    report_category: str
    data_readiness: str
    modification_spec: Dict[str, Any]
    source: str  # 'canonical' | 'global_personal' | 'project_personal' | 'entity_personal'
    personal_default_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'report_code': self.report_code,
            'report_name': self.report_name,
            'report_category': self.report_category,
            'data_readiness': self.data_readiness,
            'modification_spec': self.modification_spec,
            'source': self.source,
            'personal_default_id': self.personal_default_id,
        }


def resolve_report(
    user_id: int,
    report_code: str,
    project_id: Optional[int] = None,
    scope_hints: Optional[List[Dict[str, Any]]] = None,
) -> Optional[ResolvedReport]:
    """
    Walk personal-default scopes from most-specific (project) to least
    (global), returning the first match's modification_spec. Falls through
    to the canonical base if no personal default exists.

    Returns None if the canonical report doesn't exist or is inactive.

    Args:
        user_id: authenticated user id
        report_code: e.g. 'RPT_07'
        project_id: optional project context — enables project-scoped lookup
        scope_hints: optional list of {type, id} dicts for entity/master_lease
                     scope lookups (NNN forward-compat; empty at launch)
    """
    try:
        canonical = ReportDefinition.objects.get(report_code=report_code, is_active=True)
    except ReportDefinition.DoesNotExist:
        return None

    base = ResolvedReport(
        report_code=canonical.report_code,
        report_name=canonical.report_name,
        report_category=canonical.report_category,
        data_readiness=canonical.data_readiness,
        modification_spec={},
        source='canonical',
    )

    # 1. Project-scoped personal default
    if project_id is not None:
        row = (
            UserReportPersonalDefault.objects
            .filter(
                user_id=user_id,
                report_definition_id=report_code,
                scope_type='project',
                scope_id=int(project_id),
            )
            .only('id', 'modification_spec')
            .first()
        )
        if row is not None:
            return _attach(base, row, source='project_personal')

    # 2. Entity / master-lease scoped (NNN forward-compat — empty at launch)
    for hint in scope_hints or []:
        try:
            st = hint['type']
            sid = int(hint['id'])
        except (KeyError, TypeError, ValueError):
            continue
        if st not in ('entity', 'master_lease'):
            continue
        row = (
            UserReportPersonalDefault.objects
            .filter(
                user_id=user_id,
                report_definition_id=report_code,
                scope_type=st,
                scope_id=sid,
            )
            .only('id', 'modification_spec')
            .first()
        )
        if row is not None:
            return _attach(base, row, source='entity_personal')

    # 3. Global personal default (common case at launch)
    row = (
        UserReportPersonalDefault.objects
        .filter(
            user_id=user_id,
            report_definition_id=report_code,
            scope_type='global',
            scope_id__isnull=True,
        )
        .only('id', 'modification_spec')
        .first()
    )
    if row is not None:
        return _attach(base, row, source='global_personal')

    # 4. Canonical base
    return base


def _attach(base: ResolvedReport, row: UserReportPersonalDefault, source: str) -> ResolvedReport:
    base.modification_spec = row.modification_spec or {}
    base.source = source
    base.personal_default_id = row.id
    return base


def build_library_list(user_id: int, project_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Build the user's library state for /api/reports/library/.

    Returns {canonical_entries, saved_reports} where each canonical_entry
    has the resolution applied (so the toolbar knows whether a personal
    version exists).

    Saved reports are listed separately — they're not "modifications of a
    canonical", they're independent named entries addressed by uuid.
    """
    from .modification_spec import summarize_spec

    # Pre-fetch user's personal defaults so each canonical lookup is O(1)
    personal_defaults_by_code = {
        pd.report_definition_id: pd
        for pd in UserReportPersonalDefault.objects.filter(
            user_id=user_id, scope_type='global', scope_id__isnull=True,
        )
    }

    if project_id is not None:
        project_defaults_by_code = {
            pd.report_definition_id: pd
            for pd in UserReportPersonalDefault.objects.filter(
                user_id=user_id, scope_type='project', scope_id=int(project_id),
            )
        }
    else:
        project_defaults_by_code = {}

    canonicals = ReportDefinition.objects.filter(is_active=True).order_by('sort_order')

    canonical_entries: List[Dict[str, Any]] = []
    for c in canonicals:
        pd = project_defaults_by_code.get(c.report_code) or personal_defaults_by_code.get(c.report_code)
        is_modified = pd is not None
        canonical_entries.append({
            'report_code': c.report_code,
            'report_name': c.report_name,
            'report_category': c.report_category,
            'report_tier': c.report_tier,
            'property_types': c.property_types,
            'data_readiness': c.data_readiness,
            'description': c.description,
            'is_personal_modified': is_modified,
            'personal_default_id': pd.id if pd else None,
            'modification_spec_summary': summarize_spec(pd.modification_spec) if pd else '',
            'scope': pd.scope_type if pd else 'global',
        })

    saved_qs = UserSavedReport.objects.filter(
        user_id=user_id, is_archived=False,
    ).order_by('-updated_at')

    saved_reports = [
        {
            'uuid': str(s.uuid),
            'name': s.name,
            'description': s.description,
            'base_report_code': s.base_report_id,
            'base_report_name': (s.base_report.report_name if s.base_report_id else None),
            'scope': s.scope_type,
            'scope_id': s.scope_id,
            'updated_at': s.updated_at.isoformat() if s.updated_at else None,
            'last_used_at': s.last_used_at.isoformat() if s.last_used_at else None,
        }
        for s in saved_qs.select_related('base_report')
    ]

    return {
        'canonical_entries': canonical_entries,
        'saved_reports': saved_reports,
    }
