"""
Platform Knowledge tools for Landscaper.

Cross-project document search and discovery. These tools wrap the existing
knowledge_library_service search/facets backend so Landscaper can answer
questions like "find all the offering memos for multifamily in Texas" or
"which projects have rent rolls older than a year" from the chat panel —
particularly on the dedicated Platform Knowledge page where chat runs in
unassigned mode.

Both tools are universal — safe to fire from pre-project (unassigned) chat
or any project-scoped chat, since they operate over the cross-project
document library, not a single project's data.

Distinct from `query_platform_knowledge` (RAG semantic search over the
reference corpus + knowledge embeddings) — these tools do structured
metadata search over the user's actual uploaded documents.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


# Hard-cap to keep response payloads manageable in chat context.
_DEFAULT_LIMIT = 20
_MAX_LIMIT = 50


def _normalize_str_list(value: Any) -> List[str]:
    """Accept a single string, a list, or None and return a clean list."""
    if value is None:
        return []
    if isinstance(value, str):
        v = value.strip()
        return [v] if v else []
    if isinstance(value, (list, tuple)):
        out: List[str] = []
        for item in value:
            if isinstance(item, str):
                s = item.strip()
                if s:
                    out.append(s)
        return out
    return []


def _normalize_int_list(value: Any) -> List[int]:
    """Accept a single int/str, a list, or None and return a list of ints."""
    if value is None:
        return []
    if isinstance(value, (int, str)):
        try:
            return [int(value)]
        except (TypeError, ValueError):
            return []
    if isinstance(value, (list, tuple)):
        out: List[int] = []
        for item in value:
            try:
                out.append(int(item))
            except (TypeError, ValueError):
                continue
        return out
    return []


def _format_doc_summary(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Trim a search hit to the chat-relevant fields."""
    return {
        'doc_id': doc.get('doc_id'),
        'doc_name': doc.get('doc_name') or doc.get('original_filename'),
        'doc_type': doc.get('doc_type'),
        'project_id': doc.get('project_id'),
        'project_name': doc.get('project_name'),
        'property_type': doc.get('property_type'),
        'geography': doc.get('geography'),
        'format': doc.get('format'),
        'file_size_bytes': doc.get('file_size_bytes'),
        'modified_at': doc.get('modified_at') or doc.get('uploaded_at'),
    }


@register_tool('find_documents')
def find_documents_tool(
    tool_input: Optional[Dict[str, Any]] = None,
    project_id: Optional[int] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Search the cross-project document library by metadata + free-text query.

    Use this when the user asks about documents that span multiple projects,
    or wants to narrow by property type / geography / document type / format.
    For semantic / textbook-style questions about valuation methodology or
    real estate concepts, use `query_platform_knowledge` instead.

    Args:
        tool_input: {
            query: free-text query (optional — empty returns metadata
                browse without text matching)
            property_type: string or list — e.g. "MF", ["MF","OFF"]
            doc_type: string or list — e.g. "offering_memo", ["rent_roll"]
            format: string or list — file extensions, e.g. "pdf", ["xlsx","pdf"]
            geography: string or list of geo codes recognized by the library
            project_ids: int or list of project ids to scope the search
            source: "all" | "user" | "platform" (default "all")
            limit: int (default 20, max 50)
        }
        project_id: ignored — this tool spans projects by design.
        user_id: optional, reserved for future per-user scoping.

    Returns:
        {
            success: bool,
            results: [...],          # trimmed doc summaries
            count: int,              # number of results returned
            search_scope: { ... },   # which fallback level matched
        }
    """
    tool_input = tool_input or kwargs.get('tool_input', {}) or {}

    query = (tool_input.get('query') or '').strip()
    source = (tool_input.get('source') or 'all').lower()
    if source not in ('all', 'user', 'platform'):
        source = 'all'

    try:
        limit = int(tool_input.get('limit') or _DEFAULT_LIMIT)
    except (TypeError, ValueError):
        limit = _DEFAULT_LIMIT
    limit = max(1, min(limit, _MAX_LIMIT))

    filters = {
        'source': source,
        'geo': _normalize_str_list(tool_input.get('geography')),
        'property_type': _normalize_str_list(tool_input.get('property_type')),
        'format': _normalize_str_list(tool_input.get('format')),
        'doc_type': _normalize_str_list(tool_input.get('doc_type')),
        'project_id': _normalize_int_list(tool_input.get('project_ids')),
    }

    try:
        from apps.knowledge.services.knowledge_library_service import (
            search_documents,
        )

        result = search_documents(query=query, filters=filters, limit=limit)
        results = result.get('results') if isinstance(result, dict) else result
        if not isinstance(results, list):
            results = []

        trimmed = [_format_doc_summary(r) for r in results]
        return {
            'success': True,
            'results': trimmed,
            'count': len(trimmed),
            'search_scope': (result or {}).get('search_scope') if isinstance(result, dict) else None,
        }
    except Exception as e:
        logger.exception(f"find_documents_tool failed: {e}")
        return {
            'success': False,
            'error': f"Document search failed: {e}",
            'results': [],
            'count': 0,
        }


@register_tool('summarize_document_library')
def summarize_document_library_tool(
    tool_input: Optional[Dict[str, Any]] = None,
    project_id: Optional[int] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Return facet counts (geography, property type, doc type, format,
    project) for the cross-project document library.

    Use when the user wants a high-level view — "how many documents do I
    have," "which states do I have data on," "what's my doc-type breakdown."

    Args:
        tool_input: {
            source: "all" | "user" | "platform" (default "all")
            property_type: optional pre-filter (string or list)
            doc_type: optional pre-filter (string or list)
            format: optional pre-filter (string or list)
            geography: optional pre-filter (string or list)
            project_ids: optional pre-filter (int or list)
        }

    Returns:
        {
            success: bool,
            total_count: int,
            facets: {
                geography:    [{ value, count }, ...],
                property_type:[{ value, count }, ...],
                format:       [{ value, count }, ...],
                doc_type:     [{ value, count }, ...],
                project:      [{ value, count }, ...],
            }
        }
    """
    tool_input = tool_input or kwargs.get('tool_input', {}) or {}

    source = (tool_input.get('source') or 'all').lower()
    if source not in ('all', 'user', 'platform'):
        source = 'all'

    geo = _normalize_str_list(tool_input.get('geography'))
    property_type = _normalize_str_list(tool_input.get('property_type'))
    fmt = _normalize_str_list(tool_input.get('format'))
    doc_type = _normalize_str_list(tool_input.get('doc_type'))
    project_ids = _normalize_int_list(tool_input.get('project_ids'))

    try:
        from apps.knowledge.services.knowledge_library_service import (
            get_faceted_counts,
        )

        # The service expects strings for project_id pre-filters
        project_id_strs = [str(p) for p in project_ids]

        facets = get_faceted_counts(
            source=source,
            geo=geo,
            property_type=property_type,
            format_filter=fmt,
            doc_type=doc_type,
            project_ids=project_id_strs,
        )

        if not isinstance(facets, dict):
            facets = {}

        return {
            'success': True,
            'total_count': facets.get('total_count', 0),
            'facets': facets.get('facets', {}),
        }
    except Exception as e:
        logger.exception(f"summarize_document_library_tool failed: {e}")
        return {
            'success': False,
            'error': f"Library summary failed: {e}",
            'total_count': 0,
            'facets': {},
        }
