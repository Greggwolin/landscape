"""
Library API for the chat-forward reports redesign (RP-CFRPT-2605 Phase 2).

Eight endpoints under /api/reports/library/ + /api/reports/saved/ that wrap
the persistence layer and the existing PreviewBaseGenerator path.

| Method + Path                                              | Purpose                            |
|------------------------------------------------------------|------------------------------------|
| GET    /api/reports/library/                               | User's library state (§5)         |
| GET    /api/reports/library/<report_code>/preview/         | Preview with personal default     |
| PUT    /api/reports/library/<report_code>/personal/        | Update personal default           |
| DELETE /api/reports/library/<report_code>/personal/        | Reset to base                     |
| POST   /api/reports/saved/                                 | Save As — create named entry      |
| GET    /api/reports/saved/<uuid>/preview/                  | Preview a saved report            |
| PATCH  /api/reports/saved/<uuid>/                          | Edit saved (rename, update spec)  |
| DELETE /api/reports/saved/<uuid>/                          | Soft-delete (sets is_archived)    |

Per-user scoping is enforced by filtering on `request.user` everywhere — no
endpoint allows reading another user's library. IsAuthenticated is inherited
from the global DRF default per Phase 0 refresh §2 (auth tightening landed
2026-05-16).

Silent-write protection per §15.2: tests in tests/test_library_views.py
exercise each write path against the DB directly (not just API 200).
"""

from __future__ import annotations

