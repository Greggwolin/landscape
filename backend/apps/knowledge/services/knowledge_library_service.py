"""
Knowledge Library Service

Provides faceted search, progressive fallback search, and document management
for the Knowledge Library panel in the Landscaper admin.

Queries both core_doc (user-uploaded project documents) and
tbl_platform_knowledge (platform reference documents) to present a unified
library view.
"""

import logging
from django.db import connection

logger = logging.getLogger(__name__)

# Common FROM/JOIN clause used by core_doc facet queries
_BASE_FROM = """
    FROM core_doc d
    LEFT JOIN tbl_project p ON d.project_id = p.project_id
    LEFT JOIN doc_geo_tag gt ON d.doc_id = gt.doc_id
"""


# =====================================================
# Platform Knowledge helpers
# =====================================================

def _get_platform_knowledge_count():
    """Return the count of active platform knowledge documents."""
    with connection.cursor() as cursor:
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM tbl_platform_knowledge WHERE is_active = true"
            )
            return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Error counting platform knowledge: {e}", exc_info=True)
            return 0


def _get_platform_knowledge_format_counts():
    """Return format breakdown for platform knowledge documents."""
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT
                    CASE
                        WHEN file_path LIKE '%%.pdf' OR file_path LIKE '%%.pdf%%' THEN 'PDF'
                        WHEN file_path LIKE '%%.xlsx%%' OR file_path LIKE '%%.xls%%' THEN 'XLSX'
                        WHEN file_path LIKE '%%.docx%%' OR file_path LIKE '%%.doc%%' THEN 'DOCX'
                        WHEN file_path LIKE '%%.md%%' OR file_path LIKE '%%.md' THEN 'OTHER'
                        ELSE 'PDF'
                    END as fmt,
                    COUNT(*) as cnt
                FROM tbl_platform_knowledge
                WHERE is_active = true
                GROUP BY fmt
                ORDER BY cnt DESC
            """)
            return {row[0]: row[1] for row in cursor.fetchall()}
        except Exception:
            return {}


def _search_platform_knowledge(query='', limit=20):
    """
    Search platform knowledge documents and return results in the same
    shape as core_doc results, so the frontend can render them uniformly.

    Platform knowledge docs are identified by negative doc_id values
    (negated pk.id) and include a document_key field for chat routing.
    """
    with connection.cursor() as cursor:
        try:
            where = "pk.is_active = true"
            params = []

            if query and query.strip():
                where += " AND (pk.title ILIKE %s OR pk.description ILIKE %s)"
                term = f"%{query.strip()}%"
                params.extend([term, term])

            cursor.execute(f"""
                SELECT
                    pk.id,
                    pk.document_key,
                    pk.title,
                    pk.publisher,
                    pk.publication_year,
                    pk.knowledge_domain,
                    pk.property_types,
                    pk.file_path,
                    pk.file_size_bytes,
                    pk.created_at,
                    pk.updated_at,
                    pk.subtitle
                FROM tbl_platform_knowledge pk
                WHERE {where}
                ORDER BY pk.updated_at DESC NULLS LAST
                LIMIT %s
            """, params + [limit])

            results = []
            for row in cursor.fetchall():
                pk_id = row[0]
                file_path = row[7] or ''

                # Determine format from file_path extension
                fp_lower = file_path.lower()
                if '.pdf' in fp_lower:
                    fmt = 'PDF'
                elif '.xlsx' in fp_lower or '.xls' in fp_lower:
                    fmt = 'XLSX'
                elif '.docx' in fp_lower or '.doc' in fp_lower:
                    fmt = 'DOCX'
                elif '.md' in fp_lower:
                    fmt = 'OTHER'
                else:
                    fmt = 'PDF'  # Default — most PK docs are PDFs

                results.append({
                    'doc_id': -pk_id,                # Negative ID to distinguish from core_doc
                    'document_key': row[1],           # For chat endpoint routing
                    'name': row[2],                   # title
                    'project_id': None,
                    'project_name': 'Platform Knowledge',
                    'doc_type': 'Platform Knowledge',
                    'format': fmt,
                    'file_size_bytes': int(row[8]) if row[8] else None,
                    'uploaded_at': row[9].isoformat() if row[9] else None,
                    'modified_at': row[10].isoformat() if row[10] else None,
                    'relevance_score': 1.0,
                    'snippet': '',
                    'storage_uri': row[7],            # file_path is their storage URI
                    'knowledge_domain': row[5],
                    'publisher': row[3],
                    'publication_year': row[4],
                    'subtitle': row[11],
                })

            return results

        except Exception as e:
            logger.error(f"Error searching platform knowledge: {e}", exc_info=True)
            return []


# =====================================================
# Faceted Counts
# =====================================================

def get_faceted_counts(source='all', geo=None, property_type=None, format_filter=None,
                       doc_type=None, project_id=None):
    """
    Get faceted filter counts with cascading AND/OR logic.

    - OR logic within a dimension (e.g., geo=["Arizona", "California"] means AZ OR CA)
    - AND logic across dimensions (e.g., geo=["Arizona"] AND property_type=["Multifamily"])
    - Platform Knowledge docs from tbl_platform_knowledge are included when source is 'all' or 'platform'
    """
    geo = geo or []
    property_type = property_type or []
    format_filter = format_filter or []
    doc_type = doc_type or []
    project_id = project_id or []

    base_where = "d.deleted_at IS NULL"
    include_platform = source in ('all', 'platform')
    include_core = source in ('all', 'user')

    with connection.cursor() as cursor:
        try:
            # ── Total count ──
            core_count = 0
            if include_core:
                total_where_clean = _build_where(base_where, source, geo, property_type,
                                                  format_filter, doc_type, project_id,
                                                  exclude=None)
                cursor.execute(f"""
                    SELECT COUNT(DISTINCT d.doc_id)
                    {_BASE_FROM}
                    WHERE {total_where_clean[0]}
                """, total_where_clean[1])
                core_count = cursor.fetchone()[0]

            pk_count = 0
            if include_platform:
                # Platform Knowledge doesn't participate in geo/property_type/project filters
                # but doc_type filter can exclude it if 'Platform Knowledge' is not selected
                if doc_type and 'Platform Knowledge' not in doc_type:
                    pk_count = 0
                else:
                    pk_count = _get_platform_knowledge_count()

            total_count = core_count + pk_count

            # ── Geography facet (core_doc only — PK has no geo tags) ──
            geography = []
            if include_core:
                geo_facet_where = _build_where(base_where, source, geo, property_type,
                                                format_filter, doc_type, project_id,
                                                exclude='geo')
                cursor.execute(f"""
                    SELECT gt2.geo_value, gt2.geo_level, COUNT(DISTINCT d.doc_id) as cnt
                    {_BASE_FROM}
                    JOIN doc_geo_tag gt2 ON d.doc_id = gt2.doc_id
                    WHERE {geo_facet_where[0]}
                    GROUP BY gt2.geo_value, gt2.geo_level
                    ORDER BY cnt DESC
                """, geo_facet_where[1])
                geography = [{'value': row[0], 'level': row[1], 'count': row[2]}
                             for row in cursor.fetchall()]

            # ── Property type facet (core_doc only) ──
            property_types = []
            if include_core:
                pt_facet_where = _build_where(base_where, source, geo, property_type,
                                               format_filter, doc_type, project_id,
                                               exclude='property_type')
                cursor.execute(f"""
                    SELECT p2.project_type_code, COUNT(DISTINCT d.doc_id) as cnt
                    {_BASE_FROM}
                    JOIN tbl_project p2 ON d.project_id = p2.project_id
                    WHERE {pt_facet_where[0]}
                    AND p2.project_type_code IS NOT NULL
                    GROUP BY p2.project_type_code
                    ORDER BY cnt DESC
                """, pt_facet_where[1])
                property_types = [{'value': row[0], 'count': row[1]}
                                  for row in cursor.fetchall()]

            # ── Format facet ──
            formats = []
            if include_core:
                fmt_facet_where = _build_where(base_where, source, geo, property_type,
                                                format_filter, doc_type, project_id,
                                                exclude='format')
                cursor.execute(f"""
                    SELECT
                        CASE
                            WHEN d.mime_type LIKE '%%pdf%%' THEN 'PDF'
                            WHEN d.mime_type LIKE '%%sheet%%' OR d.mime_type LIKE '%%excel%%' THEN 'XLSX'
                            WHEN d.mime_type LIKE '%%word%%' OR d.mime_type LIKE '%%document%%' THEN 'DOCX'
                            WHEN d.mime_type LIKE '%%image%%' THEN 'IMAGE'
                            WHEN d.mime_type LIKE '%%csv%%' THEN 'CSV'
                            ELSE 'OTHER'
                        END as fmt,
                        COUNT(DISTINCT d.doc_id) as cnt
                    {_BASE_FROM}
                    WHERE {fmt_facet_where[0]}
                    GROUP BY fmt
                    ORDER BY cnt DESC
                """, fmt_facet_where[1])
                formats = [{'value': row[0], 'count': row[1]}
                           for row in cursor.fetchall()]

            # Merge platform knowledge format counts into formats
            if include_platform and (not doc_type or 'Platform Knowledge' in doc_type):
                pk_fmt_counts = _get_platform_knowledge_format_counts()
                for pk_fmt, pk_cnt in pk_fmt_counts.items():
                    found = False
                    for f in formats:
                        if f['value'] == pk_fmt:
                            f['count'] += pk_cnt
                            found = True
                            break
                    if not found:
                        formats.append({'value': pk_fmt, 'count': pk_cnt})
                # Re-sort by count desc
                formats.sort(key=lambda x: x['count'], reverse=True)

            # ── Doc type facet ──
            doc_types = []
            if include_core:
                dt_facet_where = _build_where(base_where, source, geo, property_type,
                                               format_filter, doc_type, project_id,
                                               exclude='doc_type')
                cursor.execute(f"""
                    SELECT COALESCE(d.doc_type, 'Uncategorized') as dtype, COUNT(DISTINCT d.doc_id) as cnt
                    {_BASE_FROM}
                    WHERE {dt_facet_where[0]}
                    GROUP BY dtype
                    ORDER BY cnt DESC
                """, dt_facet_where[1])
                doc_types = [{'value': row[0], 'count': row[1]}
                             for row in cursor.fetchall()]

            # Add Platform Knowledge as a doc_type facet entry
            if include_platform:
                pk_dt_count = _get_platform_knowledge_count()
                if pk_dt_count > 0:
                    doc_types.append({'value': 'Platform Knowledge', 'count': pk_dt_count})
                    doc_types.sort(key=lambda x: x['count'], reverse=True)

            # ── Project facet (core_doc only — PK has no project) ──
            projects = []
            if include_core:
                proj_facet_where = _build_where(base_where, source, geo, property_type,
                                                 format_filter, doc_type, project_id,
                                                 exclude='project')
                cursor.execute(f"""
                    SELECT p2.project_id, p2.project_name, COUNT(DISTINCT d.doc_id) as cnt
                    {_BASE_FROM}
                    JOIN tbl_project p2 ON d.project_id = p2.project_id
                    WHERE {proj_facet_where[0]}
                    GROUP BY p2.project_id, p2.project_name
                    ORDER BY cnt DESC
                """, proj_facet_where[1])
                projects = [{'id': row[0], 'name': row[1], 'count': row[2]}
                            for row in cursor.fetchall()]

            return {
                'total_count': total_count,
                'facets': {
                    'geography': geography,
                    'property_type': property_types,
                    'format': formats,
                    'doc_type': doc_types,
                    'project': projects,
                }
            }

        except Exception as e:
            logger.error(f"Error fetching faceted counts: {e}", exc_info=True)
            return {
                'total_count': 0,
                'facets': {
                    'geography': [],
                    'property_type': [],
                    'format': [],
                    'doc_type': [],
                    'project': [],
                }
            }


# =====================================================
# WHERE clause builder (core_doc only)
# =====================================================

def _build_where(base_where, source, geo, property_type, format_filter,
                  doc_type, project_id, exclude=None):
    """
    Build a WHERE clause and params list for core_doc queries,
    excluding one dimension for cross-filter counting.
    Returns (where_str, params_list).
    """
    conditions = [base_where]
    params = []

    # Source filtering — for core_doc, 'user' = has project, 'platform' = no project
    # When source='platform', core_doc queries should return 0 rows
    if source == 'user':
        conditions.append("d.project_id IS NOT NULL")
    elif source == 'platform':
        # core_doc has no platform-only docs (those are in tbl_platform_knowledge)
        # Return impossible condition so core_doc query returns 0
        conditions.append("1 = 0")

    if exclude != 'geo' and geo:
        placeholders = ', '.join(['%s'] * len(geo))
        conditions.append(f"gt.geo_value IN ({placeholders})")
        params.extend(geo)

    if exclude != 'property_type' and property_type:
        placeholders = ', '.join(['%s'] * len(property_type))
        conditions.append(f"p.project_type_code IN ({placeholders})")
        params.extend(property_type)

    if exclude != 'format' and format_filter:
        placeholders = ', '.join(['%s'] * len(format_filter))
        fmt_case = ("CASE "
                    "WHEN d.mime_type LIKE '%%pdf%%' THEN 'PDF' "
                    "WHEN d.mime_type LIKE '%%sheet%%' OR d.mime_type LIKE '%%excel%%' THEN 'XLSX' "
                    "WHEN d.mime_type LIKE '%%word%%' OR d.mime_type LIKE '%%document%%' THEN 'DOCX' "
                    "WHEN d.mime_type LIKE '%%image%%' THEN 'IMAGE' "
                    "WHEN d.mime_type LIKE '%%csv%%' THEN 'CSV' "
                    "ELSE 'OTHER' END")
        conditions.append(f"({fmt_case}) IN ({placeholders})")
        params.extend([f.upper() for f in format_filter])

    if exclude != 'doc_type' and doc_type:
        # Filter out 'Platform Knowledge' from core_doc doc_type filtering
        # (Platform Knowledge is handled separately via tbl_platform_knowledge)
        core_doc_types = [dt for dt in doc_type if dt != 'Platform Knowledge']
        if core_doc_types:
            placeholders = ', '.join(['%s'] * len(core_doc_types))
            conditions.append(f"COALESCE(d.doc_type, 'Uncategorized') IN ({placeholders})")
            params.extend(core_doc_types)
        elif doc_type and 'Platform Knowledge' in doc_type and len(doc_type) == 1:
            # Only 'Platform Knowledge' selected — no core_doc results
            conditions.append("1 = 0")

    if exclude != 'project' and project_id:
        placeholders = ', '.join(['%s'] * len(project_id))
        conditions.append(f"d.project_id IN ({placeholders})")
        params.extend([int(pid) for pid in project_id])

    return (' AND '.join(conditions), params)


# =====================================================
# Document Search
# =====================================================

def search_documents(query, filters=None, fallback_level=0, limit=20):
    """
    Search documents with progressive fallback.
    Includes both core_doc and tbl_platform_knowledge results.

    Levels:
    0 - All active filters
    1 - Drop most specific geography
    2 - Drop format filter
    3 - Drop document type filter
    4 - Drop property type filter
    5 - Full library scan
    """
    filters = filters or {}
    source = filters.get('source', 'all')
    geo = list(filters.get('geo', []))
    property_type = list(filters.get('property_type', []))
    format_filter = list(filters.get('format', []))
    doc_type = list(filters.get('doc_type', []))
    project_ids = list(filters.get('project_id', []))

    include_platform = source in ('all', 'platform')
    include_core = source in ('all', 'user')

    # Progressive fallback levels
    for level in range(fallback_level, 6):
        current_geo = geo if level < 1 else []
        current_format = format_filter if level < 2 else []
        current_doc_type = doc_type if level < 3 else []
        current_property_type = property_type if level < 4 else []
        current_project_ids = project_ids if level < 5 else []

        # Fetch core_doc results
        core_results = []
        if include_core:
            core_results = _execute_search(
                query, source, current_geo, current_property_type,
                current_format, current_doc_type, current_project_ids, limit
            )

        # Fetch platform knowledge results
        pk_results = []
        if include_platform:
            # Platform Knowledge doesn't participate in geo/property_type/project filters
            # but doc_type filter can exclude it
            if current_doc_type and 'Platform Knowledge' not in current_doc_type:
                pk_results = []
            else:
                pk_results = _search_platform_knowledge(query, limit)

        # Merge and sort by modified_at descending
        all_results = core_results + pk_results
        all_results.sort(
            key=lambda r: r.get('modified_at') or r.get('uploaded_at') or '',
            reverse=True
        )

        # Trim to limit
        all_results = all_results[:limit]

        if all_results:
            # Describe the scope
            scope_parts = []
            if current_geo:
                scope_parts.append(' + '.join(current_geo))
            if current_property_type:
                scope_parts.append(' + '.join(current_property_type))
            if current_format:
                scope_parts.append(' + '.join(current_format))
            if current_doc_type:
                scope_parts.append(' + '.join(current_doc_type))

            description = ' | '.join(scope_parts) if scope_parts else 'Full library'
            description += f" ({len(all_results)} docs)"

            return {
                'results': all_results,
                'search_scope': {
                    'level': level,
                    'description': description,
                    'found': True,
                }
            }

    return {
        'results': [],
        'search_scope': {
            'level': 5,
            'description': 'Full library — no results found',
            'found': False,
        }
    }


def _execute_search(query, source, geo, property_type, format_filter,
                     doc_type, project_ids, limit=20):
    """Execute a core_doc search with the given filters and query."""
    with connection.cursor() as cursor:
        base_where = "d.deleted_at IS NULL"

        where_clause, params = _build_where(
            base_where, source, geo, property_type,
            format_filter, doc_type, project_ids, exclude=None
        )

        # Add text search if query is provided
        if query and query.strip():
            where_clause += " AND (d.doc_name ILIKE %s OR dt.extracted_text ILIKE %s)"
            search_term = f"%{query.strip()}%"
            params.extend([search_term, search_term])

        sql = f"""
            SELECT DISTINCT
                d.doc_id,
                d.doc_name,
                d.project_id,
                p.project_name,
                d.doc_type,
                d.mime_type,
                d.file_size_bytes,
                d.created_at,
                d.updated_at,
                d.storage_uri
            {_BASE_FROM}
            LEFT JOIN core_doc_text dt ON d.doc_id = dt.doc_id
            WHERE {where_clause}
            ORDER BY d.updated_at DESC
            LIMIT %s
        """
        params.append(limit)

        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                mime = row[5] or ''
                fmt = 'PDF' if 'pdf' in mime else \
                      'XLSX' if ('sheet' in mime or 'excel' in mime) else \
                      'DOCX' if ('word' in mime or 'document' in mime) else \
                      'IMAGE' if 'image' in mime else \
                      'CSV' if 'csv' in mime else 'OTHER'

                results.append({
                    'doc_id': row[0],
                    'name': row[1],
                    'project_id': row[2],
                    'project_name': row[3],
                    'doc_type': row[4] or 'Uncategorized',
                    'format': fmt,
                    'file_size_bytes': row[6],
                    'uploaded_at': row[7].isoformat() if row[7] else None,
                    'modified_at': row[8].isoformat() if row[8] else None,
                    'relevance_score': 1.0,
                    'snippet': '',
                    'storage_uri': row[9],
                })

            return results

        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            return []
