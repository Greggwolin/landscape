"""
Serializers for report templates, definitions, history, and user persistence.
"""

from rest_framework import serializers

from .models import (
    ReportDefinition,
    ReportHistory,
    ReportTemplate,
    UserReportPersonalDefault,
    UserSavedReport,
)
from .services.modification_spec import SpecValidationError, validate_spec


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
            'report_definition',
            'property_types',
            'report_category',
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


class ReportDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for ReportDefinition model (report catalog)."""
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = ReportDefinition
        fields = [
            'id', 'report_code', 'report_name', 'report_category',
            'property_types', 'report_tier', 'description',
            'argus_equivalent', 'spec_file', 'data_readiness',
            'generator_class', 'is_active', 'sort_order',
            'template_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'template_count']

    def get_template_count(self, obj):
        return obj.templates.count() if hasattr(obj, 'templates') else 0


class ReportHistorySerializer(serializers.ModelSerializer):
    """Serializer for ReportHistory model."""
    report_code = serializers.CharField(source='report_definition.report_code', read_only=True)
    report_name = serializers.CharField(source='report_definition.report_name', read_only=True)

    class Meta:
        model = ReportHistory
        fields = [
            'id', 'report_definition', 'report_code', 'report_name',
            'project_id', 'parameters', 'generated_at',
            'export_format', 'file_path', 'generation_time_ms'
        ]
        read_only_fields = ['id', 'generated_at']


# =============================================================================
# RP-CFRPT-2605 Phase 2 — User persistence layer
# =============================================================================


class _ModSpecMixin:
    """Mixin providing modification_spec validation via the spec service."""

    def validate_modification_spec(self, value):
        try:
            return validate_spec(value)
        except SpecValidationError as e:
            raise serializers.ValidationError(str(e))


class UserReportPersonalDefaultSerializer(_ModSpecMixin, serializers.ModelSerializer):
    """Personal layout overrides for a canonical report."""

    report_code = serializers.CharField(source='report_definition_id', read_only=True)
    report_name = serializers.CharField(source='report_definition.report_name', read_only=True)

    class Meta:
        model = UserReportPersonalDefault
        fields = [
            'id',
            'report_code',
            'report_name',
            'scope_type',
            'scope_id',
            'modification_spec',
            'created_at',
            'updated_at',
            'last_used_at',
        ]
        read_only_fields = ['id', 'report_code', 'report_name',
                            'created_at', 'updated_at', 'last_used_at']


class UserSavedReportSerializer(_ModSpecMixin, serializers.ModelSerializer):
    """A user-named Save-As entry built on top of a canonical report."""

    base_report_code = serializers.CharField(source='base_report_id', read_only=True)
    base_report_name = serializers.CharField(source='base_report.report_name', read_only=True)

    class Meta:
        model = UserSavedReport
        fields = [
            'id',
            'uuid',
            'name',
            'description',
            'base_report_code',
            'base_report_name',
            'scope_type',
            'scope_id',
            'modification_spec',
            'is_archived',
            'created_at',
            'updated_at',
            'last_used_at',
        ]
        read_only_fields = [
            'id', 'uuid', 'base_report_code', 'base_report_name',
            'created_at', 'updated_at', 'last_used_at',
        ]
