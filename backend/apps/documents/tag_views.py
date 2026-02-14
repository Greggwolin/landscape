"""API views for document tag management and project doc type overrides."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def tag_list(request):
    """
    GET /api/dms/tags/?workspace_id=X  — List all tags for workspace with usage counts
    POST /api/dms/tags/                — Create new tag
    """
    if request.method == 'GET':
        workspace_id = request.query_params.get('workspace_id')
        if not workspace_id:
            return Response({'error': 'workspace_id is required'}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT tag_id, tag_name, usage_count, created_at
                FROM landscape.dms_doc_tags
                WHERE workspace_id = %s
                ORDER BY usage_count DESC, tag_name ASC
            """, [int(workspace_id)])
            columns = [col[0] for col in cursor.description]
            tags = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response({'success': True, 'tags': tags})

    # POST: create new tag
    tag_name = request.data.get('tag_name', '').strip()
    workspace_id = request.data.get('workspace_id')

    if not tag_name:
        return Response({'error': 'tag_name is required'}, status=400)
    if not workspace_id:
        return Response({'error': 'workspace_id is required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.dms_doc_tags (tag_name, workspace_id, usage_count)
            VALUES (%s, %s, 0)
            ON CONFLICT (tag_name, workspace_id) DO NOTHING
            RETURNING tag_id, tag_name, workspace_id, usage_count
        """, [tag_name, int(workspace_id)])
        row = cursor.fetchone()

        if row:
            return Response({
                'success': True,
                'tag': {
                    'tag_id': row[0],
                    'tag_name': row[1],
                    'workspace_id': row[2],
                    'usage_count': row[3],
                },
            }, status=201)
        else:
            # Already exists
            cursor.execute("""
                SELECT tag_id, tag_name, workspace_id, usage_count
                FROM landscape.dms_doc_tags
                WHERE tag_name = %s AND workspace_id = %s
            """, [tag_name, int(workspace_id)])
            existing = cursor.fetchone()
            return Response({
                'success': True,
                'tag': {
                    'tag_id': existing[0],
                    'tag_name': existing[1],
                    'workspace_id': existing[2],
                    'usage_count': existing[3],
                },
                'existing': True,
            })


@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def tag_detail(request, tag_id):
    """
    PUT /api/dms/tags/{tag_id}/    — Rename tag globally
    DELETE /api/dms/tags/{tag_id}/ — Delete tag (removes all assignments)
    """
    if request.method == 'PUT':
        new_name = request.data.get('tag_name', '').strip()
        if not new_name:
            return Response({'error': 'tag_name is required'}, status=400)

        with connection.cursor() as cursor:
            # Count affected documents
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.dms_doc_tag_assignments WHERE tag_id = %s
            """, [tag_id])
            affected_count = cursor.fetchone()[0]

            cursor.execute("""
                UPDATE landscape.dms_doc_tags
                SET tag_name = %s, updated_at = NOW()
                WHERE tag_id = %s
                RETURNING tag_id, tag_name, usage_count
            """, [new_name, tag_id])
            row = cursor.fetchone()

            if not row:
                return Response({'error': 'Tag not found'}, status=404)

            return Response({
                'success': True,
                'tag': {
                    'tag_id': row[0],
                    'tag_name': row[1],
                    'usage_count': row[2],
                },
                'documents_affected': affected_count,
            })

    # DELETE
    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.dms_doc_tags WHERE tag_id = %s RETURNING tag_name
        """, [tag_id])
        row = cursor.fetchone()

        if not row:
            return Response({'error': 'Tag not found'}, status=404)

        return Response({
            'success': True,
            'deleted_tag': row[0],
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def tag_suggest(request):
    """
    GET /api/dms/tags/suggest/?q=appr&workspace_id=X
    Returns matching tags with fuzzy matching and duplicate detection.
    """
    query = request.query_params.get('q', '').strip()
    workspace_id = request.query_params.get('workspace_id')
    project_id = request.query_params.get('project_id')
    limit = int(request.query_params.get('limit', '10'))

    if not query:
        return Response({'success': True, 'suggestions': [], 'fuzzy_matches': []})

    suggestions = []
    fuzzy_matches = []

    with connection.cursor() as cursor:
        # Exact prefix matches from dms_doc_tags
        if workspace_id:
            cursor.execute("""
                SELECT tag_id, tag_name, usage_count
                FROM landscape.dms_doc_tags
                WHERE workspace_id = %s AND tag_name ILIKE %s
                ORDER BY usage_count DESC, tag_name ASC
                LIMIT %s
            """, [int(workspace_id), f'{query}%', limit])
        elif project_id:
            # Fall back to profile_json-based tag search
            cursor.execute("""
                SELECT tag_name, COUNT(*)::int AS usage_count
                FROM landscape.core_doc
                CROSS JOIN LATERAL jsonb_array_elements_text(profile_json->'tags') AS tag_name
                WHERE project_id = %s
                  AND (profile_json ? 'tags')
                  AND tag_name ILIKE %s
                GROUP BY tag_name
                ORDER BY usage_count DESC, tag_name ASC
                LIMIT %s
            """, [int(project_id), f'{query}%', limit])
        else:
            return Response({'error': 'workspace_id or project_id is required'}, status=400)

        columns = [col[0] for col in cursor.description]
        suggestions = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Fuzzy matching using trigram similarity (if pg_trgm is available)
        try:
            if workspace_id:
                cursor.execute("""
                    SELECT tag_id, tag_name, usage_count,
                           similarity(tag_name, %s) AS sim
                    FROM landscape.dms_doc_tags
                    WHERE workspace_id = %s
                      AND tag_name NOT ILIKE %s
                      AND similarity(tag_name, %s) > 0.3
                    ORDER BY sim DESC
                    LIMIT 5
                """, [query, int(workspace_id), f'{query}%', query])
                columns = [col[0] for col in cursor.description]
                fuzzy_matches = [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception:
            # pg_trgm extension may not be installed — fall back to Levenshtein-like
            pass

    return Response({
        'success': True,
        'suggestions': suggestions,
        'fuzzy_matches': fuzzy_matches,
    })


@api_view(['POST', 'DELETE'])
@permission_classes([AllowAny])
def document_tags(request, doc_id, tag_id=None):
    """
    POST /api/dms/documents/{doc_id}/tags/          — Assign tag(s) to document
    DELETE /api/dms/documents/{doc_id}/tags/{tag_id}/ — Remove tag from document
    """
    if request.method == 'POST':
        tag_ids = request.data.get('tag_ids', [])
        if not tag_ids:
            return Response({'error': 'tag_ids array is required'}, status=400)

        with connection.cursor() as cursor:
            for tid in tag_ids:
                cursor.execute("""
                    INSERT INTO landscape.dms_doc_tag_assignments (doc_id, tag_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, [int(doc_id), int(tid)])

                # Update usage count
                cursor.execute("""
                    UPDATE landscape.dms_doc_tags
                    SET usage_count = (
                        SELECT COUNT(*) FROM landscape.dms_doc_tag_assignments WHERE tag_id = %s
                    )
                    WHERE tag_id = %s
                """, [int(tid), int(tid)])

        return Response({'success': True, 'assigned': len(tag_ids)})

    # DELETE: remove a single tag from this document
    if tag_id is None:
        return Response({'error': 'tag_id is required in URL'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.dms_doc_tag_assignments
            WHERE doc_id = %s AND tag_id = %s
        """, [int(doc_id), int(tag_id)])

        # Update usage count
        cursor.execute("""
            UPDATE landscape.dms_doc_tags
            SET usage_count = (
                SELECT COUNT(*) FROM landscape.dms_doc_tag_assignments WHERE tag_id = %s
            )
            WHERE tag_id = %s
        """, [int(tag_id), int(tag_id)])

    return Response({'success': True})


# =============================================================================
# Project Doc Type Overrides (Part 4)
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def project_doc_types(request, project_id):
    """
    GET /api/dms/projects/{project_id}/doc-types/   — Returns merged list (template + custom)
    POST /api/dms/projects/{project_id}/doc-types/  — Add custom doc type for this project
    """
    if request.method == 'GET':
        with connection.cursor() as cursor:
            # Get template-sourced doc types
            cursor.execute("""
                SELECT unnest(t.doc_type_options) AS doc_type_name
                FROM landscape.dms_templates t
                WHERE t.project_id = %s
                   OR (t.is_default = TRUE AND t.workspace_id = (
                       SELECT workspace_id FROM landscape.tbl_project WHERE project_id = %s
                   ))
                ORDER BY doc_type_name
            """, [project_id, project_id])
            template_types = list({row[0] for row in cursor.fetchall()})

            # Get custom project doc types
            cursor.execute("""
                SELECT id, doc_type_name, display_order, is_from_template
                FROM landscape.dms_project_doc_types
                WHERE project_id = %s
                ORDER BY display_order, doc_type_name
            """, [project_id])
            columns = [col[0] for col in cursor.description]
            custom_types = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Merge: template types first, then any custom additions
        custom_names = {c['doc_type_name'] for c in custom_types}
        result = []

        for dt in sorted(template_types):
            result.append({
                'doc_type_name': dt,
                'is_from_template': True,
                'display_order': 0,
            })

        for ct in custom_types:
            if ct['doc_type_name'] not in set(template_types):
                result.append(ct)

        return Response({
            'success': True,
            'doc_types': result,
        })

    # POST: add custom doc type
    doc_type_name = request.data.get('doc_type_name', '').strip()
    if not doc_type_name:
        return Response({'error': 'doc_type_name is required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
            VALUES (%s, %s, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM landscape.dms_project_doc_types WHERE project_id = %s), FALSE)
            ON CONFLICT (project_id, doc_type_name) DO NOTHING
            RETURNING id, doc_type_name, display_order, is_from_template
        """, [project_id, doc_type_name, project_id])
        row = cursor.fetchone()

        if row:
            return Response({
                'success': True,
                'doc_type': {
                    'id': row[0],
                    'doc_type_name': row[1],
                    'display_order': row[2],
                    'is_from_template': row[3],
                },
            }, status=201)
        else:
            return Response({
                'success': True,
                'existing': True,
                'message': f'Doc type "{doc_type_name}" already exists for this project.',
            })


@api_view(['DELETE', 'PUT'])
@permission_classes([AllowAny])
def project_doc_type_detail(request, project_id, pk):
    """
    DELETE /api/dms/projects/{project_id}/doc-types/{pk}/  — Remove custom doc type
    PUT /api/dms/projects/{project_id}/doc-types/{pk}/     — Rename or reorder
    """
    if request.method == 'DELETE':
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM landscape.dms_project_doc_types
                WHERE id = %s AND project_id = %s AND is_from_template = FALSE
                RETURNING doc_type_name
            """, [pk, project_id])
            row = cursor.fetchone()

            if not row:
                return Response({
                    'error': 'Not found or cannot delete template-sourced types'
                }, status=404)

            return Response({'success': True, 'deleted': row[0]})

    # PUT: rename or reorder
    new_name = request.data.get('doc_type_name')
    new_order = request.data.get('display_order')

    updates = []
    params = []
    if new_name:
        updates.append("doc_type_name = %s")
        params.append(new_name.strip())
    if new_order is not None:
        updates.append("display_order = %s")
        params.append(int(new_order))

    if not updates:
        return Response({'error': 'Nothing to update'}, status=400)

    params.extend([pk, project_id])

    with connection.cursor() as cursor:
        cursor.execute(f"""
            UPDATE landscape.dms_project_doc_types
            SET {', '.join(updates)}
            WHERE id = %s AND project_id = %s
            RETURNING id, doc_type_name, display_order, is_from_template
        """, params)
        row = cursor.fetchone()

        if not row:
            return Response({'error': 'Not found'}, status=404)

        return Response({
            'success': True,
            'doc_type': {
                'id': row[0],
                'doc_type_name': row[1],
                'display_order': row[2],
                'is_from_template': row[3],
            },
        })
