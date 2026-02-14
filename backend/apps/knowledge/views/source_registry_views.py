"""Source registry API endpoints for platform knowledge cataloging."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import KnowledgeSource
from ..serializers import KnowledgeSourceSerializer
from ..services.source_registry_service import (
    SOURCE_TYPE_VALUES,
    match_source_name,
    search_sources,
)


def _to_payload(source: KnowledgeSource) -> dict:
    return KnowledgeSourceSerializer(source).data


def _clean_aliases(value) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned = []
    seen = set()
    for alias in value:
        if not isinstance(alias, str):
            continue
        trimmed = alias.strip()
        if not trimmed:
            continue
        lowered = trimmed.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(trimmed)
    return cleaned


@csrf_exempt
@require_http_methods(["GET", "POST"])
def knowledge_sources(request):
    if request.method == 'GET':
        include_inactive = request.GET.get('include_inactive') == 'true'
        queryset = KnowledgeSource.objects.all().order_by('source_name')
        if not include_inactive:
            queryset = queryset.filter(is_active=True)

        return JsonResponse({
            'success': True,
            'results': [_to_payload(source) for source in queryset],
        })

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    source_name = (data.get('source_name') or '').strip()
    source_type = (data.get('source_type') or '').strip()
    aliases = _clean_aliases(data.get('aliases') or [])

    if not source_name:
        return JsonResponse({'error': 'source_name is required'}, status=400)

    if source_type not in SOURCE_TYPE_VALUES:
        return JsonResponse(
            {
                'error': 'Invalid source_type',
                'valid_source_types': sorted(SOURCE_TYPE_VALUES),
            },
            status=400,
        )

    # Deduplicate using normalized matching before insert.
    match = match_source_name(source_name, min_confidence=0.94)
    if match.get('matched') and match.get('source'):
        existing = match['source']
        return JsonResponse(
            {
                'success': False,
                'error': 'Source already exists or closely matches an existing source',
                'existing_source': _to_payload(existing),
                'match': {
                    'confidence': match.get('confidence'),
                    'match_type': match.get('match_type'),
                    'matched_value': match.get('matched_value'),
                },
            },
            status=409,
        )

    source = KnowledgeSource.objects.create(
        source_name=source_name,
        source_type=source_type,
        aliases=aliases,
        website=(data.get('website') or None),
        description=(data.get('description') or None),
        created_by=(data.get('created_by') or 'system'),
        first_seen_at=timezone.now(),
        last_seen_at=timezone.now(),
        is_active=True,
    )

    return JsonResponse({'success': True, 'result': _to_payload(source)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def knowledge_source_detail(request, source_id: int):
    try:
        source = KnowledgeSource.objects.get(id=source_id)
    except KnowledgeSource.DoesNotExist:
        return JsonResponse({'error': 'Source not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'result': _to_payload(source)})

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if 'source_name' in data:
        next_name = (data.get('source_name') or '').strip()
        if not next_name:
            return JsonResponse({'error': 'source_name cannot be blank'}, status=400)
        source.source_name = next_name

    if 'source_type' in data:
        source_type = (data.get('source_type') or '').strip()
        if source_type not in SOURCE_TYPE_VALUES:
            return JsonResponse(
                {
                    'error': 'Invalid source_type',
                    'valid_source_types': sorted(SOURCE_TYPE_VALUES),
                },
                status=400,
            )
        source.source_type = source_type

    if 'aliases' in data:
        source.aliases = _clean_aliases(data.get('aliases') or [])

    if 'website' in data:
        source.website = (data.get('website') or None)

    if 'description' in data:
        source.description = (data.get('description') or None)

    if 'is_active' in data:
        source.is_active = bool(data.get('is_active'))

    source.save()
    return JsonResponse({'success': True, 'result': _to_payload(source)})


@csrf_exempt
@require_http_methods(["GET"])
def knowledge_source_search(request):
    query = (request.GET.get('q') or '').strip()
    limit_raw = request.GET.get('limit')

    try:
        limit = max(1, min(200, int(limit_raw or 50)))
    except (TypeError, ValueError):
        limit = 50

    results = search_sources(query, limit=limit)

    return JsonResponse({
        'success': True,
        'query': query,
        'results': [_to_payload(source) for source in results],
    })


@csrf_exempt
@require_http_methods(["POST"])
def knowledge_source_match(request):
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    name = (data.get('name') or '').strip()
    if not name:
        return JsonResponse({'error': 'name is required'}, status=400)

    min_confidence = data.get('min_confidence')
    if min_confidence is None:
        min_conf = 0.82
    else:
        try:
            min_conf = float(min_confidence)
        except (TypeError, ValueError):
            return JsonResponse({'error': 'min_confidence must be numeric'}, status=400)

    match = match_source_name(name, min_confidence=min_conf)
    source = match.get('source')

    return JsonResponse(
        {
            'success': True,
            'input_name': name,
            'matched': bool(match.get('matched') and source),
            'confidence': match.get('confidence') or 0.0,
            'match_type': match.get('match_type'),
            'matched_value': match.get('matched_value'),
            'result': _to_payload(source) if source else None,
            'create_suggestion': match.get('create_suggestion'),
        }
    )
