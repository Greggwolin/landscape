"""
Serializers for report templates.
"""

from rest_framework import serializers
from .models import ReportTemplate


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for ReportTemplate model."""

    class Meta:
        model = ReportTemplate
        fields = [
            'id',
            'template_name',
            'description',
            'output_format',
            'assigned_tabs',
            'sections',
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_assigned_tabs(self, value):
        """Ensure assigned_tabs is a list."""
        if not isinstance(value, list):
            raise serializers.ValidationError("assigned_tabs must be a list")
        return value

    def validate_sections(self, value):
        """Ensure sections is a list."""
        if not isinstance(value, list):
            raise serializers.ValidationError("sections must be a list")
        return value
