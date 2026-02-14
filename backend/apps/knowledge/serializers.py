"""
Knowledge Persistence Serializers
"""

from rest_framework import serializers
from .models import (
    KnowledgeSession,
    KnowledgeInteraction,
    KnowledgeEntity,
    KnowledgeFact,
    KnowledgeSource,
)


class KnowledgeSessionSerializer(serializers.ModelSerializer):
    """Serializer for knowledge sessions."""
    
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = KnowledgeSession
        fields = [
            'session_id', 'user', 'workspace_id', 'project_id',
            'session_start', 'session_end', 'is_active',
            'loaded_entities', 'loaded_facts_count',
            'context_token_count', 'context_summary', 'metadata'
        ]
        read_only_fields = ['session_id', 'session_start', 'is_active']


class KnowledgeEntitySerializer(serializers.ModelSerializer):
    """Serializer for knowledge entities."""
    
    class Meta:
        model = KnowledgeEntity
        fields = '__all__'
        read_only_fields = ['entity_id', 'created_at']


class KnowledgeFactSerializer(serializers.ModelSerializer):
    """Serializer for knowledge facts."""
    
    class Meta:
        model = KnowledgeFact
        fields = '__all__'
        read_only_fields = ['fact_id', 'created_at']


class KnowledgeSourceSerializer(serializers.ModelSerializer):
    """Serializer for source registry records."""

    class Meta:
        model = KnowledgeSource
        fields = [
            'id',
            'source_name',
            'source_type',
            'aliases',
            'website',
            'description',
            'document_count',
            'first_seen_at',
            'last_seen_at',
            'created_by',
            'is_active',
        ]
        read_only_fields = ['id', 'document_count', 'first_seen_at', 'last_seen_at', 'created_by']
