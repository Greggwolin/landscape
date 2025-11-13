"""
Knowledge Session API Views
"""

import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from ..models import KnowledgeSession, KnowledgeEntity, KnowledgeFact
from ..serializers import KnowledgeSessionSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    """
    Start a new knowledge session and load project context.
    
    POST /api/knowledge/sessions/start/
    Body: {
        "project_id": int (optional),
        "workspace_id": int (optional)
    }
    """
    project_id = request.data.get('project_id')
    workspace_id = request.data.get('workspace_id')
    
    # Create session
    session = KnowledgeSession.objects.create(
        session_id=uuid.uuid4(),
        user=request.user,
        project_id=project_id,
        workspace_id=workspace_id
    )
    
    # Load context if project_id provided
    if project_id:
        # Get all entities related to this project
        entities = KnowledgeEntity.objects.filter(
            metadata__project_id=project_id
        ).values_list('entity_id', flat=True)
        
        entity_ids = list(entities)
        
        # Count related facts
        facts_count = KnowledgeFact.objects.filter(
            subject_entity_id__in=entity_ids,
            is_current=True
        ).count()
        
        # Update session
        session.loaded_entities = entity_ids
        session.loaded_facts_count = facts_count
        session.context_summary = f"Loaded {len(entity_ids)} entities and {facts_count} facts for project {project_id}"
        session.save()
    
    serializer = KnowledgeSessionSerializer(session)
    return Response({
        'success': True,
        'session': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_session(request, session_id):
    """
    End a knowledge session.
    
    POST /api/knowledge/sessions/{session_id}/end/
    """
    try:
        session = KnowledgeSession.objects.get(
            session_id=session_id,
            user=request.user
        )
    except KnowledgeSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    session.end_session()
    
    return Response({
        'success': True,
        'message': 'Session ended'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_context(request, session_id):
    """
    Retrieve loaded context for a session.
    
    GET /api/knowledge/sessions/{session_id}/context/
    """
    try:
        session = KnowledgeSession.objects.get(
            session_id=session_id,
            user=request.user
        )
    except KnowledgeSession.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get entities
    entities = KnowledgeEntity.objects.filter(
        entity_id__in=session.loaded_entities
    ).values('entity_id', 'entity_type', 'canonical_name', 'metadata')
    
    # Get facts
    facts = KnowledgeFact.objects.filter(
        subject_entity_id__in=session.loaded_entities,
        is_current=True
    ).values(
        'fact_id', 'subject_entity_id', 'predicate', 
        'object_value', 'object_entity_id', 'confidence_score'
    )[:100]  # Limit to 100 facts for now
    
    return Response({
        'success': True,
        'session_id': str(session.session_id),
        'entities': list(entities),
        'facts': list(facts),
        'entity_count': len(entities),
        'facts_count': session.loaded_facts_count
    })