import logging
import time

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .generator_router import get_report_generator
from .models import (
    ReportDefinition,
    ReportHistory,
    UserReportPersonalDefault,
    UserSavedReport,
)
from .serializers import (
    UserReportPersonalDefaultSerializer,
    UserSavedReportSerializer,
)
from .services.library_resolver import build_library_list, resolve_report
from .services.modification_spec import (
    SpecValidationError,
    apply_spec,
    validate_spec,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Library — list and preview
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def library_list(request):
    """
    GET /api/reports/library/?project_id=<optional>

    Returns the authenticated user's library state with personal defaults
    resolved (project-scope overrides global-scope when project_id present)
    plus their named saved reports.
    """
    project_id = request.query_params.get('project_id')
    project_id_int = int(project_id) if project_id and project_id.isdigit() else None
    payload = build_library_list(user_id=request.user.id, project_id=project_id_int)
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def library_preview(request, report_code):
    """
    GET /api/reports/library/<report_code>/preview/?project_id=<int>

    Runs the canonical generator, then applies the user's resolved
    modification_spec (project-scope > global-scope > canonical base).

    Returns the same envelope as the existing /api/reports/preview/ endpoint
    plus a 'modification_spec' echo so the toolbar knows what to write back.
    """
    start = time.time()

    project_id_raw = request.query_params.get('project_id')
    if not project_id_raw:
        return Response(
            {'error': 'project_id is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        project_id = int(project_id_raw)
    except (TypeError, ValueError):
        return Response(
            {'error': 'project_id must be an integer'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resolved = resolve_report(
        user_id=request.user.id,
        report_code=report_code,
        project_id=project_id,
    )
    if resolved is None:
        return Response(
            {'error': f'Report {report_code} not found or inactive'},
            status=status.HTTP_404_NOT_FOUND,
        )

    generator = get_report_generator(report_code, project_id)
    if generator is None:
        return Response({
            'report_code': report_code,
            'report_name': resolved.report_name,
            'report_category': resolved.report_category,
            'status': 'not_implemented',
            'message': f'Generator for {report_code} is not yet implemented.',
            'data': None,
            'modification_spec': resolved.modification_spec,
            'source': resolved.source,
        })

    try:
        preview = generator.generate_preview()
    except Exception as e:
        logger.exception(f"library_preview generator error for {report_code}")
        return Response({
            'report_code': report_code,
            'report_name': resolved.report_name,
            'report_category': resolved.report_category,
            'status': 'error',
            'message': str(e),
            'data': None,
            'modification_spec': resolved.modification_spec,
            'source': resolved.source,
        })

    try:
        applied = apply_spec(preview, resolved.modification_spec)
    except Exception as e:
        logger.exception(f"apply_spec failed for {report_code}")
        # Fall back to canonical preview; surface the apply error so the
        # caller can decide whether to retry without the spec
        applied = preview
        applied['_apply_spec_error'] = str(e)

    # Touch last_used_at on the personal default if one was applied
    if resolved.personal_default_id is not None:
        try:
            UserReportPersonalDefault.objects.filter(id=resolved.personal_default_id).update(
                last_used_at=timezone.now(),
            )
        except Exception:
            pass

    generation_time = int((time.time() - start) * 1000)
    try:
        ReportHistory.objects.create(
            report_definition_id=report_code,
            project_id=project_id,
            parameters={'source': resolved.source},
            export_format='html',
            generation_time_ms=generation_time,
        )
    except Exception:
        pass

    return Response({
        'report_code': report_code,
        'report_name': resolved.report_name,
        'report_category': resolved.report_category,
        'status': 'success',
        'generation_time_ms': generation_time,
        'modification_spec': resolved.modification_spec,
        'source': resolved.source,
        'personal_default_id': resolved.personal_default_id,
        'data': applied,
    })


# =============================================================================
# Library — personal default upsert / reset
# =============================================================================

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def library_personal(request, report_code):
    """
    PUT    /api/reports/library/<report_code>/personal/   — upsert
    DELETE /api/reports/library/<report_code>/personal/   — reset to base

    Single dispatch view. PUT body shape and DELETE query-params are
    documented in their respective helpers below.
    """
    if request.method == 'DELETE':
        return _library_personal_reset(request, report_code)
    return _library_personal_upsert(request, report_code)


def _library_personal_upsert(request, report_code):
    """
    PUT body:
      {
        "modification_spec": { ... },
        "scope_type": "global",        // optional, defaults to 'global'
        "scope_id": null                // optional, must align with scope_type
      }

    Creates the row if missing, updates in place if present. The (user,
    report_code, scope_type, scope_id) uniqueness constraint guarantees one
    row per scope.
    """
    canonical = get_object_or_404(
        ReportDefinition, report_code=report_code, is_active=True,
    )

    spec = request.data.get('modification_spec', {})
    try:
        spec = validate_spec(spec)
    except SpecValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    scope_type = request.data.get('scope_type', 'global')
    scope_id_raw = request.data.get('scope_id')
    scope_id = int(scope_id_raw) if scope_id_raw is not None else None

    # Mirror the DB CHECK constraint at the application layer so 400s come
    # back as a clean validation error instead of an IntegrityError 500.
    if scope_type in ('global', 'cross_project') and scope_id is not None:
        return Response(
            {'error': f'scope_id must be null when scope_type is {scope_type!r}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if scope_type in ('project', 'entity', 'master_lease') and scope_id is None:
        return Response(
            {'error': f'scope_id is required when scope_type is {scope_type!r}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        row, created = UserReportPersonalDefault.objects.update_or_create(
            user=request.user,
            report_definition=canonical,
            scope_type=scope_type,
            scope_id=scope_id,
            defaults={'modification_spec': spec},
        )

    serializer = UserReportPersonalDefaultSerializer(row)
    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


def _library_personal_reset(request, report_code):
    """
    DELETE /api/reports/library/<report_code>/personal/?scope_type=global&scope_id=

    Hard-deletes the user's personal default row for this (report, scope).
    Next render falls back to the canonical base.
    """
    scope_type = request.query_params.get('scope_type', 'global')
    scope_id_raw = request.query_params.get('scope_id')
    scope_id = int(scope_id_raw) if scope_id_raw and scope_id_raw.isdigit() else None

    deleted, _ = UserReportPersonalDefault.objects.filter(
        user=request.user,
        report_definition_id=report_code,
        scope_type=scope_type,
        scope_id=scope_id,
    ).delete()

    if deleted == 0:
        return Response(
            {'message': 'No personal default to reset'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Saved reports
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def saved_create(request):
    """
    POST /api/reports/saved/

    Body:
      {
        "name": "Rent Roll with Market Variance",
        "description": "optional",
        "base_report_code": "RPT_07",
        "modification_spec": { ... },
        "scope_type": "global",
        "scope_id": null
      }

    Creates a new Save-As entry. Name must be unique per user; conflict
    returns 409.
    """
    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)

    base_code = request.data.get('base_report_code')
    if not base_code:
        return Response(
            {'error': 'base_report_code is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    base = get_object_or_404(ReportDefinition, report_code=base_code, is_active=True)

    spec = request.data.get('modification_spec', {})
    try:
        spec = validate_spec(spec)
    except SpecValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    scope_type = request.data.get('scope_type', 'global')
    scope_id_raw = request.data.get('scope_id')
    scope_id = int(scope_id_raw) if scope_id_raw is not None else None

    if scope_type in ('global', 'cross_project') and scope_id is not None:
        return Response(
            {'error': f'scope_id must be null when scope_type is {scope_type!r}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if scope_type in ('project', 'entity', 'master_lease') and scope_id is None:
        return Response(
            {'error': f'scope_id is required when scope_type is {scope_type!r}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if UserSavedReport.objects.filter(user=request.user, name=name).exists():
        return Response(
            {'error': f'A saved report named {name!r} already exists for this user'},
            status=status.HTTP_409_CONFLICT,
        )

    row = UserSavedReport.objects.create(
        user=request.user,
        base_report=base,
        name=name,
        description=request.data.get('description') or None,
        scope_type=scope_type,
        scope_id=scope_id,
        modification_spec=spec,
    )
    serializer = UserSavedReportSerializer(row)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def saved_preview(request, uuid):
    """
    GET /api/reports/saved/<uuid>/preview/?project_id=<int>

    Render preview using a saved report's base_report_code + modification_spec.
    """
    saved = get_object_or_404(
        UserSavedReport, uuid=uuid, user=request.user, is_archived=False,
    )

    project_id_raw = request.query_params.get('project_id')
    if not project_id_raw:
        return Response(
            {'error': 'project_id is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        project_id = int(project_id_raw)
    except (TypeError, ValueError):
        return Response(
            {'error': 'project_id must be an integer'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    generator = get_report_generator(saved.base_report_id, project_id)
    if generator is None:
        return Response({
            'uuid': str(saved.uuid),
            'name': saved.name,
            'base_report_code': saved.base_report_id,
            'status': 'not_implemented',
            'data': None,
            'modification_spec': saved.modification_spec,
        })

    try:
        preview = generator.generate_preview()
    except Exception as e:
        logger.exception(f"saved_preview generator error for {saved.base_report_id}")
        return Response({
            'uuid': str(saved.uuid),
            'name': saved.name,
            'base_report_code': saved.base_report_id,
            'status': 'error',
            'message': str(e),
            'data': None,
        })

    try:
        applied = apply_spec(preview, saved.modification_spec)
    except Exception as e:
        logger.exception(f"apply_spec failed for saved report {saved.uuid}")
        applied = preview
        applied['_apply_spec_error'] = str(e)

    UserSavedReport.objects.filter(pk=saved.pk).update(last_used_at=timezone.now())

    return Response({
        'uuid': str(saved.uuid),
        'name': saved.name,
        'description': saved.description,
        'base_report_code': saved.base_report_id,
        'status': 'success',
        'modification_spec': saved.modification_spec,
        'data': applied,
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def saved_detail(request, uuid):
    """
    PATCH  /api/reports/saved/<uuid>/   — edit (rename, update spec, archive)
    DELETE /api/reports/saved/<uuid>/?hard=false  — soft-delete (default)

    Single dispatch view.
    """
    if request.method == 'DELETE':
        return _saved_delete(request, uuid)
    return _saved_update(request, uuid)


def _saved_update(request, uuid):
    """
    PATCH body may contain any of: name, description, modification_spec,
    is_archived, scope_type, scope_id.
    """
    saved = get_object_or_404(UserSavedReport, uuid=uuid, user=request.user)

    if 'name' in request.data:
        new_name = (request.data['name'] or '').strip()
        if not new_name:
            return Response({'error': 'name cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        if (
            UserSavedReport.objects
            .filter(user=request.user, name=new_name)
            .exclude(pk=saved.pk)
            .exists()
        ):
            return Response(
                {'error': f'A saved report named {new_name!r} already exists'},
                status=status.HTTP_409_CONFLICT,
            )
        saved.name = new_name

    if 'description' in request.data:
        saved.description = request.data['description'] or None

    if 'modification_spec' in request.data:
        try:
            saved.modification_spec = validate_spec(request.data['modification_spec'])
        except SpecValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if 'is_archived' in request.data:
        saved.is_archived = bool(request.data['is_archived'])

    if 'scope_type' in request.data or 'scope_id' in request.data:
        scope_type = request.data.get('scope_type', saved.scope_type)
        scope_id_raw = request.data.get('scope_id', saved.scope_id)
        scope_id = int(scope_id_raw) if scope_id_raw is not None else None

        if scope_type in ('global', 'cross_project') and scope_id is not None:
            return Response(
                {'error': f'scope_id must be null when scope_type is {scope_type!r}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if scope_type in ('project', 'entity', 'master_lease') and scope_id is None:
            return Response(
                {'error': f'scope_id is required when scope_type is {scope_type!r}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        saved.scope_type = scope_type
        saved.scope_id = scope_id

    saved.save()
    serializer = UserSavedReportSerializer(saved)
    return Response(serializer.data)


def _saved_delete(request, uuid):
    """
    DELETE /api/reports/saved/<uuid>/?hard=false

    Default: soft-delete (set is_archived=True). Pass ?hard=true to remove
    the row entirely. Soft-delete by default per Phase 1 open-question #1.
    """
    saved = get_object_or_404(UserSavedReport, uuid=uuid, user=request.user)
    hard = request.query_params.get('hard', '').lower() in ('1', 'true', 'yes')

    if hard:
        saved.delete()
    else:
        saved.is_archived = True
        saved.save(update_fields=['is_archived', 'updated_at'])

    return Response(status=status.HTTP_204_NO_CONTENT)
