"""Serializers for Documents application."""

from rest_framework import serializers
from .models import Document, DocumentFolder


class DocumentFolderSerializer(serializers.ModelSerializer):
    """Serializer for DocumentFolder model."""
    
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentFolder
        fields = [
            'folder_id',
            'parent_id',
            'name',
            'path',
            'sort_order',
            'default_profile',
            'is_active',
            'children_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['folder_id', 'path', 'created_at', 'updated_at']
    
    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model."""
    
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'doc_id',
            'project_id',
            'project_name',
            'workspace_id',
            'phase_id',
            'parcel_id',
            'doc_name',
            'doc_type',
            'discipline',
            'mime_type',
            'file_size_bytes',
            'sha256_hash',
            'storage_uri',
            'version_no',
            'parent_doc_id',
            'status',
            'profile_json',
            'doc_date',
            'contract_value',
            'priority',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
            'media_scan_status',
            'media_scan_json',
        ]
        read_only_fields = ['doc_id', 'sha256_hash', 'created_at', 'updated_at', 'media_scan_status', 'media_scan_json']
