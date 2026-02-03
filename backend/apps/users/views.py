from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import hashlib
import uuid

from .models import UserLandscaperProfile, UserSettings
from .serializers import UserLandscaperProfileSerializer
from .services import (
    compile_landscaper_instructions,
    detect_confidential_markers,
)


def _get_or_create_profile(user):
    profile, _ = UserLandscaperProfile.objects.get_or_create(
        user=user,
        defaults={
            'interaction_insights': {},
            'document_insights': {'documents': []},
        }
    )
    return profile


class LandscaperProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_or_create_profile(request.user)
        serializer = UserLandscaperProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        profile = _get_or_create_profile(request.user)
        serializer = UserLandscaperProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        profile = _get_or_create_profile(request.user)
        serializer = UserLandscaperProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        history = profile.onboarding_chat_history or []
        last_user_message = None
        for message in reversed(history):
            if message.get('sender') == 'user':
                last_user_message = message.get('text')
                break

        profile.interaction_insights = {
            'message_count': len(history),
            'last_user_message': last_user_message,
            'last_updated_at': timezone.now().isoformat(),
        }
        profile.save(update_fields=['interaction_insights', 'updated_at'])

        return Response(serializer.data)


class LandscaperProfileCompileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_or_create_profile(request.user)
        instructions = compile_landscaper_instructions(profile)
        profile.compiled_instructions = instructions
        profile.updated_at = timezone.now()
        profile.save(update_fields=['compiled_instructions', 'updated_at'])
        return Response({'compiled_instructions': instructions})


@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def user_landscaper_document(request):
    """
    Handle document staging, confirmation, and cancellation during onboarding.
    """
    profile = _get_or_create_profile(request.user)
    action = request.data.get('action', 'analyze')

    documents_module = __import__('apps.documents.models', fromlist=['Document'])
    Document = getattr(documents_module, 'Document')
    DMSExtractQueue = getattr(documents_module, 'DMSExtractQueue')

    if action == 'analyze':
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'File upload is required for analysis'}, status=status.HTTP_400_BAD_REQUEST)

        file_content = file.read()
        checksum = hashlib.sha256(file_content).hexdigest()
        text_snippet = file_content[:200_000].decode('utf-8', errors='ignore')
        markers = detect_confidential_markers(text_snippet)

        ext = file.name.split('.')[-1].lower()
        storage_path = f"uploads/onboarding/{request.user.id}/{uuid.uuid4()}.{ext}"
        content = ContentFile(file_content)
        saved_path = default_storage.save(storage_path, content)

        doc = Document.objects.create(
            project_id=None,
            doc_name=file.name,
            doc_type='landscaper_onboarding',
            mime_type=file.content_type or 'application/octet-stream',
            file_size_bytes=file.size,
            sha256_hash=checksum,
            storage_uri=saved_path,
            status='draft',
            created_by=request.user.id,
            updated_by=request.user.id,
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )

        summary = f"{file.name} uploaded ({file.size} bytes)"
        response = {
            'document_id': doc.doc_id,
            'summary': summary,
            'confidentiality_flag': bool(markers),
            'confidential_markers': markers,
            'message': 'Document analyzed. Confirmation required before storing.',
        }
        return Response(response, status=status.HTTP_200_OK)

    document_id = request.data.get('document_id')
    if not document_id:
        return Response({'error': 'document_id is required for action'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        document = Document.objects.get(doc_id=document_id, created_by=request.user.id)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'confirm':
        document.status = 'processing'
        document.updated_at = timezone.now()
        document.save(update_fields=['status', 'updated_at'])

        DMSExtractQueue.objects.create(
            doc_id=document.doc_id,
            extract_type='landscaper_onboarding',
            priority=5,
            status='pending',
        )

        insights = profile.document_insights or {}
        documents = insights.get('documents', [])
        documents.append({
            'doc_id': document.doc_id,
            'doc_name': document.doc_name,
            'summary': f"{document.doc_name} ({document.doc_type})",
            'uploaded_at': timezone.now().isoformat(),
        })
        insights['documents'] = documents
        profile.document_insights = insights
        profile.updated_at = timezone.now()
        profile.compiled_instructions = compile_landscaper_instructions(profile)
        profile.save(update_fields=['document_insights', 'compiled_instructions', 'updated_at'])

        return Response({'message': 'Document stored and insights recorded.'})

    if action == 'cancel':
        default_storage.delete(document.storage_uri)
        document.delete()
        return Response({'message': 'Document upload cancelled.'})

    return Response({'error': 'Unknown action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def user_tier_settings(request):
    """
    Get or update user tier level

    GET: Returns the current tier level for the user
    PUT: Updates the tier level (analyst or pro)
    """
    # For now, using a default user_id = 1 (simplified auth)
    # In production, this would use request.user.id from authentication
    user_id = 1

    if request.method == 'GET':
        # Get or create user settings with default tier
        settings, created = UserSettings.objects.get_or_create(
            user_id=user_id,
            defaults={'tier_level': 'analyst'}
        )

        return Response({
            'tier_level': settings.tier_level,
            'created': created
        })

    elif request.method == 'PUT':
        tier_level = request.data.get('tier_level')

        # Validate tier level
        if tier_level not in ['analyst', 'pro']:
            return Response(
                {'error': 'Invalid tier level. Must be "analyst" or "pro".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user settings
        settings, created = UserSettings.objects.get_or_create(
            user_id=user_id,
            defaults={'tier_level': tier_level}
        )

        # Update if it already existed
        if not created:
            settings.tier_level = tier_level
            settings.save()

        return Response({
            'tier_level': settings.tier_level,
            'message': f'Tier updated to {tier_level}',
            'created': created
        })
