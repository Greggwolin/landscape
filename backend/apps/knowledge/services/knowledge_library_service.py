"""
Knowledge Library Service

Provides faceted search, progressive fallback search, and document management
for the Knowledge Library panel in the Landscaper admin.

Note: tbl_platform_knowledge is a separate entity (books/publications) with no
FK to core_doc. The 'platform' source filter uses project_id IS NULL to identify
non-project documents. Future: bridge table linking platform knowledge to core_doc.
"""

import logging
from django.db import connection

logger = logging.getLogger(__name__)

# Common FROM/JOIN clause used by all facet queries
_BASE_FROM = """
    FROM core_doc d
    LEFT JOIN tbl_project p ON d.project_id = p.project_id
    LEFT JOIN doc_geo_tag gt ON d.doc_id = gt.doc_id
"""


def get_faceted_counts(source='all', geo=None, property_type=None, format_filter=None,
                       doc_type=None, project_id=None):
    """
    Get faceted filter counts with cascading AND/OR logic.

    - OR logic within a dimension (e.g., geo=["Arizona", "California"] means AZ OR CA)
    - AND logic across dimensions (e.g., geo=["Arizona"] AND property_type=["Multifamily"])
    """
    geo = geo or []
    property_type = property_type or []
    format_filter = format_filter or []
    doc_type = doc_type or []
    project_id = project_id or []

    base_where = "d.deleted_at IS NULL"

    with connection.cursor() as cursor:
        try:
            # Total count
            total_where_clean = _build_where(base_where, source, geo, property_type,
                                              format_filter, doc_type, project_id,
                                              exclude=None)
            cursor.execute(f"""
                SELECT COUNT(DISTINCT d.doc_id)
                {_BASE_FROM}
                WHERE {total_where_clean[0]}
            """, total_where_clean[1])
            total_count = cursor.fetchone()[0]

            # Geography facet
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

            # Property type facet
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

            # Format facet
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

            # Doc type facet
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

            # Project facet
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


def _build_where(base_where, source, geo, property_type, format_filter,
                  doc_type, project_id, exclude=None):
    """
    Build a WHERE clause and params list, excluding one dimension for cross-filter counting.
    Returns (where_str, params_list).
    """
    conditions = [base_where]
    params = []

    # Source filtering — user docs have project_id, platform docs don't
    if source == 'user':
        conditions.append("d.project_id IS NOT NULL")
    elif source == 'platform':
        conditions.append("d.project_id IS NULL")

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
        placeholders = ', '.join(['%s'] * len(doc_type))
        conditions.append(f"COALESCE(d.doc_type, 'Uncategorized') IN ({placeholders})")
        params.extend(doc_type)

    if exclude != 'project' and project_id:
        placeholders = ', '.join(['%s'] * len(project_id))
        conditions.append(f"d.project_id IN ({placeholders})")
        params.extend([int(pid) for pid in project_id])

    return (' AND '.join(conditions), params)


def search_documents(query, filters=None, fallback_level=0, limit=20):
    """
    Search documents with progressive fallback.

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

    # Progressive fallback levels
    for level in range(fallback_level, 6):
        current_geo = geo if level < 1 else []
        current_format = format_filter if level < 2 else []
        current_doc_type = doc_type if level < 3 else []
        current_property_type = property_type if level < 4 else []
        current_project_ids = project_ids if level < 5 else []

        results = _execute_search(
            query, source, current_geo, current_property_type,
            current_format, current_doc_type, current_project_ids, limit
        )

        if results:
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
            description += f" ({len(results)} docs)"

            return {
                'results': results,
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
    """Execute a document search with the given filters and query."""
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
                p.project_name,
                d.doc_type,
                d.mime_type,
                d.file_size_bytes,
                d.created_at,
                d.updated_at
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
                mime = row[4] or ''
                fmt = 'PDF' if 'pdf' in mime else \
                      'XLSX' if ('sheet' in mime or 'excel' in mime) else \
                      'DOCX' if ('word' in mime or 'document' in mime) else \
                      'IMAGE' if 'image' in mime else \
                      'CSV' if 'csv' in mime else 'OTHER'

                results.append({
                    'doc_id': row[0],
                    'name': row[1],
                    'project_name': row[2],
                    'doc_type': row[3] or 'Uncategorized',
                    'format': fmt,
                    'file_size_bytes': row[5],
                    'uploaded_at': row[6].isoformat() if row[6] else None,
                    'modified_at': row[7].isoformat() if row[7] else None,
                    'relevance_score': 1.0,
                    'snippet': '',
                })

            return results

        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            return []
