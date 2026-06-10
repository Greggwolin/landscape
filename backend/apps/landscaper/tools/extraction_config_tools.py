"""
Extraction-config tools — read-only visibility into Landscaper's own
AI-extraction mapping configuration.

The Landscaper AI admin page (/w/landscaper-ai) manages rows in
landscape.tbl_extraction_mapping (ExtractionMapping model): per-doc-type
source patterns mapped to target table/field with data type, transform
rule, confidence level, and auto-write behavior. Until this tool existed,
that configuration was reachable only through the admin REST surface
(ExtractionMappingViewSet) — Landscaper itself could not see or explain
its own extraction rules (FB-303).

This tool is strictly read-only. Mapping create/update/delete stays on the
admin UI; there is intentionally no mutation counterpart here.

Session: LSCMD-FBBATCH-0609-vq (FB-303, decision 1a).
"""

import logging
from typing import Any, Dict

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)

# Hard cap on rows returned in one call — token economy. Callers narrow
# with document_type / target_table / search rather than paging.
_MAX_ROWS = 200


@register_tool('get_extraction_mappings', is_mutation=False)
def handle_get_extraction_mappings(
    tool_input: Dict[str, Any],
    project_id: int = None,
    **kwargs
) -> Dict[str, Any]:
    """Read-only view of the AI-extraction mapping configuration. FB-303."""
    from ..models import ExtractionMapping

    document_type = (tool_input.get('document_type') or '').strip()
    target_table = (tool_input.get('target_table') or '').strip()
    search = (tool_input.get('search') or '').strip()
    include_inactive = bool(tool_input.get('include_inactive', False))

    qs = ExtractionMapping.objects.all()
    if not include_inactive:
        qs = qs.filter(is_active=True)
    if document_type:
        qs = qs.filter(document_type__iexact=document_type)
    if target_table:
        qs = qs.filter(target_table__iexact=target_table)
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(source_pattern__icontains=search)
            | Q(target_field__icontains=search)
            | Q(target_table__icontains=search)
            | Q(notes__icontains=search)
        )

    total = qs.count()
    rows = list(
        qs.order_by('document_type', 'source_pattern')[:_MAX_ROWS].values(
            'mapping_id',
            'document_type',
            'source_pattern',
            'source_aliases',
            'target_table',
            'target_field',
            'data_type',
            'transform_rule',
            'confidence',
            'auto_write',
            'overwrite_existing',
            'applicable_tags',
            'is_active',
            'is_system',
            'notes',
        )
    )

    # Summary block so the model can answer "how is extraction configured?"
    # without enumerating every row.
    summary_qs = ExtractionMapping.objects.filter(is_active=True)
    by_doc_type: Dict[str, int] = {}
    auto_write_on = 0
    for dt, aw in summary_qs.values_list('document_type', 'auto_write'):
        by_doc_type[dt] = by_doc_type.get(dt, 0) + 1
        if aw:
            auto_write_on += 1
    active_total = sum(by_doc_type.values())

    return {
        'success': True,
        'mappings': rows,
        'returned': len(rows),
        'total_matching': total,
        'truncated': total > len(rows),
        'summary': {
            'active_mappings': active_total,
            'auto_write_enabled': auto_write_on,
            'by_document_type': by_doc_type,
        },
        'note': (
            'Read-only. Mapping changes are made on the Landscaper AI admin '
            'page, not through chat.'
        ),
    }
