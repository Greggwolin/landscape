"""API views for DMS media extraction (scan, extract, classify, actions, entity linking)."""

import json
import logging
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from apps.knowledge.services.media_extraction_service import MediaExtractionService

VALID_ACTIONS = {'save_image', 'extract_data', 'both', 'ignore'}

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
#  HELPER: load classification lookup (cached per-request)
# ------------------------------------------------------------------ #
def _get_classification_lookup():
    """Build a classification_id -> info dict from lu_media_classification."""
    from django.db import connection
    with connection.cursor() as c:
        c.execute("""
            SELECT classification_id, classification_code, classification_name,
                   badge_color, content_intent, default_action
            FROM landscape.lu_media_classification
            WHERE is_active = true
            ORDER BY sort_order
        """)
        rows = c.fetchall()
    return {
        row[0]: {
            'code': row[1],
            'name': row[2],
            'badge_color': row[3],
            'content_intent': row[4],
            'default_action': row[5],
        }
        for row in rows
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def scan_document_media(request, doc_id):
    """
    POST /api/dms/documents/{doc_id}/media/scan/

    Triggers a media scan on a PDF document.
    Detects embedded images and page capture candidates without extracting.
    Creates 'pending' core_doc_media records and populates media_scan_json.

    Returns:
        media_scan_json dict
    """
    try:
        from django.db import connection
        with connection.cursor() as c:
            c.execute("""
                SELECT storage_uri, mime_type
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            row = c.fetchone()

        if not row:
            return Response(
                {'error': f'Document {doc_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        storage_uri = row[0]
        if not storage_uri:
            return Response(
                {'error': 'Document has no storage_uri'},
                status=status.HTTP_400_BAD_REQUEST
            )

        svc = MediaExtractionService()
        result = svc.scan_document(doc_id, storage_uri)

        return Response({
            'success': True,
            'doc_id': doc_id,
            'scan_result': result,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Media scan failed for doc_id={doc_id}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def extract_document_media(request, doc_id):
    """
    POST /api/dms/documents/{doc_id}/media/extract/

    Triggers extraction of previously scanned media items.

    Body:
        { "media_ids": [1, 2, 3] }   — extract specific items
        { "extract_all": true }       — extract all pending items

    Returns:
        List of extraction results per item.
    """
    try:
        from django.db import connection
        with connection.cursor() as c:
            c.execute("""
                SELECT storage_uri
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            row = c.fetchone()

        if not row:
            return Response(
                {'error': f'Document {doc_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        storage_uri = row[0]
        if not storage_uri:
            return Response(
                {'error': 'Document has no storage_uri'},
                status=status.HTTP_400_BAD_REQUEST
            )

        media_ids = request.data.get('media_ids')
        extract_all = request.data.get('extract_all', False)

        if not media_ids and not extract_all:
            return Response(
                {'error': 'Provide either media_ids or extract_all=true'},
                status=status.HTTP_400_BAD_REQUEST
            )

        svc = MediaExtractionService()
        results = svc.extract_media(
            doc_id=doc_id,
            file_path=storage_uri,
            media_ids=media_ids,
            extract_all=extract_all,
        )

        return Response({
            'success': True,
            'doc_id': doc_id,
            'extracted': len([r for r in results if r.get('status') == 'extracted']),
            'errors': len([r for r in results if r.get('status') == 'error']),
            'results': results,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Media extraction failed for doc_id={doc_id}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def classify_document_media(request, doc_id):
    """
    POST /api/dms/documents/{doc_id}/media/classify/

    Triggers classification of extracted media items.

    Body:
        { "strategy": "auto" }   — auto (default): heuristic + AI vision
        { "strategy": "heuristic" }
        { "strategy": "ai_vision" }

    Returns:
        Classification summary with breakdown by type and action.
    """
    try:
        from apps.knowledge.services.media_classification_service import MediaClassificationService

        strategy = request.data.get('strategy', 'auto') if request.data else 'auto'
        if strategy not in ('auto', 'ai_vision', 'heuristic'):
            return Response(
                {'error': f"Invalid strategy '{strategy}'. Use 'auto', 'ai_vision', or 'heuristic'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        svc = MediaClassificationService()
        result = svc.classify_document_media(doc_id, strategy=strategy)

        return Response({
            'success': True,
            **result,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Media classification failed for doc_id={doc_id}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def list_document_media(request, doc_id):
    """
    GET /api/dms/documents/{doc_id}/media/

    Returns all core_doc_media records for a document with classification data.
    This is what the Phase 4 preview modal consumes.

    Returns:
        {
            "doc_id": 123,
            "doc_name": "...",
            "media_scan_status": "classified",
            "summary": { ... },
            "items": [ ... ]
        }
    """
    try:
        from django.db import connection

        # Get document metadata
        with connection.cursor() as c:
            c.execute("""
                SELECT doc_id, doc_name, media_scan_status, media_scan_json
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            doc_row = c.fetchone()

        if not doc_row:
            return Response(
                {'error': f'Document {doc_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        doc_name = doc_row[1]
        scan_status = doc_row[2]
        scan_json = doc_row[3] if isinstance(doc_row[3], dict) else (
            json.loads(doc_row[3]) if doc_row[3] else {}
        )

        # Get all media items
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    m.media_id, m.source_page, m.extraction_method,
                    m.thumbnail_uri, m.storage_uri,
                    m.classification_id, m.ai_classification, m.ai_confidence,
                    m.suggested_action, m.user_action,
                    m.status, m.width_px, m.height_px,
                    m.file_size_bytes, m.mime_type, m.asset_name,
                    m.dpi, m.caption, m.ai_description
                FROM landscape.core_doc_media m
                WHERE m.doc_id = %s AND m.deleted_at IS NULL
                ORDER BY m.source_page, m.media_id
            """, [doc_id])
            media_rows = c.fetchall()

        # Build classification lookup
        class_lookup = _get_classification_lookup()

        # Build items list
        items = []
        action_counts = {'save_image': 0, 'extract_data': 0, 'both': 0, 'ignore': 0}

        for r in media_rows:
            classification_id = r[5]
            class_info = class_lookup.get(classification_id) if classification_id else None

            classification = None
            if class_info:
                classification = {
                    'code': class_info['code'],
                    'name': class_info['name'],
                    'badge_color': class_info['badge_color'],
                    'content_intent': class_info['content_intent'],
                    'confidence': float(r[7]) if r[7] is not None else None,
                }

            effective_action = r[9] or r[8]  # user_action overrides suggested_action
            if effective_action in action_counts:
                action_counts[effective_action] += 1

            items.append({
                'media_id': r[0],
                'source_page': r[1],
                'extraction_method': r[2],
                'thumbnail_uri': r[3],
                'storage_uri': r[4],
                'classification': classification,
                'suggested_action': r[8],
                'user_action': r[9],
                'status': r[10],
                'width_px': r[11],
                'height_px': r[12],
                'file_size_bytes': r[13],
                'mime_type': r[14],
                'asset_name': r[15],
                'dpi': r[16],
                'caption': r[17],
                'ai_description': r[18],
            })

        summary = {
            'total': len(items),
            'by_action': action_counts,
            'by_color': scan_json.get('by_color', {}),
        }

        return Response({
            'doc_id': doc_id,
            'doc_name': doc_name,
            'media_scan_status': scan_status,
            'summary': summary,
            'items': items,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"List media failed for doc_id={doc_id}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_media_actions(request, doc_id):
    """
    POST /api/dms/documents/{doc_id}/media/actions/

    Confirms user-selected actions for detected media assets.

    Body:
        {
          "actions": [
            { "media_id": 1, "action": "save_image" },
            { "media_id": 2, "action": "extract_data" },
            { "media_id": 3, "action": "ignore" }
          ]
        }

    For each action:
      - save_image / both: triggers extraction if item is still pending
      - extract_data: flags item for future AI data extraction
      - ignore: marks as rejected if not yet extracted

    Sets core_doc.media_scan_status = 'complete' after processing.
    """
    try:
        from django.db import connection

        actions_list = request.data.get('actions')
        if not actions_list or not isinstance(actions_list, list):
            return Response(
                {'error': 'Provide "actions" array with {media_id, action} objects'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate all actions before processing
        for item in actions_list:
            if not item.get('media_id') or not item.get('action'):
                return Response(
                    {'error': 'Each action must have media_id and action fields'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if item['action'] not in VALID_ACTIONS:
                return Response(
                    {'error': f"Invalid action '{item['action']}'. "
                              f"Valid: {', '.join(sorted(VALID_ACTIONS))}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Verify doc exists
        with connection.cursor() as c:
            c.execute("""
                SELECT doc_id, storage_uri
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            doc_row = c.fetchone()

        if not doc_row:
            return Response(
                {'error': f'Document {doc_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        storage_uri = doc_row[1]

        # Build summary counters
        summary = {'save_image': 0, 'extract_data': 0, 'both': 0, 'ignore': 0}
        pending_save_ids = []  # media_ids that need extraction triggered
        extract_data_ids = []  # media_ids queued for data extraction

        # Process each action
        for item in actions_list:
            media_id = item['media_id']
            action = item['action']
            summary[action] += 1

            # Update user_action on the media record
            with connection.cursor() as c:
                c.execute("""
                    UPDATE landscape.core_doc_media
                    SET user_action = %s,
                        updated_at = NOW()
                    WHERE media_id = %s AND doc_id = %s AND deleted_at IS NULL
                    RETURNING status
                """, [action, media_id, doc_id])
                row = c.fetchone()

            if not row:
                logger.warning(
                    f"Media action: media_id={media_id} not found for doc_id={doc_id}"
                )
                continue

            current_status = row[0]

            # Handle save_image / both: trigger extraction if still pending
            if action in ('save_image', 'both') and current_status == 'pending':
                pending_save_ids.append(media_id)

            # Handle extract_data / both: flag for future data extraction
            if action in ('extract_data', 'both'):
                extract_data_ids.append(media_id)

            # Handle ignore: mark as rejected if not yet extracted
            if action == 'ignore' and current_status == 'pending':
                with connection.cursor() as c:
                    c.execute("""
                        UPDATE landscape.core_doc_media
                        SET status = 'rejected', updated_at = NOW()
                        WHERE media_id = %s AND doc_id = %s
                    """, [media_id, doc_id])

        # Trigger extraction for pending save_image items
        extractions_triggered = 0
        if pending_save_ids and storage_uri:
            try:
                svc = MediaExtractionService()
                results = svc.extract_media(
                    doc_id=doc_id,
                    file_path=storage_uri,
                    media_ids=pending_save_ids,
                )
                extractions_triggered = len(
                    [r for r in results if r.get('status') == 'extracted']
                )
            except Exception as ex:
                logger.warning(
                    f"Extraction during actions for doc_id={doc_id} "
                    f"failed for {len(pending_save_ids)} items: {ex}"
                )

        # Update media_scan_status to 'complete'
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc
                SET media_scan_status = 'complete',
                    updated_at = NOW()
                WHERE doc_id = %s
            """, [doc_id])

        # Rebuild media_scan_json with final action counts
        _rebuild_scan_json_actions(doc_id)

        return Response({
            'success': True,
            'doc_id': doc_id,
            'processed': len(actions_list),
            'summary': summary,
            'extractions_triggered': extractions_triggered,
            'data_extraction_queued': len(extract_data_ids),
            'status': 'complete',
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Submit media actions failed for doc_id={doc_id}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _rebuild_scan_json_actions(doc_id: int):
    """Rebuild media_scan_json with user_action counts after confirmation."""
    from django.db import connection

    with connection.cursor() as c:
        c.execute("""
            SELECT
                lc.classification_code,
                lc.badge_color,
                COALESCE(m.user_action, m.suggested_action) as effective_action,
                m.source_page,
                COUNT(*) as cnt
            FROM landscape.core_doc_media m
            LEFT JOIN landscape.lu_media_classification lc
                ON m.classification_id = lc.classification_id
            WHERE m.doc_id = %s AND m.deleted_at IS NULL
            GROUP BY lc.classification_code, lc.badge_color,
                     COALESCE(m.user_action, m.suggested_action), m.source_page
        """, [doc_id])
        rows = c.fetchall()

    # Build by_color with action breakdowns
    by_color = {}
    by_type = {}

    for code, color, action, page, cnt in rows:
        color = color or 'secondary'
        code = code or 'other'
        action = action or 'save_image'

        # by_color aggregation
        if color not in by_color:
            by_color[color] = {
                'total': 0,
                'action_save': 0,
                'action_extract': 0,
                'action_both': 0,
                'action_ignore': 0,
            }
        by_color[color]['total'] += cnt
        if action == 'save_image':
            by_color[color]['action_save'] += cnt
        elif action == 'extract_data':
            by_color[color]['action_extract'] += cnt
        elif action == 'both':
            by_color[color]['action_both'] += cnt
        elif action == 'ignore':
            by_color[color]['action_ignore'] += cnt

        # by_type aggregation
        if code not in by_type:
            by_type[code] = {
                'total': 0,
                'pages': [],
                'action_save': 0,
                'action_extract': 0,
                'action_ignore': 0,
            }
        by_type[code]['total'] += cnt
        if page and page not in by_type[code]['pages']:
            by_type[code]['pages'].append(page)
        if action == 'save_image':
            by_type[code]['action_save'] += cnt
        elif action == 'extract_data':
            by_type[code]['action_extract'] += cnt
        elif action == 'ignore':
            by_type[code]['action_ignore'] += cnt

    # Sort pages
    for code in by_type:
        by_type[code]['pages'].sort()

    # Get existing scan_json and merge
    with connection.cursor() as c:
        c.execute("""
            SELECT media_scan_json
            FROM landscape.core_doc
            WHERE doc_id = %s
        """, [doc_id])
        row = c.fetchone()
        existing = row[0] if row and row[0] else {}
        if isinstance(existing, str):
            existing = json.loads(existing)

    existing['by_color'] = by_color
    existing['by_type'] = by_type
    existing['user_confirmed'] = True

    with connection.cursor() as c:
        c.execute("""
            UPDATE landscape.core_doc
            SET media_scan_json = %s, updated_at = NOW()
            WHERE doc_id = %s
        """, [json.dumps(existing), doc_id])


# ------------------------------------------------------------------ #
#  ENTITY LINKING: CRUD for core_doc_media_link
# ------------------------------------------------------------------ #

VALID_ENTITY_TYPES = {
    'project', 'comp_sale', 'comp_rental', 'parcel', 'phase',
    'unit', 'unit_type', 'document', 'budget_item', 'area',
}

VALID_LINK_PURPOSES = {'hero_image', 'thumbnail', 'reference', 'comparison'}


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def media_links(request):
    """
    GET  /api/dms/media/links/?entity_type=comp_sale&entity_id=123
    POST /api/dms/media/links/  { media_id, entity_type, entity_id, link_purpose?, notes? }
    """
    if request.method == 'GET':
        return _list_media_links(request)
    return _create_media_link(request)


def _list_media_links(request):
    """List all media linked to an entity."""
    entity_type = request.query_params.get('entity_type')
    entity_id = request.query_params.get('entity_id')
    if not entity_type or not entity_id:
        return Response(
            {'error': 'entity_type and entity_id are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        entity_id = int(entity_id)
    except (ValueError, TypeError):
        return Response({'error': 'entity_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    cls_lookup = _get_classification_lookup()

    with connection.cursor() as c:
        c.execute("""
            SELECT
                l.link_id, l.media_id, l.link_purpose, l.display_order, l.notes, l.created_at,
                m.thumbnail_uri, m.storage_uri, m.classification_id, m.width_px, m.height_px,
                m.source_page, m.caption, m.asset_name, m.ai_description
            FROM landscape.core_doc_media_link l
            JOIN landscape.core_doc_media m ON l.media_id = m.media_id
            WHERE l.entity_type = %s AND l.entity_id = %s
            ORDER BY l.display_order, l.created_at
        """, [entity_type, entity_id])
        rows = c.fetchall()

    links = []
    for row in rows:
        cls_id = row[8]
        cls_info = cls_lookup.get(cls_id, {})
        links.append({
            'link_id': row[0],
            'media_id': row[1],
            'link_purpose': row[2],
            'display_order': row[3],
            'notes': row[4],
            'created_at': row[5].isoformat() if row[5] else None,
            'media': {
                'media_id': row[1],
                'thumbnail_uri': row[6],
                'storage_uri': row[7],
                'classification': {
                    'code': cls_info.get('code', 'unknown'),
                    'name': cls_info.get('name', 'Unknown'),
                    'badge_color': cls_info.get('badge_color', 'secondary'),
                },
                'width_px': row[9],
                'height_px': row[10],
                'source_page': row[11],
                'caption': row[12],
                'asset_name': row[13],
                'ai_description': row[14],
            },
        })

    return Response({
        'entity_type': entity_type,
        'entity_id': entity_id,
        'links': links,
    })


def _create_media_link(request):
    """Create a new media → entity link."""
    data = request.data
    media_id = data.get('media_id')
    entity_type = data.get('entity_type')
    entity_id = data.get('entity_id')
    link_purpose = data.get('link_purpose')
    notes = data.get('notes')

    if not media_id or not entity_type or not entity_id:
        return Response(
            {'error': 'media_id, entity_type, and entity_id are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if entity_type not in VALID_ENTITY_TYPES:
        return Response(
            {'error': f'Invalid entity_type. Must be one of: {", ".join(sorted(VALID_ENTITY_TYPES))}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if link_purpose and link_purpose not in VALID_LINK_PURPOSES:
        return Response(
            {'error': f'Invalid link_purpose. Must be one of: {", ".join(sorted(VALID_LINK_PURPOSES))}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        media_id = int(media_id)
        entity_id = int(entity_id)
    except (ValueError, TypeError):
        return Response({'error': 'media_id and entity_id must be integers'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify media exists
    with connection.cursor() as c:
        c.execute("SELECT media_id FROM landscape.core_doc_media WHERE media_id = %s", [media_id])
        if not c.fetchone():
            return Response({'error': f'Media asset {media_id} not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check for duplicate
    with connection.cursor() as c:
        c.execute("""
            SELECT link_id FROM landscape.core_doc_media_link
            WHERE media_id = %s AND entity_type = %s AND entity_id = %s
        """, [media_id, entity_type, entity_id])
        if c.fetchone():
            return Response(
                {'error': 'This media is already linked to this entity'},
                status=status.HTTP_409_CONFLICT,
            )

    # Get next display_order
    with connection.cursor() as c:
        c.execute("""
            SELECT COALESCE(MAX(display_order), -1) + 1
            FROM landscape.core_doc_media_link
            WHERE entity_type = %s AND entity_id = %s
        """, [entity_type, entity_id])
        next_order = c.fetchone()[0]

    # Insert
    with connection.cursor() as c:
        c.execute("""
            INSERT INTO landscape.core_doc_media_link
                (media_id, entity_type, entity_id, link_purpose, display_order, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING link_id, created_at
        """, [media_id, entity_type, entity_id, link_purpose, next_order, notes])
        row = c.fetchone()

    return Response({
        'success': True,
        'link_id': row[0],
        'media_id': media_id,
        'entity_type': entity_type,
        'entity_id': entity_id,
        'link_purpose': link_purpose,
        'display_order': next_order,
        'created_at': row[1].isoformat() if row[1] else None,
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_media_link(request, link_id):
    """
    DELETE /api/dms/media/links/<link_id>/
    Removes the link but NOT the underlying media asset.
    """
    with connection.cursor() as c:
        c.execute("""
            DELETE FROM landscape.core_doc_media_link
            WHERE link_id = %s
            RETURNING link_id
        """, [link_id])
        deleted = c.fetchone()

    if not deleted:
        return Response({'error': 'Link not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response({'success': True, 'deleted_link_id': deleted[0]})


@api_view(['PATCH'])
@permission_classes([AllowAny])
def reorder_media_links(request):
    """
    PATCH /api/dms/media/links/reorder/
    Body: { entity_type, entity_id, ordered_link_ids: [5, 3, 7] }
    """
    data = request.data
    entity_type = data.get('entity_type')
    entity_id = data.get('entity_id')
    ordered_ids = data.get('ordered_link_ids', [])

    if not entity_type or not entity_id or not ordered_ids:
        return Response(
            {'error': 'entity_type, entity_id, and ordered_link_ids are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with connection.cursor() as c:
        for idx, link_id in enumerate(ordered_ids):
            c.execute("""
                UPDATE landscape.core_doc_media_link
                SET display_order = %s
                WHERE link_id = %s AND entity_type = %s AND entity_id = %s
            """, [idx, link_id, entity_type, int(entity_id)])

    return Response({'success': True, 'count': len(ordered_ids)})


@api_view(['GET'])
@permission_classes([AllowAny])
def available_media(request):
    """
    GET /api/dms/media/available/?project_id=7&classification=property_photo&entity_type=comp_sale&entity_id=123
    Returns saved media assets for a project, excluding items already linked to the specified entity.
    """
    project_id = request.query_params.get('project_id')
    if not project_id:
        return Response({'error': 'project_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        project_id = int(project_id)
    except (ValueError, TypeError):
        return Response({'error': 'project_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    classification = request.query_params.get('classification')
    entity_type = request.query_params.get('entity_type')
    entity_id = request.query_params.get('entity_id')

    cls_lookup = _get_classification_lookup()

    # Build query
    sql = """
        SELECT
            m.media_id, m.thumbnail_uri, m.storage_uri, m.classification_id,
            m.source_page, m.width_px, m.height_px, m.asset_name,
            m.caption, m.ai_description, m.mime_type, m.file_size_bytes,
            d.doc_name
        FROM landscape.core_doc_media m
        JOIN landscape.core_doc d ON m.doc_id = d.doc_id
        WHERE d.project_id = %s
          AND m.user_action IN ('save_image', 'both')
          AND m.status != 'rejected'
    """
    params = [project_id]

    # Filter by classification code
    if classification:
        sql += """
          AND m.classification_id IN (
              SELECT classification_id FROM landscape.lu_media_classification
              WHERE classification_code = %s
          )
        """
        params.append(classification)

    # Exclude already-linked media for this entity
    if entity_type and entity_id:
        sql += """
          AND m.media_id NOT IN (
              SELECT media_id FROM landscape.core_doc_media_link
              WHERE entity_type = %s AND entity_id = %s
          )
        """
        params.extend([entity_type, int(entity_id)])

    sql += " ORDER BY m.source_page, m.media_id"

    with connection.cursor() as c:
        c.execute(sql, params)
        rows = c.fetchall()

    items = []
    for row in rows:
        cls_id = row[3]
        cls_info = cls_lookup.get(cls_id, {})
        items.append({
            'media_id': row[0],
            'thumbnail_uri': row[1],
            'storage_uri': row[2],
            'classification': {
                'code': cls_info.get('code', 'unknown'),
                'name': cls_info.get('name', 'Unknown'),
                'badge_color': cls_info.get('badge_color', 'secondary'),
            },
            'source_page': row[4],
            'width_px': row[5],
            'height_px': row[6],
            'asset_name': row[7],
            'caption': row[8],
            'ai_description': row[9],
            'mime_type': row[10],
            'file_size_bytes': row[11],
            'source_doc_name': row[12],
        })

    return Response({
        'project_id': project_id,
        'total': len(items),
        'items': items,
    })
