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

    market_velocity_annual = serializers.IntegerField(required=False, allow_null=True)
    velocity_override_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)

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
            'project_type_code',
            'project_type',
            'analysis_type',
            'property_subtype',
            'property_class',
            'jurisdiction_city',
            'jurisdiction_county',
            'jurisdiction_state',
            'acres_gross',
            'location_lat',
            'location_lon',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['project_id', 'created_at', 'updated_at']
