"""
Serializers for Project models.

Converts Django ORM models to/from JSON for the REST API.
"""

from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    """
    Main serializer for Project model.
    """

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = [
            'project_id',
            'created_at',
            'updated_at',
            'last_calculated_at',
            'ai_last_reviewed',
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing projects.

    Excludes related data for performance.
    """

    class Meta:
        model = Project
        fields = [
            'project_id',
            'project_name',
            'project_type',
            'development_type',
            'property_type_code',
            'jurisdiction_city',
            'jurisdiction_state',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['project_id', 'created_at', 'updated_at']
